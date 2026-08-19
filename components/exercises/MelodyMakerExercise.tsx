'use client'

import { useEffect, useState } from 'react'
import type { Melody } from '@/types/melody'
import {
  loadMelodies,
  saveMelody,
  deleteMelody,
  createMelody,
} from '@/lib/melody-storage'
import { loadDashboardState } from '@/lib/dashboard-storage'
import { coerceAudioEngineId, DEFAULT_AUDIO_ENGINE, type AudioEngineId } from '@/lib/instrument'
import MelodyMaker from '@/components/melody/MelodyMaker'

type View = 'list' | 'edit'

export default function MelodyMakerExercise() {
  const [melodies, setMelodies] = useState<Melody[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [draft, setDraft] = useState<Melody | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [engineId, setEngineId] = useState<AudioEngineId>(DEFAULT_AUDIO_ENGINE)

  useEffect(() => {
    let active = true
    void loadMelodies().then((list) => {
      if (active) {
        setMelodies(list)
        setLoading(false)
      }
    })
    void loadDashboardState().then((s) => {
      if (active && s?.audioEngine) setEngineId(coerceAudioEngineId(s.audioEngine))
    })
    return () => {
      active = false
    }
  }, [])

  function openNew() {
    setDraft(createMelody())
    setDirty(true)
    setView('edit')
  }

  function openExisting(m: Melody) {
    setDraft({ ...m })
    setDirty(false)
    setView('edit')
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    await saveMelody(draft)
    const list = await loadMelodies()
    setMelodies(list)
    setDirty(false)
    setSaving(false)
  }

  async function remove(id: string) {
    await deleteMelody(id)
    setMelodies((prev) => prev.filter((m) => m.id !== id))
    if (draft?.id === id) {
      setDraft(null)
      setView('list')
    }
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  if (view === 'edit' && draft) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setView('list')}
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-brand transition-colors"
            >
              ‹ Melodies
            </button>
            <input
              aria-label="Melody name"
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value })
                setDirty(true)
              }}
              placeholder="Untitled melody"
              className="text-lg font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand dark:hover:border-gray-600 outline-none text-gray-900 dark:text-white px-1 py-0.5 min-w-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </button>
            <button
              onClick={() => remove(draft.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <MelodyMaker
          melody={draft}
          engineId={engineId}
          onChange={(m) => {
            setDraft(m)
            setDirty(true)
          }}
        />
      </div>
    )
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Melody Maker</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            Pick a key and scale, then tap the notes to hear them. Drag notes onto
            the timeline to sketch a line and play it back.
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand/90 transition-colors shrink-0"
        >
          + New melody
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : melodies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No melodies yet. Create your first one to start writing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {melodies.map((m) => (
            <div
              key={m.id}
              className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-surface p-4 hover:border-brand transition-colors"
            >
              <button onClick={() => openExisting(m)} className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand transition-colors">
                  {m.name || 'Untitled melody'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                  {m.key} {m.scaleId} · {m.bpm} BPM · {m.bars} bar{m.bars !== 1 ? 's' : ''} ·{' '}
                  {m.notes.length} note{m.notes.length !== 1 ? 's' : ''}
                </p>
              </button>
              <button
                onClick={() => remove(m.id)}
                aria-label={`Delete ${m.name}`}
                className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
