'use client'

import { useEffect, useState } from 'react'
import type { ChordInfo } from '@/types/music'

const COMMON_PROGRESSIONS = [
  { name: 'I – IV – V', degrees: [1, 4, 5] },
  { name: 'I – V – vi – IV', degrees: [1, 5, 6, 4] },
  { name: 'I – vi – IV – V', degrees: [1, 6, 4, 5] },
  { name: 'I – IV – vi – V', degrees: [1, 4, 6, 5] },
  { name: 'ii – V – I', degrees: [2, 5, 1] },
  { name: 'I – iii – IV – V', degrees: [1, 3, 4, 5] },
  { name: 'vi – IV – I – V', degrees: [6, 4, 1, 5] },
  { name: 'I – V – vi – iii – IV', degrees: [1, 5, 6, 3, 4] },
]

export const QUALITY_STYLES: Record<ChordInfo['quality'], string> = {
  major: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  minor: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
  diminished: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
}

export interface ChordProgressionsPanelProps {
  selectedKey: string
  selectedScale: string
  onAddChord: (chord: ChordInfo) => void
  onApplyPreset: (chords: ChordInfo[]) => void
}

export default function ChordProgressionsPanel({ selectedKey, selectedScale, onAddChord, onApplyPreset }: ChordProgressionsPanelProps) {
  const [chords, setChords] = useState<ChordInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchChords() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ key: selectedKey, scale: selectedScale })
        const response = await fetch(`/api/music/chords?${params.toString()}`)
        const data = await response.json() as { chords?: ChordInfo[]; error?: string }

        if (cancelled) return

        if (!response.ok) {
          setError(data.error ?? 'Failed to load chords')
          setChords([])
        } else {
          setChords(data.chords ?? [])
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load chords. Please try again.')
          setChords([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchChords()
    return () => { cancelled = true }
  }, [selectedKey, selectedScale])

  function applyPreset(degrees: number[]) {
    const resolved = degrees.flatMap((d) => {
      const chord = chords.find((c) => c.degree === d)
      return chord ? [chord] : []
    })
    onApplyPreset(resolved)
  }

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Chord Progressions
      </h2>

      {isLoading && (
        <div className="flex justify-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Loading chords…</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && chords.length > 0 && (
        <>
          {/* Available chords */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Available Chords
            </h3>
            <div className="flex flex-wrap gap-2">
              {chords.map((chord) => (
                <button
                  key={chord.degree}
                  onClick={() => onAddChord(chord)}
                  className={`flex flex-col items-center px-4 py-2 rounded-lg border cursor-pointer transition-opacity hover:opacity-75 ${QUALITY_STYLES[chord.quality]}`}
                >
                  <span className="text-xs font-medium opacity-60">{chord.degreeLabel}</span>
                  <span className="text-lg font-bold leading-tight">{chord.symbol}</span>
                  <span className="text-xs opacity-60">{chord.notes.join(' ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Common progressions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Common Progressions
            </h3>
            <div className="flex flex-wrap gap-2">
              {COMMON_PROGRESSIONS.map((preset) => {
                const available = preset.degrees.every((d) => chords.some((c) => c.degree === d))
                if (!available) return null
                const resolved = preset.degrees.map((d) => chords.find((c) => c.degree === d)?.symbol ?? '')
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.degrees)}
                    className="flex flex-col items-start px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{preset.name}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{resolved.join(' – ')}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && chords.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          No chords available for this scale.
        </p>
      )}
    </div>
  )
}
