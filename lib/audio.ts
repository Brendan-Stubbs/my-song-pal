// Web Audio helpers for playing pitched notes.
//
// All sound is produced via the swappable instrument abstraction in
// `lib/instrument.ts`. This module keeps the small note-name/sequence helpers
// the trainers rely on.

import { getAudioContext, getInstrument } from './instrument'

export { midiToFreq } from './instrument'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Convert a MIDI note number to a note name with octave, e.g. 60 -> "C4". */
export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export interface PlayNotesOptions {
  /** Seconds each note sounds for. */
  noteDuration?: number
  /** Seconds between the start of consecutive notes. */
  gap?: number
  /** Peak gain (0–1). */
  volume?: number
}

/**
 * Play a sequence of MIDI notes one after another through the active instrument.
 * Returns a promise that resolves once the whole sequence has finished sounding.
 */
export function playMidiSequence(
  midis: number[],
  { noteDuration = 0.7, gap = 0.75, volume = 0.5 }: PlayNotesOptions = {}
): Promise<void> {
  const ctx = getAudioContext()
  if (!ctx || midis.length === 0) return Promise.resolve()

  const instrument = getInstrument()
  void instrument.resume()

  const start = ctx.currentTime + 0.05
  midis.forEach((midi, i) => {
    instrument.playNote(midi, {
      time: start + i * gap,
      duration: noteDuration,
      velocity: volume,
    })
  })

  const totalMs = ((midis.length - 1) * gap + noteDuration + 0.1) * 1000
  return new Promise((resolve) => setTimeout(resolve, totalMs))
}
