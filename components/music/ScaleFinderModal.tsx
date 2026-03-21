'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  findMatchingScales,
  getPitchClassAt,
  toSharp,
  type ScaleMatch,
} from '@/lib/scale-finder'

// ─── SVG layout constants (match FretboardDiagram proportions) ───────────────

const FRET_COUNT = 12
const NUM_STRINGS = 6
const CELL_W = 42
const CELL_H = 34
const PAD_T = 38   // room for fret numbers above grid
const PAD_L = 28   // room for string labels
const PAD_B = 34   // room for inlay markers + fret numbers below grid
const PAD_R = 12
const DOT_R = 11

// Y-positions for fret labels and inlay markers (within bottom padding)
const INLAY_Y_OFFSET = 10   // px below the last string line
const FRET_NUM_B_OFFSET = 26 // px below the last string line

const BRAND = '#ff9933'
const DOT_FILLED_TEXT = '#ffffff'

// Fret position inlay markers (standard guitar dots)
const FRET_MARKERS: number[] = [3, 5, 7, 9]
const DOUBLE_MARKERS: number[] = [12]

// Standard tuning string names (string 1 = high e at top, string 6 = low E at bottom)
const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E']

// ─── Fretboard geometry helpers ──────────────────────────────────────────────

function fretX(fret: number): number {
  return PAD_L + fret * CELL_W + CELL_W / 2
}

function stringY(stringNum: number): number {
  return PAD_T + (stringNum - 1) * CELL_H
}

const svgWidth = PAD_L + (FRET_COUNT + 1) * CELL_W + PAD_R
const svgHeight = PAD_T + (NUM_STRINGS - 1) * CELL_H + PAD_B

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScaleFinderModalProps {
  isOpen: boolean
  onClose: () => void
  /** Current dashboard tuning — used to label fretboard notes */
  tuning?: string[]
  /** Called when user clicks "Apply to dashboard" on a result */
  onApplyScale?: (key: string, scaleName: string) => void
}

// ─── Interactive fretboard ────────────────────────────────────────────────────

interface FretboardProps {
  tuning: string[]
  selectedPcs: Set<string>
  onToggle: (pc: string) => void
}

function InteractiveFretboard({ tuning, selectedPcs, onToggle }: FretboardProps) {
  // Pre-compute pitch class for every (string, fret) position
  const grid: { stringNum: number; fret: number; pc: string }[] = []
  for (let s = 1; s <= NUM_STRINGS; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      grid.push({ stringNum: s, fret: f, pc: getPitchClassAt(s, f, tuning) })
    }
  }

  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Interactive guitar fretboard — click notes to select them"
        role="img"
        style={{ display: 'block' }}
      >
        {/* Light/dark backgrounds */}
        <rect width={svgWidth} height={svgHeight} fill="#faf9f7" className="dark:hidden" />
        <rect width={svgWidth} height={svgHeight} fill="#1f2937" className="hidden dark:block" />

        {/* Open string column shading */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={CELL_W}
          height={(NUM_STRINGS - 1) * CELL_H}
          fill="#e8e3db"
          className="dark:hidden"
          opacity={0.6}
        />
        <rect
          x={PAD_L}
          y={PAD_T}
          width={CELL_W}
          height={(NUM_STRINGS - 1) * CELL_H}
          fill="#374151"
          className="hidden dark:block"
          opacity={0.5}
        />

        {/* String lines */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          const y = stringY(s)
          return (
            <line
              key={`str-${s}`}
              x1={PAD_L} y1={y}
              x2={svgWidth - PAD_R} y2={y}
              stroke="#d1d5db" strokeWidth={1}
            />
          )
        })}

        {/* Fret lines */}
        {Array.from({ length: FRET_COUNT + 2 }, (_, i) => {
          const x = PAD_L + i * CELL_W
          const isNut = i === 0
          return (
            <line
              key={`fret-line-${i}`}
              x1={x} y1={PAD_T}
              x2={x} y2={PAD_T + (NUM_STRINGS - 1) * CELL_H}
              stroke={isNut ? '#374151' : '#d1d5db'}
              strokeWidth={isNut ? 3 : 1}
            />
          )
        })}

        {/* Fret number labels — top and bottom */}
        {Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
          <g key={`fnum-${f}`}>
            {/* Above grid */}
            <text
              x={fretX(f)}
              y={PAD_T - 20}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={10}
              fontWeight="500"
              fill="#6b7280"
            >
              {f}
            </text>
            {/* Below grid */}
            <text
              x={fretX(f)}
              y={PAD_T + (NUM_STRINGS - 1) * CELL_H + FRET_NUM_B_OFFSET}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={10}
              fontWeight="500"
              fill="#6b7280"
            >
              {f}
            </text>
          </g>
        ))}

        {/* String name labels (left) */}
        {STRING_NAMES.map((name, i) => {
          const s = i + 1
          return (
            <text
              key={`sname-${s}`}
              x={PAD_L - 6}
              y={stringY(s)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={9}
              fontWeight="600"
              fill="#6b7280"
            >
              {name}
            </text>
          )
        })}

        {/* Fret position inlay markers (between grid and bottom numbers) */}
        {FRET_MARKERS.map((f) => (
          <circle
            key={`marker-${f}`}
            cx={fretX(f)}
            cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET}
            r={3}
            fill="#9ca3af"
          />
        ))}
        {DOUBLE_MARKERS.map((f) => (
          <g key={`dbl-${f}`}>
            <circle cx={fretX(f) - 5} cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET} r={3} fill="#9ca3af" />
            <circle cx={fretX(f) + 5} cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET} r={3} fill="#9ca3af" />
          </g>
        ))}

        {/* Note dots */}
        {grid.map(({ stringNum, fret, pc }) => {
          const selected = selectedPcs.has(pc)
          const cx = fretX(fret)
          const cy = stringY(stringNum)

          return (
            <g
              key={`dot-${stringNum}-${fret}`}
              onClick={() => onToggle(pc)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`${pc} — string ${stringNum}, fret ${fret}${selected ? ' (selected)' : ''}`}
              aria-pressed={selected}
            >
              {/* Invisible hit area for easier clicking */}
              <rect
                x={cx - CELL_W / 2 + 2}
                y={cy - CELL_H / 2 + 2}
                width={CELL_W - 4}
                height={CELL_H - 4}
                fill="transparent"
              />
              {/* Background circle — covers string/fret lines so dot looks clean */}
              <circle cx={cx} cy={cy} r={DOT_R} fill="#faf9f7" className="dark:hidden" />
              <circle cx={cx} cy={cy} r={DOT_R} fill="#1f2937" className="hidden dark:block" />
              {/* Visible dot */}
              {selected ? (
                <circle cx={cx} cy={cy} r={DOT_R} fill={BRAND} />
              ) : (
                <circle cx={cx} cy={cy} r={DOT_R} fill="none" stroke="#4b5563" strokeWidth={1.5} />
              )}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={selected ? '700' : '400'}
                fill={selected ? DOT_FILLED_TEXT : '#6b7280'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {pc}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Scale result card ────────────────────────────────────────────────────────

function ScaleResultCard({
  match,
  onApply,
}: {
  match: ScaleMatch
  onApply?: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-warm-panel dark:bg-gray-800 px-4 py-3 hover:border-brand/40 transition-colors">
      <div className="flex-1 min-w-0">
        {/* Scale name */}
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {match.displayName}
        </p>

        {/* Note chips */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {match.scaleNotes.map((note) => {
            const isMatched = match.matchedNotes.includes(note)
            return (
              <span
                key={note}
                className={[
                  'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-medium',
                  isMatched
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                ].join(' ')}
              >
                {note}
              </span>
            )
          })}
        </div>
      </div>

      {/* Extra note count badge */}
      {match.extraNoteCount > 0 && (
        <div className="shrink-0 text-right">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            +{match.extraNoteCount} note{match.extraNoteCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Apply button */}
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="shrink-0 rounded-md border border-brand text-brand text-xs font-medium px-2.5 py-1 hover:bg-brand hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
        >
          Apply
        </button>
      )}
    </div>
  )
}

// ─── Results section ──────────────────────────────────────────────────────────

const MAX_EXTRA = 5

function groupLabel(extraCount: number): string {
  if (extraCount === 0) return 'Exact matches'
  if (extraCount === 1) return '1 extra note'
  return `${extraCount} extra notes`
}

function ResultsSection({
  results,
  onApply,
}: {
  results: ScaleMatch[]
  onApply?: (key: string, scaleName: string) => void
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No scales found containing all selected notes.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Try removing one of the selected notes and searching again.
        </p>
      </div>
    )
  }

  // Group by extraNoteCount (cap at MAX_EXTRA)
  const groups = new Map<number, ScaleMatch[]>()
  for (const match of results) {
    if (match.extraNoteCount > MAX_EXTRA) continue
    const group = groups.get(match.extraNoteCount) ?? []
    group.push(match)
    groups.set(match.extraNoteCount, group)
  }

  const hiddenCount = results.filter((r) => r.extraNoteCount > MAX_EXTRA).length

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Found{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {results.length - hiddenCount}
        </span>{' '}
        matching scale{results.length - hiddenCount !== 1 ? 's' : ''}
        {hiddenCount > 0 && (
          <span className="text-xs ml-1">
            ({hiddenCount} with 6+ extra notes hidden)
          </span>
        )}
      </p>

      {[...groups.entries()].map(([extraCount, matches]) => (
        <div key={extraCount}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            {groupLabel(extraCount)}
          </h4>
          <div className="space-y-2">
            {matches.map((m) => (
              <ScaleResultCard
                key={`${m.key}-${m.scaleName}`}
                match={m}
                onApply={onApply ? () => onApply(m.key, m.scaleName) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ScaleFinderModal({
  isOpen,
  onClose,
  tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  onApplyScale,
}: ScaleFinderModalProps) {
  const [selectedPcs, setSelectedPcs] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<ScaleMatch[] | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

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

  function handleFindScales() {
    setResults(findMatchingScales([...selectedPcs]))
    setHasSearched(true)
  }

  function handleApply(key: string, scaleName: string) {
    onApplyScale?.(key, scaleName)
    onClose()
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
        aria-label="Scale Finder"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Scale Finder</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Click notes on the fretboard, then identify which scales they belong to
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
            <InteractiveFretboard
              tuning={tuning}
              selectedPcs={selectedPcs}
              onToggle={handleToggle}
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

          {/* Find Scales button */}
          <div>
            <button
              type="button"
              onClick={handleFindScales}
              disabled={!canSearch}
              className={[
                'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1',
                canSearch
                  ? 'bg-brand text-white hover:bg-brand/90'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed',
              ].join(' ')}
            >
              {canSearch
                ? `Find Scales (${selectedPcs.size} note${selectedPcs.size !== 1 ? 's' : ''} selected)`
                : 'Select at least 2 notes to identify a scale'}
            </button>
          </div>

          {/* Results */}
          {hasSearched && results !== null && (
            <ResultsSection
              results={results}
              onApply={onApplyScale ? handleApply : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}
