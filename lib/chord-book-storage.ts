import type { ChordQuality } from '@/data/open-chord-voicings'
import { buildChordSymbol } from '@/data/open-chord-voicings'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedChord {
  id: string
  root: string
  quality: ChordQuality
  /** Derived display symbol, e.g. "Cmaj7" */
  symbol: string
  addedAt: number
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mysongpal_chord_book'

export function loadChordBook(): SavedChord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedChord[]
  } catch {
    return []
  }
}

export function saveChordBook(chords: SavedChord[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chords))
  } catch {
    // ignore quota errors
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function addChord(book: SavedChord[], root: string, quality: ChordQuality): SavedChord[] {
  const key = `${root}-${quality}`
  if (book.some((c) => `${c.root}-${c.quality}` === key)) return book
  const entry: SavedChord = {
    id: crypto.randomUUID(),
    root,
    quality,
    symbol: buildChordSymbol(root, quality),
    addedAt: Date.now(),
  }
  return [...book, entry]
}

export function removeChord(book: SavedChord[], id: string): SavedChord[] {
  return book.filter((c) => c.id !== id)
}

export function isInBook(book: SavedChord[], root: string, quality: ChordQuality): boolean {
  return book.some((c) => c.root === root && c.quality === quality)
}
