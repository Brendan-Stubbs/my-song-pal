'use client'

import { useEffect, useState, useCallback } from 'react'
import type { GuideNote, NoteDuration } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'
import FretboardNotePicker, { type FretPick } from './FretboardNotePicker'

// ── Constants ──────────────────────────────────────────────────────────────

const RESOLUTION_OPTIONS: { id: NoteDuration; label: string; title: string }[] = [
  { id: 'quarter',   label: '¼',    title: 'Quarter notes — one tap per beat'        },
  { id: 'eighth',    label: '⅛',    title: 'Eighth notes — the beat and the "and"'   },
  { id: 'sixteenth', label: '¹⁄₁₆', title: 'Sixteenth notes — 1 e + a'               },
  { id: 'triplet',   label: '⅓',    title: 'Triplets — three even notes per beat'    },
]

// Column labels for the sub-beats inside a single beat, per resolution.
const SUB_LABELS: Record<NoteDuration, string[]> = {
  quarter:   [''],
  eighth:    ['', '+'],
  sixteenth: ['', 'e', '+', 'a'],
  triplet:   ['', 'la', 'li'],
}

const SUB_TITLES: Record<NoteDuration, string[]> = {
  quarter:   ['on the beat'],
  eighth:    ['on the beat', 'the "and"'],
  sixteenth: ['on the beat', '"e"', 'the "and"', '"a"'],
  triplet:   ['1st triplet', '2nd triplet', '3rd triplet'],
}

// Cell geometry (px)
const CELL = 26
const SUB_GAP = 3
const BEAT_GAP = 10
const BAR_GAP = 8
const BAR_PAD = 4

// ── Row model ──────────────────────────────────────────────────────────────

interface StepRow {
  id: string
  note: string
  guitarString?: number
  fret?: number
}

function initRows(notes: GuideNote[]): StepRow[] {
  const seen = new Map<string, Omit<StepRow, 'id'>>()
  for (const gn of notes) {
    const rid = gn.rowId ?? gn.id
    if (!seen.has(rid)) {
      seen.set(rid, { note: gn.note, guitarString: gn.guitarString, fret: gn.fret })
    }
  }
  return Array.from(seen.entries()).map(([id, data]) => ({ id, ...data }))
}

// ── Props ──────────────────────────────────────────────────────────────────

interface GuideNotesGridProps {
  bars: number
  beatsPerBar: number
  guideNotes: GuideNote[]
  onChange: (notes: GuideNote[]) => void
}

// ── Main component ─────────────────────────────────────────────────────────

const MAX_HISTORY = 50

export default function GuideNotesGrid({
  bars,
  beatsPerBar,
  guideNotes,
  onChange,
}: GuideNotesGridProps) {
  const [rows, setRows] = useState<StepRow[]>(() => initRows(guideNotes))
  // Global grid resolution — how finely each beat is divided.
  const [resolution, setResolution] = useState<NoteDuration>(
    () => guideNotes[0]?.duration ?? 'quarter',
  )
  // Which row's pitch picker is open (rowId) or null.
  const [pickerRow, setPickerRow] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [history, setHistory] = useState<GuideNote[][]>([])

  const subCount = SUBDIVISIONS_PER_BEAT[resolution]
  const subLabels = SUB_LABELS[resolution]
  const subTitles = SUB_TITLES[resolution]

  // ── Undo infrastructure ───────────────────────────────────────────────────

  const commit = useCallback(
    (next: GuideNote[]) => {
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), guideNotes])
      onChange(next)
    },
    [guideNotes, onChange],
  )

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      onChange(prev)
      setRows(initRows(prev))
      return h.slice(0, -1)
    })
  }, [onChange])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z' || e.shiftKey) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      undo()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function noteAt(rowId: string, bar: number, beat: number, sub: number): GuideNote | undefined {
    return guideNotes.find(
      (n) =>
        (n.rowId ?? n.id) === rowId &&
        n.bar === bar &&
        n.beat === beat &&
        (n.subdivision ?? 0) === sub,
    )
  }

  function rowNotes(rowId: string): GuideNote[] {
    return guideNotes.filter((n) => (n.rowId ?? n.id) === rowId)
  }

  /** Toggle a single step on/off. */
  function toggleStep(row: StepRow, bar: number, beat: number, sub: number) {
    const existing = noteAt(row.id, bar, beat, sub)
    if (existing) {
      commit(guideNotes.filter((n) => n.id !== existing.id))
      return
    }
    const gn: GuideNote = {
      id: crypto.randomUUID(),
      rowId: row.id,
      bar,
      beat,
      subdivision: sub,
      duration: resolution,
      note: row.note,
      enabled: true,
      guitarString: row.guitarString,
      fret: row.fret,
    }
    commit([...guideNotes, gn])
  }

  /**
   * Change the global grid resolution. Notes whose current sub-position still
   * fits the new grid keep their spot; those that don't snap back to the beat.
   * Duplicates that collapse onto the same step are removed.
   */
  function changeResolution(next: NoteDuration) {
    if (next === resolution) return
    const newSub = SUBDIVISIONS_PER_BEAT[next]
    const seen = new Set<string>()
    const remapped: GuideNote[] = []
    for (const n of guideNotes) {
      const sub = (n.subdivision ?? 0) < newSub ? (n.subdivision ?? 0) : 0
      const key = `${n.rowId ?? n.id}:${n.bar}:${n.beat}:${sub}`
      if (seen.has(key)) continue
      seen.add(key)
      remapped.push({ ...n, duration: next, subdivision: sub })
    }
    commit(remapped)
    setResolution(next)
  }

  /** Mute / unmute every note in a row. */
  function toggleRowMute(rowId: string) {
    const notes = rowNotes(rowId)
    if (notes.length === 0) return
    const allMuted = notes.every((n) => !n.enabled)
    commit(
      guideNotes.map((n) =>
        (n.rowId ?? n.id) === rowId ? { ...n, enabled: allMuted } : n,
      ),
    )
  }

  /** Clear every step in a row (keeps the row + its pitch). */
  function clearRow(rowId: string) {
    if (rowNotes(rowId).length === 0) return
    commit(guideNotes.filter((n) => (n.rowId ?? n.id) !== rowId))
  }

  function changeRowPick(rowId: string, pick: FretPick) {
    const { note, guitarString, fret } = pick
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, note, guitarString, fret } : r)),
    )
    commit(
      guideNotes.map((n) =>
        (n.rowId ?? n.id) === rowId ? { ...n, note, guitarString, fret } : n,
      ),
    )
    setPickerRow(null)
  }

  function deleteRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId))
    commit(guideNotes.filter((n) => (n.rowId ?? n.id) !== rowId))
    setPickerRow(null)
  }

  function addRow() {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), note: 'E4' }])
  }

  // ── Sub-render: one beat group of cells for a row ───────────────────────────

  function renderRowCells(row: StepRow) {
    const muted = rowNotes(row.id).length > 0 && rowNotes(row.id).every((n) => !n.enabled)
    return (
      <div className="flex" style={{ gap: BAR_GAP }}>
        {Array.from({ length: bars }, (_, bari) => {
          const bar = bari + 1
          return (
            <div
              key={bar}
              className="flex items-center rounded-md bg-surface/50 border border-gray-200 dark:border-gray-700"
              style={{ gap: BEAT_GAP, padding: BAR_PAD }}
            >
              {Array.from({ length: beatsPerBar }, (_, beati) => {
                const beat = beati + 1
                return (
                  <div key={beat} className="flex" style={{ gap: SUB_GAP }}>
                    {Array.from({ length: subCount }, (_, sub) => {
                      const gn = noteAt(row.id, bar, beat, sub)
                      const active = !!gn
                      const isEnabled = gn?.enabled ?? false
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleStep(row, bar, beat, sub)}
                          title={`Bar ${bar}, beat ${beat} ${subTitles[sub]}${
                            active ? ' — tap to remove' : ' — tap to add'
                          }`}
                          aria-label={`Bar ${bar} beat ${beat} ${subTitles[sub]}`}
                          className={`rounded-md transition-all duration-100 ${
                            active
                              ? isEnabled && !muted
                                ? 'bg-brand border border-brand shadow-sm hover:opacity-80'
                                : 'bg-brand/20 border border-brand/50 hover:bg-brand/30'
                              : sub === 0
                              ? 'bg-surface border border-gray-200 dark:border-gray-600 hover:border-brand'
                              : 'bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 hover:border-brand'
                          }`}
                          style={{ width: CELL, height: CELL }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Header: bar labels + beat numbers aligned to the grid ───────────────────

  function renderHeader() {
    return (
      <div className="flex" style={{ gap: BAR_GAP }}>
        {Array.from({ length: bars }, (_, bari) => {
          const bar = bari + 1
          return (
            <div key={bar}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5 pl-1">
                Bar {bar}
              </div>
              <div
                className="flex border border-transparent"
                style={{ gap: BEAT_GAP, padding: BAR_PAD }}
              >
                {Array.from({ length: beatsPerBar }, (_, beati) => {
                  const beat = beati + 1
                  return (
                    <div key={beat} className="flex" style={{ gap: SUB_GAP }}>
                      {Array.from({ length: subCount }, (_, sub) => (
                        <div
                          key={sub}
                          className="text-center font-mono text-gray-400 dark:text-gray-500"
                          style={{ width: CELL, fontSize: sub === 0 ? 11 : 9 }}
                        >
                          {sub === 0 ? beat : subLabels[sub]}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar: resolution + undo */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Grid
          </span>
          <div className="flex gap-1">
            {RESOLUTION_OPTIONS.map((opt) => {
              const sel = resolution === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => changeResolution(opt.id)}
                  title={opt.title}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    sel
                      ? 'bg-brand text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={undo}
          disabled={history.length === 0}
          title="Undo last change (Ctrl+Z / ⌘Z)"
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 8a6 6 0 1 0 1.5-4" />
            <polyline points="2 3 2 8 7 8" />
          </svg>
          Undo
          {history.length > 0 && (
            <span className="text-[9px] tabular-nums text-gray-400 dark:text-gray-500">
              ({history.length})
            </span>
          )}
        </button>
      </div>

      {/* Sequencer grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <div className="inline-block min-w-full p-3">
          {/* Header row */}
          <div className="flex items-end gap-3 mb-1.5">
            <div className="w-20 shrink-0" />
            <div className="w-6 shrink-0" />
            {renderHeader()}
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-3 pl-1">
              No guide notes yet — click &ldquo;Add note&rdquo; to start a pattern.
            </p>
          )}

          {/* Note rows */}
          <div className="space-y-1.5">
            {rows.map((row) => {
              const notes = rowNotes(row.id)
              const hasNotes = notes.length > 0
              const muted = hasNotes && notes.every((n) => !n.enabled)
              return (
                <div key={row.id} className="flex items-center gap-3 group">
                  {/* Pitch selector */}
                  <div className="w-20 shrink-0 relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setAnchorRect(rect)
                        setPickerRow(pickerRow === row.id ? null : row.id)
                      }}
                      className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-surface text-gray-900 dark:text-white text-xs font-mono hover:border-brand transition-colors"
                      title={
                        row.guitarString !== undefined && row.fret !== undefined
                          ? `String ${row.guitarString}, fret ${row.fret} (${row.note})`
                          : row.note
                      }
                    >
                      {row.guitarString !== undefined && row.fret !== undefined ? (
                        <span className="flex flex-col leading-none gap-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">
                            str {row.guitarString}
                          </span>
                          <span className="font-bold text-sm">{row.fret}</span>
                        </span>
                      ) : (
                        <span className="font-bold">{row.note}</span>
                      )}
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                        <path d="M2 4l3 3 3-3" />
                      </svg>
                    </button>
                    {pickerRow === row.id && anchorRect && (
                      <FretboardNotePicker
                        anchorRect={anchorRect}
                        onPick={(pick) => changeRowPick(row.id, pick)}
                        onClose={() => setPickerRow(null)}
                      />
                    )}
                  </div>

                  {/* Mute toggle */}
                  <button
                    type="button"
                    onClick={() => toggleRowMute(row.id)}
                    disabled={!hasNotes}
                    title={muted ? 'Unmute this note' : 'Mute this note'}
                    aria-label={muted ? 'Unmute this note' : 'Mute this note'}
                    className={`w-6 h-6 shrink-0 flex items-center justify-center rounded transition-colors disabled:opacity-25 ${
                      muted
                        ? 'text-gray-400'
                        : 'text-brand hover:text-brand/70'
                    }`}
                  >
                    {muted ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M9 2L5 6H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3l4 4V2z" />
                        <path d="M13 6l-4 4m0-4l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M9 2L5 6H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3l4 4V2z" />
                        <path d="M12.5 5.5a4 4 0 0 1 0 5M14.5 3.5a7 7 0 0 1 0 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>

                  {/* Step cells */}
                  {renderRowCells(row)}

                  {/* Row actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => clearRow(row.id)}
                      disabled={!hasNotes}
                      title="Clear all steps in this row"
                      aria-label="Clear row"
                      className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      aria-label="Remove note row"
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add row */}
          <div className="pt-2.5">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-brand transition-colors font-medium"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              Add note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
