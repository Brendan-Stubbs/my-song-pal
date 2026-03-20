'use client'

import { useState } from 'react'
import FretboardPanel from './FretboardPanel'
import CagedPositionsPanel from './CagedPositionsPanel'

export const TUNING_PRESETS = [
  { label: 'Standard (E A D G B E)', tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { label: 'Eb Standard (Eb Ab Db Gb Bb Eb)', tuning: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { label: 'D Standard (D G C F A D)', tuning: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { label: 'C# Standard (C# F# B E G# C#)', tuning: ['C#2', 'F#2', 'B2', 'E3', 'G#3', 'C#4'] },
  { label: 'C Standard (C F Bb Eb G C)', tuning: ['C2', 'F2', 'Bb2', 'Eb3', 'G3', 'C4'] },
  { label: 'B Standard (B E A D F# B)', tuning: ['B1', 'E2', 'A2', 'D3', 'F#3', 'B3'] },
]

export default function MusicDashboard() {
  const [selectedTuningIndex, setSelectedTuningIndex] = useState(0)

  const tuning = TUNING_PRESETS[selectedTuningIndex]?.tuning ?? TUNING_PRESETS[0].tuning

  return (
    <div className="space-y-6">
      {/* Tuning selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Tuning
        </span>
        <div className="flex flex-col gap-1">
          <select
            id="tuning-select"
            value={selectedTuningIndex}
            onChange={(e) => setSelectedTuningIndex(Number(e.target.value))}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {TUNING_PRESETS.map((preset, i) => (
              <option key={preset.label} value={i}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {tuning.join(' · ')}
        </span>
      </div>

      <FretboardPanel tuning={tuning} />

      <CagedPositionsPanel tuning={tuning} />
    </div>
  )
}
