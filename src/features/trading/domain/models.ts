import type { Address } from '@solana/kit'
import type { TradePosition } from '@/lib/generated/twob/src/generated/accounts'

export interface TradePositionRecord {
  address: Address
  data: TradePosition
}

export interface StreamingMarketState {
  currentSlot: number
  endSlotInterval: number
  marketBaseFlow: bigint
  marketQuoteFlow: bigint
  bookkeepingBasePerQuote: bigint
  bookkeepingQuotePerBase: bigint
  bookkeepingLastUpdateSlot: number
}

export interface MarketPriceSnapshot {
  eventTimeMs: number | null
  price: number | null
  slot: number | null
}
