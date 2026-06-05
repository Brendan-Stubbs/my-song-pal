/**
 * Hardcoded CAGED scale position patterns.
 *
 * Structure: patterns[positionIndex][stringIndex][fretIndex]
 * - positionIndex: 0-4 for the 5 CAGED positions
 * - stringIndex: 0 = string 1 (high e), 5 = string 6 (low E)
 * - fretIndex: 0-based fret within the position (0 = leftmost fret of pattern)
 * - Value: 0 = not played, 'x' = played (scale note), 'R' = root note
 *
 * Scale degrees are CALCULATED from these patterns (R = 1, +/-1 per step by direction).
 * Degrees + key → notes. Root fret = where the key lies on that string for the tuning.
 */

import { major } from './scales/major'
import { major3NotesPerString } from './scales/major-3-notes-per-string'
import { minor } from './scales/minor'
import { pentatonicMajor } from './scales/pentatonic-major'
import { pentatonicMinor } from './scales/pentatonic-minor'
import { blues } from './scales/blues'
import { dorian } from './scales/dorian'
import { phrygian } from './scales/phrygian'
import { lydian } from './scales/lydian'
import { mixolydian } from './scales/mixolydian'
import { locrian } from './scales/locrian'
import { harmonicMinor } from './scales/harmonic-minor'
import { melodicMinor } from './scales/melodic-minor'

export type ScalePatternCell = 0 | 'x' | 'R'
export type ScalePattern = ScalePatternCell[][]

export type ScalePatternSet = {
  [scale: string]: ScalePattern[]
}

export const SCALE_PATTERNS: ScalePatternSet = {
  major,
  minor,
  'pentatonic major': pentatonicMajor,
  'pentatonic minor': pentatonicMinor,
  blues,
  dorian,
  phrygian,
  lydian,
  mixolydian,
  locrian,
  'harmonic minor': harmonicMinor,
  'melodic minor': melodicMinor,
}

/**
 * Alternate "3 notes per string" fingerings, keyed by the same scale name used
 * in SCALE_PATTERNS. A scale only appears here if a 3nps fingering exists for
 * it; the Scale Positions view shows a Default / 3 notes per string toggle
 * exactly when the selected scale has an entry below.
 */
export const SCALE_PATTERNS_3NPS: ScalePatternSet = {
  major: major3NotesPerString,
}

/** Whether the given scale has an alternate 3-notes-per-string fingering. */
export function hasThreeNotesPerString(scale: string): boolean {
  const patterns = SCALE_PATTERNS_3NPS[scale]
  return Array.isArray(patterns) && patterns.length > 0
}
