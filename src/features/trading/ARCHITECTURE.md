# Trading Architecture

This feature is organized around four layers:

1. `api/`
   Owns protocol and persistence access.
   `twob-client.ts` contains PDA derivation, on-chain reads, and transaction construction.
   `market-repository.ts` contains Supabase reads and realtime subscriptions.

2. `queries.ts`
   Centralizes TanStack Query option builders so route loaders, hooks, and ad hoc prefetches share the same query keys and fetch behavior.

3. `domain/` and `view-models/`
   Domain types live in `domain/models.ts`.
   UI-facing derivations live in `view-models/` so components do not need to mix rendering with TWOB math.

4. `hooks/` and `components/`
   Hooks are thin adapters over the shared query and API layers.
   Components focus on composition and rendering.

## Route Loading

The home route preloads market config, market address, recent market history, and the latest market price at the route boundary.
Wallet-dependent data stays client-side because it depends on the active browser wallet session.

## Mobile To Web Differences

- Wallet connection uses wallet-standard via `@solana/client` and `@solana/react-hooks`, not mobile wallet adapter.
- The web app uses Codama-generated account and instruction builders directly.
- Chart rendering uses `lightweight-charts` without a wrapper.
- Wrapped SOL handling is explicit in the submit flow, instead of relying on mobile transaction composition behavior.
- TanStack Router loaders are used for initial market bootstrap so the page has a cleaner data entry point than the mobile app.
