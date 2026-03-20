import React from 'react'
import { render, screen } from '@testing-library/react'
import FretboardDiagram from './FretboardDiagram'
import type { FretboardNote } from '@/types/music'

const MOCK_NOTES: FretboardNote[] = [
  { string: 6, fret: 0, note: 'E', degree: 3, degreeLabel: '3', isRoot: false },
  { string: 6, fret: 3, note: 'G', degree: 5, degreeLabel: '5', isRoot: false },
  { string: 5, fret: 5, note: 'C', degree: 1, degreeLabel: '1', isRoot: true },
]

describe('FretboardDiagram', () => {
  it('renders an svg with aria-label', () => {
    render(<FretboardDiagram notes={MOCK_NOTES} fretCount={12} />)
    const svg = screen.getByRole('img', { name: /fretboard showing scale notes/i })
    expect(svg).toBeInTheDocument()
  })

  it('renders root notes with distinct styling', () => {
    render(<FretboardDiagram notes={MOCK_NOTES} fretCount={12} />)
    const rootDots = screen.getAllByTestId('root-dot')
    expect(rootDots).toHaveLength(1)
    expect(rootDots[0]).toHaveAttribute('data-root', 'true')
  })

  it('renders scale notes', () => {
    render(<FretboardDiagram notes={MOCK_NOTES} fretCount={12} />)
    const scaleDots = screen.getAllByTestId('scale-dot')
    expect(scaleDots).toHaveLength(2)
  })

  it('shows note names by default', () => {
    render(<FretboardDiagram notes={MOCK_NOTES} fretCount={12} />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('shows degree labels when showDegrees is true', () => {
    render(<FretboardDiagram notes={MOCK_NOTES} fretCount={12} showDegrees />)
    const allOnes = screen.getAllByText('1')
    const dotLabel = allOnes.find((el) => el.getAttribute('fill') === '#ffffff')
    expect(dotLabel).toBeDefined()
    expect(screen.getAllByText('3').some((el) => el.getAttribute('fill') === '#ffffff')).toBe(true)
    expect(screen.getAllByText('5').some((el) => el.getAttribute('fill') === '#ffffff')).toBe(true)
  })
})
