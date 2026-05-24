/**
 * Simple in-memory rate limiter.
 *
 * Works well for single-instance deploys (traditional server, single Vercel
 * region, Railway, Fly.io single machine, etc.).
 *
 * For multi-region serverless deployments, swap this out for a distributed
 * store — e.g. Upstash Redis with @upstash/ratelimit:
 *   https://github.com/upstash/ratelimit
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
 *   const result = limiter.check(ip)
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

export interface RateLimitOptions {
  /** Rolling window length in milliseconds */
  windowMs: number
  /** Maximum number of requests allowed within the window */
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Seconds until the window resets */
  retryAfter: number
}

interface WindowEntry {
  count: number
  resetAt: number
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options
  const store = new Map<string, WindowEntry>()

  // Clean up expired entries every 5 minutes to prevent memory leaks
  const cleanup = () => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(key)
    }
  }
  // Schedule periodic cleanup but unref the timer so it doesn't prevent the
  // Node process (or Jest worker) from exiting cleanly.
  if (typeof setInterval !== 'undefined') {
    const timer = setInterval(cleanup, 5 * 60 * 1000)
    // unref() is available in Node but not in browser environments
    if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
      (timer as NodeJS.Timeout).unref()
    }
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now()
      const existing = store.get(key)

      if (!existing || existing.resetAt <= now) {
        // Start a fresh window
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 }
      }

      if (existing.count >= maxRequests) {
        const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
        return { allowed: false, remaining: 0, retryAfter }
      }

      existing.count++
      return {
        allowed: true,
        remaining: maxRequests - existing.count,
        retryAfter: 0,
      }
    },
  }
}

// ── Shared limiters ────────────────────────────────────────────────────────────
// One limiter per endpoint, so sign-in and sign-up windows are independent.

/** 10 sign-in attempts per IP per minute */
export const signInLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })

/** 5 sign-up attempts per IP per 10 minutes */
export const signUpLimiter = createRateLimiter({ windowMs: 10 * 60_000, maxRequests: 5 })
