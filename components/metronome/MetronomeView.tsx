'use client'

import { useState, useEffect } from 'react'
import MetronomePanel from '@/components/practice/MetronomePanel'
import LoopList from './LoopList'
import LoopEditor from './LoopEditor'
import LoopPlayer from './LoopPlayer'
import { loadLoops, saveLoop, deleteLoop, createLoop } from '@/lib/metronome-loop-storage'
import { loadDashboardState } from '@/lib/dashboard-storage'
import { DEFAULT_AUDIO_ENGINE, coerceAudioEngineId, type AudioEngineId } from '@/lib/instrument'
import { useSuperUser } from '@/contexts/SuperUserContext'
import type { MetronomeLoop } from '@/types/metronome-loop'

type Mode = 'metronome' | 'loop'
type LoopView = 'player' | 'editor'

export default function MetronomeView() {
  const { canSeeSuperUserFeatures } = useSuperUser()
  const [mode, setMode] = useState<Mode>('metronome')
  const [metronomeOn, setMetronomeOn] = useState(false)

  // Loop state
  const [loops, setLoops] = useState<MetronomeLoop[]>([])
  const [selectedLoop, setSelectedLoop] = useState<MetronomeLoop | null>(null)
  const [loopView, setLoopView] = useState<LoopView>('player')
  const [loopsLoaded, setLoopsLoaded] = useState(false)

  // Audio engine — read from persisted dashboard settings
  const [engineId, setEngineId] = useState<AudioEngineId>(DEFAULT_AUDIO_ENGINE)

  useEffect(() => {
    void loadDashboardState().then((state) => {
      if (state?.audioEngine) setEngineId(coerceAudioEngineId(state.audioEngine))
    })
  }, [])

  // Load saved loops on mount
  useEffect(() => {
    void loadLoops().then((loaded) => {
      setLoops(loaded)
      if (loaded.length > 0) setSelectedLoop(loaded[0])
      setLoopsLoaded(true)
    })
  }, [])

  // If super user switches to standard view while in loop mode, snap back
  useEffect(() => {
    if (!canSeeSuperUserFeatures && mode === 'loop') setMode('metronome')
  }, [canSeeSuperUserFeatures, mode])

  function switchMode(next: Mode) {
    if (next === 'loop') setMetronomeOn(false)
    setMode(next)
  }

  async function handleCreate() {
    const loop = createLoop()
    setLoops((prev) => [...prev, loop])
    setSelectedLoop(loop)
    setLoopView('editor')
    await saveLoop(loop)
  }

  async function handleSave(loop: MetronomeLoop) {
    const updated = { ...loop, updatedAt: Date.now() }
    setLoops((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setSelectedLoop(updated)
    setLoopView('player')
    await saveLoop(updated)
  }

  async function handleDelete(id: string) {
    setLoops((prev) => prev.filter((l) => l.id !== id))
    if (selectedLoop?.id === id) {
      const remaining = loops.filter((l) => l.id !== id)
      setSelectedLoop(remaining[0] ?? null)
      setLoopView('player')
    }
    await deleteLoop(id)
  }

  function handleSelect(loop: MetronomeLoop) {
    setSelectedLoop(loop)
    setLoopView('player')
  }

  return (
    <div className="space-y-6">
      {/* Page header + mode toggle */}
      <div className={`flex gap-4 flex-wrap ${mode === 'metronome' ? 'flex-col items-center text-center' : 'items-start justify-between'}`}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metronome</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {mode === 'metronome' ? 'Keep time while you practice' : 'Practice passages with guide notes and speed ramp-up'}
          </p>
        </div>

        {/* Mode toggle — Guided Metronome is a super-user feature */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-sm font-semibold">
          <button
            onClick={() => switchMode('metronome')}
            className={`px-4 py-2 transition-colors ${
              mode === 'metronome'
                ? 'bg-brand text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Metronome
          </button>

          {canSeeSuperUserFeatures && (
            <button
              onClick={() => switchMode('loop')}
              className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${
                mode === 'loop'
                  ? 'bg-brand text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Guided Metronome
              {/* Super-user star indicator */}
              <svg
                width="9"
                height="9"
                viewBox="0 0 10 10"
                fill="currentColor"
                title="Super user feature"
                className="opacity-60"
                aria-hidden
              >
                <polygon points="5,1 6.5,4 10,4.5 7.5,7 8,10.5 5,9 2,10.5 2.5,7 0,4.5 3.5,4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Simple metronome ─────────────────────────────────────────────── */}
      {mode === 'metronome' && (
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <MetronomePanel isOn={metronomeOn} onToggle={setMetronomeOn} />
          </div>
        </div>
      )}

      {/* ── Loop player ──────────────────────────────────────────────────── */}
      {mode === 'loop' && (
        <div className="flex gap-6 items-start flex-col lg:flex-row">
          {/* Sidebar: saved loops */}
          <div className="w-full lg:w-64 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Saved loops
            </p>
            {loopsLoaded ? (
              <LoopList
                loops={loops}
                selectedId={selectedLoop?.id ?? null}
                onSelect={handleSelect}
                onCreate={handleCreate}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-3">Loading…</p>
            )}
          </div>

          {/* Main content: editor or player */}
          <div className="flex-1 min-w-0">
            {!selectedLoop && loopsLoaded && (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-3">
                <p className="text-sm">No loop selected.</p>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
                >
                  Create your first loop
                </button>
              </div>
            )}

            {selectedLoop && loopView === 'player' && (
              <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {selectedLoop.name}
                  </h3>
                </div>
                <LoopPlayer
                  key={selectedLoop.id}
                  loop={selectedLoop}
                  engineId={engineId}
                  onEdit={() => setLoopView('editor')}
                />
              </div>
            )}

            {selectedLoop && loopView === 'editor' && (
              <div className="bg-warm-panel dark:bg-gray-800 rounded-xl shadow p-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5">
                  {selectedLoop.createdAt === selectedLoop.updatedAt ? 'New loop' : 'Edit loop'}
                </h3>
                <LoopEditor
                  initial={selectedLoop}
                  onSave={handleSave}
                  onCancel={() => setLoopView('player')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
