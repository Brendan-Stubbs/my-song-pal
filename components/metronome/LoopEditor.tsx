'use client'

import { useState } from 'react'
import type { MetronomeLoop } from '@/types/metronome-loop'
import GuideNotesGrid from './GuideNotesGrid'

const MIN_BPM = 40
const MAX_BPM = 240
const BEATS_OPTIONS = [2, 3, 4, 5, 6, 7]
const BARS_OPTIONS = [1, 2, 3, 4, 6, 8]
const COUNT_IN_OPTIONS = [1, 2]
const NOTE_VALUES = [4, 8] as const

interface LoopEditorProps {
  initial: MetronomeLoop
  onSave: (loop: MetronomeLoop) => void
  onCancel: () => void
}

export default function LoopEditor({ initial, onSave, onCancel }: LoopEditorProps) {
  const [loop, setLoop] = useState<MetronomeLoop>(initial)
  const [bpmInput, setBpmInput] = useState(String(initial.targetBpm))

  function patch(partial: Partial<MetronomeLoop>) {
    setLoop((prev) => ({ ...prev, ...partial, updatedAt: Date.now() }))
  }

  function commitBpm() {
    const n = parseInt(bpmInput, 10)
    if (!isNaN(n)) {
      const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, n))
      patch({ targetBpm: clamped })
      setBpmInput(String(clamped))
    } else {
      setBpmInput(String(loop.targetBpm))
    }
  }

  const labelCls = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
  const selectCls =
    'rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:border-brand'

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="loop-name" className={labelCls}>Name</label>
        <input
          id="loop-name"
          type="text"
          value={loop.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. C# minor warmup"
          className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      {/* Configuration row */}
      <div className="flex flex-wrap gap-5">
        {/* Target BPM */}
        <div className="space-y-1.5">
          <span className={labelCls}>Target BPM</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const v = Math.max(MIN_BPM, loop.targetBpm - 1)
                patch({ targetBpm: v })
                setBpmInput(String(v))
              }}
              className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-base leading-none select-none"
            >−</button>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => { if (e.key === 'Enter') commitBpm() }}
              className="w-16 text-center rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:border-brand"
              aria-label="Target BPM"
            />
            <button
              onClick={() => {
                const v = Math.min(MAX_BPM, loop.targetBpm + 1)
                patch({ targetBpm: v })
                setBpmInput(String(v))
              }}
              className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:border-brand hover:text-brand transition-colors text-base leading-none select-none"
            >+</button>
          </div>
        </div>

        {/* Time signature */}
        <div className="space-y-1.5">
          <span className={labelCls}>Time Signature</span>
          <div className="flex items-center gap-1.5">
            <select
              value={loop.beatsPerBar}
              onChange={(e) => patch({ beatsPerBar: Number(e.target.value) })}
              className={`w-14 text-center ${selectCls}`}
              aria-label="Beats per bar"
            >
              {BEATS_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="text-gray-400 dark:text-gray-500 font-bold">/</span>
            <select
              value={loop.noteValue}
              onChange={(e) => patch({ noteValue: Number(e.target.value) as 4 | 8 })}
              className={`w-14 text-center ${selectCls}`}
              aria-label="Note value"
            >
              {NOTE_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-1.5">
          <label htmlFor="loop-bars" className={labelCls}>Bars</label>
          <select
            id="loop-bars"
            value={loop.bars}
            onChange={(e) => patch({ bars: Number(e.target.value) })}
            className={`w-20 ${selectCls}`}
          >
            {BARS_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Count-in bars */}
        <div className="space-y-1.5">
          <label htmlFor="loop-count-in" className={labelCls}>Count-in bars</label>
          <select
            id="loop-count-in"
            value={loop.countInBars}
            onChange={(e) => patch({ countInBars: Number(e.target.value) })}
            className={`w-20 ${selectCls}`}
          >
            {COUNT_IN_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Guide notes */}
      <div className="space-y-2">
        <div>
          <p className={labelCls}>Guide Notes</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Each row is one note — click the note name to pick its pitch on the fretboard.
            Pick a grid resolution, then tap the cells to place notes on the exact beats. Bold lines separate bars.
          </p>
        </div>
        <GuideNotesGrid
          bars={loop.bars}
          beatsPerBar={loop.beatsPerBar}
          guideNotes={loop.guideNotes}
          onChange={(notes) => patch({ guideNotes: notes })}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onSave({ ...loop, updatedAt: Date.now() })}
          className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
        >
          Save loop
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
