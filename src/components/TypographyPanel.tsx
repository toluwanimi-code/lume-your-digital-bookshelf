import { AnimatePresence, motion } from 'framer-motion';
import {
  FONT_OPTIONS,
  FONT_SIZE_STEPS,
  SPACING_VALUES,
  MARGIN_VALUES,
  type TypographySettings,
  type FontKey,
  type SpacingKey,
  type MarginKey,
  getFontStack,
} from '@/hooks/useTypography';
import { THEMES, type ThemeKey } from '@/hooks/useTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: TypographySettings;
  onUpdate: <K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) => void;
  theme: ThemeKey;
  onThemeChange: (t: ThemeKey) => void;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9C8B7A',
  fontWeight: 600,
  marginBottom: '12px',
};

const PILL_BASE: React.CSSProperties = {
  border: '1.5px solid #E5E7EB',
  borderRadius: '999px',
  padding: '8px 16px',
  fontSize: '14px',
  color: '#5C5346',
  background: '#FFFFFF',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const PILL_ACTIVE: React.CSSProperties = {
  borderColor: '#D97706',
  background: '#FEF3C7',
};

export default function TypographyPanel({ open, onClose, settings, onUpdate, theme, onThemeChange }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/20"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[61] mx-auto"
            style={{
              background: '#FFFFFF',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '24px',
              maxWidth: '480px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '999px',
                background: '#E5E7EB',
                margin: '0 auto 20px',
              }}
            />

            {/* Theme */}
            <div style={{ marginBottom: '24px' }}>
              <div style={LABEL_STYLE}>Theme</div>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between' }}>
                {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
                  const t = THEMES[k];
                  const active = theme === k;
                  return (
                    <button
                      key={k}
                      onClick={() => onThemeChange(k)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        flex: 1,
                      }}
                      aria-label={`Theme ${k}`}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '999px',
                          padding: '4px',
                          border: active ? '2px solid #D97706' : '2px solid transparent',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '999px',
                            background: t.swatch,
                            border: t.swatchBorder ? `1px solid ${t.swatchBorder}` : 'none',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#9C8B7A' }}>{k}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font */}
            <div style={{ marginBottom: '24px' }}>
              <div style={LABEL_STYLE}>Font</div>
              <div
                className="scrollbar-hide"
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  marginLeft: '-4px',
                  marginRight: '-4px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                }}
              >
                {FONT_OPTIONS.map((f) => {
                  const active = settings.font === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => onUpdate('font', f.key as FontKey)}
                      style={{
                        ...PILL_BASE,
                        ...(active ? PILL_ACTIVE : {}),
                        padding: '12px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '160px',
                        fontFamily: f.stack,
                      }}
                    >
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{f.label}</span>
                      <span style={{ fontSize: '11px', color: '#9C8B7A', fontStyle: 'italic' }}>
                        The light fell soft and warm.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={LABEL_STYLE}>Size</div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#5C5346',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {settings.fontSize}px
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={FONT_SIZE_STEPS.length - 1}
                step={1}
                value={FONT_SIZE_STEPS.indexOf(settings.fontSize)}
                onChange={(e) => onUpdate('fontSize', FONT_SIZE_STEPS[Number(e.target.value)])}
                style={{
                  width: '100%',
                  accentColor: '#D97706',
                }}
              />
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: '24px' }}>
              <div style={LABEL_STYLE}>Spacing</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Object.keys(SPACING_VALUES) as SpacingKey[]).map((k) => {
                  const active = settings.spacing === k;
                  return (
                    <button
                      key={k}
                      onClick={() => onUpdate('spacing', k)}
                      style={{ ...PILL_BASE, ...(active ? PILL_ACTIVE : {}) }}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Margins */}
            <div>
              <div style={LABEL_STYLE}>Margins</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(Object.keys(MARGIN_VALUES) as MarginKey[]).map((k) => {
                  const active = settings.margins === k;
                  return (
                    <button
                      key={k}
                      onClick={() => onUpdate('margins', k)}
                      style={{ ...PILL_BASE, ...(active ? PILL_ACTIVE : {}) }}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { getFontStack };
