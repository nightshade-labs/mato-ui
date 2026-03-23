import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase'
import {
  parseClosePositionEvent,
  parseMarketUpdateEvent,
  type MarketConfigRow,
  type MarketUpdateEvent,
  type MarketUpdateEventRow,
} from '@/integrations/supabase'
import { marketPriceFromFlows } from '../lib/market'

const MARKET_UPDATE_RANGE_PAGE_SIZE = 5_000

export function sortMarketUpdatesDescending(events: MarketUpdateEvent[]) {
  return [...events].sort((left, right) => right.slot - left.slot)
}

export function dedupeMarketUpdatesById(events: MarketUpdateEvent[]) {
  const ids = new Set<number>()
  const deduped: MarketUpdateEvent[] = []

  for (const event of events) {
    if (ids.has(event.id)) continue
    ids.add(event.id)
    deduped.push(event)
  }

  return deduped
}

export async function fetchMarketConfig(marketId: number) {
  const { data, error } = await supabase
    .from('market_configs')
    .select('*')
    .eq('market_id', marketId)
    .single<MarketConfigRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function fetchMarketUpdatesPage({
  beforeSlot,
  limit,
  marketId,
}: {
  beforeSlot?: number
  limit: number
  marketId: number
}) {
  let request = supabase
    .from('market_update_events')
    .select('*')
    .eq('market_id', marketId)
    .order('slot', { ascending: false })
    .limit(limit)

  if (beforeSlot !== undefined) {
    request = request.lt('slot', beforeSlot)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(parseMarketUpdateEvent)
}

export async function fetchLatestMarketUpdate(marketId: number) {
  const { data, error } = await supabase
    .from('market_update_events')
    .select('*')
    .eq('market_id', marketId)
    .order('slot', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  const row = data?.[0]
  return row ? parseMarketUpdateEvent(row) : null
}

export async function fetchMarketPrice({
  config,
  marketId,
}: {
  config: Pick<MarketConfigRow, 'base_decimals' | 'quote_decimals'>
  marketId: number
}) {
  const latestUpdate = await fetchLatestMarketUpdate(marketId)

  return {
    price:
      latestUpdate === null
        ? null
        : marketPriceFromFlows(
            latestUpdate.base_flow,
            latestUpdate.quote_flow,
            config.base_decimals,
            config.quote_decimals,
          ),
    slot: latestUpdate?.slot ?? null,
  }
}

export async function fetchMarketUpdateRange({
  endSlot,
  marketId,
  startSlot,
}: {
  endSlot: number
  marketId: number
  startSlot: number
}) {
  if (startSlot > endSlot) return []

  const history: MarketUpdateEvent[] = []
  const { data: anchorData, error: anchorError } = await supabase
    .from('market_update_events')
    .select('*')
    .eq('market_id', marketId)
    .lt('slot', startSlot)
    .order('slot', { ascending: false })
    .limit(1)

  if (anchorError) {
    throw new Error(anchorError.message)
  }

  if (anchorData && anchorData.length > 0) {
    history.push(parseMarketUpdateEvent(anchorData[0]))
  }

  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('market_update_events')
      .select('*')
      .eq('market_id', marketId)
      .gte('slot', startSlot)
      .lte('slot', endSlot)
      .order('slot', { ascending: true })
      .range(from, from + MARKET_UPDATE_RANGE_PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    const page = (data ?? []).map(parseMarketUpdateEvent)
    history.push(...page)

    if (page.length < MARKET_UPDATE_RANGE_PAGE_SIZE) {
      break
    }

    from += MARKET_UPDATE_RANGE_PAGE_SIZE
  }

  return history.sort((left, right) => {
    if (left.slot === right.slot) return left.id - right.id
    return left.slot - right.slot
  })
}

export async function fetchClosedPositionEvents({
  limit = 50,
  marketId,
  positionAuthority,
}: {
  limit?: number
  marketId?: number
  positionAuthority: string
}) {
  let request = supabase
    .from('close_position_events')
    .select('*')
    .eq('position_authority', positionAuthority)
    .order('slot', { ascending: false })
    .limit(limit)

  if (marketId !== undefined) {
    request = request.eq('market_id', marketId)
  }

  const { data, error } = await request
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(parseClosePositionEvent)
}

export function subscribeToMarketUpdates({
  channelName,
  marketId,
  onInsert,
}: {
  channelName: string
  marketId: number
  onInsert: (event: MarketUpdateEvent) => void
}) {
  return supabase
    .channel(channelName)
    .on<MarketUpdateEventRow>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'market_update_events',
        filter: `market_id=eq.${marketId}`,
      },
      (payload) => {
        onInsert(parseMarketUpdateEvent(payload.new))
      },
    )
    .subscribe()
}

export async function unsubscribeFromChannel(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
}
