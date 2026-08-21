import { createFileRoute } from '@tanstack/react-router'
import type { MarketId } from '@/features/trading/constants'
import { TradingDashboard } from '@/features/trading/components/trading-dashboard'
import { parseMarketSearch } from '@/features/trading/constants'
import { tradingQueries } from '@/features/trading/queries'

export const Route = createFileRoute('/')({
  validateSearch: parseMarketSearch,
  loaderDeps: ({ search }) => ({ marketId: search.market }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      tradingQueries.marketAddress(deps.marketId),
    )
  },
  component: App,
})

function App() {
  const { market: marketId } = Route.useSearch()
  const navigate = Route.useNavigate()

  function handleMarketChange(nextMarketId: MarketId) {
    void navigate({ search: { market: nextMarketId } })
  }

  return (
    <TradingDashboard marketId={marketId} onMarketChange={handleMarketChange} />
  )
}
