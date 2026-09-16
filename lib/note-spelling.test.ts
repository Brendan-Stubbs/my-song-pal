import { Note } from 'tonal'
import { prettyNote, spellScaleNotes, spellTonic } from './note-spelling'

/** Every scale should use each letter name at most once. */
function letters(notes: string[]): string[] {
  return notes.map((n) => n[0])
}

describe('spellTonic', () => {
  it('flips a tonic that would need double accidentals', () => {
    expect(spellTonic('A#', 'major')).toBe('Bb')   // A# major needs C## and F##
    expect(spellTonic('D#', 'major')).toBe('Eb')
    expect(spellTonic('G#', 'major')).toBe('Ab')
  })

  it('flips a tonic that is merely more cluttered', () => {
    expect(spellTonic('C#', 'major')).toBe('Db')   // 5 flats beats 7 sharps
    expect(spellTonic('A#', 'minor')).toBe('Bb')
  })

  it('keeps a tonic that already spells well', () => {
    expect(spellTonic('C', 'major')).toBe('C')
    expect(spellTonic('F', 'harmonic minor')).toBe('F')
    expect(spellTonic('C#', 'minor')).toBe('C#')   // 4 sharps; Db minor needs a Bbb
    expect(spellTonic('G#', 'minor')).toBe('G#')
  })

  it('keeps the caller’s spelling when both cost the same', () => {
    expect(spellTonic('F#', 'major')).toBe('F#')   // 6 sharps vs Gb’s 6 flats
    expect(spellTonic('D#', 'minor')).toBe('D#')
  })

  it('never changes the pitch, only the spelling', () => {
    for (const key of ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
      const spelled = spellTonic(key, 'major')
      expect(Note.chroma(spelled)).toBe(Note.chroma(key))
    }
  })

  it('returns the key untouched for an unknown scale', () => {
    expect(spellTonic('A#', 'not-a-real-scale')).toBe('A#')
  })
})

describe('spellScaleNotes', () => {
  it('spells F harmonic minor with flats, not a G alongside a G#', () => {
    expect(spellScaleNotes('F', 'harmonic minor')).toEqual([
      'F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E',
    ])
  })

  it('uses each letter exactly once across every key and seven-note scale', () => {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const scales = [
      'major', 'minor', 'harmonic minor', 'melodic minor',
      'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian',
    ]
    for (const scale of scales) {
      for (const key of keys) {
        const notes = spellScaleNotes(key, scale)
        expect(notes).toHaveLength(7)
        expect(new Set(letters(notes)).size).toBe(7)
        // …and none of them needs a double sharp or double flat.
        expect(notes.filter((n) => n.length > 2)).toEqual([])
      }
    }
  })

  it('returns nothing for an unknown scale', () => {
    expect(spellScaleNotes('C', 'not-a-real-scale')).toEqual([])
  })
})

describe('prettyNote', () => {
  it('swaps ASCII accidentals for typographic ones', () => {
    expect(prettyNote('Bb')).toBe('B♭')
    expect(prettyNote('F#')).toBe('F♯')
    expect(prettyNote('C')).toBe('C')
  })
})
