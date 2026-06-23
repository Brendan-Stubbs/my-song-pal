'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { GuideNote, NoteDuration } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'
import FretboardNotePicker from './FretboardNotePicker'

// ── Constants ──────────────────────────────────────────────────────────────

const DURATION_OPTIONS: { id: NoteDuration; label: string; title: string }[] = [
  { id: 'quarter',   label: '¼',    title: 'Quarter note'    },
  { id: 'eighth',    label: '⅛',    title: 'Eighth note'     },
  { id: 'sixteenth', label: '¹⁄₁₆', title: 'Sixteenth note'  },
  { id: 'triplet',   label: '⅓',    title: 'Triplet'         },
]

// Column header labels per subdivision slot (shown above the grid)
const SUB_LABELS: Record<NoteDuration, string[]> = {
  quarter:   [''],
  eighth:    ['', '+'],
  sixteenth: ['', 'e', '+', 'a'],
  triplet:   ['1', '2', '3'],
}

// Tooltip per subdivision slot
const SUB_TITLES: Record<NoteDuration, string[]> = {
  quarter:   ['on the beat'],
  eighth:    ['on the beat', 'the "and"'],
  sixteenth: ['on the beat', '"e"', 'the "and"', '"a"'],
  triplet:   ['1st triplet', '2nd triplet', '3rd triplet'],
}

const DURATION_BADGE: Record<NoteDuration, string> = {
  quarter:   '¼',
  eighth:    '⅛',
  sixteenth: '¹⁄₁₆',
  triplet:   '⅓',
}

// ── Row model ──────────────────────────────────────────────────────────────

interface StepRow {
  id: string
  note: string
}

function initRows(notes: GuideNote[]): StepRow[] {
  const seen = new Map<string, string>()
  for (const gn of notes) {
    const rid = gn.rowId ?? gn.id
    if (!seen.has(rid)) seen.set(rid, gn.note)
  }
  return Array.from(seen.entries()).map(([id, note]) => ({ id, note }))
}

// ── Position popover ───────────────────────────────────────────────────────

interface StepPopoverProps {
  gn: GuideNote
  beatsPerBar: number
  /** Screen coordinates of the trigger button (bottom-left). */
  anchorRect: DOMRect
  onUpdate: (patch: Partial<GuideNote>) => void
  onDelete: () => void
  onClose: () => void
}

function StepPopover({ gn, beatsPerBar, anchorRect, onUpdate, onDelete, onClose }: StepPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function down(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function key(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    // Close on scroll/resize so the popover doesn't drift
    function reposition() { onClose() }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', reposition, { capture: true })
      window.removeEventListener('resize', reposition)
    }
  }, [onClose])

  const subCount = SUBDIVISIONS_PER_BEAT[gn.duration]
  const colLabels = SUB_LABELS[gn.duration]
  const colTitles = SUB_TITLES[gn.duration]

  const durBtn = (opt: typeof DURATION_OPTIONS[number]) => {
    const sel = gn.duration === opt.id
    return (
      <button
        key={opt.id}
        onClick={() => onUpdate({ duration: opt.id, subdivision: 0 })}
        title={opt.title}
        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
          sel
            ? 'bg-brand text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {opt.label}
      </button>
    )
  }

  const top = anchorRect.bottom + 8
  const left = anchorRect.left

  return createPortal(
    <div
      ref={ref}
      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 space-y-3"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        minWidth: 48 + subCount * 28 + (subCount - 1) * 4 + 24,
      }}
    >
      {/* Duration */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Duration</p>
        <div className="flex flex-wrap gap-1">
          {DURATION_OPTIONS.map(durBtn)}
        </div>
      </div>

      {/* Combined beat × subdivision grid */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Position</p>

        {/* Column headers (subdivision labels) */}
        {subCount > 1 && (
          <div className="flex items-center gap-1 ml-9 mb-0.5">
            {colLabels.map((lbl, si) => (
              <div key={si} className="w-6 text-center text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                {si === 0 ? '↓' : lbl}
              </div>
            ))}
          </div>
        )}

        {/* Beat rows */}
        {Array.from({ length: beatsPerBar }, (_, bi) => {
          const beat = bi + 1
          return (
            <div key={bi} className="flex items-center gap-1">
              {/* Beat label */}
              <span className="w-8 text-[10px] font-bold text-gray-400 dark:text-gray-500 text-right shrink-0">
                {beat}
              </span>

              {/* Subdivision cells */}
              {Array.from({ length: subCount }, (_, si) => {
                const selected = gn.beat === beat && (gn.subdivision ?? 0) === si
                return (
                  <button
                    key={si}
                    onClick={() => onUpdate({ beat, subdivision: si })}
                    title={`Beat ${beat}, ${colTitles[si]}`}
                    className={`w-6 h-6 rounded transition-all duration-100 ${
                      selected
                        ? 'bg-brand shadow scale-110'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium text-left pt-1 border-t border-gray-100 dark:border-gray-700 transition-colors"
      >
        Remove this note
      </button>
    </div>,
    document.body,
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface GuideNotesGridProps {
  bars: number
  beatsPerBar: number
  guideNotes: GuideNote[]
  onChange: (notes: GuideNote[]) => void
}

// ── Main component ─────────────────────────────────────────────────────────

export default function GuideNotesGrid({
  bars,
  beatsPerBar,
  guideNotes,
  onChange,
}: GuideNotesGridProps) {
  const [rows, setRows] = useState<StepRow[]>(() => initRows(guideNotes))
  // "popover:rowId:bar" | "picker:rowId" | null
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const openPopover = useCallback((e: React.MouseEvent, key: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setAnchorRect(rect)
    setOpenKey((prev) => (prev === key ? null : key))
  }, [])

  function activeNote(rowId: string, bar: number): GuideNote | undefined {
    return guideNotes.find((n) => (n.rowId ?? n.id) === rowId && n.bar === bar)
  }

  function activateStep(row: StepRow, bar: number) {
    const gn: GuideNote = {
      id: crypto.randomUUID(),
      rowId: row.id,
      bar,
      beat: 1,
      subdivision: 0,
      duration: 'quarter',
      note: row.note,
      enabled: true,
    }
    onChange([...guideNotes, gn])
  }

  function updateNote(id: string, patch: Partial<GuideNote>) {
    onChange(guideNotes.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function removeNote(id: string) {
    onChange(guideNotes.filter((n) => n.id !== id))
    setOpenKey(null)
  }

  function changeRowNote(rowId: string, note: string) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, note } : r)))
    onChange(guideNotes.map((n) => ((n.rowId ?? n.id) === rowId ? { ...n, note } : n)))
    setOpenKey(null)
  }

  function deleteRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId))
    onChange(guideNotes.filter((n) => (n.rowId ?? n.id) !== rowId))
    setOpenKey(null)
  }

  function addRow() {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), note: 'E4' }])
  }

  // ── Label helper ──────────────────────────────────────────────────────────

  function positionLabel(gn: GuideNote): string {
    const sub = SUB_LABELS[gn.duration][gn.subdivision ?? 0]
    return sub ? `${gn.beat} ${sub}` : `Beat ${gn.beat}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
        <div className="inline-block min-w-full p-3 space-y-1.5">

          {/* Column headers */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-20 shrink-0" />
            {Array.from({ length: bars }, (_, i) => (
              <div
                key={i}
                className="w-28 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              >
                Bar {i + 1}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-3 pl-1">
              No guide notes yet — click "Add note" to build a pattern.
            </p>
          )}

          {/* Rows */}
          {rows.map((row) => {
            const pickerKey = `picker:${row.id}`
            return (
              <div key={row.id} className="flex items-center gap-2 group">

                {/* Pitch selector */}
                <div className="relative w-20 shrink-0">
                  <button
                    onClick={() => setOpenKey(openKey === pickerKey ? null : pickerKey)}
                    className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono font-bold hover:border-brand transition-colors"
                  >
                    <span>{row.note}</span>
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                      <path d="M2 4l3 3 3-3" />
                    </svg>
                  </button>
                  {openKey === pickerKey && (
                    <FretboardNotePicker
                      onPick={(note) => changeRowNote(row.id, note)}
                      onClose={() => setOpenKey(null)}
                    />
                  )}
                </div>

                {/* Bar cells */}
                {Array.from({ length: bars }, (_, bari) => {
                  const bar = bari + 1
                  const gn = activeNote(row.id, bar)
                  const popKey = `popover:${row.id}:${bar}`

                  return (
                    <div key={bar} className="w-28 shrink-0">
                      {gn ? (
                        /* Active — show position badge, click to edit */
                        <button
                          onClick={(e) => openPopover(e, popKey)}
                          className="w-full flex flex-col items-center justify-center gap-0.5 h-10 rounded-lg bg-brand/15 border border-brand/40 hover:bg-brand/25 transition-colors"
                        >
                          <span className="text-[11px] font-semibold text-brand leading-none">
                            {positionLabel(gn)}
                          </span>
                          <span className="text-[9px] text-brand/70 leading-none">
                            {DURATION_BADGE[gn.duration]}
                          </span>
                        </button>
                      ) : (
                        /* Inactive — click to add */
                        <button
                          onClick={() => activateStep(row, bar)}
                          className="w-full h-10 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 hover:border-brand hover:text-brand transition-colors flex items-center justify-center"
                          aria-label={`Add ${row.note} in bar ${bar}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 1v10M1 6h10" />
                          </svg>
                        </button>
                      )}

                      {/* Position/duration popover — rendered in a portal to escape overflow clipping */}
                      {openKey === popKey && gn && anchorRect && (
                        <StepPopover
                          gn={gn}
                          beatsPerBar={beatsPerBar}
                          anchorRect={anchorRect}
                          onUpdate={(patch) => updateNote(gn.id, patch)}
                          onDelete={() => removeNote(gn.id)}
                          onClose={() => setOpenKey(null)}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Delete row */}
                <button
                  onClick={() => deleteRow(row.id)}
                  aria-label="Remove note row"
                  className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>
            )
          })}

          {/* Add row */}
          <div className="pt-2">
            <button
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
