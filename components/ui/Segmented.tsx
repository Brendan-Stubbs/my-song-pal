'use client'

import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  title?: string
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

/** Segmented control for A/B(/C) toggles (e.g. Metronome/Guided, Tab/Grid, Write/Mute). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: SegmentedProps<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-lg border border-line overflow-hidden font-semibold',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              pad,
              active
                ? 'bg-brand text-white'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
