import type { FretboardNote } from '@/types/music'

export interface FretboardDiagramProps {
  notes: FretboardNote[]
  fretCount: number
  showDegrees?: boolean
}

const CELL_WIDTH = 42
const CELL_HEIGHT = 34
const PAD_TOP = 24
const PAD_LEFT = 28
const PAD_BOTTOM = 24
const PAD_RIGHT = 12
const NUM_STRINGS = 6
const DOT_RADIUS = 11

const BRAND_COLOR = '#ff9933'
const DOT_COLOR_LIGHT = '#374151'
const TEXT_COLOR = '#ffffff'
const OPEN_FRET_FILL_LIGHT = '#e5e7eb'
const OPEN_FRET_FILL_DARK = '#4b5563'

export default function FretboardDiagram({
  notes,
  fretCount,
  showDegrees = false,
}: FretboardDiagramProps) {
  const showNut = true
  const numFrets = fretCount + 1

  const svgWidth = PAD_LEFT + numFrets * CELL_WIDTH + PAD_RIGHT
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM

  function stringY(stringNumber: number): number {
    return PAD_TOP + (stringNumber - 1) * CELL_HEIGHT
  }

  function fretX(fret: number): number {
    return PAD_LEFT + fret * CELL_WIDTH + CELL_WIDTH / 2
  }

  return (
    <div className="flex flex-col items-center overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Fretboard showing scale notes for ${numFrets} frets`}
      >
        <rect width={svgWidth} height={svgHeight} fill="#faf9f7" className="dark:hidden" />
        <rect width={svgWidth} height={svgHeight} fill="#1f2937" className="hidden dark:block" />

        {/* Open fret column (nut area) - visually distinct */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={CELL_WIDTH}
          height={(NUM_STRINGS - 1) * CELL_HEIGHT}
          fill="#e8e3db"
          className="dark:hidden"
        />
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={CELL_WIDTH}
          height={(NUM_STRINGS - 1) * CELL_HEIGHT}
          fill={OPEN_FRET_FILL_DARK}
          className="hidden dark:block"
        />

        {/* String lines */}
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

        {/* Fret lines */}
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
                fontSize={9}
                fill={TEXT_COLOR}
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Fret number labels */}
        {Array.from({ length: numFrets }, (_, i) => {
          const x = PAD_LEFT + i * CELL_WIDTH + CELL_WIDTH / 2
          const y = svgHeight - 8
          return (
            <text
              key={`fret-label-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {i}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
