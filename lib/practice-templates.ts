/**
 * Built-in starter practice routines. Each template builds a fresh session
 * (new ids) so it can be created, then freely edited, like any other session.
 */

import type { PracticeSession, PracticeBlock, PracticeExercise, ExerciseLink } from './practice-storage'
import { exerciseTotalMinutes } from './practice-storage'

interface ExerciseSpec {
  name: string
  minutes: number
  link?: ExerciseLink
}

interface BlockSpec {
  name: string
  minutes?: number
  notes?: string
  exercises?: ExerciseSpec[]
}

export interface PracticeTemplate {
  id: string
  name: string
  description: string
  blocks: BlockSpec[]
}

function buildExercise(spec: ExerciseSpec): PracticeExercise {
  return {
    id: crypto.randomUUID(),
    name: spec.name,
    durationMinutes: spec.minutes,
    link: spec.link,
  }
}

function buildBlock(spec: BlockSpec): PracticeBlock {
  const exercises = spec.exercises?.map(buildExercise)
  return {
    id: crypto.randomUUID(),
    name: spec.name,
    durationMinutes: exercises?.length ? exerciseTotalMinutes(exercises) : spec.minutes ?? 5,
    notes: spec.notes ?? '',
    exercises,
  }
}

export function buildSessionFromTemplate(template: PracticeTemplate): PracticeSession {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: template.name,
    blocks: template.blocks.map(buildBlock),
    createdAt: now,
    updatedAt: now,
  }
}

export const PRACTICE_TEMPLATES: PracticeTemplate[] = [
  {
    id: 'daily-warmup',
    name: 'Daily Warm-Up',
    description: 'A quick 15-minute loosen-up: chromatics, then two scales.',
    blocks: [
      {
        name: 'Loosen up',
        minutes: 5,
        notes: 'Slow chromatic runs (1-2-3-4). Relaxed hands, clean fretting, even tone.',
      },
      {
        name: 'Scales',
        exercises: [
          { name: 'A minor pentatonic', minutes: 5, link: { kind: 'scale', root: 'A', scaleId: 'pentatonic minor' } },
          { name: 'C major', minutes: 5, link: { kind: 'scale', root: 'C', scaleId: 'major' } },
        ],
      },
    ],
  },
  {
    id: 'technique',
    name: 'Technique Session',
    description: '30 minutes of warm-up, scale work, and ear training.',
    blocks: [
      {
        name: 'Warm up',
        minutes: 5,
        notes: 'Spider walks + string skipping. Metronome optional.',
      },
      {
        name: 'Scales & modes',
        exercises: [
          { name: 'C major', minutes: 8, link: { kind: 'scale', root: 'C', scaleId: 'major' } },
          { name: 'D dorian', minutes: 7, link: { kind: 'scale', root: 'D', scaleId: 'dorian' } },
        ],
      },
      {
        name: 'Ear training',
        exercises: [
          { name: 'Intervals', minutes: 5, link: { kind: 'ear-training', mode: 'intervals' } },
          { name: 'Modes', minutes: 5, link: { kind: 'ear-training', mode: 'modes' } },
        ],
      },
    ],
  },
  {
    id: 'ear-theory',
    name: 'Ear & Theory',
    description: '20 focused minutes of interval and mode recognition.',
    blocks: [
      {
        name: 'Intervals',
        exercises: [{ name: 'Interval recognition', minutes: 10, link: { kind: 'ear-training', mode: 'intervals' } }],
      },
      {
        name: 'Modes',
        exercises: [{ name: 'Mode recognition', minutes: 10, link: { kind: 'ear-training', mode: 'modes' } }],
      },
    ],
  },
]
