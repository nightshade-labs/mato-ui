import { createServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase'
import type { ClosePositionEventRow } from '@/integrations/supabase'

export const getClosedPositions = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { data, error } = await supabase
    .from('close_position_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to fetch closed positions: ${error.message}`)
  }

  return data as ClosePositionEventRow[]
})

export async function fetchClosedPositionsByAuthority(
  authority: string,
): Promise<ClosePositionEventRow[]> {
  const { data, error } = await supabase
    .from('close_position_events')
    .select('*')
    .eq('position_authority', authority)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch closed positions: ${error.message}`)
  }

  return data as ClosePositionEventRow[]
}

export async function fetchClosedPositionsByMarketId(
  marketId: number,
): Promise<ClosePositionEventRow[]> {
  const { data, error } = await supabase
    .from('close_position_events')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch closed positions: ${error.message}`)
  }

  return data as ClosePositionEventRow[]
}
