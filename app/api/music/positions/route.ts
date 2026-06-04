import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'
import { positionsQuerySchema } from '@/lib/validation/music-schemas'

const DEFAULT_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = positionsQuerySchema.safeParse({
    key: searchParams.get('key'),
    scale: searchParams.get('scale'),
    tuning: searchParams.get('tuning') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    const tuning = parsed.data.tuning ?? DEFAULT_TUNING

    const service = createMusicTheoryService()
    const positions = service.getCagedPositions(parsed.data.key, parsed.data.scale, tuning)
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
