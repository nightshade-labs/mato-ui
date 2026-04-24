import { createFileRoute } from '@tanstack/react-router'
import { TradingDashboard } from '@/features/trading/components/trading-dashboard'
import { MARKET_ID } from '@/features/trading/constants'
import { tradingQueries } from '@/features/trading/queries'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tradingQueries.marketConfig(MARKET_ID),
      ),
      context.queryClient.ensureQueryData(
        tradingQueries.marketAddress(MARKET_ID),
      ),
      context.queryClient.ensureQueryData(
        tradingQueries.marketPrice(MARKET_ID),
      ),
    ])
  },
  component: App,
})

function App() {
  return <TradingDashboard />
}
