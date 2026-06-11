'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INTERVALS,
  TIMER_OPTIONS,
  type Interval,
  type IntervalDirection,
} from '@/lib/intervals'
import { midiToNoteName, playMidiSequence } from '@/lib/audio'

// Root notes are drawn from a comfortable mid range (C3–C4) so that even an
// ascending octave stays within an easy-to-hear register.
const ROOT_MIN_MIDI = 48 // C3
const ROOT_MAX_MIDI = 60 // C4

const CORRECT_DELAY_MS = 900
const WRONG_DELAY_MS = 1600

type Phase = 'idle' | 'playing' | 'finished'

interface Round {
  rootMidi: number
  interval: Interval
  direction: 'ascending' | 'descending'
  answered: number | null
  isCorrect: boolean | null
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sequenceForRound(round: Round): number[] {
  const second =
    round.direction === 'ascending'
      ? round.rootMidi + round.interval.semitones
      : round.rootMidi - round.interval.semitones
  return [round.rootMidi, second]
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 7.5a5.5 5.5 0 1 1-1.6-3.9" />
      <polyline points="13 1.5 13 4.5 10 4.5" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function IntervalTrainer() {
  // Settings
  const [enabled, setEnabled] = useState<Set<number>>(
    () => new Set(INTERVALS.map((i) => i.semitones))
  )
  const [direction, setDirection] = useState<IntervalDirection>('ascending')
  const [timerSeconds, setTimerSeconds] = useState<number | null>(60)

  // Game state
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<Round | null>(null)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabledRef = useRef(enabled)
  const directionRef = useRef(direction)
  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { directionRef.current = direction }, [direction])

  const enabledIntervals = INTERVALS.filter((i) => enabled.has(i.semitones))

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  const buildRound = useCallback((): Round => {
    const pool = INTERVALS.filter((i) => enabledRef.current.has(i.semitones))
    const interval = pool[randomInt(0, pool.length - 1)]
    const dir: 'ascending' | 'descending' =
      directionRef.current === 'both'
        ? Math.random() < 0.5
          ? 'ascending'
          : 'descending'
        : directionRef.current

    // Keep the second note within MIDI 36–84 regardless of direction.
    let rootMidi = randomInt(ROOT_MIN_MIDI, ROOT_MAX_MIDI)
    if (dir === 'descending') rootMidi = Math.max(rootMidi, 48 + interval.semitones)

    return { rootMidi, interval, direction: dir, answered: null, isCorrect: null }
  }, [])

  const nextRound = useCallback(() => {
    clearAdvanceTimer()
    const r = buildRound()
    setRound(r)
    void playMidiSequence(sequenceForRound(r))
  }, [buildRound, clearAdvanceTimer])

  const startGame = useCallback(() => {
    if (enabledRef.current.size < 2) return
    setScore(0)
    setAttempts(0)
    setTimeLeft(timerSeconds)
    setPhase('playing')
    const r = buildRound()
    setRound(r)
    void playMidiSequence(sequenceForRound(r))
  }, [buildRound, timerSeconds])

  const endGame = useCallback(() => {
    clearAdvanceTimer()
    setPhase('finished')
    setRound(null)
  }, [clearAdvanceTimer])

  // Countdown timer — the tick (and end-of-time) is handled inside the timeout
  // callback so we never call setState synchronously in the effect body.
  useEffect(() => {
    if (phase !== 'playing' || timeLeft === null) return
    const id = setTimeout(() => {
      if (timeLeft <= 1) endGame()
      else setTimeLeft(timeLeft - 1)
    }, 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft, endGame])

  // Cleanup on unmount
  useEffect(() => () => clearAdvanceTimer(), [clearAdvanceTimer])

  const handleAnswer = useCallback(
    (semitones: number) => {
      if (!round || round.answered !== null) return
      const isCorrect = semitones === round.interval.semitones
      setRound({ ...round, answered: semitones, isCorrect })
      setAttempts((a) => a + 1)
      if (isCorrect) setScore((s) => s + 1)

      advanceTimerRef.current = setTimeout(
        () => nextRound(),
        isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS
      )
    },
    [round, nextRound]
  )

  const replay = useCallback(() => {
    if (round) void playMidiSequence(sequenceForRound(round))
  }, [round])

  function toggleInterval(semitones: number) {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(semitones)) next.delete(semitones)
      else next.add(semitones)
      return next
    })
  }

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0

  // ── Idle / settings screen ───────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Intervals to include
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pick at least two intervals to practise telling apart.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERVALS.map((iv) => {
              const on = enabled.has(iv.semitones)
              return (
                <button
                  key={iv.semitones}
                  onClick={() => toggleInterval(iv.semitones)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    on
                      ? 'bg-brand text-white border-brand'
                      : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
                  }`}
                  aria-pressed={on}
                >
                  {iv.short}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Direction
            </h3>
            <div className="mt-2 flex gap-2">
              {(['ascending', 'descending', 'both'] as IntervalDirection[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border capitalize transition-colors ${
                    direction === d
                      ? 'bg-brand text-white border-brand'
                      : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
                  }`}
                >
                  {d}
                </button>
              ))}
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
          disabled={enabled.size < 2}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold shadow-sm hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PlayIcon />
          Start training
        </button>
        {enabled.size < 2 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Select at least two intervals to begin.
          </p>
        )}
      </div>
    )
  }

  // ── Finished screen ───────────────────────────────────────────────────────
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

  // ── Playing screen ────────────────────────────────────────────────────────
  const answered = round?.answered ?? null

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
      {/* Scoreboard */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Score</div>
            <div className="text-2xl font-bold text-brand tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Accuracy</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{accuracy}%</div>
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

      {/* Replay */}
      <div className="flex flex-col items-center gap-3 py-2">
        {round && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Root note:{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              {midiToNoteName(round.rootMidi)}
            </span>
          </p>
        )}
        <button
          onClick={replay}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand text-white font-semibold shadow-sm hover:bg-brand/90 transition-colors"
        >
          <ReplayIcon />
          Replay
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Listen to the two notes, then pick the interval.
          {answered !== null && round && (
            <span className="ml-1">Direction: {round.direction}</span>
          )}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {enabledIntervals.map((iv) => {
          const isAnswerCorrect = answered !== null && iv.semitones === round?.interval.semitones
          const isWrongPick = answered === iv.semitones && !round?.isCorrect

          let cls =
            'bg-warm-panel dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand'
          if (isAnswerCorrect) cls = 'bg-green-500 border-green-500 text-white'
          else if (isWrongPick) cls = 'bg-red-500 border-red-500 text-white'
          else if (answered !== null) cls = 'opacity-50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'

          return (
            <button
              key={iv.semitones}
              onClick={() => handleAnswer(iv.semitones)}
              disabled={answered !== null}
              className={`flex flex-col items-center justify-center py-3 rounded-lg border font-medium transition-colors ${cls}`}
            >
              <span className="text-sm font-bold">{iv.short}</span>
              <span className="text-[11px] opacity-80">{iv.name}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback line */}
      <div className="min-h-[20px] text-center text-sm font-medium">
        {answered !== null && round?.isCorrect && (
          <span className="text-green-600 dark:text-green-400">Correct! +1</span>
        )}
        {answered !== null && round?.isCorrect === false && (
          <span className="text-red-600 dark:text-red-400">
            It was a {round.interval.name}.
          </span>
        )}
      </div>

      {/* End early */}
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
