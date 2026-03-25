'use client'

import { useState } from 'react'
import {
  type ChordQuality,
  getChordVoicing,
  buildChordSymbol,
} from '@/data/open-chord-voicings'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import type { SavedChord } from '@/lib/chord-book-storage'
import { isInBook } from '@/lib/chord-book-storage'

// ── Constants ─────────────────────────────────────────────────────────────────

// All 12 chromatic roots in sharp notation (matching voicings data keys)
const ALL_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Friendly enharmonic display names
const ROOT_DISPLAY: Record<string, string> = {
  'C#': 'C♯', 'D#': 'D♯', 'F#': 'F♯', 'G#': 'G♯', 'A#': 'A♯',
}
function displayRoot(root: string) { return ROOT_DISPLAY[root] ?? root }

const QUALITY_PILLS: { value: ChordQuality; label: string }[] = [
  { value: 'major',  label: 'Major'  },
  { value: 'minor',  label: 'Minor'  },
  { value: '7',      label: '7th'    },
  { value: 'maj7',   label: 'Maj 7'  },
  { value: 'min7',   label: 'Min 7'  },
  { value: 'sus2',   label: 'Sus 2'  },
  { value: 'sus4',   label: 'Sus 4'  },
  { value: 'dim',    label: 'Dim'    },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExploreTabProps {
  chordBook: SavedChord[]
  onAdd: (root: string, quality: ChordQuality) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExploreTab({ chordBook, onAdd }: ExploreTabProps) {
  const [quality, setQuality] = useState<ChordQuality>('major')

  const pillBase =
    'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand'
  const pillActive = 'bg-brand text-white'
  const pillInactive =
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Open Chords</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          First-position open voicings for all 12 roots
        </p>
      </div>

      {/* Quality pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chord quality">
        {QUALITY_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setQuality(pill.value)}
            className={`${pillBase} ${quality === pill.value ? pillActive : pillInactive}`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Chord grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {ALL_ROOTS.map((root) => {
          const voicing = getChordVoicing(root, quality)
          const symbol = buildChordSymbol(root, quality)
          const saved = isInBook(chordBook, root, quality)

          return (
            <ChordExploreCard
              key={root}
              root={root}
              quality={quality}
              voicing={voicing}
              symbol={symbol}
              saved={saved}
              onAdd={onAdd}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Individual explore card (chord diagram + hover overlay) ───────────────────

interface ChordExploreCardProps {
  root: string
  quality: ChordQuality
  voicing: ReturnType<typeof getChordVoicing>
  symbol: string
  saved: boolean
  onAdd: (root: string, quality: ChordQuality) => void
}

function ChordExploreCard({ root, quality, voicing, symbol, saved, onAdd }: ChordExploreCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The chord diagram card (not clickable here — hover overlay handles interaction) */}
      <ChordDiagramCard
        voicing={voicing}
        chordSymbol={symbol}
        size="sm"
      />

      {/* Hover overlay */}
      {hovered && (
        <div className="absolute inset-0 rounded-lg flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] z-10 transition-opacity">
          <span className="text-white font-bold text-base mb-2">
            {displayRoot(root)}{quality !== 'major' ? <span className="font-normal text-orange-200 ml-0.5">{symbol.replace(root, '')}</span> : ''}
          </span>
          {voicing ? (
            saved ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-semibold">
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1,4.5 4,7.5 10,1" />
                </svg>
                In chord book
              </span>
            ) : (
              <button
                onClick={() => onAdd(root, quality)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand hover:bg-brand/90 text-white text-xs font-semibold transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                  <rect x="4.5" y="0" width="2" height="11" rx="1" />
                  <rect x="0" y="4.5" width="11" height="2" rx="1" />
                </svg>
                Add to book
              </button>
            )
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-gray-600/80 text-gray-300 text-xs">
              No open voicing
            </span>
          )}
        </div>
      )}
    </div>
  )
}
