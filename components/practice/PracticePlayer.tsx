'use client'

import { useState, useEffect, useRef } from 'react'
import type { PracticeSession, PracticeBlock } from '@/lib/practice-storage'
import { exerciseDisplayName, formatTime } from '@/lib/practice-storage'
import MetronomePanel from './MetronomePanel'

// ── Sound cues ────────────────────────────────────────────────────────────────

function playToneSequence(frequencies: number[], step = 0.22, duration = 0.18) {
  try {
    const ctx = new AudioContext()
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * step
      gain.gain.setValueAtTime(0.55, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration + 0.02)
    })
    setTimeout(() => ctx.close(), frequencies.length * step * 1000 + 400)
  } catch {
    // ignore audio errors (e.g. in SSR or restricted environments)
  }
}

function playSessionStartCue() {
  playToneSequence([440, 660, 880])
}

function playExerciseTransitionCue() {
  playToneSequence([550, 880], 0.18, 0.16)
}

function playBlockEndCue() {
  playToneSequence([880, 660, 440])
}

// ── Timer helpers ─────────────────────────────────────────────────────────────

function hasExercises(block: PracticeBlock | undefined): boolean {
  return (block?.exercises?.length ?? 0) > 0
}

function getSegmentDurationSeconds(block: PracticeBlock, exerciseIndex: number): number {
  if (hasExercises(block) && exerciseIndex >= 0) {
    return block.exercises![exerciseIndex].durationMinutes * 60
  }
  return block.durationMinutes * 60
}

function getSegmentDisplayName(block: PracticeBlock, exerciseIndex: number): string {
  if (hasExercises(block) && exerciseIndex >= 0) {
    return exerciseDisplayName(block.exercises![exerciseIndex], exerciseIndex)
  }
  return block.name
}

function createInitialState(session: PracticeSession, startBlockIndex: number): TimerState {
  const block = session.blocks[startBlockIndex] ?? session.blocks[0]
  const exercises = block?.exercises
  const useExercises = (exercises?.length ?? 0) > 0
  const exerciseIndex = useExercises ? 0 : -1
  const durationMinutes = useExercises ? exercises![0].durationMinutes : (block?.durationMinutes ?? 1)

  return {
    blockIndex: startBlockIndex,
    exerciseIndex,
    secondsRemaining: durationMinutes * 60,
    isPaused: false,
    isComplete: false,
    blockEnded: false,
    exerciseTransitioning: false,
    exerciseTransitionName: undefined,
  }
}

// ── Circular countdown ring ───────────────────────────────────────────────────

function CircularTimer({ progress, size = 220 }: { progress: number; size?: number }) {
  const strokeWidth = 10
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        strokeWidth={strokeWidth}
        stroke="#ff9933"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.95s linear' }}
      />
    </svg>
  )
}

// ── Timer state ───────────────────────────────────────────────────────────────

interface TimerState {
  blockIndex: number
  exerciseIndex: number
  secondsRemaining: number
  isPaused: boolean
  isComplete: boolean
  blockEnded: boolean
  exerciseTransitioning: boolean
  exerciseTransitionName?: string
}

// ── Main component ────────────────────────────────────────────────────────────

interface PracticePlayerProps {
  session: PracticeSession
  startBlockIndex: number
  onEnd: () => void
}

export default function PracticePlayer({ session, startBlockIndex, onEnd }: PracticePlayerProps) {
  const [state, setState] = useState<TimerState>(() => createInitialState(session, startBlockIndex))
  const [metronomeOn, setMetronomeOn] = useState(false)

  const endCueFiredRef = useRef(false)
  const exerciseTransitionRef = useRef(false)
  const sessionStartCueFiredRef = useRef(false)

  useEffect(() => {
    if (sessionStartCueFiredRef.current) return
    sessionStartCueFiredRef.current = true
    playSessionStartCue()
  }, [])

  useEffect(() => {
    if (state.isPaused || state.isComplete || state.blockEnded || state.exerciseTransitioning) return

    const id = setInterval(() => {
      setState((prev) => {
        if (prev.isPaused || prev.isComplete || prev.blockEnded || prev.exerciseTransitioning) return prev

        if (prev.secondsRemaining <= 1) {
          const block = session.blocks[prev.blockIndex]
          const exercises = block?.exercises ?? []
          const onExercise = exercises.length > 0 && prev.exerciseIndex >= 0
          const hasNextExercise = onExercise && prev.exerciseIndex < exercises.length - 1

          if (hasNextExercise) {
            const nextIndex = prev.exerciseIndex + 1
            const nextExercise = exercises[nextIndex]
            return {
              ...prev,
              secondsRemaining: 0,
              exerciseTransitioning: true,
              exerciseTransitionName: exerciseDisplayName(nextExercise, nextIndex),
            }
          }

          return { ...prev, secondsRemaining: 0, blockEnded: true }
        }

        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
      })
    }, 1000)

    return () => clearInterval(id)
  }, [state.isPaused, state.isComplete, state.blockEnded, state.exerciseTransitioning, session.blocks])

  useEffect(() => {
    if (!state.exerciseTransitioning || !state.exerciseTransitionName) {
      exerciseTransitionRef.current = false
      return
    }
    if (exerciseTransitionRef.current) return
    exerciseTransitionRef.current = true

    playExerciseTransitionCue()

    const id = setTimeout(() => {
      setState((prev) => {
        const block = session.blocks[prev.blockIndex]
        const nextIndex = prev.exerciseIndex + 1
        const nextExercise = block?.exercises?.[nextIndex]
        if (!nextExercise) return prev

        return {
          ...prev,
          exerciseIndex: nextIndex,
          secondsRemaining: nextExercise.durationMinutes * 60,
          exerciseTransitioning: false,
          exerciseTransitionName: undefined,
        }
      })
      exerciseTransitionRef.current = false
    }, 1500)

    return () => clearTimeout(id)
  }, [state.exerciseTransitioning, state.exerciseTransitionName, session.blocks])

  useEffect(() => {
    if (!state.blockEnded) {
      endCueFiredRef.current = false
      return
    }
    if (endCueFiredRef.current) return
    endCueFiredRef.current = true

    playBlockEndCue()
    setMetronomeOn(false)
  }, [state.blockEnded])

  function togglePause() {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }

  function goToBlock(index: number) {
    if (index < 0 || index >= session.blocks.length) return
    const block = session.blocks[index]
    const useExercises = hasExercises(block)
    endCueFiredRef.current = false
    exerciseTransitionRef.current = false

    setState({
      blockIndex: index,
      exerciseIndex: useExercises ? 0 : -1,
      secondsRemaining: getSegmentDurationSeconds(block, useExercises ? 0 : -1),
      isPaused: false,
      isComplete: false,
      blockEnded: false,
      exerciseTransitioning: false,
      exerciseTransitionName: undefined,
    })
  }

  function advanceFromBlockEnd() {
    const next = state.blockIndex + 1
    if (next < session.blocks.length) {
      goToBlock(next)
    } else {
      setState((prev) => ({
        ...prev,
        secondsRemaining: 0,
        blockEnded: false,
        isComplete: true,
        exerciseTransitioning: false,
        exerciseTransitionName: undefined,
      }))
    }
  }

  const currentBlock = session.blocks[state.blockIndex]
  const nextBlock = session.blocks[state.blockIndex + 1]
  const currentExercises = currentBlock?.exercises ?? []
  const onExercise = currentExercises.length > 0 && state.exerciseIndex >= 0
  const totalSeconds = getSegmentDurationSeconds(currentBlock, state.exerciseIndex)
  const progress = state.blockEnded || state.exerciseTransitioning
    ? 0
    : state.secondsRemaining / totalSeconds
  const displayName = onExercise
    ? getSegmentDisplayName(currentBlock, state.exerciseIndex)
    : currentBlock?.name

  if (state.isComplete) {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-16 text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-brand/15 text-brand flex items-center justify-center" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Session complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-xs mx-auto">
          Great work. You completed <span className="font-medium text-gray-700 dark:text-gray-200">{session.name}</span>.
        </p>
        <button
          onClick={onEnd}
          className="px-7 py-2.5 rounded-md bg-brand text-white font-medium hover:bg-brand/90 transition-colors"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onEnd}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="10,4 6,8 10,12" />
          </svg>
          End session
        </button>
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{session.name}</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500 tabular-nums">
          {state.blockIndex + 1} / {session.blocks.length}
        </span>
      </div>

      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center gap-7">
        <div className="relative">
          <CircularTimer progress={progress} size={220} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {state.exerciseTransitioning ? (
              <>
                <span className="text-sm font-semibold text-brand uppercase tracking-wide">Starting</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 text-center px-4">
                  {state.exerciseTransitionName}
                </span>
              </>
            ) : state.blockEnded ? (
              <>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="22" cy="22" r="19" />
                  <polyline points="12,22 19,30 32,15" />
                </svg>
                <span className="text-xs text-green-500 dark:text-green-400 font-semibold mt-2 uppercase tracking-wide">
                  Block complete
                </span>
              </>
            ) : (
              <>
                <span className="text-5xl font-mono font-bold text-gray-900 dark:text-white leading-none tabular-nums">
                  {formatTime(state.secondsRemaining)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
                  {state.isPaused ? 'Paused' : 'remaining'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-center">
          {onExercise && !state.blockEnded ? (
            <>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Exercise {state.exerciseIndex + 1} of {currentExercises.length}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{currentBlock?.name}</p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{currentBlock?.name}</h3>
              {!state.blockEnded && (
                nextBlock ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Next: <span className="text-gray-600 dark:text-gray-300 font-medium">{nextBlock.name}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Last block</p>
                )
              )}
            </>
          )}
        </div>

        {state.blockEnded ? (
          <div className="flex flex-col items-center gap-3">
            {nextBlock ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Up next: <span className="font-semibold text-gray-700 dark:text-gray-200">{nextBlock.name}</span>
                  <span className="text-gray-400 dark:text-gray-500 ml-1">({nextBlock.durationMinutes}m)</span>
                </p>
                <button
                  onClick={advanceFromBlockEnd}
                  className="flex items-center gap-2 px-7 py-3 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors shadow-lg"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <polygon points="2,1 12,7 2,13" />
                  </svg>
                  Start next block
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">That was the last block!</p>
                <button
                  onClick={advanceFromBlockEnd}
                  className="px-7 py-3 rounded-full bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors shadow-lg"
                >
                  Finish session
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <button
              onClick={() => goToBlock(state.blockIndex - 1)}
              disabled={state.blockIndex === 0 || state.exerciseTransitioning}
              aria-label="Previous block"
              className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors disabled:opacity-25 disabled:pointer-events-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="3" width="2.5" height="10" rx="1.25" />
                <polygon points="14,3 6.5,8 14,13" />
              </svg>
            </button>

            <button
              onClick={togglePause}
              disabled={state.exerciseTransitioning}
              aria-label={state.isPaused ? 'Resume' : 'Pause'}
              className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand/90 transition-colors shadow-lg disabled:opacity-50"
            >
              {state.isPaused ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
                  <polygon points="5,2 19,11 5,20" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="3" y="2" width="4" height="14" rx="1.5" />
                  <rect x="11" y="2" width="4" height="14" rx="1.5" />
                </svg>
              )}
            </button>

            <button
              onClick={() => goToBlock(state.blockIndex + 1)}
              disabled={state.blockIndex >= session.blocks.length - 1 || state.exerciseTransitioning}
              aria-label="Next block"
              className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors disabled:opacity-25 disabled:pointer-events-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <polygon points="2,3 9.5,8 2,13" />
                <rect x="11.5" y="3" width="2.5" height="10" rx="1.25" />
              </svg>
            </button>
          </div>
        )}

        {currentBlock?.notes && (
          <div className="w-full max-w-lg rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4">
            <p className="text-xs font-semibold text-brand uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentBlock.notes}
            </p>
          </div>
        )}
      </div>

      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Session timeline
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {session.blocks.map((block, i) => {
            const isActive = i === state.blockIndex
            const isPast = i < state.blockIndex
            const exerciseCount = block.exercises?.length ?? 0
            return (
              <button
                key={block.id}
                onClick={() => goToBlock(i)}
                className={`flex-none flex flex-col gap-1 px-3 py-2.5 rounded-lg text-left min-w-[80px] transition-colors ${
                  isActive
                    ? state.blockEnded
                      ? 'bg-green-50 dark:bg-green-900/20 text-gray-700 dark:text-gray-200'
                      : 'bg-brand text-white'
                    : isPast
                    ? 'bg-green-50 dark:bg-green-900/20 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className={`text-xs font-mono ${
                  isActive && !state.blockEnded ? 'text-orange-200' : isPast || (isActive && state.blockEnded) ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {block.durationMinutes}m
                </span>
                <span className="text-xs font-medium truncate max-w-[72px]">{block.name}</span>
                {exerciseCount > 0 && (
                  <span className={`text-[10px] ${
                    isActive && !state.blockEnded ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                  </span>
                )}
                {(isPast || (isActive && state.blockEnded)) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,4 3.5,7 9,1" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <MetronomePanel isOn={metronomeOn} onToggle={setMetronomeOn} />
    </div>
  )
}
