import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useSolanaClient, useWalletSession } from '@solana/react-hooks'
import { Wallet } from 'lucide-react'
import type {
  OwnedExitsAccount,
  OwnedPricesAccount,
} from '@/features/trading/api/rent-accounts'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { shortenAddress } from '@/features/trading/lib/format'
import { tradingQueries } from '@/features/trading/queries'

export const Route = createFileRoute('/rent')({
  component: RentPage,
})

type AccountRow = {
  address: string
  index: bigint
  market: string
  openPositions?: number
  payer: string
}

function mapPricesRows(accounts: Array<OwnedPricesAccount>): Array<AccountRow> {
  return accounts.map((account) => ({
    address: account.address.toString(),
    index: account.data.index,
    market: account.data.market.toString(),
    payer: account.data.payer.toString(),
  }))
}

function mapExitsRows(accounts: Array<OwnedExitsAccount>): Array<AccountRow> {
  return accounts.map((account) => ({
    address: account.address.toString(),
    index: account.data.index,
    market: account.data.market.toString(),
    openPositions: account.data.openPositions,
    payer: account.data.payer.toString(),
  }))
}

function RentPage() {
  const client = useSolanaClient()
  const session = useWalletSession()
  const ownerAddress = session?.account.address.toString() ?? null

  const pricesQuery = useQuery({
    ...tradingQueries.ownedPricesAccounts({ authority: ownerAddress, client }),
    enabled: Boolean(ownerAddress),
  })
  const exitsQuery = useQuery({
    ...tradingQueries.ownedExitsAccounts({ authority: ownerAddress, client }),
    enabled: Boolean(ownerAddress),
  })

  const pricesRows = mapPricesRows(pricesQuery.data ?? [])
  const exitsRows = mapExitsRows(exitsQuery.data ?? [])
  const totalAccounts = pricesRows.length + exitsRows.length
  const isPricesLoading = ownerAddress !== null && pricesQuery.isPending
  const isExitsLoading = ownerAddress !== null && exitsQuery.isPending
  const errorMessage =
    pricesQuery.error instanceof Error
      ? pricesQuery.error.message
      : exitsQuery.error instanceof Error
        ? exitsQuery.error.message
        : null
  const isLoading = isPricesLoading || isExitsLoading
  const isRefreshing =
    ownerAddress !== null && (pricesQuery.isFetching || exitsQuery.isFetching)

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] bg-[color:var(--color-page-bg)] text-foreground">
      <div className="relative mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">
            Rent Accounts
          </h1>
          <Badge variant="accent">Wallet-funded prices + exits</Badge>
        </div>

        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          Connected wallet payers can reclaim rent after closing these account
          pairs. This view lists every `prices` and `exits` account funded by
          your wallet.
        </p>

        {!ownerAddress ? (
          <Alert className="mb-6 border-white/10 bg-black/15 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wallet className="size-4" />
              <span>Connect a wallet to load owned rent accounts.</span>
            </div>
          </Alert>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <Card className="border-white/10 bg-black/15">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Total
                  </p>
                  <p className="text-2xl font-semibold leading-none">
                    {totalAccounts}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-black/15">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Prices
                  </p>
                  <p className="text-2xl font-semibold leading-none">
                    {pricesRows.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-black/15">
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Exits
                  </p>
                  <p className="text-2xl font-semibold leading-none">
                    {exitsRows.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {isRefreshing && !isLoading ? (
              <p className="mb-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Refreshing account list...
              </p>
            ) : null}

            {errorMessage ? (
              <Alert className="mb-6 border-destructive/30 bg-destructive/10 text-destructive">
                {errorMessage}
              </Alert>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <OwnedAccountCard
                description="Price snapshot accounts funded by this wallet."
                emptyLabel="No funded prices accounts found."
                isLoading={isPricesLoading}
                rows={pricesRows}
                title="Prices Accounts"
              />
              <OwnedAccountCard
                description="Exit flow accounts funded by this wallet."
                emptyLabel="No funded exits accounts found."
                isLoading={isExitsLoading}
                rows={exitsRows}
                showOpenPositions
                title="Exits Accounts"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OwnedAccountCard({
  description,
  emptyLabel,
  isLoading,
  rows,
  showOpenPositions = false,
  title,
}: {
  description: string
  emptyLabel: string
  isLoading: boolean
  rows: Array<AccountRow>
  showOpenPositions?: boolean
  title: string
}) {
  return (
    <Card className="border-white/10 bg-black/15">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 pr-3 font-medium">Account</th>
                  <th className="pb-3 pr-3 font-medium">Index</th>
                  <th className="pb-3 pr-3 font-medium">Market</th>
                  {showOpenPositions ? (
                    <th className="pb-3 pr-3 font-medium">Open Positions</th>
                  ) : null}
                  <th className="pb-3 font-medium">Payer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.address}
                    className="border-t border-white/8 text-foreground/95"
                  >
                    <td className="py-3 pr-3 font-mono text-xs">
                      <span title={row.address}>
                        {shortenAddress(row.address, 6, 6)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs">
                      {row.index.toString()}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs">
                      <span title={row.market}>
                        {shortenAddress(row.market, 6, 6)}
                      </span>
                    </td>
                    {showOpenPositions ? (
                      <td className="py-3 pr-3 font-mono text-xs">
                        {(row.openPositions ?? 0).toString()}
                      </td>
                    ) : null}
                    <td className="py-3 font-mono text-xs">
                      <span title={row.payer}>
                        {shortenAddress(row.payer, 6, 6)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
