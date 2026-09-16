/**
 * Data for the "chords in a key" grid: one column per scale note (root first,
 * ascending) and one row per diatonic chord, with the chord's own notes spelled
 * out in the columns they occupy.
 *
 * Deliberately *not* routed through `lib/scales` — that adapter normalises
 * everything to sharps, which is wrong for a written reference (the IV of F is
 * B♭, not A♯). Here we go straight to tonal so each key keeps its proper
 * accidentals.
 */

import { Note, Scale } from 'tonal'
import { prettyNote } from '@/lib/note-spelling'

export { prettyNote }

// ── Options offered by the UI ─────────────────────────────────────────────────

/** Tonics in circle-of-fifths order, including the common enharmonic pairs. */
export const CHART_TONICS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'C#', 'Ab', 'Eb', 'Bb', 'F', 'Gb',
] as const

export interface ChartScale {
  /** Identifier passed to tonal, also used as the select value. */
  id: string
  label: string
}

/** Seven-note scales only — anything smaller can't stack diatonic thirds. */
export const CHART_SCALES: ChartScale[] = [
  { id: 'major', label: 'Major (Ionian)' },
  { id: 'minor', label: 'Natural minor (Aeolian)' },
  { id: 'harmonic minor', label: 'Harmonic minor' },
  { id: 'melodic minor', label: 'Melodic minor' },
  { id: 'dorian', label: 'Dorian' },
  { id: 'phrygian', label: 'Phrygian' },
  { id: 'lydian', label: 'Lydian' },
  { id: 'mixolydian', label: 'Mixolydian' },
  { id: 'locrian', label: 'Locrian' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented'

/** Which tone of the chord a filled cell holds. */
export type ChordRole = 'root' | 'third' | 'fifth' | 'seventh'

export interface ChartColumn {
  /** Position in the repeating scale, 0-based. 7 is the tonic an octave up. */
  index: number
  /** Properly-spelled scale note, e.g. "B♭". */
  note: string
  /** Scale degree, 1-based, continuing past the octave: 8, 9, 10… */
  degree: number
  /** 0 for the first run of the scale, 1 for the repeat above it. */
  octave: number
}

export interface ChartRow {
  /** 1-based scale degree the chord is built on. */
  degree: number
  /** Roman numeral with quality baked in, e.g. "ii", "vii°", "V7". */
  roman: string
  /** Chord symbol, e.g. "Dm", "B♭maj7". */
  symbol: string
  quality: ChordQuality
  /** Chord tones in stacked order (root, third, fifth[, seventh]). */
  notes: string[]
  /**
   * One entry per column, aligned with `columns`. `null` where the chord does
   * not use that scale note.
   */
  cells: ({ note: string; role: ChordRole } | null)[]
  /** Column index the chord's root sits in — its lowest filled cell. */
  rootColumn: number
}

export interface KeyChordChart {
  tonic: string
  scaleId: string
  columns: ChartColumn[]
  rows: ChartRow[]
  /**
   * Set when the spelling needs double accidentals (e.g. G♭ minor). Holds the
   * enharmonic tonic that spells the same key cleanly, so the UI can offer it.
   */
  awkwardSpelling: { suggestedTonic: string } | null
}

// ── Formatting ────────────────────────────────────────────────────────────────

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/** Semitones from `root` up to `note`, as a pitch-class distance (0–11). */
function semitonesFrom(root: string, note: string): number {
  const a = Note.chroma(root)
  const b = Note.chroma(note)
  if (a == null || b == null) return -1
  return (b - a + 12) % 12
}

function qualityOf(third: number, fifth: number): ChordQuality {
  if (third === 4 && fifth === 8) return 'augmented'
  if (third === 3 && fifth === 6) return 'diminished'
  if (third === 4) return 'major'
  return 'minor'
}

/**
 * Suffixes for the chord symbol and the roman numeral. The roman numeral's case
 * is set by the quality (upper for major/augmented, lower for minor/diminished)
 * so the row label alone tells you what the chord is.
 */
function labelParts(
  quality: ChordQuality,
  seventh: number | null,
): { symbolSuffix: string; romanSuffix: string; upper: boolean } {
  const upper = quality === 'major' || quality === 'augmented'

  if (seventh == null) {
    switch (quality) {
      case 'major': return { symbolSuffix: '', romanSuffix: '', upper }
      case 'minor': return { symbolSuffix: 'm', romanSuffix: '', upper }
      case 'diminished': return { symbolSuffix: 'dim', romanSuffix: '°', upper }
      case 'augmented': return { symbolSuffix: 'aug', romanSuffix: '+', upper }
    }
  }

  switch (quality) {
    case 'major':
      // 11 semitones = major 7th, 10 = the dominant's flat 7th.
      return seventh === 11
        ? { symbolSuffix: 'maj7', romanSuffix: 'maj7', upper }
        : { symbolSuffix: '7', romanSuffix: '7', upper }
    case 'minor':
      return seventh === 11
        ? { symbolSuffix: 'mMaj7', romanSuffix: 'mMaj7', upper }
        : { symbolSuffix: 'm7', romanSuffix: '7', upper }
    case 'diminished':
      // Half-diminished (m7♭5) is far more common than the fully-diminished 7th,
      // which only turns up on the 7th degree of harmonic minor.
      return seventh === 9
        ? { symbolSuffix: 'dim7', romanSuffix: '°7', upper }
        : { symbolSuffix: 'm7♭5', romanSuffix: 'ø7', upper }
    case 'augmented':
      return seventh === 11
        ? { symbolSuffix: 'maj7♯5', romanSuffix: 'maj7♯5', upper }
        : { symbolSuffix: '7♯5', romanSuffix: '7♯5', upper }
  }
}

// ── Builder ───────────────────────────────────────────────────────────────────

export interface BuildOptions {
  /** Stack a diatonic 7th on each chord as well as the triad. */
  sevenths?: boolean
}

/**
 * Build the grid for a key. Returns `null` for anything that isn't a valid
 * seven-note scale, so callers can prompt rather than render a broken table.
 */
export function buildKeyChordChart(
  tonic: string,
  scaleId: string,
  { sevenths = false }: BuildOptions = {},
): KeyChordChart | null {
  const notes = Scale.get(`${tonic} ${scaleId}`).notes
  if (notes.length !== 7) return null

  // Chords stack in thirds, so the top of the vii chord reaches four scale steps
  // past the 7th (six with a 7th added). Carrying the columns that far into the
  // octave above lets every chord read left-to-right as it is actually played —
  // the C of F A C sits to the RIGHT of B, instead of wrapping back to column 1.
  const topIndex = 6 + (sevenths ? 6 : 4)

  const columns: ChartColumn[] = Array.from({ length: topIndex + 1 }, (_, index) => ({
    index,
    note: prettyNote(notes[index % 7]),
    degree: index + 1,
    octave: Math.floor(index / 7),
  }))

  const ROLES: ChordRole[] = ['root', 'third', 'fifth', 'seventh']

  const rows: ChartRow[] = notes.map((root, i) => {
    // Absolute column positions, so a chord that climbs past the octave keeps
    // ascending rather than folding back on itself.
    const toneIndices = sevenths ? [i, i + 2, i + 4, i + 6] : [i, i + 2, i + 4]
    const tones = toneIndices.map((index, k) => ({
      index,
      note: notes[index % 7],
      role: ROLES[k],
    }))

    const [, third, fifth, seventh] = tones
    const quality = qualityOf(
      semitonesFrom(root, third.note),
      semitonesFrom(root, fifth.note),
    )
    const { symbolSuffix, romanSuffix, upper } = labelParts(
      quality,
      seventh ? semitonesFrom(root, seventh.note) : null,
    )

    // Match on column position, not note name — the same letter now appears in
    // two columns an octave apart.
    const cells = columns.map((col) => {
      const tone = tones.find((t) => t.index === col.index)
      return tone ? { note: prettyNote(tone.note), role: tone.role } : null
    })

    const numeral = upper ? ROMAN[i] : ROMAN[i].toLowerCase()

    return {
      degree: i + 1,
      roman: `${numeral}${romanSuffix}`,
      symbol: `${prettyNote(root)}${symbolSuffix}`,
      quality,
      notes: tones.map((t) => prettyNote(t.note)),
      cells,
      rootColumn: i,
    }
  })

  return {
    tonic: prettyNote(tonic),
    scaleId,
    columns,
    rows,
    awkwardSpelling: findCleanerSpelling(tonic, scaleId, notes),
  }
}

/**
 * Keys like G♭ minor need double flats to write out. When that happens, look for
 * the enharmonic tonic (F♯ minor) and hand it back if it spells the scale with
 * single accidentals only.
 */
function findCleanerSpelling(
  tonic: string,
  scaleId: string,
  notes: string[],
): { suggestedTonic: string } | null {
  const isAwkward = (ns: string[]) => ns.some((n) => n.length > 2)
  if (!isAwkward(notes)) return null

  const alt = Note.enharmonic(tonic)
  if (!alt || alt === tonic) return null

  const altNotes = Scale.get(`${alt} ${scaleId}`).notes
  if (altNotes.length !== 7 || isAwkward(altNotes)) return null

  return { suggestedTonic: alt }
}
