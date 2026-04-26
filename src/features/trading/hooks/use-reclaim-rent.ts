import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useSendTransaction,
  useSolanaClient,
  useWalletSession,
} from '@solana/react-hooks'
import { fetchMarket } from '@/lib/generated/twob/src/generated/accounts'
import { MARKET_ID, MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION } from '../constants'
import {
  getPreviousIndex,
  getReferenceIndex,
  sendReclaimRent,
} from '../api/twob-client'
import { formatTransactionError } from '../lib/transaction-errors'
import { collectCloseableRentAccounts } from '../lib/rent'
import { tradingQueryKeys } from '../query-keys'
import { tradingQueries } from '../queries'
import { useMarketAddress } from './use-market-address'

type ReclaimRentStatus = 'idle' | 'building' | 'submitting' | 'success' | 'error'

const RENT_RUNTIME_QUERY_KEY = 'rent-runtime-context'

export function useReclaimRent(enabled: boolean) {
  const client = useSolanaClient()
  const session = useWalletSession()
  const sendTransaction = useSendTransaction()
  const queryClient = useQueryClient()
  const marketAddressQuery = useMarketAddress(MARKET_ID)
  const marketAddress = marketAddressQuery.data
  const ownerAddress = session?.account.address.toString() ?? null
  const shouldFetch = enabled && Boolean(ownerAddress)

  const [status, setStatus] = useState<ReclaimRentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [reclaimedCount, setReclaimedCount] = useState(0)

  const exitsQuery = useQuery({
    ...tradingQueries.ownedExitsAccounts({ authority: ownerAddress, client }),
    enabled: shouldFetch,
    refetchInterval: shouldFetch ? 10_000 : false,
    refetchIntervalInBackground: true,
  })
  const pricesQuery = useQuery({
    ...tradingQueries.ownedPricesAccounts({ authority: ownerAddress, client }),
    enabled: shouldFetch,
    refetchInterval: shouldFetch ? 10_000 : false,
    refetchIntervalInBackground: true,
  })
  const runtimeContextQuery = useQuery({
    queryKey: [RENT_RUNTIME_QUERY_KEY, marketAddress ?? 'none'],
    queryFn: async () => {
      if (!marketAddress) {
        throw new Error('Market address not available.')
      }

      const [currentSlot, marketAccount] = await Promise.all([
        client.runtime.rpc.getSlot({ commitment: 'confirmed' }).send(),
        fetchMarket(client.runtime.rpc, marketAddress, {
          commitment: 'confirmed',
        }),
      ])
      const referenceIndex = getReferenceIndex(
        Number(currentSlot),
        marketAccount.data.endSlotInterval,
      )

      return {
        currentSlot: Number(currentSlot),
        endSlotInterval: marketAccount.data.endSlotInterval,
        previousIndex:
          referenceIndex > 0n ? getPreviousIndex(referenceIndex) : null,
        referenceIndex,
      }
    },
    enabled: shouldFetch && Boolean(marketAddress),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  })

  const exitsAccounts = useMemo(
    () =>
      (exitsQuery.data ?? []).map((account) => ({
        address: account.address,
        index: account.data.index,
      })),
    [exitsQuery.data],
  )
  const pricesAccounts = useMemo(
    () =>
      (pricesQuery.data ?? []).map((account) => ({
        address: account.address,
        index: account.data.index,
        openPositions: account.data.openPositions,
      })),
    [pricesQuery.data],
  )

  const closeableCount = useMemo(() => {
    if (!runtimeContextQuery.data) return 0

    const indicesWithOpenPositions = new Set<bigint>(
      pricesAccounts
        .filter((account) => account.openPositions > 0n)
        .map((account) => account.index),
    )

    const allCandidates = collectCloseableRentAccounts({
      currentSlot: runtimeContextQuery.data.currentSlot,
      endSlotInterval: runtimeContextQuery.data.endSlotInterval,
      exitsAccounts,
      maxAccounts: exitsAccounts.length + pricesAccounts.length,
      pricesAccounts,
    })

    const previousIndex = runtimeContextQuery.data.previousIndex
    if (previousIndex === null) return 0

    return allCandidates.filter((account) => {
      if (account.index >= previousIndex) return false
      if (
        account.kind === 'exits' &&
        indicesWithOpenPositions.has(account.index)
      ) {
        return false
      }
      return true
    }).length
  }, [
    exitsAccounts,
    pricesAccounts,
    runtimeContextQuery.data,
  ])

  const reclaimRent = useCallback(async () => {
    if (!session) {
      setStatus('error')
      setError('Connect a wallet to reclaim rent.')
      return false
    }
    if (!marketAddress) {
      setStatus('error')
      setError('Market address is not available yet.')
      return false
    }

    setStatus('building')
    setError(null)
    setSignature(null)
    setReclaimedCount(0)

    try {
      setStatus('submitting')
      const result = await sendReclaimRent({
        client,
        request: {
          marketAddress,
          maxAccounts: MAX_RECLAIM_RENT_ACCOUNTS_PER_TRANSACTION,
        },
        session,
      })

      setStatus('success')
      setReclaimedCount(result.closedAccounts)
      setSignature(result.signature)

      const connectedAddress = session.account.address.toString()
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: tradingQueryKeys.ownedExitsAccounts(connectedAddress),
        }),
        queryClient.invalidateQueries({
          queryKey: tradingQueryKeys.ownedPricesAccounts(connectedAddress),
        }),
        queryClient.invalidateQueries({
          queryKey: [RENT_RUNTIME_QUERY_KEY, marketAddress],
        }),
      ])
      return true
    } catch (error) {
      setStatus('error')
      setError(formatTransactionError(error, 'Failed to reclaim rent.'))
      return false
    }
  }, [
    client,
    marketAddress,
    queryClient,
    session,
  ])

  const reset = useCallback(() => {
    sendTransaction.reset()
    setStatus('idle')
    setError(null)
    setSignature(null)
    setReclaimedCount(0)
  }, [sendTransaction])

  return {
    closeableCount,
    error,
    isLoadingEligibility:
      shouldFetch &&
      (exitsQuery.isPending || pricesQuery.isPending || runtimeContextQuery.isPending),
    isReclaiming: status === 'building' || status === 'submitting',
    reclaimRent,
    reclaimedCount,
    reset,
    signature,
    status,
  }
}
