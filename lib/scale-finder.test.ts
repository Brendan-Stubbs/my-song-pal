import { findMatchingScales } from './scale-finder'

function find(notes: string[], root?: string) {
  return findMatchingScales(notes, root)
}

describe('findMatchingScales', () => {
  it('names and spells a flat key with flats', () => {
    // The notes of Bb major, selected off the fretboard as sharps.
    const match = find(['A#', 'C', 'D', 'D#', 'F', 'G', 'A'], 'A#')
      .find((m) => m.scaleName === 'major')!

    expect(match.key).toBe('A#')                       // identifier the app uses
    expect(match.displayName).toBe('Bb Major')         // what the user reads
    expect(match.scaleNotes).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])
  })

  it('spells harmonic minor with one of each letter', () => {
    const match = find(['F', 'G', 'G#', 'A#', 'C', 'C#', 'E'], 'F')
      .find((m) => m.scaleName === 'harmonic minor')!

    expect(match.scaleNotes).toEqual(['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'])
  })

  it('still matches selections written as sharps against a flat-spelled scale', () => {
    // G#/Ab is the flat 3rd of F minor — picking it must not stop the match.
    const matches = find(['F', 'G#', 'C'], 'F')
    expect(matches.some((m) => m.scaleName === 'minor')).toBe(true)
  })

  it('reports matched and extra notes in the scale’s own spelling', () => {
    const match = find(['F', 'G#', 'C'], 'F').find((m) => m.scaleName === 'minor')!

    expect(match.matchedNotes).toEqual(['F', 'Ab', 'C'])
    expect(match.extraNotes).toEqual(['G', 'Bb', 'Db', 'Eb'])
    expect(match.extraNoteCount).toBe(4)
    // Every note is accounted for exactly once.
    expect([...match.matchedNotes, ...match.extraNotes].sort())
      .toEqual([...match.scaleNotes].sort())
  })

  it('needs at least two notes to guess anything', () => {
    expect(find(['C'])).toEqual([])
  })
})
