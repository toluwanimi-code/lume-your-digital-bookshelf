import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  selectedText: string;
  onCancel: () => void;
  onSave: (note: string) => void;
}

const MAX = 280;

export default function NoteSheet({ open, selectedText, onCancel, onSave }: Props) {
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setNote('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bottom-0 z-[61] max-h-[90vh] overflow-y-auto"
            style={{
              background: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
            }}
          >
            <div className="flex justify-center mb-4">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>

            <p
              style={{
                fontStyle: 'italic',
                color: '#9C8B7A',
                fontSize: 14,
                marginBottom: 16,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              "{selectedText}"
            </p>

            <textarea
              ref={inputRef}
              value={note}
              maxLength={MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={4}
              style={{
                width: '100%',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 12,
                fontSize: 15,
                fontFamily: 'inherit',
                color: '#5C5346',
                resize: 'none',
                outline: 'none',
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: 12,
                color: '#9C8B7A',
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              {note.length} / {MAX}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1.5px solid #E5E7EB',
                  background: 'transparent',
                  color: '#5C5346',
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(note)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#D97706',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}