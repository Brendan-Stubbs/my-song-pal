'use client'

import { useState } from 'react'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import { shapeToVoicing, shapeSpan, type MovableShape } from '@/lib/movable-shape-storage'

const MIN_BASE = 1
const MAX_BASE = 12

interface Props {
  shape: MovableShape
  onRemove: (id: string) => void
}

export default function MovableShapeCard({ shape, onRemove }: Props) {
  const maxBase = Math.max(MIN_BASE, MAX_BASE - shapeSpan(shape))
  const [base, setBase] = useState(3)
  const clampedBase = Math.min(base, maxBase)

  return (
    <div className="relative group flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-3">
      <button
        onClick={() => onRemove(shape.id)}
        aria-label={`Remove ${shape.name}`}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink-muted hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l6 6M7 1L1 7" />
        </svg>
      </button>

      <span className="text-sm font-semibold text-ink text-center leading-tight">{shape.name}</span>
      <ChordDiagramCard voicing={shapeToVoicing(shape, clampedBase)} chordSymbol="" size="md" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setBase((b) => Math.max(MIN_BASE, Math.min(maxBase, b) - 1))}
          disabled={clampedBase <= MIN_BASE}
          aria-label="Move down the neck"
          className="w-6 h-6 rounded-md border border-line text-ink-muted hover:text-brand hover:border-brand disabled:opacity-30 transition-colors flex items-center justify-center text-sm leading-none"
        >
          −
        </button>
        <span className="text-xs text-ink-muted tabular-nums w-14 text-center">fret {clampedBase}</span>
        <button
          onClick={() => setBase((b) => Math.min(maxBase, Math.min(maxBase, b) + 1))}
          disabled={clampedBase >= maxBase}
          aria-label="Move up the neck"
          className="w-6 h-6 rounded-md border border-line text-ink-muted hover:text-brand hover:border-brand disabled:opacity-30 transition-colors flex items-center justify-center text-sm leading-none"
        >
          +
        </button>
      </div>
    </div>
  )
}
