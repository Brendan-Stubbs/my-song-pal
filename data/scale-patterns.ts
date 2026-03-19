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

export type ScalePatternCell = 0 | 'x' | 'R'
export type ScalePattern = ScalePatternCell[][]

export type ScalePatternSet = {
  [scale: string]: ScalePattern[]
}

/**
 * Major scale CAGED positions. Hardcoded as x, 0, R.
 * C, A, G, E, D shapes.
 */
export const SCALE_PATTERNS: ScalePatternSet = {
  major: [
    // C shape
    [
      ['x', 'R', 0, 'x', 0],
      [0, 'x', 0, 'x', 0],
      ['x', 0, 'x', 'x', 0],
      ['x', 0, 'x', 'R', 0],
      ['x', 'x', 0, 'x', 0],
      ['x', 'R', 0, 'x', 0],
    ],
    // A shape
    [
      [0, 'x', 0, 'x', 'x'],
      [0, 'x', 0, 'x', 'R'],
      ['x', 'x', 0, 'x', 0],
      ['x', 'R', 0, 'x', 0],
      [0, 'x', 0, 'x', 0],
      [0, 'x', 0, 'x', 'x'],
    ],
    // G shape
    [
      [0, 'x', 'x', 0, 'x', 0, 0],
      [0, 'x', 'R', 0, 'x', 0, 0],
      [0, 'x', 0, 'x', 0, 0, 0],
      [0, 'x', 0, 'x', 'x', 0, 0],
      [0, 'x', 0, 'x', 'R', 0, 0],
      [0, 'x', 'x', 0, 'x', 0, 0],
    ],
    // E shape
    [
      [0, 0, 'x', 0, 'x', 0, 0],
      [0, 0, 'x', 0, 'x', 'x', 0],
      [0, 'x', 0, 'x', 'R', 0, 0],
      [0, 'x', 'x', 0, 'x', 0, 0],
      [0, 'R', 'x', 0, 'x', 0, 0],
      [0, 0, 'x', 0, 'x', 0, 0],
    ],
    // D shape
    [
      [0, 0, 'x', 'R', 0, 0, 0],
      [0, 0, 'x', 'x', 'x', 0, 0],
      [0, 'R', 'x', 'x', 0, 0, 0],
      [0, 0, 'x', 'x', 0, 0, 0],
      [0, 0, 'x', 'x', 'x', 0, 0],
      [0, 0, 'x', 'R', 0, 0, 0],
    ],
  ],
  minor: [],
  "pentatonic major": [],
  "pentatonic minor": [],
  blues: [],
  dorian: [],
  phrygian: [],
  lydian: [],
  mixolydian: [],
  locrian: [],
  "harmonic minor": [],
  "melodic minor": [],
}
