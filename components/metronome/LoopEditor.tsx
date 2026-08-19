'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MetronomeLoop } from '@/types/metronome-loop'
import type { AudioEngineId } from '@/lib/instrument'
import GuideNotesGrid from './GuideNotesGrid'
import TabEditor from './TabEditor'
import type { ImportedLoopData } from './GuitarProImportModal'

// alphaTab is heavy — only pull it in when the import modal is actually opened.
const GuitarProImportModal = dynamic(() => import('./GuitarProImportModal'), { ssr: false })

const MIN_BPM = 40
const MAX_BPM = 240
const BEATS_OPTIONS = [2, 3, 4, 5, 6, 7]
const BARS_OPTIONS = [1, 2, 3, 4, 6, 8]
const COUNT_IN_OPTIONS = [1, 2]
const NOTE_VALUES = [4, 8] as const

type EditorKind = 'tab' | 'grid'
const EDITOR_LS_KEY = 'mysongpal_guide_editor'

function loadEditorKind(): EditorKind {
  if (typeof window === 'undefined') return 'tab'
  return localStorage.getItem(EDITOR_LS_KEY) === 'grid' ? 'grid' : 'tab'
}

interface LoopEditorProps {
  initial: MetronomeLoop
  onSave: (loop: MetronomeLoop) => void
  onCancel: () => void
  engineId?: AudioEngineId
}

export default function LoopEditor({ initial, onSave, onCancel, engineId }: LoopEditorProps) {
  const [loop, setLoop] = useState<MetronomeLoop>(initial)
  const [bpmInput, setBpmInput] = useState(String(initial.targetBpm))
  const [editorKind, setEditorKind] = useState<EditorKind>(loadEditorKind)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(EDITOR_LS_KEY, editorKind) } catch { /* quota */ }
  }, [editorKind])

  function handleImport(data: ImportedLoopData) {
    patch({
      guideNotes: data.guideNotes,
      bars: data.bars,
      beatsPerBar: data.beatsPerBar,
      noteValue: data.noteValue,
    })
    setEditorKind('tab')
    setShowImport(false)
  }

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
    'rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:border-brand'

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
          className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:border-brand"
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
              className="w-16 text-center rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-900 dark:text-white px-2 py-1.5 text-sm outline-none focus:border-brand"
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
            {Array.from(new Set([...BARS_OPTIONS, loop.bars]))
              .sort((a, b) => a - b)
              .map((b) => <option key={b} value={b}>{b}</option>)}
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className={labelCls}>Guide Notes</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-xl">
              {editorKind === 'tab'
                ? 'Write a passage like guitar tab, then mute individual notes as you improve — leaving just a few guide notes behind.'
                : 'Each row is one note. Pick a grid resolution, then tap the cells to place notes on the exact beats.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Import from Guitar Pro */}
            <button
              type="button"
              onClick={() => setShowImport(true)}
              title="Import a Guitar Pro file as guide notes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M8 10V2M5 5l3-3 3 3" />
                <path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
              </svg>
              Import
            </button>

            {/* A/B editor switch */}
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditorKind('tab')}
                className={`px-3 py-1.5 transition-colors ${
                  editorKind === 'tab'
                    ? 'bg-brand text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Tab editor
              </button>
              <button
                type="button"
                onClick={() => setEditorKind('grid')}
                className={`px-3 py-1.5 transition-colors ${
                  editorKind === 'grid'
                    ? 'bg-brand text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {editorKind === 'tab' ? (
          <TabEditor
            bars={loop.bars}
            beatsPerBar={loop.beatsPerBar}
            guideNotes={loop.guideNotes}
            onChange={(notes) => patch({ guideNotes: notes })}
            engineId={engineId}
          />
        ) : (
          <GuideNotesGrid
            bars={loop.bars}
            beatsPerBar={loop.beatsPerBar}
            guideNotes={loop.guideNotes}
            onChange={(notes) => patch({ guideNotes: notes })}
          />
        )}
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

      {showImport && (
        <GuitarProImportModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  )
}
