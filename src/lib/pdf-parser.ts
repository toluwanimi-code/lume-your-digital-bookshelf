import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface ParsedPDF {
  title: string;
  totalPages: number;
  getPageText: (pageNum: number) => Promise<string>;
}

export async function parsePDF(data: ArrayBuffer): Promise<ParsedPDF> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const metadata = await pdf.getMetadata();
  const title = (metadata.info as any)?.Title || '';

  return {
    title,
    totalPages: pdf.numPages,
    getPageText: async (pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      return content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
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
