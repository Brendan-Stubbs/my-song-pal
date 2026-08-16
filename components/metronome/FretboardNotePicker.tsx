'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Note } from 'tonal'
import { TUNINGS, loadTuningId, saveTuningId } from '@/lib/guitar-tuning'

const BRAND = '#ff9933'

// Single-dot inlays on a standard guitar (both octaves)
const INLAY_SINGLE = new Set([3, 5, 7, 9, 15, 17, 19, 21])
// Double-dot inlays (octave markers)
const INLAY_DOUBLE = new Set([12, 24])

export interface FretPick {
  /** MIDI-derived note name, e.g. "D2". Used for audio playback. */
  note: string
  /** Guitar string number: 1 = high e, 6 = low E. */
  guitarString: number
  /** Fret number (0 = open string). */
  fret: number
}

interface FretboardNotePickerProps {
  /** Called with the fret pick when a fret is clicked. */
  onPick: (pick: FretPick) => void
  /** Called when the user dismisses without picking. */
  onClose: () => void
  /**
   * Screen rect of the trigger button. When provided the picker renders in a
   * portal at `position: fixed` so it is never clipped by overflow containers.
   */
  anchorRect?: DOMRect
}

export default function FretboardNotePicker({ onPick, onClose, anchorRect }: FretboardNotePickerProps) {
  const [hovered, setHovered] = useState<{ string: number; fret: number } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [tuningId, setTuningId] = useState<string>(loadTuningId)
  const containerRef = useRef<HTMLDivElement>(null)

  const tuning = TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0]
  const FRET_COUNT = expanded ? 24 : 12

  function handleTuningChange(id: string) {
    setTuningId(id)
    saveTuningId(id)
    setHovered(null)
  }

  // Close on click outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  // Close on Escape or scroll/resize so the portal doesn't drift
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function reposition() { onClose() }
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', reposition, { capture: true })
      window.removeEventListener('resize', reposition)
    }
  }, [onClose])

  function noteAt(stringIdx: number, fret: number): string {
    const midi = tuning.midi[stringIdx] + fret
    return Note.fromMidi(midi) ?? ''
  }

  const CELL_W = expanded ? 28 : 38
  const CELL_H = 30
  const PAD_LEFT = 28  // room for string labels
  const PAD_TOP = 22   // room for fret number labels
  const PAD_BOTTOM = 8
  const PAD_RIGHT = 8
  const NUT_WIDTH = 3

  const svgW = PAD_LEFT + (FRET_COUNT + 1) * CELL_W + PAD_RIGHT
  const svgH = PAD_TOP + 5 * CELL_H + PAD_BOTTOM

  // String Y: stringIdx 0 = low E at bottom, 5 = high e at top
  function stringY(stringIdx: number): number {
    // guitar orientation: low E (idx 0) at bottom, high e (idx 5) at top
    return PAD_TOP + (5 - stringIdx) * CELL_H
  }

  // Fret centre X
  function fretCX(fret: number): number {
    if (fret === 0) return PAD_LEFT + CELL_W / 2  // open string position
    return PAD_LEFT + fret * CELL_W + CELL_W / 2
  }

  const hoveredNote = hovered ? noteAt(hovered.string, hovered.fret) : null

  // Portal-based positioning: place below the anchor, nudge left if it would
  // overflow the viewport's right edge.
  const portalStyle = anchorRect
    ? (() => {
        const panelW = svgW + 24
        const spaceBelow = window.innerHeight - anchorRect.bottom
        const top =
          spaceBelow >= 260
            ? anchorRect.bottom + 8
            : anchorRect.top - 260 - 8
        const rawLeft = anchorRect.left
        const left = Math.min(rawLeft, window.innerWidth - panelW - 12)
        return { position: 'fixed' as const, top, left, zIndex: 9999, minWidth: panelW }
      })()
    : undefined

  const panel = (
    <div
      ref={containerRef}
      className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 space-y-2"
      style={portalStyle ?? { position: 'absolute', zIndex: 50, marginTop: 4, minWidth: svgW + 24 }}
    >
      {/* Header row 1: hint + controls */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0 mr-auto">
          Click a fret to select a note
        </p>
        {hoveredNote && (
          <span className="font-mono font-bold text-brand text-sm shrink-0">{hoveredNote}</span>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors shrink-0 ${
            expanded
              ? 'bg-brand text-white border-brand'
              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand hover:text-brand'
          }`}
          title={expanded ? 'Show frets 0–12' : 'Show frets 13–24'}
        >
          {expanded ? '0–12' : '13–24'}
        </button>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l8 8M10 2L2 10" />
          </svg>
        </button>
      </div>

      {/* Header row 2: tuning selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 shrink-0">
          Tuning
        </span>
        <select
          value={tuningId}
          onChange={(e) => handleTuningChange(e.target.value)}
          className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer"
        >
          {TUNINGS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Fretboard SVG */}
      <svg
        width={svgW}
        height={svgH}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Background */}
        <rect width={svgW} height={svgH} fill="transparent" />

        {/* Fret number labels */}
        {Array.from({ length: FRET_COUNT + 1 }, (_, fret) => (
          fret > 0 && (
            <text
              key={`fn-${fret}`}
              x={fretCX(fret)}
              y={PAD_TOP - 6}
              textAnchor="middle"
              fontSize={9}
              fontWeight={INLAY_DOUBLE.has(fret) ? 700 : 400}
              fill={INLAY_DOUBLE.has(fret) ? BRAND : '#9ca3af'}
            >
              {fret}
            </text>
          )
        ))}

        {/* Fret lines */}
        {Array.from({ length: FRET_COUNT + 2 }, (_, i) => (
          <line
            key={`fl-${i}`}
            x1={PAD_LEFT + i * CELL_W} y1={PAD_TOP}
            x2={PAD_LEFT + i * CELL_W} y2={PAD_TOP + 5 * CELL_H}
            stroke={i === 0 ? '#374151' : '#d1d5db'}
            strokeWidth={i === 0 ? NUT_WIDTH : 1}
          />
        ))}

        {/* Inlay dots */}
        {Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
          if (fret === 0) return null
          const midY = PAD_TOP + 5 * CELL_H / 2
          if (INLAY_DOUBLE.has(fret)) {
            return (
              <g key={`inlay-${fret}`}>
                <circle cx={fretCX(fret)} cy={midY - 7} r={3} fill="#e5e7eb" />
                <circle cx={fretCX(fret)} cy={midY + 7} r={3} fill="#e5e7eb" />
              </g>
            )
          }
          if (INLAY_SINGLE.has(fret)) {
            return <circle key={`inlay-${fret}`} cx={fretCX(fret)} cy={midY} r={3} fill="#e5e7eb" />
          }
          return null
        })}

        {/* String lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const strokeWidth = [2.5, 2.0, 1.6, 1.3, 1.0, 0.75][i]
          return (
            <line
              key={`sl-${i}`}
              x1={PAD_LEFT} y1={stringY(i)}
              x2={svgW - PAD_RIGHT} y2={stringY(i)}
              stroke="#9ca3af"
              strokeWidth={strokeWidth}
            />
          )
        })}

        {/* String labels */}
        {Array.from({ length: 6 }, (_, i) => (
          <text
            key={`slbl-${i}`}
            x={PAD_LEFT - 6}
            y={stringY(i)}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={9}
            fontWeight="600"
            fill="#6b7280"
          >
            {tuning.labels[i]}
          </text>
        ))}

        {/* Clickable hit areas + hover highlight */}
        {Array.from({ length: 6 }, (_, stringIdx) =>
          Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
            const isHovered = hovered?.string === stringIdx && hovered?.fret === fret
            const note = noteAt(stringIdx, fret)
            return (
              <g
                key={`cell-${stringIdx}-${fret}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered({ string: stringIdx, fret })}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onPick({ note, guitarString: 6 - stringIdx, fret })}
                aria-label={`${note} — string ${6 - stringIdx}, fret ${fret}`}
              >
                {/* Invisible hit area */}
                <rect
                  x={PAD_LEFT + fret * CELL_W}
                  y={stringY(stringIdx) - CELL_H / 2}
                  width={CELL_W}
                  height={CELL_H}
                  fill="transparent"
                />

                {/* Hover dot */}
                {isHovered && (
                  <circle
                    cx={fretCX(fret)}
                    cy={stringY(stringIdx)}
                    r={11}
                    fill={BRAND}
                    opacity={0.9}
                  />
                )}
                {isHovered && (
                  <text
                    x={fretCX(fret)}
                    y={stringY(stringIdx)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight="700"
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {note}
                  </text>
                )}
              </g>
            )
          })
        )}
      </svg>
    </div>
  )

  return anchorRect ? createPortal(panel, document.body) : panel
}
