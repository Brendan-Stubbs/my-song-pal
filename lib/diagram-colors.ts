/**
 * Shared colour tokens for fretboard / scale / chord SVG diagrams.
 *
 * These are CSS custom properties (defined per theme in `app/globals.css`) so
 * the diagrams follow the active theme — root dots and highlights pick up the
 * theme accent, while the neutral scaffolding flips with light/dark. SVG
 * presentation attributes don't accept `var()`, so apply these via inline
 * `style` (e.g. `style={{ fill: DIAGRAM.brand }}`) rather than `fill=`.
 */
export const DIAGRAM = {
  /** Theme accent — root notes, selected/highlighted markers, octave marks. */
  brand: 'var(--brand)',
  /** Readable text/foreground on top of the accent. */
  onBrand: 'var(--on-brand)',
  /** Board background. */
  bg: 'var(--diagram-bg)',
  /** Open-string column shading. */
  open: 'var(--diagram-open)',
  /** String lines + inlay markers. */
  string: 'var(--diagram-string)',
  /** Fret lines. */
  fret: 'var(--diagram-fret)',
  /** Nut + heavy borders. */
  nut: 'var(--diagram-nut)',
  /** Fret numbers, string names, other quiet labels. */
  muted: 'var(--diagram-muted)',
  /** Non-root / unselected note dots. */
  note: 'var(--diagram-note)',
  /** Text on non-root note dots. */
  noteText: 'var(--diagram-note-text)',
} as const
