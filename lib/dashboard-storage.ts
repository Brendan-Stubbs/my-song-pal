/**
 * Music dashboard persistence (layout, key/scale/tuning, song builder).
 *
 * Strategy:
 *  - Authenticated users: Supabase user_app_state.dashboard JSONB.
 *  - Unauthenticated: localStorage fallback.
 */

import { createClient } from '@/lib/supabase/client'
import type { ProgressionSection } from '@/types/music'
import type { AudioEngineId } from '@/lib/instrument'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PanelId =
  | 'scaleNotes'
  | 'fretboard'
  | 'caged'
  | 'openChords'
  | 'chordProgressions'
  | 'song'

export interface StoredPanel {
  id: PanelId
  visible: boolean
}

export interface DashboardState {
  panels: StoredPanel[]
  selectedKey: string
  selectedScale: string
  selectedTuningIndex: number
  customTuningPcs: string[]
  sections: ProgressionSection[]
  activeSectionId: string
  /** Selected sound engine for the scale-notes player. */
  audioEngine?: AudioEngineId
}

// ── localStorage fallback ───────────────────────────────────────────────────────

const LS_KEY = 'mysongpal_dashboard'

function lsLoad(): DashboardState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as DashboardState) : null
  } catch {
    return null
  }
}

function lsSave(state: DashboardState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
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

// ── Public async API ──────────────────────────────────────────────────────────

export async function loadDashboardState(): Promise<DashboardState | null> {
  const session = await getSession()
  if (!session) return lsLoad()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_app_state')
    .select('dashboard')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error || !data?.dashboard) return lsLoad()

  return data.dashboard as DashboardState
}

export async function saveDashboardState(state: DashboardState): Promise<void> {
  const session = await getSession()

  if (!session) {
    lsSave(state)
    return
  }

  const supabase = createClient()
  const { data: existing } = await supabase
    .from('user_app_state')
    .select('training_stats')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const { error } = await supabase.from('user_app_state').upsert({
    user_id: session.user.id,
    dashboard: state,
    training_stats: existing?.training_stats ?? {},
  })

  if (error) lsSave(state)
}
