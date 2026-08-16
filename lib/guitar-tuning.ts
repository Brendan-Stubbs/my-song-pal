/**
 * Shared guitar tuning definitions.
 *
 * Used by the fretboard note picker and the tab editor so the "current tuning"
 * (persisted in localStorage) stays consistent across the whole metronome loop
 * editing experience.
 *
 * String indexing convention (matches the fretboard picker):
 *   - `midi[0]` / `labels[0]` = string 6 (lowest / thickest)
 *   - `midi[5]` / `labels[5]` = string 1 (highest / thinnest)
 *
 * The user-facing `guitarString` number is 1 (high e) … 6 (low E), i.e.
 *   guitarString = 6 - tuningIndex.
 */

import { Note } from 'tonal'

export interface Tuning {
  id: string
  name: string
  /** Display label for each string, index 0 = string 6 (low). */
  labels: string[]
  /** Open-string MIDI note for each string, index 0 = string 6 (low). */
  midi: number[]
}

export const TUNINGS: Tuning[] = [
  { id: 'standard',        name: 'Standard (EADGBe)',    labels: ['E','A','D','G','B','e'],       midi: [40, 45, 50, 55, 59, 64] },
  { id: 'drop-d',          name: 'Drop D (DADGBe)',      labels: ['D','A','D','G','B','e'],       midi: [38, 45, 50, 55, 59, 64] },
  { id: 'half-step-down',  name: 'Eb (½ step down)',     labels: ['Eb','Ab','Db','Gb','Bb','eb'], midi: [39, 44, 49, 54, 58, 63] },
  { id: 'full-step-down',  name: 'D (full step down)',   labels: ['D','G','C','F','A','d'],       midi: [38, 43, 48, 53, 57, 62] },
  { id: 'open-g',          name: 'Open G (DGDGBd)',      labels: ['D','G','D','G','B','d'],        midi: [38, 43, 50, 55, 59, 62] },
  { id: 'open-d',          name: 'Open D (DADf#ad)',     labels: ['D','A','D','F#','A','d'],       midi: [38, 45, 50, 54, 57, 62] },
  { id: 'dadgad',          name: 'DADGAD',               labels: ['D','A','D','G','A','d'],        midi: [38, 45, 50, 55, 57, 62] },
]

export const TUNING_LS_KEY = 'mysongpal_fretboard_tuning'

export function loadTuningId(): string {
  if (typeof window === 'undefined') return 'standard'
  return localStorage.getItem(TUNING_LS_KEY) ?? 'standard'
}

export function saveTuningId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TUNING_LS_KEY, id)
  } catch {
    /* quota */
  }
}

export function getTuning(id: string): Tuning {
  return TUNINGS.find((t) => t.id === id) ?? TUNINGS[0]
}

/** Convert a user-facing guitar string (1 = high e … 6 = low E) to a tuning index. */
export function stringToTuningIndex(guitarString: number): number {
  return 6 - guitarString
}

/** MIDI note for a string/fret in the given tuning. */
export function midiAt(tuning: Tuning, guitarString: number, fret: number): number {
  return tuning.midi[stringToTuningIndex(guitarString)] + fret
}

/** Scientific note name (e.g. "E4") for a string/fret in the given tuning. */
export function noteNameAt(tuning: Tuning, guitarString: number, fret: number): string {
  return Note.fromMidi(midiAt(tuning, guitarString, fret)) ?? ''
}
