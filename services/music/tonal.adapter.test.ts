import { createTonalAdapter } from "./tonal.adapter";

const DEFAULT_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"];
const FRET_COUNT = 12;

describe("TonalAdapter", () => {
  const adapter = createTonalAdapter();

  // ── getScaleInfo ──────────────────────────────────────────────────────────

  describe("getScaleInfo", () => {
    it("returns correct notes for C major", () => {
      const info = adapter.getScaleInfo("C", "major");
      expect(info.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
      expect(info.degrees).toHaveLength(7);
      expect(info.key).toBe("C");
      expect(info.scale).toBe("major");
    });

    it("returns correct notes for A minor", () => {
      const info = adapter.getScaleInfo("A", "minor");
      expect(info.notes).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    });

    it("throws for an invalid scale", () => {
      expect(() => adapter.getScaleInfo("C", "not-a-real-scale")).toThrow();
    });

    it("includes intervals array", () => {
      const info = adapter.getScaleInfo("C", "major");
      expect(info.intervals).toHaveLength(7);
    });
  });

  // ── getFretboardNotes ─────────────────────────────────────────────────────

  describe("getFretboardNotes", () => {
    let notes: ReturnType<typeof adapter.getFretboardNotes>;

    beforeEach(() => {
      notes = adapter.getFretboardNotes(
        "C",
        "major",
        DEFAULT_TUNING,
        FRET_COUNT,
      );
    });

    it("returns only notes in the C major scale", () => {
      const cMajor = ["C", "D", "E", "F", "G", "A", "B"];
      notes.forEach((n) => {
        expect(cMajor).toContain(n.note);
      });
    });

    it("marks C notes as root with degree 1", () => {
      const rootNotes = notes.filter((n) => n.note === "C");
      expect(rootNotes.length).toBeGreaterThan(0);
      rootNotes.forEach((n) => {
        expect(n.isRoot).toBe(true);
        expect(n.degree).toBe(1);
      });
    });

    it("marks non-C notes as not root", () => {
      const nonRoot = notes.filter((n) => n.note !== "C");
      nonRoot.forEach((n) => {
        expect(n.isRoot).toBe(false);
      });
    });

    it("string numbers are between 1 and 6", () => {
      notes.forEach((n) => {
        expect(n.string).toBeGreaterThanOrEqual(1);
        expect(n.string).toBeLessThanOrEqual(6);
      });
    });

    it("fret numbers are within 0..fretCount", () => {
      notes.forEach((n) => {
        expect(n.fret).toBeGreaterThanOrEqual(0);
        expect(n.fret).toBeLessThanOrEqual(FRET_COUNT);
      });
    });

    it("returns a non-empty array", () => {
      expect(notes.length).toBeGreaterThan(0);
    });
  });

  // ── getChords ─────────────────────────────────────────────────────────────

  describe("getChords", () => {
    it("C major returns 7 chords", () => {
      const chords = adapter.getChords("C", "major");
      expect(chords).toHaveLength(7);
    });

    it("C major chord qualities are correct", () => {
      const chords = adapter.getChords("C", "major");
      const qualities = chords.map((c) => c.quality);
      expect(qualities).toEqual([
        "major",
        "minor",
        "minor",
        "major",
        "major",
        "minor",
        "diminished",
      ]);
    });

    it("A minor returns 7 chords", () => {
      const chords = adapter.getChords("A", "minor");
      expect(chords).toHaveLength(7);
    });

    it("A minor chord qualities are correct", () => {
      const chords = adapter.getChords("A", "minor");
      const qualities = chords.map((c) => c.quality);
      expect(qualities).toEqual([
        "minor",
        "diminished",
        "major",
        "minor",
        "minor",
        "major",
        "major",
      ]);
    });

    it("degree labels use roman numerals", () => {
      const chords = adapter.getChords("C", "major");
      // major → uppercase, minor/dim → lowercase
      expect(chords[0].degreeLabel).toBe("I");
      expect(chords[1].degreeLabel).toBe("ii");
      expect(chords[2].degreeLabel).toBe("iii");
      expect(chords[3].degreeLabel).toBe("IV");
      expect(chords[4].degreeLabel).toBe("V");
      expect(chords[5].degreeLabel).toBe("vi");
      // diminished gets °
      expect(chords[6].degreeLabel).toContain("°");
    });

    it("each chord contains 3 notes", () => {
      const chords = adapter.getChords("C", "major");
      chords.forEach((c) => {
        expect(c.notes).toHaveLength(3);
      });
    });

    it("C major first chord is C major", () => {
      const chords = adapter.getChords("C", "major");
      expect(chords[0].root).toBe("C");
      expect(chords[0].notes).toEqual(["C", "E", "G"]);
    });
  });

  // ── getCagedPositions ─────────────────────────────────────────────────────

  describe("getCagedPositions", () => {
    let positions: ReturnType<typeof adapter.getCagedPositions>;

    beforeEach(() => {
      positions = adapter.getCagedPositions("C", "major", DEFAULT_TUNING);
    });

    it("returns exactly 5 positions", () => {
      expect(positions).toHaveLength(5);
    });

    it("positions are numbered 1 through 5", () => {
      const numbers = positions.map((p) => p.position);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it("each position has a non-empty notes array", () => {
      positions.forEach((p) => {
        expect(p.notes.length).toBeGreaterThan(0);
      });
    });

    it("all notes in each position are within a 7-fret window", () => {
      positions.forEach((p) => {
        p.notes.forEach((n) => {
          expect(n.fret).toBeGreaterThanOrEqual(p.rootFret);
          expect(n.fret).toBeLessThanOrEqual(p.rootFret + 7);
        });
      });
    });

    it("positions are in CAGED order (1=C, 2=A, 3=G, 4=E, 5=D)", () => {
      const numbers = positions.map((p) => p.position);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it("each position has notes on multiple strings", () => {
      positions.forEach((p) => {
        const stringsWithNotes = new Set(p.notes.map((n) => n.string));
        expect(stringsWithNotes.size).toBeGreaterThanOrEqual(4);
      });
    });

    it("C major produces only natural notes (no sharps or flats)", () => {
      const positions = adapter.getCagedPositions("C", "major", DEFAULT_TUNING);
      const naturalNotes = ["C", "D", "E", "F", "G", "A", "B"];
      positions.forEach((p) => {
        p.notes.forEach((n) => {
          expect(naturalNotes).toContain(n.note);
          expect(n.note).not.toMatch(/[#b]/);
        });
      });
    });

    it("uses hardcoded patterns: notes match scale degrees for key", () => {
      const positions = adapter.getCagedPositions("G", "major", DEFAULT_TUNING);
      const scaleNotes = ["G", "A", "B", "C", "D", "E", "F#"];
      positions.forEach((p) => {
        p.notes.forEach((n) => {
          expect(scaleNotes[n.degree - 1]).toBe(n.note);
        });
      });
    });

    it("returns note names (C, D, E, etc.) not pattern symbols (x, R)", () => {
      const positions = adapter.getCagedPositions("C", "major", DEFAULT_TUNING);
      const noteNamePattern = /^[A-G][#b]?$/;
      const degreePattern = /^[1-7b#]?[1-7]$/;
      positions.forEach((p) => {
        p.notes.forEach((n) => {
          expect(n.note).toMatch(noteNamePattern);
          expect(n.note).not.toBe("x");
          expect(n.note).not.toBe("R");
          expect(n.degreeLabel).toMatch(degreePattern);
          expect(n.degreeLabel).not.toBe("x");
          expect(n.degreeLabel).not.toBe("R");
        });
      });
    });

    it("returns distinct rootFret per position for C major", () => {
      const positions = adapter.getCagedPositions("C", "major", DEFAULT_TUNING);
      const rootFrets = positions.map((p) => p.rootFret);
      const unique = new Set(rootFrets);
      expect(unique.size).toBe(5);
    });

    it("uses string priority for root fret: C major pos 1 from low E (fret 8), pos 2 from D (fret 10)", () => {
      const positions = adapter.getCagedPositions("C", "major", DEFAULT_TUNING);
      const pos1 = positions.find((p) => p.position === 1);
      const pos2 = positions.find((p) => p.position === 2);
      // Position 1 (C shape): R on low E at fretOffset 1; C on low E = fret 8 → rootFret = 7
      expect(pos1?.rootFret).toBe(7);
      // Position 2 (A shape): no R on E/A; R on D at fretOffset 1; C on D = fret 10 → rootFret = 9
      expect(pos2?.rootFret).toBe(9);
    });

    it("returns empty array for pentatonic scale", () => {
      const penta = adapter.getCagedPositions(
        "C",
        "pentatonic major",
        DEFAULT_TUNING,
      );
      expect(penta).toEqual([]);
    });

    it("returns empty array for blues scale", () => {
      const blues = adapter.getCagedPositions("C", "blues", DEFAULT_TUNING);
      expect(blues).toEqual([]);
    });
  });

  // ── getAvailableScales ────────────────────────────────────────────────────

  describe("getAvailableScales", () => {
    it("returns an array that includes major and minor", () => {
      const scales = adapter.getAvailableScales();
      expect(scales).toContain("major");
      expect(scales).toContain("minor");
    });

    it("returns exactly 12 scales", () => {
      expect(adapter.getAvailableScales()).toHaveLength(12);
    });

    it("includes pentatonic scales", () => {
      const scales = adapter.getAvailableScales();
      expect(scales).toContain("pentatonic major");
      expect(scales).toContain("pentatonic minor");
    });
  });

  // ── getAvailableKeys ──────────────────────────────────────────────────────

  describe("getAvailableKeys", () => {
    it("returns 12 keys", () => {
      expect(adapter.getAvailableKeys()).toHaveLength(12);
    });

    it("includes C, G, A, F", () => {
      const keys = adapter.getAvailableKeys();
      expect(keys).toContain("C");
      expect(keys).toContain("G");
      expect(keys).toContain("A");
      expect(keys).toContain("F");
    });

    it("uses sharps not flats", () => {
      const keys = adapter.getAvailableKeys();
      keys.forEach((k) => {
        expect(k).not.toMatch(/b/);
      });
    });
  });
});
