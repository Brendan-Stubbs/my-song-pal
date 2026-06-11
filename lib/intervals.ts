// Interval definitions used by the ear-training / interval recognition feature.

export interface Interval {
  /** Distance in semitones from the root. */
  semitones: number
  /** Full display name, e.g. "Minor 3rd". */
  name: string
  /** Short label, e.g. "m3". */
  short: string
}

export const INTERVALS: Interval[] = [
  { semitones: 1, name: 'Minor 2nd', short: 'm2' },
  { semitones: 2, name: 'Major 2nd', short: 'M2' },
  { semitones: 3, name: 'Minor 3rd', short: 'm3' },
  { semitones: 4, name: 'Major 3rd', short: 'M3' },
  { semitones: 5, name: 'Perfect 4th', short: 'P4' },
  { semitones: 6, name: 'Tritone', short: 'TT' },
  { semitones: 7, name: 'Perfect 5th', short: 'P5' },
  { semitones: 8, name: 'Minor 6th', short: 'm6' },
  { semitones: 9, name: 'Major 6th', short: 'M6' },
  { semitones: 10, name: 'Minor 7th', short: 'm7' },
  { semitones: 11, name: 'Major 7th', short: 'M7' },
  { semitones: 12, name: 'Octave', short: 'P8' },
]

export function getInterval(semitones: number): Interval | undefined {
  return INTERVALS.find((i) => i.semitones === semitones)
}

export type IntervalDirection = 'ascending' | 'descending' | 'both'

/** Timer length options (seconds). `null` means no timer / endless practice. */
export const TIMER_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: 'No timer', seconds: null },
]
