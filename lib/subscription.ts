import { createClient } from '@/lib/supabase/server'
import type { Plan, UserAccess } from '@/types/subscription'

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from now until `date` (rounded up, never negative). */
function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / DAY_MS))
}

/**
 * Fetch the subscription plan for a given user ID.
 *
 * Returns 'premium' only when:
 *   - the stored plan is 'premium', AND
 *   - plan_expires_at is either NULL (lifetime/manual grant) or in the future.
 *
 * Falls back to 'free' on any error so the app never hard-crashes
 * due to a missing or malformed plan record.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('plan, plan_expires_at')
      .eq('id', userId)
      .single()

    if (error || !data) return 'free'

    const plan = (data.plan as Plan) ?? 'free'

    if (plan !== 'premium') return 'free'

    // If an expiry is set, check it hasn't passed
    if (data.plan_expires_at) {
      const expiresAt = new Date(data.plan_expires_at)
      if (expiresAt <= new Date()) return 'free'
    }

    return 'premium'
  } catch {
    return 'free'
  }
}

/**
 * Resolve the user's effective access, accounting for the free trial.
 *
 * Access is granted (`hasPremiumAccess: true`) when the user is either:
 *   - an active paying premium member, OR
 *   - still inside their free-trial window.
 *
 * Falls back to a locked `free` result on any error so the app never
 * hard-crashes on a missing/malformed record.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const locked: UserAccess = {
    level: 'free',
    hasPremiumAccess: false,
    trialEndsAt: null,
    trialDaysLeft: null,
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('plan, plan_expires_at, trial_ends_at')
      .eq('id', userId)
      .single()

    if (error || !data) return locked

    // Active paid subscription takes precedence.
    const plan = (data.plan as Plan) ?? 'free'
    if (plan === 'premium') {
      const notExpired =
        !data.plan_expires_at || new Date(data.plan_expires_at) > new Date()
      if (notExpired) {
        return {
          level: 'premium',
          hasPremiumAccess: true,
          trialEndsAt: null,
          trialDaysLeft: null,
        }
      }
    }

    // Otherwise check the free trial window.
    if (data.trial_ends_at) {
      const trialEnd = new Date(data.trial_ends_at)
      const trialEndsAt = trialEnd.toISOString()
      if (trialEnd > new Date()) {
        return {
          level: 'trial',
          hasPremiumAccess: true,
          trialEndsAt,
          trialDaysLeft: daysUntil(trialEnd),
        }
      }
      // Trial has lapsed — locked, but surface the (past) end date.
      return { ...locked, trialEndsAt, trialDaysLeft: 0 }
    }

    return locked
  } catch {
    return locked
  }
}
