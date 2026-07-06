'use client'

import { useState, useEffect, useRef } from 'react'
import { loadMetronomeSettings, saveMetronomeSettings } from '@/lib/metronome-settings-storage'

const MIN_BPM = 40
const MAX_BPM = 240
const BEATS_OPTIONS = [2, 3, 4, 5, 6, 7]
const NOTE_VALUES = [4, 8]
const PCT_PRESETS = [50, 60, 70, 75, 80, 85, 90, 95, 100]

// ── Icons ─────────────────────────────────────────────────────────────────────

function MetronomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="2.5,13.5 12.5,13.5 9.5,1.5 5.5,1.5" />
      <line x1="7.5" y1="1.5" x2="7.5" y2="13.5" />
      <line x1="7.5" y1="8" x2="10.5" y2="5" strokeWidth="2" />
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

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="2" y="1" width="3.5" height="12" rx="1.25" />
      <rect x="8.5" y="1" width="3.5" height="12" rx="1.25" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface MetronomePanelProps {
  /** Controlled on/off state — managed by parent */
  isOn: boolean
  onToggle: (on: boolean) => void
  /** When true, all settings are persisted and restored across sessions. */
  isPremium?: boolean
}

export default function MetronomePanel({ isOn, onToggle, isPremium = false }: MetronomePanelProps) {
  // Load persisted settings once on mount (only for premium users)
  const saved = isPremium ? loadMetronomeSettings() : null

  const [practiceMode, setPracticeMode] = useState<boolean>(saved?.practiceMode ?? false)
  const [bpm, setBpm] = useState(saved?.bpm ?? 80)
  const [beatsPerBar, setBeatsPerBar] = useState(saved?.beatsPerBar ?? 4)
  const [noteValue, setNoteValue] = useState(saved?.noteValue ?? 4)
  const [accentFirst, setAccentFirst] = useState(saved?.accentFirst ?? true)
  const [currentBeat, setCurrentBeat] = useState(-1)

  // Practice mode state
  const [targetBpm, setTargetBpm] = useState(saved?.targetBpm ?? 120)
  const [targetBpmInput, setTargetBpmInput] = useState(String(saved?.targetBpm ?? 120))
  const [pct, setPct] = useState(saved?.pct ?? 100)

  // The actual BPM used by the scheduler — raw BPM in simple mode,
  // derived from target × pct in practice mode.
  const effectiveBpm = practiceMode ? Math.max(MIN_BPM, Math.floor((targetBpm * pct) / 100)) : bpm

  // Audio engine refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextNoteTimeRef = useRef(0)
  const beatCounterRef = useRef(0)

  // Mutable value refs — scheduler reads these so changes are picked up
  // immediately without restarting the scheduler interval.
  const effectiveBpmRef = useRef(effectiveBpm)
  const beatsPerBarRef = useRef(beatsPerBar)
  const noteValueRef = useRef(noteValue)
  const accentFirstRef = useRef(accentFirst)

  useEffect(() => { effectiveBpmRef.current = effectiveBpm }, [effectiveBpm])
  useEffect(() => { beatsPerBarRef.current = beatsPerBar }, [beatsPerBar])
  useEffect(() => { noteValueRef.current = noteValue }, [noteValue])
  useEffect(() => { accentFirstRef.current = accentFirst }, [accentFirst])

  // Persist all settings for premium users whenever any value changes
  useEffect(() => {
    if (!isPremium) return
    saveMetronomeSettings({ bpm, beatsPerBar, noteValue, accentFirst, practiceMode, targetBpm, pct })
  }, [isPremium, bpm, beatsPerBar, noteValue, accentFirst, practiceMode, targetBpm, pct])

  // ── Scheduling ────────────────────────────────────────────────────────────

  const runSchedulerRef = useRef<() => void>(() => {})

  runSchedulerRef.current = function runScheduler() {
    const ctx = audioCtxRef.current
    if (!ctx) return

    const LOOKAHEAD = 0.1

    while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const beat = beatCounterRef.current
      scheduleClick(ctx, beat, nextNoteTimeRef.current)

      const secondsPerBeat = (60 / effectiveBpmRef.current) * (4 / noteValueRef.current)
      nextNoteTimeRef.current += secondsPerBeat
      beatCounterRef.current = (beatCounterRef.current + 1) % beatsPerBarRef.current
    }
  }

  function scheduleClick(ctx: AudioContext, beat: number, time: number) {
    const isAccent = beat === 0 && accentFirstRef.current

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = isAccent ? 1320 : 880
    gain.gain.setValueAtTime(isAccent ? 1.0 : 0.6, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    osc.start(time)
    osc.stop(time + 0.05)

    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000)
    setTimeout(() => setCurrentBeat(beat), delayMs)
  }

  // ── Lifecycle: start/stop on isOn or time signature change ───────────────

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isOn) {
      setCurrentBeat(-1)
      return
    }

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') void ctx.resume()

    beatCounterRef.current = 0
    nextNoteTimeRef.current = ctx.currentTime + 0.05

    intervalRef.current = setInterval(() => runSchedulerRef.current(), 25)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isOn, beatsPerBar, noteValue])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function clampBpm(v: number) {
    return Math.max(MIN_BPM, Math.min(MAX_BPM, v))
  }

  function clampPct(v: number) {
    return Math.max(1, Math.min(100, v))
  }

  function commitTargetBpmInput() {
    const n = parseInt(targetBpmInput, 10)
    if (!isNaN(n)) setTargetBpm(clampBpm(n))
    else setTargetBpmInput(String(targetBpm))
  }

  // ── Shared class strings ───────────────────────────────────────────────────

  const selectCls =
    'text-center text-sm font-bold text-gray-900 dark:text-white rounded-md border border-gray-200 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 py-1 outline-none focus:border-brand'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-4 space-y-5">

      {/* Header: title + mode toggle + play/pause */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <MetronomeIcon />
          Metronome
        </div>

        {/* Simple / Practice toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-semibold">
          {(['simple', 'practice'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setPracticeMode(m === 'practice')}
              className={`px-3 py-1.5 capitalize transition-colors ${
                (m === 'practice') === practiceMode
                  ? 'bg-brand text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => onToggle(!isOn)}
          aria-label={isOn ? 'Stop metronome' : 'Start metronome'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
            isOn
              ? 'bg-brand text-white hover:bg-brand/90'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {isOn ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {/* Beat indicator dots */}
      <div className="flex justify-center items-center gap-2">
        {Array.from({ length: beatsPerBar }, (_, i) => {
          const isActive = isOn && i === currentBeat
          const isAccentBeat = i === 0 && accentFirst
          return (
            <div key={i} className="w-6 h-6 flex items-center justify-center">
              <div
                className={`rounded-full transition-all duration-75 ${
                  isActive
                    ? isAccentBeat
                      ? 'w-5 h-5 bg-brand'
                      : 'w-4 h-4 bg-orange-300 dark:bg-orange-400'
                    : 'w-3 h-3 bg-gray-200 dark:bg-gray-600'
                }`}
              />
            </div>
          )
        })}
      </div>

      {/* ── Simple mode: raw BPM slider ─────────────────────────────────── */}
      {!practiceMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tempo</span>
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{bpm} BPM</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setBpm((v) => clampBpm(v - 1))}
              aria-label="Decrease BPM"
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors text-lg leading-none select-none"
            >
              −
            </button>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-600 cursor-pointer accent-brand"
            />
            <button
              onClick={() => setBpm((v) => clampBpm(v + 1))}
              aria-label="Increase BPM"
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand transition-colors text-lg leading-none select-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* ── Practice mode: target BPM + percentage ──────────────────────── */}
      {practiceMode && (
        <div className="space-y-4">
          {/* Target BPM */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Target BPM</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={MIN_BPM}
                max={MAX_BPM}
                value={targetBpmInput}
                onChange={(e) => setTargetBpmInput(e.target.value)}
                onBlur={commitTargetBpmInput}
                onKeyDown={(e) => { if (e.key === 'Enter') commitTargetBpmInput() }}
                className="w-20 text-center text-sm font-bold text-gray-900 dark:text-white rounded-md border border-gray-200 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 py-1.5 outline-none focus:border-brand"
                aria-label="Target BPM"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">BPM (your goal tempo)</span>
            </div>
          </div>

          {/* Current effective BPM readout */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Practising at</span>
            <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {effectiveBpm} BPM
              <span className="ml-1.5 text-xs font-normal text-brand">({pct}%)</span>
            </span>
          </div>

          {/* Quick-select percentage buttons */}
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

          {/* Fine-tune +/- */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPct((v) => clampPct(v - 1))}
              aria-label="Decrease percentage"
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors text-lg leading-none select-none"
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
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors text-lg leading-none select-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Time signature + accent */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time sig</span>
          <div className="flex items-center gap-1.5">
            <select
              value={beatsPerBar}
              onChange={(e) => setBeatsPerBar(Number(e.target.value))}
              className={`w-14 ${selectCls}`}
              aria-label="Beats per bar"
            >
              {BEATS_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <span className="text-gray-400 dark:text-gray-500 font-bold">/</span>
            <select
              value={noteValue}
              onChange={(e) => setNoteValue(Number(e.target.value))}
              className={`w-14 ${selectCls}`}
              aria-label="Note value"
            >
              {NOTE_VALUES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accentFirst}
            onChange={(e) => setAccentFirst(e.target.checked)}
            className="rounded border-gray-300 text-brand focus:ring-brand"
          />
          Accent beat 1
        </label>
      </div>
    </div>
  )
}
