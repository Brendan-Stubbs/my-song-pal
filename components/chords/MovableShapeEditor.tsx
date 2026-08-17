'use client'

import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import ChordDiagramCard from '@/components/music/ChordDiagramCard'
import { shapeToVoicing, type ShapeGeometry } from '@/lib/movable-shape-storage'

const MAX_OFFSET = 4
const PREVIEW_BASE = 5

// Row order matches the offsets array: index 0 = string 6 (low E) … index 5 = string 1 (high e).
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']
const stringNumForIndex = (i: number) => 6 - i

interface Props {
  onClose: () => void
  onSave: (name: string, geometry: ShapeGeometry) => void
}

export default function MovableShapeEditor({ onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [offsets, setOffsets] = useState<number[]>(() => Array(6).fill(-1))
  const [rootString, setRootString] = useState(6)
  const [barreEnabled, setBarreEnabled] = useState(false)

  const geometry = useMemo<ShapeGeometry>(() => {
    let barre: ShapeGeometry['barre']
    if (barreEnabled) {
      const atBase = offsets
        .map((o, i) => (o === 0 ? stringNumForIndex(i) : null))
        .filter((s): s is number => s != null)
      if (atBase.length >= 2) {
        barre = { offset: 0, fromString: Math.min(...atBase), toString: Math.max(...atBase) }
      }
    }
    return { offsets, rootString, barre }
  }, [offsets, rootString, barreEnabled])

  const frettedCount = offsets.filter((o) => o >= 0).length
  const canSave = frettedCount > 0

  function setStringOffset(index: number, offset: number) {
    setOffsets((prev) => prev.map((o, i) => (i === index ? offset : o)))
  }

  function handleSave() {
    if (!canSave) return
    const trimmed = name.trim() || 'Shape'
    onSave(trimmed, geometry)
    onClose()
  }

  return (
    <Modal onClose={onClose} aria-label="Create a movable chord shape" className="max-w-2xl">
      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-ink">New movable shape</h3>
          <p className="text-sm text-ink-muted mt-0.5">
            Tap a fret for each string to define a grip relative to its base fret. Movable shapes
            slide up and down the neck, so you name them by their form (e.g. &ldquo;E-shape major&rdquo;).
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-6">
          {/* Grid capture */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 pl-[92px] pb-1">
              {Array.from({ length: MAX_OFFSET + 1 }, (_, f) => (
                <span key={f} className="w-9 text-center text-[10px] font-semibold text-ink-muted">
                  {f === 0 ? 'base' : `+${f}`}
                </span>
              ))}
            </div>
            {offsets.map((offset, i) => {
              const stringNum = stringNumForIndex(i)
              const isRoot = rootString === stringNum
              return (
                <div key={i} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRootString(stringNum)}
                    title="Set as root string"
                    aria-label={`Set string ${STRING_LABELS[i]} as root`}
                    className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isRoot ? 'bg-brand border-brand text-white' : 'border-line text-ink-muted hover:border-brand'
                    }`}
                  >
                    R
                  </button>
                  <span className="w-4 text-xs font-mono text-ink-muted">{STRING_LABELS[i]}</span>
                  <button
                    type="button"
                    onClick={() => setStringOffset(i, -1)}
                    className={`w-8 h-9 rounded-md border text-sm font-semibold transition-colors shrink-0 ${
                      offset === -1
                        ? 'bg-ink-muted/20 border-ink-muted text-ink'
                        : 'border-line text-ink-muted hover:border-ink-muted'
                    }`}
                    title="Mute string"
                  >
                    ×
                  </button>
                  {Array.from({ length: MAX_OFFSET + 1 }, (_, f) => {
                    const active = offset === f
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setStringOffset(i, f)}
                        className={`w-9 h-9 rounded-md border transition-colors ${
                          active
                            ? 'bg-brand border-brand'
                            : 'border-line bg-surface-2 hover:border-brand/60'
                        }`}
                        aria-label={`String ${STRING_LABELS[i]} fret offset ${f}`}
                      >
                        {active && <span className="block w-2.5 h-2.5 mx-auto rounded-full bg-white" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}

            <label className="flex items-center gap-2 pt-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={barreEnabled}
                onChange={(e) => setBarreEnabled(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              Barre across strings at the base fret
            </label>
          </div>

          {/* Live preview */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Preview</span>
            <ChordDiagramCard
              voicing={frettedCount > 0 ? shapeToVoicing(geometry, PREVIEW_BASE) : null}
              chordSymbol={name.trim() || 'Shape'}
              size="md"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shape name (e.g. E-shape major)"
            className="flex-1 text-sm bg-surface-2 border border-line rounded-md px-3 py-2 outline-none focus:border-brand transition-colors text-ink"
          />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>Save shape</Button>
        </div>
      </div>
    </Modal>
  )
}
