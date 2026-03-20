'use client'

import { useState, useEffect } from 'react'
import type { FretboardNote } from '@/types/music'
import FretboardDiagram from './FretboardDiagram'

const AVAILABLE_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

const AVAILABLE_SCALES = [
  'major',
  'minor',
  'pentatonic major',
  'pentatonic minor',
  'blues',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic minor',
  'melodic minor',
]

const FRET_COUNT = 12

export interface FretboardPanelProps {
  tuning: string[]
}

export default function FretboardPanel({ tuning }: FretboardPanelProps) {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedScale, setSelectedScale] = useState('major')
  const [showDegrees, setShowDegrees] = useState(false)
  const [notes, setNotes] = useState<FretboardNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchNotes() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          key: selectedKey,
          scale: selectedScale,
          fretCount: String(FRET_COUNT),
          tuning: tuning.join(','),
        })
        const response = await fetch(`/api/music/fretboard?${params.toString()}`)
        const data = await response.json() as { notes?: FretboardNote[]; error?: string }

        if (cancelled) return

        if (!response.ok) {
          setError(data.error ?? 'Failed to load fretboard')
          setNotes([])
        } else {
          setNotes(data.notes ?? [])
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load fretboard. Please try again.')
          setNotes([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchNotes()

    return () => {
      cancelled = true
    }
  }, [selectedKey, selectedScale, tuning])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Scale Fretboard
      </h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fretboard-key-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Key
          </label>
          <select
            id="fretboard-key-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {AVAILABLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="fretboard-scale-select"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Scale
          </label>
          <select
            id="fretboard-scale-select"
            value={selectedScale}
            onChange={(e) => setSelectedScale(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {AVAILABLE_SCALES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2 pb-0.5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDegrees}
              onChange={(e) => setShowDegrees(e.target.checked)}
              className="rounded border-gray-300 text-brand focus:ring-brand"
            />
            Show degrees
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading fretboard…</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <FretboardDiagram
          notes={notes}
          fretCount={FRET_COUNT}
          showDegrees={showDegrees}
        />
      )}
    </div>
  )
}
