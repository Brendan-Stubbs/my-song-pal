/**
 * Hardcoded CAGED scale position patterns.
 *
 * Structure: patterns[positionIndex][stringIndex][fretIndex]
 * - positionIndex: 0-4 for the 5 CAGED positions
 * - stringIndex: 0 = string 1 (high e), 5 = string 6 (low E)
 * - fretIndex: 0-based fret within the position (0 = leftmost fret of pattern)
 * - Value: 0 = unused, 1-7 = scale degree
 *
 * Notes are inferred from the theory layer using scale degrees.
 */

export type ScalePattern = number[][];

export type ScalePatternSet = {
  [scale: string]: ScalePattern[];
};

/**
 * Major scale CAGED positions (5 patterns).
 * Other scales use empty arrays until patterns are added.
 */
export const SCALE_PATTERNS: ScalePatternSet = {
  major: [
    // Pattern 1
    [
      [0, 7, 1, 0, 3, 0, 0],
      [0, 0, 1, 0, 3, 0, 0],
      [0, 7, 0, 2, 3, 0, 0],
      [0, 7, 0, 2, 3, 0, 0],
      [0, 7, 1, 0, 3, 0, 0],
      [0, 7, 1, 0, 2, 0, 0],
    ],
    // Pattern 2
    [
      [0, 7, 0, 2, 3, 0, 0],
      [0, 7, 0, 2, 3, 0, 0],
      [7, 1, 0, 3, 0, 0, 0],
      [7, 1, 0, 3, 0, 0, 0],
      [0, 7, 0, 2, 0, 0, 0],
      [0, 7, 0, 2, 3, 0, 0],
    ],
    // Pattern 3
    [
      [0, 3, 4, 0, 5, 0, 0],
      [0, 7, 1, 0, 2, 0, 0],
      [0, 5, 0, 6, 0, 0, 0],
      [0, 2, 0, 3, 4, 0, 0],
      [0, 6, 0, 7, 1, 0, 0],
      [0, 3, 4, 0, 5, 0, 0],
    ],
    // Pattern 4
    [
      [0, 0, 5, 0, 6, 0, 0],
      [0, 0, 2, 0, 3, 4, 0],
      [0, 6, 0, 7, 1, 0, 0],
      [0, 3, 4, 0, 5, 0, 0],
      [0, 7, 1, 0, 2, 0, 0],
      [0, 0, 5, 0, 6, 0, 0],
    ],
    // Pattern 5
    [
      [0, 0, 7, 1, 0, 0, 0],
      [0, 0, 4, 5, 6, 0, 0],
      [0, 1, 2, 3, 0, 0, 0],
      [0, 0, 5, 6, 0, 0, 0],
      [0, 0, 2, 3, 4, 0, 0],
      [0, 0, 7, 1, 0, 0, 0],
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
};
