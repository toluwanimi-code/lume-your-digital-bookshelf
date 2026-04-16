import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Upload } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import BookCard from '@/components/BookCard';

export default function Library() {
  const navigate = useNavigate();
  const { books, loading, uploadBook, removeBook } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(pdf|epub)$/i)) return;
    const book = await uploadBook(file);
    navigate(`/read/${book.id}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const hasBooks = books.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="font-reading text-lg font-semibold text-foreground">Add your first book</p>
            <p className="text-sm text-muted-foreground mt-1">PDF or EPUB</p>
            <span className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-full bg-primary text-primary-foreground font-ui text-sm font-semibold shadow-md">
              Upload a book
            </span>
          </motion.button>
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
    </div>
  );
}
