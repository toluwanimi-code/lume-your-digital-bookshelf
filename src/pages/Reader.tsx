import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { getBook, updateBookProgress, type Book } from '@/lib/db';
import { parsePDF, type ParsedPDF, type Block } from '@/lib/pdf-parser';
import TypographyPanel from '@/components/TypographyPanel';
import { useTypography, getFontStack, SPACING_VALUES, MARGIN_VALUES } from '@/hooks/useTypography';
import { useTheme } from '@/hooks/useTheme';

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [parsedPDF, setParsedPDF] = useState<ParsedPDF | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paragraphs, setParagraphs] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const { settings, update } = useTypography();
  const { theme, themeConfig, setTheme } = useTheme();
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef<HTMLDivElement>(null);
  const chaptersFoundRef = useRef(false);
  const chaptersScannedRef = useRef(false);

  // Load book
  useEffect(() => {
    if (!id) return;
    (async () => {
      const b = await getBook(id);
      if (!b) { navigate('/'); return; }
      setBook(b);

      if (b.type === 'pdf') {
        const parsed = await parsePDF(b.fileData);
        setParsedPDF(parsed);
        setCurrentPage(b.currentPage > 0 ? b.currentPage : 1);
      } else {
        // EPUB — render in iframe later
        setCurrentPage(b.currentPage > 0 ? b.currentPage : 1);
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  // Load page text for PDF
  useEffect(() => {
    if (!parsedPDF || currentPage < 1) return;
    (async () => {
      const blocks = await parsedPDF.getPageParagraphs(currentPage);
      setParagraphs(blocks);
      if (blocks.some(b => b.type === 'chapter')) chaptersFoundRef.current = true;
      contentRef.current?.scrollTo(0, 0);
    })();
  }, [parsedPDF, currentPage]);

  // After full book load attempt, if no chapters detected anywhere, show toast
  useEffect(() => {
    if (!parsedPDF || !book || chaptersScannedRef.current) return;
    chaptersScannedRef.current = true;
    (async () => {
      // Quick scan: sample up to 12 pages spread across the book
      const total = parsedPDF.totalPages;
      const samples = Math.min(12, total);
      const step = Math.max(1, Math.floor(total / samples));
      for (let p = 1; p <= total; p += step) {
        if (chaptersFoundRef.current) return;
        try {
          const blocks = await parsedPDF.getPageParagraphs(p);
          if (blocks.some(b => b.type === 'chapter')) {
            chaptersFoundRef.current = true;
            return;
          }
        } catch {}
      }
      if (!chaptersFoundRef.current) {
        toast("Chapters couldn't be detected. Reading in continuous mode.", { duration: 3000 });
      }
    })();
  }, [parsedPDF, book]);

  // Auto-save progress
  useEffect(() => {
    if (!book || !currentPage) return;
    const progress = currentPage / (book.totalPages || 1);
    updateBookProgress(book.id, currentPage, progress);
  }, [book, currentPage]);

  // Auto-hide UI
  const resetHideTimer = useCallback(() => {
    setShowUI(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
  }, [resetHideTimer]);

  const goPage = useCallback((delta: number) => {
    if (!book) return;
    setCurrentPage(p => Math.max(1, Math.min(book.totalPages, p + delta)));
    resetHideTimer();
  }, [book, resetHideTimer]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goPage(1);
      if (e.key === 'ArrowLeft') goPage(-1);
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPage, navigate]);

  const progress = book ? (currentPage / (book.totalPages || 1)) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen reader-bg flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen reader-bg reader-text relative select-none"
      onClick={resetHideTimer}
    >
      {/* Progress bar at very top */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-muted z-50">
        <motion.div
          className="h-full bg-reader-progress"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top bar */}
      <AnimatePresence>
        {showUI && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-40 px-4 pt-3 pb-2 flex items-center justify-between"
            style={{ background: 'linear-gradient(to bottom, hsl(var(--reader-bg)), transparent)' }}
          >
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur flex items-center justify-center text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1 mx-4">
              <p className="text-xs font-ui font-medium text-muted-foreground truncate">{book?.title}</p>
              <p className="text-[10px] text-muted-foreground">
                Page {currentPage} of {book?.totalPages}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPanelOpen(true); resetHideTimer(); }}
              className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur flex items-center justify-center text-foreground"
              aria-label="Typography settings"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Reading content */}
      <div
        ref={contentRef}
        className="min-h-screen py-20 max-w-3xl mx-auto overflow-y-auto scrollbar-hide"
        style={{
          paddingLeft: `${MARGIN_VALUES[settings.margins]}px`,
          paddingRight: `${MARGIN_VALUES[settings.margins]}px`,
        }}
      >
        {book?.type === 'pdf' && (
          <div
            style={{
              fontFamily: getFontStack(settings.font),
              fontSize: `${settings.fontSize}px`,
              lineHeight: SPACING_VALUES[settings.spacing],
              letterSpacing: '0.01em',
            }}
          >
            {paragraphs.length > 0 ? (
              paragraphs.map((block, i) =>
                block.type === 'chapter' ? (
                  <h2
                    key={i}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '22px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      color: '#D97706',
                      marginTop: '64px',
                      marginBottom: '32px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #D9770640',
                    }}
                  >
                    {block.text}
                  </h2>
                ) : block.type === 'pov' ? (
                  <p
                    key={i}
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      fontStyle: 'italic',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      color: '#9C8B7A',
                      marginTop: '-16px',
                      marginBottom: '40px',
                    }}
                  >
                    {block.text}
                  </p>
                ) : (
                  <p
                    key={i}
                    style={{
                      marginBottom: '1.4em',
                      textIndent: 0,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {block.text}
                  </p>
                )
              )
            ) : (
              <p className="text-muted-foreground italic text-center mt-20">
                No readable text on this page.
              </p>
            )}
          </div>
        )}

        {book?.type === 'epub' && (
          <p className="text-muted-foreground italic text-center mt-20">
            EPUB rendering coming soon. PDF files are fully supported.
          </p>
        )}
      </div>

      {/* Navigation overlay - tap left/right sides */}
      <div className="fixed inset-0 z-30 flex pointer-events-none">
        <button
          onClick={() => goPage(-1)}
          className="w-1/3 h-full pointer-events-auto opacity-0 active:opacity-100 flex items-center justify-start pl-2"
        >
          <ChevronLeft className="w-8 h-8 text-muted-foreground/50" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => goPage(1)}
          className="w-1/3 h-full pointer-events-auto opacity-0 active:opacity-100 flex items-center justify-end pr-2"
        >
          <ChevronRight className="w-8 h-8 text-muted-foreground/50" />
        </button>
      </div>

      {/* Bottom bar */}
      <AnimatePresence>
        {showUI && (
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-8 flex items-center justify-center gap-4"
            style={{ background: 'linear-gradient(to top, hsl(var(--reader-bg)), transparent)' }}
          >
            <button
              onClick={() => goPage(-1)}
              disabled={currentPage <= 1}
              className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur flex items-center justify-center text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-ui text-muted-foreground tabular-nums min-w-[60px] text-center">
              {Math.round(progress)}%
            </span>
            <button
              onClick={() => goPage(1)}
              disabled={currentPage >= (book?.totalPages || 1)}
              className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur flex items-center justify-center text-foreground disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.footer>
        )}
      </AnimatePresence>

      <TypographyPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        settings={settings}
        onUpdate={update}
      />
    </div>
  );
}
