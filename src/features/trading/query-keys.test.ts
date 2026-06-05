import { describe, expect, it } from 'vitest'
import { tradingQueryKeys } from './query-keys'

describe('tradingQueryKeys.closedPositionsForAuthority', () => {
  it('matches every closed-position query variant for the wallet', () => {
    const authority = 'wallet-address'
    const prefix = tradingQueryKeys.closedPositionsForAuthority(authority)
    const chartQueryKey = tradingQueryKeys.closedPositions(
      authority,
      1,
      1000,
      '2026-06-05T12:00:00.000Z',
    )
    const listQueryKey = tradingQueryKeys.closedPositions(
      authority,
      undefined,
      50,
    )

    expect(chartQueryKey.slice(0, prefix.length)).toEqual(prefix)
    expect(listQueryKey.slice(0, prefix.length)).toEqual(prefix)
  })
})
