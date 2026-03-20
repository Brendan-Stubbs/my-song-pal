import type { FretboardNote } from '@/types/music'

const mockGetFretboardNotes = jest.fn()

jest.mock('@/services/music/music-theory.service', () => ({
  createMusicTheoryService: jest.fn(() => ({
    getFretboardNotes: mockGetFretboardNotes,
  })),
}))

import { GET } from '@/app/api/music/fretboard/route'
import { NextRequest } from 'next/server'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/music/fretboard')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const MOCK_NOTES: FretboardNote[] = [
  {
    string: 6,
    fret: 0,
    note: 'E',
    degree: 3,
    degreeLabel: '3',
    isRoot: false,
  },
  {
    string: 6,
    fret: 3,
    note: 'G',
    degree: 5,
    degreeLabel: '5',
    isRoot: false,
  },
]

describe('GET /api/music/fretboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with notes array for valid key and scale', async () => {
    mockGetFretboardNotes.mockReturnValue(MOCK_NOTES)

    const request = makeRequest({ key: 'C', scale: 'major' })
    const response = await GET(request)
    const data = await response.json() as { notes: FretboardNote[] }

    expect(response.status).toBe(200)
    expect(Array.isArray(data.notes)).toBe(true)
    expect(data.notes).toEqual(MOCK_NOTES)
  })

  it('calls getFretboardNotes with key, scale, tuning, and fretCount', async () => {
    mockGetFretboardNotes.mockReturnValue([])

    const request = makeRequest({ key: 'G', scale: 'minor' })
    await GET(request)

    expect(mockGetFretboardNotes).toHaveBeenCalledWith(
      'G',
      'minor',
      expect.any(Array),
      12,
    )
  })

  it('uses custom fretCount when provided', async () => {
    mockGetFretboardNotes.mockReturnValue([])

    const request = makeRequest({ key: 'C', scale: 'major', fretCount: '24' })
    await GET(request)

    expect(mockGetFretboardNotes).toHaveBeenCalledWith(
      'C',
      'major',
      expect.any(Array),
      24,
    )
  })

  it('returns 400 if key is missing', async () => {
    const request = makeRequest({ scale: 'major' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/key/i)
  })

  it('returns 400 if scale is missing', async () => {
    const request = makeRequest({ key: 'C' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/scale/i)
  })
})
