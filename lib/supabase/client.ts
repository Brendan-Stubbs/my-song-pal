import { createBrowserClient } from '@supabase/ssr'
import { createPauseAwareFetch } from './paused'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Watches for HTTP 540 so a paused free-tier project surfaces as a real
      // message rather than an unexplained "failed to fetch". See ./paused.ts.
      global: { fetch: createPauseAwareFetch() },
    }
  )
}
