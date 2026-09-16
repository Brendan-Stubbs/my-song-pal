import type { CagedPosition } from '@/types/music'
import { DIAGRAM as C } from '@/lib/diagram-colors'

export interface CagedPositionDiagramProps {
  position: CagedPosition
  showDegrees?: boolean
  /** Called on pointer enter/leave and keyboard focus/blur, so the main fretboard can mirror this position. */
  onHoverChange?: (hovering: boolean) => void
}

// Layout constants
const CELL_WIDTH = 36
const CELL_HEIGHT = 28
const PAD_TOP = 24
const PAD_LEFT = 16
const PAD_BOTTOM = 24
const PAD_RIGHT = 8
const NUM_STRINGS = 6
const DOT_RADIUS = 10

// Stroke widths by string number (thicker = lower-pitched), matching the main fretboard
const STRING_STROKE: Record<number, number> = {
  6: 2.5, 5: 2.0, 4: 1.6, 3: 1.3, 2: 1.0, 1: 0.75,
}

export default function CagedPositionDiagram({
  position,
  showDegrees = false,
  onHoverChange,
}: CagedPositionDiagramProps) {
  const { position: positionNumber, rootFret, notes } = position
  const showNut = rootFret === 0

  // Derive fret count from notes (covers patterns with 5–7 frets)
  const fretRange = notes.length > 0
    ? Math.max(...notes.map((n) => n.fret)) - rootFret + 1
    : 5
  const numFrets = Math.max(5, Math.min(8, fretRange))

  const svgWidth = PAD_LEFT + numFrets * CELL_WIDTH + PAD_RIGHT
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM

  // Build fret label list
  const fretLabels = Array.from({ length: numFrets }, (_, i) => rootFret + i)

  // String y-coordinate: string 1 (high e) = top, string 6 (low E) = bottom
  function stringY(stringNumber: number): number {
    return PAD_TOP + (stringNumber - 1) * CELL_HEIGHT
  }

  // Fret x-coordinate: column 0 = rootFret
  function fretX(fret: number): number {
    return PAD_LEFT + (fret - rootFret) * CELL_WIDTH + CELL_WIDTH / 2
  }

  const interactive = Boolean(onHoverChange)

  return (
    <div
      className={`flex flex-col items-center rounded-md transition-shadow ${
        interactive
          ? 'cursor-pointer hover:ring-2 hover:ring-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          : ''
      }`}
      tabIndex={interactive ? 0 : undefined}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Position ${positionNumber} at fret ${rootFret}`}
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} style={{ fill: C.bg }} />

        {/* Position title */}
        <text
          x={svgWidth / 2}
          y={14}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          style={{ fill: C.brand }}
        >
          Position {positionNumber}
        </text>

        {/* String lines (horizontal) */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const stringNum = i + 1
          const y = stringY(stringNum)
          return (
            <line
              key={`string-${stringNum}`}
              x1={PAD_LEFT}
              y1={y}
              x2={svgWidth - PAD_RIGHT}
              y2={y}
              style={{ stroke: C.string }}
              strokeWidth={STRING_STROKE[stringNum]}
            />
          )
        })}

        {/* Fret lines (vertical) */}
        {Array.from({ length: numFrets + 1 }, (_, i) => {
          const x = PAD_LEFT + i * CELL_WIDTH
          const isNut = showNut && i === 0
          return (
            <line
              key={`fret-${i}`}
              x1={x}
              y1={PAD_TOP}
              x2={x}
              y2={PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT}
              style={{ stroke: isNut ? C.nut : C.fret }}
              strokeWidth={isNut ? 3 : 1}
            />
          )
        })}

        {/* Note dots */}
        {notes.map((note, idx) => {
          const cx = fretX(note.fret)
          const cy = stringY(note.string)
          const label = showDegrees ? note.degreeLabel : note.note

          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                style={{ fill: note.isRoot ? C.brand : C.note }}
                data-root={note.isRoot ? 'true' : undefined}
                data-testid={note.isRoot ? 'root-dot' : 'scale-dot'}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                style={{ fill: note.isRoot ? C.onBrand : C.noteText }}
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Fret number labels at the bottom */}
        {fretLabels.map((fretNum, i) => {
          const x = PAD_LEFT + i * CELL_WIDTH + CELL_WIDTH / 2
          const y = svgHeight - 6
          return (
            <text
              key={`fret-label-${fretNum}`}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={9}
              style={{ fill: C.muted }}
            >
              {fretNum}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
