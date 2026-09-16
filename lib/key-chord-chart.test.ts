import { buildKeyChordChart, prettyNote } from './key-chord-chart'

/** Compact view of a row: the note in each column, '.' where empty. */
function cellNotes(cells: ({ note: string } | null)[]): string {
  return cells.map((c) => c?.note ?? '.').join(' ')
}

describe('buildKeyChordChart', () => {
  it('carries the columns into the octave above so no chord wraps', () => {
    const chart = buildKeyChordChart('C', 'major')!
    // The vii chord reaches four steps past the 7th, so the scale repeats to F.
    expect(chart.columns.map((c) => c.note)).toEqual([
      'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F',
    ])
    expect(chart.columns.map((c) => c.degree)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(chart.columns.map((c) => c.octave)).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1])
  })

  it('places each chord tone in its own column', () => {
    const chart = buildKeyChordChart('C', 'major')!
    //                                        C D E F G A B C D E F
    expect(cellNotes(chart.rows[0].cells)).toBe('C . E . G . . . . . .')   // I  — C
    expect(cellNotes(chart.rows[1].cells)).toBe('. D . F . A . . . . .')   // ii — Dm
  })

  it('ascends past the octave instead of folding back to column 1', () => {
    const chart = buildKeyChordChart('C', 'major')!
    //                                        C D E F G A B C D E F
    expect(cellNotes(chart.rows[3].cells)).toBe('. . . F . A . C . . .')   // IV   — F A C
    expect(cellNotes(chart.rows[5].cells)).toBe('. . . . . A . C . E .')   // vi   — Am
    expect(cellNotes(chart.rows[6].cells)).toBe('. . . . . . B . D . F')   // vii° — Bdim
  })

  it('reports which column each chord is rooted in', () => {
    const chart = buildKeyChordChart('C', 'major')!
    expect(chart.rows.map((r) => r.rootColumn)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('keeps every chord ascending, in every key and scale', () => {
    for (const scale of ['major', 'minor', 'harmonic minor', 'locrian']) {
      for (const sevenths of [false, true]) {
        const chart = buildKeyChordChart('C', scale, { sevenths })!
        for (const row of chart.rows) {
          const filled = row.cells.flatMap((c, i) => (c ? [i] : []))
          expect(filled).toHaveLength(sevenths ? 4 : 3)
          // Strictly increasing: the chord only ever moves right.
          expect([...filled].sort((a, b) => a - b)).toEqual(filled)
          expect(filled[0]).toBe(row.rootColumn)
        }
      }
    }
  })

  it('labels the diatonic triads of a major key', () => {
    const chart = buildKeyChordChart('C', 'major')!
    expect(chart.rows.map((r) => r.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(chart.rows.map((r) => r.symbol)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
  })

  it('labels the diatonic triads of a natural minor key', () => {
    const chart = buildKeyChordChart('A', 'minor')!
    expect(chart.rows.map((r) => r.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
  })

  it('keeps the key signature spelling instead of normalising to sharps', () => {
    const chart = buildKeyChordChart('F', 'major')!
    expect(chart.columns.slice(0, 7).map((c) => c.note)).toEqual([
      'F', 'G', 'A', 'B♭', 'C', 'D', 'E',
    ])
    expect(chart.rows[3].symbol).toBe('B♭')   // IV is B-flat, never A-sharp
  })

  it('marks the augmented III of harmonic minor', () => {
    const chart = buildKeyChordChart('A', 'harmonic minor')!
    expect(chart.rows[2].quality).toBe('augmented')
    expect(chart.rows[2].roman).toBe('III+')
    expect(chart.rows[2].symbol).toBe('Caug')
  })

  it('tags each cell with the tone it holds', () => {
    const chart = buildKeyChordChart('C', 'major')!
    const roles = chart.rows[3].cells.filter(Boolean).map((c) => c!.role)
    expect(roles).toEqual(['root', 'third', 'fifth'])   // IV: F=root, A=3rd, C=5th
  })

  describe('with sevenths', () => {
    it('adds a fourth filled cell and two more columns to hold it', () => {
      const chart = buildKeyChordChart('C', 'major', { sevenths: true })!
      expect(chart.columns).toHaveLength(13)   // up to the 13th, for vii = B D F A
      //                                        C D E F G A B C D E F G A
      expect(cellNotes(chart.rows[0].cells)).toBe('C . E . G . B . . . . . .')
      expect(cellNotes(chart.rows[6].cells)).toBe('. . . . . . B . D . F . A')
      expect(chart.rows[0].notes).toEqual(['C', 'E', 'G', 'B'])
    })

    it('names the seventh chords of a major key', () => {
      const chart = buildKeyChordChart('C', 'major', { sevenths: true })!
      expect(chart.rows.map((r) => r.symbol)).toEqual([
        'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7♭5',
      ])
      expect(chart.rows[4].roman).toBe('V7')
      expect(chart.rows[6].roman).toBe('viiø7')
    })

    it('names the fully-diminished vii of harmonic minor', () => {
      const chart = buildKeyChordChart('A', 'harmonic minor', { sevenths: true })!
      expect(chart.rows[6].symbol).toBe('G♯dim7')
      expect(chart.rows[6].roman).toBe('vii°7')
    })
  })

  describe('spelling', () => {
    it('suggests the enharmonic tonic when a key needs double accidentals', () => {
      const chart = buildKeyChordChart('Gb', 'minor')!
      expect(chart.awkwardSpelling).toEqual({ suggestedTonic: 'F#' })
    })

    it('stays quiet for keys that spell cleanly', () => {
      expect(buildKeyChordChart('Eb', 'major')!.awkwardSpelling).toBeNull()
      expect(buildKeyChordChart('C#', 'minor')!.awkwardSpelling).toBeNull()
    })
  })

  it('returns null for scales that cannot stack diatonic thirds', () => {
    expect(buildKeyChordChart('C', 'major pentatonic')).toBeNull()
    expect(buildKeyChordChart('C', 'not a scale')).toBeNull()
  })
})

describe('prettyNote', () => {
  it('swaps ASCII accidentals for typographic ones', () => {
    expect(prettyNote('Bb')).toBe('B♭')
    expect(prettyNote('F#')).toBe('F♯')
    expect(prettyNote('C')).toBe('C')
  })
})
