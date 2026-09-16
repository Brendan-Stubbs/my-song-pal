import type { FretboardNote } from '@/types/music'
import { DIAGRAM as C } from '@/lib/diagram-colors'

export interface FretboardDiagramProps {
  notes: FretboardNote[]
  fretCount: number
  showDegrees?: boolean
  /** When true: high e (string 1) at top. When false (default): low E (string 6) at top — guitar orientation. */
  highEAtTop?: boolean
  /** Subset of notes to spotlight — everything else dims. Null/empty means no spotlight. */
  highlightNotes?: FretboardNote[] | null
}

const CELL_WIDTH = 42
const CELL_HEIGHT = 34
const PAD_TOP = 24
const PAD_LEFT = 36
const PAD_BOTTOM = 24
const PAD_RIGHT = 12
const NUM_STRINGS = 6
const DOT_RADIUS = 11

// Frets that mark an octave — highlighted subtly so they're easy to locate
const OCTAVE_FRETS = [12, 24]

// String name labels (index = stringNumber - 1, so index 0 = string 1 = high e)
const STRING_NAMES: Record<number, string> = {
  6: 'E', 5: 'A', 4: 'D', 3: 'G', 2: 'B', 1: 'e',
}

// Stroke widths by string number (thicker = lower-pitched)
const STRING_STROKE: Record<number, number> = {
  6: 2.5, 5: 2.0, 4: 1.6, 3: 1.3, 2: 1.0, 1: 0.75,
}

export default function FretboardDiagram({
  notes,
  fretCount,
  showDegrees = false,
  highEAtTop = false,
  highlightNotes = null,
}: FretboardDiagramProps) {
  const numFrets = fretCount + 1

  // Spotlight: keys of the notes to keep bright, plus the fret span to band behind them.
  const hasHighlight = Boolean(highlightNotes && highlightNotes.length > 0)
  const highlightKeys = new Set(
    (highlightNotes ?? []).map((n) => `${n.string}-${n.fret}`),
  )
  const highlightFrets = (highlightNotes ?? [])
    .map((n) => n.fret)
    .filter((f) => f <= fretCount)
  const bandStart = highlightFrets.length > 0 ? Math.min(...highlightFrets) : 0
  const bandEnd = highlightFrets.length > 0 ? Math.max(...highlightFrets) : 0

  const svgWidth = PAD_LEFT + numFrets * CELL_WIDTH + PAD_RIGHT
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM

  /** Y coordinate for a given guitar string number (1 = high e, 6 = low E). */
  function stringY(stringNumber: number): number {
    return highEAtTop
      ? PAD_TOP + (stringNumber - 1) * CELL_HEIGHT         // string 1 at top
      : PAD_TOP + (NUM_STRINGS - stringNumber) * CELL_HEIGHT // string 6 at top
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
        <rect width={svgWidth} height={svgHeight} style={{ fill: C.bg }} />

        {/* Open fret column (nut area) */}
        <rect x={PAD_LEFT} y={PAD_TOP} width={CELL_WIDTH} height={(NUM_STRINGS - 1) * CELL_HEIGHT} style={{ fill: C.open }} />

        {/* Octave fret highlight (12 / 24) — subtle band so the octave is easy to spot */}
        {OCTAVE_FRETS.filter((f) => f <= fretCount).map((f) => (
          <rect
            key={`octave-${f}`}
            x={PAD_LEFT + f * CELL_WIDTH}
            y={PAD_TOP}
            width={CELL_WIDTH}
            height={(NUM_STRINGS - 1) * CELL_HEIGHT}
            style={{ fill: C.brand }}
            opacity={0.12}
          />
        ))}

        {/* Hovered-position band — spans the frets the position covers */}
        {hasHighlight && highlightFrets.length > 0 && (
          <rect
            x={PAD_LEFT + bandStart * CELL_WIDTH}
            y={PAD_TOP}
            width={(bandEnd - bandStart + 1) * CELL_WIDTH}
            height={(NUM_STRINGS - 1) * CELL_HEIGHT}
            style={{ fill: C.brand, stroke: C.brand }}
            strokeWidth={1.5}
            opacity={0.18}
            data-testid="highlight-band"
          />
        )}

        {/* String lines with varying thickness */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          return (
            <line
              key={`string-${s}`}
              x1={PAD_LEFT} y1={stringY(s)}
              x2={svgWidth - PAD_RIGHT} y2={stringY(s)}
              style={{ stroke: C.string }}
              strokeWidth={STRING_STROKE[s]}
            />
          )
        })}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={PAD_LEFT + i * CELL_WIDTH} y1={PAD_TOP}
            x2={PAD_LEFT + i * CELL_WIDTH} y2={PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT}
            style={{ stroke: i === 0 ? C.nut : C.fret }}
            strokeWidth={i === 0 ? 3 : 1}
          />
        ))}

        {/* String name labels */}
        {Array.from({ length: NUM_STRINGS }, (_, i) => {
          const s = i + 1
          return (
            <text
              key={`label-${s}`}
              x={PAD_LEFT - 6}
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

        {/* Note dots */}
        {notes.map((note, idx) => {
          const cx = fretX(note.fret)
          const cy = stringY(note.string)
          const label = showDegrees ? note.degreeLabel : note.note
          const isHighlighted = !hasHighlight || highlightKeys.has(`${note.string}-${note.fret}`)
          return (
            <g key={idx} opacity={isHighlighted ? 1 : 0.18} data-highlighted={hasHighlight && isHighlighted ? 'true' : undefined}>
              <circle cx={cx} cy={cy} r={DOT_RADIUS}
                style={{
                  fill: note.isRoot ? C.brand : C.note,
                  stroke: hasHighlight && isHighlighted ? C.brand : undefined,
                }}
                strokeWidth={hasHighlight && isHighlighted ? 2 : 0}
                data-root={note.isRoot ? 'true' : undefined}
                data-testid={note.isRoot ? 'root-dot' : 'scale-dot'} />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                fontSize={9} fontWeight="600"
                style={{ fill: note.isRoot ? C.onBrand : C.noteText }}>
                {label}
              </text>
            </g>
          )
        })}

        {/* Fret number labels — octave frets emphasised */}
        {Array.from({ length: numFrets }, (_, i) => {
          const isOctave = OCTAVE_FRETS.includes(i)
          return (
            <text
              key={`fret-label-${i}`}
              x={PAD_LEFT + i * CELL_WIDTH + CELL_WIDTH / 2}
              y={svgHeight - 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight={isOctave ? 700 : 400}
              style={{ fill: isOctave ? C.brand : C.muted }}
            >
              {i}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
