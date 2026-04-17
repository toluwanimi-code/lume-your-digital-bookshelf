import { useEffect, useState, useCallback } from 'react';

export type ThemeKey = 'Calm' | 'Night' | 'Focus' | 'Cozy';

export interface ThemeConfig {
  key: ThemeKey;
  swatch: string;
  swatchBorder?: string;
  background: string;
  text: string;
  fontWeight: number;
  lineHeightMultiplier: number;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  Calm: {
    key: 'Calm',
    swatch: '#FAF3E0',
    background: '#FAF3E0',
    text: '#5C5346',
    fontWeight: 400,
    lineHeightMultiplier: 1.1,
  },
  Night: {
    key: 'Night',
    swatch: '#1C1C1E',
    background: '#1C1C1E',
    text: '#E5E0D8',
    fontWeight: 300,
    lineHeightMultiplier: 1.0,
  },
  Focus: {
    key: 'Focus',
    swatch: '#FFFFFF',
    swatchBorder: '#E5E7EB',
    background: '#FFFFFF',
    text: '#111111',
    fontWeight: 400,
    lineHeightMultiplier: 1.0,
  },
  Cozy: {
    key: 'Cozy',
    swatch: '#FDF0DC',
    background: '#FDF0DC',
    text: '#3D2B1F',
    fontWeight: 500,
    lineHeightMultiplier: 1.05,
  },
};

const STORAGE_KEY = 'lume-theme';
const DEFAULT: ThemeKey = 'Calm';

function loadTheme(): ThemeKey {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in THEMES) return raw as ThemeKey;
  } catch {}
  return DEFAULT;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeKey>(loadTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((t: ThemeKey) => setThemeState(t), []);

  return { theme, themeConfig: THEMES[theme], setTheme };
}
