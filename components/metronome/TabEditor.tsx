'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GuideNote, NoteDuration } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'
import { getTuning, loadTuningId, saveTuningId, TUNINGS, noteNameAt, midiAt } from '@/lib/guitar-tuning'
import { getEngine, type AudioEngineId, DEFAULT_AUDIO_ENGINE } from '@/lib/instrument'
import TabStaff, { buildColumns, SUB_LABELS, STRING_COUNT, type Column, type Cursor } from './TabStaff'

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_FRET = 24

const RESOLUTION_OPTIONS: { id: NoteDuration; label: string; title: string }[] = [
  { id: 'quarter',   label: '¼',    title: 'Quarter-note grid — one slot per beat' },
  { id: 'eighth',    label: '⅛',    title: 'Eighth-note grid — beat + "and"'       },
  { id: 'sixteenth', label: '¹⁄₁₆', title: 'Sixteenth-note grid — 1 e + a'         },
  { id: 'triplet',   label: '⅓',    title: 'Triplet grid — three per beat'         },
]

type Mode = 'write' | 'mute'

// ── Props ──────────────────────────────────────────────────────────────────

interface TabEditorProps {
  bars: number
  beatsPerBar: number
  guideNotes: GuideNote[]
  onChange: (notes: GuideNote[]) => void
  /** Engine used for the little "pluck" preview when a note is entered. */
  engineId?: AudioEngineId
}

const MAX_HISTORY = 50

export default function TabEditor({
  bars,
  beatsPerBar,
  guideNotes,
  onChange,
  engineId = DEFAULT_AUDIO_ENGINE,
}: TabEditorProps) {
  const [resolution, setResolution] = useState<NoteDuration>(
    () => guideNotes.find((n) => n.guitarString !== undefined)?.duration ?? 'quarter',
  )
  const [tuningId, setTuningId] = useState<string>(loadTuningId)
  const [mode, setMode] = useState<Mode>('write')
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [history, setHistory] = useState<GuideNote[][]>([])

  const tuning = getTuning(tuningId)
  const subCount = SUBDIVISIONS_PER_BEAT[resolution]
  const subLabels = SUB_LABELS[resolution]

  // Notes the tab can't place on a string (no guitarString) — kept intact.
  const unplacedCount = useMemo(
    () => guideNotes.filter((n) => n.guitarString === undefined).length,
    [guideNotes],
  )

  // ── Column model ───────────────────────────────────────────────────────────

  const columns = useMemo<Column[]>(
    () => buildColumns(bars, beatsPerBar, subCount),
    [bars, beatsPerBar, subCount],
  )

  // ── Undo ─────────────────────────────────────────────────────────────────

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
      onChange(h[h.length - 1])
      return h.slice(0, -1)
    })
  }, [onChange])

  // ── Note lookup / preview ──────────────────────────────────────────────────

  function noteAt(guitarString: number, bar: number, beat: number, sub: number): GuideNote | undefined {
    return guideNotes.find(
      (n) =>
        n.guitarString === guitarString &&
        n.bar === bar &&
        n.beat === beat &&
        (n.subdivision ?? 0) === sub,
    )
  }

  const preview = useCallback(
    (guitarString: number, fret: number) => {
      const midi = midiAt(tuning, guitarString, fret)
      try {
        const engine = getEngine(engineId)
        void engine.resume()
        engine.playNote(midi, { duration: 0.5, velocity: 0.9 })
      } catch {
        /* audio unavailable */
      }
    },
    [engineId, tuning],
  )

  // ── Editing ops ────────────────────────────────────────────────────────────

  const setFret = useCallback(
    (c: Cursor, fret: number) => {
      if (fret < 0 || fret > MAX_FRET) return
      const note = noteNameAt(tuning, c.guitarString, fret)
      const existing = noteAt(c.guitarString, c.bar, c.beat, c.sub)
      if (existing) {
        commit(
          guideNotes.map((n) =>
            n.id === existing.id ? { ...n, fret, note } : n,
          ),
        )
      } else {
        const gn: GuideNote = {
          id: crypto.randomUUID(),
          bar: c.bar,
          beat: c.beat,
          subdivision: c.sub,
          duration: resolution,
          note,
          enabled: true,
          guitarString: c.guitarString,
          fret,
        }
        commit([...guideNotes, gn])
      }
      preview(c.guitarString, fret)
    },
    [commit, guideNotes, preview, resolution, tuning],
  )

  const removeAt = useCallback(
    (c: Cursor) => {
      const existing = noteAt(c.guitarString, c.bar, c.beat, c.sub)
      if (existing) commit(guideNotes.filter((n) => n.id !== existing.id))
    },
    [commit, guideNotes],
  )

  const toggleMuteAt = useCallback(
    (c: Cursor) => {
      const existing = noteAt(c.guitarString, c.bar, c.beat, c.sub)
      if (!existing) return
      commit(
        guideNotes.map((n) => (n.id === existing.id ? { ...n, enabled: !n.enabled } : n)),
      )
    },
    [commit, guideNotes],
  )

  /** Change the grid resolution, re-snapping notes that no longer fit. */
  function changeResolution(next: NoteDuration) {
    if (next === resolution) return
    const newSub = SUBDIVISIONS_PER_BEAT[next]
    const seen = new Set<string>()
    const remapped: GuideNote[] = []
    for (const n of guideNotes) {
      const sub = (n.subdivision ?? 0) < newSub ? (n.subdivision ?? 0) : 0
      const key = `${n.guitarString ?? n.id}:${n.bar}:${n.beat}:${sub}`
      if (seen.has(key)) continue
      seen.add(key)
      remapped.push({ ...n, duration: next, subdivision: sub })
    }
    commit(remapped)
    setResolution(next)
    setCursor(null)
  }

  function handleTuningChange(id: string) {
    setTuningId(id)
    saveTuningId(id)
    // Re-derive note names for every placed note in the new tuning.
    const t = getTuning(id)
    commit(
      guideNotes.map((n) =>
        n.guitarString !== undefined && n.fret !== undefined
          ? { ...n, note: noteNameAt(t, n.guitarString, n.fret) }
          : n,
      ),
    )
  }

  function clearAll() {
    if (guideNotes.length === 0) return
    commit([])
    setCursor(null)
  }

  // ── Slot click ─────────────────────────────────────────────────────────────

  function onSlotClick(guitarString: number, col: Column) {
    const c: Cursor = { guitarString, bar: col.bar, beat: col.beat, sub: col.sub }
    if (mode === 'mute') {
      toggleMuteAt(c)
      return
    }
    setCursor(c)
  }

  // ── Keyboard entry ───────────────────────────────────────────────────────────
  // A window listener (like the grid's undo) drives fret typing so the tab
  // "cursor" behaves like TuxGuitar without fiddly focus management.

  const digitBufRef = useRef<{ key: string; value: number; t: number } | null>(null)
  const latest = useRef({ cursor, columns, guideNotes, setFret, removeAt, toggleMuteAt, undo })
  latest.current = { cursor, columns, guideNotes, setFret, removeAt, toggleMuteAt, undo }

  const moveCursor = useCallback(
    (dString: number, dCol: number) => {
      setCursor((prev) => {
        if (!prev) return prev
        const cols = latest.current.columns
        const idx = cols.findIndex(
          (col) => col.bar === prev.bar && col.beat === prev.beat && col.sub === prev.sub,
        )
        const nextIdx = Math.max(0, Math.min(cols.length - 1, idx + dCol))
        const nextString = Math.max(1, Math.min(STRING_COUNT, prev.guitarString + dString))
        const nc = cols[nextIdx]
        return { guitarString: nextString, bar: nc.bar, beat: nc.beat, sub: nc.sub }
      })
    },
    [],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      // Undo works regardless of cursor.
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        latest.current.undo()
        return
      }

      const c = latest.current.cursor
      if (!c) return

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        const digit = parseInt(e.key, 10)
        const key = `${c.guitarString}:${c.bar}:${c.beat}:${c.sub}`
        const buf = digitBufRef.current
        let fret = digit
        if (buf && buf.key === key && Date.now() - buf.t < 900) {
          const combined = buf.value * 10 + digit
          if (combined <= MAX_FRET) fret = combined
        }
        digitBufRef.current = { key, value: fret, t: Date.now() }
        latest.current.setFret(c, fret)
        return
      }

      switch (e.key) {
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          latest.current.removeAt(c)
          digitBufRef.current = null
          break
        case 'm':
        case 'M':
          e.preventDefault()
          latest.current.toggleMuteAt(c)
          break
        case 'ArrowLeft':
          e.preventDefault(); moveCursor(0, -1); digitBufRef.current = null; break
        case 'ArrowRight':
          e.preventDefault(); moveCursor(0, 1); digitBufRef.current = null; break
        case 'ArrowUp':
          e.preventDefault(); moveCursor(-1, 0); digitBufRef.current = null; break
        case 'ArrowDown':
          e.preventDefault(); moveCursor(1, 0); digitBufRef.current = null; break
        case 'Escape':
          setCursor(null); break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [moveCursor])

  // ── Keypad (touch fret entry, acts on the cursor) ────────────────────────────

  function keypadDigit(digit: number) {
    if (!cursor) return
    const key = `${cursor.guitarString}:${cursor.bar}:${cursor.beat}:${cursor.sub}`
    const buf = digitBufRef.current
    let fret = digit
    if (buf && buf.key === key && Date.now() - buf.t < 1400) {
      const combined = buf.value * 10 + digit
      if (combined <= MAX_FRET) fret = combined
    }
    digitBufRef.current = { key, value: fret, t: Date.now() }
    setFret(cursor, fret)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Grid</span>
          <div className="flex gap-1">
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => changeResolution(opt.id)}
                title={opt.title}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
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

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Tuning</span>
          <select
            value={tuningId}
            onChange={(e) => handleTuningChange(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-surface text-gray-800 dark:text-gray-200 cursor-pointer"
          >
            {TUNINGS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'write' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Write notes: click a slot and type a fret number"
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => { setMode('mute'); setCursor(null) }}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'mute' ? 'bg-brand text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Mute for practice: tap notes to silence/unsilence them"
          >
            Mute
          </button>
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
            <span className="text-[9px] tabular-nums text-gray-400 dark:text-gray-500">({history.length})</span>
          )}
        </button>
      </div>

      {/* Tab staff */}
      <TabStaff
        bars={bars}
        beatsPerBar={beatsPerBar}
        resolution={resolution}
        guideNotes={guideNotes}
        tuning={tuning}
        cursor={cursor}
        onSlotClick={onSlotClick}
        mutedCursor={mode === 'mute'}
      />

      {/* Fret keypad — touch-friendly entry, appears when a slot is selected */}
      {mode === 'write' && cursor && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            String {cursor.guitarString}, bar {cursor.bar}, beat {cursor.beat}
            {cursor.sub > 0 ? ` ${subLabels[cursor.sub] || `+${cursor.sub}`}` : ''}:
          </span>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                type="button"
                onClick={() => keypadDigit(d)}
                className="w-8 h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-800 dark:text-gray-100 text-sm font-semibold hover:border-brand hover:text-brand transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => removeAt(cursor)}
              title="Remove note"
              className="w-8 h-8 rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => toggleMuteAt(cursor)}
              title="Mute / unmute this note"
              className="h-8 px-2 rounded-md border border-gray-200 dark:border-gray-600 bg-surface text-gray-500 hover:border-brand hover:text-brand transition-colors flex items-center justify-center text-xs font-semibold"
            >
              Mute
            </button>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">(tap two digits quickly for frets 10+)</span>
        </div>
      )}

      {/* Hint / status line */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-gray-400 dark:text-gray-500">
        <p>
          {mode === 'write'
            ? 'Tap a slot on a string, then type a fret number. Arrow keys move, Delete removes, M mutes. Bold lines are bar lines.'
            : 'Tap any note to silence it for practice — muted notes show in (grey parentheses). Tap again to bring it back.'}
        </p>
        <div className="flex items-center gap-3">
          {unplacedCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400" title="These notes were placed by note-name and aren't on a string, so they don't show on the tab. They still play back.">
              {unplacedCount} note{unplacedCount === 1 ? '' : 's'} not on a string
            </span>
          )}
          {guideNotes.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
