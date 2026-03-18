import type { IMusicTheoryService } from '@/types/music'
import { createTonalAdapter } from './tonal.adapter'

/**
 * Factory function that returns the music theory service.
 * Consumers should only import this function — never import tonal directly
 * or import the adapter directly.
 */
export function createMusicTheoryService(): IMusicTheoryService {
  return createTonalAdapter()
}
