/**
 * Audio instrument abstraction.
 *
 * Everything that makes sound goes through the `Instrument` interface so the
 * underlying engine (Web Audio synth today; a sampled soundfont / Tone.js /
 * etc. tomorrow) can be swapped in one place via `setInstrument()`.
 *
 * A single shared AudioContext is reused so we don't exhaust browser limits.
 */

let sharedCtx: AudioContext | null = null

/** Get (lazily create) the shared AudioContext, or null when unavailable (SSR). */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      sharedCtx = new Ctor()
    }
    return sharedCtx
  } catch {
    return null
  }
}

/** Convert a MIDI note number to its frequency in Hz (A4 = 69 = 440Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Play several MIDI notes together as a chord. There's no true sustain in the
 * engine layer, so "ringing" a chord just means a long `duration`. Notes fire
 * simultaneously (no strum/rhythm).
 */
export function playChord(
  instrument: Instrument,
  midis: number[],
  options: PlayNoteOptions = {},
): void {
  for (const midi of midis) {
    instrument.playNote(midi, options)
  }
}

export interface PlayNoteOptions {
  /** Seconds the note should sound for. */
  duration?: number
  /** Peak gain, 0–1. */
  velocity?: number
  /**
   * Absolute AudioContext time to start the note. Defaults to "now".
   * Used by sequencers to schedule notes ahead of time for tight timing.
   */
  time?: number
}

/**
 * A playable instrument. Implementations decide how a MIDI note is rendered.
 * Keep this surface minimal so alternative engines are easy to drop in.
 */
export interface Instrument {
  /** Human-readable id, handy for debugging / settings UI. */
  readonly name: string
  /** Resume the audio context (call from a user gesture to satisfy autoplay). */
  resume(): Promise<void>
  /** Play a single MIDI note. */
  playNote(midi: number, options?: PlayNoteOptions): void
}

/**
 * Default engine: a simple Web Audio synth (triangle oscillator with a
 * pluck-like envelope). No assets, no network, works offline.
 */
export class SynthInstrument implements Instrument {
  readonly name = 'synth'
  private readonly type: OscillatorType

  constructor(type: OscillatorType = 'triangle') {
    this.type = type
  }

  async resume(): Promise<void> {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* ignore */
      }
    }
  }

  playNote(midi: number, options: PlayNoteOptions = {}): void {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()

    const { duration = 0.7, velocity = 0.5 } = options
    const t = options.time ?? ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = this.type
    osc.frequency.value = midiToFreq(midi)

    // Quick attack then gentle decay for a pluck-like envelope.
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, velocity), t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    osc.start(t)
    osc.stop(t + duration + 0.05)
  }
}

/** Minimal structural view of an smplr instrument instance. */
interface SmplrInstrument {
  load: Promise<unknown>
  start(event: { note: number; time?: number; duration?: number; velocity?: number }): unknown
}

/**
 * Sampled instrument backed by smplr's GM soundfonts (real recorded samples).
 * Samples are fetched from a CDN on first use, so it needs a network connection
 * and a brief load before it can play. `smplr` is imported lazily so it never
 * lands in the bundle of trainers that only use the synth.
 */
export class SoundfontInstrument implements Instrument {
  readonly name: string
  private instrumentName: string
  private inst: SmplrInstrument | null = null
  private loadingPromise: Promise<void> | null = null

  constructor(instrumentName = 'acoustic_guitar_steel') {
    this.instrumentName = instrumentName
    this.name = `soundfont:${instrumentName}`
  }

  async resume(): Promise<void> {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* ignore */
      }
    }
    if (this.inst) return
    if (!this.loadingPromise) {
      this.loadingPromise = (async () => {
        const { Soundfont } = await import('smplr')
        const inst = new Soundfont(ctx, {
          instrument: this.instrumentName,
        }) as unknown as SmplrInstrument
        await inst.load
        this.inst = inst
      })()
    }
    await this.loadingPromise
  }

  playNote(midi: number, options: PlayNoteOptions = {}): void {
    const { duration = 1, velocity = 0.5 } = options
    const fire = () =>
      this.inst?.start({
        note: midi,
        time: options.time,
        duration,
        velocity: Math.round(Math.max(0, Math.min(1, velocity)) * 127),
      })
    if (this.inst) fire()
    else void this.resume().then(fire)
  }
}

/** Minimal structural view of a Tone.js Sampler. */
interface ToneSampler {
  triggerAttackRelease(
    note: string,
    duration: number,
    time?: number,
    velocity?: number,
  ): unknown
}

/**
 * Tone.js Sampler loaded with an acoustic-guitar sample pack. Like the soundfont
 * engine it streams samples from a CDN on first use. Tone is imported lazily and
 * runs on its own audio context (independent of the shared one).
 */
export class ToneSamplerInstrument implements Instrument {
  readonly name = 'tone-sampler'
  private sampler: ToneSampler | null = null
  private tone: typeof import('tone') | null = null
  private loadingPromise: Promise<void> | null = null

  async resume(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.sampler && this.tone) {
      try {
        await this.tone.start()
      } catch {
        /* ignore */
      }
      return
    }
    if (!this.loadingPromise) {
      this.loadingPromise = (async () => {
        const Tone = await import('tone')
        await Tone.start()
        const sampler = new Tone.Sampler({
          urls: {
            A2: 'A2.mp3',
            A3: 'A3.mp3',
            A4: 'A4.mp3',
            C4: 'C4.mp3',
            'D#3': 'Ds3.mp3',
          },
          baseUrl:
            'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments/samples/guitar-acoustic/',
        }).toDestination()
        await Tone.loaded()
        this.tone = Tone
        this.sampler = sampler as unknown as ToneSampler
      })()
    }
    await this.loadingPromise
  }

  playNote(midi: number, options: PlayNoteOptions = {}): void {
    const { duration = 1, velocity = 0.5 } = options
    const fire = () => {
      if (!this.sampler || !this.tone) return
      const note = this.tone.Frequency(midi, 'midi').toNote()
      this.sampler.triggerAttackRelease(
        note,
        duration,
        options.time,
        Math.max(0, Math.min(1, velocity)),
      )
    }
    if (this.sampler) fire()
    else void this.resume().then(fire)
  }
}

// ── Engine registry (for the comparison switcher) ────────────────────────────

export type AudioEngineId = 'guitar' | 'acoustic'

/** Default engine used by the scale-notes player when nothing is saved yet. */
export const DEFAULT_AUDIO_ENGINE: AudioEngineId = 'guitar'

export interface AudioEngineMeta {
  id: AudioEngineId
  label: string
  description: string
  /** Whether picking this engine triggers a network sample download. */
  loadsSamples: boolean
}

interface AudioEngineDef extends AudioEngineMeta {
  create: () => Instrument
}

const ENGINE_DEFS: AudioEngineDef[] = [
  {
    id: 'guitar',
    label: 'Guitar',
    description: 'A bright, sampled steel-string guitar.',
    loadsSamples: true,
    create: () => new SoundfontInstrument('acoustic_guitar_steel'),
  },
  {
    id: 'acoustic',
    label: 'Acoustic Guitar',
    description: 'A warmer, sampled acoustic guitar.',
    loadsSamples: true,
    create: () => new ToneSamplerInstrument(),
  },
]

export const AUDIO_ENGINES: AudioEngineMeta[] = ENGINE_DEFS.map(
  ({ id, label, description, loadsSamples }) => ({ id, label, description, loadsSamples }),
)

/** Coerce an arbitrary stored value into a valid engine id. */
export function coerceAudioEngineId(value: unknown): AudioEngineId {
  return ENGINE_DEFS.some((e) => e.id === value)
    ? (value as AudioEngineId)
    : DEFAULT_AUDIO_ENGINE
}

const engineCache = new Map<AudioEngineId, Instrument>()

/** Get (and cache) an instrument instance for a given engine id. */
export function getEngine(id: AudioEngineId): Instrument {
  let inst = engineCache.get(id)
  if (!inst) {
    const def = ENGINE_DEFS.find((e) => e.id === id) ?? ENGINE_DEFS[0]
    inst = def.create()
    engineCache.set(id, inst)
  }
  return inst
}

// ── Active instrument (swap here to change the whole app's sound) ─────────────

let current: Instrument | null = null

export function getInstrument(): Instrument {
  if (!current) current = new SynthInstrument()
  return current
}

/** Replace the active instrument (e.g. with a sampled soundfont engine). */
export function setInstrument(instrument: Instrument): void {
  current = instrument
}
