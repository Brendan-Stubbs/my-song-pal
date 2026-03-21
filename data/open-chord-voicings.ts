/**
 * Open guitar chord voicing data.
 *
 * frets array: [string6_lowE, string5_A, string4_D, string3_G, string2_B, string1_highE]
 *   -1 = muted (X)
 *    0 = open string
 *   1+ = fret number (absolute, not relative to baseFret)
 *
 * baseFret: the first fret shown in the diagram (1 = nut visible)
 *
 * barres: barre bars drawn across multiple strings at a given fret.
 *   firstString / lastString use guitar string numbers (1 = high e, 6 = low E)
 *   so firstString < lastString always.
 *
 * null = no practical open/1st-position voicing available for this root+quality.
 */

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'dim'
  | '7'
  | 'maj7'
  | 'min7'
  | 'sus2'
  | 'sus4'

export interface ChordVoicing {
  /** [s6, s5, s4, s3, s2, s1] — -1=muted, 0=open, 1+=fret */
  frets: number[]
  /** First fret shown in the diagram */
  baseFret: number
  /** Optional barre indicators */
  barres?: Array<{
    fret: number
    /** String closest to high e that the barre covers (lower number = higher pitch) */
    firstString: number
    /** String closest to low E that the barre covers (higher number = lower pitch) */
    lastString: number
  }>
}

type VoicingEntry = ChordVoicing | null
type RootVoicings = Record<ChordQuality, VoicingEntry>

// ---------------------------------------------------------------------------
// Voicing data — organised by root (sharp notation), then quality
// ---------------------------------------------------------------------------

const voicings: Record<string, RootVoicings> = {
  // ── A ──────────────────────────────────────────────────────────────────
  A: {
    // x02220
    major: { frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
    // x02210
    minor: { frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
    // x02020
    '7': { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
    // x02120
    maj7: { frets: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
    // x02010
    min7: { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
    // x02200  — A sus2 = A B E
    sus2: { frets: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
    // x02230  — A sus4 = A D E
    sus4: { frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
    // Adim not common in open position
    dim: null,
  },

  // ── A# / Bb ────────────────────────────────────────────────────────────
  'A#': {
    // x13331 (barre at 1, strings 1-5)
    major: {
      frets: [-1, 1, 3, 3, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13321
    minor: {
      frets: [-1, 1, 3, 3, 2, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13131
    '7': {
      frets: [-1, 1, 3, 1, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13231  — Bbmaj7 = Bb D F A
    maj7: {
      frets: [-1, 1, 3, 2, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13121  — Bbm7 = Bb Db F Ab
    min7: {
      frets: [-1, 1, 3, 1, 2, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13311  — Bbsus2 = Bb C F
    sus2: {
      frets: [-1, 1, 3, 3, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    // x13341  — Bbsus4 = Bb Eb F
    sus4: {
      frets: [-1, 1, 3, 3, 4, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 5 }],
    },
    dim: null,
  },

  // ── B ──────────────────────────────────────────────────────────────────
  B: {
    // x24442 (barre at 2, strings 1-5)
    major: {
      frets: [-1, 2, 4, 4, 4, 2],
      baseFret: 2,
      barres: [{ fret: 2, firstString: 1, lastString: 5 }],
    },
    // x24432
    minor: {
      frets: [-1, 2, 4, 4, 3, 2],
      baseFret: 2,
      barres: [{ fret: 2, firstString: 1, lastString: 5 }],
    },
    // x21202  — B7 open chord
    '7': { frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
    // x24342  — Bmaj7 = B D# F# A#
    maj7: {
      frets: [-1, 2, 4, 3, 4, 2],
      baseFret: 2,
      barres: [{ fret: 2, firstString: 1, lastString: 5 }],
    },
    // x20202  — Bm7 open chord = B D F# A
    min7: { frets: [-1, 2, 0, 2, 0, 2], baseFret: 1 },
    // x24422  — Bsus2 = B C# F#
    sus2: {
      frets: [-1, 2, 4, 4, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, firstString: 1, lastString: 5 }],
    },
    // x24400  — Bsus4 = B E F#
    sus4: { frets: [-1, 2, 4, 4, 0, 0], baseFret: 2 },
    // Bdim — no practical open voicing
    dim: null,
  },

  // ── C ──────────────────────────────────────────────────────────────────
  C: {
    // x32010
    major: { frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
    // x35543 (barre at 3)
    minor: {
      frets: [-1, 3, 5, 5, 4, 3],
      baseFret: 3,
      barres: [{ fret: 3, firstString: 1, lastString: 5 }],
    },
    // x32310  — C7
    '7': { frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
    // x32000  — Cmaj7
    maj7: { frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
    // x35353 (barre at 3)  — Cm7
    min7: {
      frets: [-1, 3, 5, 3, 4, 3],
      baseFret: 3,
      barres: [{ fret: 3, firstString: 1, lastString: 5 }],
    },
    // x30013  — Csus2 = C D G
    sus2: { frets: [-1, 3, 0, 0, 1, 3], baseFret: 1 },
    // x33011  — Csus4 = C F G
    sus4: { frets: [-1, 3, 3, 0, 1, 1], baseFret: 1 },
    dim: null,
  },

  // ── C# / Db ────────────────────────────────────────────────────────────
  'C#': {
    // x46664 (barre at 4)
    major: {
      frets: [-1, 4, 6, 6, 6, 4],
      baseFret: 4,
      barres: [{ fret: 4, firstString: 1, lastString: 5 }],
    },
    minor: null,
    '7': null,
    // xx6554  — Dbmaj7 = Db F Ab C
    maj7: { frets: [-1, -1, 4, 3, 2, 1], baseFret: 4 },
    min7: null,
    sus2: null,
    sus4: null,
    dim: null,
  },

  // ── D ──────────────────────────────────────────────────────────────────
  D: {
    // xx0232
    major: { frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
    // xx0231
    minor: { frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
    // xx0212  — D7
    '7': { frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
    // xx0222  — Dmaj7
    maj7: { frets: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
    // xx0211  — Dm7
    min7: { frets: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
    // xx0230  — Dsus2 = D E A
    sus2: { frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
    // xx0233  — Dsus4 = D G A
    sus4: { frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
    dim: null,
  },

  // ── D# / Eb ────────────────────────────────────────────────────────────
  'D#': {
    major: null,
    minor: null,
    '7': null,
    maj7: null,
    min7: null,
    sus2: null,
    sus4: null,
    dim: null,
  },

  // ── E ──────────────────────────────────────────────────────────────────
  E: {
    // 022100
    major: { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
    // 022000
    minor: { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
    // 020100  — E7
    '7': { frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
    // 021100  — Emaj7
    maj7: { frets: [0, 2, 1, 1, 0, 0], baseFret: 1 },
    // 020000  — Em7
    min7: { frets: [0, 2, 0, 0, 0, 0], baseFret: 1 },
    // 024400  — Esus2 = E F# B
    sus2: { frets: [0, 2, 4, 4, 0, 0], baseFret: 1 },
    // 022200  — Esus4 = E A B
    sus4: { frets: [0, 2, 2, 2, 0, 0], baseFret: 1 },
    dim: null,
  },

  // ── F ──────────────────────────────────────────────────────────────────
  F: {
    // 133211 (full barre at 1)
    major: {
      frets: [1, 3, 3, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 6 }],
    },
    // 133111
    minor: {
      frets: [1, 3, 3, 1, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 6 }],
    },
    // 131211
    '7': {
      frets: [1, 3, 1, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 6 }],
    },
    // xx3210  — Fmaj7 (nice open voicing!)
    maj7: { frets: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
    // 131111
    min7: {
      frets: [1, 3, 1, 1, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, firstString: 1, lastString: 6 }],
    },
    // xx3011  — Fsus2 = F G C
    sus2: { frets: [-1, -1, 3, 0, 1, 1], baseFret: 1 },
    // xx3311  — Fsus4 = F Bb C
    sus4: { frets: [-1, -1, 3, 3, 1, 1], baseFret: 1 },
    dim: null,
  },

  // ── F# / Gb ────────────────────────────────────────────────────────────
  'F#': {
    // 244322 (barre at 2)
    major: {
      frets: [2, 4, 4, 3, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, firstString: 1, lastString: 6 }],
    },
    minor: null,
    '7': null,
    maj7: null,
    min7: null,
    sus2: null,
    sus4: null,
    dim: null,
  },

  // ── G ──────────────────────────────────────────────────────────────────
  G: {
    // 320003
    major: { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
    // 355333 (barre at 3)
    minor: {
      frets: [3, 5, 5, 3, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, firstString: 1, lastString: 6 }],
    },
    // 320001  — G7
    '7': { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
    // 320002  — Gmaj7
    maj7: { frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },
    // 353333 (barre at 3)  — Gm7
    min7: {
      frets: [3, 5, 3, 3, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, firstString: 1, lastString: 6 }],
    },
    // 300233  — Gsus2 = G A D
    sus2: { frets: [3, 0, 0, 2, 3, 3], baseFret: 1 },
    // 330013  — Gsus4 = G C D
    sus4: { frets: [3, 3, 0, 0, 1, 3], baseFret: 1 },
    dim: null,
  },

  // ── G# / Ab ────────────────────────────────────────────────────────────
  'G#': {
    major: null,
    minor: null,
    '7': null,
    maj7: null,
    min7: null,
    sus2: null,
    sus4: null,
    dim: null,
  },
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map ChordInfo.quality ('major' | 'minor' | 'diminished') to ChordQuality */
export function mapDiatonicQuality(
  quality: 'major' | 'minor' | 'diminished',
): ChordQuality {
  if (quality === 'diminished') return 'dim'
  return quality
}

/**
 * Look up a chord voicing. Returns null when no voicing is recorded.
 * Handles both sharp and flat notation (Bb → A#, Db → C#, etc.)
 */
export function getChordVoicing(
  root: string,
  quality: ChordQuality,
): ChordVoicing | null {
  const normalized = normalizeRoot(root)
  return voicings[normalized]?.[quality] ?? null
}

/** Normalise flat roots to sharp equivalents */
function normalizeRoot(root: string): string {
  const flatToSharp: Record<string, string> = {
    Bb: 'A#',
    Db: 'C#',
    Eb: 'D#',
    Fb: 'E',
    Gb: 'F#',
    Ab: 'G#',
    Cb: 'B',
  }
  return flatToSharp[root] ?? root
}

/** Human-readable quality label for display */
export function qualityLabel(q: ChordQuality): string {
  const labels: Record<ChordQuality, string> = {
    major: 'Major',
    minor: 'Minor',
    dim: 'Dim',
    '7': '7',
    maj7: 'Maj7',
    min7: 'Min7',
    sus2: 'Sus2',
    sus4: 'Sus4',
  }
  return labels[q]
}

/** Build a chord symbol string, e.g. root="C", quality="min7" → "Cm7" */
export function buildChordSymbol(root: string, quality: ChordQuality): string {
  const suffixes: Record<ChordQuality, string> = {
    major: '',
    minor: 'm',
    dim: '°',
    '7': '7',
    maj7: 'maj7',
    min7: 'm7',
    sus2: 'sus2',
    sus4: 'sus4',
  }
  return `${root}${suffixes[quality]}`
}
