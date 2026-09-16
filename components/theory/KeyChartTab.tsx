'use client'

import { useMemo, useState } from 'react'
import {
  CHART_SCALES,
  CHART_TONICS,
  buildKeyChordChart,
  prettyNote,
  type ChartRow,
  type ChordQuality,
  type ChordRole,
} from '@/lib/key-chord-chart'

// ── Styling ───────────────────────────────────────────────────────────────────

/** Row-label colours, matching the quality palette used on the Music tab. */
const QUALITY_LABEL: Record<ChordQuality, string> = {
  major: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  minor: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
  diminished: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
  augmented: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
}

/** Filled-cell colours. The root is solid so the chord's home column pops. */
const ROLE_CELL: Record<ChordRole, string> = {
  root: 'bg-brand text-on-brand font-bold',
  third: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
  fifth: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
  seventh: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
}

const ROLE_TITLE: Record<ChordRole, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
}

const selectClass =
  'rounded-md border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand'
const labelClass = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide'

// ── Table ─────────────────────────────────────────────────────────────────────

/** Left border marking where the scale starts over an octave up. */
const OCTAVE_EDGE = 'border-l border-dashed border-gray-300 dark:border-gray-600'

function ChartCell({
  cell,
  octaveEdge,
}: {
  cell: ChartRow['cells'][number]
  octaveEdge: boolean
}) {
  const edge = octaveEdge ? ` ${OCTAVE_EDGE}` : ''
  if (!cell) {
    return (
      <td className={`px-1.5 py-1 text-center text-gray-200 dark:text-gray-700 select-none${edge}`}>
        ·
      </td>
    )
  }
  return (
    <td className={`px-1.5 py-1 text-center${edge}`}>
      <span
        title={ROLE_TITLE[cell.role]}
        className={`inline-flex min-w-[2.25rem] items-center justify-center rounded px-1.5 py-1 text-sm font-semibold ${ROLE_CELL[cell.role]}`}
      >
        {cell.note}
      </span>
    </td>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KeyChartTab() {
  const [tonic, setTonic] = useState<string>('C')
  const [scaleId, setScaleId] = useState<string>('major')
  const [sevenths, setSevenths] = useState(false)

  const chart = useMemo(
    () => buildKeyChordChart(tonic, scaleId, { sevenths }),
    [tonic, scaleId, sevenths],
  )

  const scaleLabel = CHART_SCALES.find((s) => s.id === scaleId)?.label ?? scaleId

  return (
    <div className="space-y-6">
      {/* Section heading */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chords in a Key</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Every diatonic chord in the key, laid over the notes of the scale. Read a row to see
          which notes a chord is made of; read a column to see every chord that contains that note.
          Chords that climb past the 7th carry on into the octave above, so every chord ascends
          left to right instead of wrapping back to the start.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="key-chart-tonic" className={labelClass}>Key</label>
          <select
            id="key-chart-tonic"
            value={tonic}
            onChange={(e) => setTonic(e.target.value)}
            className={selectClass}
          >
            {CHART_TONICS.map((t) => (
              <option key={t} value={t}>{prettyNote(t)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="key-chart-scale" className={labelClass}>Scale</label>
          <select
            id="key-chart-scale"
            value={scaleId}
            onChange={(e) => setScaleId(e.target.value)}
            className={selectClass}
          >
            {CHART_SCALES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClass}>Chords</span>
          <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
            {[
              { label: 'Triads', value: false },
              { label: '7th chords', value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSevenths(opt.value)}
                aria-pressed={sevenths === opt.value}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  sevenths === opt.value
                    ? 'bg-brand text-on-brand'
                    : 'bg-warm-panel dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!chart && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          {scaleLabel} isn&apos;t a seven-note scale, so it has no diatonic chords to chart.
        </p>
      )}

      {chart && (
        <>
          {/* Spelling hint — e.g. G♭ minor needs double flats, F♯ minor doesn't */}
          {chart.awkwardSpelling && (
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              {chart.tonic} {scaleLabel.toLowerCase()} needs double accidentals to write out. The
              same key is usually spelled{' '}
              <button
                type="button"
                onClick={() => setTonic(chart.awkwardSpelling!.suggestedTonic)}
                className="font-semibold underline underline-offset-2"
              >
                {prettyNote(chart.awkwardSpelling.suggestedTonic)} {scaleLabel.toLowerCase()}
              </button>.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="border-collapse">
              <caption className="sr-only">
                Diatonic {sevenths ? 'seventh chords' : 'triads'} of {chart.tonic} {scaleLabel},
                with each chord&apos;s notes shown under the scale degree they occupy
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-surface text-left pr-4 pb-2">
                    <span className="sr-only">Chord</span>
                  </th>
                  {chart.columns.map((col, i) => {
                    const octaveEdge = col.octave > 0 && chart.columns[i - 1]?.octave === 0
                    return (
                      <th
                        key={col.index}
                        scope="col"
                        className={`px-1.5 pb-2 text-center${octaveEdge ? ` ${OCTAVE_EDGE}` : ''}`}
                      >
                        <span
                          className={`block text-sm font-bold ${
                            col.octave > 0
                              ? 'text-gray-400 dark:text-gray-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {col.note}
                        </span>
                        <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                          {col.degree}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {chart.rows.map((row) => (
                  <tr key={row.degree}>
                    <th scope="row" className="sticky left-0 bg-surface text-left pr-4 py-1">
                      <span
                        className={`inline-flex items-baseline gap-2 rounded-lg border px-2.5 py-1 ${QUALITY_LABEL[row.quality]}`}
                      >
                        <span className="text-xs font-semibold opacity-70 w-12 shrink-0">
                          {row.roman}
                        </span>
                        <span className="text-sm font-bold whitespace-nowrap">{row.symbol}</span>
                      </span>
                    </th>
                    {row.cells.map((cell, i) => (
                      <ChartCell
                        key={i}
                        cell={cell}
                        octaveEdge={
                          chart.columns[i].octave > 0 && chart.columns[i - 1]?.octave === 0
                        }
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-brand" /> Root of the chord
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
              {sevenths ? '3rd, 5th, 7th' : '3rd and 5th'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-0 h-4 ${OCTAVE_EDGE}`} />
              Columns right of this line are the octave above
            </span>
            {(['major', 'minor', 'diminished', 'augmented'] as ChordQuality[])
              .filter((q) => chart.rows.some((r) => r.quality === q))
              .map((q) => (
                <span key={q} className="inline-flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded border ${QUALITY_LABEL[q]}`} />
                  <span className="capitalize">{q}</span>
                </span>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
