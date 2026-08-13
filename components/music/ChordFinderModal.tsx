'use client'

import { useState, useEffect, useCallback } from 'react'
import { findMatchingChords, type ChordMatch } from '@/lib/chord-finder'
import InteractiveFretboard from './InteractiveFretboard'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChordFinderModalProps {
  isOpen: boolean
  onClose: () => void
  /** Current dashboard tuning — used to label fretboard notes */
  tuning?: string[]
}

// ─── Chord result card ─────────────────────────────────────────────────────────

function ChordResultCard({ match }: { match: ChordMatch }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-warm-panel dark:bg-gray-800 px-4 py-3 hover:border-brand/40 transition-colors">
      {/* Symbol */}
      <div className="shrink-0 w-16">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {match.symbol}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {/* Type label */}
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {match.typeLabel}
        </p>

        {/* Note chips — all matched by definition (exact match) */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {match.chordNotes.map((note, i) => (
            <span
              key={`${note}-${i}`}
              className={[
                'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-medium',
                i === 0
                  ? 'bg-brand text-white'
                  : 'bg-brand/15 text-brand dark:bg-brand/20',
              ].join(' ')}
              title={i === 0 ? 'Root' : undefined}
            >
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Results section ──────────────────────────────────────────────────────────

function ResultsSection({ results }: { results: ChordMatch[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No chord exactly matches those notes.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Every selected note must belong to the chord — try adding or removing a note.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Found{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {results.length}
        </span>{' '}
        matching chord{results.length !== 1 ? 's' : ''}
        {results.length > 1 && (
          <span className="text-xs ml-1">(the same notes can spell more than one chord)</span>
        )}
      </p>

      <div className="space-y-2">
        {results.map((m) => (
          <ChordResultCard key={m.symbol} match={m} />
        ))}
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ChordFinderModal({
  isOpen,
  onClose,
  tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
}: ChordFinderModalProps) {
  const [selectedPcs, setSelectedPcs] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<ChordMatch[] | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [highEAtTop, setHighEAtTop] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedPcs(new Set())
      setResults(null)
      setHasSearched(false)
    }
  }, [isOpen])

  // Clear results whenever selection changes
  const handleToggle = useCallback((pc: string) => {
    setSelectedPcs((prev) => {
      const next = new Set(prev)
      if (next.has(pc)) {
        next.delete(pc)
      } else {
        next.add(pc)
      }
      return next
    })
    setResults(null)
    setHasSearched(false)
  }, [])

  function handleClearAll() {
    setSelectedPcs(new Set())
    setResults(null)
    setHasSearched(false)
  }

  function handleFindChords() {
    setResults(findMatchingChords([...selectedPcs]))
    setHasSearched(true)
  }

  if (!isOpen) return null

  const selectedArray = [...selectedPcs].sort()
  const canSearch = selectedPcs.size >= 2

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-warm-panel dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Chord Finder"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Chord Finder</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Click the notes of a chord, then identify every chord they exactly spell
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l14 14M16 2L2 16" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Interactive fretboard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Fretboard — click to select notes
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highEAtTop}
                    onChange={(e) => setHighEAtTop(e.target.checked)}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  High e at top
                </label>
                {selectedPcs.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
            <InteractiveFretboard
              tuning={tuning}
              selectedPcs={selectedPcs}
              onToggle={handleToggle}
              highEAtTop={highEAtTop}
            />
          </div>

          {/* Selected notes summary */}
          {selectedArray.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Selected notes ({selectedArray.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedArray.map((pc) => (
                  <button
                    key={pc}
                    type="button"
                    onClick={() => handleToggle(pc)}
                    className="inline-flex items-center gap-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-sm font-semibold px-3 py-1 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors focus:outline-none"
                    title="Click to deselect"
                  >
                    {pc}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 1l8 8M9 1L1 9" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Find Chords button */}
          <div>
            <button
              type="button"
              onClick={handleFindChords}
              disabled={!canSearch}
              className={[
                'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1',
                canSearch
                  ? 'bg-brand text-white hover:bg-brand/90'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
              ].join(' ')}
            >
              {canSearch
                ? `Find Chords (${selectedPcs.size} note${selectedPcs.size !== 1 ? 's' : ''} selected)`
                : 'Select at least 2 notes to identify a chord'}
            </button>
          </div>

          {/* Results */}
          {hasSearched && results !== null && (
            <ResultsSection results={results} />
          )}
        </div>
      </div>
    </div>
  )
}
