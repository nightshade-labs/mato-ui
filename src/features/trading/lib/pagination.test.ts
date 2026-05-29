import { describe, expect, it } from 'vitest'
import { clampPage, getPageCount, getPageItems } from './pagination'

describe('position pagination helpers', () => {
  it('keeps empty lists on a single page', () => {
    expect(getPageCount(0, 10)).toBe(1)
    expect(clampPage(4, 0, 10)).toBe(0)
  })

  it('creates a new page after the page size', () => {
    expect(getPageCount(10, 10)).toBe(1)
    expect(getPageCount(11, 10)).toBe(2)
  })

  it('returns the requested page slice', () => {
    expect(
      getPageItems({
        items: Array.from({ length: 12 }, (_, index) => index + 1),
        page: 1,
        pageSize: 10,
      }),
    ).toEqual([11, 12])
  })
})
