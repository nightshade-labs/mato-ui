import { useMemo } from 'react'
import { formatPrice } from '../lib/format'
import type { MiniPriceChartPoint } from '../lib/mini-chart'

function buildPoints(
  points: MiniPriceChartPoint[],
  width: number,
  height: number,
  averagePrice: number | null,
) {
  if (points.length < 2) return null

  const values = points.map((point) => point.price)
  if (averagePrice !== null) values.push(averagePrice)

  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.05, 0.000001)
    min -= padding
    max += padding
  } else {
    const padding = (max - min) * 0.08
    min -= padding
    max += padding
  }

  const toY = (value: number) => {
    const range = max - min || 1
    return 6 + ((max - value) / range) * (height - 12)
  }

  const path = points
    .map((point, index) => {
      const x =
        points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = toY(point.price)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  const averageY = averagePrice === null ? null : toY(averagePrice)

  return { averageY, max, min, path }
}

function LegendSwatch({
  className,
  dashed = false,
}: {
  className: string
  dashed?: boolean
}) {
  return (
    <svg aria-hidden="true" className="h-2 w-6" viewBox="0 0 24 6">
      <line
        x1="0"
        x2="24"
        y1="3"
        y2="3"
        className={className}
        strokeDasharray={dashed ? '4 4' : undefined}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function MiniPriceChart({
  averagePrice,
  lineClassName = 'stroke-[color:var(--color-accent-strong)]',
  points,
  averageClassName = 'stroke-emerald-300/70',
}: {
  averagePrice: number | null
  averageClassName?: string
  lineClassName?: string
  points: MiniPriceChartPoint[]
}) {
  const geometry = useMemo(
    () => buildPoints(points, 240, 60, averagePrice),
    [averagePrice, points],
  )

  if (!geometry) {
    return (
      <div className="h-[96px] rounded-xl border border-border/50 bg-background/50" />
    )
  }

  const midpoint = geometry.min + (geometry.max - geometry.min) / 2

  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-2">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LegendSwatch className={lineClassName} />
          Price path
        </span>
        {averagePrice !== null ? (
          <span className="inline-flex items-center gap-1.5">
            <LegendSwatch className={averageClassName} dashed />
            Avg fill
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-3">
        <div className="flex h-[60px] w-14 shrink-0 flex-col justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{formatPrice(geometry.max)}</span>
          <span>{formatPrice(midpoint)}</span>
          <span>{formatPrice(geometry.min)}</span>
        </div>

        <svg
          aria-hidden="true"
          className="h-[60px] flex-1 rounded-lg bg-black/20"
          viewBox="0 0 240 60"
          preserveAspectRatio="none"
        >
          {geometry.averageY !== null ? (
            <line
              x1="0"
              x2="240"
              y1={geometry.averageY}
              y2={geometry.averageY}
              className={averageClassName}
              strokeDasharray="5 5"
              strokeWidth="1.5"
            />
          ) : null}
          <path
            className={lineClassName}
            d={geometry.path}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  )
}
