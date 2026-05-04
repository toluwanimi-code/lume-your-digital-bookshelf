import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const STAGES = [
  'Reading file...',
  'Extracting text...',
  'Detecting chapters...',
  'Fetching cover...',
];

export default function UploadProcessing({ open }: { open: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!open) { setStage(0); return; }
    setStage(0);
    const interval = setInterval(() => {
      setStage(s => Math.min(s + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, [open]);

  const progress = ((stage + 1) / STAGES.length) * 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center"
          style={{ background: '#FAF3E0' }}
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#D9770620' }}>
              <BookOpen className="w-6 h-6" style={{ color: '#D97706' }} />
            </div>
            <span className="font-reading text-2xl font-semibold" style={{ color: '#5C5346' }}>Lume</span>
          </div>
          <p className="text-sm font-medium mb-4" style={{ color: '#5C5346' }}>
            {STAGES[stage]}
          </p>
          <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
            <motion.div
              className="h-full"
              style={{ background: '#D97706' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}