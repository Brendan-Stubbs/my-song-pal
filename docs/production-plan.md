# My Song Pal — Pre-Production Plan

> Living document. Assessed against the real codebase (Next.js 16 App Router, React 19,
> Tailwind v4, Supabase auth + DB, Zod). Check items off as they land.

## 0. Overall verdict

The app is in **good structural shape**. Strengths worth protecting:

- Clean separation: `services/` (auth, music theory) with adapter pattern + tests, `lib/`
  utilities, typed domain models in `types/`.
- **Security is genuinely well thought through**: RLS policies stop users from
  self-granting `plan`/`trial_ends_at` (migrations `003`/`006`), subscription writes are
  reserved for the service role, and `getUserAccess()` resolves entitlement **server-side**.
- Sensible dual storage (Supabase for authed users, localStorage for guests).
- The metronome / tab editor / Guitar Pro import work is solid and code-split.

Gaps between "nice project" and "production ready":

1. **Payments don't exist** — the premium tier is a disabled "coming soon" button.
2. **Premium gating is UI-only** — RLS checks ownership, not entitlement.
3. **The visual layer reads as generic** — and there's a font bug rendering everything in Arial.
4. **Test coverage is uneven** — services/API tested; metronome, practice, chord, and
   subscription logic are not. No CI.
5. **Practice exercises are just free-text labels** — not linked to the tools already built.

---

## 1. Cleanup

### Dead / redundant code
- [x] ~~Remove unused heavy deps `tone` and `smplr`~~ — **corrected**: both are real
      audio engines (`SoundfontInstrument` via `smplr`, `ToneSamplerInstrument` via `tone`)
      lazily `import()`-ed in `lib/instrument.ts`, so they're already code-split out of the
      main bundle. Keep them.
- [x] Remove the 13 `@deprecated` legacy exports in `lib/practice-storage.ts`
      (`loadSessionsSync`, `saveSessions`, `createActivity`, `createSubBlock`,
      `subBlockTotalMinutes`, `PracticeActivity`, `SubBlock`, …) and
      `lib/chord-book-storage.ts` (`addChord`, `removeChord`, `saveChordBook`,
      `loadChordBookSync`). Had no external call-sites — deleted outright.
- [ ] Once localStorage users are migrated, drop `normalizeBlock()` legacy coercion
      (`subBlocks`/`activities`) in `practice-storage.ts`.
- [x] Delete stale reasoning comments in `components/music/ChordDiagramCard.tsx`
      (also removed the dead `stringX`/`stringXs` helper).
- [x] Finish/verify the in-flight routing refactor — done: `[[...tab]]/page.tsx` optional
      catch-all handles `/dashboard` + `/dashboard/<tab>`; old `dashboard/page.tsx` gone.

### Consistency
- [x] Introduce shared UI primitives (kills copy-pasted `bg-warm-panel dark:bg-gray-800
      rounded-xl shadow` clusters). See §7 — done in `components/ui/`.
- [ ] Document persistence rule: "user content → table; device prefs → localStorage."

---

## 2. Optimisation

- [x] alphaTab is already isolated into a ~1.1 MB lazy chunk — leave it. (`tone`/`smplr`
      are likewise lazily imported and code-split — no action needed.)
- [ ] Route-level code splitting: `DashboardContent` statically imports all tab views;
      split each with `next/dynamic` now that nav is route-based.
- [ ] Replace `JSON.stringify` dirty-check in `PracticeSessionEditor` with a dirty flag if
      sessions grow.
- [ ] Route `PracticePlayer` audio cues through the shared engine in `lib/instrument.ts`
      instead of creating a fresh `AudioContext` per cue.
- [ ] Confirm `/og-image.png` exists; add `next/image` usage where relevant.

---

## 3. Feature-by-feature: complete, keep, or cut

| Area | State | Recommendation |
|---|---|---|
| Music dashboard (fretboard/CAGED/scales) | Solid, tested | Keep |
| Metronome + guide notes + tab editor + GP import | Just built, solid | Keep; add tests |
| Chords: Explore + Book | Book is thin (fixed open voicings only) | **Complete** with movable shapes (§8) |
| Exercises: Ear Training, Scale Builder, Fretboard Trainer | Working (Fretboard moved in) | Keep; wire into Practice (§4) |
| Practice sessions | Timer works; blocks are free-text | **Complete** (§4) — headline feature |
| Premium/payments | Stub only | **Build** (§9) |
| Landing page | `app/page.tsx` just redirects | Add minimal public landing + pricing |

Nothing here is fluff — no feature should be cut.

---

## 4. Practice schedule redesign — exercises as *configured* time-based blocks

Today a `PracticeExercise` is `{ id, name, durationMinutes }` — a label + countdown. The
built tools (metronome loops w/ guide notes, scales, chords, ear training) are **not
reachable** from a session. Make each exercise optionally bound to a tool + config.

### Data model (additive; existing sessions still parse)
```ts
type ExerciseLink =
  | { kind: 'metronome'; loopId: string; bpm?: number }
  | { kind: 'scale'; scaleId: string; root: string; position?: number }
  | { kind: 'chord-drill'; chordIds: string[]; changesPerMin?: number }
  | { kind: 'ear-training'; mode: 'intervals' | 'modes' }
  | { kind: 'fretboard-trainer' }
  | { kind: 'free' }

interface PracticeExercise {
  id: string
  name: string
  durationMinutes: number
  link?: ExerciseLink        // NEW — undefined = today's free-text behaviour
}
```
Persisted for free (blocks are already JSONB in `practice_sessions.blocks`); bump a
schema-version field inside the JSON for safety.

Done: `ExerciseLink` union added to `lib/practice-storage.ts` (additive, `link?`; existing
JSONB sessions still parse). `exerciseDisplayName` falls back to a tool-derived name.

### Editor UX (`PracticeSessionEditor`)
- [x] Each exercise row gets an **"Attach"** dropdown (No tool / Metronome loop / Scale /
      Chord drill / Ear training / Fretboard trainer) with a compact inline config
      (`components/practice/ExerciseLinkConfig.tsx`) — loop picker, root+scale selects,
      chord chip builder + changes/min, interval/mode toggle. Loops loaded via `loadLoops()`.

### Player UX (`PracticePlayer`)
- [x] When an exercise has a `link`, render the relevant tool **inline above the timeline**
      (`components/practice/PracticeExerciseTool.tsx`, keyed per exercise):
  - `metronome` → auto-load loop by id + `useLoopScheduler` with count-in; pauses with the timer.
  - `scale` → `FretboardDiagram` via `getFretboardNotes`.
  - `chord-drill` → chord sequence cycling on a timer (changes/min), shows current + next.
  - `ear-training` → embeds `IntervalTrainer` / `ModeTrainer`.
  - `fretboard-trainer` → embeds `FretboardTrainer`.
  - `free` → current label + notes (unchanged).
- Existing timer + transitions kept as-is.

---

## 5. Additional practice features (useful, not gimmicky)

- [x] **Practice history / streak**: `practice_log` table (migration `009`), storage lib
      `lib/practice-log-storage.ts` (dual Supabase/localStorage, `computePracticeStats`),
      logged on session complete/end (≥1 min), surfaced via `PracticeStreakCard`
      (current streak, this-week minutes, totals) atop the sessions list.
- [ ] **Resume where you left off**: persist in-progress player state across refresh/lock. *(Phase 4)*
- [ ] **Per-exercise target BPM progression** for metronome-linked exercises (ties into
      existing `practiceMode`/`targetBpm`).
- [ ] **Keep-screen-awake** (`navigator.wakeLock`) during a session.
- [ ] **Templates**: 2–3 built-in starter routines (Warm-up / Technique / Repertoire).

Deliberately **not** doing: social feeds, XP/badges — fluff for this audience.

---

## 6. Improving existing pieces

- [ ] **Fretboard Trainer**: surface the `training_stats` already stored in
      `user_app_state` (accuracy/speed history panel).
- [ ] **Chord Explore → Book**: add an explicit "＋ Add" affordance (hover-to-add is
      invisible on touch).
- [ ] **Metronome**: onboarding copy for the "mute to fade toward guide notes" idea.
- [ ] **Ear Training**: persist + show best scores (via `lib/mode-trainer-storage.ts`).

---

## 7. Making it look less like a generic AI app

Priority order:

- [x] **Fix the font bug.** Removed the Arial override. Now: **Bricolage Grotesque**
      (display/headings), **Inter** (body/UI), **JetBrains Mono** (tab/timer numerals),
      all via `next/font`. Headings pick up the display face via a global `h1–h5` rule.
- [x] **Build a tiny design system** (`components/ui/`): `Button`, `Card`, `Panel`,
      `Segmented` (the Tabs/toggle primitive), `Modal`, `Badge`, plus `ThemeToggle` and a
      `cn()` helper. Applied to the dashboard chrome + welcome card; remaining views migrate
      opportunistically (existing `gray-*` clusters already reskinned via the token remap below).
- [x] **Commit to the warm palette.** Semantic tokens (`bg-surface`, `text-ink`,
      `border-line`, `bg-page`, `text-ink-muted`) with light + a proper warm dark palette.
      Remapped Tailwind's cool `gray-*` scale → warm `stone` values so every existing
      `gray-*`/`dark:bg-gray-*` utility reads warm app-wide with no per-file migration.
      `--warm-page`/`--warm-panel` kept as theme-aware aliases.
- [x] **Manual dark-mode toggle.** Switched to class-based dark (`@custom-variant dark`),
      sun/moon `ThemeToggle` in the header, persisted to `localStorage` with a no-flash
      inline init script that still honours system preference by default.
- [x] **Iconography**: replaced the 🎉 emoji in `PracticePlayer` with a brand check mark;
      toggle/uses inline stroke icons at consistent widths. (Adopting lucide wholesale = later.)
- [ ] **Real landing page** with product screenshots + pricing (deferred — coupled to
      monetisation, which is out of scope for now).

Treat font + design system as the highest-leverage items.

---

## 8. Chord book: movable / relative shapes

Confirmed: movable shapes **don't exist yet**. Today `SavedChord = { root, quality }` →
fixed open voicings in `data/open-chord-voicings.ts`. `ChordDiagramCard` **already renders
arbitrary `baseFret` + barres**, so rendering is half-done.

### Model (relative offsets, relative name)
```ts
interface MovableShape {
  id: string
  name: string                 // e.g. "E-shape maj7", "my 9th grip"
  offsets: number[]            // per string [s6..s1]; -1 muted, 0 = root/barre fret, +n above
  rootString: 6 | 5 | 4        // which string carries the root
  barre?: { fromString: number; toString: number }  // at offset 0
  addedAt: number
}
```
- [x] Slide the neck by a `basePosition` (1–12) stepper at display time (`MovableShapeCard`,
      `shapeToVoicing`); position clamped so the shape stays on the 12-fret window.
- [x] Relative naming by default (user names the grip). Absolute-name inference left as a
      future nicety.
- [x] Capture UX: dedicated per-string grid picker (`MovableShapeEditor`, in a `Modal`) —
      tap a fret offset per string, mute strings, mark the root string, optional base-fret
      barre, live `ChordDiagramCard` preview.
- [x] New `movable_shapes` table (migration `009`) mirroring `chord_book` RLS; storage lib
      `lib/movable-shape-storage.ts` (dual Supabase/localStorage).
- [x] Kept the existing absolute book; movable shapes = second section in the Book tab.

---

## 9. Recurring payments (monthly + annual with discount)

Backend is already **shaped for this**: `users` has `plan`, `billing_cadence`
(`monthly|biannual|annual`), `plan_started_at`, `plan_expires_at`, `trial_ends_at`;
RLS reserves those columns for the service role; `getUserAccess()` reads them server-side;
`PRICING_OPTIONS` exists (currently ZAR: monthly R79 / 6-mo R399 / annual R699). Missing:
provider + webhook + checkout.

### Architecture
- [ ] **Pick provider (decision needed).** For ZAR / `mysongpal.co.za`, **Paddle** or
      **Lemon Squeezy** (merchant-of-record, handle VAT/tax) are simpler than Stripe for a
      solo dev. This choice drives everything.
- [ ] **Checkout**: replace the disabled `PremiumGate` button with a server action that
      creates a checkout session for the chosen cadence and redirects.
- [ ] **Webhook** (`app/api/billing/webhook/route.ts`): single source of truth. On
      subscription created/updated/deleted, use the **service-role** Supabase client to set
      `plan`, `billing_cadence`, `plan_started_at`, `plan_expires_at`. Verify signatures;
      make idempotent.
- [ ] **Monthly vs annual discount**: two prices on one product; annual per-month lower
      (`savingPct` already encoded). Decide whether to keep the 6-month tier.
- [ ] **Entitlement enforcement (critical gap today)**: gating is UI-only. Add server-side
      checks (`getUserAccess()`) on premium-only writes (chord book, movable shapes, gated
      loops) via server actions/route handlers or an RLS policy joining `users.plan`.
- [ ] **Trial → paid**: "trial ending" banner + grace path (`getUserAccess` already
      downgrades on expiry).
- [ ] **Billing portal**: "Manage subscription" link to provider portal
      (cancel/upgrade/downgrade, proration).
- [ ] **Prices**: read price IDs from env, never hard-code amounts. Final prices/currency
      confirmed by owner and created in the provider dashboard.

### DB additions (migration `009`)
- [ ] `billing_customer_id TEXT`, `billing_subscription_id TEXT`, `billing_status TEXT` on
      `users`; optional `billing_events` table for webhook idempotency/audit.

**Open decisions:** provider (Paddle / Lemon Squeezy / Stripe); confirmed prices + currency;
whether to keep the 6-month tier.

---

## 10. Testing + CI

### Current state
- Jest with two projects (`jest.config.ts`): **unit** (jsdom) + **integration**
  (node, `tests/api/**` via supertest).
- Tested: `services/auth`, `services/music`, `tonal.adapter`, `data/scale-patterns`,
  `FretboardDiagram`, `CagedPositionDiagram`, `api/auth/*`, `api/music/*`.
- **Zero coverage**: entire `metronome/` stack (`useLoopScheduler`,
  `metronome-loop-storage`, **`guitarpro-import` converter**), `practice-storage`,
  `chord-book-storage`, `chord-finder`, `chord-variants`, `subscription.ts`,
  `super-user.ts`, `training-stats`, all view components.
- **No `.github/` workflows**. Rule references `tests/e2e/` but it doesn't exist yet.

### Test plan (priority order)
- [ ] **Pure logic first:** `lib/guitarpro-import.ts` (alphaTex fixtures → assert bar/beat/
      subdivision, string inversion, quantise flag, dropped strings); `lib/practice-storage.ts`
      (normalize, totals, formatters, factories); `lib/subscription.ts` (trial/premium/expiry
      with mocked Supabase — guards revenue logic); `chord-finder`, `chord-variants`,
      `training-stats`.
- [ ] **Component logic:** `PracticePlayer` timer transitions (fake timers), `TabStaff`,
      `PremiumGate` locked/unlocked.
- [ ] **Integration:** extend `tests/api` for the billing webhook (signature + idempotency)
      and gated write endpoints.
- [ ] **E2E (new, Playwright):** money paths — sign-up → trial → gated feature →
      (test-mode) checkout → entitlement. Create `tests/e2e/`.
- [ ] **Coverage gate:** Jest `--coverage` threshold on `lib/` + `services/` (~70%).

### GitHub Actions (`.github/workflows/ci.yml`)
- [ ] On PR + push to main, parallel jobs: `typecheck` (`tsc --noEmit`), `lint` (`eslint`),
      `format:check` (`prettier --check`), `test:unit`, `test:integration`, `build`
      (`next build`); later `e2e`. Cache node_modules + Next cache. All scripts already exist.

---

## 11. Prioritised roadmap

**Phase 1 — Foundation & polish**
- [x] Fix font bug; design-system primitives + warm palette + dark toggle (§7).
- [x] Purge `@deprecated` exports; finish routing refactor (§1). (`tone`/`smplr` kept —
      they're lazily-imported audio engines, already code-split.)
- [ ] Add GitHub Actions CI + tests for `guitarpro-import`, `practice-storage`,
      `subscription` (§10).

**Phase 2 — Complete the core features**
- [x] Practice: exercises-as-configured-blocks (§4) + practice history/streak (§5).
- [x] Chord book: movable/relative shapes (§8).
  - Note: requires `npm run db:push` to create the `practice_log` + `movable_shapes` tables
    for authenticated users (guests use localStorage; authed clients fall back gracefully
    until the migration is applied).

**Phase 3 — Monetise**
- [ ] Provider + checkout + webhook + server-side entitlement + billing portal (§9).
- [ ] Minimal public landing + pricing page.

**Phase 4 — Depth**
- [ ] Fretboard-trainer stats surface, BPM progression, wake-lock, templates.

---

## 12. Final pass — must-haves before "production ready"

In order of risk:

1. **Server-side entitlement enforcement.** Premium is UI-only today; RLS protects
   ownership, not plan. Gated writes must be checked server-side before charging money.
2. **Payments source-of-truth via webhook + service role.** Client must never write plan
   state (schema already anticipates this).
3. **Tests around money + the new math.** The subscription resolver and the GP-import
   converter are where a silent bug is most costly.

Smaller but real: the **font bug** (shipping Arial today) and **no CI**. Both cheap, both
disproportionately improve the "real product" perception.

Foundation underneath is sound — services/adapters/RLS is better than typical, and the
feature set is coherent and fluff-free.
