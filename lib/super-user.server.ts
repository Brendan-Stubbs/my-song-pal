import { createClient } from '@/lib/supabase/server'

/**
 * Whether a user carries the super-user flag, checked on the server.
 *
 * The client-side twin in `lib/super-user.ts` drives what the UI offers;
 * this is the one that guards a route, so it fails closed on any error.
 */
export async function isSuperUser(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('is_superuser')
      .eq('id', userId)
      .single()

    if (error || !data) return false
    return data.is_superuser === true
  } catch {
    return false
  }
}
