import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  brand: 'bg-brand/15 text-brand',
  success: 'bg-green-500/15 text-green-600 dark:text-green-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
