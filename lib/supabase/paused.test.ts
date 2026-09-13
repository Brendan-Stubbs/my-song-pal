import {
  PROJECT_PAUSED_STATUS,
  createPauseAwareFetch,
  isProjectPaused,
  subscribeToPauseState,
} from './paused'

// jsdom has no global Response, and the wrapper only reads `status`/`ok`.
function respondWith(status: number): typeof fetch {
  const response = { status, ok: status >= 200 && status < 300 }
  return (async () => response) as unknown as typeof fetch
}

describe('createPauseAwareFetch', () => {
  let unsubscribe: () => void = () => {}

  beforeEach(async () => {
    // Module state is shared, so reset to "not paused" between tests.
    unsubscribe = () => {}
    await createPauseAwareFetch(respondWith(200))('/reset')
  })

  afterEach(() => unsubscribe())

  it('passes the response through untouched', async () => {
    const res = await createPauseAwareFetch(respondWith(404))('/x')
    expect(res.status).toBe(404)
    expect(isProjectPaused()).toBe(false)
  })

  it('flags the project as paused on a 540', async () => {
    await createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))('/x')
    expect(isProjectPaused()).toBe(true)
  })

  it('clears the flag once a request succeeds again', async () => {
    const paused = createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))
    await paused('/x')
    expect(isProjectPaused()).toBe(true)

    await createPauseAwareFetch(respondWith(200))('/x')
    expect(isProjectPaused()).toBe(false)
  })

  it('does not clear the flag on a non-540 failure', async () => {
    await createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))('/x')
    await createPauseAwareFetch(respondWith(500))('/x')
    expect(isProjectPaused()).toBe(true)
  })

  it('notifies subscribers, and replays current state on subscribe', async () => {
    const seen: boolean[] = []
    unsubscribe = subscribeToPauseState((p) => seen.push(p))
    expect(seen).toEqual([false]) // immediate replay

    await createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))('/x')
    expect(seen).toEqual([false, true])

    // Repeat 540s must not spam subscribers.
    await createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))('/x')
    expect(seen).toEqual([false, true])

    await createPauseAwareFetch(respondWith(200))('/x')
    expect(seen).toEqual([false, true, false])
  })

  it('stops notifying after unsubscribe', async () => {
    const seen: boolean[] = []
    const stop = subscribeToPauseState((p) => seen.push(p))
    stop()
    await createPauseAwareFetch(respondWith(PROJECT_PAUSED_STATUS))('/x')
    expect(seen).toEqual([false])
  })
})
