'use client'

import { useSuperUser } from '@/contexts/SuperUserContext'

interface SuperUserFeatureProps {
  children: React.ReactNode
  /**
   * When true, wraps the children in a subtle visual indicator so the super
   * user can see at a glance which features are gated. Defaults to true.
   */
  showIndicator?: boolean
  /**
   * Optional fallback to render when the feature is not accessible (e.g. a
   * disabled/greyed-out placeholder). Renders nothing by default.
   */
  fallback?: React.ReactNode
}

/**
 * Wraps any UI that should only be visible to super users.
 *
 * - Hidden entirely for standard users.
 * - Visible for super users in super-user mode, with an optional subtle indicator.
 * - When a super user switches to "standard view", the feature is also hidden.
 */
export default function SuperUserFeature({
  children,
  showIndicator = true,
  fallback = null,
}: SuperUserFeatureProps) {
  const { canSeeSuperUserFeatures, isSuperUser } = useSuperUser()

  if (!canSeeSuperUserFeatures) return <>{fallback}</>

  if (!showIndicator) return <>{children}</>

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      {isSuperUser && (
        <span
          title="Super user feature"
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-brand/20 text-brand shrink-0"
          aria-hidden
        >
          <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="5,1 6.5,4 10,4.5 7.5,7 8,10.5 5,9 2,10.5 2.5,7 0,4.5 3.5,4" />
          </svg>
        </span>
      )}
    </span>
  )
}
