/**
 * Client-side chord identification utilities.
 *
 * Unlike the scale finder — which fuzzy-matches (finds any scale that *contains*
 * the selected notes) — the chord finder requires an EXACT match: the set of
 * selected pitch classes must equal the chord's set of pitch classes. Because
 * several chords can share the same note set (e.g. C6 and Am7), every valid
 * naming is returned.
 *
 * Uses tonal directly — no server round-trips needed.
 */
import { Note, ChordType } from 'tonal'

// ─── Constants ───────────────────────────────────────────────────────────────

export const CHROMATIC_ROOTS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

// Canonical sharp-spelled pitch classes indexed by chroma (0–11)
const SHARP_PCS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

/**
 * Curated chord vocabulary, ordered by how common the chord type is. Each entry
 * references a tonal chord-type alias (used to look up the intervals) plus a
 * clean symbol suffix and human label we control for display.
 *
 * Ordering matters: matches are returned in this order (per root), so the most
 * common namings surface first.
 */
interface ChordTypeDef {
  /** Tonal chord-type alias used to resolve intervals. */
  alias: string
  /** Suffix appended to the root to form the chord symbol (e.g. "m7" → "Am7"). */
  suffix: string
  /** Human-readable chord-type label (e.g. "Minor 7th"). */
  label: string
}

const CHORD_TYPES: ChordTypeDef[] = [
  { alias: 'M',      suffix: '',      label: 'Major' },
  { alias: 'm',      suffix: 'm',     label: 'Minor' },
  { alias: '5',      suffix: '5',     label: 'Power chord (5th)' },
  { alias: 'sus2',   suffix: 'sus2',  label: 'Suspended 2nd' },
  { alias: 'sus4',   suffix: 'sus4',  label: 'Suspended 4th' },
  { alias: 'dim',    suffix: 'dim',   label: 'Diminished' },
  { alias: 'aug',    suffix: 'aug',   label: 'Augmented' },
  { alias: '6',      suffix: '6',     label: 'Major 6th' },
  { alias: 'm6',     suffix: 'm6',    label: 'Minor 6th' },
  { alias: '7',      suffix: '7',     label: 'Dominant 7th' },
  { alias: 'maj7',   suffix: 'maj7',  label: 'Major 7th' },
  { alias: 'm7',     suffix: 'm7',    label: 'Minor 7th' },
  { alias: 'm7b5',   suffix: 'm7b5',  label: 'Half-diminished 7th' },
  { alias: 'dim7',   suffix: 'dim7',  label: 'Diminished 7th' },
  { alias: '7sus4',  suffix: '7sus4', label: 'Dominant 7th sus4' },
  { alias: 'mMaj7',  suffix: 'mMaj7', label: 'Minor-major 7th' },
  { alias: 'maj7#5', suffix: 'maj7#5', label: 'Augmented major 7th' },
  { alias: '7#5',    suffix: '7#5',   label: 'Augmented 7th' },
  { alias: 'add9',   suffix: 'add9',  label: 'Added 9th' },
  { alias: 'madd9',  suffix: 'madd9', label: 'Minor added 9th' },
  { alias: '6add9',  suffix: '6/9',   label: 'Six-nine' },
  { alias: '9',      suffix: '9',     label: 'Dominant 9th' },
  { alias: 'maj9',   suffix: 'maj9',  label: 'Major 9th' },
  { alias: 'm9',     suffix: 'm9',    label: 'Minor 9th' },
]

// ─── Note helpers ────────────────────────────────────────────────────────────

/**
 * Normalise any note/pitch-class to a canonical sharp-spelled pitch class,
 * e.g. "Bb" → "A#", "E#" → "F", "Cb" → "B". Uses chroma so it is robust to any
 * enharmonic spelling (including notes produced by exotic chord intervals).
 */
export function normalizePc(note: string): string {
  const chroma = Note.chroma(note)
  if (chroma == null) return Note.pitchClass(note)
  return SHARP_PCS[chroma]
}

// ─── Chord match types ─────────────────────────────────────────────────────────

export interface ChordMatch {
  /** Root pitch class (sharp notation). */
  root: string
  /** Chord symbol, e.g. "Am7". */
  symbol: string
  /** Human-readable chord-type label, e.g. "Minor 7th". */
  typeLabel: string
  /** All pitch classes in the chord (sharp notation, root-first order). */
  chordNotes: string[]
}

// ─── Pre-resolved chord intervals (resolved once at module load) ───────────────

interface ResolvedType extends ChordTypeDef {
  intervals: string[]
}

const RESOLVED_TYPES: ResolvedType[] = CHORD_TYPES.flatMap((def) => {
  const type = ChordType.get(def.alias)
  if (type.empty || type.intervals.length === 0) return []
  return [{ ...def, intervals: type.intervals }]
})

// ─── Analysis ────────────────────────────────────────────────────────────────

/**
 * Given the pitch classes the user selected on the fretboard, return every
 * chord whose note set is EXACTLY equal to the selection (same size, same
 * members). Enharmonically-equivalent namings (e.g. C6 vs Am7) are all
 * returned, ordered by chord-type commonness then by root.
 *
 * @param selectedPitchClasses  Array of pitch-class strings (will be normalised)
 */
export function findMatchingChords(selectedPitchClasses: string[]): ChordMatch[] {
  const selected = new Set(selectedPitchClasses.map(normalizePc))
  if (selected.size < 2) return []

  const results: ChordMatch[] = []

  // Outer loop over chord types (in commonness order) so results are naturally
  // ordered from most to least common chord shape.
  for (const type of RESOLVED_TYPES) {
    // A chord can only match if it has the same number of notes as the selection.
    if (type.intervals.length !== selected.size) continue

    for (const root of CHROMATIC_ROOTS) {
      const chordNotes = type.intervals.map((iv) => normalizePc(Note.transpose(root, iv)))
      const chordSet = new Set(chordNotes)

      // Exact match: same size AND every selected note is in the chord.
      if (chordSet.size !== selected.size) continue
      const isExact = [...selected].every((n) => chordSet.has(n))
      if (!isExact) continue

      results.push({
        root,
        symbol: `${root}${type.suffix}`,
        typeLabel: type.label,
        chordNotes,
      })
    }
  }

  return results
}
