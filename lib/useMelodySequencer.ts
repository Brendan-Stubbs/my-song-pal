'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAudioContext,
  getEngine,
  playChord,
  type AudioEngineId,
} from '@/lib/instrument'
import type { Melody } from '@/types/melody'
import { secondsPerStep, chordToMidis } from '@/lib/melody-theory'

interface Args {
  melody: Melody
  engineId: AudioEngineId
  loop: boolean
}

interface State {
  isPlaying: boolean
  /** Current step under the playhead, or -1 when stopped. */
  currentStep: number
  start: () => void
  stop: () => void
}

/**
 * Schedules a melody's notes + rung-out chords against the shared AudioContext
 * clock, advancing a UI playhead via requestAnimationFrame. Short loops are
 * re-scheduled one iteration at a time so tempo/edits pick up on the next pass.
 */
export function useMelodySequencer({ melody, engineId, loop }: Args): State {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)

  const playingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const originRef = useRef(0)
  const stepDurRef = useRef(0.5)
  const totalStepsRef = useRef(1)

  const melodyRef = useRef(melody)
  const loopRef = useRef(loop)
  useEffect(() => {
    melodyRef.current = melody
  }, [melody])
  useEffect(() => {
    loopRef.current = loop
  }, [loop])

  const stop = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    setCurrentStep(-1)
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current)
    rafRef.current = null
    loopTimerRef.current = null
  }, [])

  const scheduleOnce = useCallback(
    (ctxStart: number) => {
      const m = melodyRef.current
      const engine = getEngine(engineId)
      const sps = secondsPerStep(m.bpm, m.stepsPerBar)
      const secPerBar = sps * m.stepsPerBar

      for (const n of m.notes) {
        engine.playNote(n.midi, {
          time: ctxStart + n.step * sps,
          duration: sps * 0.9,
          velocity: 0.5,
        })
      }

      for (const c of m.chords) {
        const midis = chordToMidis(c.notes)
        if (midis.length === 0) continue
        playChord(engine, midis, {
          time: ctxStart + c.bar * secPerBar,
          duration: secPerBar * 0.98,
          velocity: 0.3,
        })
      }
    },
    [engineId],
  )

  const start = useCallback(() => {
    const ctx = getAudioContext()
    if (!ctx) return
    const engine = getEngine(engineId)
    void engine.resume()

    stop()
    playingRef.current = true
    setIsPlaying(true)

    const m = melodyRef.current
    const sps = secondsPerStep(m.bpm, m.stepsPerBar)
    const total = Math.max(1, m.bars * m.stepsPerBar)
    const loopDur = total * sps
    const origin = ctx.currentTime + 0.12

    originRef.current = origin
    stepDurRef.current = sps
    totalStepsRef.current = total

    const scheduleFrom = (ctxStart: number) => {
      scheduleOnce(ctxStart)
      const ms = loopDur * 1000
      if (loopRef.current) {
        loopTimerRef.current = setTimeout(() => {
          if (!playingRef.current) return
          scheduleFrom(ctxStart + loopDur)
        }, ms)
      } else {
        loopTimerRef.current = setTimeout(() => {
          if (playingRef.current) stop()
        }, ms + 150)
      }
    }
    scheduleFrom(origin)

    const tick = () => {
      if (!playingRef.current) return
      const c = getAudioContext()
      if (c) {
        const rel = c.currentTime - originRef.current
        if (rel < 0) {
          setCurrentStep(-1)
        } else {
          const total2 = totalStepsRef.current
          const step = Math.floor(rel / stepDurRef.current) % total2
          setCurrentStep(((step % total2) + total2) % total2)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [engineId, scheduleOnce, stop])

  useEffect(() => () => stop(), [stop])

  return { isPlaying, currentStep, start, stop }
}
