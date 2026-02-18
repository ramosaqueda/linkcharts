'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { useGraphStore } from '@/lib/store';
import { THEMES } from '@/lib/themes';

export default function ThemeSelector() {
  const { theme, setTheme } = useGraphStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center p-2 rounded-lg transition-colors backdrop-blur-xl border"
        style={{
          color: 'var(--th-text-muted)',
          backgroundColor: 'var(--th-bg-overlay-light)',
          borderColor: 'var(--th-border)',
        }}
        title={`Tema: ${current.name}`}
      >
        <Palette size={14} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 right-0 rounded-lg shadow-2xl py-1 min-w-[200px] border backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--th-bg-overlay)',
            borderColor: 'var(--th-border)',
            zIndex: 9999,
          }}
        >
          <div
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider border-b"
            style={{ color: 'var(--th-text-dimmed)', borderColor: 'var(--th-border)' }}
          >
            Tema
          </div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-left text-xs transition-colors"
              style={{
                color: t.id === theme ? 'var(--th-text-primary)' : 'var(--th-text-secondary)',
                backgroundColor: t.id === theme ? 'var(--th-bg-tertiary)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (t.id !== theme) e.currentTarget.style.backgroundColor = 'var(--th-bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (t.id !== theme) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Color preview */}
              <div className="flex gap-0.5 shrink-0">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.preview.bg, border: '1px solid rgba(128,128,128,0.3)' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.preview.surface, border: '1px solid rgba(128,128,128,0.3)' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.preview.accent }} />
              </div>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--th-text-dimmed)' }}>{t.description}</div>
              </div>
              {t.id === theme && (
                <span className="ml-auto text-[10px]" style={{ color: 'var(--th-border-focus)' }}>
                  ●
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
