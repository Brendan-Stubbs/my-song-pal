/**
 * Guitar Pro / TuxGuitar file import.
 *
 * Parses a `.gp3/.gp4/.gp5/.gpx/.gp` file with alphaTab and converts a chosen
 * track + bar range into our `GuideNote[]` model, quantising rhythms onto one
 * of our fixed grid resolutions. Accents (slides, bends, hammer-ons, etc.) are
 * intentionally dropped — we only keep pitch + rhythmic position.
 *
 * alphaTab is a large dependency, so this module is only ever pulled in through
 * the dynamically-imported import modal — it never lands in the main bundle.
 */

import * as alphaTab from '@coderline/alphatab'
import { Note } from 'tonal'
import type { GuideNote, NoteDuration } from '@/types/metronome-loop'
import { SUBDIVISIONS_PER_BEAT } from '@/types/metronome-loop'

// alphaTab represents a quarter note as 960 MIDI ticks.
const TICKS_PER_QUARTER = 960

export interface GpTrackInfo {
  index: number
  name: string
  stringCount: number
}

export interface GpBarInfo {
  /** 1-indexed bar number as shown to the user. */
  number: number
  numerator: number
  denominator: number
}

export interface GpScoreInfo {
  title: string
  tempo: number
  tracks: GpTrackInfo[]
  bars: GpBarInfo[]
}

export interface ParsedGpFile {
  score: alphaTab.model.Score
  info: GpScoreInfo
}

/** Parse raw file bytes into an alphaTab score + a lightweight summary. */
export function parseGuitarProBytes(data: Uint8Array): ParsedGpFile {
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(data)

  const tracks: GpTrackInfo[] = score.tracks.map((t) => ({
    index: t.index,
    name: t.name?.trim() || `Track ${t.index + 1}`,
    stringCount: t.staves[0]?.tuning?.length ?? 6,
  }))

  const bars: GpBarInfo[] = score.masterBars.map((mb) => ({
    number: mb.index + 1,
    numerator: mb.timeSignatureNumerator,
    denominator: mb.timeSignatureDenominator,
  }))

  return {
    score,
    info: {
      title: score.title?.trim() || 'Untitled',
      tempo: Math.round(score.tempo) || 90,
      tracks,
      bars,
    },
  }
}

export interface ConvertOptions {
  trackIndex: number
  /** 1-indexed inclusive bar range. */
  startBar: number
  endBar: number
  /** Grid the rhythms are snapped onto. */
  resolution: NoteDuration
}

export interface ConvertResult {
  guideNotes: GuideNote[]
  bars: number
  beatsPerBar: number
  noteValue: 4 | 8
  /** True when at least one note was snapped to a different position. */
  quantised: boolean
  /** Notes dropped because their string was outside 1–6. */
  droppedStrings: number
}

function clampNoteValue(den: number): 4 | 8 {
  return den === 8 || den === 16 ? 8 : 4
}

/**
 * Convert a track + bar range into guide notes.
 *
 * Position math per bar uses that bar's own time signature; the resulting
 * loop uses the first selected bar's signature (mixed signatures aren't fully
 * supported — beats beyond the loop's beats-per-bar are dropped).
 */
export function convertToGuideNotes(
  score: alphaTab.model.Score,
  opts: ConvertOptions,
): ConvertResult {
  const { trackIndex, startBar, endBar, resolution } = opts
  const subCount = SUBDIVISIONS_PER_BEAT[resolution]

  const track = score.tracks[trackIndex]
  const staff = track?.staves[0]
  if (!track || !staff) {
    return { guideNotes: [], bars: 0, beatsPerBar: 4, noteValue: 4, quantised: false, droppedStrings: 0 }
  }

  // alphaTab numbers strings 1 = lowest (bottom line); our model uses
  // guitarString 1 = high e (top). Invert relative to the track's string count.
  const stringCount = staff.tuning?.length || 6

  const firstMaster = score.masterBars[startBar - 1]
  const beatsPerBar = Math.max(2, Math.min(7, firstMaster?.timeSignatureNumerator ?? 4))
  const noteValue = clampNoteValue(firstMaster?.timeSignatureDenominator ?? 4)

  const guideNotes: GuideNote[] = []
  const seen = new Set<string>()
  let quantised = false
  let droppedStrings = 0
  let outBar = 0

  for (let mbIndex = startBar - 1; mbIndex <= endBar - 1; mbIndex++) {
    const masterBar = score.masterBars[mbIndex]
    const bar = staff.bars[mbIndex]
    if (!masterBar || !bar) continue
    outBar += 1

    const den = masterBar.timeSignatureDenominator || 4
    const ticksPerBeat = TICKS_PER_QUARTER * (4 / den)

    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        if (beat.isRest || beat.notes.length === 0) continue

        const beatFloat = beat.playbackStart / ticksPerBeat
        let beatIndex = Math.floor(beatFloat) + 1
        const frac = beatFloat - Math.floor(beatFloat)
        let sub = Math.round(frac * subCount)
        if (Math.abs(frac * subCount - sub) > 1e-6) quantised = true
        if (sub >= subCount) {
          sub = 0
          beatIndex += 1
        }
        // Beat lands outside the loop's beats-per-bar → skip (varying sigs).
        if (beatIndex < 1 || beatIndex > beatsPerBar) continue

        for (const note of beat.notes) {
          if (note.isTieDestination || !note.isVisible || note.isDead) continue
          const guitarString = stringCount + 1 - note.string
          if (guitarString < 1 || guitarString > 6) {
            droppedStrings += 1
            continue
          }
          const midi = note.realValue
          const noteName = Note.fromMidi(midi)
          if (!noteName) continue

          const key = `${guitarString}:${outBar}:${beatIndex}:${sub}`
          if (seen.has(key)) continue
          seen.add(key)

          guideNotes.push({
            id: crypto.randomUUID(),
            bar: outBar,
            beat: beatIndex,
            subdivision: sub,
            duration: resolution,
            note: noteName,
            enabled: true,
            guitarString,
            fret: note.fret,
          })
        }
      }
    }
  }

  return {
    guideNotes,
    bars: Math.max(1, outBar),
    beatsPerBar,
    noteValue,
    quantised,
    droppedStrings,
  }
}
