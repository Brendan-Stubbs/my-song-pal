'use client'

import { useState } from 'react'
import EarTrainingView from '@/components/ear-training/EarTrainingView'
import FretboardTrainerView from '@/components/trainers/FretboardTrainerView'
import ScaleBuilderExercise from './ScaleBuilderExercise'

// ── Exercise registry ───────────────────────────────────────────────────────

type ExerciseId = 'ear-training' | 'scale-builder' | 'fretboard-trainer'

interface ExerciseMeta {
  id: ExerciseId
  title: string
  description: string
  tags: string[]
  icon: React.ReactNode
}

const EXERCISES: ExerciseMeta[] = [
  {
    id: 'ear-training',
    title: 'Ear Training',
    description:
      'Identify intervals and modes by ear. A random note pair or scale is played — choose the correct answer to score points.',
    tags: ['Listening', 'Intervals', 'Modes'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12a6 6 0 0 1 12 0c0 3-2.5 3.5-2.5 6a2.5 2.5 0 0 1-5 0" />
        <path d="M9 12a3 3 0 0 1 6 0" />
      </svg>
    ),
  },
  {
    id: 'scale-builder',
    title: 'Scale Builder',
    description:
      'A random key is selected. Apply the correct sharps or flats to the natural notes to spell out the major scale.',
    tags: ['Theory', 'Scales', 'Accidentals'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'fretboard-trainer',
    title: 'Fretboard Trainer',
    description:
      'Learn the notes on the neck — name a highlighted note, or find a named note on the fretboard.',
    tags: ['Fretboard', 'Notes', 'Recall'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="3" y1="14" x2="21" y2="14" />
        <line x1="3" y1="19" x2="21" y2="19" />
        <line x1="8" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="16" y2="21" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

// ── Exercise card ───────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  onSelect,
}: {
  exercise: ExerciseMeta
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="group text-left w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-brand hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-lg bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-colors">
          {exercise.icon}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors">
            {exercise.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {exercise.description}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {exercise.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 mt-1 text-gray-300 dark:text-gray-600 group-hover:text-brand transition-colors"
          aria-hidden
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </div>
    </button>
  )
}

// ── Back button ─────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-brand transition-colors mb-6"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 2L4 7l5 5" />
      </svg>
      All exercises
    </button>
  )
}

// ── Main view ───────────────────────────────────────────────────────────────

export default function ExercisesView() {
  const [selected, setSelected] = useState<ExerciseId | null>(null)

  if (selected === 'ear-training') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <EarTrainingView />
      </div>
    )
  }

  if (selected === 'scale-builder') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <ScaleBuilderExercise />
      </div>
    )
  }

  if (selected === 'fretboard-trainer') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <FretboardTrainerView />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Exercises</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pick an exercise to practice your music theory and listening skills.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXERCISES.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onSelect={() => setSelected(ex.id)}
          />
        ))}
      </div>
    </div>
  )
}
