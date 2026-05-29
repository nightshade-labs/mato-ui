import { describe, expect, it } from 'vitest'
import {
  isEndedPosition,
  selectBatchClosePositions,
} from './batch-close-positions'

function position(address: string, endSlot: bigint) {
  return {
    address,
    data: {
      endSlot,
    },
  }
}

describe('isEndedPosition', () => {
  it('requires the current slot to be larger than the end slot', () => {
    const ended = position('ended', 9n)
    const current = position('current', 10n)

    expect(isEndedPosition(ended, 10)).toBe(true)
    expect(isEndedPosition(current, 10)).toBe(false)
  })
})

describe('selectBatchClosePositions', () => {
  it('selects ended positions only for the ended mode', () => {
    const positions = [
      position('active', 20n),
      position('ended-2', 8n),
      position('ended-1', 7n),
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
      position('third', 30n),
      position('first', 10n),
      position('second', 20n),
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
