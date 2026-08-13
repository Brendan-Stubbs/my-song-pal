/**
 * Metronome loop persistence.
 *
 * Strategy:
 *  - Authenticated users: reads/writes go to Supabase (metronome_loops table).
 *  - Unauthenticated users: falls back to localStorage.
 *
 * Only for the Loop player side — the simple metronome persists nothing here.
 */

import { createClient } from '@/lib/supabase/client'
import type { MetronomeLoop } from '@/types/metronome-loop'

// ── localStorage fallback ──────────────────────────────────────────────────

const LS_KEY = 'mysongpal_metronome_loops'

function lsLoad(): MetronomeLoop[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as MetronomeLoop[]) : []
  } catch {
    return []
  }
}

function lsSave(loops: MetronomeLoop[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loops))
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

function rowToLoop(row: Record<string, unknown>): MetronomeLoop {
  const data = row.data as Omit<MetronomeLoop, 'id' | 'createdAt' | 'updatedAt'>
  return {
    ...data,
    id: row.id as string,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  }
}

// ── Public async API ───────────────────────────────────────────────────────

export async function loadLoops(): Promise<MetronomeLoop[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('metronome_loops')
    .select('id, data, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error || !data) return lsLoad()
  return data.map(rowToLoop)
}

export async function saveLoop(loop: MetronomeLoop): Promise<void> {
  const session = await getSession()

  if (!session) {
    const all = lsLoad()
    const idx = all.findIndex((l) => l.id === loop.id)
    if (idx >= 0) {
      all[idx] = loop
    } else {
      all.push(loop)
    }
    lsSave(all)
    return
  }

  const { id, createdAt: _c, updatedAt: _u, ...data } = loop
  const supabase = createClient()
  await supabase.from('metronome_loops').upsert({
    id,
    user_id: session.user.id,
    name: loop.name,
    data,
  })
}

export async function deleteLoop(id: string): Promise<void> {
  const session = await getSession()

  if (!session) {
    lsSave(lsLoad().filter((l) => l.id !== id))
    return
  }

  const supabase = createClient()
  await supabase.from('metronome_loops').delete().eq('id', id)
}

// ── Factory ────────────────────────────────────────────────────────────────

export function createLoop(name = 'New Loop'): MetronomeLoop {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    targetBpm: 80,
    beatsPerBar: 4,
    noteValue: 4,
    bars: 4,
    countInBars: 1,
    guideNotes: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Deep-clone a loop with fresh IDs so edits to the duplicate never affect the original. */
export function duplicateLoop(source: MetronomeLoop): MetronomeLoop {
  const now = Date.now()
  return {
    ...source,
    id: crypto.randomUUID(),
    name: `Copy of ${source.name}`,
    // Reassign guide note IDs so there are no shared references
    guideNotes: source.guideNotes.map((gn) => ({ ...gn, id: crypto.randomUUID() })),
    createdAt: now,
    updatedAt: now,
  }
}
