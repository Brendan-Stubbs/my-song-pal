'use client'

import { useRouter, usePathname } from 'next/navigation'
import MusicDashboard from './music/MusicDashboard'
import PracticeView from './practice/PracticeView'
import ChordsView from './chords/ChordsView'
import MetronomeView from './metronome/MetronomeView'
import ExercisesView from './exercises/ExercisesView'
import TrialBanner from './premium/TrialBanner'
import { Card } from './ui/Card'
import { SuperUserProvider } from '@/contexts/SuperUserContext'
import SuperUserBadge from './superuser/SuperUserBadge'
import type { AccessLevel } from '@/types/subscription'

type Tab = 'music' | 'chords' | 'metronome' | 'exercises' | 'practice'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'music',
    label: 'Music',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.5" />
        <path d="M10 2l-7 1.5v7.5" />
        <circle cx="3" cy="11" r="1.5" />
        <circle cx="10" cy="9.5" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'chords',
    label: 'Chords',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" />
        <line x1="5" y1="2.5" x2="5" y2="12.5" />
        <line x1="10" y1="2.5" x2="10" y2="12.5" />
        <line x1="1.5" y1="7.5" x2="13.5" y2="7.5" />
      </svg>
    ),
  },
  {
    id: 'metronome',
    label: 'Metronome',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="2.5,13.5 12.5,13.5 9.5,1.5 5.5,1.5" />
        <line x1="7.5" y1="1.5" x2="7.5" y2="13.5" />
        <line x1="7.5" y1="8" x2="10.5" y2="5" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'exercises',
    label: 'Exercises',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h11M2 7.5h7M2 11h9" />
        <circle cx="12.5" cy="10.5" r="1.5" />
        <path d="M12.5 7v2" />
      </svg>
    ),
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="7.5" r="6" />
        <polyline points="7.5,4 7.5,7.5 10,10" />
      </svg>
    ),
  },
]

interface DashboardContentProps {
  userName: string
  isPremium: boolean
  accessLevel: AccessLevel
  trialDaysLeft: number | null
}

/** Derive the active tab from the current pathname.
 *  Handles /dashboard, /dashboard/metronome, and short aliases like /metronome. */
function tabFromPathname(pathname: string): Tab {
  const last = pathname.split('/').at(-1) ?? ''
  return (TABS.find((t) => t.id === last)?.id) ?? 'music'
}

export default function DashboardContent({
  userName,
  isPremium,
  accessLevel,
  trialDaysLeft,
}: DashboardContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = tabFromPathname(pathname)

  function setActiveTab(tab: Tab) {
    router.push(`/dashboard/${tab}`)
  }

  return (
    <SuperUserProvider>
      {/* Floating super-user role toggle — only renders for super users */}
      <SuperUserBadge />

      {/* Tab bar */}
      <div className="bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Dashboard tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <TrialBanner accessLevel={accessLevel} trialDaysLeft={trialDaysLeft} />
        {activeTab === 'music' && (
          <>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-ink">
                Welcome, {userName}
              </h2>
            </Card>
            <MusicDashboard />
          </>
        )}
        {activeTab === 'chords' && <ChordsView isPremium={isPremium} />}
        {activeTab === 'metronome' && <MetronomeView isPremium={isPremium} />}
        {activeTab === 'exercises' && <ExercisesView />}
        {activeTab === 'practice' && <PracticeView />}
      </main>
    </SuperUserProvider>
  )
}
