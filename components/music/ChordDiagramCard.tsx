'use client'

import type { ChordVoicing } from '@/data/open-chord-voicings'

// ─── Layout constants ────────────────────────────────────────────────────────
const CONFIG = {
  sm: {
    stringSpacing: 11,
    fretSpacing: 13,
    dotRadius: 4.5,
    padTop: 18,    // room for X / O symbols
    padLeft: 8,
    padRight: 8,
    padBottom: 8,
    fontSize: 7,
    barreWidth: 7,  // half-height of barre rectangle
    fretLabelSize: 8,
  },
  md: {
    stringSpacing: 16,
    fretSpacing: 20,
    dotRadius: 7,
    padTop: 22,
    padLeft: 12,
    padRight: 12,
    padBottom: 10,
    fontSize: 9,
    barreWidth: 10,
    fretLabelSize: 10,
  },
} as const

const NUM_STRINGS = 6
const NUM_FRETS = 5

const BRAND = '#ff9933'
const DARK_DOT = '#374151'
const WHITE = '#ffffff'
const MUTED_COLOR = '#9ca3af'
const OPEN_COLOR = '#6b7280'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChordDiagramCardProps {
  voicing: ChordVoicing | null
  chordSymbol: string          // e.g. "Cmaj7"
  degreeLabel?: string         // e.g. "I", "ii", "V"
  size?: 'sm' | 'md'
  isSelected?: boolean
  onClick?: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** x-coordinate of a guitar string in the diagram (s6=leftmost, s1=rightmost) */
function stringX(stringNum: number, padLeft: number, spacing: number): number {
  return padLeft + (6 - stringNum) * spacing
}

/** y-coordinate of the centre of a fret cell (0-indexed from baseFret) */
function fretCenterY(cellIndex: number, padTop: number, spacing: number): number {
  return padTop + (cellIndex + 0.5) * spacing
}

/** Whether a given (string, fret) is covered by any barre */
function isCoveredByBarre(
  stringNum: number,
  fret: number,
  barres: ChordVoicing['barres'],
): boolean {
  if (!barres) return false
  return barres.some(
    (b) =>
      b.fret === fret &&
      stringNum >= b.firstString &&
      stringNum <= b.lastString,
  )
}

// ─── SVG diagram ─────────────────────────────────────────────────────────────

function ChordSVG({
  voicing,
  size,
}: {
  voicing: ChordVoicing
  size: 'sm' | 'md'
}) {
  const cfg = CONFIG[size]
  const { stringSpacing: ss, fretSpacing: fs, dotRadius: dr, padTop, padLeft, padRight, padBottom, barreWidth } = cfg

  const svgWidth = padLeft + (NUM_STRINGS - 1) * ss + padRight
  const svgHeight = padTop + NUM_FRETS * fs + padBottom

  const { frets, baseFret, barres } = voicing

  // Fret lines y positions (0..NUM_FRETS inclusive = NUM_FRETS+1 lines)
  const fretLineYs = Array.from({ length: NUM_FRETS + 1 }, (_, i) => padTop + i * fs)
  // String x positions (string 6 = index 0 = leftmost)
  const stringXs = Array.from({ length: NUM_STRINGS }, (_, i) => stringX(i + 1 /* but we want s6=leftmost */, padLeft, ss))
  // Actually: string index i (0-based) corresponds to string (6-i), x = padLeft + i*ss
  // frets[0]=s6 (leftmost), frets[5]=s1 (rightmost)
  // So string at display column i has x = padLeft + i*ss, and its fret value = frets[5-i] (reversed!)
  // Wait let me reclarify:
  //   frets[0] = string 6 (low E) = leftmost column = x = padLeft + 0*ss
  //   frets[5] = string 1 (high e) = rightmost = x = padLeft + 5*ss
  // So display column i (0-5) corresponds to frets[i], at x = padLeft + i*ss
  // String number for column i = 6 - i

  function colX(col: number): number {
    return padLeft + col * ss
  }

  function stringNumForCol(col: number): number {
    return 6 - col
  }

  // Above-nut symbols (X or O)
  const openMuteSymbols = frets.map((f, col) => {
    const x = colX(col)
    const y = padTop - 5
    if (f === -1) {
      return (
        <text key={`mute-${col}`} x={x} y={y} textAnchor="middle" dominantBaseline="auto"
          fontSize={cfg.fontSize + 1} fill={MUTED_COLOR} fontWeight="600">
          ×
        </text>
      )
    }
    if (f === 0) {
      return (
        <circle key={`open-${col}`} cx={x} cy={y} r={3} fill="none"
          stroke={OPEN_COLOR} strokeWidth={1.5} />
      )
    }
    return null
  })

  // Nut (only when baseFret === 1)
  const nut = baseFret === 1 ? (
    <rect
      x={padLeft - 1}
      y={padTop - 3}
      width={(NUM_STRINGS - 1) * ss + 2}
      height={3}
      fill={DARK_DOT}
      rx={1}
    />
  ) : null

  // Fret number indicator (shown when baseFret > 1)
  const fretNumber = baseFret > 1 ? (
    <text
      x={padLeft + (NUM_STRINGS - 1) * ss + padRight - 2}
      y={padTop + 0.5 * fs}
      textAnchor="end"
      dominantBaseline="central"
      fontSize={cfg.fretLabelSize}
      fill={OPEN_COLOR}
    >
      {baseFret}fr
    </text>
  ) : null

  // Barre bars
  const barreElements = (barres ?? []).map((b, idx) => {
    const x1 = colX(6 - b.lastString)   // lastString = low-pitched = leftmost col
    const x2 = colX(6 - b.firstString)  // firstString = high-pitched = rightmost col
    const cy = fretCenterY(b.fret - baseFret, padTop, fs)
    const halfH = barreWidth
    return (
      <rect
        key={`barre-${idx}`}
        x={x1}
        y={cy - halfH / 2}
        width={x2 - x1}
        height={halfH}
        rx={halfH / 2}
        fill={BRAND}
        opacity={0.9}
      />
    )
  })

  // Finger dots
  const dotElements = frets.flatMap((fret, col) => {
    if (fret <= 0) return []
    const stringNum = stringNumForCol(col)
    if (isCoveredByBarre(stringNum, fret, barres)) return []

    const cx = colX(col)
    const cy = fretCenterY(fret - baseFret, padTop, fs)
    return [
      <circle key={`dot-${col}`} cx={cx} cy={cy} r={dr} fill={DARK_DOT} />,
    ]
  })

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="chord diagram"
      style={{ display: 'block' }}
    >
      {/* bg */}
      <rect width={svgWidth} height={svgHeight} fill="transparent" />

      {/* String lines */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => (
        <line
          key={`str-${i}`}
          x1={colX(i)} y1={padTop}
          x2={colX(i)} y2={padTop + NUM_FRETS * fs}
          stroke="#d1d5db" strokeWidth={1}
        />
      ))}

      {/* Fret lines */}
      {fretLineYs.map((y, i) => (
        <line
          key={`fret-${i}`}
          x1={padLeft} y1={y}
          x2={padLeft + (NUM_STRINGS - 1) * ss} y2={y}
          stroke="#d1d5db" strokeWidth={1}
        />
      ))}

      {nut}
      {barreElements}
      {dotElements}
      {openMuteSymbols}
      {fretNumber}
    </svg>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

export default function ChordDiagramCard({
  voicing,
  chordSymbol,
  degreeLabel,
  size = 'sm',
  isSelected = false,
  onClick,
}: ChordDiagramCardProps) {
  const isClickable = !!onClick

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={[
        'flex flex-col items-center gap-1 rounded-lg border px-2 pt-2 pb-2 transition-all',
        isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default',
        isSelected
          ? 'border-brand bg-brand/5 shadow-md ring-2 ring-brand/40'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-brand/60',
      ].join(' ')}
    >
      {/* Chord symbol */}
      <span className={`font-semibold text-gray-900 dark:text-white leading-none ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
        {chordSymbol}
      </span>

      {/* Degree label */}
      {degreeLabel && (
        <span className="text-xs text-brand font-medium leading-none">
          {degreeLabel}
        </span>
      )}

      {/* Diagram or placeholder */}
      {voicing ? (
        <ChordSVG voicing={voicing} size={size} />
      ) : (
        <NoVoicing size={size} />
      )}
    </button>
  )
}

// ─── No-voicing placeholder ───────────────────────────────────────────────────

function NoVoicing({ size }: { size: 'sm' | 'md' }) {
  const cfg = CONFIG[size]
  const w = cfg.padLeft + (NUM_STRINGS - 1) * cfg.stringSpacing + cfg.padRight
  const h = cfg.padTop + NUM_FRETS * cfg.fretSpacing + cfg.padBottom

  return (
    <div
      className="flex items-center justify-center rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
      style={{ width: w, height: h }}
    >
      <span className="text-xs text-center px-1 leading-tight">
        No open voicing
      </span>
    </div>
  )
}
