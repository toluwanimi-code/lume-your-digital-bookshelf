import { type Book } from './db';
import { parsePDF } from './pdf-parser';

export const ERR_CORRUPT = "This file couldn't be read. It may be damaged or incomplete. Try downloading it again.";
export const ERR_TYPE = "Lume only supports PDF and EPUB files. This file type isn't supported yet.";
export const ERR_SCANNED = "This PDF contains scanned images, not text. Lume can't read it yet — try finding a digital version.";
export const ERR_LARGE = "This file is too large. Try a file under 50MB.";

const MAX_BYTES = 50 * 1024 * 1024;

export function validateUpload(file: File): string | null {
  if (!file.name.match(/\.(pdf|epub)$/i)) return ERR_TYPE;
  if (file.size > MAX_BYTES) return ERR_LARGE;
  return null;
}

export async function validateExtractedText(book: Book): Promise<string | null> {
  if (book.type !== 'pdf') return null;
  try {
    const parsed = await parsePDF(book.fileData);
    let total = 0;
    const pagesToCheck = Math.min(3, parsed.totalPages);
    for (let p = 1; p <= pagesToCheck; p++) {
      const blocks = await parsed.getPageParagraphs(p);
      total += blocks.reduce((s, b) => s + b.text.length, 0);
      if (total >= 100) return null;
    }
    if (total < 100) return ERR_SCANNED;
    return null;
  } catch {
    return ERR_CORRUPT;
  }
}