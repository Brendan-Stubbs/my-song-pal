/**
 * Melody Maker persistence.
 *
 * Strategy (mirrors metronome-loop-storage):
 *  - Authenticated users: reads/writes go to Supabase (melodies table).
 *  - Unauthenticated users: falls back to localStorage.
 */

import { createClient } from '@/lib/supabase/client'
import type { Melody } from '@/types/melody'

// ── localStorage fallback ──────────────────────────────────────────────────

const LS_KEY = 'mysongpal_melodies'

function lsLoad(): Melody[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Melody[]) : []
  } catch {
    return []
  }
}

function lsSave(melodies: Melody[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(melodies))
  } catch {
    /* quota */
  }
}

// ── Session helper ─────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// ── Row mapper ─────────────────────────────────────────────────────────────

function rowToMelody(row: Record<string, unknown>): Melody {
  const data = row.data as Omit<Melody, 'id' | 'createdAt' | 'updatedAt'>
  return {
    ...data,
    id: row.id as string,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

// ── Public async API ───────────────────────────────────────────────────────

export async function loadMelodies(): Promise<Melody[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('melodies')
    .select('id, data, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error || !data) return lsLoad()
  return data.map(rowToMelody)
}

export async function saveMelody(melody: Melody): Promise<void> {
  const session = await getSession()

  if (!session) {
    const all = lsLoad()
    const idx = all.findIndex((m) => m.id === melody.id)
    if (idx >= 0) {
      all[idx] = melody
    } else {
      all.push(melody)
    }
    lsSave(all)
    return
  }

  const { id, createdAt: _c, updatedAt: _u, ...data } = melody
  const supabase = createClient()
  await supabase.from('melodies').upsert({
    id,
    user_id: session.user.id,
    name: melody.name,
    data,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteMelody(id: string): Promise<void> {
  const session = await getSession()

  if (!session) {
    lsSave(lsLoad().filter((m) => m.id !== id))
    return
  }

  const supabase = createClient()
  await supabase.from('melodies').delete().eq('id', id)
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createMelody(
  name = 'Untitled melody',
  key = 'C',
  scaleId = 'major',
): Melody {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    key,
    scaleId,
    bpm: 90,
    bars: 4,
    stepsPerBar: 4,
    notes: [],
    chords: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Deep-clone a melody with a fresh id + note ids. */
export function duplicateMelody(source: Melody): Melody {
  const now = Date.now()
  return {
    ...source,
    id: crypto.randomUUID(),
    name: `Copy of ${source.name}`,
    notes: source.notes.map((n) => ({ ...n, id: crypto.randomUUID() })),
    chords: source.chords.map((c) => ({ ...c })),
    createdAt: now,
    updatedAt: now,
  }
}
