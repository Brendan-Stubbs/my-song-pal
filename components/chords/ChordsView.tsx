'use client'

import { useState, useEffect } from 'react'
import type { ChordQuality } from '@/data/open-chord-voicings'
import {
  type SavedChord,
  loadChordBook,
  addChordToBook,
  removeChordFromBook,
} from '@/lib/chord-book-storage'
import {
  type MovableShape,
  type ShapeGeometry,
  loadMovableShapes,
  addMovableShape,
  removeMovableShape,
} from '@/lib/movable-shape-storage'
import ExploreTab from './ExploreTab'
import ChordBookTab from './ChordBookTab'
import PremiumGate, { PremiumBadge } from '@/components/premium/PremiumGate'
import { PREMIUM_FEATURES } from '@/types/subscription'
import ChordFormulasTab from '@/components/theory/ChordFormulasTab'

// ── Sub-tab type ──────────────────────────────────────────────────────────────

type SubTab = 'explore' | 'book' | 'formulas'

// ── Component ─────────────────────────────────────────────────────────────────

interface ChordsViewProps {
  isPremium: boolean
}

export default function ChordsView({ isPremium }: ChordsViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('explore')
  const [chordBook, setChordBook] = useState<SavedChord[]>([])
  const [shapes, setShapes] = useState<MovableShape[]>([])

  useEffect(() => {
    loadChordBook().then(setChordBook).catch(() => setChordBook([]))
    loadMovableShapes().then(setShapes).catch(() => setShapes([]))
  }, [])

  async function handleAdd(root: string, quality: ChordQuality) {
    const updated = await addChordToBook(chordBook, root, quality)
    setChordBook(updated)
  }

  async function handleRemove(id: string) {
    const updated = await removeChordFromBook(chordBook, id)
    setChordBook(updated)
  }

  async function handleAddShape(name: string, geometry: ShapeGeometry) {
    const updated = await addMovableShape(shapes, name, geometry)
    setShapes(updated)
  }

  async function handleRemoveShape(id: string) {
    const updated = await removeMovableShape(shapes, id)
    setShapes(updated)
  }

  const chordBookFeature = PREMIUM_FEATURES.find((f) => f.key === 'chord_book')!

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
        <button
          onClick={() => setSubTab('explore')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'explore'
              ? 'bg-surface text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Explore
        </button>

        <button
          onClick={() => setSubTab('book')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'book'
              ? 'bg-surface text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Chord Book
          {isPremium && chordBook.length > 0 ? (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              subTab === 'book'
                ? 'bg-brand text-white'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}>
              {chordBook.length}
            </span>
          ) : !isPremium ? (
            <PremiumBadge />
          ) : null}
        </button>

        <button
          onClick={() => setSubTab('formulas')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'formulas'
              ? 'bg-surface text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Formulas
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6">
        {subTab === 'explore' && (
          <ExploreTab
            chordBook={isPremium ? chordBook : []}
            onAdd={isPremium ? handleAdd : () => setSubTab('book')}
          />
        )}
        {subTab === 'book' && (
          <PremiumGate
            isPremium={isPremium}
            featureName={chordBookFeature.name}
            featureDescription={chordBookFeature.description}
          >
            <ChordBookTab
              chordBook={chordBook}
              shapes={shapes}
              onRemove={handleRemove}
              onGoExplore={() => setSubTab('explore')}
              onAddShape={handleAddShape}
              onRemoveShape={handleRemoveShape}
            />
          </PremiumGate>
        )}
        {subTab === 'formulas' && <ChordFormulasTab />}
      </div>
    </div>
  )
}
