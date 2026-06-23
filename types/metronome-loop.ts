/** Rhythmic duration / grid resolution for a guide note. */
export type NoteDuration = 'quarter' | 'eighth' | 'sixteenth' | 'triplet'

/** How many subdivisions fit inside one beat for each duration type. */
export const SUBDIVISIONS_PER_BEAT: Record<NoteDuration, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  triplet: 3,
}

export interface GuideNote {
  /** Stable id for React keys and future tab-import linking. */
  id: string
  /**
   * Which step-sequencer row this note belongs to.
   * All active steps in the same row share one pitch (the row's `note`).
   * Old notes that pre-date this field default to their own `id` so each
   * becomes its own single-step row on load.
   */
  rowId?: string
  bar: number         // 1-indexed
  beat: number        // 1-indexed
  /**
   * 0-indexed position within the beat, relative to `duration`.
   *   quarter  → always 0
   *   eighth   → 0 (the beat) | 1 (the "+")
   *   sixteenth → 0 (beat) | 1 (e) | 2 (+) | 3 (a)
   *   triplet  → 0 | 1 | 2
   * Defaults to 0 for notes created before this field was added.
   */
  subdivision: number
  /** Rhythmic value of this note; also used to derive its sounding duration. */
  duration: NoteDuration
  note: string        // e.g. "C4", "G#3"
  enabled: boolean
}

export interface MetronomeLoop {
  id: string
  name: string
  /** Goal tempo — the speed you're working towards. */
  targetBpm: number
  beatsPerBar: number  // 2–7
  noteValue: 4 | 8
  /** How many bars the passage lasts. */
  bars: number         // 1–8
  /** How many bars to count in before the loop starts. */
  countInBars: number  // 1–2
  /**
   * Multiple entries may share the same (bar, beat, subdivision) — that is intentional.
   * A chord is represented as several GuideNote entries at the same position.
   */
  guideNotes: GuideNote[]
  createdAt: number
  updatedAt: number
}
