import type { CagedPosition } from '@/types/music'

export interface CagedPositionDiagramProps {
  position: CagedPosition
  showDegrees?: boolean
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

const BRAND_COLOR = '#ff9933'
const DOT_COLOR_LIGHT = '#374151'   // gray-700
const TEXT_COLOR = '#ffffff'

export default function CagedPositionDiagram({
  position,
  showDegrees = false,
}: CagedPositionDiagramProps) {
  const { position: positionNumber, rootFret, notes } = position
  const showNut = rootFret === 0

  // Derive fret count from notes (covers patterns with 5–7 frets)
  const fretRange = notes.length > 0
    ? Math.max(...notes.map((n) => n.fret)) - rootFret + 1
    : 5
  const numFrets = Math.max(5, Math.min(7, fretRange))

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

  return (
    <div className="flex flex-col items-center">
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Position ${positionNumber} at fret ${rootFret}`}
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#faf9f7" className="dark:hidden" />
        <rect width={svgWidth} height={svgHeight} fill="#1f2937" className="hidden dark:block" />

        {/* Position title */}
        <text
          x={svgWidth / 2}
          y={14}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill={BRAND_COLOR}
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
              stroke="#d1d5db"
              strokeWidth={1}
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
              stroke={isNut ? '#374151' : '#d1d5db'}
              strokeWidth={isNut ? 3 : 1}
            />
          )
        })}

        {/* Note dots */}
        {notes.map((note, idx) => {
          const cx = fretX(note.fret)
          const cy = stringY(note.string)
          const fill = note.isRoot ? BRAND_COLOR : DOT_COLOR_LIGHT
          const label = showDegrees ? note.degreeLabel : note.note

          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                fill={fill}
                data-root={note.isRoot ? 'true' : undefined}
                data-testid={note.isRoot ? 'root-dot' : 'scale-dot'}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fill={TEXT_COLOR}
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
              fill="#6b7280"
            >
              {fretNum}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
