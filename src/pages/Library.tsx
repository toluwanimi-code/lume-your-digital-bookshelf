import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import BookCard from '@/components/BookCard';
import UploadZone from '@/components/UploadZone';

export default function Library() {
  const navigate = useNavigate();
  const { books, loading, uploadBook, removeBook } = useLibrary();

  const handleUpload = async (file: File) => {
    const book = await uploadBook(file);
    navigate(`/read/${book.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-reading text-xl font-semibold text-foreground tracking-tight">Lume</h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Your reading space</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6">
        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} />

        {/* Library */}
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : books.length > 0 ? (
          <div className="mt-8">
            <h2 className="text-sm font-ui font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Library
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <p className="font-reading text-lg text-muted-foreground">No books yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Upload a PDF or EPUB to start reading</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
