import { Scale, Note } from 'tonal'
import type {
  IMusicTheoryService,
  ScaleInfo,
  FretboardNote,
  CagedPosition,
  ChordInfo,
} from '@/types/music'
import { SCALE_PATTERNS } from '@/data/scale-patterns'

/** Get pitch class at (string, fret) from tuning. tuning[0]=string 6, tuning[5]=string 1 */
function getNoteAt(stringNumber: number, fret: number, tuning: string[]): string {
  const openNote = tuning[6 - stringNumber]
  if (!openNote) return ''
  const midi = Note.midi(openNote)
  if (midi == null) return ''
  return toSharp(pitchClass(Note.fromMidi(midi + fret)))
}

/** Frets 0–24 that produce the key on this string */
function fretsForKeyOnString(
  stringNumber: number,
  key: string,
  tuning: string[],
): number[] {
  const keyPc = toSharp(pitchClass(key))
  const out: number[] = []
  for (let f = 0; f <= 24; f++) {
    if (getNoteAt(stringNumber, f, tuning) === keyPc) out.push(f)
  }
  return out
}

const AVAILABLE_SCALES = [
  'major',
  'minor',
  'pentatonic major',
  'pentatonic minor',
  'blues',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic minor',
  'melodic minor',
]

const AVAILABLE_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']


const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/**
 * Normalise a pitch class to always use sharps (e.g. "Db" → "C#").
 * Tonal's Note.enharmonic gives the enharmonic, so we only call it when
 * the note name contains a flat.
 */
function toSharp(note: string): string {
  if (note.includes('b')) {
    const enh = Note.enharmonic(note)
    return enh && enh !== '' ? enh : note
  }
  return note
}

/**
 * Strip the octave number from a note with octave (e.g. "C3" → "C").
 */
function pitchClass(note: string): string {
  return Note.pitchClass(note)
}

/**
 * Get the degree label for a degree index within scale intervals.
 * Uses the interval name to build labels like "b3", "#5" etc.
 */
function degreeLabel(index: number, intervals: string[]): string {
  // index is 0-based; scale degree is index+1
  // Tonal intervals look like "1P", "2M", "3m", "4P", "5P", "6M", "7m"
  // Simple degrees: just return the number portion
  const interval = intervals[index]
  if (!interval) return String(index + 1)

  const num = parseInt(interval, 10)
  const quality = interval.slice(String(num).length)

  // Perfect / Major → plain number
  if (quality === 'P' || quality === 'M') return String(num)
  // Minor → flat
  if (quality === 'm') return `b${num}`
  // Augmented → sharp
  if (quality === 'A') return `#${num}`
  // Diminished
  if (quality === 'd') return `b${num}`

  return String(num)
}

export function createTonalAdapter(): IMusicTheoryService {
  function getScaleInfo(key: string, scale: string): ScaleInfo {
    const scaleResult = Scale.get(`${key} ${scale}`)

    if (!scaleResult || scaleResult.empty || scaleResult.notes.length === 0) {
      throw new Error(`Unknown scale: "${key} ${scale}"`)
    }

    const notes = scaleResult.notes.map(toSharp)
    const intervals = scaleResult.intervals
    const degrees = intervals.map((_, i) => degreeLabel(i, intervals))

    return {
      key,
      scale,
      notes,
      intervals,
      degrees,
    }
  }

  function getAvailableScales(): string[] {
    return [...AVAILABLE_SCALES]
  }

  function getAvailableKeys(): string[] {
    return [...AVAILABLE_KEYS]
  }

  function getFretboardNotes(
    key: string,
    scale: string,
    tuning: string[] = DEFAULT_TUNING,
    fretCount: number,
  ): FretboardNote[] {
    const scaleInfo = getScaleInfo(key, scale)
    const scaleNotes = scaleInfo.notes  // already normalised to sharps

    const results: FretboardNote[] = []

    // tuning index 0 = string 6 (low E), index 5 = string 1 (high e)
    tuning.forEach((openNote, index) => {
      const stringNumber = 6 - index  // index 0 → string 6, index 5 → string 1
      const openMidi = Note.midi(openNote)
      if (openMidi === null || openMidi === undefined) return

      for (let fret = 0; fret <= fretCount; fret++) {
        const midi = openMidi + fret
        const noteWithOctave = Note.fromMidi(midi)
        const pc = toSharp(pitchClass(noteWithOctave))

        const degreeIndex = scaleNotes.indexOf(pc)
        if (degreeIndex === -1) continue

        const degree = degreeIndex + 1
        const label = degreeLabel(degreeIndex, scaleInfo.intervals)
        const isRoot = degree === 1

        results.push({
          string: stringNumber,
          fret,
          note: pc,
          degree,
          degreeLabel: label,
          isRoot,
        })
      }
    })

    return results
  }

  function getCagedPositions(
    key: string,
    scale: string,
    tuning: string[] = DEFAULT_TUNING,
  ): CagedPosition[] {
    let scaleInfo: ScaleInfo
    try {
      scaleInfo = getScaleInfo(key, scale)
    } catch {
      return []
    }

    if (scaleInfo.notes.length !== 7) {
      return []
    }

    const patterns = SCALE_PATTERNS[scale]
    if (!patterns || patterns.length === 0) {
      return []
    }

    const scaleNotes = scaleInfo.notes

    function buildNotes(
      pattern: (typeof patterns)[number],
      rootFret: number,
    ): FretboardNote[] {
      const notes: FretboardNote[] = []
      for (let rowIdx = 0; rowIdx < pattern.length; rowIdx++) {
        const row = pattern[rowIdx]
        for (let fo = 0; fo < row.length; fo++) {
          const cell = row[fo]
          if (cell === 0) continue

          const stringNumber = rowIdx + 1
          const fret = rootFret + fo
          const note = getNoteAt(stringNumber, fret, tuning)

          const degreeIndex = scaleNotes.indexOf(note)
          if (degreeIndex === -1) continue

          const degree = degreeIndex + 1
          const degreeLabel = scaleInfo.degrees[degreeIndex] ?? String(degree)

          notes.push({
            string: stringNumber,
            fret,
            note,
            degree,
            degreeLabel,
            isRoot: cell === 'R',
          })
        }
      }
      return notes
    }

    // Root fret: where the leftmost column of the pattern sits.
    // Find it by checking strings in order low E (6), A (5), D (4), G (3), B (2), high e (1).
    // Use the first string that has an R; rootFret = fretForKey - fretOffset.
    const STRING_PRIORITY = [6, 5, 4, 3, 2, 1]

    const candidates: { pattern: (typeof patterns)[number]; rootFret: number }[] = []

    for (const pattern of patterns) {
      const rByString = new Map<number, number[]>()
      for (let ri = 0; ri < pattern.length; ri++) {
        const stringNum = ri + 1
        for (let fi = 0; fi < pattern[ri].length; fi++) {
          if (pattern[ri][fi] === 'R') {
            const list = rByString.get(stringNum) ?? []
            list.push(fi)
            rByString.set(stringNum, list)
          }
        }
      }

      let best: number | null = null
      for (const stringNum of STRING_PRIORITY) {
        const fretOffsets = rByString.get(stringNum)
        if (!fretOffsets) continue

        for (const fretOffset of fretOffsets) {
          for (const f of fretsForKeyOnString(stringNum, key, tuning)) {
            const r = f - fretOffset
            if (r >= 0 && r <= 15 && (best == null || r < best)) best = r
          }
        }
        if (best != null) break
      }
      if (best != null) candidates.push({ pattern, rootFret: best })
    }

    const seen = new Set<number>()
    const adjusted = candidates.map(({ pattern, rootFret }) => {
      let r = rootFret
      while (seen.has(r)) r += 12
      seen.add(r)
      return { rootFret: r, notes: buildNotes(pattern, r) }
    })
    // Keep CAGED order (C, A, G, E, D) for position numbering; do not sort by rootFret

    return adjusted.map((p, i) => ({
      position: i + 1,
      rootFret: p.rootFret,
      notes: p.notes,
    }))
  }

  function getChords(key: string, scale: string): ChordInfo[] {
    const scaleInfo = getScaleInfo(key, scale)
    const notes = scaleInfo.notes
    const count = notes.length

    if (count < 5) {
      // Pentatonic / blues — not enough notes for triads, return empty
      return []
    }

    const chords: ChordInfo[] = []

    for (let i = 0; i < count; i++) {
      const root = notes[i]
      // third is i+2 (mod count), fifth is i+4 (mod count)
      const third = notes[(i + 2) % count]
      const fifth = notes[(i + 4) % count]

      // Determine semitone distances using MIDI
      const rootMidi = Note.midi(`${root}4`) ?? 0
      const thirdMidi = Note.midi(`${third}4`) ?? 0
      const fifthMidi = Note.midi(`${fifth}4`) ?? 0

      const thirdInterval = ((thirdMidi - rootMidi) + 12) % 12
      const fifthInterval = ((fifthMidi - rootMidi) + 24) % 12

      let quality: 'major' | 'minor' | 'diminished'
      if (thirdInterval === 4) {
        quality = 'major'
      } else if (thirdInterval === 3 && fifthInterval === 6) {
        quality = 'diminished'
      } else {
        quality = 'minor'
      }

      const degree = i + 1
      const romanBase = ROMAN_NUMERALS[i] ?? String(degree)
      let degreeLabel: string
      let symbol: string
      let name: string

      if (quality === 'major') {
        degreeLabel = romanBase
        symbol = root
        name = `${root} major`
      } else if (quality === 'diminished') {
        degreeLabel = `${romanBase.toLowerCase()}°`
        symbol = `${root}dim`
        name = `${root} diminished`
      } else {
        degreeLabel = romanBase.toLowerCase()
        symbol = `${root}m`
        name = `${root} minor`
      }

      chords.push({
        root,
        name,
        symbol,
        degree,
        degreeLabel,
        quality,
        notes: [root, third, fifth],
      })
    }

    return chords
  }

  return {
    getScaleInfo,
    getAvailableScales,
    getAvailableKeys,
    getFretboardNotes,
    getCagedPositions,
    getChords,
  }
}
