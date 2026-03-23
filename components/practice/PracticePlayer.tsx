'use client'

import { useState, useEffect } from 'react'
import type { PracticeSession } from '@/lib/practice-storage'
import { formatTime } from '@/lib/practice-storage'

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
  })

  // One-second tick — stops when paused or complete
  useEffect(() => {
    if (state.isPaused || state.isComplete) return

    const id = setInterval(() => {
      setState((prev) => {
        if (prev.secondsRemaining <= 1) {
          const next = prev.blockIndex + 1
          if (next < session.blocks.length) {
            return {
              ...prev,
              blockIndex: next,
              secondsRemaining: session.blocks[next].durationMinutes * 60,
            }
          }
          return { ...prev, secondsRemaining: 0, isComplete: true }
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
      })
    }, 1000)

    return () => clearInterval(id)
  }, [state.isPaused, state.isComplete, session.blocks])

  function togglePause() {
    setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }

  function goToBlock(index: number) {
    if (index < 0 || index >= session.blocks.length) return
    setState((prev) => ({
      ...prev,
      blockIndex: index,
      secondsRemaining: session.blocks[index].durationMinutes * 60,
      isComplete: false,
    }))
  }

  const currentBlock = session.blocks[state.blockIndex]
  const nextBlock = session.blocks[state.blockIndex + 1]
  const totalSeconds = (currentBlock?.durationMinutes ?? 1) * 60
  const progress = state.secondsRemaining / totalSeconds

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
            <span className="text-5xl font-mono font-bold text-gray-900 dark:text-white leading-none tabular-nums">
              {formatTime(state.secondsRemaining)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
              {state.isPaused ? 'Paused' : 'remaining'}
            </span>
          </div>
        </div>

        {/* Block name + next */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{currentBlock?.name}</h3>
          {nextBlock ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Next: <span className="text-gray-600 dark:text-gray-300 font-medium">{nextBlock.name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Last block</p>
          )}
        </div>

        {/* Controls */}
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
                    ? 'bg-brand text-white'
                    : isPast
                    ? 'bg-green-50 dark:bg-green-900/20 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className={`text-xs font-mono ${isActive ? 'text-orange-200' : isPast ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {block.durationMinutes}m
                </span>
                <span className="text-xs font-medium truncate max-w-[72px]">{block.name}</span>
                {isPast && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1,4 3.5,7 9,1" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
