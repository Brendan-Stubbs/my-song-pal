'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Melody, MelodyNote } from '@/types/melody'
import { getAvailableKeys, getAvailableScales } from '@/lib/scales'
import { buildPitchRows } from '@/lib/melody-theory'
import {
  getEngine,
  AUDIO_ENGINES,
  DEFAULT_AUDIO_ENGINE,
  type AudioEngineId,
} from '@/lib/instrument'
import { useMelodySequencer } from '@/lib/useMelodySequencer'

// One timeline slot = one beat. We keep stepsPerBar fixed at 4 so a slot always
// lasts a single beat (see secondsPerStep); "bars" just controls how many slots.
const STEPS_PER_BAR = 4
const MIN_BARS = 1
const MAX_BARS = 8
const DRAG_MIME = 'application/x-mysongpal-midi'

function engineLoadsSamples(id: AudioEngineId): boolean {
  return AUDIO_ENGINES.find((e) => e.id === id)?.loadsSamples ?? false
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="10" height="10" rx="1.5" />
    </svg>
  )
}

interface Props {
  melody: Melody
  onChange: (m: Melody) => void
  engineId?: AudioEngineId
}

export default function MelodyMaker({
  melody,
  onChange,
  engineId = DEFAULT_AUDIO_ENGINE,
}: Props) {
  const [loop, setLoop] = useState(true)
  const [engineReady, setEngineReady] = useState(() => !engineLoadsSamples(engineId))
  // The most recently auditioned pad, so a plain tap on a slot can place it
  // (a click-only path alongside drag-and-drop).
  const [armedMidi, setArmedMidi] = useState<number | null>(null)

  const keys = useMemo(() => getAvailableKeys(), [])
  const scales = useMemo(() => getAvailableScales(), [])

  const rows = useMemo(
    () => buildPitchRows(melody.key, melody.scaleId),
    [melody.key, melody.scaleId],
  )

  // Pads = every chromatic pitch in the window, low → high. Scale membership is
  // shown via styling rather than hiding the out-of-scale notes, so players can
  // explore the "wrong" notes too.
  const pads = useMemo(() => rows.slice().reverse(), [rows])

  const nameByMidi = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of rows) map.set(r.midi, r.name)
    return map
  }, [rows])

  const totalSteps = Math.max(1, melody.bars * STEPS_PER_BAR)
  const { isPlaying, currentStep, start, stop } = useMelodySequencer({
    melody,
    engineId,
    loop,
  })

  // Warm up (and load samples for sampled engines) once per engine.
  useEffect(() => {
    let cancelled = false
    const engine = getEngine(engineId)
    engine.resume().then(
      () => {
        if (!cancelled) setEngineReady(true)
      },
      () => {
        if (!cancelled) setEngineReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [engineId])

  // step → note, for O(1) slot lookups. Monophonic: one note per slot.
  const noteAtStep = useMemo(() => {
    const map = new Map<number, MelodyNote>()
    for (const n of melody.notes) map.set(n.step, n)
    return map
  }, [melody.notes])

  function audition(midi: number) {
    const engine = getEngine(engineId)
    void engine.resume()
    engine.playNote(midi, { duration: 0.8, velocity: 0.5 })
    setArmedMidi(midi)
  }

  function emit(patch: Partial<Melody>) {
    onChange({ ...melody, ...patch })
  }

  function placeAt(step: number, midi: number) {
    const kept = melody.notes.filter((n) => n.step !== step)
    emit({ notes: [...kept, { id: crypto.randomUUID(), step, midi }] })
    const engine = getEngine(engineId)
    void engine.resume()
    engine.playNote(midi, { duration: 0.6, velocity: 0.5 })
  }

  function clearAt(step: number) {
    emit({ notes: melody.notes.filter((n) => n.step !== step) })
  }

  function onSlotClick(step: number) {
    const existing = noteAtStep.get(step)
    if (existing) {
      clearAt(step)
    } else if (armedMidi != null) {
      placeAt(step, armedMidi)
    }
  }

  function changeKeyScale(patch: Partial<Pick<Melody, 'key' | 'scaleId'>>) {
    emit({ ...patch, chords: [] })
  }

  function changeBars(next: number) {
    const bars = Math.max(MIN_BARS, Math.min(MAX_BARS, next))
    const maxStep = bars * STEPS_PER_BAR
    emit({
      bars,
      stepsPerBar: STEPS_PER_BAR,
      notes: melody.notes.filter((n) => n.step < maxStep),
      chords: [],
    })
  }

  function clearTimeline() {
    emit({ notes: [] })
  }

  const selectClass =
    'text-sm bg-surface border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 outline-none focus:border-brand transition-colors text-gray-800 dark:text-gray-100'

  return (
    <div className="space-y-6">
      {/* ── Controls: key / scale / tempo ─────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Key">
          <select
            aria-label="Key"
            value={melody.key}
            onChange={(e) => changeKeyScale({ key: e.target.value })}
            className={selectClass}
          >
            {keys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Scale">
          <select
            aria-label="Scale"
            value={melody.scaleId}
            onChange={(e) => changeKeyScale({ scaleId: e.target.value })}
            className={`${selectClass} capitalize`}
          >
            {scales.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Tempo">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              aria-label="Tempo (BPM)"
              min={40}
              max={220}
              value={melody.bpm}
              onChange={(e) =>
                emit({ bpm: Math.max(40, Math.min(220, Number(e.target.value) || 90)) })
              }
              className={`${selectClass} w-16 text-center tabular-nums`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">BPM</span>
          </div>
        </Field>
        {!engineReady && (
          <span className="ml-auto text-xs text-brand animate-pulse self-center">
            loading sounds…
          </span>
        )}
      </div>

      {/* ── Play: every chromatic note, scale tones highlighted ───── */}
      <section aria-label="Notes">
        <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Play</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tap a note to hear it. Drag it onto the timeline to keep it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pads.map((row) => {
            const armed = armedMidi === row.midi
            const tone = row.isRoot
              ? 'bg-brand text-white shadow-sm border border-transparent'
              : row.inScale
                ? 'bg-brand/10 text-brand border border-brand/40 hover:bg-brand/20'
                : 'bg-surface text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            return (
              <button
                key={row.midi}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, String(row.midi))
                  e.dataTransfer.setData('text/plain', String(row.midi))
                  e.dataTransfer.effectAllowed = 'copy'
                  setArmedMidi(row.midi)
                }}
                onClick={() => audition(row.midi)}
                title={`Play ${row.name} · ${row.inScale ? 'in scale' : 'outside scale'}`}
                className={`select-none cursor-grab active:cursor-grabbing rounded-xl px-3.5 py-3 min-w-[3.25rem] text-center font-semibold transition-all ${tone} ${
                  armed ? 'ring-2 ring-brand/50' : ''
                }`}
              >
                <span className="block text-sm leading-none">{row.pc}</span>
                <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                  {row.name.replace(row.pc, '')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-brand" aria-hidden />
            Root
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-brand/10 border border-brand/40" aria-hidden />
            In scale
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-surface border border-dashed border-gray-300 dark:border-gray-600" aria-hidden />
            Outside scale
          </span>
        </div>
      </section>

      {/* ── Timeline: arrange dropped notes, then play back ───────── */}
      <section aria-label="Timeline" className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Timeline</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-1">
              <Stepper label="−" onClick={() => changeBars(melody.bars - 1)} disabled={melody.bars <= MIN_BARS} ariaLabel="Fewer beats" />
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-14 text-center">
                {totalSteps} beats
              </span>
              <Stepper label="+" onClick={() => changeBars(melody.bars + 1)} disabled={melody.bars >= MAX_BARS} ariaLabel="More beats" />
            </div>
            <button
              onClick={() => setLoop((l) => !l)}
              aria-pressed={loop}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                loop
                  ? 'bg-brand/15 text-brand'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Loop
            </button>
            <button
              onClick={isPlaying ? stop : start}
              disabled={melody.notes.length === 0 && !isPlaying}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-40 ${
                isPlaying
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-brand text-white hover:bg-brand/90'
              }`}
              aria-label={isPlaying ? 'Stop playback' : 'Play timeline'}
            >
              {isPlaying ? <StopIcon /> : <PlayIcon />}
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface p-3 overflow-x-auto">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, step) => {
              const note = noteAtStep.get(step)
              const isBeatOne = step % STEPS_PER_BAR === 0
              const underPlayhead = isPlaying && step === currentStep
              return (
                <button
                  key={step}
                  onClick={() => onSlotClick(step)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const raw =
                      e.dataTransfer.getData(DRAG_MIME) ||
                      e.dataTransfer.getData('text/plain')
                    const midi = Number(raw)
                    if (Number.isFinite(midi) && midi > 0) placeAt(step, midi)
                  }}
                  aria-label={
                    note
                      ? `Beat ${step + 1}: ${nameByMidi.get(note.midi) ?? note.midi} — tap to clear`
                      : `Beat ${step + 1}: empty — drop or tap to place a note`
                  }
                  className={`relative shrink-0 w-12 h-16 rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                    isBeatOne ? 'ml-1 first:ml-0' : ''
                  } ${
                    note
                      ? 'bg-brand text-white hover:bg-brand/90'
                      : underPlayhead
                        ? 'bg-brand/20'
                        : 'bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-600 hover:border-brand text-gray-400 dark:text-gray-500'
                  } ${underPlayhead && note ? 'ring-2 ring-brand/60' : ''}`}
                >
                  {note ? (
                    <>
                      <span className="leading-none">{noteName(nameByMidi.get(note.midi))}</span>
                      <span className="text-[10px] font-normal opacity-70 mt-0.5">
                        {noteOctave(nameByMidi.get(note.midi))}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-normal tabular-nums opacity-70">
                      {step + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Empty slots are rests. Tap a filled slot to clear it.
          </p>
          <button
            onClick={clearTimeline}
            disabled={melody.notes.length === 0}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 disabled:hover:text-gray-500 transition-colors font-medium"
          >
            Clear timeline
          </button>
        </div>
      </section>
    </div>
  )
}

// Split a note name like "C#4" into its pitch class and octave for stacked display.
function noteName(name: string | undefined): string {
  if (!name) return ''
  return name.replace(/-?\d+$/, '')
}
function noteOctave(name: string | undefined): string {
  if (!name) return ''
  return name.match(/-?\d+$/)?.[0] ?? ''
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function Stepper({
  label,
  onClick,
  disabled,
  ariaLabel,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-7 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-surface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors text-sm font-semibold leading-none"
    >
      {label}
    </button>
  )
}
