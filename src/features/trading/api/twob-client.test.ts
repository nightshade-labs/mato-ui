import { describe, expect, it } from 'vitest'
import { deriveMarketAddress, getReferenceIndex } from './twob-client'

describe('twob v1 client helpers', () => {
  it('derives the deployed market 1 PDA with a u32 seed', async () => {
    await expect(deriveMarketAddress(1)).resolves.toBe(
      'BMMWpvb3PtMCnWa3uh9ChS2UWufiLLFTV6tkrCJ6DUng',
    )
  })

  it('keeps reference index zero reserved', () => {
    expect(getReferenceIndex(0, 107)).toBe(1n)
  })
})
