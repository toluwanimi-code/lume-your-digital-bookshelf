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
      {/* Cover */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-sm mb-2">
        {/* Placeholder cover */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: book.coverColor ? `hsl(${book.coverColor})` : undefined }}
        >
          <p className="font-reading text-sm font-semibold text-center leading-tight line-clamp-4 text-foreground">
            {book.title}
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-card"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Type badge */}
        <span className="absolute top-2 left-2 text-[10px] font-ui font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
          {book.type}
        </span>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-border">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-reading text-sm font-medium leading-tight line-clamp-2 text-foreground">
        {book.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
        {book.author || 'Unknown author'}
      </p>
    </motion.button>
  );
}
