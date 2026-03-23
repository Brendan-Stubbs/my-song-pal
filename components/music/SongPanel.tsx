'use client'

import { useState, useEffect, useRef } from 'react'
import type { ProgressionSection } from '@/types/music'
import { QUALITY_STYLES } from './ChordProgressionsPanel'
import ChordHoverTooltip from './ChordHoverTooltip'
import {
  getAvailableVariants,
  getVariantSymbol,
  VARIANT_LABELS,
  BASE_LABELS,
} from '@/lib/chord-variants'
import type { ChordVariant } from '@/lib/chord-variants'

export interface SongPanelProps {
  sections: ProgressionSection[]
  activeSectionId: string
  selectedKey: string
  selectedScale: string
  onSetActiveSection: (id: string) => void
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onRenameSection: (id: string, name: string) => void
  onRemoveChord: (sectionId: string, chordIndex: number) => void
  onClearSection: (sectionId: string) => void
  onChangeChordVariant: (sectionId: string, chordIndex: number, variant: ChordVariant | null) => void
}

export default function SongPanel({
  sections,
  activeSectionId,
  selectedKey,
  selectedScale,
  onSetActiveSection,
  onAddSection,
  onRemoveSection,
  onRenameSection,
  onRemoveChord,
  onClearSection,
  onChangeChordVariant,
}: SongPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [variantPicker, setVariantPicker] = useState<{ sectionId: string; chordIndex: number } | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close the variant picker on any click outside it
  useEffect(() => {
    if (!variantPicker) return
    function handleMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setVariantPicker(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [variantPicker])

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  function commitRename() {
    if (editingId && editingName.trim()) {
      onRenameSection(editingId, editingName.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Song
        </h2>
        <button
          onClick={onAddSection}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-brand text-brand hover:bg-brand hover:text-white transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Add section
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4">
          Click "Add section" to start building your song.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId
            return (
              <div
                key={section.id}
                onClick={() => onSetActiveSection(section.id)}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  isActive
                    ? 'border-brand bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {editingId === section.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="text-sm font-semibold bg-transparent border-b border-brand outline-none text-gray-900 dark:text-white w-32"
                      />
                    ) : (
                      <button
                        onClick={() => startRename(section.id, section.name)}
                        className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-brand dark:hover:text-brand transition-colors"
                        title="Click to rename"
                      >
                        {section.name}
                      </button>
                    )}
                    {isActive && (
                      <span className="text-xs text-brand font-medium px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30">
                        active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {section.chords.length > 0 && (
                      <button
                        onClick={() => onClearSection(section.id)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    {sections.length > 1 && (
                      <button
                        onClick={() => onRemoveSection(section.id)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        aria-label={`Delete ${section.name}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Chords */}
                {section.chords.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    {isActive
                      ? 'Click chords or a preset above to add to this section.'
                      : 'Empty — click to make active, then add chords.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    {section.chords.map((chord, i) => {
                      const isPickerOpen =
                        variantPicker?.sectionId === section.id && variantPicker?.chordIndex === i
                      const displaySymbol = getVariantSymbol(chord)
                      const availableVariants = isPickerOpen
                        ? getAvailableVariants(chord, selectedKey, selectedScale)
                        : []

                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          {i > 0 && (
                            <span className="text-gray-300 dark:text-gray-600 select-none">–</span>
                          )}

                          {/* Chord chip + variant picker anchored together */}
                          <div
                            ref={isPickerOpen ? pickerRef : undefined}
                            className="relative"
                          >
                            <ChordHoverTooltip chord={chord}>
                              <div
                                className={`relative group flex flex-col items-center px-4 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                                  QUALITY_STYLES[chord.quality]
                                } ${isPickerOpen ? 'ring-2 ring-brand ring-offset-1' : ''}`}
                                onClick={() =>
                                  setVariantPicker(
                                    isPickerOpen ? null : { sectionId: section.id, chordIndex: i },
                                  )
                                }
                              >
                                <span className="text-xs font-medium opacity-60">{chord.degreeLabel}</span>
                                <span className="text-lg font-bold leading-tight">{displaySymbol}</span>
                                {chord.variant && (
                                  <span className="text-xs opacity-50 leading-tight">
                                    {VARIANT_LABELS[chord.variant as ChordVariant] ?? chord.variant}
                                  </span>
                                )}
                                {/* Remove button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVariantPicker(null)
                                    onRemoveChord(section.id, i)
                                  }}
                                  aria-label={`Remove ${displaySymbol}`}
                                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 hover:bg-red-500 dark:hover:bg-red-500 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  ×
                                </button>
                              </div>
                            </ChordHoverTooltip>

                            {/* Variant picker popover */}
                            {isPickerOpen && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-3 min-w-[10rem]">
                                {/* Small arrow */}
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-600 rotate-45" />

                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                  Chord variant
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                  {/* Base triad button */}
                                  <button
                                    onClick={() => {
                                      onChangeChordVariant(section.id, i, null)
                                      setVariantPicker(null)
                                    }}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                                      !chord.variant
                                        ? 'bg-brand text-white border-brand'
                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand'
                                    }`}
                                  >
                                    {BASE_LABELS[chord.quality]}
                                  </button>

                                  {/* In-key variant buttons */}
                                  {availableVariants.map((v) => (
                                    <button
                                      key={v}
                                      onClick={() => {
                                        onChangeChordVariant(section.id, i, v)
                                        setVariantPicker(null)
                                      }}
                                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                                        chord.variant === v
                                          ? 'bg-brand text-white border-brand'
                                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand dark:hover:border-brand dark:hover:text-brand'
                                      }`}
                                    >
                                      {VARIANT_LABELS[v]}
                                    </button>
                                  ))}

                                  {/* Edge case: no variants available in this key */}
                                  {availableVariants.length === 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-0.5">
                                      No other variants in this key
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
