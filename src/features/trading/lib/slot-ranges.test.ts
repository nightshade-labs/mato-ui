import { describe, expect, it } from 'vitest'
import {
  hasFullCoverage,
  insertNormalizedHistory,
  mergeAdjacentRanges,
  mergeOverlappingRanges,
  selectPointsForRange,
  subtractCoveredRanges,
  type SlotRange,
} from './slot-ranges'

function range(startSlot: number, endSlot: number): SlotRange {
  return { endSlot, startSlot }
}

describe('slot-ranges', () => {
  it('merges overlapping ranges without merging separated ranges', () => {
    expect(
      mergeOverlappingRanges([
        range(10, 20),
        range(15, 25),
        range(26, 30),
      ]),
    ).toEqual([range(10, 25), range(26, 30)])
  })

  it('merges adjacent ranges when the configured gap allows it', () => {
    expect(
      mergeAdjacentRanges([
        range(10, 20),
        range(21, 30),
        range(33, 40),
      ]),
    ).toEqual([range(10, 30), range(33, 40)])

    expect(
      mergeAdjacentRanges(
        [
          range(10, 20),
          range(21, 30),
          range(33, 40),
        ],
        2,
      ),
    ).toEqual([range(10, 40)])
  })

  it('computes missing gaps inside a requested range', () => {
    expect(
      subtractCoveredRanges(range(100, 150), [
        range(80, 105),
        range(110, 119),
        range(120, 130),
        range(140, 170),
      ]),
    ).toEqual([
      range(106, 109),
      range(131, 139),
    ])
  })

  it('detects full coverage across touching ranges', () => {
    expect(
      hasFullCoverage(
        [
          range(90, 99),
          range(100, 120),
          range(121, 150),
        ],
        range(100, 150),
      ),
    ).toBe(true)
  })

  it('inserts normalized history in slot order and lets incoming points replace duplicate slots', () => {
    expect(
      insertNormalizedHistory(
        [
          { price: 10, slot: 5 },
          { price: 11, slot: 8 },
        ],
        [
          { price: 12, slot: 6 },
          { price: 13, slot: 8 },
        ],
      ),
    ).toEqual([
      { price: 10, slot: 5 },
      { price: 12, slot: 6 },
      { price: 13, slot: 8 },
    ])
  })

  it('selects points in range and includes the last anchor point before the range', () => {
    expect(
      selectPointsForRange(
        [
          { price: 1, slot: 10 },
          { price: 2, slot: 20 },
          { price: 3, slot: 30 },
          { price: 4, slot: 40 },
        ],
        range(25, 35),
      ),
    ).toEqual([
      { price: 2, slot: 20 },
      { price: 3, slot: 30 },
    ])
  })
})
