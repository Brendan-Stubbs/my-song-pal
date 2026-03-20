import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'

const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const DEFAULT_FRET_COUNT = 12

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const scale = searchParams.get('scale')
    const tuningParam = searchParams.get('tuning')
    const fretCountParam = searchParams.get('fretCount')

    if (!key || key.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required query parameter: key' },
        { status: 400 },
      )
    }

    if (!scale || scale.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required query parameter: scale' },
        { status: 400 },
      )
    }

    const tuning = tuningParam
      ? tuningParam.split(',').map((s) => s.trim())
      : DEFAULT_TUNING

    const fretCount = fretCountParam
      ? Math.min(24, Math.max(1, parseInt(fretCountParam, 10) || DEFAULT_FRET_COUNT))
      : DEFAULT_FRET_COUNT

    const service = createMusicTheoryService()
    const notes = service.getFretboardNotes(key, scale, tuning, fretCount)

    return NextResponse.json({ notes })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
