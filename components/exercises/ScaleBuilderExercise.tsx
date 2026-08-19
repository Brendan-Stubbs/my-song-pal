'use client'

import { useState, useCallback } from 'react'
import { Scale } from 'tonal'

// ── Music helpers ──────────────────────────────────────────────────────────

const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
type Letter = typeof LETTER_ORDER[number]

// Keys to randomly pick from (covers all practical major keys)
const MAJOR_KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#',
  'Db', 'Ab', 'Eb', 'Bb', 'F',
]

type Accidental = 'sharp' | 'flat' | 'natural'

/** The 8 natural letter names starting from `root`, ending on root an octave up. */
function noteSequence(root: string): Letter[] {
  const rootLetter = root[0] as Letter
  const startIdx = LETTER_ORDER.indexOf(rootLetter)
  const letters = [
    ...LETTER_ORDER.slice(startIdx),
    ...LETTER_ORDER.slice(0, startIdx),
  ] as Letter[]
  return [...letters, rootLetter] // octave
}

/**
 * Build the correct accidental map for a major key.
 * Returns e.g. { F: 'sharp' } for G major.
 */
function correctAccidentals(key: string): Partial<Record<Letter, Accidental>> {
  const { notes } = Scale.get(`${key} major`)
  const map: Partial<Record<Letter, Accidental>> = {}
  for (const n of notes) {
    const letter = n[0] as Letter
    const acc: Accidental = n.includes('#') ? 'sharp' : n.includes('b') ? 'flat' : 'natural'
    map[letter] = acc
  }
  return map
}

function randomKey(): string {
  return MAJOR_KEYS[Math.floor(Math.random() * MAJOR_KEYS.length)]
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AccidentalSymbol({ acc, size = 'md' }: { acc: Accidental; size?: 'sm' | 'md' }) {
  if (acc === 'natural') return null
  return (
    <span className={`font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {acc === 'sharp' ? '♯' : '♭'}
    </span>
  )
}

interface NoteColumnProps {
  letter: Letter
  /** Whether this is the last (octave) note — display only, no editing. */
  isOctave: boolean
  accidental: Accidental
  result: 'correct' | 'incorrect' | null
  onToggle: (acc: Accidental) => void
}

function NoteColumn({ letter, isOctave, accidental, result, onToggle }: NoteColumnProps) {
  function handleSharp() {
    if (isOctave) return
    onToggle(accidental === 'sharp' ? 'natural' : 'sharp')
  }
  function handleFlat() {
    if (isOctave) return
    onToggle(accidental === 'flat' ? 'natural' : 'flat')
  }

  const borderColor =
    result === 'correct'
      ? 'border-green-500'
      : result === 'incorrect'
      ? 'border-red-500'
      : 'border-gray-200 dark:border-gray-600'

  const bgColor =
    result === 'correct'
      ? 'bg-green-50 dark:bg-green-900/20'
      : result === 'incorrect'
      ? 'bg-red-50 dark:bg-red-900/20'
      : 'bg-surface'

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Accidental buttons — hidden on octave root */}
      <div className="flex flex-col gap-1">
        <button
          onClick={handleSharp}
          disabled={isOctave}
          aria-label={`Sharp ${letter}`}
          aria-pressed={accidental === 'sharp'}
          className={`w-8 h-7 rounded text-sm font-bold transition-colors disabled:opacity-0 ${
            accidental === 'sharp'
              ? 'bg-brand text-white shadow'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ♯
        </button>
        <button
          onClick={handleFlat}
          disabled={isOctave}
          aria-label={`Flat ${letter}`}
          aria-pressed={accidental === 'flat'}
          className={`w-8 h-7 rounded text-sm font-bold transition-colors disabled:opacity-0 ${
            accidental === 'flat'
              ? 'bg-brand text-white shadow'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ♭
        </button>
      </div>

      {/* Note box */}
      <div
        className={`w-10 h-12 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${borderColor} ${bgColor}`}
      >
        <span
          className={`text-base font-bold leading-none ${
            result === 'correct'
              ? 'text-green-700 dark:text-green-400'
              : result === 'incorrect'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {letter}
        </span>
        {accidental !== 'natural' && (
          <AccidentalSymbol
            acc={accidental}
            size="sm"
          />
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

type SubmitState = 'idle' | 'correct' | 'incorrect'

export default function ScaleBuilderExercise() {
  const [key, setKey] = useState(() => randomKey())
  const [choices, setChoices] = useState<Partial<Record<Letter, Accidental>>>({})
  const [submitted, setSubmitted] = useState<SubmitState>('idle')
  const [streak, setStreak] = useState(0)

  const sequence = noteSequence(key)
  // All letters except the repeated octave root
  const editableLetters = sequence.slice(0, 7)
  const correct = correctAccidentals(key)

  const getChoice = (letter: Letter): Accidental => choices[letter] ?? 'natural'

  const handleToggle = useCallback((letter: Letter, acc: Accidental) => {
    if (submitted !== 'idle') return
    setChoices((prev) => ({ ...prev, [letter]: acc }))
  }, [submitted])

  function getResult(letter: Letter): 'correct' | 'incorrect' | null {
    if (submitted === 'idle') return null
    const userAcc = getChoice(letter)
    const correctAcc = correct[letter] ?? 'natural'
    return userAcc === correctAcc ? 'correct' : 'incorrect'
  }

  function handleSubmit() {
    const allCorrect = editableLetters.every((letter) => {
      const userAcc = getChoice(letter)
      const correctAcc = correct[letter] ?? 'natural'
      return userAcc === correctAcc
    })
    setSubmitted(allCorrect ? 'correct' : 'incorrect')
    if (allCorrect) setStreak((s) => s + 1)
    else setStreak(0)
  }

  function handleNext() {
    setKey(randomKey())
    setChoices({})
    setSubmitted('idle')
  }

  // Build the "correct answer" display string for feedback
  function correctNoteDisplay(letter: Letter): string {
    const acc = correct[letter] ?? 'natural'
    return letter + (acc === 'sharp' ? '♯' : acc === 'flat' ? '♭' : '')
  }

  const keyDisplay = key.replace('b', '♭').replace('#', '♯')

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Scale Builder</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Apply the correct sharps and flats to spell the major scale.
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-semibold">
            <span>🔥</span>
            <span>{streak} in a row</span>
          </div>
        )}
      </div>

      {/* Key display */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
              Key
            </p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
              {keyDisplay}
              <span className="text-xl font-normal text-gray-400 ml-2">major</span>
            </p>
          </div>

          {submitted === 'idle' && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 7a5 5 0 1 0 1-3" />
                <polyline points="2 2 2 4.5 4.5 4.5" />
              </svg>
              New key
            </button>
          )}
        </div>

        {/* Note sequence */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-end gap-2 min-w-max">
            {sequence.map((letter, idx) => {
              const isOctave = idx === 7
              return (
                <NoteColumn
                  key={idx}
                  letter={letter}
                  isOctave={isOctave}
                  accidental={isOctave ? 'natural' : getChoice(letter)}
                  result={isOctave ? null : getResult(letter)}
                  onToggle={(acc) => handleToggle(letter, acc)}
                />
              )
            })}
          </div>
        </div>

        {/* Separator between octave notes */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Click <strong>♯</strong> or <strong>♭</strong> above a note to apply an accidental. Click again to remove it.
        </p>
      </div>

      {/* Result feedback */}
      {submitted !== 'idle' && (
        <div
          className={`rounded-xl border p-5 space-y-3 ${
            submitted === 'correct'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {submitted === 'correct' ? '✓' : '✗'}
            </span>
            <p
              className={`font-semibold text-lg ${
                submitted === 'correct'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {submitted === 'correct' ? 'Correct!' : 'Not quite'}
            </p>
          </div>

          {submitted === 'incorrect' && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                The {keyDisplay} major scale is:
              </p>
              <p className="text-base font-mono font-semibold text-gray-900 dark:text-white tracking-wide">
                {editableLetters.map((l) => correctNoteDisplay(l)).join('  ')}  {keyDisplay.split('').filter(c => c !== '♯' && c !== '♭')[0]}
              </p>
              {/* Per-note breakdown */}
              <div className="flex flex-wrap gap-3 pt-2">
                {editableLetters.map((letter) => {
                  const r = getResult(letter)
                  const correctAcc = correct[letter] ?? 'natural'
                  const userAcc = getChoice(letter)
                  if (r === 'correct') return null
                  return (
                    <div key={letter} className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-bold">{letter}</span>
                      {': you chose '}
                      <span className="font-semibold">
                        {userAcc === 'natural' ? 'natural' : userAcc === 'sharp' ? '♯' : '♭'}
                      </span>
                      {', correct is '}
                      <span className="font-semibold">
                        {correctAcc === 'natural' ? 'natural' : correctAcc === 'sharp' ? '♯' : '♭'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {submitted === 'idle' ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors shadow"
          >
            Check answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors shadow"
          >
            Next key →
          </button>
        )}
      </div>
    </div>
  )
}
