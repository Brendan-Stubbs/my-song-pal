import { cn } from '@/lib/cn'

/** Inset section surface (nested groups within a Card). */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-line bg-surface-2', className)}
      {...props}
    />
  )
}
