'use client'

import { useState } from 'react'
import { PRICING_OPTIONS, PREMIUM_FEATURES } from '@/types/subscription'
import type { BillingCadence } from '@/types/subscription'

// ── Crown icon ────────────────────────────────────────────────────────────────

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      fill="currentColor" aria-hidden
      className={className}
    >
      <path d="M1 12h14l-1-7-4 3-2-5-2 5-4-3-1 7z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="2,7 5.5,11 12,3" />
    </svg>
  )
}

// ── Premium badge (used on locked tabs / buttons elsewhere) ───────────────────

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 leading-none">
      <CrownIcon className="w-2.5 h-2.5" />
      Pro
    </span>
  )
}

// ── Main gate component ───────────────────────────────────────────────────────

interface PremiumGateProps {
  /** If true, render children normally. If false, show upgrade prompt. */
  isPremium: boolean
  /** Short name of the locked feature, shown in the prompt heading. */
  featureName: string
  /** One-line description shown below the feature name. */
  featureDescription?: string
  children: React.ReactNode
}

export default function PremiumGate({
  isPremium,
  featureName,
  featureDescription,
  children,
}: PremiumGateProps) {
  if (isPremium) return <>{children}</>
  return (
    <UpgradePrompt
      featureName={featureName}
      featureDescription={featureDescription}
    />
  )
}

// ── Upgrade prompt ────────────────────────────────────────────────────────────

interface UpgradePromptProps {
  featureName: string
  featureDescription?: string
}

function UpgradePrompt({ featureName, featureDescription }: UpgradePromptProps) {
  const [selected, setSelected] = useState<BillingCadence>('annual')

  return (
    <div className="flex flex-col items-center py-10 px-4 text-center max-w-2xl mx-auto">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-5">
        <CrownIcon className="w-7 h-7 text-amber-500 dark:text-amber-400" />
      </div>

      {/* Heading */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        {featureName} is a Premium feature
      </h3>
      {featureDescription && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          {featureDescription}
        </p>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
        {PRICING_OPTIONS.map((opt) => {
          const isSelected = selected === opt.cadence
          return (
            <button
              key={opt.cadence}
              type="button"
              onClick={() => setSelected(opt.cadence)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-brand ${
                isSelected
                  ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-md'
                  : 'border-gray-200 dark:border-gray-600 hover:border-brand/50'
              }`}
            >
              {/* Best value badge */}
              {opt.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand text-white text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                  {opt.badge}
                </span>
              )}

              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {opt.label}
              </span>

              {/* Per-month price */}
              <div className="mt-1">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {opt.perMonth}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/mo</span>
              </div>

              {/* Billed total */}
              <span className="text-xs text-gray-400 dark:text-gray-500 leading-snug">
                {opt.total}
              </span>

              {/* Saving pill */}
              {opt.savingPct !== null && (
                <span className="mt-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                  Save {opt.savingPct}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* What's included */}
      <div className="w-full bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 mb-6 text-left">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Everything included in Premium
        </p>
        <ul className="space-y-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <span className="mt-0.5 text-brand shrink-0"><CheckIcon /></span>
              <span>
                <span className="font-medium">{f.name}</span>
                {' — '}
                <span className="text-gray-500 dark:text-gray-400">{f.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA — disabled until payments are wired up */}
      <button
        disabled
        className="w-full sm:w-auto px-10 py-3 rounded-full bg-brand text-white font-semibold text-sm opacity-50 cursor-not-allowed"
        title="Payment integration coming soon"
      >
        Upgrade — coming soon
      </button>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Payment integration coming soon. Watch this space.
      </p>
    </div>
  )
}
