'use client'

import { useEffect } from 'react'

interface WakeLockSentinelLike {
  release: () => Promise<void>
}

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

/**
 * Keeps the screen awake while `active` is true (e.g. during a practice session),
 * re-acquiring the lock when the tab becomes visible again. No-op where the
 * Screen Wake Lock API is unsupported.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return

    const nav = navigator as Navigator & WakeLockNavigator
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    async function acquire() {
      try {
        const next = await nav.wakeLock!.request('screen')
        if (cancelled) {
          void next.release()
        } else {
          sentinel = next
        }
      } catch {
        /* denied / unsupported — ignore */
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !cancelled && !sentinel) {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release()
      sentinel = null
    }
  }, [active])
}
