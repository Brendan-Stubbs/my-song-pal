'use client'

import { getChordVoicing } from '@/data/open-chord-voicings'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import type { SavedChord } from '@/lib/chord-book-storage'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChordBookTabProps {
  chordBook: SavedChord[]
  onRemove: (id: string) => void
  onGoExplore: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChordBookTab({ chordBook, onRemove, onGoExplore }: ChordBookTabProps) {
  if (chordBook.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
          Your chord book is empty
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
          Browse the Explore tab and hover over any chord to add it to your repertoire.
        </p>
        <button
          onClick={onGoExplore}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
            <rect x="5.5" y="0" width="2" height="13" rx="1" />
            <rect x="0" y="5.5" width="13" height="2" rx="1" />
          </svg>
          Explore chords
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {chordBook.length} chord{chordBook.length !== 1 ? 's' : ''} saved
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {chordBook.map((entry) => {
          const voicing = getChordVoicing(entry.root, entry.quality)
          return (
            <SavedChordCard
              key={entry.id}
              entry={entry}
              voicing={voicing}
              onRemove={onRemove}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Saved chord card ──────────────────────────────────────────────────────────

interface SavedChordCardProps {
  entry: SavedChord
  voicing: ReturnType<typeof getChordVoicing>
  onRemove: (id: string) => void
}

function SavedChordCard({ entry, voicing, onRemove }: SavedChordCardProps) {
  return (
    <div className="relative group">
      <ChordDiagramCard
        voicing={voicing}
        chordSymbol={entry.symbol}
        size="sm"
      />

      {/* Remove button — appears on hover */}
      <button
        onClick={() => onRemove(entry.id)}
        aria-label={`Remove ${entry.symbol} from chord book`}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 hover:bg-red-500 dark:hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l6 6M7 1L1 7" />
        </svg>
      </button>
    </div>
  )
}
