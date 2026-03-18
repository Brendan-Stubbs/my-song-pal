import { createMusicTheoryService } from './music-theory.service'
import type {
  IMusicTheoryService,
  ScaleInfo,
  FretboardNote,
  CagedPosition,
  ChordInfo,
} from '@/types/music'

// Mock the adapter module so unit tests do not depend on Tonal.js
jest.mock('./tonal.adapter')

import { createTonalAdapter } from './tonal.adapter'

const mockScaleInfo: ScaleInfo = {
  key: 'C',
  scale: 'major',
  notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  intervals: ['1P', '2M', '3M', '4P', '5P', '6M', '7M'],
  degrees: ['1', '2', '3', '4', '5', '6', '7'],
}

const mockFretboardNotes: FretboardNote[] = [
  { string: 6, fret: 0, note: 'E', degree: 3, degreeLabel: '3', isRoot: false },
  { string: 6, fret: 1, note: 'F', degree: 4, degreeLabel: '4', isRoot: false },
  { string: 1, fret: 0, note: 'E', degree: 3, degreeLabel: '3', isRoot: false },
  { string: 1, fret: 3, note: 'G', degree: 5, degreeLabel: '5', isRoot: false },
]

const mockChords: ChordInfo[] = [
  {
    root: 'C',
    name: 'C major',
    symbol: 'C',
    degree: 1,
    degreeLabel: 'I',
    quality: 'major',
    notes: ['C', 'E', 'G'],
  },
  {
    root: 'D',
    name: 'D minor',
    symbol: 'Dm',
    degree: 2,
    degreeLabel: 'ii',
    quality: 'minor',
    notes: ['D', 'F', 'A'],
  },
]

const mockCagedPositions: CagedPosition[] = [
  {
    shape: 'E',
    rootFret: 0,
    notes: mockFretboardNotes,
  },
  {
    shape: 'D',
    rootFret: 2,
    notes: mockFretboardNotes,
  },
  {
    shape: 'C',
    rootFret: 3,
    notes: mockFretboardNotes,
  },
  {
    shape: 'A',
    rootFret: 5,
    notes: mockFretboardNotes,
  },
  {
    shape: 'G',
    rootFret: 7,
    notes: mockFretboardNotes,
  },
]

const mockAdapter: IMusicTheoryService = {
  getScaleInfo: jest.fn().mockReturnValue(mockScaleInfo),
  getAvailableScales: jest.fn().mockReturnValue(['major', 'minor']),
  getAvailableKeys: jest.fn().mockReturnValue(['C', 'D', 'E']),
  getFretboardNotes: jest.fn().mockReturnValue(mockFretboardNotes),
  getCagedPositions: jest.fn().mockReturnValue(mockCagedPositions),
  getChords: jest.fn().mockReturnValue(mockChords),
}

;(createTonalAdapter as jest.Mock).mockReturnValue(mockAdapter)

describe('createMusicTheoryService', () => {
  let service: IMusicTheoryService

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createTonalAdapter as jest.Mock).mockReturnValue(mockAdapter)
    service = createMusicTheoryService()
  })

  it('returns a service object', () => {
    expect(service).toBeDefined()
    expect(typeof service.getScaleInfo).toBe('function')
    expect(typeof service.getAvailableScales).toBe('function')
    expect(typeof service.getAvailableKeys).toBe('function')
    expect(typeof service.getFretboardNotes).toBe('function')
    expect(typeof service.getCagedPositions).toBe('function')
    expect(typeof service.getChords).toBe('function')
  })

  describe('getScaleInfo delegation', () => {
    it('delegates to the adapter and returns its result', () => {
      const result = service.getScaleInfo('C', 'major')
      expect(mockAdapter.getScaleInfo).toHaveBeenCalledWith('C', 'major')
      expect(result).toBe(mockScaleInfo)
    })

    it('passes through key and scale arguments unchanged', () => {
      service.getScaleInfo('F#', 'dorian')
      expect(mockAdapter.getScaleInfo).toHaveBeenCalledWith('F#', 'dorian')
    })
  })

  describe('getAvailableScales delegation', () => {
    it('delegates to the adapter', () => {
      const result = service.getAvailableScales()
      expect(mockAdapter.getAvailableScales).toHaveBeenCalled()
      expect(result).toEqual(['major', 'minor'])
    })
  })

  describe('getAvailableKeys delegation', () => {
    it('delegates to the adapter', () => {
      const result = service.getAvailableKeys()
      expect(mockAdapter.getAvailableKeys).toHaveBeenCalled()
      expect(result).toEqual(['C', 'D', 'E'])
    })
  })

  describe('getFretboardNotes delegation', () => {
    it('delegates to the adapter with all arguments', () => {
      const tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
      const result = service.getFretboardNotes('C', 'major', tuning, 12)
      expect(mockAdapter.getFretboardNotes).toHaveBeenCalledWith('C', 'major', tuning, 12)
      expect(result).toBe(mockFretboardNotes)
    })
  })

  describe('getCagedPositions delegation', () => {
    it('delegates to the adapter with all arguments', () => {
      const tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
      const result = service.getCagedPositions('C', 'major', tuning)
      expect(mockAdapter.getCagedPositions).toHaveBeenCalledWith('C', 'major', tuning)
      expect(result).toBe(mockCagedPositions)
    })
  })

  describe('getChords delegation', () => {
    it('delegates to the adapter with key and scale', () => {
      const result = service.getChords('C', 'major')
      expect(mockAdapter.getChords).toHaveBeenCalledWith('C', 'major')
      expect(result).toBe(mockChords)
    })
  })

  describe('adapter is called via factory', () => {
    it('calls createTonalAdapter during service creation', () => {
      expect(createTonalAdapter).toHaveBeenCalled()
    })
  })
})
