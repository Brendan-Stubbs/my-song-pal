import { z } from 'zod'

// These must stay in sync with tonal.adapter.ts
const VALID_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const VALID_SCALES = [
  'major',
  'minor',
  'pentatonic major',
  'pentatonic minor',
  'blues',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'harmonic minor',
  'melodic minor',
] as const

// Standard guitar tuning notes (pitch class + octave)
const TUNING_NOTE_REGEX = /^[A-G][#b]?[0-9]$/

// Zod v4: custom error messages use `error` (not `errorMap`)
export const keyParam = z.enum(VALID_KEYS, {
  error: `Invalid key. Must be one of: ${VALID_KEYS.join(', ')}`,
})

export const scaleParam = z.enum(VALID_SCALES, {
  error: `Invalid scale. Must be one of: ${VALID_SCALES.join(', ')}`,
})

export const tuningParam = z
  .string()
  .transform((val) => val.split(',').map((s) => s.trim()))
  .pipe(
    z.array(z.string().regex(TUNING_NOTE_REGEX, 'Invalid tuning note (e.g. E2, A2, D3)')).length(
      6,
      'Tuning must have exactly 6 strings',
    ),
  )
  .optional()

export const fretCountParam = z
  .string()
  .transform((val) => Math.min(24, Math.max(1, parseInt(val, 10))))
  .pipe(z.number().int().min(1).max(24))
  .optional()

// ── Composed request schemas ──────────────────────────────────────────────────

export const chordsQuerySchema = z.object({
  key: keyParam,
  scale: scaleParam,
})

export const fretboardQuerySchema = z.object({
  key: keyParam,
  scale: scaleParam,
  tuning: tuningParam,
  fretCount: fretCountParam,
})

export const positionsQuerySchema = z.object({
  key: keyParam,
  scale: scaleParam,
  tuning: tuningParam,
})
