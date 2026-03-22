'use client'

import { useState } from 'react'
import { Note } from 'tonal'
import type { ChordInfo, ProgressionSection } from '@/types/music'
import FretboardPanel from './FretboardPanel'
import CagedPositionsPanel from './CagedPositionsPanel'
import ChordProgressionsPanel from './ChordProgressionsPanel'
import SongPanel from './SongPanel'
import OpenChordsPanel from './OpenChordsPanel'
import ScaleFinderModal from './ScaleFinderModal'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface TuningPreset {
  label: string
  tuning: string[]
  isStandard: boolean
}

export const TUNING_PRESETS: TuningPreset[] = [
  // ── Standard tunings ───────────────────────────────────────────────────────
  { label: 'Standard (E A D G B E)',            tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],  isStandard: true  },
  { label: 'Eb Standard (Eb Ab Db Gb Bb Eb)',   tuning: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'], isStandard: true },
  { label: 'D Standard (D G C F A D)',          tuning: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],  isStandard: true  },
  { label: 'C# Standard (C# F# B E G# C#)',     tuning: ['C#2', 'F#2', 'B2', 'E3', 'G#3', 'C#4'], isStandard: true },
  { label: 'C Standard (C F Bb Eb G C)',        tuning: ['C2', 'F2', 'Bb2', 'Eb3', 'G3', 'C4'],  isStandard: true  },
  { label: 'B Standard (B E A D F# B)',         tuning: ['B1', 'E2', 'A2', 'D3', 'F#3', 'B3'],  isStandard: true  },
  // ── Drop tunings ───────────────────────────────────────────────────────────
  { label: 'Drop D (D A D G B E)',              tuning: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],  isStandard: false },
  { label: 'Drop C# (C# G# C# F# A# D#)',       tuning: ['C#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'], isStandard: false },
  { label: 'Drop C (C G C F A D)',              tuning: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],  isStandard: false },
  { label: 'Drop B (B F# B E G# C#)',           tuning: ['B1', 'F#2', 'B2', 'E3', 'G#3', 'C#4'], isStandard: false },
  { label: 'Drop A (A E A D F# B)',             tuning: ['A1', 'E2', 'A2', 'D3', 'F#3', 'B3'],  isStandard: false },
]

// Sentinel value for the custom-tuning option in the <select>
const CUSTOM_TUNING_INDEX = -1

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Standard open-string MIDI values (E2=40, A2=45, D3=50, G3=55, B3=59, E4=64)
const STRING_CENTERS = [40, 45, 50, 55, 59, 64]

/** Assigns a sensible octave to a pitch class for the given string index (0=low E string, 5=high e string). */
function assignOctave(pitchClass: string, stringIndex: number): string {
  const center = STRING_CENTERS[stringIndex] ?? 50
  const ref = Note.midi(`${pitchClass}4`) ?? 60
  const pcOffset = ref % 12
  const bestOctavePlusOne = Math.round((center - pcOffset) / 12)
  const resultMidi = bestOctavePlusOne * 12 + pcOffset
  return Note.fromMidi(resultMidi) ?? `${pitchClass}4`
}

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

type PanelId = 'fretboard' | 'caged' | 'openChords' | 'chordProgressions' | 'song'

interface DashboardPanel {
  id: PanelId
  label: string
  visible: boolean
}

const DEFAULT_PANELS: DashboardPanel[] = [
  { id: 'fretboard', label: 'Fretboard', visible: true },
  { id: 'caged', label: 'CAGED Positions', visible: true },
  { id: 'openChords', label: 'Open Chords', visible: true },
  { id: 'chordProgressions', label: 'Chord Progressions', visible: true },
  { id: 'song', label: 'Song', visible: true },
]

// ── Sortable row used in edit mode ──────────────────────────────────────────
interface SortableRowProps {
  panel: DashboardPanel
  onToggle: (id: PanelId) => void
}

function SortableRow({ panel, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: panel.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-warm-panel dark:bg-gray-800 px-4 py-3 shadow-sm"
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
        {panel.label}
      </span>

      {/* Visibility toggle */}
      <button
        onClick={() => onToggle(panel.id)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 ${
          panel.visible ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        role="switch"
        aria-checked={panel.visible}
        aria-label={`${panel.visible ? 'Hide' : 'Show'} ${panel.label}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            panel.visible ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function MusicDashboard() {
  const [selectedTuningIndex, setSelectedTuningIndex] = useState(0)
  const [customTuningPcs, setCustomTuningPcs] = useState(['E', 'A', 'D', 'G', 'B', 'E'])
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedScale, setSelectedScale] = useState('major')
  const [editMode, setEditMode] = useState(false)
  const [scaleFinderOpen, setScaleFinderOpen] = useState(false)
  const [panels, setPanels] = useState<DashboardPanel[]>(DEFAULT_PANELS)

  const [sections, setSections] = useState<ProgressionSection[]>([
    { id: crypto.randomUUID(), name: 'Verse', chords: [] },
  ])
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id)

  const isCustomTuning = selectedTuningIndex === CUSTOM_TUNING_INDEX
  const tuning = isCustomTuning
    ? customTuningPcs.map((pc, i) => assignOctave(pc, i))
    : (TUNING_PRESETS[selectedTuningIndex]?.tuning ?? TUNING_PRESETS[0].tuning)
  const isStandardTuning = !isCustomTuning && (TUNING_PRESETS[selectedTuningIndex]?.isStandard ?? false)

  function updateCustomTuningPc(stringIndex: number, pc: string) {
    setCustomTuningPcs((prev) => prev.map((v, i) => i === stringIndex ? pc : v))
  }

  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPanels((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id)
        const newIndex = prev.findIndex((p) => p.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function togglePanelVisibility(id: PanelId) {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)),
    )
  }

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

  const selectClass = 'rounded-md border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand'
  const labelClass = 'text-sm font-medium text-gray-700 dark:text-gray-300'

  function renderPanel(panel: DashboardPanel) {
    if (!panel.visible) return null
    switch (panel.id) {
      case 'fretboard':
        return (
          <FretboardPanel
            key="fretboard"
            selectedKey={selectedKey}
            selectedScale={selectedScale}
            tuning={tuning}
          />
        )
      case 'caged':
        return (
          <CagedPositionsPanel
            key="caged"
            selectedKey={selectedKey}
            selectedScale={selectedScale}
            tuning={tuning}
            isStandardTuning={isStandardTuning}
          />
        )
      case 'openChords':
        return (
          <OpenChordsPanel
            key="openChords"
            selectedKey={selectedKey}
            selectedScale={selectedScale}
          />
        )
      case 'chordProgressions':
        return (
          <ChordProgressionsPanel
            key="chordProgressions"
            selectedKey={selectedKey}
            selectedScale={selectedScale}
            onAddChord={addChordToActive}
            onApplyPreset={applyPresetToActive}
          />
        )
      case 'song':
        return (
          <SongPanel
            key="song"
            sections={sections}
            activeSectionId={activeSectionId}
            onSetActiveSection={setActiveSectionId}
            onAddSection={addSection}
            onRemoveSection={removeSection}
            onRenameSection={renameSection}
            onRemoveChord={removeChord}
            onClearSection={clearSection}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Global controls */}
      <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-end gap-6">
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
            <optgroup label="Standard">
              {TUNING_PRESETS.filter((p) => p.isStandard).map((preset, i) => (
                <option key={preset.label} value={i}>{preset.label}</option>
              ))}
            </optgroup>
            <optgroup label="Drop">
              {TUNING_PRESETS.filter((p) => !p.isStandard).map((preset) => {
                const i = TUNING_PRESETS.indexOf(preset)
                return <option key={preset.label} value={i}>{preset.label}</option>
              })}
            </optgroup>
            <optgroup label="Other">
              <option value={CUSTOM_TUNING_INDEX}>Custom…</option>
            </optgroup>
          </select>
        </div>

        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono pb-1">
          {tuning.join(' · ')}
        </span>

        {/* Scale Finder + Edit Layout — pushed to the right */}
        <div className="ml-auto flex items-center gap-2 pb-0.5">
          <button
            onClick={() => setScaleFinderOpen(true)}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-warm-page dark:hover:bg-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5L13 13" />
            </svg>
            Scale Finder
          </button>
        </div>
        <div className="pb-0.5">
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
              editMode
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'border border-gray-300 dark:border-gray-600 bg-warm-panel dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-warm-page dark:hover:bg-gray-600'
            }`}
          >
            {editMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 7l4 4L13 3" />
                </svg>
                Done
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 1.5l3 3-8 8H1.5v-3l8-8z" />
                </svg>
                Edit Layout
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom tuning inputs */}
      {isCustomTuning && (
        <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-4">
          <p className={`${labelClass} mb-3`}>Custom tuning — string notes (low → high)</p>
          <div className="flex flex-wrap gap-3">
            {customTuningPcs.map((pc, i) => {
              const stringNum = 6 - i
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {stringNum === 6 ? '6 (low)' : stringNum === 1 ? '1 (high)' : String(stringNum)}
                  </span>
                  <select
                    value={pc}
                    onChange={(e) => updateCustomTuningPc(i, e.target.value)}
                    className={`${selectClass} w-16`}
                    aria-label={`String ${stringNum} note`}
                  >
                    {CHROMATIC_NOTES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit mode panel */}
      {editMode && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Drag to reorder · toggle to show/hide
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={panels.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {panels.map((panel) => (
                  <SortableRow key={panel.id} panel={panel} onToggle={togglePanelVisibility} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Dashboard panels in user-defined order */}
      {panels.map((panel) => renderPanel(panel))}

      {/* Scale Finder modal — portal-style, outside the panel flow */}
      <ScaleFinderModal
        isOpen={scaleFinderOpen}
        onClose={() => setScaleFinderOpen(false)}
        tuning={tuning}
        onApplyScale={(key, scaleName) => {
          setSelectedKey(key)
          setSelectedScale(scaleName)
        }}
      />
    </div>
  )
}
