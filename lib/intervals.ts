// Interval definitions used by the ear-training / interval recognition feature.

export interface Interval {
  /** Distance in semitones from the root. */
  semitones: number
  /** Full display name, e.g. "Minor 3rd". */
  name: string
  /** Short label, e.g. "m3". */
  short: string
}

export const INTERVALS: Interval[] = [
  { semitones: 1, name: 'Minor 2nd', short: 'm2' },
  { semitones: 2, name: 'Major 2nd', short: 'M2' },
  { semitones: 3, name: 'Minor 3rd', short: 'm3' },
  { semitones: 4, name: 'Major 3rd', short: 'M3' },
  { semitones: 5, name: 'Perfect 4th', short: 'P4' },
  { semitones: 6, name: 'Tritone', short: 'TT' },
  { semitones: 7, name: 'Perfect 5th', short: 'P5' },
  { semitones: 8, name: 'Minor 6th', short: 'm6' },
  { semitones: 9, name: 'Major 6th', short: 'M6' },
  { semitones: 10, name: 'Minor 7th', short: 'm7' },
  { semitones: 11, name: 'Major 7th', short: 'M7' },
  { semitones: 12, name: 'Octave', short: 'P8' },
]

export function getInterval(semitones: number): Interval | undefined {
  return INTERVALS.find((i) => i.semitones === semitones)
}

export type IntervalDirection = 'ascending' | 'descending' | 'both'

/** Timer length options (seconds). `null` means no timer / endless practice. */
export const TIMER_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: 'No timer', seconds: null },
]

// ── Target-spotting mode ──────────────────────────────────────────────────────

/**
 * How often the target interval is actually played in "spot the interval"
 * rounds. Left to pure chance a specific target would only turn up 1 round in
 * 12, which makes for a dull game and rewards answering "no" every time. At
 * 1-in-3 the target is common enough to stay engaging while still punishing a
 * reflexive "yes" (which would score ~33%).
 */
export const TARGET_HIT_PROBABILITY = 1 / 3

/**
 * Pick the interval for a spotting round: `target` with probability
 * `hitProbability`, otherwise one of the other enabled intervals drawn evenly.
 *
 * `pool` is the decoy set the player chose to include; it may or may not
 * contain the target. If no decoys are available the target is returned, since
 * a round has to play something.
 *
 * `rng` is injectable so the distribution can be tested deterministically.
 */
export function pickSpottingInterval(
  target: Interval,
  pool: Interval[],
  hitProbability: number = TARGET_HIT_PROBABILITY,
  rng: () => number = Math.random
): Interval {
  const decoys = pool.filter((i) => i.semitones !== target.semitones)
  if (decoys.length === 0) return target
  if (rng() < hitProbability) return target
  return decoys[Math.floor(rng() * decoys.length)] ?? decoys[decoys.length - 1]
}
