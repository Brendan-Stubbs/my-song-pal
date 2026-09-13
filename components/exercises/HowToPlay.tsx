import type { ReactNode } from 'react'

/**
 * A friendly, plain-language "How to play" card shown at the top of every
 * exercise. The goal is that a child can open any exercise and know exactly
 * what to do without a parent explaining the controls, so keep the steps short,
 * concrete, and jargon-free.
 */
export default function HowToPlay({
  steps,
  title = 'How to play',
}: {
  /** Short, plain steps. Two or three is ideal — one action each. */
  steps: ReactNode[]
  title?: string
}) {
  return (
    <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-brand/15 text-brand"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <span className="shrink-0 mt-0.5 inline-flex w-5 h-5 items-center justify-center rounded-full bg-brand text-white text-[11px] font-bold">
              {i + 1}
            </span>
            <span className="leading-snug">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
