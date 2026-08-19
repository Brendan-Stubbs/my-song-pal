/**
 * Pure music helpers for the Melody Maker.
 *
 * No React / no audio here — just note-grid math so it stays easy to test.
 */

import { Note } from 'tonal'
import { getScaleInfo, getChords } from '@/lib/scales'
import type { ChordInfo } from '@/types/music'

/** Fixed 2-octave pitch window for the note palette (C3 … C5). */
export const MELODY_LOW_MIDI = 48
export const MELODY_HIGH_MIDI = 72

/** Beats per bar assumed by the grid (4/4). Chords are one-per-bar. */
export const BEATS_PER_BAR = 4

export interface PitchRow {
  midi: number
  /** Display name with octave, sharp-spelled, e.g. "C#4". */
  name: string
  /** Pitch class, e.g. "C#". */
  pc: string
  /** Whether this pitch belongs to the selected scale. */
  inScale: boolean
  /** Whether this pitch is the key's root. */
  isRoot: boolean
}

/**
 * Build the vertical palette of pitches (high → low) for a key + scale,
 * flagging which rows are in-scale and which are the root.
 */
export function buildPitchRows(key: string, scaleId: string): PitchRow[] {
  const rootChroma = Note.chroma(key) ?? 0
  let scaleChromas = new Set<number>()
  try {
    const info = getScaleInfo(key, scaleId)
    scaleChromas = new Set(
      info.notes
        .map((n) => Note.chroma(n))
        .filter((c): c is number => c != null),
    )
  } catch {
    /* unknown scale — leave palette un-highlighted */
  }

  const rows: PitchRow[] = []
  for (let midi = MELODY_HIGH_MIDI; midi >= MELODY_LOW_MIDI; midi--) {
    const name = Note.fromMidi(midi) // sharp-spelled with octave
    const pc = Note.pitchClass(name)
    const chroma = Note.chroma(pc) ?? 0
    rows.push({
      midi,
      name,
      pc,
      inScale: scaleChromas.has(chroma),
      isRoot: chroma === rootChroma,
    })
  }
  return rows
}

/** Seconds each grid step lasts at a given tempo + resolution. */
export function secondsPerStep(bpm: number, stepsPerBar: number): number {
  const secondsPerBeat = 60 / Math.max(1, bpm)
  const secondsPerBar = secondsPerBeat * BEATS_PER_BAR
  return secondsPerBar / Math.max(1, stepsPerBar)
}

/**
 * Turn a chord's pitch classes into an ascending stack of MIDI notes,
 * starting around `baseOctave`. Each note is bumped up an octave until it
 * sits above the previous one, keeping the voicing tidy.
 */
export function chordToMidis(notes: string[], baseOctave = 3): number[] {
  const midis: number[] = []
  let prev = Number.NEGATIVE_INFINITY
  for (const pc of notes) {
    let m = Note.midi(`${pc}${baseOctave}`) ?? 48 + (Note.chroma(pc) ?? 0)
    while (m <= prev) m += 12
    prev = m
    midis.push(m)
  }
  return midis
}

/**
 * Diatonic triads available for a key + scale. Only meaningful for 7-note
 * scales (major, minor, modes, harmonic/melodic minor); returns [] otherwise
 * so the UI can prompt the user rather than inventing chords.
 */
export function diatonicChords(key: string, scaleId: string): ChordInfo[] {
  let noteCount = 0
  try {
    noteCount = getScaleInfo(key, scaleId).notes.length
  } catch {
    return []
  }
  if (noteCount !== 7) return []
  try {
    return getChords(key, scaleId)
  } catch {
    return []
  }
}
