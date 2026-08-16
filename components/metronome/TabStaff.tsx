'use client'

import type { GuideNote, NoteDuration } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'
import type { Tuning } from '@/lib/guitar-tuning'

// ── Shared geometry / labels ─────────────────────────────────────────────────

export const STRING_COUNT = 6

export const SUB_LABELS: Record<NoteDuration, string[]> = {
  quarter:   [''],
  eighth:    ['', '+'],
  sixteenth: ['', 'e', '+', 'a'],
  triplet:   ['', 'trip', 'let'],
}

export const SUB_TITLES: Record<NoteDuration, string[]> = {
  quarter:   ['on the beat'],
  eighth:    ['on the beat', 'the "and"'],
  sixteenth: ['on the beat', '"e"', 'the "and"', '"a"'],
  triplet:   ['1st triplet', '2nd triplet', '3rd triplet'],
}

export interface Cursor {
  guitarString: number // 1 (high e) … 6 (low E)
  bar: number
  beat: number
  sub: number
}

export interface Column {
  bar: number
  beat: number
  sub: number
  isBarStart: boolean
  isBeatStart: boolean
}

export function buildColumns(bars: number, beatsPerBar: number, subCount: number): Column[] {
  const cols: Column[] = []
  for (let bar = 1; bar <= bars; bar++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      for (let sub = 0; sub < subCount; sub++) {
        cols.push({
          bar,
          beat,
          sub,
          isBarStart: beat === 1 && sub === 0,
          isBeatStart: sub === 0,
        })
      }
    }
  }
  return cols
}

// ── Component ────────────────────────────────────────────────────────────────

interface TabStaffProps {
  bars: number
  beatsPerBar: number
  resolution: NoteDuration
  guideNotes: GuideNote[]
  tuning: Tuning
  /** Highlighted editing position. */
  cursor?: Cursor | null
  /** When provided, slots are clickable. */
  onSlotClick?: (guitarString: number, col: Column) => void
  /** Slightly smaller cells for previews. */
  compact?: boolean
  /** Cursor style for empty slots when not interactive. */
  mutedCursor?: boolean
}

export default function TabStaff({
  bars,
  beatsPerBar,
  resolution,
  guideNotes,
  tuning,
  cursor,
  onSlotClick,
  compact = false,
  mutedCursor = false,
}: TabStaffProps) {
  const subCount = SUBDIVISIONS_PER_BEAT[resolution]
  const subLabels = SUB_LABELS[resolution]
  const subTitles = SUB_TITLES[resolution]

  const COL_W = compact ? 22 : 26
  const ROW_H = compact ? 22 : 26
  const LABEL_W = 26
  const BAR_GAP = 10

  const columns = buildColumns(bars, beatsPerBar, subCount)
  const staffWidth = LABEL_W + columns.length * COL_W + (bars - 1) * BAR_GAP

  function noteAt(guitarString: number, bar: number, beat: number, sub: number): GuideNote | undefined {
    return guideNotes.find(
      (n) =>
        n.guitarString === guitarString &&
        n.bar === bar &&
        n.beat === beat &&
        (n.subdivision ?? 0) === sub,
    )
  }

  function labelForRow(row: number): string {
    // row 0 = top = high e = string 1 → tuning label index 5
    return tuning.labels[5 - row]
  }

  const interactive = !!onSlotClick

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-[#fffdf8] dark:bg-gray-900">
      <div className="inline-block p-3" style={{ minWidth: staffWidth + 24 }}>
        {Array.from({ length: STRING_COUNT }, (_, row) => {
          const guitarString = row + 1 // row 0 = high e = string 1
          return (
            <div key={row} className="flex items-center" style={{ height: ROW_H }}>
              <div
                className="shrink-0 text-right pr-1.5 font-mono font-bold text-gray-400 dark:text-gray-500 text-xs"
                style={{ width: LABEL_W }}
              >
                {labelForRow(row)}
              </div>
              <div className="flex">
                {columns.map((col, ci) => {
                  const gn = noteAt(guitarString, col.bar, col.beat, col.sub)
                  const isCursor =
                    cursor?.guitarString === guitarString &&
                    cursor?.bar === col.bar &&
                    cursor?.beat === col.beat &&
                    cursor?.sub === col.sub
                  const muted = gn ? !gn.enabled : false
                  const slotStyle = {
                    width: COL_W,
                    height: ROW_H,
                    marginLeft: col.isBarStart && ci !== 0 ? BAR_GAP : 0,
                  }
                  const title =
                    `String ${guitarString}, bar ${col.bar}, beat ${col.beat} ${subTitles[col.sub]}` +
                    (gn ? ` — fret ${gn.fret}${muted ? ' (muted)' : ''}` : '')

                  const inner = (
                    <>
                      {/* string line */}
                      <span
                        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-300 dark:bg-gray-600"
                        style={{ height: 1 }}
                      />
                      {/* bar line */}
                      {col.isBarStart && ci !== 0 && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 bg-gray-400 dark:bg-gray-500"
                          style={{ left: -Math.round(BAR_GAP / 2), width: 2, height: ROW_H + 4 }}
                        />
                      )}
                      {/* cursor highlight */}
                      {isCursor && (
                        <span
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded border-2 border-brand"
                          style={{ height: ROW_H - 2 }}
                        />
                      )}
                      {/* fret number */}
                      {gn && (
                        <span
                          className={`relative z-10 px-0.5 rounded font-bold leading-none ${
                            compact ? 'text-[11px]' : 'text-[13px]'
                          } ${
                            muted
                              ? 'text-gray-400 dark:text-gray-500 bg-[#fffdf8] dark:bg-gray-900'
                              : 'text-brand bg-[#fffdf8] dark:bg-gray-900'
                          }`}
                        >
                          {muted ? `(${gn.fret})` : gn.fret}
                        </span>
                      )}
                    </>
                  )

                  return interactive ? (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => onSlotClick!(guitarString, col)}
                      title={title}
                      aria-label={`String ${guitarString} bar ${col.bar} beat ${col.beat} ${subTitles[col.sub]}`}
                      className="relative flex items-center justify-center font-mono select-none"
                      style={{ ...slotStyle, cursor: mutedCursor && !gn ? 'default' : 'pointer' }}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div
                      key={ci}
                      title={title}
                      className="relative flex items-center justify-center font-mono select-none"
                      style={slotStyle}
                    >
                      {inner}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Beat ruler */}
        <div className="flex items-center mt-1" style={{ height: 16 }}>
          <div className="shrink-0" style={{ width: LABEL_W }} />
          <div className="flex">
            {columns.map((col, ci) => (
              <div
                key={ci}
                className="text-center font-mono text-gray-400 dark:text-gray-500"
                style={{
                  width: COL_W,
                  marginLeft: col.isBarStart && ci !== 0 ? BAR_GAP : 0,
                  fontSize: col.isBeatStart ? 11 : 9,
                }}
              >
                {col.isBeatStart ? col.beat : subLabels[col.sub]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
