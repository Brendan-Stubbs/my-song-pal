// Types and localStorage persistence for practice sessions

export interface PracticeBlock {
  id: string
  name: string
  durationMinutes: number
  notes: string
}

export interface PracticeSession {
  id: string
  name: string
  blocks: PracticeBlock[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'mysongpal_practice_sessions'

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadSessions(): PracticeSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PracticeSession[]
  } catch {
    return []
  }
}

export function saveSessions(sessions: PracticeSession[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
