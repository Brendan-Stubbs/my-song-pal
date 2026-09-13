'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  INTERVALS,
  TARGET_HIT_PROBABILITY,
  TIMER_OPTIONS,
  pickSpottingInterval,
  type Interval,
  type IntervalDirection,
} from '@/lib/intervals'
import { midiToNoteName, playMidiSequence } from '@/lib/audio'
import HowToPlay from '@/components/exercises/HowToPlay'
import {
  loadTrainerStats,
  recordTrainerGame,
  lifetimeAccuracy,
  type CategoryStats,
  type TrainerStats,
} from '@/lib/training-stats'

// Same comfortable mid range the naming trainer uses (C3–C4), so an ascending
// octave still lands somewhere easy to hear.
const ROOT_MIN_MIDI = 48 // C3
const ROOT_MAX_MIDI = 60 // C4

const DEFAULT_TARGET_SEMITONES = 7 // Perfect 5th

const CORRECT_DELAY_MS = 900
const WRONG_DELAY_MS = 1600

type Phase = 'idle' | 'playing' | 'finished'

interface Round {
  rootMidi: number
  interval: Interval
  direction: 'ascending' | 'descending'
  /** What the player said: was this the target? `null` until they answer. */
  answered: boolean | null
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

export default function TargetIntervalTrainer() {
  // Settings
  const [targetSemitones, setTargetSemitones] = useState(DEFAULT_TARGET_SEMITONES)
  const [decoys, setDecoys] = useState<Set<number>>(
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
  const [lifetimeStats, setLifetimeStats] = useState<TrainerStats | null>(null)

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionCategoryRef = useRef<Record<string, CategoryStats>>({})
  const scoreRef = useRef(0)
  const attemptsRef = useRef(0)
  const targetRef = useRef(targetSemitones)
  const decoysRef = useRef(decoys)
  const directionRef = useRef(direction)
  useEffect(() => { targetRef.current = targetSemitones }, [targetSemitones])
  useEffect(() => { decoysRef.current = decoys }, [decoys])
  useEffect(() => { directionRef.current = direction }, [direction])

  useEffect(() => {
    void loadTrainerStats('interval-spotting').then(setLifetimeStats)
  }, [])

  const target = useMemo(
    () => INTERVALS.find((i) => i.semitones === targetSemitones) ?? INTERVALS[0],
    [targetSemitones]
  )

  // The target is always a possible outcome, so it never counts as a decoy.
  const decoyCount = INTERVALS.filter(
    (i) => decoys.has(i.semitones) && i.semitones !== targetSemitones
  ).length

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [])

  const buildRound = useCallback((): Round => {
    const targetInterval =
      INTERVALS.find((i) => i.semitones === targetRef.current) ?? INTERVALS[0]
    const pool = INTERVALS.filter((i) => decoysRef.current.has(i.semitones))
    const interval = pickSpottingInterval(targetInterval, pool)

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
    if (decoyCount < 1) return
    sessionCategoryRef.current = {}
    scoreRef.current = 0
    attemptsRef.current = 0
    setScore(0)
    setAttempts(0)
    setTimeLeft(timerSeconds)
    setPhase('playing')
    const r = buildRound()
    setRound(r)
    void playMidiSequence(sequenceForRound(r))
  }, [buildRound, decoyCount, timerSeconds])

  const persistSession = useCallback(async () => {
    const updated = await recordTrainerGame('interval-spotting', {
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
    (saidYes: boolean) => {
      if (!round || round.answered !== null) return
      const wasTarget = round.interval.semitones === targetRef.current
      const isCorrect = saidYes === wasTarget
      setRound({ ...round, answered: saidYes, isCorrect })

      // Bucketed by what was actually played, so the lifetime stats show which
      // intervals keep getting mistaken for the target.
      const key = String(round.interval.semitones)
      const prev = sessionCategoryRef.current[key] ?? { correct: 0, attempts: 0 }
      sessionCategoryRef.current[key] = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        attempts: prev.attempts + 1,
      }

      setAttempts((a) => {
        const next = a + 1
        attemptsRef.current = next
        return next
      })
      if (isCorrect) {
        setScore((s) => {
          const next = s + 1
          scoreRef.current = next
          return next
        })
      }

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

  function toggleDecoy(semitones: number) {
    if (semitones === targetSemitones) return
    setDecoys((prev) => {
      const next = new Set(prev)
      if (next.has(semitones)) next.delete(semitones)
      else next.add(semitones)
      return next
    })
  }

  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0

  const statsBanner =
    lifetimeStats && lifetimeStats.gamesPlayed > 0 ? (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Best score: <span className="font-semibold text-brand">{lifetimeStats.bestScore}</span>
        {' · '}
        Lifetime accuracy:{' '}
        <span className="font-semibold">{lifetimeAccuracy(lifetimeStats)}%</span>
      </p>
    ) : null

  // ── Idle / settings screen ───────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
        <HowToPlay
          steps={[
            <>Pick the <strong>target</strong> interval you want to get really good at spotting.</>,
            <>Press <strong>Start</strong>. Each round plays two notes &mdash; sometimes the target, sometimes something else.</>,
            <>Answer <strong>Yes</strong> or <strong>No</strong>: was that the target? Green means correct!</>,
          ]}
        />
        {statsBanner}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Target interval
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            The one you&rsquo;re listening out for. It turns up in roughly{' '}
            {Math.round(TARGET_HIT_PROBABILITY * 100)}% of rounds, so guessing
            &ldquo;yes&rdquo; every time won&rsquo;t get you far.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERVALS.map((iv) => {
              const on = iv.semitones === targetSemitones
              return (
                <button
                  key={iv.semitones}
                  onClick={() => setTargetSemitones(iv.semitones)}
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

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            What else you might hear
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            The other rounds are drawn evenly from these. Narrow them down to
            drill a tricky pair &mdash; {target.short} against its neighbours, say.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERVALS.map((iv) => {
              const isTarget = iv.semitones === targetSemitones
              const on = !isTarget && decoys.has(iv.semitones)
              let cls =
                'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand'
              if (isTarget)
                cls =
                  'bg-brand/10 text-brand border-brand/40 cursor-default'
              else if (on) cls = 'bg-brand text-white border-brand'

              return (
                <button
                  key={iv.semitones}
                  onClick={() => toggleDecoy(iv.semitones)}
                  disabled={isTarget}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${cls}`}
                  aria-pressed={isTarget ? undefined : on}
                >
                  {iv.short}
                  {isTarget && <span className="ml-1 text-[10px] uppercase">target</span>}
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
          disabled={decoyCount < 1}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold shadow-sm hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <PlayIcon />
          Listen for {target.short}
        </button>
        {decoyCount < 1 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Select at least one other interval for the target to hide among.
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
          {score} correct out of {attempts} ({accuracy}% accuracy) spotting the{' '}
          {target.name}
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

  // ── Playing screen ────────────────────────────────────────────────────────
  const answered = round?.answered ?? null
  const wasTarget = round ? round.interval.semitones === targetSemitones : false

  let yesCls =
    'bg-warm-panel dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-brand'
  let noCls = yesCls
  if (answered !== null) {
    const correctCls = 'bg-green-500 border-green-500 text-white'
    const wrongCls = 'bg-red-500 border-red-500 text-white'
    const mutedCls =
      'opacity-50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
    yesCls = wasTarget ? correctCls : answered === true ? wrongCls : mutedCls
    noCls = !wasTarget ? correctCls : answered === false ? wrongCls : mutedCls
  }

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

      {/* Target reminder */}
      <div className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-center">
        <div className="text-xs font-semibold text-brand uppercase tracking-wide">
          Listening for
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {target.name} <span className="text-brand">({target.short})</span>
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
          Was that a {target.short}?
          {answered !== null && round && (
            <span className="ml-1">Direction: {round.direction}</span>
          )}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAnswer(true)}
          disabled={answered !== null}
          className={`flex flex-col items-center justify-center py-4 rounded-lg border font-medium transition-colors ${yesCls}`}
        >
          <span className="text-base font-bold">Yes</span>
          <span className="text-[11px] opacity-80">that&rsquo;s a {target.short}</span>
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={answered !== null}
          className={`flex flex-col items-center justify-center py-4 rounded-lg border font-medium transition-colors ${noCls}`}
        >
          <span className="text-base font-bold">No</span>
          <span className="text-[11px] opacity-80">something else</span>
        </button>
      </div>

      {/* Feedback line */}
      <div className="min-h-[20px] text-center text-sm font-medium">
        {answered !== null && round?.isCorrect && (
          <span className="text-green-600 dark:text-green-400">
            Correct! +1 &mdash; that was a {round.interval.name}.
          </span>
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
