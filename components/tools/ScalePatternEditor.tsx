'use client'

import { useCallback, useState } from 'react'
import type { ScalePatternCell } from '@/data/scale-patterns'

const NUM_STRINGS = 6
const MIN_FRETS = 4
const MAX_FRETS = 8
const DEFAULT_FRETS = 6

const CELL_WIDTH = 42
const CELL_HEIGHT = 34
const PAD_TOP = 24
const PAD_LEFT = 36
const PAD_BOTTOM = 28
const PAD_RIGHT = 12
const DOT_RADIUS = 11
const HIT_RADIUS = 16
const BRAND_COLOR = '#ff9933'
const DOT_COLOR = '#374151'
const OPEN_FRET_FILL_LIGHT = '#e8e3db'
const OPEN_FRET_FILL_DARK = '#4b5563'

/** Row 0 = string 1 (high e), row 5 = string 6 (low E) */
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const

const STRING_STROKE: Record<number, number> = {
  6: 2.5, 5: 2.0, 4: 1.6, 3: 1.3, 2: 1.0, 1: 0.75,
}

function stringY(stringIndex: number): number {
  return PAD_TOP + stringIndex * CELL_HEIGHT
}

function fretX(fretIndex: number): number {
  return PAD_LEFT + fretIndex * CELL_WIDTH + CELL_WIDTH / 2
}

function createEmptyGrid(fretCount: number): ScalePatternCell[][] {
  return Array.from({ length: NUM_STRINGS }, () =>
    Array.from({ length: fretCount }, () => 0 as ScalePatternCell),
  )
}

function cycleCell(cell: ScalePatternCell): ScalePatternCell {
  if (cell === 0) return 'x'
  if (cell === 'x') return 'R'
  return 0
}

function formatCell(cell: ScalePatternCell): string {
  if (cell === 0) return '0'
  if (cell === 'x') return "'x'"
  return "'R'"
}

function formatPattern(grid: ScalePatternCell[][]): string {
  const rows = grid.map((row) => `  [${row.map(formatCell).join(', ')}]`).join(',\n')
  return `[\n${rows},\n],`
}

function parseCell(token: string): ScalePatternCell | null {
  const t = token.trim()
  if (t === '0') return 0
  if (t === "'x'" || t === '"x"' || t === 'x') return 'x'
  if (t === "'R'" || t === '"R"' || t === 'R') return 'R'
  return null
}

type ParseResult =
  | { ok: true; grid: ScalePatternCell[][]; fretCount: number }
  | { ok: false; error: string }

function parsePattern(text: string): ParseResult {
  // Match leaf arrays only — exclude nested `[` so the outer wrapper isn't captured
  const rowMatches = text.match(/\[[^[\]]*\]/g)
  if (!rowMatches) return { ok: false, error: 'No rows found — expected 6 bracketed arrays' }
  if (rowMatches.length !== NUM_STRINGS) {
    return {
      ok: false,
      error: `Expected ${NUM_STRINGS} string rows, found ${rowMatches.length}`,
    }
  }

  const grid: ScalePatternCell[][] = []
  let fretCount: number | null = null

  for (let rowIndex = 0; rowIndex < rowMatches.length; rowIndex++) {
    const inner = rowMatches[rowIndex].slice(1, -1)
    const tokens = inner.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
    if (tokens.length === 0) {
      return { ok: false, error: `Row ${rowIndex} is empty` }
    }
    if (fretCount === null) fretCount = tokens.length
    else if (tokens.length !== fretCount) {
      return {
        ok: false,
        error: `Row ${rowIndex} has ${tokens.length} frets; expected ${fretCount}`,
      }
    }
    if (fretCount < MIN_FRETS || fretCount > MAX_FRETS) {
      return { ok: false, error: `Fret width must be ${MIN_FRETS}–${MAX_FRETS}` }
    }

    const row: ScalePatternCell[] = []
    for (const token of tokens) {
      const cell = parseCell(token)
      if (cell === null) return { ok: false, error: `Invalid cell: ${token}` }
      row.push(cell)
    }
    grid.push(row)
  }

  return { ok: true, grid, fretCount: fretCount! }
}

export default function ScalePatternEditor() {
  const [fretCount, setFretCount] = useState(DEFAULT_FRETS)
  const [grid, setGrid] = useState<ScalePatternCell[][]>(() => createEmptyGrid(DEFAULT_FRETS))
  const [outputText, setOutputText] = useState(() => formatPattern(createEmptyGrid(DEFAULT_FRETS)))
  const [parseError, setParseError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const applyGrid = useCallback((nextGrid: ScalePatternCell[][]) => {
    setGrid(nextGrid)
    setFretCount(nextGrid[0]?.length ?? DEFAULT_FRETS)
    setOutputText(formatPattern(nextGrid))
    setParseError(null)
  }, [])

  const svgWidth = PAD_LEFT + fretCount * CELL_WIDTH + PAD_RIGHT
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM

  const handleCellClick = useCallback((stringIndex: number, fretIndex: number) => {
    setGrid((prev) => {
      const next = prev.map((row, rowIndex) =>
        rowIndex === stringIndex
          ? row.map((cell, colIndex) => (colIndex === fretIndex ? cycleCell(cell) : cell))
          : row,
      )
      setOutputText(formatPattern(next))
      setParseError(null)
      return next
    })
  }, [])

  const handleClear = useCallback(() => {
    applyGrid(createEmptyGrid(fretCount))
  }, [applyGrid, fretCount])

  const handleDecreaseFrets = useCallback(() => {
    if (fretCount <= MIN_FRETS) return
    const next = fretCount - 1
    setGrid((current) => {
      const nextGrid = current.map((row) => row.slice(0, next))
      setOutputText(formatPattern(nextGrid))
      setParseError(null)
      return nextGrid
    })
    setFretCount(next)
  }, [fretCount])

  const handleIncreaseFrets = useCallback(() => {
    if (fretCount >= MAX_FRETS) return
    const next = fretCount + 1
    setGrid((current) => {
      const nextGrid = current.map((row) => [...row, 0])
      setOutputText(formatPattern(nextGrid))
      setParseError(null)
      return nextGrid
    })
    setFretCount(next)
  }, [fretCount])

  const handleOutputChange = useCallback((value: string) => {
    setOutputText(value)
    const parsed = parsePattern(value)
    if (parsed.ok) {
      setGrid(parsed.grid)
      setFretCount(parsed.fretCount)
      setParseError(null)
    } else {
      setParseError(parsed.error)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [outputText])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scale Pattern Editor</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Click a cell to cycle: empty → x → R → empty. Edit the matrix below to update the grid.
          Row 0 is high e; row 5 is low E.
        </p>
      </header>

      <section className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fret width</span>
            <button
              type="button"
              onClick={handleDecreaseFrets}
              disabled={fretCount <= MIN_FRETS}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Decrease fret width"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">
              {fretCount}
            </span>
            <button
              type="button"
              onClick={handleIncreaseFrets}
              disabled={fretCount >= MAX_FRETS}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Increase fret width"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Clear
          </button>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ml-auto">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500" />
              empty
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-700 dark:bg-gray-200" />
              x
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-brand" />
              R
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={`Scale pattern editor, ${fretCount} frets`}
            className="block"
          >
            <rect width={svgWidth} height={svgHeight} fill="#faf9f7" className="dark:hidden" />
            <rect width={svgWidth} height={svgHeight} fill="#1f2937" className="hidden dark:block" />

            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={CELL_WIDTH}
              height={(NUM_STRINGS - 1) * CELL_HEIGHT}
              fill={OPEN_FRET_FILL_LIGHT}
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

            {Array.from({ length: NUM_STRINGS }, (_, stringIndex) => {
              const stringNumber = stringIndex + 1
              return (
                <line
                  key={`string-${stringNumber}`}
                  x1={PAD_LEFT}
                  y1={stringY(stringIndex)}
                  x2={svgWidth - PAD_RIGHT}
                  y2={stringY(stringIndex)}
                  stroke="#9ca3af"
                  strokeWidth={STRING_STROKE[stringNumber]}
                />
              )
            })}

            {Array.from({ length: fretCount + 1 }, (_, fretLine) => (
              <line
                key={`fret-line-${fretLine}`}
                x1={PAD_LEFT + fretLine * CELL_WIDTH}
                y1={PAD_TOP}
                x2={PAD_LEFT + fretLine * CELL_WIDTH}
                y2={PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT}
                stroke={fretLine === 0 ? '#374151' : '#d1d5db'}
                strokeWidth={fretLine === 0 ? 3 : 1}
                className={fretLine === 0 ? 'dark:stroke-gray-300' : 'dark:stroke-gray-600'}
              />
            ))}

            {STRING_LABELS.map((label, stringIndex) => (
              <text
                key={`label-${label}`}
                x={PAD_LEFT - 6}
                y={stringY(stringIndex)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={9}
                fontWeight="600"
                fill="#6b7280"
              >
                {label}
              </text>
            ))}

            {Array.from({ length: fretCount }, (_, fretIndex) => (
              <text
                key={`fret-label-${fretIndex}`}
                x={fretX(fretIndex)}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {fretIndex}
              </text>
            ))}

            {grid.map((row, stringIndex) =>
              row.map((cell, fretIndex) => (
                <g key={`cell-${stringIndex}-${fretIndex}`}>
                  <circle
                    cx={fretX(fretIndex)}
                    cy={stringY(stringIndex)}
                    r={HIT_RADIUS}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => handleCellClick(stringIndex, fretIndex)}
                  />
                  {cell !== 0 && (
                    <circle
                      cx={fretX(fretIndex)}
                      cy={stringY(stringIndex)}
                      r={DOT_RADIUS}
                      fill={cell === 'R' ? BRAND_COLOR : DOT_COLOR}
                      className={cell === 'x' ? 'dark:fill-gray-300' : undefined}
                      pointerEvents="none"
                    />
                  )}
                </g>
              )),
            )}
          </svg>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Output</h2>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <textarea
          value={outputText}
          onChange={(event) => handleOutputChange(event.target.value)}
          rows={Math.max(8, NUM_STRINGS + 3)}
          spellCheck={false}
          className={[
            'w-full font-mono text-sm rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 resize-y',
            parseError
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600',
          ].join(' ')}
          aria-label="Scale pattern matrix"
          aria-invalid={parseError ? true : undefined}
        />
        {parseError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {parseError}
          </p>
        )}
      </section>
    </div>
  )
}
