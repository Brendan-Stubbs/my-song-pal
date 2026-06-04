'use client'

import { useState } from 'react'
import {
  CHORD_FORMULAS,
  CATEGORIES,
  type ChordFormula,
  type ChordFormulaCategory,
} from '@/data/chord-formulas'

// ── Degree pill colours ───────────────────────────────────────────────────────

/** Returns Tailwind bg/text classes for a scale degree label. */
function degreeStyle(degree: string): string {
  if (degree === '1') return 'bg-brand text-white'                              // root
  if (degree.startsWith('♭') || degree.startsWith('#'))
    return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' // altered
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'        // natural
}

// ── Formula card ─────────────────────────────────────────────────────────────

function FormulaCard({ formula }: { formula: ChordFormula }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden transition-shadow hover:shadow-md">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Chord name + symbol */}
          <div className="min-w-0">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              {formula.name}
            </span>
            {formula.symbol && (
              <span className="ml-1.5 text-xs font-mono font-semibold text-brand">
                {formula.symbol}
              </span>
            )}
          </div>

          {/* Degree pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {formula.degrees.map((deg, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold leading-none ${degreeStyle(deg)}`}
              >
                {deg}
              </span>
            ))}
          </div>
        </div>

        {/* Example notes + chevron */}
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
            {formula.exampleNotes.map((note, i) => (
              <span key={i}>
                {i > 0 && <span className="text-gray-300 dark:text-gray-600 mx-0.5">·</span>}
                {note}
              </span>
            ))}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="2,4 7,10 12,4" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {formula.description}
          </p>

          {/* Interval table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-left">
                  <th className="pb-1.5 pr-4 font-semibold">Degree</th>
                  <th className="pb-1.5 pr-4 font-semibold">Interval</th>
                  <th className="pb-1.5 font-semibold">Abbr.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {formula.degrees.map((deg, i) => (
                  <tr key={i} className={i === 0 ? 'font-semibold' : ''}>
                    <td className="py-1.5 pr-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold leading-none ${degreeStyle(deg)}`}>
                        {deg}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">
                      {formula.intervals[i]}
                    </td>
                    <td className="py-1.5 font-mono text-gray-500 dark:text-gray-400">
                      {formula.intervalAbbr[i]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Semitone distance visualiser */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Semitone distances
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {formula.semitones.map((st, i) => {
                const gap = i === 0 ? null : st - formula.semitones[i - 1]
                return (
                  <div key={i} className="flex items-center gap-2">
                    {gap !== null && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />
                        <span className="font-mono">{gap}</span>
                        <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />
                      </div>
                    )}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-brand text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}>
                      {formula.exampleNotes[i].replace('♭', '♭').replace('♯', '♯')}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChordFormulasTab() {
  const [activeCategory, setActiveCategory] = useState<ChordFormulaCategory | 'All'>('All')

  const filtered = activeCategory === 'All'
    ? CHORD_FORMULAS
    : CHORD_FORMULAS.filter((f) => f.category === activeCategory)

  const pillBase = 'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none'
  const pillActive = 'bg-brand text-white'
  const pillInactive = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chord Formulas</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          How chords are built from intervals. Click any chord to see the full breakdown.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chord category filter">
        <button
          type="button"
          onClick={() => setActiveCategory('All')}
          className={`${pillBase} ${activeCategory === 'All' ? pillActive : pillInactive}`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`${pillBase} ${activeCategory === cat ? pillActive : pillInactive}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Formula list — grouped by category when showing All */}
      {activeCategory === 'All' ? (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const group = CHORD_FORMULAS.filter((f) => f.category === cat)
            if (group.length === 0) return null
            return (
              <div key={cat}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
                  {cat}
                </h4>
                <div className="space-y-2">
                  {group.map((formula) => (
                    <FormulaCard key={formula.name} formula={formula} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((formula) => (
            <FormulaCard key={formula.name} formula={formula} />
          ))}
        </div>
      )}
    </div>
  )
}
