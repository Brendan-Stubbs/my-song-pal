'use client'

import { useState } from 'react'
import { Note } from 'tonal'
import MultipleChoiceQuiz, {
  type QuizQuestion,
  type QuizOption,
} from './quiz/MultipleChoiceQuiz'

// Degrees relative to the root, with the tonal interval used to spell them so
// the answer note is always correctly named (e.g. ♭3 of C spells E♭, not D♯).
const DEGREES = [
  { label: '♭2', interval: '2m' },
  { label: '2', interval: '2M' },
  { label: '♭3', interval: '3m' },
  { label: '3', interval: '3M' },
  { label: '4', interval: '4P' },
  { label: '♭5', interval: '5d' },
  { label: '5', interval: '5P' },
  { label: '♭6', interval: '6m' },
  { label: '6', interval: '6M' },
  { label: '♭7', interval: '7m' },
  { label: '7', interval: '7M' },
] as const

// Well-spelled roots so transposition yields readable note names.
const ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#']

type Mode = 'note-from-degree' | 'degree-from-note' | 'mixed'

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

function noteFromDegreeQuestion(): QuizQuestion {
  const root = pick(ROOTS)
  const degree = pick(DEGREES)
  const answer = Note.pitchClass(Note.transpose(`${root}4`, degree.interval))

  const distractors = shuffle(DEGREES.filter((d) => d.label !== degree.label))
    .map((d) => Note.pitchClass(Note.transpose(`${root}4`, d.interval)))
    .filter((n) => n !== answer)
  const unique = Array.from(new Set(distractors)).slice(0, 3)

  const options: QuizOption[] = shuffle(
    [answer, ...unique].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `What is the ${degree.label} of ${root}?`,
    accent: root,
    options,
    answerId: answer,
    explain: `The ${degree.label} of ${root} is ${answer}.`,
  }
}

function degreeFromNoteQuestion(): QuizQuestion {
  const root = pick(ROOTS)
  const degree = pick(DEGREES)
  const note = Note.pitchClass(Note.transpose(`${root}4`, degree.interval))

  const distractors = shuffle(DEGREES.filter((d) => d.label !== degree.label))
    .slice(0, 3)
    .map((d) => d.label)

  const options: QuizOption[] = shuffle(
    [degree.label, ...distractors].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `In ${root}, what scale degree is ${note}?`,
    accent: note,
    options,
    answerId: degree.label,
    explain: `${note} is the ${degree.label} of ${root}.`,
  }
}

function makeQuestion(mode: Mode): QuizQuestion {
  const actual =
    mode === 'mixed' ? (Math.random() < 0.5 ? 'note-from-degree' : 'degree-from-note') : mode
  return actual === 'note-from-degree' ? noteFromDegreeQuestion() : degreeFromNoteQuestion()
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'note-from-degree', label: 'Note from degree' },
  { id: 'degree-from-note', label: 'Degree from note' },
]

export default function ScaleDegreesExercise({ isPremium = true }: { isPremium?: boolean }) {
  const [mode, setMode] = useState<Mode>('mixed')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Scale Degrees</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Name the note for a scale degree, or the degree for a note. Degrees are relative to the
          major scale.
        </p>
      </div>

      <Segmented options={MODES} value={mode} onChange={setMode} />

      <MultipleChoiceQuiz key={mode} generate={() => makeQuestion(mode)} isPremium={isPremium} />
    </div>
  )
}

// Small segmented control reused by the theory exercises.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === o.id
              ? 'bg-surface text-brand shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
