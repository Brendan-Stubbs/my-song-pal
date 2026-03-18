import type { IAuthService } from '@/types/auth'
import { SupabaseAuthAdapter } from './supabase-auth.adapter'
import { createClient } from '@/lib/supabase/server'

export async function createAuthService(): Promise<IAuthService> {
  const supabase = await createClient()
  return new SupabaseAuthAdapter(supabase)
}
