'use client'

import type { MetronomeLoop } from '@/types/metronome-loop'

interface LoopListProps {
  loops: MetronomeLoop[]
  selectedId: string | null
  onSelect: (loop: MetronomeLoop) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function LoopList({
  loops,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
}: LoopListProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onCreate}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 1v10M1 6h10" />
        </svg>
        New loop
      </button>

      {loops.length === 0 && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-2 py-3">
          No loops yet. Create one above.
        </p>
      )}

      {loops.map((loop) => {
        const isSelected = loop.id === selectedId
        return (
          <div
            key={loop.id}
            className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              isSelected
                ? 'border-brand bg-brand/10 dark:bg-brand/10'
                : 'border-gray-200 dark:border-gray-600 hover:border-brand bg-white dark:bg-gray-800'
            }`}
            onClick={() => onSelect(loop)}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                {loop.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {loop.bars} bar{loop.bars !== 1 ? 's' : ''} · {loop.beatsPerBar}/{loop.noteValue} · {loop.targetBpm} BPM
                {loop.guideNotes.length > 0 && (
                  <span className="ml-1.5 text-brand">
                    · {loop.guideNotes.length} guide note{loop.guideNotes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(loop.id)
              }}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
              aria-label={`Delete "${loop.name}"`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
