import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
}

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pdf|epub)$/i)) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
        flex flex-col items-center justify-center p-8 text-center
        ${dragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
        ${uploading ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        {uploading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          />
        ) : (
          <Upload className="w-5 h-5 text-primary" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {uploading ? 'Processing...' : 'Add a book'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        PDF or EPUB
      </p>
    </motion.div>
  );
}
