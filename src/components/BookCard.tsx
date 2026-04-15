import { type Book } from '@/lib/db';
import { motion } from 'framer-motion';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export default function BookCard({ book, onClick, onDelete }: BookCardProps) {
  const progress = Math.round(book.currentProgress * 100);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group text-left w-full"
    >
      {/* Book cover */}
      <div
        className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-3 transition-shadow group-hover:shadow-lg"
        style={{ backgroundColor: `hsl(${book.coverColor})` }}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative z-10">
            <p className="font-reading text-sm font-semibold leading-tight line-clamp-3" style={{ color: 'hsl(39, 32%, 96%)' }}>
              {book.title}
            </p>
            <p className="text-xs mt-1 opacity-80" style={{ color: 'hsl(39, 32%, 90%)' }}>
              {book.author}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-reader-progress transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'hsl(39, 32%, 90%)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Type badge */}
        <span className="absolute top-2 left-2 text-[10px] font-ui font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/30" style={{ color: 'hsl(39, 32%, 90%)' }}>
          {book.type}
        </span>
      </div>

      {/* Info below */}
      <h3 className="font-reading text-sm font-medium leading-tight line-clamp-1 text-foreground">
        {book.title}
      </h3>
      {progress > 0 && (
        <p className="text-xs text-muted-foreground mt-0.5">{progress}% read</p>
      )}
    </motion.button>
  );
}
