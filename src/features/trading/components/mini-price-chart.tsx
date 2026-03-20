import { useMemo } from 'react'
import type { MiniPriceChartPoint } from '../lib/mini-chart'

function buildPoints(points: MiniPriceChartPoint[], width: number, height: number, averagePrice: number | null) {
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
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
      const y = toY(point.price)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  const averageY = averagePrice === null ? null : toY(averagePrice)

  return { averageY, path }
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
  const geometry = useMemo(() => buildPoints(points, 240, 60, averagePrice), [averagePrice, points])

  if (!geometry) {
    return <div className="h-[60px] rounded-xl border border-border/50 bg-background/50" />
  }

  return (
    <svg
      aria-hidden="true"
      className="h-[60px] w-full rounded-xl border border-border/50 bg-background/50 p-2"
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
        strokeWidth="2.5"
      />
    </svg>
  )
}
