'use client'

import { lifetimeAccuracy, type TrainerStats } from '@/lib/training-stats'

function categoryLabel(key: string): string {
  return key === 'find' ? 'Find the note' : key
}

/** Surfaces stored fretboard-trainer stats: totals + per-note accuracy (weakest first). */
export default function FretboardStatsPanel({ stats }: { stats: TrainerStats | null }) {
  if (!stats || stats.gamesPlayed === 0) return null

  const categories = Object.entries(stats.perCategory ?? {})
    .filter(([, s]) => s.attempts > 0)
    .map(([key, s]) => ({
      key,
      label: categoryLabel(key),
      accuracy: Math.round((s.correct / s.attempts) * 100),
      attempts: s.attempts,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4 space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Metric label="Games" value={`${stats.gamesPlayed}`} />
        <Metric label="Best score" value={`${stats.bestScore}`} accent />
        <Metric label="Lifetime accuracy" value={`${lifetimeAccuracy(stats)}%`} />
      </div>

      {categories.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Accuracy by note {categories.length > 3 && '· weakest first'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            {categories.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="w-14 text-xs font-mono text-ink shrink-0">{c.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.accuracy < 60 ? 'bg-red-500' : c.accuracy < 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${c.accuracy}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs tabular-nums text-ink-muted">{c.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums leading-none ${accent ? 'text-brand' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}
