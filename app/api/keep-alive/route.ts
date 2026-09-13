import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Keep-alive ping for the Supabase free tier.
 *
 * Free projects are paused after roughly seven days without database activity,
 * and once paused every request — database, auth, storage — answers HTTP 540
 * until someone clicks "Resume project" in the dashboard. There is no supported
 * API to un-pause, so the only real fix is to never go quiet: a single cheap
 * query a day resets the inactivity timer.
 *
 * NOT CURRENTLY SCHEDULED. The route works and can be hit by hand, but nothing
 * calls it automatically yet. To turn on the daily ping, add a `vercel.json` at
 * the repo root:
 *
 *     { "crons": [{ "path": "/api/keep-alive", "schedule": "0 6 * * *" }] }
 *
 * and set CRON_SECRET in the Vercel project env — the route refuses to run
 * without it. Hobby plans allow one run per day with +/-59min precision, which
 * is ample against a 7-day window.
 *
 * Runs on the node runtime with no caching, since a cached response would never
 * reach Postgres and the project would pause regardless.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Constant-time compare, so a caller can't recover the secret by measuring how
 * long a near-miss takes to reject. Both sides are hashed first to get equal
 * lengths — `timingSafeEqual` throws on a length mismatch, and the mismatch
 * itself would leak the secret's length.
 */
function secretsMatch(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

/**
 * Vercel attaches `Authorization: Bearer $CRON_SECRET` to cron invocations when
 * the CRON_SECRET env var is set.
 *
 * This fails CLOSED. Nothing in `proxy.ts` guards /api routes — only /dashboard
 * — so without a secret configured this route would be an unauthenticated,
 * publicly reachable service-role query: free function invocations and Postgres
 * load for anyone who finds the URL. Refusing to run is the safe default, and it
 * makes a missing CRON_SECRET fail loudly when the cron is switched on rather
 * than silently running unauthenticated.
 */
function authorize(request: NextRequest): { ok: true } | { ok: false; status: number } {
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: false, status: 503 }

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { ok: false, status: 401 }

  return secretsMatch(header.slice('Bearer '.length), secret)
    ? { ok: true }
    : { ok: false, status: 401 }
}

export async function GET(request: NextRequest) {
  const auth = authorize(request)
  if (!auth.ok) {
    // Deliberately uninformative: don't tell an anonymous caller whether the
    // route is unconfigured or their token was simply wrong.
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.error('[keep-alive] Supabase environment variables are not configured')
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  try {
    // Service role rather than anon: an RLS-blocked anon read still reaches
    // Postgres, but this way the query is unambiguously real work and cannot be
    // silently short-circuited by a future policy change.
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // `head: true` fetches no rows and no count — just a round-trip to Postgres,
    // which is all that's needed to reset the inactivity timer. Counting would
    // put the user total in the response body for no operational gain.
    const { error } = await supabase.from('users').select('id', { head: true })

    if (error) {
      // Logged server-side only; the raw message can name tables and columns.
      console.error('[keep-alive] query failed:', error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[keep-alive] unexpected failure:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
