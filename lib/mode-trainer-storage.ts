/**
 * Mode trainer settings persistence.
 * Settings are lightweight so localStorage-only is sufficient.
 */

const LS_KEY = 'mysongpal_mode_trainer'

export interface ModeTrainerSettings {
  key: string
  randomKey: boolean
  /** IDs of modes to include in the drill (subset of all 7). */
  enabledModes: string[]
}

const DEFAULTS: ModeTrainerSettings = {
  key: 'C',
  randomKey: false,
  enabledModes: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
}

export function loadModeTrainerSettings(): ModeTrainerSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ModeTrainerSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveModeTrainerSettings(settings: ModeTrainerSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
  } catch {
    /* quota exceeded */
  }
}
