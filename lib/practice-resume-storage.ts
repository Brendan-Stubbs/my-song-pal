/**
 * In-progress practice session state, so a session can be resumed after a
 * refresh or the screen locking. Device-local (localStorage) and ephemeral —
 * this is a UI convenience, not user content, so it never syncs to Supabase.
 */

const LS_KEY = 'mysongpal_practice_resume'
const MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface ResumePosition {
  sessionId: string
  blockIndex: number
  exerciseIndex: number
  secondsRemaining: number
}

interface ResumeState extends ResumePosition {
  sessionName: string
  savedAt: number
}

export function saveResume(state: Omit<ResumeState, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...state, savedAt: Date.now() }))
  } catch {
    /* quota */
  }
}

export function loadResume(): ResumeState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as ResumeState
    if (!state.sessionId || Date.now() - state.savedAt > MAX_AGE_MS) {
      clearResume()
      return null
    }
    return state
  } catch {
    return null
  }
}

export function clearResume(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}
