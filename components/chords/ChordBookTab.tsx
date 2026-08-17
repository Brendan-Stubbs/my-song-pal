'use client'

import { useState } from 'react'
import { getChordVoicing } from '@/data/open-chord-voicings'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import type { SavedChord } from '@/lib/chord-book-storage'
import type { MovableShape, ShapeGeometry } from '@/lib/movable-shape-storage'
import MovableShapeCard from './MovableShapeCard'
import MovableShapeEditor from './MovableShapeEditor'
import { Button } from '@/components/ui/Button'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChordBookTabProps {
  chordBook: SavedChord[]
  shapes: MovableShape[]
  onRemove: (id: string) => void
  onGoExplore: () => void
  onAddShape: (name: string, geometry: ShapeGeometry) => void
  onRemoveShape: (id: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChordBookTab({
  chordBook,
  shapes,
  onRemove,
  onGoExplore,
  onAddShape,
  onRemoveShape,
}: ChordBookTabProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const isEmpty = chordBook.length === 0 && shapes.length === 0

  return (
    <div className="space-y-8">
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">Your chord book is empty</h3>
          <p className="text-sm text-ink-muted max-w-xs mb-6">
            Add open chords from the Explore tab, or build a movable shape you can slide up and down the neck.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={onGoExplore}>Explore chords</Button>
            <Button variant="secondary" onClick={() => setEditorOpen(true)}>New movable shape</Button>
          </div>
        </div>
      )}

      {/* Saved open chords */}
      {chordBook.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm text-ink-muted">
            {chordBook.length} chord{chordBook.length !== 1 ? 's' : ''} saved
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {chordBook.map((entry) => (
              <SavedChordCard
                key={entry.id}
                entry={entry}
                voicing={getChordVoicing(entry.root, entry.quality)}
                onRemove={onRemove}
              />
            ))}
          </div>
        </section>
      )}

      {/* Movable shapes */}
      {!isEmpty && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Movable shapes</h3>
              <p className="text-xs text-ink-muted mt-0.5">Relative grips you can slide to any position.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditorOpen(true)}>
              + New shape
            </Button>
          </div>
          {shapes.length === 0 ? (
            <p className="text-sm text-ink-muted">No movable shapes yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {shapes.map((shape) => (
                <MovableShapeCard key={shape.id} shape={shape} onRemove={onRemoveShape} />
              ))}
            </div>
          )}
        </section>
      )}

      {editorOpen && (
        <MovableShapeEditor
          onClose={() => setEditorOpen(false)}
          onSave={onAddShape}
        />
      )}
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
      <ChordDiagramCard voicing={voicing} chordSymbol={entry.symbol} size="sm" />
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
