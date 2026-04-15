import ePub from 'epubjs';

export interface ParsedEPUB {
  title: string;
  author: string;
  totalChapters: number;
  rendition: any;
  book: any;
}

export async function parseEPUB(data: ArrayBuffer): Promise<ParsedEPUB> {
  const book = ePub(data);
  await book.ready;

  const metadata = await book.loaded.metadata;
  const spine = await book.loaded.spine;

  return {
    title: metadata.title || '',
    author: metadata.creator || '',
    totalChapters: (spine as any).items?.length || 0,
    rendition: null,
    book,
  };
}
