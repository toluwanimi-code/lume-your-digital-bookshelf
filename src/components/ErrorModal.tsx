import { motion, AnimatePresence } from 'framer-motion';

interface ErrorModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export default function ErrorModal({ open, message, onClose }: ErrorModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
            style={{ background: '#FFFFFF', borderRadius: 16, padding: 24 }}
          >
            <h3 style={{ color: '#111111', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Couldn't open this book
            </h3>
            <p style={{ color: '#5C5346', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              {message}
            </p>
            <button
              onClick={onClose}
              className="w-full"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                height: 48,
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Dismiss
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}