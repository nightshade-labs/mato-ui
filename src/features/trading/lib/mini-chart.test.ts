import { describe, expect, it } from 'vitest'
import {
  buildClosedPositionMiniChart,
  type MarketPricePoint,
} from './mini-chart'

function createPoints(count: number): MarketPricePoint[] {
  return Array.from({ length: count }, (_, index) => ({
    price: 100 + index,
    slot: index,
  }))
}

describe('buildClosedPositionMiniChart', () => {
  it('keeps sparse ranges denser with a higher minimum sample count', () => {
    const points = createPoints(3)
    const chart = buildClosedPositionMiniChart(points, 0, 40)

    expect(chart).not.toBeNull()
    expect(chart).toHaveLength(24)
  })

  it('allows more points before downsampling dense ranges', () => {
    const points = createPoints(600)
    const chart = buildClosedPositionMiniChart(points, 0, 599)

    expect(chart).not.toBeNull()
    expect(chart!.length).toBeGreaterThan(200)
    expect(chart!.length).toBeLessThanOrEqual(600)
  })
})
