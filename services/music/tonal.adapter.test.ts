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

    it("positions are sorted in ascending fret order", () => {
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].rootFret).toBeGreaterThanOrEqual(
          positions[i - 1].rootFret,
        );
      }
    });

    it("each position has notes on all 6 strings", () => {
      positions.forEach((p) => {
        for (let s = 1; s <= 6; s++) {
          const strNotes = p.notes.filter((n) => n.string === s);
          expect(strNotes.length).toBeGreaterThan(0);
        }
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
