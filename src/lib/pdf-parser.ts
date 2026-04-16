import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface ParsedPDF {
  title: string;
  totalPages: number;
  getPageParagraphs: (pageNum: number) => Promise<string[]>;
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

/**
 * Step 1: Clean raw extracted text.
 * Step 2: Split into paragraph array.
 */
export function cleanAndStructureText(rawText: string): string[] {
  let text = rawText;

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

  // Step 2: split into paragraphs
  const paragraphs = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length >= 20);

  return paragraphs;
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
