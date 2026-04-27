import { createServerFn } from '@tanstack/react-start'
import type { MarketUpdateEventRow } from '@/integrations/supabase'

function envValue(name: string) {
  if (typeof process === 'undefined') {
    return ''
  }

  return process.env?.[name] ?? ''
}

const DEFAULT_MARKET_ID = Number.parseInt(
  envValue('DEFAULT_MARKET_ID') || '1',
  10,
)
const FNV64_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV64_PRIME = 0x100000001b3n
const FNV64_MASK = 0xffffffffffffffffn
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER)

interface ReadApiMarketUpdateItem {
  event_uid: string
  signature: string
  event_index: number
  slot: number
  market_id: number
  base_flow: string
  quote_flow: string
  created_at: string
}

interface ReadApiMarketUpdatesResponse {
  market_id: number
  before_slot: number | null
  has_more: boolean
  limit: number
  points: number
  items: Array<ReadApiMarketUpdateItem>
}

function resolveReadApiBaseUrl() {
  const value = (
    envValue('READ_API_URL') || envValue('VITE_READ_API_URL')
  ).trim()
  if (!value) {
    throw new Error(
      'READ_API_URL (or VITE_READ_API_URL) must be set to fetch market updates',
    )
  }

  return value.endsWith('/') ? value.slice(0, -1) : value
}

function readApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveReadApiBaseUrl()}${normalizedPath}`
}

function stableEventIdFromUid(eventUid: string) {
  let hash = FNV64_OFFSET_BASIS
  for (let index = 0; index < eventUid.length; index += 1) {
    hash ^= BigInt(eventUid.charCodeAt(index))
    hash = (hash * FNV64_PRIME) & FNV64_MASK
  }

  const normalized = hash % MAX_SAFE_INTEGER_BIGINT
  return Number(normalized === 0n ? 1n : normalized)
}

async function fetchMarketUpdatesViaReadApi(
  marketId: number,
): Promise<MarketUpdateEventRow[]> {
  const query = new URLSearchParams({ limit: '100' })
  const response = await fetch(
    readApiUrl(`/v1/markets/${marketId}/updates?${query.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Failed to fetch market updates (${response.status}): ${body || response.statusText}`,
    )
  }

  const payload = (await response.json()) as ReadApiMarketUpdatesResponse
  return payload.items.map((item) => ({
    id: stableEventIdFromUid(item.event_uid),
    signature: item.signature,
    slot: item.slot,
    market_id: item.market_id,
    base_flow: item.base_flow,
    quote_flow: item.quote_flow,
    created_at: item.created_at,
  }))
}

export const getMarketUpdates = createServerFn({
  method: 'GET',
}).handler(async () => {
  return fetchMarketUpdatesViaReadApi(DEFAULT_MARKET_ID)
})

export async function fetchMarketUpdatesByMarketId(
  marketId: number,
): Promise<MarketUpdateEventRow[]> {
  return fetchMarketUpdatesViaReadApi(marketId)
}
