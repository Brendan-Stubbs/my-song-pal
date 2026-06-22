'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Note } from 'tonal'
import type { ScaleInfo } from '@/types/music'
import { getScaleInfo } from '@/lib/scales'
import { getEngine, AUDIO_ENGINES, type AudioEngineId } from '@/lib/instrument'

type EngineStatus = 'ready' | 'loading' | 'error'

function engineLoadsSamples(id: AudioEngineId): boolean {
  return AUDIO_ENGINES.find((e) => e.id === id)?.loadsSamples ?? false
}

const STEP_MS = 520
const RUN_NOTE_DURATION = 0.5
const CLICK_NOTE_DURATION = 0.65
const FLASH_MS = 360

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

export interface ScaleNotesPanelProps {
  selectedKey: string
  selectedScale: string
  engineId: AudioEngineId
}

export default function ScaleNotesPanel({
  selectedKey,
  selectedScale,
  engineId,
}: ScaleNotesPanelProps) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() =>
    engineLoadsSamples(engineId) ? 'loading' : 'ready',
  )

  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingRef = useRef(false)

  const { scale, error } = useMemo(() => {
    try {
      return { scale: getScaleInfo(selectedKey, selectedScale), error: null as string | null }
    } catch (e) {
      return {
        scale: null as ScaleInfo | null,
        error: e instanceof Error ? e.message : 'Failed to load scale',
      }
    }
  }, [selectedKey, selectedScale])

  // Assign each scale note an octave so the sequence ascends from the root,
  // then append the root an octave up so the run resolves back home.
  const midis = useMemo(() => {
    if (!scale) return [] as number[]
    let octave = 4
    let prevChroma = -1
    const arr = scale.notes.map((pc) => {
      const chroma = Note.chroma(pc) ?? 0
      if (prevChroma !== -1 && chroma <= prevChroma) octave += 1
      prevChroma = chroma
      return Note.midi(`${pc}${octave}`) ?? 60
    })
    if (arr.length > 0) arr.push(arr[0] + 12)
    return arr
  }, [scale])

  // Chips to render: the scale notes plus the resolving octave root.
  const chips = useMemo(() => {
    if (!scale) return [] as { note: string; degree: string; highlight: boolean }[]
    const items = scale.notes.map((note, i) => ({
      note,
      degree: scale.degrees[i] ?? String(i + 1),
      highlight: i === 0,
    }))
    if (items.length > 0) {
      items.push({ note: scale.notes[0], degree: '8', highlight: true })
    }
    return items
  }, [scale])

  function clearTimers() {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current)
      stepTimerRef.current = null
    }
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }

  function stop() {
    clearTimers()
    playingRef.current = false
    setIsPlaying(false)
    setActiveIndex(-1)
  }

  // Stop playback whenever the scale/key changes, and on unmount.
  useEffect(() => {
    stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, selectedScale])
  useEffect(() => () => clearTimers(), [])

  // Warm up (and load samples for) the selected engine.
  useEffect(() => {
    let cancelled = false
    const instrument = getEngine(engineId)
    if (engineLoadsSamples(engineId)) {
      setEngineStatus('loading')
      instrument
        .resume()
        .then(() => {
          if (!cancelled) setEngineStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setEngineStatus('error')
        })
    } else {
      setEngineStatus('ready')
      void instrument.resume()
    }
    return () => {
      cancelled = true
    }
  }, [engineId])

  function playOne(index: number) {
    if (index < 0 || index >= midis.length) return
    const instrument = getEngine(engineId)
    void instrument.resume()
    instrument.playNote(midis[index], { duration: CLICK_NOTE_DURATION })

    // Transient highlight, but don't fight an active run-through.
    if (!playingRef.current) {
      setActiveIndex(index)
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setActiveIndex(-1), FLASH_MS)
    }
  }

  function playAll() {
    clearTimers()
    const instrument = getEngine(engineId)
    void instrument.resume()
    playingRef.current = true
    setIsPlaying(true)

    let i = 0
    const step = () => {
      if (!playingRef.current || i >= midis.length) {
        stop()
        return
      }
      setActiveIndex(i)
      instrument.playNote(midis[i], { duration: RUN_NOTE_DURATION })
      i += 1
      stepTimerRef.current = setTimeout(step, STEP_MS)
    }
    step()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click a note to hear it, or play through the whole scale.
          </p>
          {engineStatus === 'loading' && (
            <span className="text-xs text-brand animate-pulse">loading sounds…</span>
          )}
          {engineStatus === 'error' && (
            <span className="text-xs text-red-600 dark:text-red-400">couldn’t load sounds</span>
          )}
        </div>

        {!error && midis.length > 0 && (
          <button
            onClick={isPlaying ? stop : playAll}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
              isPlaying
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-brand text-white hover:bg-brand/90'
            }`}
            aria-label={isPlaying ? 'Stop playback' : 'Play scale'}
          >
            {isPlaying ? <StopIcon /> : <PlayIcon />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!error && scale && (
        <div className="flex flex-wrap items-stretch gap-2">
          {chips.map((chip, i) => {
            const isActive = i === activeIndex

            let cls = chip.highlight
              ? 'bg-brand text-white border-brand'
              : 'bg-warm-panel dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:border-brand'
            if (isActive) cls += ' ring-2 ring-brand ring-offset-1 dark:ring-offset-gray-800 scale-110'

            return (
              <button
                key={`${chip.note}-${i}`}
                onClick={() => playOne(i)}
                className={`flex flex-col items-center justify-center min-w-[3.5rem] px-3 py-2 rounded-lg border transition-all select-none ${cls}`}
                aria-label={`Play ${chip.note}, scale degree ${chip.degree}`}
              >
                <span className="text-lg font-bold leading-tight">{chip.note}</span>
                <span className="text-[11px] opacity-70 leading-tight">{chip.degree}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
