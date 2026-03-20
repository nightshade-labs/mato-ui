import { createFileRoute } from '@tanstack/react-router'
import { TradingDashboard } from '@/features/trading/components/trading-dashboard'
import {
  DEFAULT_MARKET_UPDATES_LIMIT,
  MARKET_ID,
} from '@/features/trading/constants'
import { tradingQueries } from '@/features/trading/queries'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    const marketConfig = await context.queryClient.ensureQueryData(
      tradingQueries.marketConfig(MARKET_ID),
    )

    await Promise.all([
      context.queryClient.ensureQueryData(tradingQueries.marketAddress(MARKET_ID)),
      context.queryClient.ensureQueryData(
        tradingQueries.marketUpdates({
          limit: DEFAULT_MARKET_UPDATES_LIMIT,
          marketId: MARKET_ID,
        }),
      ),
      context.queryClient.ensureQueryData(
        tradingQueries.marketPrice(MARKET_ID, marketConfig),
      ),
    ])
  },
  component: App,
})

function App() {
  return <TradingDashboard />
}
