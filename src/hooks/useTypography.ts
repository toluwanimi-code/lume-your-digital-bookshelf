import { useEffect, useState, useCallback } from 'react';

export type FontKey = 'Lora' | 'Merriweather' | 'Source Serif 4' | 'Georgia' | 'Literata';
export type SpacingKey = 'Compact' | 'Normal' | 'Relaxed' | 'Airy';
export type MarginKey = 'Narrow' | 'Medium' | 'Wide';

export interface TypographySettings {
  font: FontKey;
  fontSize: number;
  spacing: SpacingKey;
  margins: MarginKey;
}

export const FONT_OPTIONS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'Lora', label: 'Lora', stack: "'Lora', Georgia, serif" },
  { key: 'Merriweather', label: 'Merriweather', stack: "'Merriweather', Georgia, serif" },
  { key: 'Source Serif 4', label: 'Source Serif', stack: "'Source Serif 4', Georgia, serif" },
  { key: 'Georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { key: 'Literata', label: 'Literata', stack: "'Literata', Georgia, serif" },
];

export const FONT_SIZE_STEPS = [14, 16, 18, 20, 22, 24, 26];

export const SPACING_VALUES: Record<SpacingKey, number> = {
  Compact: 1.4,
  Normal: 1.7,
  Relaxed: 2.0,
  Airy: 2.4,
};

export const MARGIN_VALUES: Record<MarginKey, number> = {
  Narrow: 16,
  Medium: 32,
  Wide: 56,
};

const DEFAULTS: TypographySettings = {
  font: 'Lora',
  fontSize: 18,
  spacing: 'Normal',
  margins: 'Medium',
};

const STORAGE_KEY = 'lume-typography';

function loadSettings(): TypographySettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useTypography() {
  const [settings, setSettings] = useState<TypographySettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = useCallback(<K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  return { settings, update };
}

export function getFontStack(key: FontKey): string {
  return FONT_OPTIONS.find(f => f.key === key)?.stack ?? FONT_OPTIONS[0].stack;
}
