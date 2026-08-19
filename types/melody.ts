/**
 * Melody Maker data model.
 *
 * A melody is a short, looping arrangement of single notes on a step grid,
 * optionally backed by a "rung-out" chord per bar (no strum / rhythm — the
 * chord simply sounds at the top of its bar and rings).
 */

/** Diatonic triad quality, matching the music adapter's ChordInfo. */
export type DiatonicQuality = 'major' | 'minor' | 'diminished'

/** A single placed note: a MIDI pitch at a grid step. */
export interface MelodyNote {
  id: string
  /** 0-indexed step within the whole timeline (0 … bars*stepsPerBar-1). */
  step: number
  /** MIDI note number. */
  midi: number
}

/** A chord assigned to a bar. Rings for the bar; no internal rhythm. */
export interface MelodyChord {
  /** 0-indexed bar the chord rings over. At most one chord per bar. */
  bar: number
  /** Root pitch class, e.g. "C", "F#". */
  root: string
  quality: DiatonicQuality
  /** Roman-numeral degree label, e.g. "I", "ii", "vii°". */
  degreeLabel: string
  /** Chord pitch classes captured at add-time, e.g. ["C","E","G"]. */
  notes: string[]
}

export interface Melody {
  id: string
  name: string
  /** Key/root the palette + chords are derived from, e.g. "A". */
  key: string
  /** Scale id (app spelling), e.g. "major", "pentatonic minor". */
  scaleId: string
  /** Playback tempo in BPM. */
  bpm: number
  /** Number of bars (1–8). */
  bars: number
  /** Grid resolution: steps per bar (4 = quarters, 8 = eighths). */
  stepsPerBar: number
  notes: MelodyNote[]
  chords: MelodyChord[]
  createdAt: number
  updatedAt: number
}
