import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'
import { fretboardQuerySchema } from '@/lib/validation/music-schemas'

const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const DEFAULT_FRET_COUNT = 12

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = fretboardQuerySchema.safeParse({
    key: searchParams.get('key'),
    scale: searchParams.get('scale'),
    tuning: searchParams.get('tuning') ?? undefined,
    fretCount: searchParams.get('fretCount') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    const tuning = parsed.data.tuning ?? DEFAULT_TUNING
    const fretCount = parsed.data.fretCount ?? DEFAULT_FRET_COUNT

    const service = createMusicTheoryService()
    const notes = service.getFretboardNotes(parsed.data.key, parsed.data.scale, tuning, fretCount)
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
