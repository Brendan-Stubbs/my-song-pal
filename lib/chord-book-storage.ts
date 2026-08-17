/**
 * Chord book persistence.
 *
 * Strategy:
 *  - When a user is authenticated, all reads/writes go to Supabase.
 *  - When there is no session (unauthenticated preview), fall back to
 *    localStorage so guests can still explore the feature.
 */

import { createClient } from '@/lib/supabase/client'
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

// ── localStorage fallback (unauthenticated / SSR guard) ───────────────────────

const LS_KEY = 'mysongpal_chord_book'

function lsLoad(): SavedChord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as SavedChord[]) : []
  } catch {
    return []
  }
}

function lsSave(chords: SavedChord[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(chords)) } catch { /* quota */ }
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadChordBook(): Promise<SavedChord[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chord_book')
    .select('id, root, quality, symbol, added_at')
    .order('added_at', { ascending: true })

  if (error || !data) return lsLoad()

  return data.map((row) => ({
    id: row.id as string,
    root: row.root as string,
    quality: row.quality as ChordQuality,
    symbol: row.symbol as string,
    addedAt: new Date(row.added_at as string).getTime(),
  }))
}

export async function addChordToBook(
  book: SavedChord[],
  root: string,
  quality: ChordQuality,
): Promise<SavedChord[]> {
  if (book.some((c) => c.root === root && c.quality === quality)) return book

  const session = await getSession()
  const symbol = buildChordSymbol(root, quality)

  if (!session) {
    const entry: SavedChord = { id: crypto.randomUUID(), root, quality, symbol, addedAt: Date.now() }
    const updated = [...book, entry]
    lsSave(updated)
    return updated
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chord_book')
    .insert({ user_id: session.user.id, root, quality, symbol })
    .select('id, root, quality, symbol, added_at')
    .single()

  if (error || !data) return book

  const entry: SavedChord = {
    id: data.id as string,
    root: data.root as string,
    quality: data.quality as ChordQuality,
    symbol: data.symbol as string,
    addedAt: new Date(data.added_at as string).getTime(),
  }
  return [...book, entry]
}

export async function removeChordFromBook(
  book: SavedChord[],
  id: string,
): Promise<SavedChord[]> {
  const session = await getSession()

  if (!session) {
    const updated = book.filter((c) => c.id !== id)
    lsSave(updated)
    return updated
  }

  const supabase = createClient()
  await supabase.from('chord_book').delete().eq('id', id)
  return book.filter((c) => c.id !== id)
}

export function isInBook(book: SavedChord[], root: string, quality: ChordQuality): boolean {
  return book.some((c) => c.root === root && c.quality === quality)
}
