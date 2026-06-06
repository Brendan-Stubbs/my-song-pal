/**
 * Integrity tests for all hardcoded scale pattern matrices.
 *
 * For every pattern in SCALE_PATTERNS and SCALE_PATTERNS_3NPS:
 *   - The rootFret is resolved using the same STRING_PRIORITY logic as
 *     the tonal adapter (low E first, descending to high e).
 *   - Every non-zero cell must produce a note that belongs to the scale
 *     (validated against tonal using key = C).
 *   - Every 'R' cell must produce the root note (C).
 */

import { Scale, Note } from 'tonal'
import { SCALE_PATTERNS, SCALE_PATTERNS_3NPS } from './scale-patterns'
import type { ScalePattern } from './scale-patterns'

// Standard guitar tuning: index 0 = string 6 (low E), index 5 = string 1 (high e)
const TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

// Validate against C so we don't need to parameterise by key
const TEST_KEY = 'C'

// Same priority order used by the adapter when anchoring rootFret
const STRING_PRIORITY = [6, 5, 4, 3, 2, 1]

// ── Helpers (mirror tonal.adapter.ts internals) ───────────────────────────────

function toSharp(pc: string): string {
  if (pc.includes('b')) {
    const enh = Note.enharmonic(pc)
    return enh || pc
  }
  return pc
}

function getNoteAt(stringNumber: number, fret: number): string {
  const openNote = TUNING[6 - stringNumber]
  const midi = Note.midi(openNote!)
  if (midi == null) return ''
  return toSharp(Note.pitchClass(Note.fromMidi(midi + fret)))
}

function fretsForKeyOnString(stringNumber: number, key: string): number[] {
  const keyPc = toSharp(Note.pitchClass(key))
  return Array.from({ length: 25 }, (_, f) => f).filter(
    (f) => getNoteAt(stringNumber, f) === keyPc,
  )
}

/**
 * Resolve the absolute fret of the leftmost pattern column for the given key,
 * using STRING_PRIORITY. Returns null if no R cell is found.
 */
function resolveRootFret(pattern: ScalePattern, key: string): number | null {
  const rByString = new Map<number, number[]>()
  for (let ri = 0; ri < pattern.length; ri++) {
    const stringNum = ri + 1
    for (let fi = 0; fi < pattern[ri].length; fi++) {
      if (pattern[ri][fi] === 'R') {
        const list = rByString.get(stringNum) ?? []
        list.push(fi)
        rByString.set(stringNum, list)
      }
    }
  }

  let best: number | null = null
  for (const stringNum of STRING_PRIORITY) {
    const fretOffsets = rByString.get(stringNum)
    if (!fretOffsets) continue
    for (const fo of fretOffsets) {
      for (const f of fretsForKeyOnString(stringNum, key)) {
        const r = f - fo
        if (r >= 0 && r <= 15 && (best == null || r < best)) best = r
      }
    }
    if (best != null) break
  }
  return best
}

/** Scale notes for a given key, normalised to sharps. */
function getScaleNotes(key: string, scale: string): string[] {
  return Scale.get(`${key} ${scale}`).notes.map(toSharp)
}

// ── SCALE_PATTERNS integrity ──────────────────────────────────────────────────

describe('SCALE_PATTERNS integrity', () => {
  for (const [scaleName, patterns] of Object.entries(SCALE_PATTERNS)) {
    const scaleNotes = getScaleNotes(TEST_KEY, scaleName)

    describe(scaleName, () => {
      patterns.forEach((pattern, posIndex) => {
        describe(`position ${posIndex + 1}`, () => {
          it('resolves a valid rootFret', () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            expect(rootFret).not.toBeNull()
            expect(rootFret).toBeGreaterThanOrEqual(0)
          })

          it('all marked cells map to notes in the scale', () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return // caught by test above

            const violations: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                const cell = pattern[ri][fi]
                if (cell === 0) continue
                const fret = rootFret + fi
                const note = getNoteAt(stringNum, fret)
                if (!scaleNotes.includes(note)) {
                  violations.push(
                    `string ${stringNum}, col ${fi}, fret ${fret}: expected one of [${scaleNotes.join(', ')}] but got "${note}"`,
                  )
                }
              }
            }
            expect(violations).toEqual([])
          })

          it("'R' cells map to the root note", () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return

            const rootNote = toSharp(Note.pitchClass(TEST_KEY))
            const violations: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                if (pattern[ri][fi] !== 'R') continue
                const fret = rootFret + fi
                const note = getNoteAt(stringNum, fret)
                if (note !== rootNote) {
                  violations.push(
                    `string ${stringNum}, col ${fi}, fret ${fret}: expected root "${rootNote}" but got "${note}"`,
                  )
                }
              }
            }
            expect(violations).toEqual([])
          })

          it("all 'R' cells produce the same note as each other", () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return

            const rNotes: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                if (pattern[ri][fi] !== 'R') continue
                rNotes.push(getNoteAt(stringNum, rootFret + fi))
              }
            }
            const unique = [...new Set(rNotes)]
            expect(unique).toHaveLength(1)
          })
        })
      })
    })
  }
})

// ── SCALE_PATTERNS_3NPS integrity ────────────────────────────────────────────

describe('SCALE_PATTERNS_3NPS integrity', () => {
  for (const [scaleName, patterns] of Object.entries(SCALE_PATTERNS_3NPS)) {
    const scaleNotes = getScaleNotes(TEST_KEY, scaleName)

    describe(scaleName, () => {
      patterns.forEach((pattern, posIndex) => {
        describe(`position ${posIndex + 1}`, () => {
          it('resolves a valid rootFret', () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            expect(rootFret).not.toBeNull()
          })

          it('all marked cells map to notes in the scale', () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return

            const violations: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                const cell = pattern[ri][fi]
                if (cell === 0) continue
                const fret = rootFret + fi
                const note = getNoteAt(stringNum, fret)
                if (!scaleNotes.includes(note)) {
                  violations.push(
                    `string ${stringNum}, col ${fi}, fret ${fret}: expected one of [${scaleNotes.join(', ')}] but got "${note}"`,
                  )
                }
              }
            }
            expect(violations).toEqual([])
          })

          it("'R' cells map to the root note", () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return

            const rootNote = toSharp(Note.pitchClass(TEST_KEY))
            const violations: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                if (pattern[ri][fi] !== 'R') continue
                const fret = rootFret + fi
                const note = getNoteAt(stringNum, fret)
                if (note !== rootNote) {
                  violations.push(
                    `string ${stringNum}, col ${fi}, fret ${fret}: expected root "${rootNote}" but got "${note}"`,
                  )
                }
              }
            }
            expect(violations).toEqual([])
          })

          it("all 'R' cells produce the same note as each other", () => {
            const rootFret = resolveRootFret(pattern, TEST_KEY)
            if (rootFret == null) return

            const rNotes: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              for (let fi = 0; fi < pattern[ri].length; fi++) {
                if (pattern[ri][fi] !== 'R') continue
                rNotes.push(getNoteAt(stringNum, rootFret + fi))
              }
            }
            const unique = [...new Set(rNotes)]
            expect(unique).toHaveLength(1)
          })

          it('each string has exactly 3 marked cells', () => {
            const violations: string[] = []
            for (let ri = 0; ri < pattern.length; ri++) {
              const stringNum = ri + 1
              const marked = pattern[ri].filter((c) => c !== 0).length
              if (marked !== 3) {
                violations.push(`string ${stringNum}: expected 3 marked cells, got ${marked}`)
              }
            }
            expect(violations).toEqual([])
          })
        })
      })
    })
  }
})
