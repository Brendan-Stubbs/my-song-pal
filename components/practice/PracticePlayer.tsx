'use client'

import { useState, useEffect, useRef } from 'react'
import type { PracticeSession } from '@/lib/practice-storage'
import { formatTime } from '@/lib/practice-storage'
import MetronomePanel from './MetronomePanel'

// ── Block-end sound cue ───────────────────────────────────────────────────────

function playBlockEndCue() {
  try {
    const ctx = new AudioContext()
    // Three descending tones — distinct from the metronome click
    const notes = [880, 660, 440]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0.55, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.2)
    })
    setTimeout(() => ctx.close(), 1200)
  } catch {
    // ignore audio errors (e.g. in SSR or restricted environments)
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
      {/* Track */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      {/* Countdown arc */}
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
  secondsRemaining: number
  isPaused: boolean
  isComplete: boolean
  /** Block timer hit zero — waiting for user to start next block */
  blockEnded: boolean
}

// ── Main component ────────────────────────────────────────────────────────────

interface PracticePlayerProps {
  session: PracticeSession
  startBlockIndex: number
  onEnd: () => void
}

export default function PracticePlayer({ session, startBlockIndex, onEnd }: PracticePlayerProps) {
  const startBlock = session.blocks[startBlockIndex] ?? session.blocks[0]

  const [state, setState] = useState<TimerState>({
    blockIndex: startBlockIndex,
    secondsRemaining: (startBlock?.durationMinutes ?? 1) * 60,
    isPaused: false,
    isComplete: false,
    blockEnded: false,
  })

  // Metronome on/off — controlled here so we can stop it on block end
  const [metronomeOn, setMetronomeOn] = useState(false)

  // Ref to track whether we've already fired the end cue for the current block
  const endCueFiredRef = useRef(false)

  // One-second tick — stops when paused, complete, or block has ended
  useEffect(() => {
    if (state.isPaused || state.isComplete || state.blockEnded) return

    const id = setInterval(() => {
      setState((prev) => {
        if (prev.isPaused || prev.isComplete || prev.blockEnded) return prev

        if (prev.secondsRemaining <= 1) {
          // Trigger end-of-block behaviour (sound + metronome stop happen outside setState)
          return { ...prev, secondsRemaining: 0, blockEnded: true }
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
      })
    }, 1000)

    return () => clearInterval(id)
  }, [state.isPaused, state.isComplete, state.blockEnded])

  // When blockEnded flips to true: play cue and stop metronome
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
    endCueFiredRef.current = false
    setState({
      blockIndex: index,
      secondsRemaining: session.blocks[index].durationMinutes * 60,
      isPaused: false,
      isComplete: false,
      blockEnded: false,
    })
  }

  /** Start the next block after a block-end pause, or complete the session. */
  function advanceFromBlockEnd() {
    const next = state.blockIndex + 1
    if (next < session.blocks.length) {
      goToBlock(next)
    } else {
      setState((prev) => ({ ...prev, secondsRemaining: 0, blockEnded: false, isComplete: true }))
    }
  }

  const currentBlock = session.blocks[state.blockIndex]
  const nextBlock = session.blocks[state.blockIndex + 1]
  const totalSeconds = (currentBlock?.durationMinutes ?? 1) * 60
  const progress = state.blockEnded ? 0 : state.secondsRemaining / totalSeconds

  // ── Completion screen ─────────────────────────────────────────────────────

  if (state.isComplete) {
    return (
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-16 text-center">
        <div className="text-6xl mb-5" aria-hidden>🎉</div>
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

  // ── Player ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Top bar */}
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

      {/* Main player card */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-8 flex flex-col items-center gap-7">
        {/* Circular timer */}
        <div className="relative">
          <CircularTimer progress={progress} size={220} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {state.blockEnded ? (
              <>
                {/* Green check */}
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

        {/* Block name + next */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{currentBlock?.name}</h3>
          {state.blockEnded ? null : nextBlock ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Next: <span className="text-gray-600 dark:text-gray-300 font-medium">{nextBlock.name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Last block</p>
          )}
        </div>

        {/* Controls — differ when block has ended */}
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
            {/* Previous */}
            <button
              onClick={() => goToBlock(state.blockIndex - 1)}
              disabled={state.blockIndex === 0}
              aria-label="Previous block"
              className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors disabled:opacity-25 disabled:pointer-events-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="3" width="2.5" height="10" rx="1.25" />
                <polygon points="14,3 6.5,8 14,13" />
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePause}
              aria-label={state.isPaused ? 'Resume' : 'Pause'}
              className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand/90 transition-colors shadow-lg"
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

            {/* Next */}
            <button
              onClick={() => goToBlock(state.blockIndex + 1)}
              disabled={state.blockIndex >= session.blocks.length - 1}
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

        {/* Notes for current block */}
        {currentBlock?.notes && (
          <div className="w-full max-w-lg rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 p-4">
            <p className="text-xs font-semibold text-brand uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentBlock.notes}
            </p>
          </div>
        )}
      </div>

      {/* Session timeline */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Session timeline
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {session.blocks.map((block, i) => {
            const isActive = i === state.blockIndex
            const isPast = i < state.blockIndex
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

      {/* Metronome — off by default, user-controlled */}
      <MetronomePanel isOn={metronomeOn} onToggle={setMetronomeOn} />
    </div>
  )
}
