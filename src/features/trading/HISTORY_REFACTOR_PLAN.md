# Market History Refactor Plan

This document scopes the next chart refactor around one goal:

- make market history a shared range-based resource
- let the main chart and mini charts consume it independently
- remove manual "Load older candles" UI

## Current Problems

The current web implementation still treats market history as "latest page plus optional older pages".

- The main chart is rendered from a single merged event list in [use-market-updates.ts](/Users/thgehr/development/mato/mato-ui/src/features/trading/hooks/use-market-updates.ts).
- Older history is extended through a button in [trading-dashboard.tsx](/Users/thgehr/development/mato/mato-ui/src/features/trading/components/trading-dashboard.tsx).
- Closed-position mini charts try to reuse that same history seed, then fall back to per-row range queries in [closed-positions-list.tsx](/Users/thgehr/development/mato/mato-ui/src/features/trading/components/closed-positions-list.tsx).

This creates three failure modes:

1. Main chart loading is page-driven instead of viewport-driven.
2. Mini charts are too aware of main-chart history state.
3. Overlapping range fetches do not reuse each other well because exact query keys do not imply interval coverage.

## Target Behavior

### Main Chart

- The user scrolls horizontally to older history.
- When the viewport approaches the oldest loaded candles, the app fetches older data automatically.
- The chart viewport stays stable when older data is prepended.
- The chart always has full price data for the time window currently visible to the user, plus a small buffer.
- There is no "Load older candles" button.
- There is no background auto-pagination unrelated to user scroll.

### Mini Charts

- Each mini chart is defined by its own `[startSlot, endSlot]`.
- A mini chart can render immediately if the shared history store already covers that slot range.
- If shared history does not cover the range, the mini chart still fetches what it needs.
- Multiple missing mini-chart ranges should be merged into a few batched fetches when possible.
- Mini charts must not depend on the main chart already having loaded their history.

## Architecture

Introduce a shared `market history store` per market.

It owns:

- normalized `MarketPricePoint[]`
- loaded slot intervals
- in-flight slot intervals
- gap detection for requested ranges
- merged range fetching

It does not own:

- candle aggregation for a specific timeframe
- chart viewport state
- mini-chart SVG generation

Those stay as consumers of the shared store.

## Phase 1: Shared History Layer

Create a new module around pure range logic and a hook/store adapter.

Suggested files:

- `src/features/trading/lib/slot-ranges.ts`
- `src/features/trading/lib/market-history-store.ts`
- `src/features/trading/hooks/use-market-history-store.ts`

### Core Data Types

```ts
interface SlotRange {
  startSlot: number
  endSlot: number
}

interface MarketHistoryStoreState {
  marketId: number
  points: MarketPricePoint[]
  loadedRanges: SlotRange[]
  pendingRanges: SlotRange[]
  failedRanges: SlotRange[]
}
```

### Required Pure Helpers

- `mergeOverlappingRanges(ranges)`
- `subtractCoveredRanges(requestedRange, loadedRanges)`
- `mergeAdjacentRanges(ranges, maxGapSlots)`
- `insertNormalizedHistory(points, incomingPoints)`
- `hasFullCoverage(loadedRanges, requestedRange)`
- `selectPointsForRange(points, requestedRange)`

### Store API

```ts
interface EnsureHistoryOptions {
  reason: 'main-chart' | 'mini-chart'
  maxGapSlots?: number
}

interface MarketHistoryStore {
  getSnapshot(): MarketHistoryStoreState
  ensureRange(range: SlotRange, options?: EnsureHistoryOptions): Promise<void>
  ensureRanges(
    ranges: SlotRange[],
    options?: EnsureHistoryOptions,
  ): Promise<void>
  getPointsForRange(range: SlotRange): MarketPricePoint[]
  hasCoverage(range: SlotRange): boolean
}
```

### Fetch Strategy

- `ensureRange()` computes missing gaps against `loadedRanges`.
- Missing gaps are merged before read API requests fire.
- Each fetch still uses `fetchMarketUpdateRange()` so the backend contract stays stable.
- Returned history is normalized once and merged into the shared store.

This phase should land before any chart UI changes.

## Phase 2: Main Chart Scroll Loading

The main chart should stop thinking in terms of `loadMoreHistory()`.

### New Main-Chart Contract

The chart component should receive:

```ts
interface MarketChartHistoryController {
  candles: TradingViewAggregatedCandle[]
  hasOlderHistory: boolean
  isLoadingOlderHistory: boolean
  onNeedOlderHistory: (visibleLogicalRange: {
    from: number
    to: number
  }) => void
}
```

### Loading Rule

- Subscribe to `timeScale().subscribeVisibleLogicalRangeChange`.
- When `visibleRange.from` gets close to the left edge threshold, request older slot coverage.
- Use the oldest visible candle time and timeframe to compute the next older target time window.
- Convert that time window into a slot range and call `ensureRange()`.

### Stability Rule

When older candles are prepended:

- keep the current logical range anchored by shifting it right by the number of prepended candles
- do not call `fitContent()` except for:
  - first successful load
  - explicit reset action

## Phase 3: Mini-Chart Independence

Closed positions should stop owning their own fetch strategy directly.

### New Flow

For each visible closed position:

1. ask the shared history store if `[startSlot, endSlot]` is covered
2. if yes, build the mini chart immediately from cached points
3. if no, enqueue that range with the mini-chart batch loader
4. rebuild the chart when the store gains coverage

### Batch Optimization

Before mini-chart fetches fire:

- collect uncovered visible ranges
- merge overlapping or near-adjacent ranges
- fetch those merged ranges
- fan the results back out locally

This gives us:

- reuse when main chart already loaded the history
- independence when it did not
- bounded fetch counts for large closed-position lists

## Phase 4: Visibility And Performance

Once the shared store works, optimize fetch pressure:

- only resolve mini charts for visible rows plus overscan
- cap concurrent batch executions
- keep normalized points in slot order to avoid repeated sorting
- cache aggregated candles per timeframe from the same underlying point store

## Implementation Checklist

### Foundation

- add pure slot-range helpers with tests
- add market-history store state and merge logic with tests
- wire store fetches to `fetchMarketUpdateRange()`

### Main Chart

- replace button-driven history loading with visible-range callbacks
- keep viewport stable when prepending candles
- fetch older history only from user-driven horizontal navigation
- remove `Load older candles` UI

### Mini Charts

- replace seed-specific logic with shared-store coverage checks
- add merged mini-chart range batching
- keep skeletons only while a chart's own range is still unresolved
- stop coupling mini-chart readiness to main-chart history pagination

### Verification

- unit tests for interval merge and gap detection
- unit tests for candle prepend viewport math
- unit tests for merged mini-chart fetch planning
- manual verification:
  - refresh page, closed-position mini charts still resolve
  - pan main chart left, older candles load with no jump
  - mini charts still load even if main chart never visited that slot range

## Recommended Delivery Order

1. Phase 1 foundation
2. Main chart scroll loading
3. Mini-chart shared-store integration
4. Cleanup of obsolete `loadMoreHistory` and seed-specific code

That order keeps the main history model stable before UI consumers are migrated.
