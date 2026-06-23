import { createClient } from '@/lib/supabase/client'

const LS_KEY = 'superuser_view_as_standard'

/** Fetch whether the currently logged-in user is a super user from the DB. */
export async function fetchIsSuperUser(): Promise<boolean> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false

  const { data } = await supabase
    .from('users')
    .select('is_superuser')
    .eq('id', session.user.id)
    .single()

  return data?.is_superuser === true
}

/** Whether the super user has toggled into "view as standard" mode. */
export function getViewAsStandard(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LS_KEY) === 'true'
}

export function setViewAsStandard(value: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, String(value))
}
