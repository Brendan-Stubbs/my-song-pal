/**
 * Chord formula reference data.
 * All examples are shown in the key of C.
 * Semitones are absolute distances from the root.
 */

export interface ChordFormula {
  name: string
  /** Short symbol suffix — e.g. "m", "dim", "maj7". Empty string for plain major. */
  symbol: string
  category: ChordFormulaCategory
  /** Scale degree labels — e.g. ["1", "3", "5"] */
  degrees: string[]
  /** Interval names — e.g. ["Root", "Major 3rd", "Perfect 5th"] */
  intervals: string[]
  /** Interval abbreviations — e.g. ["R", "M3", "P5"] */
  intervalAbbr: string[]
  /** Semitone distances from root */
  semitones: number[]
  /** Notes when root is C */
  exampleNotes: string[]
  /** Brief plain-English description */
  description: string
}

export type ChordFormulaCategory =
  | 'Triads'
  | 'Seventh Chords'
  | 'Suspended'
  | 'Extended'

export const CHORD_FORMULAS: ChordFormula[] = [
  // ── Triads ────────────────────────────────────────────────────────────────
  {
    name: 'Major',
    symbol: '',
    category: 'Triads',
    degrees: ['1', '3', '5'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th'],
    intervalAbbr: ['R', 'M3', 'P5'],
    semitones: [0, 4, 7],
    exampleNotes: ['C', 'E', 'G'],
    description: 'Bright and stable. The foundation of Western harmony.',
  },
  {
    name: 'Minor',
    symbol: 'm',
    category: 'Triads',
    degrees: ['1', '♭3', '5'],
    intervals: ['Root', 'Minor 3rd', 'Perfect 5th'],
    intervalAbbr: ['R', 'm3', 'P5'],
    semitones: [0, 3, 7],
    exampleNotes: ['C', 'E♭', 'G'],
    description: 'Darker and more melancholic than major.',
  },
  {
    name: 'Diminished',
    symbol: 'dim',
    category: 'Triads',
    degrees: ['1', '♭3', '♭5'],
    intervals: ['Root', 'Minor 3rd', 'Diminished 5th'],
    intervalAbbr: ['R', 'm3', 'd5'],
    semitones: [0, 3, 6],
    exampleNotes: ['C', 'E♭', 'G♭'],
    description: 'Tense and unstable. Typically resolves outward.',
  },
  {
    name: 'Augmented',
    symbol: 'aug',
    category: 'Triads',
    degrees: ['1', '3', '♯5'],
    intervals: ['Root', 'Major 3rd', 'Augmented 5th'],
    intervalAbbr: ['R', 'M3', 'A5'],
    semitones: [0, 4, 8],
    exampleNotes: ['C', 'E', 'G♯'],
    description: 'Dreamy and unresolved. Common in jazz and film scores.',
  },

  // ── Suspended ─────────────────────────────────────────────────────────────
  {
    name: 'Suspended 2nd',
    symbol: 'sus2',
    category: 'Suspended',
    degrees: ['1', '2', '5'],
    intervals: ['Root', 'Major 2nd', 'Perfect 5th'],
    intervalAbbr: ['R', 'M2', 'P5'],
    semitones: [0, 2, 7],
    exampleNotes: ['C', 'D', 'G'],
    description: 'Open and airy. The 3rd is replaced by the 2nd.',
  },
  {
    name: 'Suspended 4th',
    symbol: 'sus4',
    category: 'Suspended',
    degrees: ['1', '4', '5'],
    intervals: ['Root', 'Perfect 4th', 'Perfect 5th'],
    intervalAbbr: ['R', 'P4', 'P5'],
    semitones: [0, 5, 7],
    exampleNotes: ['C', 'F', 'G'],
    description: 'Slightly tense. The 3rd is replaced by the 4th, creating anticipation.',
  },

  // ── Seventh Chords ────────────────────────────────────────────────────────
  {
    name: 'Dominant 7th',
    symbol: '7',
    category: 'Seventh Chords',
    degrees: ['1', '3', '5', '♭7'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th', 'Minor 7th'],
    intervalAbbr: ['R', 'M3', 'P5', 'm7'],
    semitones: [0, 4, 7, 10],
    exampleNotes: ['C', 'E', 'G', 'B♭'],
    description: 'The most tension-filled 7th chord. Strongly wants to resolve to the tonic.',
  },
  {
    name: 'Major 7th',
    symbol: 'maj7',
    category: 'Seventh Chords',
    degrees: ['1', '3', '5', '7'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th', 'Major 7th'],
    intervalAbbr: ['R', 'M3', 'P5', 'M7'],
    semitones: [0, 4, 7, 11],
    exampleNotes: ['C', 'E', 'G', 'B'],
    description: 'Warm and lush. The hallmark of jazz and bossa nova.',
  },
  {
    name: 'Minor 7th',
    symbol: 'm7',
    category: 'Seventh Chords',
    degrees: ['1', '♭3', '5', '♭7'],
    intervals: ['Root', 'Minor 3rd', 'Perfect 5th', 'Minor 7th'],
    intervalAbbr: ['R', 'm3', 'P5', 'm7'],
    semitones: [0, 3, 7, 10],
    exampleNotes: ['C', 'E♭', 'G', 'B♭'],
    description: 'Soulful and smooth. The ii chord in major keys.',
  },
  {
    name: 'Minor Major 7th',
    symbol: 'mMaj7',
    category: 'Seventh Chords',
    degrees: ['1', '♭3', '5', '7'],
    intervals: ['Root', 'Minor 3rd', 'Perfect 5th', 'Major 7th'],
    intervalAbbr: ['R', 'm3', 'P5', 'M7'],
    semitones: [0, 3, 7, 11],
    exampleNotes: ['C', 'E♭', 'G', 'B'],
    description: 'Eerie and cinematic. Common in spy and thriller music.',
  },
  {
    name: 'Half Diminished',
    symbol: 'm7♭5',
    category: 'Seventh Chords',
    degrees: ['1', '♭3', '♭5', '♭7'],
    intervals: ['Root', 'Minor 3rd', 'Diminished 5th', 'Minor 7th'],
    intervalAbbr: ['R', 'm3', 'd5', 'm7'],
    semitones: [0, 3, 6, 10],
    exampleNotes: ['C', 'E♭', 'G♭', 'B♭'],
    description: 'The vii chord in major keys. Tense but less harsh than fully diminished.',
  },
  {
    name: 'Diminished 7th',
    symbol: 'dim7',
    category: 'Seventh Chords',
    degrees: ['1', '♭3', '♭5', '♭♭7'],
    intervals: ['Root', 'Minor 3rd', 'Diminished 5th', 'Diminished 7th'],
    intervalAbbr: ['R', 'm3', 'd5', 'd7'],
    semitones: [0, 3, 6, 9],
    exampleNotes: ['C', 'E♭', 'G♭', 'B♭♭'],
    description: 'Fully symmetric — all minor 3rds. Maximum tension, used for dramatic effect.',
  },

  // ── Extended ──────────────────────────────────────────────────────────────
  {
    name: 'Dominant 9th',
    symbol: '9',
    category: 'Extended',
    degrees: ['1', '3', '5', '♭7', '9'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th', 'Minor 7th', 'Major 9th'],
    intervalAbbr: ['R', 'M3', 'P5', 'm7', 'M9'],
    semitones: [0, 4, 7, 10, 14],
    exampleNotes: ['C', 'E', 'G', 'B♭', 'D'],
    description: 'Rich and funky. Extends the dominant 7th with the 9th.',
  },
  {
    name: 'Major 9th',
    symbol: 'maj9',
    category: 'Extended',
    degrees: ['1', '3', '5', '7', '9'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th', 'Major 7th', 'Major 9th'],
    intervalAbbr: ['R', 'M3', 'P5', 'M7', 'M9'],
    semitones: [0, 4, 7, 11, 14],
    exampleNotes: ['C', 'E', 'G', 'B', 'D'],
    description: 'Lush and ethereal. The most open-sounding of the major family.',
  },
  {
    name: 'Minor 9th',
    symbol: 'm9',
    category: 'Extended',
    degrees: ['1', '♭3', '5', '♭7', '9'],
    intervals: ['Root', 'Minor 3rd', 'Perfect 5th', 'Minor 7th', 'Major 9th'],
    intervalAbbr: ['R', 'm3', 'P5', 'm7', 'M9'],
    semitones: [0, 3, 7, 10, 14],
    exampleNotes: ['C', 'E♭', 'G', 'B♭', 'D'],
    description: 'Deep and expressive. Common in neo-soul and R&B.',
  },
  {
    name: 'Added 9th',
    symbol: 'add9',
    category: 'Extended',
    degrees: ['1', '3', '5', '9'],
    intervals: ['Root', 'Major 3rd', 'Perfect 5th', 'Major 9th'],
    intervalAbbr: ['R', 'M3', 'P5', 'M9'],
    semitones: [0, 4, 7, 14],
    exampleNotes: ['C', 'E', 'G', 'D'],
    description: 'A triad with the 9th added — no 7th. Bright and colourful.',
  },
]

export const CATEGORIES: ChordFormulaCategory[] = [
  'Triads',
  'Suspended',
  'Seventh Chords',
  'Extended',
]
