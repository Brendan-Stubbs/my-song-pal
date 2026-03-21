/**
 * Client-side scale analysis utilities.
 * Uses tonal directly — no server round-trips needed.
 */
import { Scale, Note } from 'tonal'

// ─── Constants ───────────────────────────────────────────────────────────────

export const CHROMATIC_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

export const SCALE_NAMES = [
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
] as const

// Standard tuning: index 0 = string 6 (low E), index 5 = string 1 (high e)
export const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

// ─── Note helpers ────────────────────────────────────────────────────────────

/** Normalise any note/pitch-class to sharp notation, e.g. "Bb" → "A#". */
export function toSharp(note: string): string {
  const pc = Note.pitchClass(note)
  if (pc.includes('b')) {
    const enh = Note.enharmonic(pc)
    return enh && enh !== '' ? enh : pc
  }
  return pc
}

/**
 * Return the pitch class at (stringNum, fret) for a given tuning.
 * stringNum: 1 = high e, 6 = low E (standard guitar convention).
 */
export function getPitchClassAt(
  stringNum: number,
  fret: number,
  tuning: string[] = STANDARD_TUNING,
): string {
  // tuning[0] = string 6 (low E), tuning[5] = string 1 (high e)
  const openNote = tuning[6 - stringNum]
  if (!openNote) return ''
  const midi = Note.midi(openNote)
  if (midi == null) return ''
  return toSharp(Note.fromMidi(midi + fret))
}

// ─── Scale match types ────────────────────────────────────────────────────────

export interface ScaleMatch {
  key: string
  scaleName: string
  /** Human-readable name, e.g. "C Major" */
  displayName: string
  /** All pitch classes in the scale (sharp notation, ordered) */
  scaleNotes: string[]
  /** The scale notes that overlap with the selection */
  matchedNotes: string[]
  /** Scale notes NOT in the selection — the "extra" notes */
  extraNotes: string[]
  extraNoteCount: number
}

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * Given a set of pitch classes the user has selected on the fretboard,
 * return every scale (across all 12 keys) whose note set is a superset
 * of the selection.
 *
 * @param selectedPitchClasses  Array of pitch-class strings (will be normalised)
 * @param rootFilter            Optional: limit results to scales whose root is this note
 */
export function findMatchingScales(
  selectedPitchClasses: string[],
  rootFilter?: string,
): ScaleMatch[] {
  if (selectedPitchClasses.length < 2) return []

  const selected = new Set(selectedPitchClasses.map(toSharp))
  const normRoot = rootFilter ? toSharp(rootFilter) : undefined
  const results: ScaleMatch[] = []

  for (const key of CHROMATIC_KEYS) {
    if (normRoot && key !== normRoot) continue

    for (const scaleName of SCALE_NAMES) {
      const scaleData = Scale.get(`${key} ${scaleName}`)
      if (scaleData.empty || scaleData.notes.length === 0) continue

      const scaleNotes = scaleData.notes.map(toSharp)
      const scaleSet = new Set(scaleNotes)

      // Only include the scale if it contains ALL selected notes
      const allContained = [...selected].every((n) => scaleSet.has(n))
      if (!allContained) continue

      const extraNotes = scaleNotes.filter((n) => !selected.has(n))
      const matchedNotes = scaleNotes.filter((n) => selected.has(n))

      results.push({
        key,
        scaleName,
        displayName: `${key} ${scaleName.charAt(0).toUpperCase() + scaleName.slice(1)}`,
        scaleNotes,
        matchedNotes,
        extraNotes,
        extraNoteCount: extraNotes.length,
      })
    }
  }

  // Sort: fewest extra notes first, then by chromatic key order
  return results.sort((a, b) =>
    a.extraNoteCount !== b.extraNoteCount
      ? a.extraNoteCount - b.extraNoteCount
      : CHROMATIC_KEYS.indexOf(a.key as typeof CHROMATIC_KEYS[number]) -
        CHROMATIC_KEYS.indexOf(b.key as typeof CHROMATIC_KEYS[number]),
  )
}
