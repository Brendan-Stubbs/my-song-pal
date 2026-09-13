'use client'

import { useState } from 'react'
import { Key } from 'tonal'
import MultipleChoiceQuiz, {
  type QuizQuestion,
  type QuizOption,
} from './quiz/MultipleChoiceQuiz'
import { Segmented } from './ScaleDegreesExercise'

// Correctly-spelled major keys (from the circle of fifths). We use tonal's Key
// module rather than the app's sharp-normalising helper so chords are spelled
// with the key's proper accidentals (e.g. the IV of F is B♭, not A♯).
const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
const MINOR_KEYS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb']

// Roman-numeral qualities are fixed per scale type.
const MAJOR_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const MINOR_ROMANS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']

type ScaleKind = 'major' | 'minor'
type Mode = 'find-chord' | 'name-numeral' | 'find-key' | 'mixed'

interface DiatonicChord {
  symbol: string
  roman: string
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function keysFor(scale: ScaleKind): string[] {
  return scale === 'major' ? MAJOR_KEYS : MINOR_KEYS
}

function chordsFor(key: string, scale: ScaleKind): DiatonicChord[] {
  const triads =
    scale === 'major' ? Key.majorKey(key).triads : Key.minorKey(key).natural.triads
  const romans = scale === 'major' ? MAJOR_ROMANS : MINOR_ROMANS
  return triads.map((symbol, i) => ({ symbol, roman: romans[i] }))
}

function findChordQuestion(scale: ScaleKind): QuizQuestion {
  const key = pick(keysFor(scale))
  const chords = chordsFor(key, scale)
  const target = pick(chords)
  const distractors = shuffle(chords.filter((c) => c.symbol !== target.symbol))
    .slice(0, 3)
    .map((c) => c.symbol)
  const options: QuizOption[] = shuffle(
    [target.symbol, ...distractors].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `What is the ${target.roman} chord of ${key} ${scale}?`,
    accent: target.roman,
    options,
    answerId: target.symbol,
    explain: `The ${target.roman} of ${key} ${scale} is ${target.symbol}.`,
  }
}

function nameNumeralQuestion(scale: ScaleKind): QuizQuestion {
  const key = pick(keysFor(scale))
  const chords = chordsFor(key, scale)
  const target = pick(chords)
  const distractors = shuffle(chords.filter((c) => c.roman !== target.roman))
    .slice(0, 3)
    .map((c) => c.roman)
  const options: QuizOption[] = shuffle(
    [target.roman, ...distractors].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `In ${key} ${scale}, what is the roman numeral of this chord?`,
    accent: target.symbol,
    options,
    answerId: target.roman,
    explain: `${target.symbol} is the ${target.roman} of ${key} ${scale}.`,
  }
}

function findKeyQuestion(scale: ScaleKind): QuizQuestion {
  const keys = keysFor(scale)
  const key = pick(keys)
  const chords = chordsFor(key, scale)
  const target = pick(chords)
  const distractors = shuffle(keys.filter((k) => k !== key)).slice(0, 3)
  const options: QuizOption[] = shuffle(
    [key, ...distractors].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `${target.symbol} is the ${target.roman} chord of which ${scale} key?`,
    accent: target.symbol,
    options,
    answerId: key,
    explain: `${target.symbol} is the ${target.roman} of ${key} ${scale}.`,
  }
}

function makeQuestion(mode: Mode, scale: ScaleKind): QuizQuestion {
  const actual: Exclude<Mode, 'mixed'> =
    mode === 'mixed'
      ? pick(['find-chord', 'name-numeral', 'find-key'] as const)
      : mode
  if (actual === 'find-chord') return findChordQuestion(scale)
  if (actual === 'name-numeral') return nameNumeralQuestion(scale)
  return findKeyQuestion(scale)
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'find-chord', label: 'Find the chord' },
  { id: 'name-numeral', label: 'Name the numeral' },
  { id: 'find-key', label: 'Find the key' },
]

const SCALES: { id: ScaleKind; label: string }[] = [
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
]

export default function DiatonicHarmonyExercise({ isPremium = true }: { isPremium?: boolean }) {
  const [mode, setMode] = useState<Mode>('mixed')
  const [scale, setScale] = useState<ScaleKind>('major')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Diatonic Harmony</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Practise the diatonic chords and roman numerals of a key — both directions.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Segmented options={SCALES} value={scale} onChange={setScale} />
        <Segmented options={MODES} value={mode} onChange={setMode} />
      </div>

      <MultipleChoiceQuiz
        key={`${mode}-${scale}`}
        generate={() => makeQuestion(mode, scale)}
        isPremium={isPremium}
      />
    </div>
  )
}
