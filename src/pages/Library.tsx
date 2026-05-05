import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import BookCard from '@/components/BookCard';
import UploadProcessing from '@/components/UploadProcessing';
import ErrorModal from '@/components/ErrorModal';
import { validateUpload, validateExtractedText } from '@/lib/upload-errors';
import { deleteBook } from '@/lib/db';

export default function Library() {
  const navigate = useNavigate();
  const { books, loading, uploadBook, removeBook } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const err = validateUpload(file);
    if (err) { setError(err); return; }
    setProcessing(true);
    try {
      const book = await uploadBook(file);
      const textErr = await validateExtractedText(book);
      if (textErr) {
        await deleteBook(book.id);
        setProcessing(false);
        setError(textErr);
        return;
      }
      navigate(`/read/${book.id}`);
    } catch {
      setProcessing(false);
      setError("This file couldn't be read. It may be damaged or incomplete. Try downloading it again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const hasBooks = books.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-background flex flex-col"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="w-full max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-reading text-xl font-semibold text-foreground tracking-tight">Lume</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : hasBooks ? (
          /* Library grid */
          <div>
            <h2 className="text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Library
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {books.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onClick={() => navigate(`/read/${book.id}`)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      removeBook(book.id);
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center justify-center py-24 text-center"
          >
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-6" aria-hidden>
              <path
                d="M16 18c0-2.2 1.8-4 4-4h36c2.2 0 4 1.8 4 4v44c0 2.2-1.8 4-4 4H20c-2.2 0-4-1.8-4-4V18z"
                stroke="#D97706"
                strokeWidth="3"
                fill="#FEF3C7"
              />
              <path d="M26 28h24M26 36h24M26 44h16" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <h2 className="font-reading text-xl font-semibold" style={{ color: '#5C5346' }}>Your shelf is empty</h2>
            <p className="text-sm mt-2" style={{ color: '#9C8B7A' }}>Upload a PDF or EPUB to start reading</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-8 w-full max-w-xs font-medium"
              style={{ background: '#D97706', color: '#FFFFFF', height: 52, borderRadius: 12, fontSize: 16 }}
            >
              Upload a book
            </button>
          </motion.div>
        )}
      </main>

      {/* FAB for adding books when library has items */}
      {hasBooks && !loading && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => inputRef.current?.click()}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-30"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      <UploadProcessing open={processing} />
      <ErrorModal open={!!error} message={error || ''} onClose={() => setError(null)} />
    </motion.div>
  );
}
