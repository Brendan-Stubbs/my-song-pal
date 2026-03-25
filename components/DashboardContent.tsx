'use client'

import { useState } from 'react'
import MusicDashboard from './music/MusicDashboard'
import PracticeView from './practice/PracticeView'
import ChordsView from './chords/ChordsView'
import MetronomeView from './metronome/MetronomeView'

type Tab = 'music' | 'chords' | 'metronome' | 'practice'

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
}

export default function DashboardContent({ userName }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>('music')

  return (
    <>
      {/* Tab bar */}
      <div className="bg-warm-panel dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Dashboard tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
        {activeTab === 'music' && (
          <>
            <div className="bg-warm-panel dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome, {userName}
              </h2>
            </div>
            <MusicDashboard />
          </>
        )}
        {activeTab === 'chords' && <ChordsView />}
        {activeTab === 'metronome' && <MetronomeView />}
        {activeTab === 'practice' && <PracticeView />}
      </main>
    </>
  )
}
