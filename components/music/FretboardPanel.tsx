'use client'

import { useEffect, useState } from 'react'
import type { FretboardNote } from '@/types/music'
import FretboardDiagram from './FretboardDiagram'

const FRET_COUNT = 12

export interface FretboardPanelProps {
  selectedKey: string
  selectedScale: string
  tuning: string[]
}

export default function FretboardPanel({ selectedKey, selectedScale, tuning }: FretboardPanelProps) {
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
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchNotes()
    return () => { cancelled = true }
  }, [selectedKey, selectedScale, tuning])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scale Fretboard
        </h2>
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
