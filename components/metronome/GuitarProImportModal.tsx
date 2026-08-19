'use client'

import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { NoteDuration, GuideNote } from '@/types/metronome-loop'
import { getTuning, TUNINGS, type Tuning } from '@/lib/guitar-tuning'
import {
  parseGuitarProBytes,
  convertToGuideNotes,
  type ParsedGpFile,
  type ConvertResult,
} from '@/lib/guitarpro-import'
import TabStaff from './TabStaff'

const RESOLUTION_OPTIONS: { id: NoteDuration; label: string }[] = [
  { id: 'quarter',   label: '¼'    },
  { id: 'eighth',    label: '⅛'    },
  { id: 'sixteenth', label: '¹⁄₁₆' },
  { id: 'triplet',   label: '⅓'    },
]

const ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.gpif'
const MAX_PREVIEW_BARS = 8

export interface ImportedLoopData {
  guideNotes: GuideNote[]
  bars: number
  beatsPerBar: number
  noteValue: 4 | 8
}

interface GuitarProImportModalProps {
  onClose: () => void
  onImport: (data: ImportedLoopData) => void
}

/** Find one of our tuning presets matching the alphaTab staff tuning (high→low). */
function detectTuning(staffTuningHighToLow: number[] | undefined): Tuning {
  if (!staffTuningHighToLow || staffTuningHighToLow.length !== 6) return getTuning('standard')
  const lowToHigh = [...staffTuningHighToLow].reverse()
  const match = TUNINGS.find((t) => t.midi.every((m, i) => m === lowToHigh[i]))
  return match ?? getTuning('standard')
}

export default function GuitarProImportModal({ onClose, onImport }: GuitarProImportModalProps) {
  const [parsed, setParsed] = useState<ParsedGpFile | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [trackIndex, setTrackIndex] = useState(0)
  const [startBar, setStartBar] = useState(1)
  const [endBar, setEndBar] = useState(4)
  const [resolution, setResolution] = useState<NoteDuration>('sixteenth')

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const result = parseGuitarProBytes(new Uint8Array(buf))
      setParsed(result)
      setFileName(file.name)
      // Default to the first track that looks like a 6-string guitar.
      const guitarTrack =
        result.info.tracks.find((t) => t.stringCount === 6) ?? result.info.tracks[0]
      setTrackIndex(guitarTrack?.index ?? 0)
      setStartBar(1)
      setEndBar(Math.min(result.info.bars.length, 4))
    } catch {
      setError('Could not read that file. Make sure it is a Guitar Pro file (.gp, .gp3–.gp5, .gpx).')
      setParsed(null)
    } finally {
      setLoading(false)
    }
  }

  const barCount = parsed?.info.bars.length ?? 0
  const safeStart = Math.max(1, Math.min(startBar, barCount || 1))
  const safeEnd = Math.max(safeStart, Math.min(endBar, barCount || 1))

  const converted: ConvertResult | null = useMemo(() => {
    if (!parsed) return null
    return convertToGuideNotes(parsed.score, {
      trackIndex,
      startBar: safeStart,
      endBar: safeEnd,
      resolution,
    })
  }, [parsed, trackIndex, safeStart, safeEnd, resolution])

  const previewTuning = useMemo(() => {
    if (!parsed) return getTuning('standard')
    const staff = parsed.score.tracks[trackIndex]?.staves[0]
    return detectTuning(staff?.tuning)
  }, [parsed, trackIndex])

  const previewBars = Math.min(converted?.bars ?? 0, MAX_PREVIEW_BARS)

  function handleImport() {
    if (!converted || converted.guideNotes.length === 0) return
    onImport({
      guideNotes: converted.guideNotes,
      bars: converted.bars,
      beatsPerBar: converted.beatsPerBar,
      noteValue: converted.noteValue,
    })
  }

  const labelCls = 'text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500'

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Guitar Pro file</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-lg">
              Pick a track and a range of bars. Rhythms are snapped to the chosen grid; slides, bends and other
              articulations are dropped — you get clean guide notes you can then mute down for practice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* File picker */}
        {!parsed && (
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-brand py-10 flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 16V4M6 10l6-6 6 6" />
                <path d="M4 20h16" />
              </svg>
              <span className="text-sm font-semibold">{loading ? 'Reading file…' : 'Choose a Guitar Pro file'}</span>
              <span className="text-xs">.gp · .gp3 · .gp4 · .gp5 · .gpx</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </div>
        )}

        {/* Configure + preview */}
        {parsed && converted && (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-200">{parsed.info.title}</span>
                <span className="text-gray-400"> · {fileName}</span>
              </span>
              <button
                type="button"
                onClick={() => { setParsed(null); setError(null) }}
                className="text-brand hover:underline shrink-0"
              >
                Choose a different file
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4">
              <label className="space-y-1">
                <span className={labelCls}>Track</span>
                <select
                  value={trackIndex}
                  onChange={(e) => setTrackIndex(Number(e.target.value))}
                  className="block text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-surface text-gray-800 dark:text-gray-200 max-w-[240px]"
                >
                  {parsed.info.tracks.map((t) => (
                    <option key={t.index} value={t.index}>
                      {t.name} ({t.stringCount}-string)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className={labelCls}>From bar</span>
                <input
                  type="number"
                  min={1}
                  max={barCount}
                  value={safeStart}
                  onChange={(e) => setStartBar(Number(e.target.value))}
                  className="block w-20 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-surface text-gray-800 dark:text-gray-200"
                />
              </label>

              <label className="space-y-1">
                <span className={labelCls}>To bar</span>
                <input
                  type="number"
                  min={safeStart}
                  max={barCount}
                  value={safeEnd}
                  onChange={(e) => setEndBar(Number(e.target.value))}
                  className="block w-20 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-surface text-gray-800 dark:text-gray-200"
                />
                <span className="block text-[10px] text-gray-400">of {barCount}</span>
              </label>

              <div className="space-y-1">
                <span className={labelCls}>Snap to</span>
                <div className="flex gap-1">
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setResolution(opt.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        resolution === opt.id
                          ? 'bg-brand text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={labelCls}>Preview {previewBars < (converted.bars ?? 0) ? `(first ${previewBars} of ${converted.bars} bars)` : ''}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {converted.guideNotes.length} note{converted.guideNotes.length === 1 ? '' : 's'} · {converted.beatsPerBar}/{converted.noteValue}
                </span>
              </div>
              {converted.guideNotes.length > 0 ? (
                <TabStaff
                  bars={previewBars}
                  beatsPerBar={converted.beatsPerBar}
                  resolution={resolution}
                  guideNotes={converted.guideNotes}
                  tuning={previewTuning}
                  compact
                />
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
                  No notes found in this range for the selected track.
                </p>
              )}
            </div>

            {/* Warnings */}
            {(converted.quantised || converted.droppedStrings > 0) && (
              <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                {converted.quantised && <p>• Some notes were snapped to the {RESOLUTION_OPTIONS.find((r) => r.id === resolution)?.label} grid.</p>}
                {converted.droppedStrings > 0 && <p>• {converted.droppedStrings} note(s) on strings outside 1–6 were skipped.</p>}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-sm">
                Importing replaces the current guide notes and sets the loop to {converted.bars} bar{converted.bars === 1 ? '' : 's'} of {converted.beatsPerBar}/{converted.noteValue}.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={converted.guideNotes.length === 0}
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Import {converted.guideNotes.length} note{converted.guideNotes.length === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
