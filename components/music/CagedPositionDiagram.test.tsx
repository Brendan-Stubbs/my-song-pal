import React from 'react'
import { render, screen } from '@testing-library/react'
import CagedPositionDiagram from './CagedPositionDiagram'
import type { CagedPosition } from '@/types/music'

const MOCK_POSITION: CagedPosition = {
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
    {
      string: 4,
      fret: 2,
      note: 'E',
      degree: 3,
      degreeLabel: '3',
      isRoot: false,
    },
    {
      string: 5,
      fret: 3,
      note: 'G',
      degree: 5,
      degreeLabel: '5',
      isRoot: false,
    },
  ],
}

describe('CagedPositionDiagram', () => {
  it('renders the position number', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    expect(screen.getByText('Position 1')).toBeInTheDocument()
  })

  it('renders the correct number of note dots', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    // 1 root dot + 2 scale dots = 3 total
    const rootDots = screen.getAllByTestId('root-dot')
    const scaleDots = screen.getAllByTestId('scale-dot')
    expect(rootDots.length + scaleDots.length).toBe(MOCK_POSITION.notes.length)
  })

  it('root notes render with a distinct marker (data-root attribute)', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    const rootDots = screen.getAllByTestId('root-dot')
    expect(rootDots).toHaveLength(1)
    expect(rootDots[0]).toHaveAttribute('data-root', 'true')
  })

  it('root notes are filled with the brand color', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    const rootDot = screen.getByTestId('root-dot')
    expect(rootDot).toHaveAttribute('fill', '#ff9933')
  })

  it('non-root notes do not have data-root attribute', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    const scaleDots = screen.getAllByTestId('scale-dot')
    scaleDots.forEach((dot) => {
      expect(dot).not.toHaveAttribute('data-root')
    })
  })

  it('shows note names inside dots by default', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('shows degree labels inside dots when showDegrees=true', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} showDegrees={true} />)
    // Use getAllByText since fret labels may also contain same numbers
    // The degree label '1' in dot should be white (#ffffff) fill — check it exists
    const allOnes = screen.getAllByText('1')
    expect(allOnes.length).toBeGreaterThanOrEqual(1)
    // At least one should be a dot label (white fill)
    const dotLabel = allOnes.find((el) => el.getAttribute('fill') === '#ffffff')
    expect(dotLabel).toBeDefined()

    const allThrees = screen.getAllByText('3')
    expect(allThrees.length).toBeGreaterThanOrEqual(1)
    const dotLabel3 = allThrees.find((el) => el.getAttribute('fill') === '#ffffff')
    expect(dotLabel3).toBeDefined()

    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
  })

  it('renders an svg with correct aria-label', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label', 'Position 1 at fret 0')
  })

  it('renders fret labels at the bottom', () => {
    render(<CagedPositionDiagram position={MOCK_POSITION} />)
    // rootFret is 0, so labels should be 0, 1, 2, 3, 4
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('4').length).toBeGreaterThan(0)
  })

  it('renders a different position correctly', () => {
    const position2: CagedPosition = {
      position: 2,
      rootFret: 5,
      notes: [
        { string: 5, fret: 7, note: 'A', degree: 1, degreeLabel: '1', isRoot: true },
      ],
    }
    render(<CagedPositionDiagram position={position2} />)
    expect(screen.getByText('Position 2')).toBeInTheDocument()
  })
})
