import { useState, useEffect, useCallback } from 'react';
import { getAllBooks, addBook, deleteBook, type Book } from '@/lib/db';
import { getPDFPageCount } from '@/lib/pdf-parser';

export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await getAllBooks();
    setBooks(all.sort((a, b) => b.addedAt - a.addedAt));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const uploadBook = useCallback(async (file: File) => {
    const data = await file.arrayBuffer();
    let title = file.name.replace(/\.(pdf|epub)$/i, '');
    let author = 'Unknown';
    let totalPages = 1;

    if (file.name.endsWith('.pdf')) {
      const info = await getPDFPageCount(data);
      if (info.title) title = info.title;
      totalPages = info.pages;
    } else {
      // EPUB - estimate chapters as pages
      const { parseEPUB } = await import('@/lib/epub-parser');
      const epub = await parseEPUB(data);
      if (epub.title) title = epub.title;
      if (epub.author) author = epub.author;
      totalPages = epub.totalChapters || 1;
    }

    const book = await addBook(file, { title, author, totalPages });
    setBooks(prev => [book, ...prev]);
    return book;
  }, []);

  const removeBook = useCallback(async (id: string) => {
    await deleteBook(id);
    setBooks(prev => prev.filter(b => b.id !== id));
  }, []);

  return { books, loading, uploadBook, removeBook, refresh };
}
