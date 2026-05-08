import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBook, updateBookProgress, type Book } from '@/lib/db';
import { parsePDF, type ParsedPDF, type Block } from '@/lib/pdf-parser';
import TypographyPanel from '@/components/TypographyPanel';
import NoteSheet from '@/components/NoteSheet';
import { useTypography, getFontStack, SPACING_VALUES, MARGIN_VALUES } from '@/hooks/useTypography';
import { useTheme } from '@/hooks/useTheme';
import { useHighlights, getHighlightColor, type Highlight } from '@/hooks/useHighlights';

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [parsedPDF, setParsedPDF] = useState<ParsedPDF | null>(null);
  const [allBlocks, setAllBlocks] = useState<Array<{ block: Block; pageNum: number; indexInPage: number }>>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const { settings, update } = useTypography();
  const { theme, themeConfig, setTheme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const chaptersFoundRef = useRef(false);
  const { highlights, add: addHl, remove: removeHl } = useHighlights(id);
  const highlightColor = getHighlightColor(theme);
  const [selectionBar, setSelectionBar] = useState<{ x: number; y: number; height: number; paragraphIndex: number; start: number; end: number; text: string } | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<{ x: number; y: number; id: string } | null>(null);
  const [noteSheet, setNoteSheet] = useState<null | { paragraphIndex: number; start: number; end: number; text: string }>(null);

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
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  // Load ALL pages into one continuous flat block array
  useEffect(() => {
    if (!parsedPDF) return;
    let cancelled = false;
    (async () => {
      const total = parsedPDF.totalPages;
      const acc: Array<{ block: Block; pageNum: number; indexInPage: number }> = [];
      let foundChapter = false;
      for (let p = 1; p <= total; p++) {
        try {
          const blocks = await parsedPDF.getPageParagraphs(p);
          blocks.forEach((b, i) => acc.push({ block: b, pageNum: p, indexInPage: i }));
          if (!foundChapter && blocks.some(b => b.type === 'chapter')) foundChapter = true;
          if (p % 5 === 0 || p === total) {
            if (cancelled) return;
            setAllBlocks([...acc]);
          }
        } catch {}
      }
      chaptersFoundRef.current = foundChapter;
      if (!foundChapter) {
        toast("Chapters couldn't be detected. Reading in continuous mode.", { duration: 3000 });
      }
    })();
    return () => { cancelled = true; };
  }, [parsedPDF]);

  // Track scroll progress on the window (root) scroller
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(pct);
      if (book) {
        const page = Math.max(1, Math.round(pct * (book.totalPages || 1)));
        updateBookProgress(book.id, page, pct);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [book]);

  // Tap content area to toggle chrome (ignore taps on selection / interactive UI)
  const handleContentTap = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [data-paragraph-index] span')) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    setShowUI(v => !v);
  }, []);

  // Keyboard nav (Esc returns to library)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // Selection detection (selectionchange for native long-press support)
  useEffect(() => {
    let raf = 0;
    const handle = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionBar(null);
        return;
      }
      const text = sel.toString();
      if (text.trim().length <= 1) {
        setSelectionBar(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const findP = (node: Node | null): HTMLElement | null => {
        let n: Node | null = node;
        while (n && n !== contentRef.current) {
          if (n.nodeType === 1 && (n as HTMLElement).dataset.paragraphIndex) return n as HTMLElement;
          n = n.parentNode;
        }
        return null;
      };
      const startP = findP(range.startContainer);
      const endP = findP(range.endContainer);
      if (!startP || startP !== endP) { setSelectionBar(null); return; }
      // Compute text offsets within paragraph
      const offsetIn = (root: HTMLElement, target: Node, targetOffset: number): number => {
        let acc = 0;
        let found = false;
        const walk = (node: Node) => {
          if (found) return;
          if (node === target) {
            if (node.nodeType === 3) acc += targetOffset;
            else {
              for (let i = 0; i < targetOffset; i++) acc += (node.childNodes[i]?.textContent || '').length;
            }
            found = true;
            return;
          }
          if (node.nodeType === 3) {
            acc += (node.nodeValue || '').length;
          } else {
            node.childNodes.forEach(walk);
          }
        };
        walk(root);
        return acc;
      };
      const start = offsetIn(startP, range.startContainer, range.startOffset);
      const end = offsetIn(startP, range.endContainer, range.endOffset);
      if (end <= start) { setSelectionBar(null); return; }
      const rect = range.getBoundingClientRect();
      setSelectionBar({
        x: rect.left + rect.width / 2,
        y: rect.top,
        height: rect.height,
        paragraphIndex: parseInt(startP.dataset.paragraphIndex!, 10),
        pageNum: parseInt(startP.dataset.pageNum!, 10),
        start,
        end,
        text,
      });
    };
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(handle);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
      cancelAnimationFrame(raf);
    };
  }, []);

  const commitHighlight = useCallback(async () => {
    if (!selectionBar || !id) return;
    const h: Highlight = {
      id: crypto.randomUUID(),
      bookId: id,
      pageNum: selectionBar.pageNum,
      paragraphIndex: selectionBar.paragraphIndex,
      start: selectionBar.start,
      end: selectionBar.end,
      text: selectionBar.text,
      timestamp: Date.now(),
    };
    await addHl(h);
    window.getSelection()?.removeAllRanges();
    setSelectionBar(null);
  }, [selectionBar, id, addHl]);

  const openNoteSheet = useCallback(() => {
    if (!selectionBar) return;
    setNoteSheet({
      paragraphIndex: selectionBar.paragraphIndex,
      pageNum: selectionBar.pageNum,
      start: selectionBar.start,
      end: selectionBar.end,
      text: selectionBar.text,
    });
    setSelectionBar(null);
  }, [selectionBar]);

  const saveNote = useCallback(async (note: string) => {
    if (!noteSheet || !id) return;
    const h: Highlight = {
      id: crypto.randomUUID(),
      bookId: id,
      pageNum: noteSheet.pageNum,
      paragraphIndex: noteSheet.paragraphIndex,
      start: noteSheet.start,
      end: noteSheet.end,
      text: noteSheet.text,
      timestamp: Date.now(),
      note,
    };
    await addHl(h);
    window.getSelection()?.removeAllRanges();
    setNoteSheet(null);
  }, [noteSheet, id, addHl]);

  // Render paragraph text with highlight underlines
  const renderParagraphText = (text: string, paraIdx: number, pageNum: number) => {
    const hls = highlights
      .filter(h => h.pageNum === pageNum && h.paragraphIndex === paraIdx && h.start < text.length)
      .map(h => ({ ...h, end: Math.min(h.end, text.length) }))
      .sort((a, b) => a.start - b.start);
    if (hls.length === 0) return text;
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    hls.forEach((h, i) => {
      if (h.start > cursor) parts.push(text.slice(cursor, h.start));
      parts.push(
        <span
          key={h.id}
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setActiveHighlight({ x: rect.left + rect.width / 2, y: rect.top - 8, id: h.id });
          }}
          style={{
            textDecoration: 'underline',
            textDecorationColor: highlightColor,
            textDecorationThickness: '2px',
            textUnderlineOffset: '3px',
            cursor: 'pointer',
          }}
        >
          {text.slice(h.start, h.end)}
        </span>
      );
      cursor = h.end;
    });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  };

  const progressPct = progress * 100;

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ background: themeConfig.background, color: themeConfig.text }}
      className="min-h-screen relative"
      onClick={handleContentTap}
    >
      {/* Progress bar at very top */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-muted z-50">
        <motion.div
          className="h-full bg-reader-progress"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 px-4 pt-3 pb-2 flex items-center justify-between transition-opacity duration-200"
        style={{
          background: `linear-gradient(to bottom, ${themeConfig.background}, transparent)`,
          opacity: showUI ? 1 : 0,
          pointerEvents: showUI ? 'auto' : 'none',
        }}
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
                {Math.round(progressPct)}%
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPanelOpen(true); }}
              className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur flex items-center justify-center text-foreground"
              aria-label="Typography settings"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
      </header>

      {/* Reading content */}
      <div
        ref={contentRef}
        className="min-h-screen py-20 max-w-3xl mx-auto"
        style={{
          paddingLeft: `${MARGIN_VALUES[settings.margins]}px`,
          paddingRight: `${MARGIN_VALUES[settings.margins]}px`,
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        {book?.type === 'pdf' && (
          <div
            style={{
              fontFamily: getFontStack(settings.font),
              fontSize: `${settings.fontSize}px`,
              lineHeight: SPACING_VALUES[settings.spacing] * themeConfig.lineHeightMultiplier,
              fontWeight: themeConfig.fontWeight,
              color: themeConfig.text,
              letterSpacing: '0.01em',
            }}
          >
            {allBlocks.length > 0 ? (
              allBlocks.map(({ block, pageNum, indexInPage }, i) =>
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
                      color: '#D97706',
                      marginTop: '-16px',
                      marginBottom: '40px',
                    }}
                  >
                    {block.text}
                  </p>
                ) : (
                  <p
                    key={i}
                    data-paragraph-index={indexInPage}
                    data-page-num={pageNum}
                    style={{
                      marginBottom: '1.4em',
                      textIndent: 0,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {renderParagraphText(block.text, indexInPage, pageNum)}
                  </p>
                )
              )
            ) : (
              <p className="text-muted-foreground italic text-center mt-20">
                Loading…
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

      <TypographyPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        settings={settings}
        onUpdate={update}
        theme={theme}
        onThemeChange={setTheme}
      />

      <NoteSheet
        open={!!noteSheet}
        selectedText={noteSheet?.text || ''}
        onCancel={() => {
          window.getSelection()?.removeAllRanges();
          setNoteSheet(null);
        }}
        onSave={saveNote}
      />

      {/* Selection toolbar */}
      {selectionBar && (() => {
        const BAR_W = 180;
        const showBelow = selectionBar.y < 60;
        const top = showBelow ? selectionBar.y + selectionBar.height + 8 : selectionBar.y - 8;
        let left = selectionBar.x - BAR_W / 2;
        if (left + BAR_W > window.innerWidth - 8) left = window.innerWidth - BAR_W - 8;
        if (left < 8) left = 8;
        return (
          <div
            className="fixed z-50"
            style={{
              left,
              top,
              transform: showBelow ? 'none' : 'translateY(-100%)',
              background: '#1C1C1E',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 14,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button onClick={commitHighlight} className="font-ui">Highlight</button>
            <span style={{ width: 1, height: 16, background: '#FFFFFF20' }} />
            <button
              onClick={openNoteSheet}
              className="font-ui"
            >
              Add Note
            </button>
          </div>
        );
      })()}

      {/* Highlight delete tooltip */}
      {activeHighlight && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveHighlight(null)} />
          <div
            className="fixed z-50"
            style={{ left: activeHighlight.x, top: activeHighlight.y, transform: 'translate(-50%, -100%)' }}
          >
            <button
              onClick={async () => {
                await removeHl(activeHighlight.id);
                setActiveHighlight(null);
              }}
              className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-ui font-medium shadow-lg flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
