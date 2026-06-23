'use client'

import { useEffect, useRef, useState } from 'react'
import { useSuperUser } from '@/contexts/SuperUserContext'

export default function SuperUserBadge() {
  const { isSuperUser, viewingAsStandard, toggleViewAsStandard } = useSuperUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!isSuperUser) return null

  const isStandardMode = viewingAsStandard

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Popover */}
      {open && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-2xl p-4 w-64 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Super User Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Toggle your view to see the app as a standard user would.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 mt-0.5"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l8 8M10 2L2 10" />
              </svg>
            </button>
          </div>

          {/* Current role display */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isStandardMode ? 'bg-gray-400' : 'bg-brand'}`} />
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {isStandardMode ? 'Standard User View' : 'Super User View'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {isStandardMode
                  ? 'Super-user-only features are hidden'
                  : 'All features are visible'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={toggleViewAsStandard}
            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isStandardMode
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isStandardMode ? 'Switch to Super User View' : 'Switch to Standard View'}
          </button>
        </div>
      )}

      {/* Trigger pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={isStandardMode ? 'Viewing as standard user — click to switch' : 'Super user mode active'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all ${
          isStandardMode
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            : 'bg-brand text-white hover:bg-brand/90'
        }`}
      >
        {/* Icon */}
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="5" r="2.5" />
          <path d="M2 12.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
          <path d="M10.5 1.5l1.5 1.5-3 3" />
        </svg>
        {isStandardMode ? 'Standard' : 'Super User'}
      </button>
    </div>
  )
}
