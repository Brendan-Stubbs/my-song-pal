'use client'

import type { AccessLevel } from '@/types/subscription'

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M1 12h14l-1-7-4 3-2-5-2 5-4-3-1 7z" />
    </svg>
  )
}

interface TrialBannerProps {
  accessLevel: AccessLevel
  trialDaysLeft: number | null
}

/**
 * Slim status banner shown above the dashboard:
 *  - trial: friendly countdown of full-access days remaining
 *  - free (lapsed trial): gentle nudge that paid features are now locked
 *  - premium: nothing
 */
export default function TrialBanner({ accessLevel, trialDaysLeft }: TrialBannerProps) {
  if (accessLevel === 'premium') return null

  if (accessLevel === 'trial') {
    const days = trialDaysLeft ?? 0
    const dayLabel =
      days <= 0 ? 'Less than a day' : `${days} day${days === 1 ? '' : 's'}`

    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
          <CrownIcon className="h-4 w-4" />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-gray-900 dark:text-white">
            {dayLabel} left in your free trial
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            You have full access to every premium feature — no card required.
          </p>
        </div>
      </div>
    )
  }

  // accessLevel === 'free' (trial lapsed)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
        <CrownIcon className="h-4 w-4" />
      </span>
      <div className="text-sm">
        <p className="font-semibold text-gray-900 dark:text-white">
          Your free trial has ended
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Premium features are now locked. Upgrade options are coming soon.
        </p>
      </div>
    </div>
  )
}
