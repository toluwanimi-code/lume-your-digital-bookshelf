import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export type Block =
  | { type: 'chapter'; text: string }
  | { type: 'pov'; text: string }
  | { type: 'paragraph'; text: string };

export interface ParsedPDF {
  title: string;
  totalPages: number;
  getPageParagraphs: (pageNum: number) => Promise<Block[]>;
}

const ROMAN_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const NUMBER_WORDS = new Set([
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen',
  'eighteen','nineteen','twenty','thirty','forty','fifty',
]);
const NAMED_SECTIONS = new Set([
  'PROLOGUE','EPILOGUE','PREFACE','INTRODUCTION','INTERLUDE',
  'FOREWORD','AFTERWORD','APPENDIX','ACKNOWLEDGMENTS','CONTENTS',
]);

/**
 * Detect whether a single trimmed line looks like a chapter title.
 * `isolated` = true means the line stands alone between blank lines.
 */
export function isChapterTitle(line: string, isolated: boolean): boolean {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  const words = t.split(/\s+/);
  if (words.length > 8) return false;

  // "Chapter 1" / "Chapter One" / "CHAPTER I"
  if (/^(chapter|part|book|section)\s+([a-z]+|\d+|[ivxlcdm]+)\.?$/i.test(t)) return true;

  // Roman numerals alone
  if (/^[IVXLCDM]+\.?$/.test(t.replace(/\.$/, '')) && ROMAN_RE.test(t.replace(/\.$/, ''))) return true;

  // Single all-caps named section
  if (NAMED_SECTIONS.has(t.replace(/[^A-Z]/g, ''))) return true;

  // Number word alone, e.g. "ONE", "TWO"
  if (words.length === 1 && NUMBER_WORDS.has(t.toLowerCase())) return true;

  // Isolated short line starting with capital, fewer than 6 words
  if (isolated && words.length < 6 && /^[A-Z]/.test(t) && !/[.?!,:;]$/.test(t)) {
    // All-caps OR Title Case
    const allCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
    const titleCase = words.every(w => /^[A-Z]/.test(w) || /^(of|the|and|a|an|in|to|for)$/i.test(w));
    if (allCaps || titleCase) return true;
  }

  return false;
}

const CONJUNCTIONS = new Set([
  'and', 'but', 'or', 'nor', 'yet', 'so',
  'the', 'a', 'an',
  'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from', 'as',
  'is', 'was', 'were', 'be', 'been', 'being',
  'that', 'which', 'who', 'whom', 'whose',
  'if', 'when', 'while', 'because', 'though', 'although',
]);

/**
 * Reconstruct lines from PDF.js text items using Y-coordinate grouping.
 */
async function extractRawText(page: any): Promise<string> {
  const content = await page.getTextContent();
  const Y_TOLERANCE = 3;

  const lineMap = new Map<number, Array<{ str: string; x: number; width: number }>>();

  for (const item of content.items as any[]) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push({
      str: item.str,
      x: item.transform[4],
      width: item.width || item.str.length * 5,
    });
  }

  const sortedLines = Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([_, items]) => {
      items.sort((a, b) => a.x - b.x);
      let line = '';
      for (let i = 0; i < items.length; i++) {
        if (i > 0) {
          const prev = items[i - 1];
          const gap = items[i].x - (prev.x + prev.width);
          if (gap > 10) line += '  ';
          else if (!line.endsWith(' ') && !items[i].str.startsWith(' ')) line += '';
        }
        line += items[i].str;
      }
      return line;
    });

  return sortedLines.join('\n');
}

// Common English words excluded from POV detection
const COMMON_WORDS = new Set([
  'the','and','but','or','nor','yet','so','for','of','in','to','with','on','at',
  'by','from','as','is','was','were','be','been','being','this','that','these',
  'those','then','there','here','him','her','his','hers','they','them','their',
  'when','while','where','what','which','who','whom','because','though','although',
  'after','before','again','still','just','only','very','really','well','okay',
  'yes','no','not','too','also','about','into','over','under','across','through',
  'one','two','three','four','five','six','seven','eight','nine','ten',
  'chapter','part','book','section','prologue','epilogue','preface',
]);

function looksLikeChapter(line: string): boolean {
  const t = line.trim().replace(/\.$/, '');
  if (!t) return false;
  if (/^(chapter|part|book|section)\s+([a-z]+|\d+|[ivxlcdm]+)$/i.test(t)) return true;
  return false;
}

function isPovLabel(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const words = t.split(/\s+/);
  if (words.length < 1 || words.length > 2) return false;
  for (const w of words) {
    if (!/^[A-Z][A-Za-z'’\-]{1,}$/.test(w)) return false;
    if (COMMON_WORDS.has(w.toLowerCase())) return false;
  }
  return true;
}

/** Strip Table of Contents block: "Contents" / "Table of Contents" + 3+ chapter entries. */
function stripTableOfContents(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^(table of contents|contents)$/i.test(line)) {
      let j = i + 1;
      let chapterCount = 0;
      let lastChapterIdx = i;
      while (j < lines.length) {
        const l = lines[j].trim();
        if (!l) { j++; continue; }
        const stripped = l.replace(/[\s.·•…]+\d+\s*$/, '').trim();
        if (looksLikeChapter(stripped) || /^(prologue|epilogue|preface|introduction|interlude|foreword|afterword)\b/i.test(stripped)) {
          chapterCount++;
          lastChapterIdx = j;
          j++;
          continue;
        }
        break;
      }
      if (chapterCount >= 3) {
        i = lastChapterIdx + 1;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }
  return out.join('\n');
}

/**
 * Step 1: Clean raw extracted text.
 * Step 2: Split into block array (chapter | pov | paragraph).
 */
export function cleanAndStructureText(rawText: string): Block[] {
  let text = rawText;

  // PROBLEM 1: Strip Table of Contents before anything else
  text = stripTableOfContents(text);


  // c.1) Strip standalone page numbers (lines containing only digits / roman-ish)
  text = text.replace(/^\s*\d{1,4}\s*$/gm, '');

  // c.2) Strip lines that are only whitespace
  text = text.replace(/^[ \t]+$/gm, '');

  // d) Collapse runs of spaces/tabs (but preserve newlines)
  text = text.replace(/[ \t]+/g, ' ');

  // Detect indented lines BEFORE we mess with newlines — mark as paragraph break
  text = text.replace(/\n(?:   +|\t+)/g, '\n\n');

  // b) Sentence-end + capital letter on next line => real paragraph break
  text = text.replace(/([.?!"”'’])\n(?=["“'‘(]?[A-Z])/g, '$1\n\n');

  // a) Join non-paragraph line breaks.
  // Process line by line so we can inspect each previous line's ending.
  const rawLines = text.split('\n');
  const joined: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (joined.length === 0) {
      joined.push(line);
      continue;
    }
    const prev = joined[joined.length - 1];
    // Empty line => paragraph break, keep as-is
    if (prev.trim() === '' || line.trim() === '') {
      joined.push(line);
      continue;
    }

    const prevTrim = prev.trimEnd();
    const lastChar = prevTrim.slice(-1);
    const lastWord = (prevTrim.match(/([A-Za-z]+)[^A-Za-z]*$/)?.[1] || '').toLowerCase();
    const startsLower = /^[a-z]/.test(line.trimStart());

    // Hyphenated word continuation
    if (prevTrim.endsWith('-') && /^[a-z]/.test(line.trimStart())) {
      joined[joined.length - 1] = prevTrim.slice(0, -1) + line.trimStart();
      continue;
    }

    const endsLowerOrComma = /[a-z,;:]$/.test(prevTrim);
    const isConjunction = CONJUNCTIONS.has(lastWord);
    const nextLineIsContinuation = startsLower;

    if (endsLowerOrComma || isConjunction || nextLineIsContinuation) {
      joined[joined.length - 1] = prevTrim + ' ' + line.trimStart();
    } else {
      joined.push(line);
    }
  }
  text = joined.join('\n');

  // Normalize multiple newlines to exactly two (paragraph separator)
  text = text.replace(/\n{2,}/g, '\n\n');
  // Any remaining single newline at this point is a soft break — convert to space
  text = text.replace(/(?<!\n)\n(?!\n)/g, ' ');
  // Final space cleanup
  text = text.replace(/[ \t]+/g, ' ');

  // Step 2: split into blocks (chapter or paragraph)
  const rawBlocks = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean);

  const blocks: Block[] = [];
  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i];
    const isolated = true; // already separated by \n\n
    // A "block" might still contain internal newlines if it was a single chapter line
    const singleLine = !block.includes('\n');

    if (singleLine && isChapterTitle(block, isolated)) {
      blocks.push({ type: 'chapter', text: block });
      continue;
    }
    if (block.length >= 20) {
      blocks.push({ type: 'paragraph', text: block });
    }
  }

  return blocks;
}

export async function parsePDF(data: ArrayBuffer): Promise<ParsedPDF> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const metadata = await pdf.getMetadata();
  const title = (metadata.info as any)?.Title || '';

  return {
    title,
    totalPages: pdf.numPages,
    getPageParagraphs: async (pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const raw = await extractRawText(page);
      return cleanAndStructureText(raw);
    },
  };
}

export async function getPDFPageCount(data: ArrayBuffer): Promise<{ pages: number; title: string }> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const metadata = await pdf.getMetadata();
  return {
    pages: pdf.numPages,
    title: (metadata.info as any)?.Title || '',
  };
}
