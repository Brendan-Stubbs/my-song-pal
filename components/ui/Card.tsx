import { cn } from '@/lib/cn'

/** Elevated content surface (cards, main panels). */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface shadow-sm', className)}
      {...props}
    />
  )
}
