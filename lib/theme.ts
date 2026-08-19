/**
 * Theme registry + apply/persist helpers.
 *
 * A theme is a complete look (it replaces the old light/dark toggle). Each
 * theme maps to a `data-theme` on <html>; dark themes additionally get the
 * `.dark` class so the app's existing `dark:` utilities resolve correctly.
 */

export type ThemeId = 'warmwood' | 'midnight' | 'nocturne' | 'aurora' | 'clay'

export interface ThemeMeta {
  id: ThemeId
  label: string
  description: string
  isDark: boolean
  /** Small preview swatch: [page, surface, accent]. */
  swatch: [string, string, string]
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'warmwood',
    label: 'Warmwood',
    description: 'Warm, crafted, editorial light theme.',
    isDark: false,
    swatch: ['#f2ede1', '#fffdf8', '#cf6a24'],
  },
  {
    id: 'clay',
    label: 'Clay',
    description: 'Soft neumorphic lavender.',
    isDark: false,
    swatch: ['#e7eaf3', '#dfe3ef', '#7b6cf6'],
  },
  {
    id: 'midnight',
    label: 'Midnight Studio',
    description: 'Dark pro-audio with a neon-lime accent.',
    isDark: true,
    swatch: ['#101216', '#1f232b', '#c6ff3a'],
  },
  {
    id: 'nocturne',
    label: 'Nocturne Serif',
    description: 'Elegant dark forest with gold serif.',
    isDark: true,
    swatch: ['#12140f', '#20261b', '#c8a04b'],
  },
  {
    id: 'aurora',
    label: 'Aurora Glass',
    description: 'Frosted glass over a luminous gradient.',
    isDark: true,
    swatch: ['#140f2e', '#3a3160', '#8b7bff'],
  },
]

export const DEFAULT_THEME: ThemeId = 'warmwood'
export const THEME_KEY = 'mysongpal_theme'

const DARK_THEMES = new Set<ThemeId>(
  THEMES.filter((t) => t.isDark).map((t) => t.id),
)

export function isDarkTheme(id: ThemeId): boolean {
  return DARK_THEMES.has(id)
}

/** Coerce an arbitrary stored value into a valid theme id (legacy 'dark' → Midnight). */
export function coerceThemeId(value: unknown): ThemeId {
  if (value === 'dark') return 'midnight'
  if (typeof value === 'string' && THEMES.some((t) => t.id === value)) {
    return value as ThemeId
  }
  return DEFAULT_THEME
}

/** Read the persisted theme (client-side only). */
export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    return coerceThemeId(localStorage.getItem(THEME_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

// ── Reactive subscription (for useSyncExternalStore) ────────────────────────

const listeners = new Set<() => void>()

/** Subscribe to theme changes. Returns an unsubscribe fn. */
export function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Apply a theme to <html>, persist it, and notify subscribers. */
export function applyTheme(id: ThemeId): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.setAttribute('data-theme', id)
  el.classList.toggle('dark', isDarkTheme(id))
  try {
    localStorage.setItem(THEME_KEY, id)
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l())
}
