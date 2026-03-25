'use client'

import { useState, useEffect } from 'react'
import type { ChordQuality } from '@/data/open-chord-voicings'
import {
  type SavedChord,
  loadChordBook,
  saveChordBook,
  addChord,
  removeChord,
} from '@/lib/chord-book-storage'
import ExploreTab from './ExploreTab'
import ChordBookTab from './ChordBookTab'

// ── Sub-tab type ──────────────────────────────────────────────────────────────

type SubTab = 'explore' | 'book'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'book',    label: 'Chord Book' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChordsView() {
  const [subTab, setSubTab] = useState<SubTab>('explore')
  const [chordBook, setChordBook] = useState<SavedChord[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setChordBook(loadChordBook())
  }, [])

  // Persist on every change
  function updateChordBook(next: SavedChord[]) {
    setChordBook(next)
    saveChordBook(next)
  }

  function handleAdd(root: string, quality: ChordQuality) {
    updateChordBook(addChord(chordBook, root, quality))
  }

  function handleRemove(id: string) {
    updateChordBook(removeChord(chordBook, id))
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chords</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Explore open chord voicings and build your repertoire
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-1 inline-flex gap-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              subTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.id === 'book' && chordBook.length > 0 && (
              <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                subTab === 'book'
                  ? 'bg-brand text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                {chordBook.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6">
        {subTab === 'explore' ? (
          <ExploreTab
            chordBook={chordBook}
            onAdd={handleAdd}
          />
        ) : (
          <ChordBookTab
            chordBook={chordBook}
            onRemove={handleRemove}
            onGoExplore={() => setSubTab('explore')}
          />
        )}
      </div>
    </div>
  )
}
