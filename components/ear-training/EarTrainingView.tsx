'use client'

import IntervalTrainer from './IntervalTrainer'
import ModeTrainer from './ModeTrainer'

export default function EarTrainingView() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── Interval Training ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interval Training</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Hear a root note and an interval, then name it. Beat your high score against the clock.
          </p>
        </div>
        <IntervalTrainer />
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Mode Identification ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mode Identification</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            A scale is played — identify which of the seven diatonic modes it is. Pick which modes
            to drill, choose a fixed key or go random.
          </p>
        </div>
        <ModeTrainer />
      </section>
    </div>
  )
}
