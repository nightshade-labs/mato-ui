import { describe, expect, it } from 'vitest'
import {
  isEndedPosition,
  selectBatchClosePositions,
} from './batch-close-positions'

function position(
  address: string,
  lastUpdateSlot: bigint,
  remainingSlots: number,
) {
  return {
    address,
    data: {
      lastUpdateSlot,
      remainingSlots,
    },
  }
}

describe('isEndedPosition', () => {
  it('requires the current slot to be larger than the end slot', () => {
    const ended = position('ended', 5n, 4)
    const current = position('current', 8n, 2)

    expect(isEndedPosition(ended, 10)).toBe(true)
    expect(isEndedPosition(current, 10)).toBe(false)
  })
})

describe('selectBatchClosePositions', () => {
  it('selects ended positions only for the ended mode', () => {
    const positions = [
      position('active', 15n, 5),
      position('ended-2', 5n, 3),
      position('ended-1', 4n, 3),
    ]

    expect(
      selectBatchClosePositions({
        currentSlot: 10,
        maxPositions: 8,
        mode: 'ended',
        positions,
      }).map((candidate) => candidate.address),
    ).toEqual(['ended-1', 'ended-2'])
  })

  it('caps all mode conservatively and keeps deterministic order', () => {
    const positions = [
      position('third', 25n, 5),
      position('first', 5n, 5),
      position('second', 15n, 5),
    ]

    expect(
      selectBatchClosePositions({
        currentSlot: 15,
        maxPositions: 2,
        mode: 'all',
        positions,
      }).map((candidate) => candidate.address),
    ).toEqual(['first', 'second'])
  })
})
