'use client'

import { useState } from 'react'
import MetronomePanel from '@/components/practice/MetronomePanel'

export default function MetronomeView() {
  const [isOn, setIsOn] = useState(false)

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metronome</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Keep time while you practice
        </p>
      </div>

      <MetronomePanel isOn={isOn} onToggle={setIsOn} />
    </div>
  )
}
