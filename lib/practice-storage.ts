/**
 * Practice session persistence.
 *
 * Strategy:
 *  - Authenticated users: reads/writes go to Supabase.
 *  - Unauthenticated users: falls back to localStorage.
 */

import { createClient } from '@/lib/supabase/client'
import type { ChordQuality } from '@/data/open-chord-voicings'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Optional binding from a practice block to a real tool in the app. When present,
 * the player renders that tool inline. `undefined` (or `kind: 'free'`) keeps the
 * plain free-text-label behaviour, so existing sessions still parse.
 */
export type ExerciseLink =
  | { kind: 'free' }
  | {
      kind: 'metronome'
      loopId: string
      /** Optional tempo ramp (% of the loop's target BPM) across the exercise. */
      bpmRamp?: { fromPct: number; toPct: number }
    }
  | { kind: 'scale'; root: string; scaleId: string }
  | { kind: 'chord-drill'; chords: { root: string; quality: ChordQuality }[]; changesPerMin: number }
  | { kind: 'ear-training'; mode: 'intervals' | 'modes' }
  | { kind: 'fretboard-trainer' }
  | { kind: 'melody-maker'; root: string; scaleId: string }

export type ExerciseLinkKind = ExerciseLink['kind']

export interface PracticeExercise {
  id: string
  name: string
  durationMinutes: number
  link?: ExerciseLink
}

/**
 * A practice block is one timed segment of a session. The simple, primary path
 * is that a block simply *is* a configured exercise via `link` (a metronome
 * loop, a scale, a chord drill, …). Optionally, a block can be subdivided into
 * several individually-timed `exercises`, each carrying its own link.
 */
export interface PracticeBlock {
  id: string
  name: string
  durationMinutes: number
  notes: string
  /** Block-level tool. Ignored when the block is broken into `exercises`. */
  link?: ExerciseLink
  /** Optional subdivision of the block into individually-timed exercises. */
  exercises?: PracticeExercise[]
}

export interface PracticeSession {
  id: string
  name: string
  blocks: PracticeBlock[]
  createdAt: number
  updatedAt: number
}

// ── localStorage fallback ─────────────────────────────────────────────────────

const LS_KEY = 'mysongpal_practice_sessions'

/** Older sessions used different keys for the subdivision list. */
type StoredBlock = PracticeBlock & {
  subBlocks?: PracticeExercise[]
  activities?: PracticeExercise[]
}

function normalizeBlock(block: StoredBlock): PracticeBlock {
  const exercises = block.exercises ?? block.activities ?? block.subBlocks
  if (!exercises?.length) {
    const { subBlocks: _, activities: __, exercises: ___, ...rest } = block
    return rest
  }
  // When subdivided, the block's own link is ignored — each exercise carries one.
  return {
    id: block.id,
    name: block.name,
    durationMinutes: block.durationMinutes,
    notes: block.notes,
    exercises,
  }
}

function normalizeSession(session: PracticeSession): PracticeSession {
  return {
    ...session,
    blocks: session.blocks.map((b) => normalizeBlock(b as StoredBlock)),
  }
}

function lsLoad(): PracticeSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    const sessions = raw ? (JSON.parse(raw) as PracticeSession[]) : []
    return sessions.map(normalizeSession)
  } catch {
    return []
  }
}

function lsSave(sessions: PracticeSession[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(sessions)) } catch { /* quota */ }
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── DB row ↔ domain type mappers ──────────────────────────────────────────────

function rowToSession(row: Record<string, unknown>): PracticeSession {
  return normalizeSession({
    id: row.id as string,
    name: row.name as string,
    blocks: row.blocks as PracticeBlock[],
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  })
}

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadSessions(): Promise<PracticeSession[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id, name, blocks, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error || !data) return lsLoad()
  return data.map(rowToSession)
}

export async function upsertSession(practiceSession: PracticeSession): Promise<void> {
  const session = await getSession()

  if (!session) {
    const all = lsLoad()
    const idx = all.findIndex((s) => s.id === practiceSession.id)
    if (idx >= 0) {
      all[idx] = practiceSession
    } else {
      all.push(practiceSession)
    }
    lsSave(all)
    return
  }

  const supabase = createClient()
  await supabase.from('practice_sessions').upsert({
    id: practiceSession.id,
    user_id: session.user.id,
    name: practiceSession.name,
    blocks: practiceSession.blocks,
  })
}

export async function deleteSession(id: string): Promise<void> {
  const session = await getSession()

  if (!session) {
    lsSave(lsLoad().filter((s) => s.id !== id))
    return
  }

  const supabase = createClient()
  await supabase.from('practice_sessions').delete().eq('id', id)
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function createSession(name = 'New Session'): PracticeSession {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    blocks: [createBlock('Warm Up', 10)],
    createdAt: now,
    updatedAt: now,
  }
}

export function createBlock(name = 'New Block', durationMinutes = 10): PracticeBlock {
  return {
    id: crypto.randomUUID(),
    name,
    durationMinutes,
    notes: '',
  }
}

export function createExercise(name = '', durationMinutes = 5): PracticeExercise {
  return {
    id: crypto.randomUUID(),
    name,
    durationMinutes,
  }
}

export function exerciseTotalMinutes(exercises: PracticeExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.durationMinutes, 0)
}

export function exerciseDisplayName(exercise: PracticeExercise, index: number): string {
  if (exercise.name.trim()) return exercise.name.trim()
  const fromLink = exercise.link && exerciseLinkDefaultName(exercise.link)
  return fromLink || `Exercise ${index + 1}`
}

export const EXERCISE_LINK_LABELS: Record<ExerciseLinkKind, string> = {
  free: 'No tool',
  metronome: 'Metronome loop',
  scale: 'Scale',
  'chord-drill': 'Chord drill',
  'ear-training': 'Ear training',
  'fretboard-trainer': 'Fretboard trainer',
  'melody-maker': 'Melody maker',
}

/** A sensible auto-name for an exercise based on its attached tool. */
export function exerciseLinkDefaultName(link: ExerciseLink): string {
  switch (link.kind) {
    case 'scale':
      return `${link.root} ${link.scaleId}`
    case 'chord-drill':
      return link.chords.length ? `Chord drill (${link.chords.length})` : 'Chord drill'
    case 'ear-training':
      return link.mode === 'intervals' ? 'Interval training' : 'Mode training'
    case 'fretboard-trainer':
      return 'Fretboard trainer'
    case 'melody-maker':
      return `Melody maker (${link.root} ${link.scaleId})`
    case 'metronome':
      return 'Metronome loop'
    case 'free':
    default:
      return ''
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function totalMinutes(session: PracticeSession): number {
  return session.blocks.reduce((sum, b) => sum + b.durationMinutes, 0)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
