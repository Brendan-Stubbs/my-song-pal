// Lightweight Web Audio helpers for playing pitched notes.
// A single shared AudioContext is reused so we don't exhaust browser limits.

let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      sharedCtx = new Ctor()
    }
    if (sharedCtx.state === 'suspended') void sharedCtx.resume()
    return sharedCtx
  } catch {
    return null
  }
}

/** Convert a MIDI note number to its frequency in Hz (A4 = 69 = 440Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Convert a MIDI note number to a note name with octave, e.g. 60 -> "C4". */
export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export interface PlayNotesOptions {
  /** Seconds each note sounds for. */
  noteDuration?: number
  /** Seconds between the start of consecutive notes. */
  gap?: number
  /** Oscillator waveform. */
  type?: OscillatorType
  /** Peak gain (0–1). */
  volume?: number
}

/**
 * Play a sequence of MIDI notes one after another.
 * Returns a promise that resolves once the whole sequence has finished sounding.
 */
export function playMidiSequence(
  midis: number[],
  { noteDuration = 0.7, gap = 0.75, type = 'triangle', volume = 0.5 }: PlayNotesOptions = {}
): Promise<void> {
  const ctx = getCtx()
  if (!ctx || midis.length === 0) return Promise.resolve()

  const start = ctx.currentTime + 0.05

  midis.forEach((midi, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = midiToFreq(midi)

    const t = start + i * gap
    // Quick attack then gentle decay for a pluck-like envelope.
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDuration)

    osc.start(t)
    osc.stop(t + noteDuration + 0.05)
  })

  const totalMs = ((midis.length - 1) * gap + noteDuration + 0.1) * 1000
  return new Promise((resolve) => setTimeout(resolve, totalMs))
}
