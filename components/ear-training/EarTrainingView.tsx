'use client'

import IntervalTrainer from './IntervalTrainer'

export default function EarTrainingView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interval Training</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Hear a root note and an interval, then name it. Beat your high score against the clock.
        </p>
      </div>

      <IntervalTrainer />
    </div>
  )
}
