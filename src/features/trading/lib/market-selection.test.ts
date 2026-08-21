import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MARKET_ID,
  MARKET_DEFINITIONS,
  getMarketDefinition,
  parseMarketSearch,
} from '../constants'

describe('market selection', () => {
  it('contains the four verified devnet markets', () => {
    expect(MARKET_DEFINITIONS).toEqual([
      expect.objectContaining({
        id: 1,
        baseSymbol: 'SOL',
        baseMint: 'So11111111111111111111111111111111111111112',
        baseDecimals: 9,
        quoteDecimals: 6,
        minimumBaseDepositAtoms: 1_000_000n,
        minimumQuoteDepositAtoms: 100_000n,
      }),
      expect.objectContaining({
        id: 2,
        baseSymbol: 'MATO',
        baseMint: '69zmVXSzZptwJo5cy5LfUxmrdE1mRkeRnnEqtYNrKBMc',
        baseDecimals: 6,
        minimumBaseDepositAtoms: 1_000n,
      }),
      expect.objectContaining({
        id: 3,
        baseSymbol: 'SB',
        baseMint: '5UodwdrKuvMkpYZqEAoeo5AbeX4fPzSeENEojJLZNUQR',
        baseDecimals: 6,
        minimumBaseDepositAtoms: 1_000n,
      }),
      expect.objectContaining({
        id: 4,
        baseSymbol: 'SF',
        baseMint: 'HxMsRrwZdg6fBVcZ5aqP3x18KVpmNG81kSncrCD7k13N',
        baseDecimals: 6,
        minimumBaseDepositAtoms: 1_000n,
      }),
    ])

    for (const market of MARKET_DEFINITIONS) {
      expect(market.quoteMint).toBe(
        '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      )
      expect(getMarketDefinition(market.id)).toBe(market)
    }
  })

  it.each([
    [{ market: 1 }, 1],
    [{ market: '2' }, 2],
    [{ market: ' 3 ' }, 3],
    [new URLSearchParams('market=4'), 4],
  ] as const)('accepts a supported market from %o', (search, expected) => {
    expect(parseMarketSearch(search)).toEqual({ market: expected })
  })

  it.each([
    undefined,
    null,
    {},
    { market: '' },
    { market: '2.0' },
    { market: '1e0' },
    { market: 2.5 },
    { market: 0 },
    { market: 5 },
    { market: ['1', '2'] },
    new URLSearchParams('market=1&market=2'),
  ])('falls back to the default for invalid search input %o', (search) => {
    expect(parseMarketSearch(search)).toEqual({ market: DEFAULT_MARKET_ID })
  })
})
