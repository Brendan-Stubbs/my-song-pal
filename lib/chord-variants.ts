import { Note, Scale } from 'tonal'
import type { ChordInfo } from '@/types/music'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChordVariant = 'sus2' | 'sus4' | '7' | 'maj7' | 'min7' | 'm7b5'

// ── Interval tables ───────────────────────────────────────────────────────────
// Semitones above root for each quality + variant combination.
// 'base' is the plain triad (always available, not listed as a selectable variant).

const VARIANT_INTERVALS: Record<ChordInfo['quality'], Partial<Record<ChordVariant, number[]>>> = {
  major: {
    sus2:  [0, 2, 7],        // R  M2  P5
    sus4:  [0, 5, 7],        // R  P4  P5
    '7':   [0, 4, 7, 10],    // R  M3  P5  m7  (dominant 7)
    maj7:  [0, 4, 7, 11],    // R  M3  P5  M7
  },
  minor: {
    sus2:  [0, 2, 7],        // R  M2  P5
    sus4:  [0, 5, 7],        // R  P4  P5
    min7:  [0, 3, 7, 10],    // R  m3  P5  m7
  },
  diminished: {
    m7b5:  [0, 3, 6, 10],    // R  m3  d5  m7  (half-diminished)
  },
}

// ── Display labels ────────────────────────────────────────────────────────────

export const VARIANT_LABELS: Record<ChordVariant, string> = {
  sus2:  'sus2',
  sus4:  'sus4',
  '7':   '7',
  maj7:  'maj7',
  min7:  'm7',
  m7b5:  'm7♭5',
}

/** Label for the "no variant" (base triad) button */
export const BASE_LABELS: Record<ChordInfo['quality'], string> = {
  major:      'maj',
  minor:      'min',
  diminished: 'dim',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalises a note (possibly with octave / flat) to a sharp pitch class. */
function toSharp(note: string): string {
  const pc = Note.pitchClass(note)
  if (pc.includes('b')) return Note.enharmonic(pc)
  return pc
}

/** Returns the sharp pitch classes present in the given key. */
function getKeyPitchClasses(key: string, scale: string): Set<string> {
  const scaleData = Scale.get(`${key} ${scale}`)
  return new Set(scaleData.notes.map(toSharp))
}

/**
 * Returns the pitch classes for a chord given root, quality, and variant.
 * Falls back to the plain triad if the variant is not recognised.
 */
function getVariantPitchClasses(
  root: string,
  quality: ChordInfo['quality'],
  variant: ChordVariant,
): string[] {
  const intervals = VARIANT_INTERVALS[quality]?.[variant] ?? []
  const rootMidi = Note.midi(`${root}4`) ?? 60
  return intervals.map((semitones) => toSharp(Note.fromMidi(rootMidi + semitones) ?? root))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the variants that are diatonic (all notes in the key) for this chord.
 * Diminished chords are limited to m7♭5; all others get sus2, sus4, and 7th options
 * filtered by what's actually in the scale.
 */
export function getAvailableVariants(
  chord: ChordInfo,
  key: string,
  scale: string,
): ChordVariant[] {
  const keyPcs = getKeyPitchClasses(key, scale)
  const candidates = Object.keys(VARIANT_INTERVALS[chord.quality] ?? {}) as ChordVariant[]

  return candidates.filter((variant) => {
    const pcs = getVariantPitchClasses(chord.root, chord.quality, variant)
    return pcs.length > 0 && pcs.every((pc) => keyPcs.has(pc))
  })
}

/**
 * Returns the display symbol for a chord, incorporating its chosen variant.
 * Falls back to the base symbol when no variant is set.
 */
export function getVariantSymbol(chord: ChordInfo): string {
  const { root, symbol, variant } = chord
  if (!variant) return symbol
  switch (variant as ChordVariant) {
    case 'sus2':  return `${root}sus2`
    case 'sus4':  return `${root}sus4`
    case '7':     return `${root}7`
    case 'maj7':  return `${root}maj7`
    case 'min7':  return `${root}m7`
    case 'm7b5':  return `${root}m7♭5`
    default:      return symbol
  }
}
