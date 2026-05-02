import { openDB, type IDBPDatabase } from 'idb';

export interface Book {
  id: string;
  title: string;
  author: string;
  type: 'pdf' | 'epub';
  fileData: ArrayBuffer;
  coverColor: string;
  addedAt: number;
  totalPages: number;
  currentPage: number;
  currentProgress: number; // 0-1
}

export interface Highlight {
  id: string;
  bookId: string;
  pageNum: number;
  paragraphIndex: number;
  start: number;
  end: number;
  text: string;
  timestamp: number;
  note?: string;
}

const DB_NAME = 'lume-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('highlights')) {
          const store = db.createObjectStore('highlights', { keyPath: 'id' });
          store.createIndex('bookId', 'bookId', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

const COVER_COLORS = [
  '32 70% 45%', '160 50% 40%', '220 55% 50%', '350 60% 50%',
  '270 45% 50%', '45 70% 45%', '190 60% 40%', '10 65% 48%',
];

function randomCoverColor() {
  return COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
}

export async function addBook(file: File, metadata: { title: string; author: string; totalPages: number }): Promise<Book> {
  const db = await getDB();
  const fileData = await file.arrayBuffer();
  const book: Book = {
    id: crypto.randomUUID(),
    title: metadata.title,
    author: metadata.author,
    type: file.name.endsWith('.epub') ? 'epub' : 'pdf',
    fileData,
    coverColor: randomCoverColor(),
    addedAt: Date.now(),
    totalPages: metadata.totalPages,
    currentPage: 0,
    currentProgress: 0,
  };
  await db.put('books', book);
  return book;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  return db.getAll('books');
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB();
  return db.get('books', id);
}

export async function updateBookProgress(id: string, currentPage: number, currentProgress: number): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (book) {
    book.currentPage = currentPage;
    book.currentProgress = currentProgress;
    await db.put('books', book);
  }
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
}

export async function getHighlights(bookId: string): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex('highlights', 'bookId', bookId);
}

export async function addHighlight(h: Highlight): Promise<void> {
  const db = await getDB();
  await db.put('highlights', h);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('highlights', id);
}
