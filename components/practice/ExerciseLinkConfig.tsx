'use client'

import { useMemo } from 'react'
import type { ExerciseLink, ExerciseLinkKind } from '@/lib/practice-storage'
import { EXERCISE_LINK_LABELS } from '@/lib/practice-storage'
import type { MetronomeLoop } from '@/types/metronome-loop'
import type { ChordQuality } from '@/data/open-chord-voicings'
import { buildChordSymbol, qualityLabel } from '@/data/open-chord-voicings'
import { getAvailableKeys, getAvailableScales } from '@/lib/scales'
import { Segmented } from '@/components/ui/Segmented'

const CHORD_QUALITIES: ChordQuality[] = ['major', 'minor', '7', 'maj7', 'min7', 'sus2', 'sus4', 'dim']

const KIND_ORDER: ExerciseLinkKind[] = [
  'free',
  'metronome',
  'scale',
  'chord-drill',
  'ear-training',
  'fretboard-trainer',
]

function defaultLinkFor(kind: ExerciseLinkKind, loops: MetronomeLoop[]): ExerciseLink | undefined {
  switch (kind) {
    case 'free':
      return undefined
    case 'metronome':
      return { kind: 'metronome', loopId: loops[0]?.id ?? '' }
    case 'scale':
      return { kind: 'scale', root: 'A', scaleId: 'pentatonic minor' }
    case 'chord-drill':
      return { kind: 'chord-drill', chords: [], changesPerMin: 30 }
    case 'ear-training':
      return { kind: 'ear-training', mode: 'intervals' }
    case 'fretboard-trainer':
      return { kind: 'fretboard-trainer' }
  }
}

const selectClass =
  'text-sm bg-surface-2 border border-line rounded-md px-2 py-1.5 outline-none focus:border-brand transition-colors text-ink'

interface Props {
  link: ExerciseLink | undefined
  onChange: (link: ExerciseLink | undefined) => void
  loops: MetronomeLoop[]
}

export default function ExerciseLinkConfig({ link, onChange, loops }: Props) {
  const keys = useMemo(() => getAvailableKeys(), [])
  const scales = useMemo(() => getAvailableScales(), [])
  const kind: ExerciseLinkKind = link?.kind ?? 'free'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Tool</span>
        <select
          aria-label="Attach a tool"
          value={kind}
          onChange={(e) => onChange(defaultLinkFor(e.target.value as ExerciseLinkKind, loops))}
          className={selectClass}
        >
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {EXERCISE_LINK_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Metronome loop */}
      {link?.kind === 'metronome' && (
        loops.length === 0 ? (
          <p className="text-xs text-ink-muted">
            No saved loops yet — create one in the Metronome tab first.
          </p>
        ) : (
          <div className="space-y-2">
            <select
              aria-label="Metronome loop"
              value={link.loopId}
              onChange={(e) => onChange({ ...link, loopId: e.target.value })}
              className={selectClass}
            >
              {loops.map((loop) => (
                <option key={loop.id} value={loop.id}>
                  {loop.name} · {loop.targetBpm} BPM
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={!!link.bpmRamp}
                onChange={(e) =>
                  onChange({
                    ...link,
                    bpmRamp: e.target.checked ? { fromPct: 80, toPct: 100 } : undefined,
                  })
                }
                className="accent-[var(--brand)]"
              />
              Ramp tempo over the exercise
            </label>
            {link.bpmRamp && (
              <div className="flex items-center gap-2 text-xs text-ink-muted pl-6">
                from
                <PctInput
                  value={link.bpmRamp.fromPct}
                  onChange={(fromPct) => onChange({ ...link, bpmRamp: { ...link.bpmRamp!, fromPct } })}
                />
                to
                <PctInput
                  value={link.bpmRamp.toPct}
                  onChange={(toPct) => onChange({ ...link, bpmRamp: { ...link.bpmRamp!, toPct } })}
                />
                of target BPM
              </div>
            )}
          </div>
        )
      )}

      {/* Scale */}
      {link?.kind === 'scale' && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="Scale root"
            value={link.root}
            onChange={(e) => onChange({ ...link, root: e.target.value })}
            className={selectClass}
          >
            {keys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            aria-label="Scale type"
            value={link.scaleId}
            onChange={(e) => onChange({ ...link, scaleId: e.target.value })}
            className={selectClass}
          >
            {scales.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Chord drill */}
      {link?.kind === 'chord-drill' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {link.chords.length === 0 && (
              <span className="text-xs text-ink-muted">Add chords to cycle through</span>
            )}
            {link.chords.map((c, i) => (
              <span
                key={`${c.root}-${c.quality}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-brand/15 text-brand text-xs font-semibold pl-2.5 pr-1 py-0.5"
              >
                {buildChordSymbol(c.root, c.quality)}
                <button
                  type="button"
                  aria-label={`Remove ${buildChordSymbol(c.root, c.quality)}`}
                  onClick={() => onChange({ ...link, chords: link.chords.filter((_, j) => j !== i) })}
                  className="w-4 h-4 rounded-full hover:bg-brand/20 flex items-center justify-center"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <ChordAdder onAdd={(root, quality) => onChange({ ...link, chords: [...link.chords, { root, quality }] })} keys={keys} />
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Change every
            <input
              type="number"
              min={4}
              max={240}
              value={link.changesPerMin}
              onChange={(e) => onChange({ ...link, changesPerMin: Math.max(4, Math.min(240, Number(e.target.value) || 30)) })}
              className="w-16 text-center bg-surface-2 border border-line rounded-md px-1.5 py-1 outline-none focus:border-brand text-ink tabular-nums"
            />
            changes / min
          </label>
        </div>
      )}

      {/* Ear training */}
      {link?.kind === 'ear-training' && (
        <Segmented
          size="sm"
          aria-label="Ear training mode"
          value={link.mode}
          onChange={(mode) => onChange({ kind: 'ear-training', mode })}
          options={[
            { value: 'intervals', label: 'Intervals' },
            { value: 'modes', label: 'Modes' },
          ]}
        />
      )}

      {link?.kind === 'fretboard-trainer' && (
        <p className="text-xs text-ink-muted">Note-finding drill will run during this exercise.</p>
      )}
    </div>
  )
}

function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center">
      <input
        type="number"
        min={40}
        max={120}
        value={value}
        onChange={(e) => onChange(Math.max(40, Math.min(120, Number(e.target.value) || 100)))}
        className="w-14 text-center bg-surface-2 border border-line rounded-md px-1.5 py-1 outline-none focus:border-brand text-ink tabular-nums"
      />
      <span className="ml-0.5">%</span>
    </span>
  )
}

function ChordAdder({
  onAdd,
  keys,
}: {
  onAdd: (root: string, quality: ChordQuality) => void
  keys: string[]
}) {
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const root = (form.elements.namedItem('root') as HTMLSelectElement).value
        const quality = (form.elements.namedItem('quality') as HTMLSelectElement).value as ChordQuality
        onAdd(root, quality)
      }}
    >
      <select name="root" aria-label="Chord root" className={selectClass} defaultValue="C">
        {keys.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <select name="quality" aria-label="Chord quality" className={selectClass} defaultValue="major">
        {CHORD_QUALITIES.map((q) => (
          <option key={q} value={q}>{qualityLabel(q)}</option>
        ))}
      </select>
      <button
        type="submit"
        className="text-xs font-semibold text-brand hover:text-brand-strong px-2 py-1.5 rounded-md hover:bg-brand/10 transition-colors"
      >
        + Add
      </button>
    </form>
  )
}
