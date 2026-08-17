'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseLink } from '@/lib/practice-storage'
import type { MetronomeLoop } from '@/types/metronome-loop'
import { loadLoops } from '@/lib/metronome-loop-storage'
import { useLoopScheduler } from '@/lib/useLoopScheduler'
import { loadDashboardState } from '@/lib/dashboard-storage'
import { DEFAULT_AUDIO_ENGINE, coerceAudioEngineId, type AudioEngineId } from '@/lib/instrument'
import FretboardDiagram from '@/components/music/FretboardDiagram'
import { getFretboardNotes } from '@/lib/fretboard'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import { getChordVoicing, buildChordSymbol } from '@/data/open-chord-voicings'
import IntervalTrainer from '@/components/ear-training/IntervalTrainer'
import ModeTrainer from '@/components/ear-training/ModeTrainer'
import FretboardTrainer from '@/components/trainers/FretboardTrainer'

const STANDARD_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

interface Props {
  link: ExerciseLink
  /** Whether the surrounding practice timer is paused. */
  paused: boolean
  /** Elapsed fraction (0–1) of the current exercise segment. */
  progress: number
}

/**
 * Renders the tool bound to a practice exercise inline in the player.
 * Keyed by exercise id upstream, so it remounts (and resets) per exercise.
 */
export default function PracticeExerciseTool({ link, paused, progress }: Props) {
  switch (link.kind) {
    case 'metronome':
      return <InlineLoopTool loopId={link.loopId} paused={paused} bpmRamp={link.bpmRamp} progress={progress} />
    case 'scale':
      return <ScaleTool root={link.root} scaleId={link.scaleId} />
    case 'chord-drill':
      return <ChordDrillTool chords={link.chords} changesPerMin={link.changesPerMin} paused={paused} />
    case 'ear-training':
      return (
        <ToolShell>{link.mode === 'intervals' ? <IntervalTrainer /> : <ModeTrainer />}</ToolShell>
      )
    case 'fretboard-trainer':
      return (
        <ToolShell>
          <FretboardTrainer />
        </ToolShell>
      )
    case 'free':
    default:
      return null
  }
}

function ToolShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">{children}</div>
}

// ── Metronome loop ──────────────────────────────────────────────────────────

interface BpmRamp {
  fromPct: number
  toPct: number
}

function InlineLoopTool({
  loopId,
  paused,
  bpmRamp,
  progress,
}: {
  loopId: string
  paused: boolean
  bpmRamp?: BpmRamp
  progress: number
}) {
  const [loop, setLoop] = useState<MetronomeLoop | null>(null)
  const [missing, setMissing] = useState(false)
  const [engineId, setEngineId] = useState<AudioEngineId>(DEFAULT_AUDIO_ENGINE)

  useEffect(() => {
    let active = true
    void loadLoops().then((loops) => {
      if (!active) return
      const found = loops.find((l) => l.id === loopId) ?? null
      setLoop(found)
      setMissing(!found)
    })
    void loadDashboardState().then((s) => {
      if (active && s?.audioEngine) setEngineId(coerceAudioEngineId(s.audioEngine))
    })
    return () => {
      active = false
    }
  }, [loopId])

  if (missing) {
    return (
      <ToolShell>
        <p className="text-sm text-ink-muted">This metronome loop is no longer available.</p>
      </ToolShell>
    )
  }
  if (!loop) {
    return (
      <ToolShell>
        <p className="text-sm text-ink-muted">Loading loop…</p>
      </ToolShell>
    )
  }
  return <LoopRunner loop={loop} engineId={engineId} paused={paused} bpmRamp={bpmRamp} progress={progress} />
}

function LoopRunner({
  loop,
  engineId,
  paused,
  bpmRamp,
  progress,
}: {
  loop: MetronomeLoop
  engineId: AudioEngineId
  paused: boolean
  bpmRamp?: BpmRamp
  progress: number
}) {
  const pct = bpmRamp
    ? Math.round(bpmRamp.fromPct + (bpmRamp.toPct - bpmRamp.fromPct) * Math.max(0, Math.min(1, progress)))
    : 100

  const { phase, currentBar, currentBeat, start, stop } = useLoopScheduler({
    loop,
    pct,
    engineId,
    guideNotesEnabled: true,
    countInBetweenLoops: false,
  })

  // Auto-start on mount; stop when paused; resume when unpaused.
  useEffect(() => {
    if (paused) {
      stop()
    } else {
      start()
    }
    return () => stop()
  }, [paused, start, stop])

  const beatsPerBar = loop.beatsPerBar

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-ink">{loop.name}</p>
          <p className="text-xs text-ink-muted">
            {bpmRamp
              ? `${Math.max(40, Math.floor((loop.targetBpm * pct) / 100))} BPM (ramping ${bpmRamp.fromPct}→${bpmRamp.toPct}%)`
              : `${loop.targetBpm} BPM · ${loop.bars} bar${loop.bars !== 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-brand/15 text-brand">
          {phase === 'count-in' ? 'Count in' : phase === 'loop' ? 'Playing' : 'Ready'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: beatsPerBar }, (_, i) => {
          const active = phase === 'loop' && i === currentBeat
          return (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-colors ${
                active ? 'bg-brand' : 'bg-surface-2 border border-line'
              }`}
            />
          )
        })}
        {phase === 'loop' && (
          <span className="ml-2 text-xs text-ink-muted tabular-nums">bar {currentBar}</span>
        )}
      </div>
    </div>
  )
}

// ── Scale ─────────────────────────────────────────────────────────────────────

function ScaleTool({ root, scaleId }: { root: string; scaleId: string }) {
  const notes = useMemo(
    () => getFretboardNotes(root, scaleId, STANDARD_TUNING, 15),
    [root, scaleId],
  )
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-sm font-semibold text-ink mb-3 capitalize">
        {root} {scaleId}
      </p>
      <div className="overflow-x-auto">
        <FretboardDiagram notes={notes} fretCount={15} showDegrees />
      </div>
    </div>
  )
}

// ── Chord drill ─────────────────────────────────────────────────────────────

function ChordDrillTool({
  chords,
  changesPerMin,
  paused,
}: {
  chords: { root: string; quality: import('@/data/open-chord-voicings').ChordQuality }[]
  changesPerMin: number
  paused: boolean
}) {
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  indexRef.current = index

  useEffect(() => {
    if (paused || chords.length < 2) return
    const intervalMs = Math.max(250, (60 / changesPerMin) * 1000)
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % chords.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [paused, changesPerMin, chords.length])

  if (chords.length === 0) {
    return (
      <ToolShell>
        <p className="text-sm text-ink-muted">No chords configured for this drill.</p>
      </ToolShell>
    )
  }

  const current = chords[index % chords.length]
  const next = chords[(index + 1) % chords.length]

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink">Chord drill</p>
        <span className="text-xs text-ink-muted tabular-nums">
          {(index % chords.length) + 1} / {chords.length}
        </span>
      </div>
      <div className="flex items-center justify-center gap-6">
        <ChordDiagramCard
          voicing={getChordVoicing(current.root, current.quality)}
          chordSymbol={buildChordSymbol(current.root, current.quality)}
          size="md"
        />
        {chords.length > 1 && (
          <div className="text-center opacity-60">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Next</p>
            <ChordDiagramCard
              voicing={getChordVoicing(next.root, next.quality)}
              chordSymbol={buildChordSymbol(next.root, next.quality)}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
