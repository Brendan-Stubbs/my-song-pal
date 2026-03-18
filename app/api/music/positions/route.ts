import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'

const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const scale = searchParams.get('scale')
    const tuningParam = searchParams.get('tuning')

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

    const service = createMusicTheoryService()
    const positions = service.getCagedPositions(key, scale, tuning)

    return NextResponse.json({ positions })
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
