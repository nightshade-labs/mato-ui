import { cn } from '@/lib/utils'

export function Progress({
  animated = false,
  className,
  indicatorClassName,
  value,
}: {
  animated?: boolean
  className?: string
  indicatorClassName?: string
  value: number
}) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const showActivity = animated && clampedValue > 0 && clampedValue < 100

  return (
    <div
      className={cn(
        'h-2 overflow-hidden rounded-full bg-secondary/75',
        className,
      )}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedValue}
      role="progressbar"
    >
      <div
        className={cn(
          'relative h-full overflow-hidden rounded-full bg-primary transition-[width] duration-500',
          indicatorClassName,
        )}
        style={{ width: `${clampedValue}%` }}
      >
        {showActivity ? (
          <span
            aria-hidden="true"
            className="progress-activity-glow absolute inset-y-0 left-0 w-full"
          />
        ) : null}
      </div>
    </div>
  )
}
