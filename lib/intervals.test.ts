import {
  INTERVALS,
  TARGET_HIT_PROBABILITY,
  getInterval,
  pickSpottingInterval,
  type Interval,
} from './intervals'

const m3 = getInterval(3) as Interval
const P5 = getInterval(7) as Interval

/** An rng that yields the given values in order, then repeats the last one. */
function scriptedRng(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('pickSpottingInterval', () => {
  it('plays the target when the roll lands under the hit probability', () => {
    const pick = pickSpottingInterval(m3, INTERVALS, 1 / 3, scriptedRng([0.32]))
    expect(pick).toEqual(m3)
  })

  it('plays a decoy when the roll lands on or above the hit probability', () => {
    const pick = pickSpottingInterval(m3, INTERVALS, 1 / 3, scriptedRng([0.34, 0]))
    expect(pick.semitones).not.toBe(m3.semitones)
  })

  it('never returns the target as a decoy', () => {
    // Second roll sweeps the whole decoy list; none of them may be the target.
    for (let i = 0; i < 100; i++) {
      const pick = pickSpottingInterval(m3, INTERVALS, 1 / 3, scriptedRng([0.9, i / 100]))
      expect(pick.semitones).not.toBe(m3.semitones)
    }
  })

  it('falls back to the target when there are no decoys', () => {
    expect(pickSpottingInterval(m3, [m3], 0, scriptedRng([0.99]))).toEqual(m3)
    expect(pickSpottingInterval(m3, [], 0, scriptedRng([0.99]))).toEqual(m3)
  })

  it('ignores a target that is absent from the decoy pool', () => {
    const pick = pickSpottingInterval(m3, [P5], 1 / 3, scriptedRng([0.5, 0]))
    expect(pick).toEqual(P5)
  })

  it('hits the target at roughly the configured rate over many rounds', () => {
    let hits = 0
    const rounds = 12000
    for (let i = 0; i < rounds; i++) {
      if (pickSpottingInterval(m3, INTERVALS).semitones === m3.semitones) hits++
    }
    const rate = hits / rounds
    expect(rate).toBeGreaterThan(TARGET_HIT_PROBABILITY - 0.03)
    expect(rate).toBeLessThan(TARGET_HIT_PROBABILITY + 0.03)
  })

  it('spreads the non-target rounds evenly across the decoys', () => {
    const counts = new Map<number, number>()
    const rounds = 24000
    for (let i = 0; i < rounds; i++) {
      const pick = pickSpottingInterval(m3, INTERVALS)
      if (pick.semitones === m3.semitones) continue
      counts.set(pick.semitones, (counts.get(pick.semitones) ?? 0) + 1)
    }
    expect(counts.size).toBe(INTERVALS.length - 1)
    const expected = (rounds * (1 - TARGET_HIT_PROBABILITY)) / (INTERVALS.length - 1)
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.75)
      expect(count).toBeLessThan(expected * 1.25)
    }
  })
})
