'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Note } from 'tonal'
import { getScaleInfo } from '@/lib/scales'
import { getEngine } from '@/lib/instrument'
import type { AudioEngineId } from '@/lib/instrument'
import {
  loadModeTrainerSettings,
  saveModeTrainerSettings,
  type ModeTrainerSettings,
} from '@/lib/mode-trainer-storage'
import { loadDashboardState } from '@/lib/dashboard-storage'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_MS = 520
const NOTE_DURATION = 0.5

const MODES = [
  { id: 'ionian', name: 'Ionian', alias: 'Major' },
  { id: 'dorian', name: 'Dorian', alias: '' },
  { id: 'phrygian', name: 'Phrygian', alias: '' },
  { id: 'lydian', name: 'Lydian', alias: '' },
  { id: 'mixolydian', name: 'Mixolydian', alias: '' },
  { id: 'aeolian', name: 'Aeolian', alias: 'Natural Minor' },
  { id: 'locrian', name: 'Locrian', alias: '' },
] as const

type ModeId = (typeof MODES)[number]['id']

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build an ascending MIDI array for the scale — same algorithm as ScaleNotesPanel.
 * Notes start in octave 4, bumped up until each is strictly higher than the last.
 * The tonic is repeated an octave up at the end so the run resolves home.
 */
function buildMidis(key: string, modeId: string): number[] {
  try {
    const scale = getScaleInfo(key, modeId)
    const arr: number[] = []
    let prevMidi = Number.NEGATIVE_INFINITY
    for (const pc of scale.notes) {
      let m = Note.midi(`${pc}4`) ?? 60 + (Note.chroma(pc) ?? 0)
      while (m <= prevMidi) m += 12
      prevMidi = m
      arr.push(m)
    }
    if (arr.length > 0) arr.push(arr[0] + 12)
    return arr
  } catch {
    return []
  }
}

function randomFrom<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function ReplayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 2a6 6 0 1 0 5.66 4H12a4.5 4.5 0 1 1-.97-2.88L9.5 4.5H14V0l-1.72 1.72A6 6 0 0 0 8 2z" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'question' | 'answered'

interface Round {
  key: string
  modeId: ModeId
  midis: number[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ModeTrainer() {
  const [settings, setSettings] = useState<ModeTrainerSettings | null>(null)
  const [engineId, setEngineId] = useState<AudioEngineId>('guitar')

  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<Round | null>(null)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [answer, setAnswer] = useState<ModeId | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingRef = useRef(false)

  // Load persisted settings + engine once on mount
  useEffect(() => {
    setSettings(loadModeTrainerSettings())
    loadDashboardState().then((state) => {
      if (state?.audioEngine) setEngineId(state.audioEngine)
    })
  }, [])

  // Persist settings whenever they change (skip the initial null state)
  useEffect(() => {
    if (settings) saveModeTrainerSettings(settings)
  }, [settings])

  const enabledModes = useMemo(
    () => MODES.filter((m) => settings?.enabledModes.includes(m.id) ?? true),
    [settings],
  )

  // ── Playback ───────────────────────────────────────────────────────────────

  function stopPlayback() {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current)
      stepTimerRef.current = null
    }
    playingRef.current = false
    setIsPlaying(false)
  }

  function playMidis(midis: number[]) {
    stopPlayback()
    const instrument = getEngine(engineId)
    void instrument.resume()
    playingRef.current = true
    setIsPlaying(true)
    setHasPlayed(true)

    let i = 0
    const step = () => {
      if (!playingRef.current || i >= midis.length) {
        stopPlayback()
        return
      }
      instrument.playNote(midis[i], { duration: NOTE_DURATION })
      i++
      stepTimerRef.current = setTimeout(step, STEP_MS)
    }
    step()
  }

  useEffect(() => () => stopPlayback(), [])

  // ── Game logic ─────────────────────────────────────────────────────────────

  function startRound() {
    stopPlayback()
    if (!settings || enabledModes.length === 0) return

    const mode = randomFrom(enabledModes)
    const key = settings.randomKey ? randomFrom(ALL_KEYS) : settings.key
    const midis = buildMidis(key, mode.id)

    setRound({ key, modeId: mode.id, midis })
    setPhase('question')
    setHasPlayed(false)
    setAnswer(null)

    // Brief pause then auto-play so the UI settles first
    setTimeout(() => playMidis(midis), 350)
  }

  function handleAnswer(modeId: ModeId) {
    if (phase !== 'question' || !round || !hasPlayed) return
    stopPlayback()
    setAnswer(modeId)
    setPhase('answered')
    setSessionTotal((n) => n + 1)
    if (modeId === round.modeId) setSessionCorrect((n) => n + 1)
  }

  function updateSettings(patch: Partial<ModeTrainerSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s))
  }

  function toggleMode(modeId: string) {
    if (!settings) return
    const enabled = settings.enabledModes.includes(modeId)
    if (enabled && settings.enabledModes.length <= 1) return // keep at least one
    const next = enabled
      ? settings.enabledModes.filter((id) => id !== modeId)
      : [...settings.enabledModes, modeId]
    updateSettings({ enabledModes: next })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!settings) return null

  const currentMode = round ? MODES.find((m) => m.id === round.modeId) : null

  return (
    <div className="space-y-5">
      {/* ── Settings row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Key</label>
          <select
            value={settings.key}
            onChange={(e) => updateSettings({ key: e.target.value })}
            disabled={settings.randomKey}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-surface text-gray-900 dark:text-white disabled:opacity-40"
          >
            {ALL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.randomKey}
            onChange={(e) => updateSettings({ randomKey: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-brand"
          />
          Random key
        </label>

        {sessionTotal > 0 && (
          <span className="ml-auto text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
            {sessionCorrect} / {sessionTotal}
          </span>
        )}
      </div>

      {/* ── Mode toggles ── */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const on = settings.enabledModes.includes(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggleMode(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                on
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-brand hover:text-brand'
              }`}
            >
              {m.name}
              {m.alias ? (
                <span className="ml-1 opacity-60 text-[11px]">({m.alias})</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* ── Idle: start button ── */}
      {phase === 'idle' && (
        <div className="flex justify-center pt-2">
          <button
            onClick={startRound}
            disabled={enabledModes.length === 0}
            className="px-7 py-3 bg-brand text-white rounded-xl font-semibold text-base shadow-sm hover:bg-brand/90 transition disabled:opacity-40"
          >
            Start
          </button>
        </div>
      )}

      {/* ── Active round ── */}
      {(phase === 'question' || phase === 'answered') && round && (
        <div className="space-y-5">
          {/* Key + replay */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Key:{' '}
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {round.key}
              </span>
            </p>

            <button
              onClick={() => playMidis(round.midis)}
              disabled={isPlaying}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition"
              aria-label={isPlaying ? 'Playing' : 'Replay scale'}
            >
              {isPlaying ? <PlayIcon /> : <ReplayIcon />}
              {isPlaying ? 'Playing…' : 'Replay'}
            </button>
          </div>

          {/* Prompt */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {hasPlayed
              ? 'Which mode was that?'
              : 'Listen to the scale, then identify the mode…'}
          </p>

          {/* Answer grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {MODES.map((m) => {
              if (!settings.enabledModes.includes(m.id)) return null

              const isSelected = answer === m.id
              const isCorrectMode = m.id === round.modeId

              let cls =
                'px-4 py-3 rounded-xl text-left text-sm font-semibold border-2 transition-all '

              if (phase === 'answered') {
                if (isCorrectMode)
                  cls +=
                    'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300'
                else if (isSelected)
                  cls +=
                    'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-700 dark:text-red-300'
                else
                  cls +=
                    'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50'
              } else if (hasPlayed) {
                cls +=
                  'bg-warm-panel dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:border-brand hover:bg-brand/5 cursor-pointer'
              } else {
                cls +=
                  'bg-warm-panel dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed'
              }

              return (
                <button
                  key={m.id}
                  onClick={() => handleAnswer(m.id)}
                  disabled={phase === 'answered' || !hasPlayed}
                  className={cls}
                >
                  <span className="block leading-snug">{m.name}</span>
                  {m.alias ? (
                    <span className="block text-[11px] opacity-60 leading-tight">{m.alias}</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Feedback + next */}
          {phase === 'answered' && currentMode && (
            <div className="flex items-center justify-between gap-4 pt-1">
              <p
                className={`text-sm font-semibold ${
                  answer === round.modeId
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {answer === round.modeId
                  ? 'Correct!'
                  : `Not quite — it was ${currentMode.name}${currentMode.alias ? ` (${currentMode.alias})` : ''}`}
              </p>

              <button
                onClick={startRound}
                className="shrink-0 px-5 py-2 bg-brand text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-brand/90 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
