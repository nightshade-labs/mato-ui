import { cn } from '@/lib/utils'

export function Progress({
  className,
  indicatorClassName,
  value,
}: {
  className?: string
  indicatorClassName?: string
  value: number
}) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-secondary/75', className)}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedValue}
      role="progressbar"
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-[width] duration-500', indicatorClassName)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}
