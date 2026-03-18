import type { CagedPosition } from '@/types/music'

const mockGetCagedPositions = jest.fn()

jest.mock('@/services/music/music-theory.service', () => ({
  createMusicTheoryService: jest.fn(() => ({
    getCagedPositions: mockGetCagedPositions,
  })),
}))

import { GET } from '@/app/api/music/positions/route'
import { NextRequest } from 'next/server'

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/music/positions')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const MOCK_POSITIONS: CagedPosition[] = [
  {
    position: 1,
    rootFret: 0,
    notes: [
      {
        string: 2,
        fret: 1,
        note: 'C',
        degree: 1,
        degreeLabel: '1',
        isRoot: true,
      },
    ],
  },
]

describe('GET /api/music/positions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 with positions array for valid key and scale', async () => {
    mockGetCagedPositions.mockReturnValue(MOCK_POSITIONS)

    const request = makeRequest({ key: 'C', scale: 'major' })
    const response = await GET(request)
    const data = await response.json() as { positions: CagedPosition[] }

    expect(response.status).toBe(200)
    expect(Array.isArray(data.positions)).toBe(true)
    expect(data.positions).toEqual(MOCK_POSITIONS)
  })

  it('calls getCagedPositions with the correct key and scale', async () => {
    mockGetCagedPositions.mockReturnValue([])

    const request = makeRequest({ key: 'G', scale: 'minor' })
    await GET(request)

    expect(mockGetCagedPositions).toHaveBeenCalledWith('G', 'minor', expect.any(Array))
  })

  it('uses custom tuning when provided', async () => {
    mockGetCagedPositions.mockReturnValue([])

    const request = makeRequest({ key: 'C', scale: 'major', tuning: 'D2,A2,D3,G3,B3,E4' })
    await GET(request)

    expect(mockGetCagedPositions).toHaveBeenCalledWith(
      'C',
      'major',
      ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    )
  })

  it('returns 400 if key is missing', async () => {
    const request = makeRequest({ scale: 'major' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/key/i)
  })

  it('returns 400 if key is an empty string', async () => {
    const request = makeRequest({ key: '', scale: 'major' })
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 if scale is missing', async () => {
    const request = makeRequest({ key: 'C' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/scale/i)
  })

  it('returns 400 if scale is an empty string', async () => {
    const request = makeRequest({ key: 'C', scale: '' })
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('returns 500 if the service throws an Error', async () => {
    mockGetCagedPositions.mockImplementation(() => {
      throw new Error('Unknown scale: "C unknown"')
    })

    const request = makeRequest({ key: 'C', scale: 'unknown' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toContain('Unknown scale')
  })

  it('returns 500 with a generic message if the service throws a non-Error', async () => {
    mockGetCagedPositions.mockImplementation(() => {
      throw 'something went wrong'
    })

    const request = makeRequest({ key: 'C', scale: 'major' })
    const response = await GET(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(500)
    expect(data.error).toBeTruthy()
  })
})
