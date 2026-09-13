/**
 * Daily free-usage limit for the theory quizzes (Scale Degrees, Chord Speller,
 * Diatonic Harmony). Free users get a shared daily allowance of answered
 * questions across all three; trial and paid users are unlimited (the caller
 * gates on `isPremium`, which is true for both).
 *
 * This is a soft, client-side motivator — it lives in localStorage and resets
 * at local midnight. It is intentionally not tamper-proof; hard enforcement can
 * come with real server-side billing later.
 */

export const FREE_DAILY_THEORY_QUESTIONS = 15

const KEY = 'mysongpal_theory_quiz_usage'

interface Usage {
  /** Local calendar day the count applies to (YYYY-MM-DD). */
  date: string
  /** Questions answered on that day. */
  count: number
}

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function read(): Usage {
  const fresh: Usage = { date: todayKey(), count: 0 }
  if (typeof window === 'undefined') return fresh
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Partial<Usage>
    // A stored count from an earlier day no longer applies.
    if (parsed.date !== fresh.date || typeof parsed.count !== 'number') return fresh
    return { date: fresh.date, count: Math.max(0, Math.floor(parsed.count)) }
  } catch {
    return fresh
  }
}

function write(u: Usage): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(u))
  } catch {
    // Ignore write failures (private mode, quota, etc.) — worst case the user
    // gets a few extra free questions.
  }
}

/** Questions answered today across the theory quizzes. Resets at local midnight. */
export function theoryQuestionsUsedToday(): number {
  return read().count
}

/** Record one answered question and return the new day total. */
export function bumpTheoryQuestions(): number {
  const current = read()
  const next: Usage = { date: current.date, count: current.count + 1 }
  write(next)
  return next.count
}
