'use client'

import { useState } from 'react'
import type { ProgressionSection } from '@/types/music'
import { QUALITY_STYLES } from './ChordProgressionsPanel'

export interface SongPanelProps {
  sections: ProgressionSection[]
  activeSectionId: string
  onSetActiveSection: (id: string) => void
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onRenameSection: (id: string, name: string) => void
  onRemoveChord: (sectionId: string, chordIndex: number) => void
  onClearSection: (sectionId: string) => void
}

export default function SongPanel({
  sections,
  activeSectionId,
  onSetActiveSection,
  onAddSection,
  onRemoveSection,
  onRenameSection,
  onRemoveChord,
  onClearSection,
}: SongPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
                    {section.chords.map((chord, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {i > 0 && (
                          <span className="text-gray-300 dark:text-gray-600 select-none">–</span>
                        )}
                        <div className={`relative group flex flex-col items-center px-4 py-2 rounded-lg border ${QUALITY_STYLES[chord.quality]}`}>
                          <span className="text-xs font-medium opacity-60">{chord.degreeLabel}</span>
                          <span className="text-lg font-bold leading-tight">{chord.symbol}</span>
                          <button
                            onClick={() => onRemoveChord(section.id, i)}
                            aria-label={`Remove ${chord.symbol}`}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 hover:bg-red-500 dark:hover:bg-red-500 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
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
