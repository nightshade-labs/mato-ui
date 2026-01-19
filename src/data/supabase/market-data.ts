import { createServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase'
import type { MarketUpdateEventRow } from '@/integrations/supabase'

export const getMarketUpdates = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { data, error } = await supabase
    .from('market_update_events')
    .select('*')
    .order('created_at', { ascending: false })
  // .limit(100)

  if (error) {
    throw new Error(`Failed to fetch market updates: ${error.message}`)
  }

  return data as MarketUpdateEventRow[]
})

export async function fetchMarketUpdatesByMarketId(
  marketId: number,
): Promise<MarketUpdateEventRow[]> {
  const { data, error } = await supabase
    .from('market_update_events')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to fetch market updates: ${error.message}`)
  }

  return data as MarketUpdateEventRow[]
}
