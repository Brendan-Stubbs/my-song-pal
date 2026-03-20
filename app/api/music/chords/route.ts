import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const scale = searchParams.get('scale')

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

    const service = createMusicTheoryService()
    const chords = service.getChords(key, scale)

    return NextResponse.json({ chords })
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
