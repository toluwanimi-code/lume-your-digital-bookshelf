import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Upload } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import UploadProcessing from '@/components/UploadProcessing';
import ErrorModal from '@/components/ErrorModal';
import { validateUpload } from '@/lib/upload-errors';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadBook } = useLibrary();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    localStorage.setItem('lume-onboarded', 'true');
  };

  const handleFile = async (file: File) => {
    const err = validateUpload(file);
    if (err) { setError(err); return; }
    setProcessing(true);
    try {
      const book = await uploadBook(file);
      const { validateExtractedText } = await import('@/lib/upload-errors');
      const textErr = await validateExtractedText(book);
      if (textErr) {
        setProcessing(false);
        setError(textErr);
        const { deleteBook } = await import('@/lib/db');
        await deleteBook(book.id);
        return;
      }
      finish();
      navigate(`/read/${book.id}`);
    } catch {
      setProcessing(false);
      setError("This file couldn't be read. It may be damaged or incomplete. Try downloading it again.");
    }
  };

  const skip = () => { finish(); navigate('/'); };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF3E0' }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <BookOpen size={64} style={{ color: '#D97706' }} />
            <h1
              style={{
                fontFamily: "'Lora', serif",
                fontSize: 48,
                fontWeight: 700,
                color: '#3D2B1F',
                letterSpacing: '0.04em',
                marginTop: 16,
              }}
            >
              Lume
            </h1>
            <p
              style={{
                fontFamily: "'Lora', serif",
                fontSize: 18,
                fontWeight: 400,
                fontStyle: 'italic',
                color: '#9C8B7A',
                marginTop: 8,
              }}
            >
              Reading should feel like home.
            </p>

            <button
              onClick={() => setStep(2)}
              className="font-semibold"
              style={{
                position: 'fixed',
                bottom: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 48px)',
                maxWidth: 400,
                background: '#D97706',
                color: '#FFFFFF',
                height: 52,
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              Get Started
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-6 pt-12 pb-6"
          >
            <div className="grid grid-cols-2 gap-3 flex-1 max-h-[420px] items-stretch">
              {/* Before */}
              <div className="flex flex-col h-full">
                <p className="text-[11px] font-medium mb-2" style={{ color: '#9CA3AF' }}>Before</p>
                <div className="flex-1 rounded-lg p-3 overflow-hidden" style={{ background: '#F3F4F6', fontFamily: 'Arial, sans-serif', fontSize: 7, lineHeight: 1.2, color: '#374151' }}>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  <p className="mt-1">Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                  <p className="mt-1">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                  <p className="text-center mt-3" style={{ fontSize: 6 }}>— 247 —</p>
                </div>
              </div>
              {/* After */}
              <div className="flex flex-col h-full">
                <p className="text-[11px] font-medium mb-2" style={{ color: '#D97706' }}>Lume</p>
                <div className="flex-1 rounded-lg p-4 overflow-hidden flex flex-col justify-center" style={{ background: '#FAF3E0', fontFamily: "'Lora', serif", fontSize: 9, lineHeight: 1.7, color: '#5C5346' }}>
                  <p>The morning light slipped through the curtains, warm and unhurried.</p>
                  <p className="mt-3">She turned the page, savoring the quiet, the stillness of the hour.</p>
                  <p className="mt-3">Some stories are not meant to be rushed.</p>
                </div>
              </div>
            </div>

            <div className="text-center mt-10 mb-8">
              <h1 className="font-reading text-2xl font-semibold mb-2" style={{ color: '#5C5346' }}>
                Reading should feel like this.
              </h1>
              <p className="text-sm" style={{ color: '#5C5346' }}>
                Not like a school document.
              </p>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full max-w-[400px] mx-auto font-medium block"
              style={{ background: '#D97706', color: '#FFFFFF', height: 52, borderRadius: 12, fontSize: 16 }}
            >
              Get Started
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-6 pt-16 pb-10 relative"
          >
            <button
              onClick={() => setStep(2)}
              aria-label="Back"
              className="absolute"
              style={{ top: 20, left: 20, color: '#5C5346' }}
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col items-center gap-3 mb-12">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#D9770620' }}>
                <BookOpen className="w-7 h-7" style={{ color: '#D97706' }} />
              </div>
              <span className="font-reading text-2xl font-semibold" style={{ color: '#5C5346' }}>Lume</span>
            </div>

            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 max-h-[360px] flex flex-col items-center justify-center gap-3 transition-colors"
              style={{
                background: '#FEF3C7',
                border: '2px dashed rgba(217, 119, 6, 0.4)',
                borderRadius: 16,
                padding: 32,
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#D9770620' }}>
                <Upload className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <h2 className="font-reading text-xl font-semibold" style={{ color: '#5C5346' }}>
                Add your first book
              </h2>
              <p className="text-sm" style={{ color: '#9C8B7A' }}>
                PDF or EPUB
              </p>
            </button>

            <button
              onClick={skip}
              className="mt-6 text-sm underline-offset-4 hover:underline"
              style={{ color: '#9C8B7A' }}
            >
              Skip for now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <UploadProcessing open={processing} />
      <ErrorModal open={!!error} message={error || ''} onClose={() => setError(null)} />
    </div>
  );
}
