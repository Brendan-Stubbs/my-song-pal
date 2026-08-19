'use client';

import { useCallback, useMemo, useState } from 'react';
import { Scale, Note } from 'tonal';
import type { ScalePatternCell } from '@/data/scale-patterns';

const NUM_STRINGS = 6;
const MIN_FRETS = 4;
const MAX_FRETS = 8;
const DEFAULT_FRETS = 6;

// Validation uses standard tuning + C as reference key (key-agnostic: intervals are what matter)
const VALIDATION_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']; // index 0 = string 6 (low E)
const VALIDATION_KEY = 'C';
const STRING_PRIORITY = [6, 5, 4, 3, 2, 1];

const AVAILABLE_SCALES = [
  'major',
  'minor',
  'pentatonic major',
  'pentatonic minor',
  'blues',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic minor',
  'melodic minor',
] as const;

type AvailableScale = (typeof AVAILABLE_SCALES)[number];

// ── Validation helpers ────────────────────────────────────────────────────────

function toSharp(pc: string): string {
  if (pc.includes('b')) {
    const enh = Note.enharmonic(pc);
    return enh || pc;
  }
  return pc;
}

function getNoteAtFret(stringNumber: number, fret: number): string {
  const openNote = VALIDATION_TUNING[6 - stringNumber];
  const midi = Note.midi(openNote!);
  if (midi == null) return '';
  return toSharp(Note.pitchClass(Note.fromMidi(midi + fret)));
}

function fretsForKeyOnString(stringNumber: number, key: string): number[] {
  const keyPc = toSharp(Note.pitchClass(key));
  return Array.from({ length: 25 }, (_, f) => f).filter(
    (f) => getNoteAtFret(stringNumber, f) === keyPc,
  );
}

/**
 * Resolve the rootFret (absolute fret of the pattern's column 0) by finding
 * the highest-priority string that contains an R cell, then anchoring on the
 * nearest occurrence of the key note on that string.
 * Returns null if the pattern has no R cells.
 */
function resolveRootFret(grid: ScalePatternCell[][]): number | null {
  const rByString = new Map<number, number[]>();
  for (let ri = 0; ri < grid.length; ri++) {
    const stringNum = ri + 1;
    for (let fi = 0; fi < grid[ri].length; fi++) {
      if (grid[ri][fi] === 'R') {
        const list = rByString.get(stringNum) ?? [];
        list.push(fi);
        rByString.set(stringNum, list);
      }
    }
  }

  let best: number | null = null;
  for (const stringNum of STRING_PRIORITY) {
    const fretOffsets = rByString.get(stringNum);
    if (!fretOffsets) continue;
    for (const fo of fretOffsets) {
      for (const f of fretsForKeyOnString(stringNum, VALIDATION_KEY)) {
        const r = f - fo;
        if (r >= 0 && r <= 15 && (best == null || r < best)) best = r;
      }
    }
    if (best != null) break;
  }
  return best;
}

/**
 * Returns the set of invalid cell keys ("stringIndex-fretIndex") for cells
 * that are non-zero but whose note is outside the given scale.
 * Returns null if validation cannot run (no scale selected or no R cell).
 */
function computeInvalidCells(
  grid: ScalePatternCell[][],
  scale: AvailableScale | null,
): Set<string> | null {
  if (!scale) return null;
  const rootFret = resolveRootFret(grid);
  if (rootFret == null) return null;

  const scaleNotes = Scale.get(`${VALIDATION_KEY} ${scale}`).notes.map(toSharp);
  const rootNote = toSharp(Note.pitchClass(VALIDATION_KEY));
  const invalid = new Set<string>();

  for (let ri = 0; ri < grid.length; ri++) {
    const stringNum = ri + 1;
    for (let fi = 0; fi < grid[ri].length; fi++) {
      const cell = grid[ri][fi];
      if (cell === 0) continue;
      const fret = rootFret + fi;
      const note = getNoteAtFret(stringNum, fret);
      // R cells must produce the root note; x cells must be in the scale
      const isInvalid =
        cell === 'R' ? note !== rootNote : !scaleNotes.includes(note);
      if (isInvalid) invalid.add(`${ri}-${fi}`);
    }
  }
  return invalid;
}

const CELL_WIDTH = 42;
const CELL_HEIGHT = 34;
const PAD_TOP = 24;
const PAD_LEFT = 36;
const PAD_BOTTOM = 28;
const PAD_RIGHT = 12;
const DOT_RADIUS = 11;
const HIT_RADIUS = 16;
const BRAND_COLOR = '#ff9933';
const DOT_COLOR = '#44403c';
const OPEN_FRET_FILL_LIGHT = '#e8e3db';
const OPEN_FRET_FILL_DARK = '#57534e';

/** Row 0 = string 1 (high e), row 5 = string 6 (low E) */
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'] as const;

const STRING_STROKE: Record<number, number> = {
  6: 2.5,
  5: 2.0,
  4: 1.6,
  3: 1.3,
  2: 1.0,
  1: 0.75,
};

function stringY(stringIndex: number): number {
  return PAD_TOP + stringIndex * CELL_HEIGHT;
}

function fretX(fretIndex: number): number {
  return PAD_LEFT + fretIndex * CELL_WIDTH + CELL_WIDTH / 2;
}

function createEmptyGrid(fretCount: number): ScalePatternCell[][] {
  return Array.from({ length: NUM_STRINGS }, () =>
    Array.from({ length: fretCount }, () => 0 as ScalePatternCell),
  );
}

function cycleCell(cell: ScalePatternCell): ScalePatternCell {
  if (cell === 0) return 'x';
  if (cell === 'x') return 'R';
  return 0 as ScalePatternCell;
}

function formatCell(cell: ScalePatternCell): string {
  if (cell === 0) return '0';
  if (cell === 'x') return "'x'";
  return "'R'";
}

function formatPattern(grid: ScalePatternCell[][]): string {
  const rows = grid
    .map((row) => `  [${row.map(formatCell).join(', ')}]`)
    .join(',\n');
  return `[\n${rows},\n],`;
}

function parseCell(token: string): ScalePatternCell | null {
  const t = token.trim();
  if (t === '0') return 0 as ScalePatternCell;
  if (t === "'x'" || t === '"x"' || t === 'x') return 'x';
  if (t === "'R'" || t === '"R"' || t === 'R') return 'R';
  return null;
}

type ParseResult =
  | { ok: true; grid: ScalePatternCell[][]; fretCount: number }
  | { ok: false; error: string };

function parsePattern(text: string): ParseResult {
  // Match leaf arrays only — exclude nested `[` so the outer wrapper isn't captured
  const rowMatches = text.match(/\[[^[\]]*\]/g);
  if (!rowMatches)
    return { ok: false, error: 'No rows found — expected 6 bracketed arrays' };
  if (rowMatches.length !== NUM_STRINGS) {
    return {
      ok: false,
      error: `Expected ${NUM_STRINGS} string rows, found ${rowMatches.length}`,
    };
  }

  const grid: ScalePatternCell[][] = [];
  let fretCount: number | null = null;

  for (let rowIndex = 0; rowIndex < rowMatches.length; rowIndex++) {
    const inner = rowMatches[rowIndex].slice(1, -1);
    const tokens = inner
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (tokens.length === 0) {
      return { ok: false, error: `Row ${rowIndex} is empty` };
    }
    if (fretCount === null) fretCount = tokens.length;
    else if (tokens.length !== fretCount) {
      return {
        ok: false,
        error: `Row ${rowIndex} has ${tokens.length} frets; expected ${fretCount}`,
      };
    }
    if (fretCount < MIN_FRETS || fretCount > MAX_FRETS) {
      return {
        ok: false,
        error: `Fret width must be ${MIN_FRETS}–${MAX_FRETS}`,
      };
    }

    const row: ScalePatternCell[] = [];
    for (const token of tokens) {
      const cell = parseCell(token);
      if (cell === null) return { ok: false, error: `Invalid cell: ${token}` };
      row.push(cell);
    }
    grid.push(row);
  }

  return { ok: true, grid, fretCount: fretCount! };
}

export default function ScalePatternEditor() {
  const [fretCount, setFretCount] = useState(DEFAULT_FRETS);
  const [grid, setGrid] = useState<ScalePatternCell[][]>(() =>
    createEmptyGrid(DEFAULT_FRETS),
  );
  const [outputText, setOutputText] = useState(() =>
    formatPattern(createEmptyGrid(DEFAULT_FRETS)),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedScale, setSelectedScale] = useState<AvailableScale | null>(
    null,
  );

  const invalidCells = useMemo(
    () => computeInvalidCells(grid, selectedScale),
    [grid, selectedScale],
  );

  const validationSummary = useMemo(() => {
    if (!selectedScale) return null;
    if (invalidCells === null)
      return {
        type: 'info' as const,
        message: 'Add an R cell to enable note validation.',
      };
    if (invalidCells.size === 0)
      return { type: 'success' as const, message: 'All notes are in scale.' };
    return {
      type: 'error' as const,
      message: `${invalidCells.size} cell${invalidCells.size === 1 ? '' : 's'} out of scale.`,
    };
  }, [selectedScale, invalidCells]);

  const applyGrid = useCallback((nextGrid: ScalePatternCell[][]) => {
    setGrid(nextGrid);
    setFretCount(nextGrid[0]?.length ?? DEFAULT_FRETS);
    setOutputText(formatPattern(nextGrid));
    setParseError(null);
  }, []);

  const svgWidth = PAD_LEFT + fretCount * CELL_WIDTH + PAD_RIGHT;
  const svgHeight = PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT + PAD_BOTTOM;

  const handleCellClick = useCallback(
    (stringIndex: number, fretIndex: number) => {
      setGrid((prev) => {
        const next = prev.map((row, rowIndex) =>
          rowIndex === stringIndex
            ? row.map((cell, colIndex) =>
                colIndex === fretIndex ? cycleCell(cell) : cell,
              )
            : row,
        );
        setOutputText(formatPattern(next));
        setParseError(null);
        return next;
      });
    },
    [],
  );

  const handleClear = useCallback(() => {
    applyGrid(createEmptyGrid(fretCount));
  }, [applyGrid, fretCount]);

  const handleDecreaseFrets = useCallback(() => {
    if (fretCount <= MIN_FRETS) return;
    const next = fretCount - 1;
    setGrid((current) => {
      const nextGrid = current.map((row) => row.slice(0, next));
      setOutputText(formatPattern(nextGrid));
      setParseError(null);
      return nextGrid;
    });
    setFretCount(next);
  }, [fretCount]);

  const handleIncreaseFrets = useCallback(() => {
    if (fretCount >= MAX_FRETS) return;
    const next = fretCount + 1;
    setGrid((current) => {
      const nextGrid = current.map((row) => [...row, 0 as ScalePatternCell]);
      setOutputText(formatPattern(nextGrid));
      setParseError(null);
      return nextGrid;
    });
    setFretCount(next);
  }, [fretCount]);

  const handleOutputChange = useCallback((value: string) => {
    setOutputText(value);
    const parsed = parsePattern(value);
    if (parsed.ok) {
      setGrid(parsed.grid);
      setFretCount(parsed.fretCount);
      setParseError(null);
    } else {
      setParseError(parsed.error);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [outputText]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Scale Pattern Editor
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Click a cell to cycle: empty → x → R → empty. Edit the matrix below to
          update the grid. Row 0 is high e; row 5 is low E.
        </p>
      </header>

      <section className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="scale-select"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            >
              Validate scale
            </label>
            <select
              id="scale-select"
              value={selectedScale ?? ''}
              onChange={(e) =>
                setSelectedScale((e.target.value as AvailableScale) || null)
              }
              className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-surface text-gray-900 dark:text-gray-100 px-2 py-1"
            >
              <option value="">— none —</option>
              {AVAILABLE_SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-gray-200 dark:bg-gray-600" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fret width
            </span>
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
              <span className="w-3 h-3 rounded-full bg-brand" />R
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
            <rect
              width={svgWidth}
              height={svgHeight}
              fill="#faf9f7"
              className="dark:hidden"
            />
            <rect
              width={svgWidth}
              height={svgHeight}
              fill="#211e1b"
              className="hidden dark:block"
            />

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
              const stringNumber = stringIndex + 1;
              return (
                <line
                  key={`string-${stringNumber}`}
                  x1={PAD_LEFT}
                  y1={stringY(stringIndex)}
                  x2={svgWidth - PAD_RIGHT}
                  y2={stringY(stringIndex)}
                  stroke="#a8a29e"
                  strokeWidth={STRING_STROKE[stringNumber]}
                />
              );
            })}

            {Array.from({ length: fretCount + 1 }, (_, fretLine) => (
              <line
                key={`fret-line-${fretLine}`}
                x1={PAD_LEFT + fretLine * CELL_WIDTH}
                y1={PAD_TOP}
                x2={PAD_LEFT + fretLine * CELL_WIDTH}
                y2={PAD_TOP + (NUM_STRINGS - 1) * CELL_HEIGHT}
                stroke={fretLine === 0 ? '#44403c' : '#d6d3d1'}
                strokeWidth={fretLine === 0 ? 3 : 1}
                className={
                  fretLine === 0
                    ? 'dark:stroke-gray-300'
                    : 'dark:stroke-gray-600'
                }
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
                fill="#78716c"
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
                fill="#78716c"
              >
                {fretIndex}
              </text>
            ))}

            {grid.map((row, stringIndex) =>
              row.map((cell, fretIndex) => {
                const isInvalid =
                  invalidCells?.has(`${stringIndex}-${fretIndex}`) ?? false;
                const dotFill = isInvalid
                  ? '#ef4444'
                  : cell === 'R'
                    ? BRAND_COLOR
                    : DOT_COLOR;
                return (
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
                        fill={dotFill}
                        className={
                          !isInvalid && cell === 'x'
                            ? 'dark:fill-gray-300'
                            : undefined
                        }
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              }),
            )}
          </svg>
        </div>

        {validationSummary && (
          <p
            className={[
              'text-sm font-medium',
              validationSummary.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : validationSummary.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
            role={validationSummary.type === 'error' ? 'alert' : undefined}
          >
            {validationSummary.message}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Output
          </h2>
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
            'w-full font-mono text-sm rounded-lg border bg-surface text-gray-900 dark:text-gray-100 p-4 resize-y',
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
  );
}
