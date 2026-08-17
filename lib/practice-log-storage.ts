/**
 * Practice history log.
 *
 * Strategy mirrors the other stores: authenticated users read/write Supabase
 * (`practice_log`), guests fall back to localStorage. Append-only.
 */

import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PracticeLogEntry {
  id: string
  sessionId?: string
  sessionName: string
  /** Local calendar day, `YYYY-MM-DD`. */
  practicedOn: string
  minutes: number
  blocksCompleted: number
  createdAt: number
}

export interface PracticeStats {
  currentStreak: number
  longestStreak: number
  thisWeekMinutes: number
  daysThisWeek: number
  totalSessions: number
  totalMinutes: number
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` in the user's local timezone. */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(`${aKey}T00:00:00`)
  const b = new Date(`${bKey}T00:00:00`)
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

// ── localStorage fallback ─────────────────────────────────────────────────────

const LS_KEY = 'mysongpal_practice_log'

function lsLoad(): PracticeLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as PracticeLogEntry[]) : []
  } catch {
    return []
  }
}

function lsSave(entries: PracticeLogEntry[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)) } catch { /* quota */ }
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadPracticeLog(): Promise<PracticeLogEntry[]> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('practice_log')
    .select('id, session_id, session_name, practiced_on, minutes, blocks_completed, created_at')
    .order('practiced_on', { ascending: false })

  if (error || !data) return lsLoad()

  return data.map((row) => ({
    id: row.id as string,
    sessionId: (row.session_id as string) ?? undefined,
    sessionName: row.session_name as string,
    practicedOn: row.practiced_on as string,
    minutes: row.minutes as number,
    blocksCompleted: row.blocks_completed as number,
    createdAt: new Date(row.created_at as string).getTime(),
  }))
}

export async function logPractice(entry: {
  sessionId?: string
  sessionName: string
  minutes: number
  blocksCompleted: number
}): Promise<void> {
  if (entry.minutes < 1) return

  const session = await getSession()

  if (!session) {
    const record: PracticeLogEntry = {
      id: crypto.randomUUID(),
      sessionId: entry.sessionId,
      sessionName: entry.sessionName,
      practicedOn: localDateKey(),
      minutes: entry.minutes,
      blocksCompleted: entry.blocksCompleted,
      createdAt: Date.now(),
    }
    lsSave([record, ...lsLoad()])
    return
  }

  const supabase = createClient()
  await supabase.from('practice_log').insert({
    user_id: session.user.id,
    session_id: entry.sessionId ?? null,
    session_name: entry.sessionName,
    practiced_on: localDateKey(),
    minutes: entry.minutes,
    blocks_completed: entry.blocksCompleted,
  })
}

// ── Derived stats ─────────────────────────────────────────────────────────────

/** Compute streak + weekly summary from log entries (any order). */
export function computePracticeStats(entries: PracticeLogEntry[]): PracticeStats {
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0)

  // Unique practice days, most-recent first.
  const days = Array.from(new Set(entries.map((e) => e.practicedOn))).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  )

  // Current streak: consecutive days ending today or yesterday.
  let currentStreak = 0
  if (days.length > 0) {
    const today = localDateKey()
    const gapFromToday = daysBetween(today, days[0])
    if (gapFromToday <= 1) {
      currentStreak = 1
      for (let i = 1; i < days.length; i++) {
        if (daysBetween(days[i - 1], days[i]) === 1) currentStreak++
        else break
      }
    }
  }

  // Longest streak across all recorded days.
  let longestStreak = days.length > 0 ? 1 : 0
  let run = longestStreak
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) {
      run++
      longestStreak = Math.max(longestStreak, run)
    } else {
      run = 1
    }
  }

  // This week = last 7 calendar days (including today).
  const today = localDateKey()
  const weekEntries = entries.filter((e) => {
    const gap = daysBetween(today, e.practicedOn)
    return gap >= 0 && gap < 7
  })
  const thisWeekMinutes = weekEntries.reduce((sum, e) => sum + e.minutes, 0)
  const daysThisWeek = new Set(weekEntries.map((e) => e.practicedOn)).size

  return {
    currentStreak,
    longestStreak,
    thisWeekMinutes,
    daysThisWeek,
    totalSessions: entries.length,
    totalMinutes,
  }
}
