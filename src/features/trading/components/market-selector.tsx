import { MARKET_DEFINITIONS } from '../constants'
import type { MarketId } from '../constants'

export function MarketSelector({
  disabled = false,
  marketId,
  onMarketChange,
}: {
  disabled?: boolean
  marketId: MarketId
  onMarketChange: (marketId: MarketId) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium">Market</span>
      <select
        aria-label="Market"
        className="h-10 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => {
          const selectedMarket = MARKET_DEFINITIONS.find(
            (market) => String(market.id) === event.currentTarget.value,
          )
          if (selectedMarket) onMarketChange(selectedMarket.id)
        }}
        value={marketId}
      >
        {MARKET_DEFINITIONS.map((market) => (
          <option key={market.id} value={market.id}>
            {market.baseSymbol}/{market.quoteSymbol} · Market #{market.id}
          </option>
        ))}
      </select>
    </label>
  )
}
