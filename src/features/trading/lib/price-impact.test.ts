import { describe, expect, it } from 'vitest'
import { isHighPriceImpact } from './price-impact'

describe('price impact warnings', () => {
  it('warns only above the high-impact threshold', () => {
    expect(isHighPriceImpact(null)).toBe(false)
    expect(isHighPriceImpact(1)).toBe(false)
    expect(isHighPriceImpact(1.001)).toBe(true)
  })
})
