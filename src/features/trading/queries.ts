import type { SolanaClient } from '@solana/client'
import { queryOptions } from '@tanstack/react-query'
import type { Address } from '@solana/kit'
import type { MarketConfigRow } from '@/integrations/supabase'
import {
  fetchClosedPositionEvents,
  fetchMarketConfig,
  fetchMarketPrice,
  fetchMarketUpdateRange,
  fetchMarketUpdatesPage,
} from './api/market-repository'
import {
  deriveMarketAddress,
  fetchEndSlotBookkeepingSnapshot,
  fetchStreamingMarketState,
  fetchTradePositions,
  resolveSnapshotLocation,
} from './api/twob-client'
import { tradingQueryKeys } from './query-keys'

export const MARKET_UPDATE_RANGE_STALE_TIME = 5 * 60_000

export const tradingQueries = {
  marketAddress: (marketId: number) =>
    queryOptions({
      queryKey: tradingQueryKeys.marketAddress(marketId),
      queryFn: () => deriveMarketAddress(BigInt(marketId)),
      staleTime: Infinity,
    }),
  marketConfig: (marketId: number) =>
    queryOptions({
      queryKey: tradingQueryKeys.marketConfig(marketId),
      queryFn: () => fetchMarketConfig(marketId),
      staleTime: Infinity,
    }),
  marketUpdates: ({
    limit,
    marketId,
  }: {
    limit: number
    marketId: number
  }) =>
    queryOptions({
      queryKey: tradingQueryKeys.marketUpdates(marketId, limit),
      queryFn: () => fetchMarketUpdatesPage({ limit, marketId }),
      refetchInterval: 5_000,
      refetchIntervalInBackground: true,
    }),
  marketUpdateRange: ({
    endSlot,
    marketId,
    startSlot,
  }: {
    endSlot: number | null
    marketId: number
    startSlot: number | null
  }) =>
    queryOptions({
      queryKey: tradingQueryKeys.marketUpdateRange(marketId, startSlot, endSlot),
      queryFn: async () => {
        if (startSlot === null || endSlot === null || startSlot > endSlot) {
          return []
        }

        return fetchMarketUpdateRange({ endSlot, marketId, startSlot })
      },
      staleTime: MARKET_UPDATE_RANGE_STALE_TIME,
    }),
  marketPrice: (marketId: number, config?: MarketConfigRow) =>
    queryOptions({
      queryKey: tradingQueryKeys.marketPrice(marketId),
      queryFn: async () => {
        const resolvedConfig = config ?? (await fetchMarketConfig(marketId))
        return fetchMarketPrice({ config: resolvedConfig, marketId })
      },
      refetchInterval: 5_000,
      refetchIntervalInBackground: true,
    }),
  tradePositions: ({
    authority,
    client,
  }: {
    authority: string | null | undefined
    client: SolanaClient
  }) =>
    queryOptions({
      queryKey: tradingQueryKeys.tradePositions(authority),
      queryFn: async () => {
        if (!authority) return []
        return fetchTradePositions(client.runtime.rpc, authority)
      },
    }),
  closedPositions: ({
    limit = 50,
    marketId,
    positionAuthority,
  }: {
    limit?: number
    marketId?: number
    positionAuthority: string
  }) =>
    queryOptions({
      queryKey: tradingQueryKeys.closedPositions(positionAuthority, marketId, limit),
      queryFn: () =>
        fetchClosedPositionEvents({ limit, marketId, positionAuthority }),
    }),
  streamingMarket: ({
    client,
    marketAddress,
  }: {
    client: SolanaClient
    marketAddress: Address | undefined
  }) =>
    queryOptions({
      queryKey: tradingQueryKeys.streamingMarket(marketAddress),
      queryFn: async () => {
        if (!marketAddress) {
          throw new Error('Market address not available')
        }

        return fetchStreamingMarketState(client.runtime.rpc, marketAddress)
      },
      refetchInterval: 1_000,
    }),
  endSlotSnapshot: ({
    client,
    currentSlot,
    endSlot,
    endSlotInterval,
    isBuy,
    marketAddress,
  }: {
    client: SolanaClient
    currentSlot: number | null
    endSlot: number
    endSlotInterval: number | null
    isBuy: boolean
    marketAddress: Address
  }) => {
    const snapshotLocation =
      endSlotInterval === null
        ? null
        : resolveSnapshotLocation(endSlot, endSlotInterval)

    return queryOptions({
      queryKey: tradingQueryKeys.endSlotSnapshot(
        marketAddress,
        snapshotLocation?.pricesAccountIndex ?? null,
        snapshotLocation?.snapshotIndex ?? null,
        isBuy,
      ),
      queryFn: () =>
        fetchEndSlotBookkeepingSnapshot({
          currentSlot,
          endSlot,
          endSlotInterval,
          isBuy,
          marketAddress,
          rpcClient: client.runtime.rpc,
        }),
      staleTime: Infinity,
    })
  },
}
