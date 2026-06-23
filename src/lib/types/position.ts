export interface TradePosition {
  authority: string
  id: bigint
  amount: bigint
  startSlot: bigint
  endSlot: bigint
  bookkeepingSnapshot: bigint
  slotsWithoutTradesSnapshot: bigint
  isBuy: boolean
  bump: number
}

export interface TokenMint {
  symbol: string
  decimals: number
}

export interface ActivePositionProps {
  position: TradePosition
  currentSlot: bigint
  inputMint: TokenMint
  outputMint: TokenMint
  amountReceived?: bigint
}
