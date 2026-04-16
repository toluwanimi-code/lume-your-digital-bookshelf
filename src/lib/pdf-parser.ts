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
      const items = content.items.filter((item: any) => item.str !== undefined);
      if (items.length === 0) return '';

      // Group text items into lines by Y position, then detect paragraph breaks
      const lines: { y: number; height: number; text: string }[] = [];
      let currentLine = { y: (items[0] as any).transform[5], height: (items[0] as any).height || 12, text: (items[0] as any).str };

      for (let i = 1; i < items.length; i++) {
        const item = items[i] as any;
        const y = item.transform[5];
        const yDiff = Math.abs(y - currentLine.y);

        if (yDiff < 2) {
          // Same line — append with space
          currentLine.text += (item.str.startsWith(' ') ? '' : ' ') + item.str;
        } else {
          lines.push({ ...currentLine });
          currentLine = { y, height: item.height || 12, text: item.str };
        }
      }
      lines.push({ ...currentLine });

      // Merge lines into paragraphs based on vertical gaps
      if (lines.length === 0) return '';
      const paragraphs: string[] = [];
      let currentPara = lines[0].text.trim();

      for (let i = 1; i < lines.length; i++) {
        const gap = Math.abs(lines[i - 1].y - lines[i].y);
        const lineHeight = lines[i - 1].height || 12;
        const isNewParagraph = gap > lineHeight * 1.5;

        const lineText = lines[i].text.trim();
        if (!lineText) continue;

        if (isNewParagraph) {
          if (currentPara) paragraphs.push(currentPara);
          currentPara = lineText;
        } else {
          // Merge: if previous line ends with hyphen, join without space
          if (currentPara.endsWith('-')) {
            currentPara = currentPara.slice(0, -1) + lineText;
          } else {
            currentPara += ' ' + lineText;
          }
        }
      }
      if (currentPara) paragraphs.push(currentPara);

      return paragraphs.join('\n\n');
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
