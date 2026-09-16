/**
 * How the app spells a key.
 *
 * A scale should use each letter name once — F harmonic minor is
 * F G A♭ B♭ C D♭ E, never F G G♯ A♯ C C♯ E. Tonal already spells scales that
 * way, so the job here is only to pick *which* enharmonic tonic to hand it:
 * "A♯ major" is technically a key but needs double sharps to write, whereas the
 * identical "B♭ major" needs two flats.
 *
 * The app's key identifiers stay as the twelve sharp names (they are persisted
 * in saved practice items and sent over the music API), so this translation
 * happens at the point notes are produced rather than at the point they are
 * chosen.
 */

import { Note, Scale } from 'tonal'

/** Notes needing a double accidental — "B𝄫", "F𝄪" — are heavily penalised. */
const DOUBLE_ACCIDENTAL_COST = 100

/**
 * How awkward a spelling is to read. Lower is better: double accidentals first,
 * then the sheer number of sharps and flats.
 */
function spellingCost(notes: string[]): number {
  let cost = 0
  for (const note of notes) {
    const accidentals = note.length - 1
    if (accidentals > 1) cost += DOUBLE_ACCIDENTAL_COST
    cost += accidentals
  }
  return cost
}

/**
 * The tonic spelling that writes this scale most cleanly.
 *
 * `key` may be any spelling of the tonic (the app hands us sharps); `scale`
 * must already be a name tonal understands. Ties keep the caller's spelling, so
 * F♯ major stays F♯ rather than flipping to the equally-priced G♭. Returns the
 * input unchanged when the scale is unknown.
 */
export function spellTonic(key: string, scale: string): string {
  const own = Scale.get(`${key} ${scale}`).notes
  if (own.length === 0) return key

  const alt = Note.enharmonic(key)
  if (!alt || alt === key) return key

  const altNotes = Scale.get(`${alt} ${scale}`).notes
  if (altNotes.length !== own.length) return key

  return spellingCost(altNotes) < spellingCost(own) ? alt : key
}

/**
 * The notes of a scale, spelled with one of each letter name.
 * Returns an empty array for scales tonal doesn't recognise.
 */
export function spellScaleNotes(key: string, scale: string): string[] {
  return Scale.get(`${spellTonic(key, scale)} ${scale}`).notes
}

/** Swap ASCII accidentals for the typographic ones used in the UI. */
export function prettyNote(note: string): string {
  return note
    .replace(/##/g, '𝄪')
    .replace(/bb/g, '𝄫')
    .replace(/#/g, '♯')
    .replace(/b/g, '♭')
}
