'use client'

import { useEffect, useState } from 'react'
import type { ChordInfo } from '@/types/music'
import {
  type ChordQuality,
  getChordVoicing,
  mapDiatonicQuality,
  qualityLabel,
  buildChordSymbol,
} from '@/data/open-chord-voicings'
import ChordDiagramCard from './ChordDiagramCard'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpenChordsPanelProps {
  selectedKey: string
  selectedScale: string
}

type Modifier = 'natural' | ChordQuality

const MODIFIER_PILLS: { value: Modifier; label: string }[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: '7', label: '7' },
  { value: 'maj7', label: 'Maj7' },
  { value: 'min7', label: 'Min7' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function OpenChordsPanel({
  selectedKey,
  selectedScale,
}: OpenChordsPanelProps) {
  const [chords, setChords] = useState<ChordInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Global quality modifier — 'natural' respects diatonic quality of each chord
  const [modifier, setModifier] = useState<Modifier>('natural')

  // Which card is expanded (shows larger diagram + per-chord quality switcher)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  // Per-card quality override in the expanded view
  const [expandedQuality, setExpandedQuality] = useState<ChordQuality | 'natural'>('natural')

  // Reset expanded state when key / scale changes
  useEffect(() => {
    setExpandedIndex(null)
    setExpandedQuality('natural')
  }, [selectedKey, selectedScale])

  // Fetch diatonic chords
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    async function fetchChords() {
      try {
        const params = new URLSearchParams({ key: selectedKey, scale: selectedScale })
        const res = await fetch(`/api/music/chords?${params}`)
        const data = (await res.json()) as { chords?: ChordInfo[]; error?: string }
        if (cancelled) return
        if (!res.ok) {
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

  // ── Helpers ─────────────────────────────────────────────────────────────

  function resolveQuality(chord: ChordInfo, mod: Modifier): ChordQuality {
    if (mod === 'natural') return mapDiatonicQuality(chord.quality)
    return mod
  }

  function handleCardClick(index: number) {
    if (expandedIndex === index) {
      setExpandedIndex(null)
      setExpandedQuality('natural')
    } else {
      setExpandedIndex(index)
      setExpandedQuality('natural')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const pillBase =
    'px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand'
  const pillActive = 'bg-brand text-white'
  const pillInactive =
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Open Chords
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Diatonic chords in{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {selectedKey} {selectedScale}
            </span>
          </p>
        </div>
      </div>

      {/* Quality modifier pills */}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Quality modifier">
        {MODIFIER_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => {
              setModifier(pill.value)
              // Reset expanded quality when global modifier changes
              setExpandedQuality('natural')
            }}
            className={`${pillBase} ${modifier === pill.value ? pillActive : pillInactive}`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading chords…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* No chords (e.g. pentatonic) */}
      {!isLoading && !error && chords.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
            No diatonic chords available for this scale.
            <br />
            Try switching to Major or Minor.
          </p>
        </div>
      )}

      {/* Chord card row */}
      {!isLoading && !error && chords.length > 0 && (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {chords.map((chord, idx) => {
                const quality = resolveQuality(chord, modifier)
                const voicing = getChordVoicing(chord.root, quality)
                const symbol = buildChordSymbol(chord.root, quality)
                return (
                  <ChordDiagramCard
                    key={chord.root + idx}
                    voicing={voicing}
                    chordSymbol={symbol}
                    degreeLabel={chord.degreeLabel}
                    size="sm"
                    isSelected={expandedIndex === idx}
                    onClick={() => handleCardClick(idx)}
                  />
                )
              })}
            </div>
          </div>

          {/* Expanded chord detail */}
          {expandedIndex !== null && chords[expandedIndex] && (
            <ExpandedChordView
              chord={chords[expandedIndex]}
              globalModifier={modifier}
              quality={expandedQuality}
              onQualityChange={setExpandedQuality}
              onClose={() => { setExpandedIndex(null); setExpandedQuality('natural') }}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── Expanded chord detail panel ──────────────────────────────────────────────

interface ExpandedChordViewProps {
  chord: ChordInfo
  globalModifier: Modifier
  quality: ChordQuality | 'natural'
  onQualityChange: (q: ChordQuality | 'natural') => void
  onClose: () => void
}

function ExpandedChordView({
  chord,
  globalModifier,
  quality,
  onQualityChange,
  onClose,
}: ExpandedChordViewProps) {
  // Effective quality: local > global > diatonic
  const effectiveQuality: ChordQuality =
    quality !== 'natural'
      ? quality
      : globalModifier !== 'natural'
        ? globalModifier
        : mapDiatonicQuality(chord.quality)

  const voicing = getChordVoicing(chord.root, effectiveQuality)
  const symbol = buildChordSymbol(chord.root, effectiveQuality)

  const pillBase =
    'px-3 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand'
  const pillActive = 'bg-brand text-white'
  const pillInactive =
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'

  // Qualities to show in the expanded view (natural + all overrides)
  const expandedPills: { value: ChordQuality | 'natural'; label: string }[] = [
    { value: 'natural', label: `Natural (${qualityLabel(mapDiatonicQuality(chord.quality))})` },
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: '7', label: '7' },
    { value: 'maj7', label: 'Maj7' },
    { value: 'min7', label: 'Min7' },
    { value: 'sus2', label: 'Sus2' },
    { value: 'sus4', label: 'Sus4' },
  ]

  return (
    <div className="mt-4 rounded-lg border border-brand/30 bg-brand/5 dark:bg-brand/10 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {symbol}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {chord.degreeLabel} — {chord.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded focus:outline-none focus:ring-2 focus:ring-brand"
          aria-label="Close expanded view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Large diagram */}
        <div className="shrink-0">
          <ChordDiagramCard
            voicing={voicing}
            chordSymbol={symbol}
            degreeLabel={chord.degreeLabel}
            size="md"
          />
        </div>

        {/* Variation pills */}
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Variations
          </p>
          <div className="flex flex-wrap gap-2">
            {expandedPills.map((pill) => {
              const pillQuality: ChordQuality =
                pill.value === 'natural'
                  ? mapDiatonicQuality(chord.quality)
                  : pill.value
              const hasVoicing = getChordVoicing(chord.root, pillQuality) !== null
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => onQualityChange(pill.value)}
                  className={[
                    pillBase,
                    quality === pill.value ? pillActive : pillInactive,
                    !hasVoicing ? 'opacity-50' : '',
                  ].join(' ')}
                  title={!hasVoicing ? 'No open voicing available' : undefined}
                >
                  {pill.label}
                  {!hasVoicing && (
                    <span className="ml-1 opacity-70">–</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Chord notes */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {chord.notes.join('  ·  ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
