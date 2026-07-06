const LS_KEY = 'mysongpal_metronome_settings'

export interface MetronomeSettings {
  /** Simple mode BPM */
  bpm: number
  beatsPerBar: number
  noteValue: number
  accentFirst: boolean
  /** Whether the panel is in practice mode */
  practiceMode: boolean
  /** Practice mode: target tempo */
  targetBpm: number
  /** Practice mode: current percentage of target */
  pct: number
}

const DEFAULTS: MetronomeSettings = {
  bpm: 80,
  beatsPerBar: 4,
  noteValue: 4,
  accentFirst: true,
  practiceMode: false,
  targetBpm: 120,
  pct: 100,
}

export function loadMetronomeSettings(): MetronomeSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<MetronomeSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function saveMetronomeSettings(settings: MetronomeSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(settings))
}
