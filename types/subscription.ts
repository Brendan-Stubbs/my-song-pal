// ── Plan tiers ────────────────────────────────────────────────────────────────

/** The two plan states a user can be on. */
export type Plan = 'free' | 'premium'

/** How often a premium subscriber is billed. */
export type BillingCadence = 'monthly' | 'biannual' | 'annual'

// ── Access / trial ──────────────────────────────────────────────────────────

/** Length of the no-strings-attached free trial granted at sign-up. */
export const TRIAL_DURATION_DAYS = 30

/**
 * The effective access level a user has right now:
 *  - `premium`: an active paid subscription
 *  - `trial`:   inside the free-trial window (full access, not paying)
 *  - `free`:    no subscription and the trial has lapsed (paid features locked)
 */
export type AccessLevel = 'free' | 'trial' | 'premium'

export interface UserAccess {
  level: AccessLevel
  /** True when paid features should be unlocked (premium OR active trial). */
  hasPremiumAccess: boolean
  /** ISO timestamp the trial ends, when known. */
  trialEndsAt: string | null
  /** Whole days left in the trial (>= 0), or null when not on a trial. */
  trialDaysLeft: number | null
}

// ── Pricing config ────────────────────────────────────────────────────────────

export interface PricingOption {
  cadence: BillingCadence
  label: string
  /** Per-month equivalent (for display only) */
  perMonth: string
  /** Total amount charged per billing period */
  total: string
  /** Percentage saved versus monthly, or null for monthly itself */
  savingPct: number | null
  badge: string | null
}

/** Pricing table — update amounts here when payment integration is ready. */
export const PRICING_OPTIONS: PricingOption[] = [
  {
    cadence:   'monthly',
    label:     'Monthly',
    perMonth:  'R 79',
    total:     'R 79 / month',
    savingPct: null,
    badge:     null,
  },
  {
    cadence:   'biannual',
    label:     '6 Months',
    perMonth:  'R 66',
    total:     'R 399 every 6 months',
    savingPct: 16,
    badge:     null,
  },
  {
    cadence:   'annual',
    label:     'Annual',
    perMonth:  'R 59',
    total:     'R 699 / year',
    savingPct: 25,
    badge:     'Best value',
  },
]

// ── Premium feature registry ──────────────────────────────────────────────────

/** Unique keys for every premium-gated feature. */
export type PremiumFeatureKey = 'chord_book'

export interface PremiumFeature {
  key: PremiumFeatureKey
  name: string
  description: string
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    key:         'chord_book',
    name:        'Chord Book',
    description: 'Save your favourite chord voicings and build your personal repertoire.',
  },
  // Add future premium features here — they'll automatically appear in the
  // upgrade prompt as coming-soon items once listed.
]
