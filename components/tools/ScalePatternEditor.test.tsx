import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScalePatternEditor from './ScalePatternEditor'

const writeText = jest.fn<Promise<void>, [string]>(() => Promise.resolve())

beforeEach(() => writeText.mockClear())

/**
 * userEvent.setup() installs its own navigator.clipboard stub, so the spy has
 * to go on afterwards or the component writes into user-event's copy instead.
 */
function setup() {
  const user = userEvent.setup()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return user
}

const matrix = () => screen.getByLabelText('Scale pattern matrix') as HTMLTextAreaElement

/** Replace the matrix text, which drives the grid. */
async function setPattern(user: ReturnType<typeof userEvent.setup>, rows: string[]) {
  await user.clear(matrix())
  await user.paste(`[\n${rows.map((r) => `  [${r}],`).join('\n')}\n]`)
}

const copyButton = () => screen.getByRole('button', { name: /^Copy$/ })
const prompt = () => screen.queryByRole('dialog', { name: 'Empty first column' })

// Column 0 is empty on all six strings; columns 1-4 carry the pattern.
const EMPTY_FIRST_COLUMN = [
  `0, 'x', 0, 'x', 0`,
  `0, 0, 'x', 0, 'x'`,
  `0, 'x', 0, 'x', 0`,
  `0, 'R', 0, 'x', 0`,
  `0, 'x', 0, 'x', 0`,
  `0, 'x', 0, 'R', 0`,
]

const NO_EMPTY_COLUMN = [
  `'x', 0, 'x', 0, 'x'`,
  `0, 'x', 0, 'x', 0`,
  `'x', 0, 'x', 0, 'x'`,
  `'R', 0, 'x', 0, 'x'`,
  `'x', 0, 'x', 0, 'x'`,
  `'x', 0, 'R', 0, 'x'`,
]

describe('ScalePatternEditor copy', () => {
  it('copies straight to the clipboard when the first column is used', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, NO_EMPTY_COLUMN)
    await user.click(copyButton())

    expect(prompt()).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('asks before copying a pattern whose first column is empty on every string', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, EMPTY_FIRST_COLUMN)
    await user.click(copyButton())

    expect(prompt()).toBeInTheDocument()
    expect(writeText).not.toHaveBeenCalled()   // nothing copied until answered
  })

  it('drops the column and copies the narrower pattern on confirm', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, EMPTY_FIRST_COLUMN)
    await user.click(copyButton())
    await user.click(within(prompt()!).getByRole('button', { name: 'Remove and copy' }))

    const copied = writeText.mock.calls[0][0]
    expect(copied).toContain(`['x', 0, 'x', 0]`)      // 4 wide, shifted left
    expect(copied).toContain(`['R', 0, 'x', 0]`)
    // Every row lost exactly its first cell; none is 5 wide any more.
    const widths = [...copied.matchAll(/\[([^\[\]]+)\]/g)].map((m) => m[1].split(',').length)
    expect(widths).toEqual([4, 4, 4, 4, 4, 4])
    expect(prompt()).not.toBeInTheDocument()
    expect(matrix().value).toBe(copied)               // editor follows the copy
  })

  it('copies the pattern untouched when the user declines', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, EMPTY_FIRST_COLUMN)
    const before = matrix().value
    await user.click(copyButton())
    await user.click(within(prompt()!).getByRole('button', { name: 'Copy as is' }))

    expect(writeText).toHaveBeenCalledWith(before)
    expect(matrix().value).toBe(before)
    expect(prompt()).not.toBeInTheDocument()
  })

  it('does not offer the trim when the pattern is already at the minimum width', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    // 4 frets wide — dropping a column would leave an illegal 3-fret pattern.
    await setPattern(user, [
      `0, 'x', 0, 'x'`,
      `0, 0, 'x', 0`,
      `0, 'x', 0, 'x'`,
      `0, 'R', 0, 'x'`,
      `0, 'x', 0, 'x'`,
      `0, 'x', 0, 'R'`,
    ])
    await user.click(copyButton())

    expect(prompt()).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledTimes(1)
  })
})

// The pattern that shipped broken: the R on string 1 lands on F, the R on
// string 4 on C, so the shape cannot be moved to any position.
const MISMATCHED_ROOTS = [
  `0, 0, 'x', 'R', 0`,
  `'x', 0, 'x', 'x', 0`,
  `'x', 'x', 0, 'x', 0`,
  `'R', 0, 'x', 'x', 0`,
  `'x', 'x', 0, 0, 'x'`,
  `0, 'x', 0, 'x', 0`,
]

describe('ScalePatternEditor validation', () => {
  it('flags an R cell that does not land on the root, with no scale selected', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, MISMATCHED_ROOTS)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('1 root cell not on the root note')
    expect(alert).toHaveTextContent('String 1 (e) plays F here, not C')
  })

  it('confirms agreeing roots before a scale is chosen', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    // The octave shape: C at fret 8 on the low E, C at fret 10 on the D.
    await setPattern(user, [
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 'R', 0, 0`,
      `0, 0, 0, 0, 0`,
      `'R', 0, 0, 0, 0`,
    ])
    expect(screen.getByText(/All root cells agree/)).toBeInTheDocument()
  })

  it('says nothing can be validated until an R cell exists', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, Array(6).fill(`0, 'x', 0, 'x', 0`))
    expect(screen.getByText('Add an R cell to enable validation.')).toBeInTheDocument()
  })
})

describe('ScalePatternEditor root hints', () => {
  it('shows nothing until a root anchors the shape', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, Array(6).fill(`0, 'x', 0, 'x', 0`))
    expect(screen.queryByTitle(/Root note here/)).not.toBeInTheDocument()
  })

  it('rings every other root once one R is placed', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    // Single R on the low E — anchors the window at fret 8 (C).
    await setPattern(user, [
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `'R', 0, 0, 0, 0`,
    ])
    // The D string hits C two frets up — row 3, column 2.
    expect(screen.getByTestId('root-hint-3-2')).toBeInTheDocument()
    // The marked R itself is not ringed.
    expect(screen.queryByTestId('root-hint-5-0')).not.toBeInTheDocument()
  })

  it('rings a root position that is currently marked as a plain x', async () => {
    const user = setup()
    render(<ScalePatternEditor />)
    await setPattern(user, [
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 0, 0, 0`,
      `0, 0, 'x', 0, 0`,
      `0, 0, 0, 0, 0`,
      `'R', 0, 0, 0, 0`,
    ])
    expect(screen.getByTestId('root-hint-3-2')).toBeInTheDocument()
  })
})
