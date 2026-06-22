'use client'

import FretboardTrainer from './FretboardTrainer'

export default function FretboardTrainerView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fretboard Trainer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Learn the notes on the neck — name them or find them on the fretboard.
        </p>
      </div>

      <FretboardTrainer />
    </div>
  )
}
