import { describe, expect, it } from 'vitest'
import { tradingQueryKeys } from './query-keys'

describe('tradingQueryKeys.tradePositions', () => {
  it('isolates exact queries by authority and market', () => {
    expect(tradingQueryKeys.tradePositions('wallet-address', 1)).not.toEqual(
      tradingQueryKeys.tradePositions('wallet-address', 2),
    )
  })

  it('provides an authority prefix that matches every market', () => {
    const prefix = tradingQueryKeys.tradePositionsForAuthority('wallet-address')

    for (const marketId of [1, 2, 4]) {
      expect(
        tradingQueryKeys
          .tradePositions('wallet-address', marketId)
          .slice(0, prefix.length),
      ).toEqual(prefix)
    }
  })
})

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
