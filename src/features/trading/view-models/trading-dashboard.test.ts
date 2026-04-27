import { describe, expect, it } from 'vitest'
import {
  buildTradingDashboardViewModel,
  deriveMarketIdentity,
} from './trading-dashboard'
import type { TradingViewAggregatedCandle } from '../lib/market'

describe('deriveMarketIdentity', () => {
  it('normalizes tickers from market config', () => {
    const identity = deriveMarketIdentity({
      base_decimals: 9,
      base_mint: 'BaseMint1111111111111111111111111111111111',
      base_ticker: 'sol',
      created_at: '2026-03-20T00:00:00Z',
      id: 1,
      market_id: 1,
      quote_decimals: 6,
      quote_mint: 'QuoteMint111111111111111111111111111111111',
      quote_ticker: 'usdc',
    })

    expect(identity.baseTicker).toBe('SOL')
    expect(identity.quoteTicker).toBe('USDC')
  })
})

describe('buildTradingDashboardViewModel', () => {
  it('prefers the latest market price and derives execution preview', () => {
    const chartCandles: Array<TradingViewAggregatedCandle> = [
      {
        close: 19,
        endSlot: 11,
        high: 19,
        low: 18,
        open: 18,
        startSlot: 10,
        time: 1_742_428_800,
        volume: 20,
      },
    ]

    const viewModel = buildTradingDashboardViewModel({
      amountAtoms: 1_000_000_000n,
      amountUiValue: 1,
      baseDecimals: 9,
      baseTicker: 'SOL',
      chartCandles,
      crosshairData: null,
      durationSeconds: 60,
      marketPrice: { price: 20, slot: 11 },
      marketUpdates: [
        {
          base_flow: 1_000_000_000n,
          created_at: '2026-03-20T00:00:00Z',
          id: 2,
          market_id: 1,
          quote_flow: 19_000_000_000n,
          signature: 'newer',
          slot: 11,
        },
        {
          base_flow: 1_000_000_000n,
          created_at: '2026-03-19T23:59:00Z',
          id: 1,
          market_id: 1,
          quote_flow: 18_000_000_000n,
          signature: 'older',
          slot: 10,
        },
      ],
      quoteDecimals: 9,
      quoteTicker: 'USDC',
      side: 'buy',
      streamingState: {
        bookkeepingBasePerQuote: 0n,
        bookkeepingLastUpdateSlot: 11,
        bookkeepingQuotePerBase: 0n,
        currentSlot: 11,
        endSlotInterval: 5,
        marketBaseFlow: 1_000_000_000n,
        marketQuoteFlow: 20_000_000_000n,
      },
      tradePositions: [],
    })

    expect(viewModel.displayPrice).toBe(20)
    expect(viewModel.priceDelta).toBe(1)
    expect(viewModel.estimatedConversionText).toContain('SOL')
    expect(viewModel.executionPriceDisplay).toMatch(/^\$/)
  })
})
