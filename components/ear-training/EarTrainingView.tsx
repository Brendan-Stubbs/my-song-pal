'use client'

import IntervalTrainer from './IntervalTrainer'
import ModeTrainer from './ModeTrainer'
import TargetIntervalTrainer from './TargetIntervalTrainer'

export default function EarTrainingView() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── Interval Training ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interval Training</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Listen to two notes and name the gap between them. Race the clock to beat your best score.
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
            Listen to a scale and pick which one it was. Choose which scales to practise, and set a
            key or go random.
          </p>
        </div>
        <ModeTrainer />
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* ── Spot the Interval ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spot the Interval</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Pick one interval to hunt for, then answer yes or no to each pair you hear. It
            shows up about a third of the time, so you have to actually listen.
          </p>
        </div>
        <TargetIntervalTrainer />
      </section>
    </div>
  )
}
