export interface ClosePositionEvent {
  id: number
  signature: string
  slot: number
  position_authority: string
  market_id: number
  deposit_amount: bigint
  swapped_amount: bigint
  remaining_amount: bigint
  fee_amount: bigint
  is_buy: number
  created_at: string
}

export interface MarketUpdateEvent {
  id: number
  signature: string
  slot: number
  market_id: number
  base_flow: bigint
  quote_flow: bigint
  created_at: string
}

export interface ClosePositionEventRow {
  id: number
  signature: string
  slot: number
  position_authority: string
  market_id: number
  deposit_amount: string
  swapped_amount: string
  remaining_amount: string
  fee_amount: string
  is_buy: number
  created_at: string
}

export interface MarketUpdateEventRow {
  id: number
  signature: string
  slot: number
  market_id: number
  base_flow: string
  quote_flow: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      close_position_events: {
        Row: ClosePositionEventRow
        Insert: Omit<ClosePositionEventRow, 'id' | 'created_at'>
        Update: Partial<Omit<ClosePositionEventRow, 'id'>>
      }
      market_update_events: {
        Row: MarketUpdateEventRow
        Insert: Omit<MarketUpdateEventRow, 'id' | 'created_at'>
        Update: Partial<Omit<MarketUpdateEventRow, 'id'>>
      }
    }
  }
}

export function parseClosePositionEvent(
  row: ClosePositionEventRow,
): ClosePositionEvent {
  return {
    ...row,
    deposit_amount: BigInt(row.deposit_amount),
    swapped_amount: BigInt(row.swapped_amount),
    remaining_amount: BigInt(row.remaining_amount),
    fee_amount: BigInt(row.fee_amount),
  }
}

export function parseMarketUpdateEvent(
  row: MarketUpdateEventRow,
): MarketUpdateEvent {
  return {
    ...row,
    base_flow: BigInt(row.base_flow),
    quote_flow: BigInt(row.quote_flow),
  }
}
