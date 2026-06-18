/**
 * Trainer stats persistence (interval + fretboard games).
 *
 * Strategy:
 *  - Authenticated users: Supabase user_app_state.training_stats JSONB.
 *  - Unauthenticated: localStorage fallback.
 */

import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrainerKey = 'intervals' | 'fretboard'

export interface CategoryStats {
  correct: number
  attempts: number
}

export interface TrainerStats {
  gamesPlayed: number
  bestScore: number
  totalCorrect: number
  totalAttempts: number
  perCategory?: Record<string, CategoryStats>
}

export interface GameResult {
  score: number
  correct: number
  attempts: number
  perCategory?: Record<string, CategoryStats>
}

type AllTrainerStats = Partial<Record<TrainerKey, TrainerStats>>

const EMPTY_STATS: TrainerStats = {
  gamesPlayed: 0,
  bestScore: 0,
  totalCorrect: 0,
  totalAttempts: 0,
}

// ── localStorage fallback ───────────────────────────────────────────────────────

const LS_KEY = 'mysongpal_training_stats'

function lsLoadAll(): AllTrainerStats {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as AllTrainerStats) : {}
  } catch {
    return {}
  }
}

function lsSaveAll(all: AllTrainerStats): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

// ── Session helper ────────────────────────────────────────────────────────────

async function getSession() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// ── Merge helpers ───────────────────────────────────────────────────────────

function mergeCategoryStats(
  existing: Record<string, CategoryStats> | undefined,
  incoming: Record<string, CategoryStats> | undefined
): Record<string, CategoryStats> | undefined {
  if (!incoming) return existing
  const merged = { ...(existing ?? {}) }
  for (const [key, stats] of Object.entries(incoming)) {
    const prev = merged[key] ?? { correct: 0, attempts: 0 }
    merged[key] = {
      correct: prev.correct + stats.correct,
      attempts: prev.attempts + stats.attempts,
    }
  }
  return merged
}

function applyGameResult(current: TrainerStats, result: GameResult): TrainerStats {
  return {
    gamesPlayed: current.gamesPlayed + 1,
    bestScore: Math.max(current.bestScore, result.score),
    totalCorrect: current.totalCorrect + result.correct,
    totalAttempts: current.totalAttempts + result.attempts,
    perCategory: mergeCategoryStats(current.perCategory, result.perCategory),
  }
}

async function loadAllStats(): Promise<AllTrainerStats> {
  const session = await getSession()
  if (!session) return lsLoadAll()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_app_state')
    .select('training_stats')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error || !data?.training_stats) return lsLoadAll()

  return data.training_stats as AllTrainerStats
}

async function saveAllStats(all: AllTrainerStats): Promise<void> {
  const session = await getSession()

  if (!session) {
    lsSaveAll(all)
    return
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('user_app_state')
    .select('dashboard')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { error } = await supabase.from('user_app_state').upsert({
    user_id: session.user.id,
    training_stats: all,
    dashboard: existing?.dashboard ?? null,
  })

  if (error) lsSaveAll(all)
}

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadTrainerStats(key: TrainerKey): Promise<TrainerStats> {
  const all = await loadAllStats()
  return all[key] ?? { ...EMPTY_STATS }
}

export async function recordTrainerGame(
  key: TrainerKey,
  result: GameResult
): Promise<TrainerStats> {
  const all = await loadAllStats()
  const current = all[key] ?? { ...EMPTY_STATS }
  const updated = applyGameResult(current, result)
  all[key] = updated
  await saveAllStats(all)
  return updated
}

export function lifetimeAccuracy(stats: TrainerStats): number {
  if (stats.totalAttempts === 0) return 0
  return Math.round((stats.totalCorrect / stats.totalAttempts) * 100)
}
