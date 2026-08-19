'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  THEMES,
  DEFAULT_THEME,
  getStoredTheme,
  subscribeTheme,
  applyTheme,
  type ThemeId,
} from '@/lib/theme'

/** Small three-dot swatch preview for a theme. */
function Swatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {colors.map((c, i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  )
}

/**
 * Top-bar theme switcher. Each option is a complete look; selecting one applies
 * `data-theme` (+ `.dark` for dark themes) and persists it. The initial theme is
 * applied pre-paint by the inline script in the root layout.
 */
export default function ThemePicker() {
  // SSR-safe read of the persisted theme: server + first paint use the default,
  // then the client snapshot (localStorage) takes over without a manual effect.
  const current = useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    () => DEFAULT_THEME,
  )
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function select(id: ThemeId) {
    applyTheme(id)
    setOpen(false)
  }

  const active = THEMES.find((t) => t.id === current) ?? THEMES[0]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change theme"
        title="Change theme"
        className="h-9 pl-2.5 pr-2 rounded-lg border border-line text-ink-muted hover:text-brand hover:border-brand transition-colors flex items-center gap-2"
      >
        <Swatch colors={active.swatch} />
        <span className="hidden sm:inline text-sm font-medium text-ink">
          {active.label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5l3-3" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Themes"
          className="absolute right-0 mt-2 w-64 z-50 rounded-xl border border-line bg-surface shadow-lg p-1.5"
        >
          {THEMES.map((t) => {
            const selected = t.id === current
            return (
              <button
                key={t.id}
                role="option"
                aria-selected={selected}
                onClick={() => select(t.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  selected ? 'bg-brand/10' : 'hover:bg-surface-2'
                }`}
              >
                <Swatch colors={t.swatch} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold ${selected ? 'text-brand' : 'text-ink'}`}>
                    {t.label}
                  </span>
                  <span className="block text-xs text-ink-muted truncate">{t.description}</span>
                </span>
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand shrink-0" aria-hidden>
                    <path d="M2.5 7.5l3 3 6-6.5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
