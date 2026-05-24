import { NextRequest, NextResponse } from 'next/server'
import { createMusicTheoryService } from '@/services/music/music-theory.service'
import { chordsQuerySchema } from '@/lib/validation/music-schemas'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = chordsQuerySchema.safeParse({
    key: searchParams.get('key'),
    scale: searchParams.get('scale'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    const service = createMusicTheoryService()
    const chords = service.getChords(parsed.data.key, parsed.data.scale)
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
