import { createTonalAdapter } from '@/services/music/tonal.adapter'

// Routed through the tonal adapter so scale-name normalisation (e.g.
// "pentatonic major" -> "major pentatonic") and sharp spelling stay consistent
// with the rest of the app.
const adapter = createTonalAdapter()

export const getScaleInfo = adapter.getScaleInfo
export const getAvailableScales = adapter.getAvailableScales
export const getAvailableKeys = adapter.getAvailableKeys
export const getChords = adapter.getChords
