export { supabase } from './client'
export type {
  ClosePositionEvent,
  MarketConfigRow,
  MarketUpdateEvent,
  ClosePositionEventRow,
  MarketUpdateEventRow,
  Database,
} from './types'
export { parseClosePositionEvent, parseMarketUpdateEvent } from './types'
export {
  useMarketUpdates,
  useMarketUpdatesByMarketId,
  useMarketUpdatesRealtime,
  useClosedPositions,
  useClosedPositionsByAuthority,
} from './hooks'
