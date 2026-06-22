# Trainer Audio — Improving the Sound

> Status: decision pending. Captured for later pickup.
>
> Goal: make the audio in the Interval Trainer and Fretboard "Find the note"
> trainer sound less synthetic — closer to a real guitar / Guitar Pro MIDI.

## Background

Both trainers play notes through a single shared function,
`playMidiSequence()` in [`lib/audio.ts`](../lib/audio.ts). Today each note is
rendered as **one triangle-wave oscillator** with a quick attack and
exponential decay:

```ts
osc.type = 'triangle'
osc.frequency.value = midiToFreq(midi)
gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDuration)
```

That single oscillator is why it sounds "beepy" — there are no overtones,
no pluck transient, and no string body.

Good news: `playMidiSequence` is the **single chokepoint** both trainers use,
so any option below is a contained swap behind that same function signature.
"Guitar Pro MIDI" specifically = a General MIDI **soundfont** playing the
guitar program, so the sample-based options are the closest match to that
reference.

---

## Option 1 — Karplus–Strong plucked-string synthesis

A physical model of a plucked string: seed a short burst of noise into a tuned
feedback delay line with a lowpass filter; the delay length sets the pitch and
the filtered feedback creates the natural decay/timbre. All done in Web Audio.

**For**

- Zero dependencies, zero asset files.
- Fully offline — no network at runtime.
- Instant playback, no load latency.
- Dramatically more string-like than the current beep (real pluck transient + decay).
- Small, self-contained change to `lib/audio.ts`.

**Against**

- Still synthesis — won't be mistaken for a miked acoustic guitar.
- Needs a little DSP tuning (decay time, damping, pluck brightness) to taste.
- Less "produced" than samples; no body resonance / finger noise.

**Effort:** Low. **Realism:** Medium. **Deps:** none. **Offline:** yes.

---

## Option 2 — Sampled guitar soundfont via `smplr` (RECOMMENDED)

Use [`smplr`](https://github.com/danigb/smplr) (by the author of `tonal`, which
we already depend on) to load a General MIDI soundfont instrument and trigger
notes by MIDI number:

```ts
import { Soundfont } from 'smplr'
const guitar = new Soundfont(ctx, { instrument: 'acoustic_guitar_steel' })
await guitar.loaded()
guitar.start({ note: 60, duration: 0.7 })
```

This is the option that actually sounds like Guitar Pro / a real guitar,
because it plays **recorded samples**.

**For**

- Most realistic — true recorded guitar timbre (the "Guitar Pro MIDI" sound).
- Library is small and from the `tonal` author (good ecosystem fit).
- Instrument is swappable (steel, nylon, electric clean, etc.).
- Still goes behind `playMidiSequence`, so trainers don't change.

**Against**

- Loads sample files (~a few hundred KB per instrument).
- Initial load latency before first note (need a "loading" state / preload on mount).
- By default fetches samples from a CDN = **runtime network dependency**
  (see Option 2b to avoid this).
- Adds a dependency to `package.json`.

**Effort:** Medium. **Realism:** High. **Deps:** `smplr`. **Offline:** no (unless self-hosted).

### Option 2a — samples from CDN

`smplr` fetches from the gleitz midi-js-soundfonts CDN by default.

- **For:** simplest setup, nothing to host.
- **Against:** app now needs network for audio; breaks the current fully-offline
  behaviour; CDN availability is an external dependency.

### Option 2b — samples self-hosted in `public/`

Download the instrument once and serve it from our own `public/` folder,
pointing `smplr` at the local URL.

- **For:** keeps the app offline/self-contained; no third-party runtime dependency.
- **Against:** we commit/host the sample assets (repo size); one-time setup step
  to fetch and wire the local path.

---

## Option 3 — Tone.js `Sampler`

[`Tone.js`](https://tonejs.github.io/) with `Tone.Sampler` mapping a handful of
guitar samples across the range, pitch-shifting between them.

**For**

- High quality and very flexible (effects, scheduling, sequencing).
- Great if we plan to expand audio features later (backing tracks, metronome
  rework, effects, etc.).

**Against**

- Large dependency for what is currently just "play a note or two".
- Overkill for the trainers' needs today.
- Still requires sample assets (same hosting/latency considerations as Option 2).

**Effort:** Medium–High. **Realism:** High. **Deps:** `tone` (large). **Offline:** no (unless self-hosted).

---

## Option 4 — Improved pure synthesis (no model, no samples)

Stay fully synthetic but layer it up: multiple detuned oscillators for
harmonics + a short noise transient for the pluck + a lowpass filter envelope.

**For**

- No dependencies, no assets, offline.
- Better than the current single oscillator.

**Against**

- More work than Option 1 for arguably *less* realism than Karplus–Strong.
- Still clearly synthetic.

**Effort:** Low–Medium. **Realism:** Low–Medium. **Deps:** none. **Offline:** yes.

---

## Guitar tone choices (if we go sample-based)

| Tone | Character | Notes |
|------|-----------|-------|
| Acoustic steel-string (`acoustic_guitar_steel`) | Bright, articulate | Common "Guitar Pro" default |
| Acoustic nylon/classical (`acoustic_guitar_nylon`) | Warm, soft | Gentler for ear training |
| Electric clean (`electric_guitar_clean`) | Smooth, sustained | Clear pitch, modern feel |

---

## Summary comparison

| Option | Realism | Effort | Deps | Offline |
|--------|---------|--------|------|---------|
| 1. Karplus–Strong | Medium | Low | none | Yes |
| 2a. Soundfont (CDN) | High | Medium | `smplr` | No |
| 2b. Soundfont (self-hosted) | High | Medium | `smplr` | Yes |
| 3. Tone.js Sampler | High | Med–High | `tone` (large) | No* |
| 4. Improved synthesis | Low–Med | Low–Med | none | Yes |

\* unless samples are self-hosted

## Recommendation

- Want it to genuinely sound like a guitar / Guitar Pro → **Option 2b**
  (soundfont via `smplr`, self-hosted so it stays offline and dependency-light).
- Want zero dependencies / no asset files and a quick win → **Option 1**
  (Karplus–Strong).
- Reasonable middle path: implement **both Option 1 and Option 2** behind
  `playMidiSequence` and A/B them, then keep the winner.

## Implementation notes (when picked up)

- All changes live behind `playMidiSequence()` in `lib/audio.ts`; the trainers
  (`components/ear-training/IntervalTrainer.tsx`,
  `components/trainers/FretboardTrainer.tsx`) should not need to change.
- For sample-based options: preload the instrument on mount and show/handle a
  brief "loading sounds…" state so the first answer doesn't play silently.
- Keep the shared `AudioContext` pattern already in `lib/audio.ts` (and resume
  on first user gesture for autoplay policies).
- Decision needed: (a) which option, and (b) which guitar tone.
