'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMER_OPTIONS } from '@/lib/intervals'
import { playMidiSequence } from '@/lib/audio'
import {
  loadTrainerStats,
  recordTrainerGame,
  lifetimeAccuracy,
  type CategoryStats,
  type TrainerStats,
} from '@/lib/training-stats'
import {
  CHROMATIC_NOTES,
  buildRound,
  isCorrectAnswer,
  categoryKeyForRound,
  noteNameAt,
  type FretboardRound,
  type FretboardTrainerMode,
  type PitchClass,
  type FretPosition,
} from '@/lib/fretboard-trainer'
import FretboardStatsPanel from './FretboardStatsPanel'

const CORRECT_DELAY_MS = 900
const WRONG_DELAY_MS = 1600

const CELL_WIDTH = 42
const CELL_HEIGHT = 34
const PAD_TOP = 24
const PAD_LEFT = 36
const PAD_BOTTOM = 24
const PAD_RIGHT = 12
const NUM_STRINGS = 6
const DOT_RADIUS = 11
const BRAND_COLOR = '#ff9933'
const OCTAVE_FRETS = [12, 24]

const STRING_NAMES: Record<number, string> = {
  6: 'E',
  5: 'A',
  4: 'D',
  3: 'G',
  2: 'B',
  1: 'e',
}

const STRING_STROKE: Record<number, number> = {
  6: 2.5,
  5: 2.0,
  4: 1.6,
  3: 1.3,
  2: 1.0,
  1: 0.75,
}

type Phase = 'idle' | 'playing' | 'finished'

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function stringY(stringNumber: number): number {
  return PAD_TOP + (NUM_STRINGS - stringNumber) * CELL_HEIGHT
}

function fretX(fret: number): number {
  return PAD_LEFT + fret * CELL_WIDTH + CELL_WIDTH / 2
}

interface ClickableFretboardProps {
  fretCount: number
  round: FretboardRound | null
  onPick?: (pos: FretPosition) => void
  disabled?: boolean
}

function ClickableFretboard({ fretCount, round, onPick, disabled }: ClickableFretboardProps) {
  const numFrets = fretCount + 1
  const svgWidth = PAD_LEFT + numFrets * CELL_WIDTH + PAD_RIGHT
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM

  const showTarget =
    round &&
    (round.mode === 'name-the-note' ||
      (round.answered !== null && round.mode === 'find-the-note'))

  return (
    <div className="flex flex-col items-center overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Interactive fretboard"
      >
        <rect width={svgWidth} height={svgHeight} fill="#faf9f7" className="dark:hidden" />
        <rect width={svgWidth} height={svgHeight} fill="#211e1b" className="hidden dark:block" />

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={CELL_WIDTH}
          height={(NUM_STRINGS - 1) * CELL_HEIGHT}
          fill="#e8e3db"
          className="dark:hidden"
        />
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={CELL_WIDTH}
          height={(NUM_STRINGS - 1) * CELL_HEIGHT}
          fill="#57534e"
          className="hidden dark:block"
        />

        {OCTAVE_FRETS.filter((f) => f <= fretCount).map((f) => (
          <rect
            key={`octave-${f}`}
            x={PAD_LEFT + f * CELL_WIDTH}
            y={PAD_TOP}
            width={CELL_WIDTH}
            height={(NUM_STRINGS - 1) * CELL_HEIGHT}
            fill={BRAND_COLOR}
            opacity={0.12}
          />
        ))}

        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          return (
            <line
              key={`string-${s}`}
              x1={PAD_LEFT}
              y1={stringY(s)}
              x2={svgWidth - PAD_RIGHT}
              y2={stringY(s)}
              stroke="#a8a29e"
              strokeWidth={STRING_STROKE[s]}
            />
          )
        })}

        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={PAD_LEFT + i * CELL_WIDTH}
            y1={PAD_TOP}
            x2={PAD_LEFT + i * CELL_WIDTH}
            y2={PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT}
            stroke={i === 0 ? '#44403c' : '#d6d3d1'}
            strokeWidth={i === 0 ? 3 : 1}
          />
        ))}

        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          return (
            <text
              key={`label-${s}`}
              x={PAD_LEFT - 6}
              y={stringY(s)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={9}
              fontWeight="600"
              fill="#78716c"
            >
              {STRING_NAMES[s]}
            </text>
          )
        })}

        {/* Click targets for find-the-note mode */}
        {round?.mode === 'find-the-note' &&
          !disabled &&
          Array.from({ length: NUM_STRINGS }, (_, si) => {
            const s = si + 1
            return Array.from({ length: numFrets }, (_, fret) => (
              <rect
                key={`hit-${s}-${fret}`}
                x={PAD_LEFT + fret * CELL_WIDTH}
                y={stringY(s) - CELL_HEIGHT / 2}
                width={CELL_WIDTH}
                height={CELL_HEIGHT}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onPick?.({ string: s, fret })}
              />
            ))
          }).flat()}

        {/* Wrong pick marker */}
        {round?.picked && round.answered === false && (
          <circle
            cx={fretX(round.picked.fret)}
            cy={stringY(round.picked.string)}
            r={DOT_RADIUS}
            fill="#ef4444"
            opacity={0.9}
          />
        )}

        {/* Target / correct answer marker */}
        {showTarget && round && (
          <g>
            <circle
              cx={fretX(round.target.fret)}
              cy={stringY(round.target.string)}
              r={DOT_RADIUS}
              fill={
                round.answered === false
                  ? '#22c55e'
                  : round.answered === true
                    ? '#22c55e'
                    : BRAND_COLOR
              }
            />
            {(round.mode === 'find-the-note' ||
              (round.mode === 'name-the-note' && round.answered !== null)) && (
              <text
                x={fretX(round.target.fret)}
                y={stringY(round.target.string)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fill="#ffffff"
                fontWeight="600"
              >
                {round.pitchClass}
              </text>
            )}
          </g>
        )}

        {Array.from({ length: numFrets }, (_, i) => {
          const isOctave = OCTAVE_FRETS.includes(i)
          return (
            <text
              key={`fret-label-${i}`}
              x={PAD_LEFT + i * CELL_WIDTH + CELL_WIDTH / 2}
              y={svgHeight - 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={isOctave ? 700 : 400}
              fill={isOctave ? BRAND_COLOR : '#78716c'}
            >
              {i}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export default function FretboardTrainer() {
  const [mode, setMode] = useState<FretboardTrainerMode>('name-the-note')
  const [enabledStrings, setEnabledStrings] = useState<Set<number>>(
    () => new Set([1, 2, 3, 4, 5, 6])
  )
  const [minFret, setMinFret] = useState(0)
  const [maxFret, setMaxFret] = useState(12)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(60)

  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<FretboardRound | null>(null)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [lifetimeStats, setLifetimeStats] = useState<TrainerStats | null>(null)

  const sessionCategoryRef = useRef<Record<string, CategoryStats>>({})
  const scoreRef = useRef(0)
  const attemptsRef = useRef(0)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modeRef = useRef(mode)
  const enabledStringsRef = useRef(enabledStrings)
  const minFretRef = useRef(minFret)
  const maxFretRef = useRef(maxFret)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    enabledStringsRef.current = enabledStrings
  }, [enabledStrings])
  useEffect(() => {
    minFretRef.current = minFret
  }, [minFret])
  useEffect(() => {
    maxFretRef.current = maxFret
  }, [maxFret])

  useEffect(() => {
    void loadTrainerStats('fretboard').then(setLifetimeStats)
  }, [])

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  const buildNextRound = useCallback((): FretboardRound => {
    const strings = [...enabledStringsRef.current].sort()
    return buildRound({
      mode: modeRef.current,
      strings,
      minFret: minFretRef.current,
      maxFret: maxFretRef.current,
    })
  }, [])

  const playRoundNote = useCallback((r: FretboardRound) => {
    void playMidiSequence([r.midi], { noteDuration: 0.6, gap: 0.6 })
  }, [])

  const recordCategoryAttempt = useCallback((r: FretboardRound, correct: boolean) => {
    const key = categoryKeyForRound(r)
    const prev = sessionCategoryRef.current[key] ?? { correct: 0, attempts: 0 }
    sessionCategoryRef.current[key] = {
      correct: prev.correct + (correct ? 1 : 0),
      attempts: prev.attempts + 1,
    }
  }, [])

  const nextRound = useCallback(() => {
    clearAdvanceTimer()
    const r = buildNextRound()
    setRound(r)
    if (r.mode === 'name-the-note') playRoundNote(r)
  }, [buildNextRound, clearAdvanceTimer, playRoundNote])

  const persistSession = useCallback(async () => {
    const updated = await recordTrainerGame('fretboard', {
      score: scoreRef.current,
      correct: scoreRef.current,
      attempts: attemptsRef.current,
      perCategory: sessionCategoryRef.current,
    })
    setLifetimeStats(updated)
    sessionCategoryRef.current = {}
  }, [])

  const endGame = useCallback(() => {
    clearAdvanceTimer()
    setPhase('finished')
    setRound(null)
    if (attemptsRef.current > 0) void persistSession()
  }, [clearAdvanceTimer, persistSession])

  const startGame = useCallback(() => {
    if (enabledStringsRef.current.size === 0) return
    if (minFretRef.current > maxFretRef.current) return

    sessionCategoryRef.current = {}
    scoreRef.current = 0
    attemptsRef.current = 0
    setScore(0)
    setAttempts(0)
    setTimeLeft(timerSeconds)
    setPhase('playing')
    const r = buildNextRound()
    setRound(r)
    if (r.mode === 'name-the-note') playRoundNote(r)
  }, [buildNextRound, timerSeconds, playRoundNote])

  useEffect(() => {
    if (phase !== 'playing' || timeLeft === null) return
    const id = setTimeout(() => {
      if (timeLeft <= 1) endGame()
      else setTimeLeft(timeLeft - 1)
    }, 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, endGame])

  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer])

  const handleAnswer = useCallback(
    (answer: PitchClass | FretPosition) => {
      if (!round || round.answered !== null) return

      const correct = isCorrectAnswer(round, answer)
      const picked = typeof answer === 'string' ? undefined : answer

      setRound({
        ...round,
        answered: correct,
        picked: correct ? undefined : picked,
      })
      setAttempts((a) => {
        const next = a + 1
        attemptsRef.current = next
        return next
      })
      if (correct) {
        setScore((s) => {
          const next = s + 1
          scoreRef.current = next
          return next
        })
      }
      recordCategoryAttempt(round, correct)
      playRoundNote(round)

      advanceTimerRef.current = setTimeout(
        () => nextRound(),
        correct ? CORRECT_DELAY_MS : WRONG_DELAY_MS
      )
    },
    [round, nextRound, playRoundNote, recordCategoryAttempt]
  )

  function toggleString(n: number) {
    setEnabledStrings((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0
  const fretCount = maxFret

  if (phase === 'idle') {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
        <FretboardStatsPanel stats={lifetimeStats} />

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Mode
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['name-the-note', 'Name the note'],
                ['find-the-note', 'Find the note'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  mode === id
                    ? 'bg-brand text-white border-brand'
                    : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Strings
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {[6, 5, 4, 3, 2, 1].map((s) => {
              const on = enabledStrings.has(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleString(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    on
                      ? 'bg-brand text-white border-brand'
                      : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
                  }`}
                  aria-pressed={on}
                >
                  {STRING_NAMES[s]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Fret range
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={minFret}
                onChange={(e) => setMinFret(Number(e.target.value))}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-sm px-2 py-1.5"
                aria-label="Minimum fret"
              >
                {Array.from({ length: 13 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <span className="text-gray-400">to</span>
              <select
                value={maxFret}
                onChange={(e) => setMaxFret(Number(e.target.value))}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-sm px-2 py-1.5"
                aria-label="Maximum fret"
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Timer
            </h3>
            <div className="mt-2 flex gap-2">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setTimerSeconds(opt.seconds)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    timerSeconds === opt.seconds
                      ? 'bg-brand text-white border-brand'
                      : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={enabledStrings.size === 0 || minFret > maxFret}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold shadow-sm hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PlayIcon />
          Start training
        </button>
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Time&rsquo;s up
        </p>
        <div className="text-5xl font-bold text-brand tabular-nums">{score}</div>
        <p className="text-gray-600 dark:text-gray-300">
          {score} correct out of {attempts} ({accuracy}% accuracy)
        </p>
        {lifetimeStats && lifetimeStats.gamesPlayed > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Best score: {lifetimeStats.bestScore} · Lifetime:{' '}
            {lifetimeAccuracy(lifetimeStats)}%
          </p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={startGame}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold shadow-sm hover:bg-brand/90 transition-colors"
          >
            <PlayIcon />
            Play again
          </button>
          <button
            onClick={() => setPhase('idle')}
            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:border-brand transition-colors"
          >
            Settings
          </button>
        </div>
      </div>
    )
  }

  const answered = round?.answered

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Score
            </div>
            <div className="text-2xl font-bold text-brand tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Accuracy
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {accuracy}%
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {timeLeft === null ? 'Endless' : 'Time'}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {timeLeft === null ? '∞' : `${timeLeft}s`}
          </div>
        </div>
      </div>

      {round?.mode === 'find-the-note' && (
        <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
          Find:{' '}
          <span className="text-brand">{round.pitchClass}</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            (any matching fret)
          </span>
        </p>
      )}

      {round?.mode === 'name-the-note' && round && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          What note is highlighted?
          {answered !== null && answered !== undefined && (
            <span className="ml-2 font-semibold">
              ({noteNameAt(round.target.string, round.target.fret)})
            </span>
          )}
        </p>
      )}

      <ClickableFretboard
        fretCount={fretCount}
        round={round}
        disabled={answered !== null && answered !== undefined}
        onPick={(pos) => handleAnswer(pos)}
      />

      {round?.mode === 'name-the-note' && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {CHROMATIC_NOTES.map((note) => {
            const isCorrect = answered !== null && note === round?.pitchClass

            let cls =
              'bg-warm-panel dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand'
            if (isCorrect) cls = 'bg-green-500 border-green-500 text-white'
            else if (answered !== null && answered !== undefined)
              cls = 'opacity-50 border-gray-300 dark:border-gray-600 text-gray-500'

            return (
              <button
                key={note}
                onClick={() => handleAnswer(note)}
                disabled={answered !== null && answered !== undefined}
                className={`py-2.5 rounded-lg border font-bold text-sm transition-colors ${cls}`}
              >
                {note}
              </button>
            )
          })}
        </div>
      )}

      <div className="min-h-[20px] text-center text-sm font-medium">
        {answered === true && (
          <span className="text-green-600 dark:text-green-400">Correct! +1</span>
        )}
        {answered === false && round && (
          <span className="text-red-600 dark:text-red-400">
            It was {round.pitchClass}
            {round.mode === 'find-the-note' &&
              ` at string ${round.target.string}, fret ${round.target.fret}`}
          </span>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={endGame}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
        >
          End session
        </button>
      </div>
    </div>
  )
}
