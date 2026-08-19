/**
 * Movable / relative chord shapes for the chord book.
 *
 * A movable shape describes a grip by relative fret offsets rather than absolute
 * frets, so the same shape can be slid up and down the neck (e.g. the E-shape or
 * A-shape barre chord). Persistence mirrors the chord book: Supabase when
 * authenticated, localStorage otherwise. Append-only.
 */

import { createClient } from '@/lib/supabase/client'
import type { ChordVoicing } from '@/data/open-chord-voicings'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShapeGeometry {
  /** Per string [s6 low E … s1 high e]. -1 = muted, 0 = root/base fret, +n = frets above base. */
  offsets: number[]
  /** Guitar string carrying the root (6 = low E … 1 = high e). */
  rootString: number
  /** Optional barre across a fret offset. Strings use guitar numbering. */
  barre?: { offset: number; fromString: number; toString: number }
}

export interface MovableShape extends ShapeGeometry {
  id: string
  name: string
  addedAt: number
}

/** Frets a movable shape spans above its base (for choosing sensible neck positions). */
export function shapeSpan(shape: ShapeGeometry): number {
  const offs = shape.offsets.filter((o) => o >= 0)
  return offs.length ? Math.max(...offs) : 0
}

/** Convert a movable shape to a concrete voicing at a given base fret for rendering. */
export function shapeToVoicing(shape: ShapeGeometry, basePosition: number): ChordVoicing {
  const frets = shape.offsets.map((o) => (o < 0 ? -1 : basePosition + o))
  const barres = shape.barre
    ? [
        {
          fret: basePosition + shape.barre.offset,
          firstString: Math.min(shape.barre.fromString, shape.barre.toString),
          lastString: Math.max(shape.barre.fromString, shape.barre.toString),
        },
      ]
    : undefined
  return { frets, baseFret: basePosition, barres }
}

// ── localStorage fallback ─────────────────────────────────────────────────────

const LS_KEY = 'mysongpal_movable_shapes'

function lsLoad(): MovableShape[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as MovableShape[]) : []
  } catch {
    return []
  }
}

function lsSave(shapes: MovableShape[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(shapes)) } catch { /* quota */ }
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

function rowToShape(row: Record<string, unknown>): MovableShape {
  const geometry = (row.shape as ShapeGeometry) ?? { offsets: [], rootString: 6 }
  return {
    id: row.id as string,
    name: row.name as string,
    offsets: geometry.offsets ?? [],
    rootString: geometry.rootString ?? 6,
    barre: geometry.barre,
    addedAt: new Date(row.added_at as string).getTime(),
  }
}

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadMovableShapes(): Promise<MovableShape[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('movable_shapes')
    .select('id, name, shape, added_at')
    .order('added_at', { ascending: true })

  if (error || !data) return lsLoad()
  return data.map(rowToShape)
}

export async function addMovableShape(
  shapes: MovableShape[],
  name: string,
  geometry: ShapeGeometry,
): Promise<MovableShape[]> {
  const session = await getSession()

  if (!session) {
    const entry: MovableShape = {
      id: crypto.randomUUID(),
      name,
      offsets: geometry.offsets,
      rootString: geometry.rootString,
      barre: geometry.barre,
      addedAt: Date.now(),
    }
    const updated = [...shapes, entry]
    lsSave(updated)
    return updated
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('movable_shapes')
    .insert({ user_id: session.user.id, name, shape: geometry })
    .select('id, name, shape, added_at')
    .single()

  if (error || !data) return shapes
  return [...shapes, rowToShape(data)]
}

export async function removeMovableShape(
  shapes: MovableShape[],
  id: string,
): Promise<MovableShape[]> {
  const session = await getSession()

  if (!session) {
    const updated = shapes.filter((s) => s.id !== id)
    lsSave(updated)
    return updated
  }

  const supabase = createClient()
  await supabase.from('movable_shapes').delete().eq('id', id)
  return shapes.filter((s) => s.id !== id)
}
