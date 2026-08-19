'use client'

import { useState } from 'react'
import type { MetronomeLoop } from '@/types/metronome-loop'
import { useLoopScheduler, type LoopPhase } from '@/lib/useLoopScheduler'
import type { AudioEngineId } from '@/lib/instrument'

const PCT_PRESETS = [50, 60, 70, 75, 80, 85, 90, 95, 100]

interface LoopPlayerProps {
  loop: MetronomeLoop
  engineId: AudioEngineId
  onEdit: () => void
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 ${
          checked ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label}
    </label>
  )
}

function phaseLabel(phase: LoopPhase, currentBar: number, countInBars: number): string {
  if (phase === 'idle') return 'Ready'
  if (phase === 'count-in') return `Count in${currentBar > 0 ? `: ${currentBar} / ${countInBars}` : ''}`
  return 'Playing'
}

const MIN_TARGET_BPM = 40
const MAX_TARGET_BPM = 240

const VOLUME_LS_KEY = 'mysongpal_guide_note_volume'

function loadVolume(): number {
  if (typeof window === 'undefined') return 1
  const v = parseFloat(localStorage.getItem(VOLUME_LS_KEY) ?? '')
  return isNaN(v) ? 1 : Math.max(0, Math.min(1, v))
}

export default function LoopPlayer({ loop, engineId, onEdit }: LoopPlayerProps) {
  const [pct, setPct] = useState(100)
  const [targetBpm, setTargetBpm] = useState(loop.targetBpm)
  const [targetInput, setTargetInput] = useState(String(loop.targetBpm))
  const [guideNotesEnabled, setGuideNotesEnabled] = useState(true)
  const [countInBetween, setCountInBetween] = useState(true)
  const [guideNoteVolume, setGuideNoteVolume] = useState<number>(loadVolume)

  function handleVolumeChange(v: number) {
    const clamped = Math.max(0, Math.min(1, v))
    setGuideNoteVolume(clamped)
    try { localStorage.setItem(VOLUME_LS_KEY, String(clamped)) } catch { /* quota */ }
  }

  // Keep local targetBpm in sync if the loop prop changes (e.g. after saving edits)
  const schedulerLoop = { ...loop, targetBpm }

  const { phase, currentBar, currentBeat, loopCount, start, stop } =
    useLoopScheduler({
      loop: schedulerLoop,
      pct,
      engineId,
      guideNotesEnabled,
      countInBetweenLoops: countInBetween,
      guideNoteVolume,
    })

  const isPlaying = phase !== 'idle'
  const effectiveBpm = Math.max(40, Math.floor((targetBpm * pct) / 100))

  function commitTargetBpm() {
    const n = parseInt(targetInput, 10)
    if (!isNaN(n)) {
      const clamped = Math.max(MIN_TARGET_BPM, Math.min(MAX_TARGET_BPM, n))
      setTargetBpm(clamped)
      setTargetInput(String(clamped))
    } else {
      setTargetInput(String(targetBpm))
    }
  }

  function adjustTargetBpm(delta: number) {
    const next = Math.max(MIN_TARGET_BPM, Math.min(MAX_TARGET_BPM, targetBpm + delta))
    setTargetBpm(next)
    setTargetInput(String(next))
  }

  function clampPct(v: number) {
    return Math.max(1, Math.min(100, v))
  }

  const labelCls = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-6">
      {/* Live status bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Phase badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            phase === 'count-in'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : phase === 'loop'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          {phase === 'loop' && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
          {phaseLabel(phase, currentBar, loop.countInBars)}
        </div>

        {/* Bar/beat indicator */}
        {phase === 'loop' && (
          <div className="flex items-center gap-1 font-mono text-sm text-gray-700 dark:text-gray-200">
            <span className="font-bold">Bar {currentBar}</span>
            <span className="text-gray-400">/</span>
            <span>{loop.bars}</span>
            <span className="ml-2 text-gray-400">·</span>
            <span className="ml-2">Beat {currentBeat + 1}</span>
          </div>
        )}

        {loopCount > 0 && phase !== 'idle' && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Rep {loopCount}
          </span>
        )}

        {/* Beat dots */}
        {phase === 'loop' && (
          <div className="flex gap-1.5 ml-auto">
            {Array.from({ length: loop.beatsPerBar }, (_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-75 ${
                  i === currentBeat
                    ? i === 0
                      ? 'w-4 h-4 bg-brand'
                      : 'w-3.5 h-3.5 bg-orange-400'
                    : 'w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* BPM display + controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <p className={labelCls}>Tempo</p>

          {/* Effective BPM readout */}
          <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {effectiveBpm}
            <span className="text-base font-normal text-gray-400 ml-1">BPM</span>
            <span className="ml-3 text-base font-semibold text-brand">{pct}%</span>
          </p>

          {/* Target BPM stepper */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 w-14">Target:</span>
            <button
              onClick={() => adjustTargetBpm(-1)}
              aria-label="Decrease target BPM"
              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-sm leading-none select-none"
            >
              −
            </button>
            <input
              type="number"
              min={MIN_TARGET_BPM}
              max={MAX_TARGET_BPM}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              onBlur={commitTargetBpm}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTargetBpm() }}
              className="w-14 text-center rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-900 dark:text-white px-1.5 py-0.5 text-sm outline-none focus:border-brand tabular-nums"
              aria-label="Target BPM"
            />
            <button
              onClick={() => adjustTargetBpm(1)}
              aria-label="Increase target BPM"
              className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-sm leading-none select-none"
            >
              +
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">BPM</span>
          </div>
        </div>

        {/* Play / Stop */}
        <button
          onClick={isPlaying ? stop : start}
          aria-label={isPlaying ? 'Stop loop' : 'Start loop'}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow transition-colors ${
            isPlaying
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-brand text-white hover:bg-brand/90'
          }`}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
        </button>
      </div>

      {/* Quick-select percentage */}
      <div className="space-y-2">
        <p className={labelCls}>Speed</p>
        <div className="flex flex-wrap gap-1.5">
          {PCT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPct(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                pct === p
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Fine-tune */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPct((v) => clampPct(v - 1))}
            aria-label="Decrease percentage"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-lg leading-none select-none"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-600 cursor-pointer accent-brand"
          />
          <button
            onClick={() => setPct((v) => clampPct(v + 1))}
            aria-label="Increase percentage"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-lg leading-none select-none"
          >
            +
          </button>
        </div>
      </div>

      {/* Playback toggles */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
        <p className={labelCls}>Playback options</p>
        <Toggle
          checked={guideNotesEnabled}
          onChange={setGuideNotesEnabled}
          label="Guide notes"
        />

        {/* Guide note volume — only meaningful when guide notes are on */}
        {guideNotesEnabled && (
          <div className="flex items-center gap-3 pl-11">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-14">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(guideNoteVolume * 100)}
              onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
              className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-600 cursor-pointer accent-brand"
              aria-label="Guide note volume"
            />
            <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400 w-8 text-right">
              {Math.round(guideNoteVolume * 100)}%
            </span>
          </div>
        )}

        <Toggle
          checked={countInBetween}
          onChange={setCountInBetween}
          label="Count in between loops"
        />
      </div>

      {/* Edit link */}
      <div className="pt-2">
        <button
          onClick={() => { if (isPlaying) stop(); onEdit() }}
          className="text-sm text-brand hover:underline"
        >
          Edit loop configuration
        </button>
      </div>
    </div>
  )
}
