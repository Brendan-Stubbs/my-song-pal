'use client'

import { useState } from 'react'
import EarTrainingView from '@/components/ear-training/EarTrainingView'
import FretboardTrainerView from '@/components/trainers/FretboardTrainerView'
import ScaleBuilderExercise from './ScaleBuilderExercise'
import MelodyMakerExercise from './MelodyMakerExercise'
import ScaleDegreesExercise from './ScaleDegreesExercise'
import ChordSpellerExercise from './ChordSpellerExercise'
import DiatonicHarmonyExercise from './DiatonicHarmonyExercise'

// ── Exercise registry ───────────────────────────────────────────────────────

type ExerciseId =
  | 'ear-training'
  | 'scale-builder'
  | 'fretboard-trainer'
  | 'melody-maker'
  | 'scale-degrees'
  | 'chord-speller'
  | 'diatonic-harmony'

type Category = 'theory' | 'guitar' | 'ear'

interface ExerciseMeta {
  id: ExerciseId
  title: string
  description: string
  category: Category
  tags: string[]
  icon: React.ReactNode
}

const EXERCISES: ExerciseMeta[] = [
  {
    id: 'ear-training',
    title: 'Ear Training',
    description:
      'Identify intervals and modes by ear, or hunt for one target interval among the rest. A random note pair or scale is played — answer correctly to score points.',
    category: 'ear',
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
    category: 'theory',
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
    category: 'guitar',
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
  {
    id: 'melody-maker',
    title: 'Melody Maker',
    description:
      'Pick a key and scale, then tap the notes to hear them. Drag notes onto a timeline to sketch a line and play it back.',
    category: 'ear',
    tags: ['Composition', 'Scales', 'Ear'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
        <path d="M9 9l12-2" />
      </svg>
    ),
  },
  {
    id: 'scale-degrees',
    title: 'Scale Degrees',
    description:
      'Name the note for a scale degree, or the degree for a note (e.g. “what is the ♭3 of E?”).',
    category: 'theory',
    tags: ['Theory', 'Intervals', 'Degrees'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h2v12" />
        <path d="M10 6h3a2 2 0 0 1 0 4h-3l4 8" />
        <path d="M19 6v12" />
      </svg>
    ),
  },
  {
    id: 'chord-speller',
    title: 'Chord Speller',
    description:
      'Identify a chord from its notes, or spell out a chord from its name — triads through seventh chords.',
    category: 'theory',
    tags: ['Theory', 'Chords', 'Spelling'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="17" r="2.4" />
        <circle cx="7" cy="11" r="2.4" />
        <circle cx="7" cy="5" r="2.4" />
        <path d="M12 5h8M12 11h8M12 17h8" />
      </svg>
    ),
  },
  {
    id: 'diatonic-harmony',
    title: 'Diatonic Harmony',
    description:
      'Practise the diatonic chords and roman numerals of a key — “what is the V of G major?” and back.',
    category: 'theory',
    tags: ['Theory', 'Harmony', 'Roman numerals'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V8M5 8l7-4 7 4M12 20v-8M19 20V8" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
]

const CATEGORY_FILTERS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'theory', label: 'Theory' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'ear', label: 'Ear' },
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
      className="group text-left w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-surface p-5 hover:border-brand hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
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

export default function ExercisesView({ isPremium = true }: { isPremium?: boolean }) {
  const [selected, setSelected] = useState<ExerciseId | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')

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

  if (selected === 'melody-maker') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <MelodyMakerExercise />
      </div>
    )
  }

  if (selected === 'scale-degrees') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <ScaleDegreesExercise isPremium={isPremium} />
      </div>
    )
  }

  if (selected === 'chord-speller') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <ChordSpellerExercise isPremium={isPremium} />
      </div>
    )
  }

  if (selected === 'diatonic-harmony') {
    return (
      <div>
        <BackButton onClick={() => setSelected(null)} />
        <DiatonicHarmonyExercise isPremium={isPremium} />
      </div>
    )
  }

  const visible =
    filter === 'all' ? EXERCISES : EXERCISES.filter((ex) => ex.category === filter)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Exercises</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pick an exercise to practice your music theory and listening skills.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_FILTERS.map((f) => {
          const count = f.id === 'all' ? EXERCISES.length : EXERCISES.filter((e) => e.category === f.id).length
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${filter === f.id ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((ex) => (
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
