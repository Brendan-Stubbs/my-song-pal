import { createTonalAdapter } from '@/services/music/tonal.adapter'

// Routed through the tonal adapter so scale-name normalisation (e.g.
// "pentatonic major" -> "major pentatonic") and key spelling stay consistent
// with the rest of the app.
const adapter = createTonalAdapter()

export const getScaleInfo = adapter.getScaleInfo
export const getAvailableScales = adapter.getAvailableScales
export const getAvailableKeys = adapter.getAvailableKeys
export const getChords = adapter.getChords

/**
 * How a key identifier is spelled for a given scale — "A#" + "major" → "Bb".
 * Use this wherever the UI prints a key name, so the heading matches the notes
 * underneath it.
 */
export function getKeySpelling(key: string, scale: string): string {
  try {
    return getScaleInfo(key, scale).tonic
  } catch {
    return key
  }
}
