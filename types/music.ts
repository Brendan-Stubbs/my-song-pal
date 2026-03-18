// A note on a specific string and fret
export interface FretboardNote {
  string: number       // 1 = high e, 6 = low E (standard guitar convention)
  fret: number
  note: string         // e.g. "C", "F#"
  degree: number       // scale degree 1-7
  degreeLabel: string  // "1", "2", "3", "4", "5", "6", "7" or "b3", "#5" etc
  isRoot: boolean
}

// A full fretboard position (one of 5 positions across the neck)
export interface CagedPosition {
  position: number          // 1–5, ordered ascending by fret
  rootFret: number          // fret where the root note sits for this position
  notes: FretboardNote[]    // all notes in this position window
}

// A chord (triad) available in the key
export interface ChordInfo {
  root: string         // e.g. "C"
  name: string         // e.g. "C major", "D minor"
  symbol: string       // e.g. "C", "Dm", "Bdim"
  degree: number       // 1-7
  degreeLabel: string  // "I", "II", "III" etc (roman numerals)
  quality: 'major' | 'minor' | 'diminished'
  notes: string[]      // e.g. ["C", "E", "G"]
}

// The full scale info for a given key + scale
export interface ScaleInfo {
  key: string          // e.g. "C"
  scale: string        // e.g. "major"
  notes: string[]      // all notes in the scale
  intervals: string[]  // e.g. ["1P", "2M", "3M", "4P", "5P", "6M", "7M"]
  degrees: string[]    // e.g. ["1", "2", "3", "4", "5", "6", "7"]
}

export interface IMusicTheoryService {
  getScaleInfo(key: string, scale: string): ScaleInfo
  getAvailableScales(): string[]
  getAvailableKeys(): string[]
  getFretboardNotes(key: string, scale: string, tuning: string[], fretCount: number): FretboardNote[]
  getCagedPositions(key: string, scale: string, tuning: string[]): CagedPosition[]
  getChords(key: string, scale: string): ChordInfo[]
}
