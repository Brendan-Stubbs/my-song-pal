'use client'

import { getPitchClassAt } from '@/lib/scale-finder'
import { DIAGRAM as C } from '@/lib/diagram-colors'

// ─── SVG layout constants (match FretboardDiagram proportions) ───────────────

const FRET_COUNT = 12
const NUM_STRINGS = 6
const CELL_W = 42
const CELL_H = 34
const PAD_T = 38   // room for fret numbers above grid
const PAD_L = 28   // room for string labels
const PAD_B = 34   // room for inlay markers + fret numbers below grid
const PAD_R = 12
const DOT_R = 11

// Y-positions for fret labels and inlay markers (within bottom padding)
const INLAY_Y_OFFSET = 10   // px below the last string line
const FRET_NUM_B_OFFSET = 26 // px below the last string line

// Fret position inlay markers (standard guitar dots)
const FRET_MARKERS: number[] = [3, 5, 7, 9]
const DOUBLE_MARKERS: number[] = [12]

// String names indexed by guitar string number (1 = high e, 6 = low E)
const STRING_NAMES: Record<number, string> = {
  1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E',
}

// ─── Fretboard geometry helpers ──────────────────────────────────────────────

function fretX(fret: number): number {
  return PAD_L + fret * CELL_W + CELL_W / 2
}

const svgWidth = PAD_L + (FRET_COUNT + 1) * CELL_W + PAD_R
const svgHeight = PAD_T + (NUM_STRINGS - 1) * CELL_H + PAD_B

// ─── Interactive fretboard ────────────────────────────────────────────────────

export interface InteractiveFretboardProps {
  tuning: string[]
  selectedPcs: Set<string>
  onToggle: (pc: string) => void
  highEAtTop: boolean
}

export default function InteractiveFretboard({
  tuning,
  selectedPcs,
  onToggle,
  highEAtTop,
}: InteractiveFretboardProps) {
  function stringY(stringNum: number): number {
    return highEAtTop
      ? PAD_T + (stringNum - 1) * CELL_H
      : PAD_T + (NUM_STRINGS - stringNum) * CELL_H
  }

  // Pre-compute pitch class for every (string, fret) position
  const grid: { stringNum: number; fret: number; pc: string }[] = []
  for (let s = 1; s <= NUM_STRINGS; s++) {
    for (let f = 0; f <= FRET_COUNT; f++) {
      grid.push({ stringNum: s, fret: f, pc: getPitchClassAt(s, f, tuning) })
    }
  }

  return (
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Interactive guitar fretboard — click notes to select them"
        role="img"
        style={{ display: 'block' }}
      >
        {/* Board background */}
        <rect width={svgWidth} height={svgHeight} style={{ fill: C.bg }} />

        {/* Open string column shading */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={CELL_W}
          height={(NUM_STRINGS - 1) * CELL_H}
          style={{ fill: C.open }}
        />

        {/* String lines */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          const y = stringY(s)
          return (
            <line
              key={`str-${s}`}
              x1={PAD_L} y1={y}
              x2={svgWidth - PAD_R} y2={y}
              style={{ stroke: C.string }} strokeWidth={1}
            />
          )
        })}

        {/* Fret lines */}
        {Array.from({ length: FRET_COUNT + 2 }, (_, i) => {
          const x = PAD_L + i * CELL_W
          const isNut = i === 0
          return (
            <line
              key={`fret-line-${i}`}
              x1={x} y1={PAD_T}
              x2={x} y2={PAD_T + (NUM_STRINGS - 1) * CELL_H}
              style={{ stroke: isNut ? C.nut : C.fret }}
              strokeWidth={isNut ? 3 : 1}
            />
          )
        })}

        {/* Fret number labels — top and bottom */}
        {Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
          <g key={`fnum-${f}`}>
            {/* Above grid */}
            <text
              x={fretX(f)}
              y={PAD_T - 20}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={10}
              fontWeight="500"
              style={{ fill: C.muted }}
            >
              {f}
            </text>
            {/* Below grid */}
            <text
              x={fretX(f)}
              y={PAD_T + (NUM_STRINGS - 1) * CELL_H + FRET_NUM_B_OFFSET}
              textAnchor="middle"
              dominantBaseline="auto"
              fontSize={10}
              fontWeight="500"
              style={{ fill: C.muted }}
            >
              {f}
            </text>
          </g>
        ))}

        {/* String name labels (left) */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          return (
            <text
              key={`sname-${s}`}
              x={PAD_L - 6}
              y={stringY(s)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={9}
              fontWeight="600"
              style={{ fill: C.muted }}
            >
              {STRING_NAMES[s]}
            </text>
          )
        })}

        {/* Fret position inlay markers (between grid and bottom numbers) */}
        {FRET_MARKERS.map((f) => (
          <circle
            key={`marker-${f}`}
            cx={fretX(f)}
            cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET}
            r={3}
            style={{ fill: C.string }}
          />
        ))}
        {DOUBLE_MARKERS.map((f) => (
          <g key={`dbl-${f}`}>
            <circle cx={fretX(f) - 5} cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET} r={3} style={{ fill: C.string }} />
            <circle cx={fretX(f) + 5} cy={PAD_T + (NUM_STRINGS - 1) * CELL_H + INLAY_Y_OFFSET} r={3} style={{ fill: C.string }} />
          </g>
        ))}

        {/* Note dots */}
        {grid.map(({ stringNum, fret, pc }) => {
          const selected = selectedPcs.has(pc)
          const cx = fretX(fret)
          const cy = stringY(stringNum)

          return (
            <g
              key={`dot-${stringNum}-${fret}`}
              onClick={() => onToggle(pc)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={`${pc} — string ${stringNum}, fret ${fret}${selected ? ' (selected)' : ''}`}
              aria-pressed={selected}
            >
              {/* Invisible hit area for easier clicking */}
              <rect
                x={cx - CELL_W / 2 + 2}
                y={cy - CELL_H / 2 + 2}
                width={CELL_W - 4}
                height={CELL_H - 4}
                fill="transparent"
              />
              {/* Background circle — covers string/fret lines so dot looks clean */}
              <circle cx={cx} cy={cy} r={DOT_R} style={{ fill: C.bg }} />
              {/* Visible dot */}
              {selected ? (
                <circle cx={cx} cy={cy} r={DOT_R} style={{ fill: C.brand }} />
              ) : (
                <circle cx={cx} cy={cy} r={DOT_R} fill="none" style={{ stroke: C.note }} strokeWidth={1.5} />
              )}
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={selected ? '700' : '400'}
                style={{ fill: selected ? C.onBrand : C.muted, pointerEvents: 'none', userSelect: 'none' }}
              >
                {pc}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
