import { useEffect, useState, useCallback } from 'react';
import { getHighlights, addHighlight, deleteHighlight, type Highlight } from '@/lib/db';

export function useHighlights(bookId: string | undefined) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    (async () => {
      const list = await getHighlights(bookId);
      if (!cancelled) setHighlights(list);
    })();
    return () => { cancelled = true; };
  }, [bookId]);

  const add = useCallback(async (h: Highlight) => {
    await addHighlight(h);
    setHighlights(prev => [...prev, h]);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  }, []);

  return { highlights, add, remove };
}

export type { Highlight };

import type { ThemeKey } from './useTheme';

export const HIGHLIGHT_STYLES: Record<ThemeKey, { color: string; opacity: number }> = {
  Calm:  { color: '#F59E0B', opacity: 0.4 },
  Night: { color: '#5EEAD4', opacity: 0.4 },
  Focus: { color: '#FDE047', opacity: 0.6 },
  Cozy:  { color: '#FCA5A5', opacity: 0.4 },
};

export function getHighlightColor(theme: ThemeKey): string {
  const { color, opacity } = HIGHLIGHT_STYLES[theme];
  // convert #RRGGBB + opacity to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}