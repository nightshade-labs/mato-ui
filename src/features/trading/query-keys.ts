function normalizeKeyPart(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'none'
  return typeof value === 'bigint' ? value.toString() : String(value)
}

export const tradingQueryKeys = {
  marketAddress: (marketId: number) =>
    ['trading', 'market-address', marketId] as const,
  marketConfig: (marketId: number) =>
    ['trading', 'market-config', marketId] as const,
  marketUpdates: (marketId: number, limit: number) =>
    ['trading', 'market-updates', marketId, limit] as const,
  marketUpdateRange: (
    marketId: number,
    startSlot: number | null,
    endSlot: number | null,
  ) =>
    [
      'trading',
      'market-updates',
      'range',
      marketId,
      normalizeKeyPart(startSlot),
      normalizeKeyPart(endSlot),
    ] as const,
  marketPrice: (marketId: number) =>
    ['trading', 'market-price', marketId] as const,
  tradePositions: (authority: string | null | undefined) =>
    ['trading', 'trade-positions', normalizeKeyPart(authority)] as const,
  closedPositions: (
    authority: string | null | undefined,
    marketId: number | undefined,
    limit: number,
  ) =>
    [
      'trading',
      'closed-positions',
      normalizeKeyPart(authority),
      normalizeKeyPart(marketId),
      limit,
    ] as const,
  streamingMarket: (marketAddress: string | null | undefined) =>
    ['trading', 'streaming-market', normalizeKeyPart(marketAddress)] as const,
  endSlotSnapshot: (
    marketAddress: string,
    pricesAccountIndex: number | null,
    snapshotIndex: number | null,
    isBuy: boolean,
  ) =>
    [
      'trading',
      'end-slot-snapshot',
      marketAddress,
      normalizeKeyPart(pricesAccountIndex),
      normalizeKeyPart(snapshotIndex),
      isBuy ? 'buy' : 'sell',
    ] as const,
}
