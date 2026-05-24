'use client'

import { useState } from 'react'
import ChordFormulasTab from './ChordFormulasTab'

// ── Sub-tab registry — add future theory sections here ────────────────────────

type SubTab = 'chords'

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'chords', label: 'Chord Formulas' },
  // Coming soon:
  // { id: 'intervals', label: 'Intervals' },
  // { id: 'scales',    label: 'Scale Formulas' },
  // { id: 'circle',   label: 'Circle of Fifths' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function TheoryView() {
  const [subTab, setSubTab] = useState<SubTab>('chords')

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Theory</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Music theory reference — chords, intervals, scales, and more
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-6">
        {subTab === 'chords' && <ChordFormulasTab />}
      </div>
    </div>
  )
}
