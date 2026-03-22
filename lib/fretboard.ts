import { createTonalAdapter } from '@/services/music/tonal.adapter'

const adapter = createTonalAdapter()

export const getFretboardNotes = adapter.getFretboardNotes
export const getCagedPositions = adapter.getCagedPositions
