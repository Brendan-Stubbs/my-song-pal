'use client'

import { useEffect, useState } from 'react'
import { loadPracticeLog, computePracticeStats, type PracticeStats } from '@/lib/practice-log-storage'
import { formatDuration } from '@/lib/practice-storage'

interface Props {
  /** Bump to force a reload (e.g. after a session is logged). */
  reloadSignal?: number
}

export default function PracticeStreakCard({ reloadSignal = 0 }: Props) {
  const [stats, setStats] = useState<PracticeStats | null>(null)

  useEffect(() => {
    let active = true
    void loadPracticeLog()
      .then((log) => {
        if (active) setStats(computePracticeStats(log))
      })
      .catch(() => {
        if (active) setStats(null)
      })
    return () => {
      active = false
    }
  }, [reloadSignal])

  if (!stats || stats.totalSessions === 0) return null

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
      <Stat
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.6-2.5C7 8 6 9.5 6 12a6 6 0 0 0 12 0c0-5-6-10-6-10z" />
          </svg>
        }
        value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`}
        label="Current streak"
        highlight={stats.currentStreak > 0}
      />
      <Stat
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        }
        value={formatDuration(stats.thisWeekMinutes)}
        label={`This week · ${stats.daysThisWeek} day${stats.daysThisWeek === 1 ? '' : 's'}`}
      />
      <Stat
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20v-6M6 20v-4M18 20V8M3 20h18" />
          </svg>
        }
        value={`${stats.totalSessions}`}
        label={`Sessions · ${formatDuration(stats.totalMinutes)} total`}
      />
      {stats.longestStreak > stats.currentStreak && (
        <Stat
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17a2 2 0 0 1-2 2M14 14.66V17a2 2 0 0 0 2 2M18 2H6v7a6 6 0 0 0 12 0V2z" />
            </svg>
          }
          value={`${stats.longestStreak} days`}
          label="Longest streak"
        />
      )}
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode
  value: string
  label: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={highlight ? 'text-brand' : 'text-ink-muted'}>{icon}</span>
      <div>
        <p className="text-lg font-bold text-ink leading-none tabular-nums">{value}</p>
        <p className="text-xs text-ink-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}
