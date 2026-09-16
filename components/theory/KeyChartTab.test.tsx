import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KeyChartTab from './KeyChartTab'

/** The note text in each cell of a chord's row, '·' where the cell is empty. */
function rowCells(roman: string): string[] {
  const label = screen.getByText(roman)
  const row = label.closest('tr')!
  return within(row).getAllByRole('cell').map((td) => td.textContent ?? '')
}

describe('KeyChartTab', () => {
  it('heads the table with the scale, carried into the octave above', () => {
    render(<KeyChartTab />)
    const headers = screen.getAllByRole('columnheader').slice(1) // skip the chord column
    expect(headers.map((h) => h.textContent)).toEqual([
      'C1', 'D2', 'E3', 'F4', 'G5', 'A6', 'B7', 'C8', 'D9', 'E10', 'F11',
    ])
  })

  it('spells each chord out under the columns it uses', () => {
    render(<KeyChartTab />)
    expect(rowCells('I')).toEqual(['C', '·', 'E', '·', 'G', '·', '·', '·', '·', '·', '·'])
    expect(rowCells('ii')).toEqual(['·', 'D', '·', 'F', '·', 'A', '·', '·', '·', '·', '·'])
  })

  it('carries a chord that passes the 7th into the next octave', () => {
    render(<KeyChartTab />)
    // F A C — the C sits to the right of B, not back in column 1.
    expect(rowCells('IV')).toEqual(['·', '·', '·', 'F', '·', 'A', '·', 'C', '·', '·', '·'])
    expect(rowCells('vii°')).toEqual(['·', '·', '·', '·', '·', '·', 'B', '·', 'D', '·', 'F'])
  })

  it('switches key and re-spells the chart', async () => {
    const user = userEvent.setup()
    render(<KeyChartTab />)
    await user.selectOptions(screen.getByLabelText('Key'), 'F')

    const headers = screen.getAllByRole('columnheader').slice(1)
    expect(headers.slice(0, 7).map((h) => h.textContent)).toEqual([
      'F1', 'G2', 'A3', 'B♭4', 'C5', 'D6', 'E7',
    ])
    // The IV chord is spelled B♭, never A♯ — and climbs to the F above.
    expect(rowCells('IV')).toEqual(['·', '·', '·', 'B♭', '·', 'D', '·', 'F', '·', '·', '·'])
  })

  it('switches scale and re-labels the chords', async () => {
    const user = userEvent.setup()
    render(<KeyChartTab />)
    await user.selectOptions(screen.getByLabelText('Scale'), 'minor')
    expect(screen.getByText('i')).toBeInTheDocument()
    expect(screen.getByText('ii°')).toBeInTheDocument()
  })

  it('adds a fourth note to every row when switched to 7th chords', async () => {
    const user = userEvent.setup()
    render(<KeyChartTab />)
    await user.click(screen.getByRole('button', { name: '7th chords' }))
    // G7 = G B D F, ascending across the octave line.
    expect(rowCells('V7')).toEqual(
      ['·', '·', '·', '·', 'G', '·', 'B', '·', 'D', '·', 'F', '·', '·'],
    )
  })

  it('offers the cleaner enharmonic when a key needs double accidentals', async () => {
    const user = userEvent.setup()
    render(<KeyChartTab />)
    await user.selectOptions(screen.getByLabelText('Key'), 'Gb')
    await user.selectOptions(screen.getByLabelText('Scale'), 'minor')

    const suggestion = screen.getByRole('button', { name: /F♯ natural minor/ })
    await user.click(suggestion)

    expect(screen.getByLabelText('Key')).toHaveValue('F#')
  })
})
