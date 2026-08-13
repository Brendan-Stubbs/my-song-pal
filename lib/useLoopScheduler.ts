'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Note } from 'tonal'
import { getAudioContext, getEngine, midiToFreq } from '@/lib/instrument'
import type { MetronomeLoop, GuideNote } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'
import type { AudioEngineId } from '@/lib/instrument'

export type LoopPhase = 'idle' | 'count-in' | 'loop'

export interface LoopSchedulerState {
  phase: LoopPhase
  /** 1-indexed bar within the loop (0 when idle or counting in). */
  currentBar: number
  /** 0-indexed beat within the current bar. */
  currentBeat: number
  /** Which repetition of the loop (starts at 1). */
  loopCount: number
  start: () => void
  stop: () => void
}

interface Options {
  loop: MetronomeLoop
  /** Current playback percentage (1–100). Effective BPM = floor(targetBpm × pct / 100). */
  pct: number
  /** Which audio engine to use for guide notes. */
  engineId: AudioEngineId
  /** When false, guide notes are not played (but everything else is). */
  guideNotesEnabled: boolean
  /** When false, count-in is skipped for repetitions 2, 3, … (first is always played). */
  countInBetweenLoops: boolean
  /**
   * Velocity/volume for guide notes, 0–1. Defaults to 1 (full velocity).
   * The metronome click is a raw oscillator so this controls the relative
   * loudness of the guide notes against it.
   */
  guideNoteVolume?: number
}

export function useLoopScheduler(options: Options): LoopSchedulerState {
  const [phase, setPhase] = useState<LoopPhase>('idle')
  const [currentBar, setCurrentBar] = useState(0)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [loopCount, setLoopCount] = useState(0)

  // Keep mutable refs for all scheduler inputs so the scheduling loop
  // picks up changes without being restarted.
  const loopRef = useRef(options.loop)
  const pctRef = useRef(options.pct)
  const engineIdRef = useRef(options.engineId)
  const guideNotesEnabledRef = useRef(options.guideNotesEnabled)
  const countInBetweenRef = useRef(options.countInBetweenLoops)
  const guideNoteVolumeRef = useRef(options.guideNoteVolume ?? 1)

  useEffect(() => { loopRef.current = options.loop }, [options.loop])
  useEffect(() => { pctRef.current = options.pct }, [options.pct])
  useEffect(() => { engineIdRef.current = options.engineId }, [options.engineId])
  useEffect(() => { guideNotesEnabledRef.current = options.guideNotesEnabled }, [options.guideNotesEnabled])
  useEffect(() => { countInBetweenRef.current = options.countInBetweenLoops }, [options.countInBetweenLoops])
  useEffect(() => { guideNoteVolumeRef.current = options.guideNoteVolume ?? 1 }, [options.guideNoteVolume])

  // Scheduler internal state refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextNoteTimeRef = useRef(0)

  // Phase + position tracking refs (scheduler writes, React state reads for UI).
  const phaseRef = useRef<LoopPhase>('idle')
  const barRef = useRef(0)       // 1-indexed during loop; 0 during count-in
  const beatRef = useRef(0)      // 0-indexed within bar
  const countInBarRef = useRef(0) // 1-indexed count-in bar progress
  const loopCountRef = useRef(0)

  // ── Audio helpers ──────────────────────────────────────────────────────────

  function effectiveBpm() {
    return Math.max(40, Math.floor((loopRef.current.targetBpm * pctRef.current) / 100))
  }

  function secondsPerBeat() {
    return (60 / effectiveBpm()) * (4 / loopRef.current.noteValue)
  }

  /** Schedule a single metronome click oscillator. */
  function scheduleClick(ctx: AudioContext, freq: number, gain: number, time: number) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g)
    g.connect(ctx.destination)
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    osc.start(time)
    osc.stop(time + 0.05)
  }


  /**
   * Schedule all enabled guide notes whose (bar, beat) matches the current
   * position. Each note fires at its exact sub-beat offset derived from its
   * `subdivision` and `duration` fields, so eighth/sixteenth/triplet notes
   * land at the correct fraction of the beat — not just at the beat boundary.
   */
  function scheduleGuideNotes(
    notes: GuideNote[],
    bar: number,
    beat: number,     // 1-indexed
    beatStartTime: number,
  ) {
    if (!guideNotesEnabledRef.current) return
    const hits = notes.filter((n) => n.bar === bar && n.beat === beat && n.enabled)
    if (hits.length === 0) return

    const spb = secondsPerBeat()
    const engine = getEngine(engineIdRef.current)

    hits.forEach((gn) => {
      const midi = Note.midi(gn.note)
      if (midi == null) return

      const subdivisionsInBeat = SUBDIVISIONS_PER_BEAT[gn.duration ?? 'quarter']
      const sub = gn.subdivision ?? 0
      // Offset from the beat start (in seconds)
      const offset = (sub / subdivisionsInBeat) * spb
      // Sound duration = one subdivision's worth of time, with a small gap
      const soundDuration = (spb / subdivisionsInBeat) * 0.85

      engine.playNote(midi, {
        time: beatStartTime + offset,
        duration: soundDuration,
        velocity: Math.max(0, Math.min(1, guideNoteVolumeRef.current)),
      })
    })
  }

  // ── Main scheduling function ───────────────────────────────────────────────

  const runSchedulerRef = useRef<() => void>(() => {})

  runSchedulerRef.current = function runScheduler() {
    const ctx = getAudioContext()
    if (!ctx) return

    const LOOKAHEAD = 0.1

    while (nextNoteTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const t = nextNoteTimeRef.current
      const loop = loopRef.current
      const spb = secondsPerBeat()
      const currentPhase = phaseRef.current

      if (currentPhase === 'count-in') {
        // Count-in click: distinct lower tone.
        const isFirstBeat = beatRef.current === 0
        scheduleClick(ctx, isFirstBeat ? 660 : 440, isFirstBeat ? 0.9 : 0.6, t)

        // Update UI: show the count-in bar number.
        const snapBar = countInBarRef.current
        const snapBeat = beatRef.current
        setTimeout(() => {
          setPhase('count-in')
          setCurrentBar(snapBar)
          setCurrentBeat(snapBeat)
        }, Math.max(0, (t - ctx.currentTime) * 1000))

        // Advance beat.
        beatRef.current += 1
        if (beatRef.current >= loop.beatsPerBar) {
          beatRef.current = 0
          countInBarRef.current += 1
          if (countInBarRef.current > loop.countInBars) {
            // Count-in complete — enter loop.
            phaseRef.current = 'loop'
            barRef.current = 1
            loopCountRef.current += 1
          }
        }
      } else if (currentPhase === 'loop') {
        const bar = barRef.current
        const beat = beatRef.current // 0-indexed
        const isAccent = beat === 0

        // Metronome click.
        scheduleClick(ctx, isAccent ? 1320 : 880, isAccent ? 1.0 : 0.6, t)

        // Guide notes (beat is 1-indexed in data model).
        scheduleGuideNotes(loop.guideNotes, bar, beat + 1, t)

        // UI update.
        const snapBar = bar
        const snapBeat = beat
        const snapLoopCount = loopCountRef.current
        setTimeout(() => {
          setPhase('loop')
          setCurrentBar(snapBar)
          setCurrentBeat(snapBeat)
          setLoopCount(snapLoopCount)
        }, Math.max(0, (t - ctx.currentTime) * 1000))

        // Advance beat.
        beatRef.current += 1
        if (beatRef.current >= loop.beatsPerBar) {
          beatRef.current = 0
          barRef.current += 1
          if (barRef.current > loop.bars) {
            // Decide whether to count in again.
            const skipCountIn =
              !countInBetweenRef.current && loopCountRef.current >= 1
            if (skipCountIn) {
              phaseRef.current = 'loop'
              barRef.current = 1
              loopCountRef.current += 1
            } else {
              phaseRef.current = 'count-in'
              countInBarRef.current = 1
            }
          }
        }
      }

      nextNoteTimeRef.current += spb
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    phaseRef.current = 'idle'
    barRef.current = 0
    beatRef.current = 0
    countInBarRef.current = 0
    setPhase('idle')
    setCurrentBar(0)
    setCurrentBeat(0)
    setLoopCount(0)
  }, [])

  const start = useCallback(() => {
    stop()

    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    // Warm up the guide-note engine so samples are ready.
    void getEngine(engineIdRef.current).resume()

    phaseRef.current = 'count-in'
    barRef.current = 0
    beatRef.current = 0
    countInBarRef.current = 1
    loopCountRef.current = 0
    nextNoteTimeRef.current = ctx.currentTime + 0.1

    intervalRef.current = setInterval(() => runSchedulerRef.current(), 25)
  }, [stop])

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop])

  return { phase, currentBar, currentBeat, loopCount, start, stop }
}

/** Re-export for consumers that need it without importing lib/instrument directly. */
export { midiToFreq }
