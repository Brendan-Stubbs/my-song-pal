'use client'

import type { ChordInfo } from '@/types/music'
import { getChordVoicing, mapDiatonicQuality } from '@/data/open-chord-voicings'
import ChordDiagramCard from './ChordDiagramCard'

interface ChordHoverTooltipProps {
  chord: ChordInfo
  children: React.ReactNode
}

export default function ChordHoverTooltip({ chord, children }: ChordHoverTooltipProps) {
  const quality = mapDiatonicQuality(chord.quality)
  const voicing = getChordVoicing(chord.root, quality)

  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 delay-100"
      >
        <div className="shadow-2xl rounded-xl">
          <ChordDiagramCard
            voicing={voicing}
            chordSymbol={chord.symbol}
            degreeLabel={chord.degreeLabel}
            size="sm"
          />
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-600" />
      </div>
    </div>
  )
}
