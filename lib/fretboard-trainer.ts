/**
 * Pure helpers for the Fretboard Note Trainer (standard tuning only).
 */

export const CHROMATIC_NOTES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export type PitchClass = (typeof CHROMATIC_NOTES)[number]

export type FretboardTrainerMode = 'name-the-note' | 'find-the-note'

/** Open-string MIDI values: index 0 = string 6 (low E), index 5 = string 1 (high e). */
export const STANDARD_OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]

export interface FretPosition {
  string: number
  fret: number
}

export interface FretboardRound {
  mode: FretboardTrainerMode
  /** Target position (highlighted in name-the-note mode). */
  target: FretPosition
  /** Pitch class the user must identify or find. */
  pitchClass: PitchClass
  midi: number
  answered: boolean | null
  /** User's wrong pick in find-the-note mode. */
  picked?: FretPosition
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function stringToIndex(stringNumber: number): number {
  return 6 - stringNumber
}

export function midiAt(stringNumber: number, fret: number): number {
  const idx = stringToIndex(stringNumber)
  return STANDARD_OPEN_STRING_MIDI[idx] + fret
}

export function pitchClassAt(stringNumber: number, fret: number): PitchClass {
  const midi = midiAt(stringNumber, fret)
  return CHROMATIC_NOTES[((midi % 12) + 12) % 12]
}

export function noteNameAt(stringNumber: number, fret: number): string {
  const midi = midiAt(stringNumber, fret)
  const pitchClass = CHROMATIC_NOTES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${pitchClass}${octave}`
}

export interface BuildRoundOptions {
  mode: FretboardTrainerMode
  strings: number[]
  minFret: number
  maxFret: number
}

export function buildRound(options: BuildRoundOptions): FretboardRound {
  const { mode, strings, minFret, maxFret } = options
  const string = strings[randomInt(0, strings.length - 1)]
  const fret = randomInt(minFret, maxFret)
  const pitchClass = pitchClassAt(string, fret)
  const midi = midiAt(string, fret)

  return {
    mode,
    target: { string, fret },
    pitchClass,
    midi,
    answered: null,
  }
}

export function isCorrectAnswer(round: FretboardRound, answer: PitchClass | FretPosition): boolean {
  if (round.mode === 'name-the-note') {
    return answer === round.pitchClass
  }
  const pos = answer as FretPosition
  return pitchClassAt(pos.string, pos.fret) === round.pitchClass
}

export function categoryKeyForRound(round: FretboardRound): string {
  return round.mode === 'name-the-note' ? round.pitchClass : 'find'
}
