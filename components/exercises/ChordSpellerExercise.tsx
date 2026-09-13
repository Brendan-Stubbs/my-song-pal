'use client'

import { useState } from 'react'
import { Chord, Note } from 'tonal'
import MultipleChoiceQuiz, {
  type QuizQuestion,
  type QuizOption,
} from './quiz/MultipleChoiceQuiz'
import { Segmented } from './ScaleDegreesExercise'

interface Quality {
  suffix: string
  name: string
}

const TRIADS: Quality[] = [
  { suffix: '', name: 'major' },
  { suffix: 'm', name: 'minor' },
  { suffix: 'dim', name: 'diminished' },
  { suffix: 'aug', name: 'augmented' },
]

const SEVENTHS: Quality[] = [
  { suffix: 'maj7', name: 'major 7th' },
  { suffix: 'm7', name: 'minor 7th' },
  { suffix: '7', name: 'dominant 7th' },
  { suffix: 'dim7', name: 'diminished 7th' },
  { suffix: 'm7b5', name: 'half-diminished (m7♭5)' },
]

const ROOTS = ['C', 'G', 'D', 'A', 'E', 'F', 'B', 'Bb', 'Eb', 'Ab', 'Db', 'F#']

type Difficulty = 'triads' | 'sevenths' | 'mixed'
type Mode = 'name' | 'spell'

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

function pool(difficulty: Difficulty): Quality[] {
  if (difficulty === 'triads') return TRIADS
  if (difficulty === 'sevenths') return SEVENTHS
  return [...TRIADS, ...SEVENTHS]
}

function spell(root: string, suffix: string): string {
  const chord = Chord.get(root + suffix)
  return chord.notes.map((n) => Note.simplify(n) || n).join(' – ')
}

function nameQuestion(difficulty: Difficulty): QuizQuestion {
  const qualities = pool(difficulty)
  const root = pick(ROOTS)
  const quality = pick(qualities)
  const notes = spell(root, quality.suffix)

  const distractors = shuffle(qualities.filter((q) => q.name !== quality.name))
    .slice(0, 3)
    .map((q) => q.name)
  const options: QuizOption[] = shuffle(
    [quality.name, ...distractors].map((label) => ({ id: label, label })),
  )
  return {
    prompt: 'What kind of chord is this?',
    accent: notes,
    options,
    answerId: quality.name,
    explain: `${root} ${quality.name}: ${notes}.`,
  }
}

function spellQuestion(difficulty: Difficulty): QuizQuestion {
  const qualities = pool(difficulty)
  const root = pick(ROOTS)
  const quality = pick(qualities)
  const answer = spell(root, quality.suffix)

  const distractors = shuffle(qualities.filter((q) => q.name !== quality.name))
    .map((q) => spell(root, q.suffix))
    .filter((s) => s !== answer)
  const unique = Array.from(new Set(distractors)).slice(0, 3)

  const options: QuizOption[] = shuffle(
    [answer, ...unique].map((label) => ({ id: label, label })),
  )
  return {
    prompt: `Spell the ${root} ${quality.name} chord`,
    options,
    answerId: answer,
    explain: `${root} ${quality.name} = ${answer}.`,
  }
}

function makeQuestion(mode: Mode, difficulty: Difficulty): QuizQuestion {
  return mode === 'name' ? nameQuestion(difficulty) : spellQuestion(difficulty)
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'name', label: 'Name the chord' },
  { id: 'spell', label: 'Spell the chord' },
]

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'triads', label: 'Triads' },
  { id: 'sevenths', label: '7th chords' },
  { id: 'mixed', label: 'Mixed' },
]

export default function ChordSpellerExercise({ isPremium = true }: { isPremium?: boolean }) {
  const [mode, setMode] = useState<Mode>('name')
  const [difficulty, setDifficulty] = useState<Difficulty>('triads')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chord Speller</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Identify a chord from its notes, or spell out a chord from its name.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Segmented options={MODES} value={mode} onChange={setMode} />
        <Segmented options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
      </div>

      <MultipleChoiceQuiz
        key={`${mode}-${difficulty}`}
        generate={() => makeQuestion(mode, difficulty)}
        isPremium={isPremium}
      />
    </div>
  )
}
