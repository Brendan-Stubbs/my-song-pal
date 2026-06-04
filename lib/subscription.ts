import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types/subscription'

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
