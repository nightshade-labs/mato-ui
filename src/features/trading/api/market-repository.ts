import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  MarketConfigRow,
  MarketUpdateEvent,
  MarketUpdateEventRow,
} from '@/integrations/supabase'
import {
  parseClosePositionEvent,
  parseMarketUpdateEvent,
  supabase,
} from '@/integrations/supabase'
import { readApiUrl } from './read-api'

// Supabase truncates range queries to 1000 rows on this project, so the
// pagination loop must use the same page size or it will stop too early and
// leave holes in the loaded event timeline.
const MARKET_UPDATE_RANGE_PAGE_SIZE = 1_000

export type CandleInterval = '1m' | '5m' | '1h'
const MAX_LIGHTWEIGHT_CHART_ABS_VALUE = 90_071_992_547_409.91

interface ReadApiPriceResponse {
  market_id: number
  slot: number
  event_time: string
  price: number
}

interface ReadApiCandleItem {
  time: number
  start_slot: number
  end_slot: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ReadApiCandleResponse {
  market_id: number
  interval: string
  from: string
  to: string
  points: number
  items: Array<ReadApiCandleItem>
}

export interface MarketCandle {
  time: number
  startSlot: number
  endSlot: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const MIN_VALID_UNIX_TIME_SECONDS = 946684800 // 2000-01-01T00:00:00Z
const MAX_VALID_UNIX_TIME_SECONDS = 4102444800 // 2100-01-01T00:00:00Z

function normalizeUnixTimeSeconds(rawTime: number) {
  if (!Number.isFinite(rawTime) || rawTime <= 0) {
    return null
  }

  const candidates = [rawTime, rawTime / 1_000, rawTime / 1_000_000, rawTime / 1_000_000_000]
  for (const candidate of candidates) {
    const normalized = Math.floor(candidate)
    if (
      normalized >= MIN_VALID_UNIX_TIME_SECONDS &&
      normalized <= MAX_VALID_UNIX_TIME_SECONDS
    ) {
      return normalized
    }
  }

  return null
}

function isSafeChartNumber(value: number) {
  return (
    Number.isFinite(value) &&
    Math.abs(value) <= MAX_LIGHTWEIGHT_CHART_ABS_VALUE
  )
}

export function sortMarketUpdatesDescending(events: Array<MarketUpdateEvent>) {
  return [...events].sort((left, right) => right.slot - left.slot)
}

export function dedupeMarketUpdatesById(events: Array<MarketUpdateEvent>) {
  const ids = new Set<number>()
  const deduped: Array<MarketUpdateEvent> = []

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

  return data.map(parseMarketUpdateEvent)
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

  if (data.length === 0) {
    return null
  }

  return parseMarketUpdateEvent(data[0])
}

export async function fetchMarketPrice({
  marketId,
}: {
  marketId: number
}) {
  const response = await fetch(readApiUrl(`/v1/markets/${marketId}/price`), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Failed to fetch market price (${response.status}): ${body || response.statusText}`,
    )
  }

  const data = (await response.json()) as ReadApiPriceResponse

  return {
    price: Number.isFinite(data.price) ? data.price : null,
    slot: Number.isFinite(data.slot) ? data.slot : null,
  }
}

export async function fetchMarketCandles({
  from,
  interval,
  marketId,
  maxPoints = 1500,
  to,
}: {
  from: Date
  interval: CandleInterval
  marketId: number
  maxPoints?: number
  to: Date
}) {
  const query = new URLSearchParams({
    from: from.toISOString(),
    interval,
    max_points: String(maxPoints),
    to: to.toISOString(),
  })

  const response = await fetch(
    readApiUrl(`/v1/markets/${marketId}/candles?${query.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Failed to fetch market candles (${response.status}): ${body || response.statusText}`,
    )
  }

  const payload = (await response.json()) as ReadApiCandleResponse
  const candles = payload.items
    .map<MarketCandle | null>((item) => {
      const time = normalizeUnixTimeSeconds(item.time)
      if (time === null) {
        return null
      }
      if (
        !isSafeChartNumber(item.open) ||
        !isSafeChartNumber(item.high) ||
        !isSafeChartNumber(item.low) ||
        !isSafeChartNumber(item.close)
      ) {
        return null
      }
      if (item.open <= 0 || item.high <= 0 || item.low <= 0 || item.close <= 0) {
        return null
      }

      const normalizedHigh = Math.max(item.open, item.high, item.low, item.close)
      const normalizedLow = Math.min(item.open, item.high, item.low, item.close)
      const normalizedVolume =
        isSafeChartNumber(item.volume) && item.volume >= 0 ? item.volume : 0

      return {
        close: item.close,
        endSlot: item.end_slot,
        high: normalizedHigh,
        low: normalizedLow,
        open: item.open,
        startSlot: item.start_slot,
        time,
        volume: normalizedVolume,
      }
    })
    .filter((item): item is MarketCandle => item !== null)
    .sort((left, right) => {
      if (left.time === right.time) {
        return left.endSlot - right.endSlot
      }
      return left.time - right.time
    })

  const dedupedCandles: Array<MarketCandle> = []
  for (const candle of candles) {
    const previous = dedupedCandles.at(-1)
    if (previous && previous.time === candle.time) {
      if (candle.endSlot >= previous.endSlot) {
        dedupedCandles[dedupedCandles.length - 1] = candle
      }
      continue
    }

    dedupedCandles.push(candle)
  }

  return dedupedCandles
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

  const history: Array<MarketUpdateEvent> = []
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

  if (anchorData.length > 0) {
    history.push(parseMarketUpdateEvent(anchorData[0]))
  }

  let from = 0
  for (;;) {
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

    const page = data.map(parseMarketUpdateEvent)
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

  return data.map(parseClosePositionEvent)
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

export function subscribeToMarketPriceStream({
  marketId,
  onPriceUpdate,
}: {
  marketId: number
  onPriceUpdate: (payload: { price: number; slot: number }) => void
}) {
  const stream = new EventSource(readApiUrl(`/v1/markets/${marketId}/stream`))

  const listener = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as ReadApiPriceResponse
      if (!Number.isFinite(payload.price) || !Number.isFinite(payload.slot)) {
        return
      }

      onPriceUpdate({
        price: payload.price,
        slot: payload.slot,
      })
    } catch (error) {
      console.error('Failed to parse market price stream payload', error)
    }
  }

  stream.addEventListener('price_update', listener)
  return stream
}

export async function unsubscribeFromChannel(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
}
