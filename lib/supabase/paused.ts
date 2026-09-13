/**
 * Detects a paused Supabase project.
 *
 * Supabase pauses free-tier projects after roughly seven days without database
 * activity. Once paused, every service — database, auth, storage, edge
 * functions — answers HTTP 540, a Supabase-specific status code meaning "this
 * project is paused". Nothing recovers until the owner clicks "Resume project"
 * in the dashboard; there is no supported API to un-pause.
 *
 * supabase-js surfaces a 540 as an opaque parse failure (the body is HTML, not
 * the JSON it expects), so callers can't tell a paused project from a network
 * blip. Wrapping `fetch` lets us read the raw status before that happens and
 * broadcast it, so the UI can say something truthful instead of "failed to
 * fetch".
 */

/** Supabase's status code for a paused project. */
export const PROJECT_PAUSED_STATUS = 540

type Listener = (paused: boolean) => void

const listeners = new Set<Listener>()
let paused = false

/** Whether a paused response has been seen this page load. */
export function isProjectPaused(): boolean {
  return paused
}

/**
 * Subscribe to pause-state changes. Fires immediately with the current state so
 * subscribers mounting after the first failed request still catch up. Returns an
 * unsubscribe function.
 */
export function subscribeToPauseState(listener: Listener): () => void {
  listeners.add(listener)
  listener(paused)
  return () => {
    listeners.delete(listener)
  }
}

function setPaused(next: boolean): void {
  if (paused === next) return
  paused = next
  for (const listener of listeners) listener(next)
}

/**
 * Wrap a fetch implementation so 540 responses flip the pause flag, and any
 * successful response clears it again (the owner resumed the project and the
 * app recovered without a reload).
 *
 * The response is passed through untouched — supabase-js still sees exactly
 * what it would have, so error handling elsewhere is unaffected.
 */
export function createPauseAwareFetch(
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init)
    if (response.status === PROJECT_PAUSED_STATUS) setPaused(true)
    else if (response.ok) setPaused(false)
    return response
  }
}
