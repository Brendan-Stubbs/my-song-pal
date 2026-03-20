'use client'

import { useState } from 'react'
import type { ChordInfo, ProgressionSection } from '@/types/music'
import FretboardPanel from './FretboardPanel'
import CagedPositionsPanel from './CagedPositionsPanel'
import ChordProgressionsPanel from './ChordProgressionsPanel'
import SongPanel from './SongPanel'

export const TUNING_PRESETS = [
  { label: 'Standard (E A D G B E)', tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { label: 'Eb Standard (Eb Ab Db Gb Bb Eb)', tuning: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { label: 'D Standard (D G C F A D)', tuning: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { label: 'C# Standard (C# F# B E G# C#)', tuning: ['C#2', 'F#2', 'B2', 'E3', 'G#3', 'C#4'] },
  { label: 'C Standard (C F Bb Eb G C)', tuning: ['C2', 'F2', 'Bb2', 'Eb3', 'G3', 'C4'] },
  { label: 'B Standard (B E A D F# B)', tuning: ['B1', 'E2', 'A2', 'D3', 'F#3', 'B3'] },
]

const AVAILABLE_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]

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
]

export default function MusicDashboard() {
  const [selectedTuningIndex, setSelectedTuningIndex] = useState(0)
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedScale, setSelectedScale] = useState('major')

  const [sections, setSections] = useState<ProgressionSection[]>([
    { id: crypto.randomUUID(), name: 'Verse', chords: [] },
  ])
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id)

  const tuning = TUNING_PRESETS[selectedTuningIndex]?.tuning ?? TUNING_PRESETS[0].tuning

  function addSection() {
    const defaultNames = ['Chorus', 'Bridge', 'Outro', 'Pre-chorus', 'Solo', 'Intro']
    const usedNames = new Set(sections.map((s) => s.name))
    const name = defaultNames.find((n) => !usedNames.has(n)) ?? `Section ${sections.length + 1}`
    const newSection: ProgressionSection = { id: crypto.randomUUID(), name, chords: [] }
    setSections((prev) => [...prev, newSection])
    setActiveSectionId(newSection.id)
  }

  function removeSection(id: string) {
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeSectionId === id && next.length > 0) {
        setActiveSectionId(next[next.length - 1].id)
      }
      return next
    })
  }

  function renameSection(id: string, name: string) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, name } : s))
  }

  function addChordToActive(chord: ChordInfo) {
    setSections((prev) =>
      prev.map((s) => s.id === activeSectionId ? { ...s, chords: [...s.chords, chord] } : s),
    )
  }

  function applyPresetToActive(chords: ChordInfo[]) {
    setSections((prev) =>
      prev.map((s) => s.id === activeSectionId ? { ...s, chords } : s),
    )
  }

  function removeChord(sectionId: string, chordIndex: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, chords: s.chords.filter((_, i) => i !== chordIndex) }
          : s,
      ),
    )
  }

  function clearSection(sectionId: string) {
    setSections((prev) =>
      prev.map((s) => s.id === sectionId ? { ...s, chords: [] } : s),
    )
  }

  const selectClass = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand'
  const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300'

  return (
    <div className="space-y-6">
      {/* Global controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="global-key-select" className={labelClass}>Key</label>
          <select
            id="global-key-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className={selectClass}
          >
            {AVAILABLE_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="global-scale-select" className={labelClass}>Scale</label>
          <select
            id="global-scale-select"
            value={selectedScale}
            onChange={(e) => setSelectedScale(e.target.value)}
            className={selectClass}
          >
            {AVAILABLE_SCALES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tuning-select" className={labelClass}>Tuning</label>
          <select
            id="tuning-select"
            value={selectedTuningIndex}
            onChange={(e) => setSelectedTuningIndex(Number(e.target.value))}
            className={selectClass}
          >
            {TUNING_PRESETS.map((preset, i) => (
              <option key={preset.label} value={i}>{preset.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono pb-1">
          {tuning.join(' · ')}
        </span>
      </div>

      <FretboardPanel selectedKey={selectedKey} selectedScale={selectedScale} tuning={tuning} />

      <CagedPositionsPanel selectedKey={selectedKey} selectedScale={selectedScale} tuning={tuning} />

      <ChordProgressionsPanel
        selectedKey={selectedKey}
        selectedScale={selectedScale}
        onAddChord={addChordToActive}
        onApplyPreset={applyPresetToActive}
      />

      <SongPanel
        sections={sections}
        activeSectionId={activeSectionId}
        onSetActiveSection={setActiveSectionId}
        onAddSection={addSection}
        onRemoveSection={removeSection}
        onRenameSection={renameSection}
        onRemoveChord={removeChord}
        onClearSection={clearSection}
      />
    </div>
  )
}
