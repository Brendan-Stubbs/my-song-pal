'use client'

import { useEffect, useState } from 'react'
import { subscribeToPauseState } from '@/lib/supabase/paused'

/**
 * Banner shown when the Supabase project has been paused for inactivity.
 *
 * Without this, a paused project just makes every save and sign-in fail with an
 * opaque network error. Resuming can only be done from the dashboard and takes a
 * few minutes, so the honest thing is to say exactly that and link straight to
 * the button — there is nothing the app can do on the user's behalf.
 */

/** Derive the dashboard link from the project URL (https://<ref>.supabase.co). */
function dashboardUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  const ref = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\./i)?.[1]
  return ref ? `https://supabase.com/dashboard/project/${ref}` : null
}

export default function ProjectPausedNotice() {
  const [paused, setPaused] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => subscribeToPauseState(setPaused), [])

  if (!paused || dismissed) return null

  const href = dashboardUrl()

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-300 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-700 dark:bg-amber-950"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <span className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="10" y1="9" x2="10" y2="15" />
            <line x1="14" y1="9" x2="14" y2="15" />
          </svg>
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            The database is paused
          </p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-200">
            Supabase pauses free projects after about a week of no use. Nothing is
            lost — it just needs resuming from the dashboard, which takes a couple
            of minutes. Anything you change here until then won&rsquo;t save.
          </p>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-semibold text-amber-900 underline underline-offset-2 hover:no-underline dark:text-amber-100"
            >
              Open the Supabase dashboard →
            </a>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </div>
    </div>
  )
}
