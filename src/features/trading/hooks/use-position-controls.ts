import { useCallback, useRef, useState } from 'react'
import {
  useSendTransaction,
  useSolanaClient,
  useWalletSession,
} from '@solana/react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import {
  sendPauseTradePosition,
  sendUnpauseTradePosition,
  sendWithdrawSwapped,
} from '../api/twob-client'
import { formatTransactionError } from '../lib/transaction-errors'
import { tradingQueryKeys } from '../query-keys'
import type { Address } from '@solana/kit'

export type PositionControlAction = 'pause' | 'resume' | 'withdraw'

type PositionControlStatus =
  | 'idle'
  | 'building'
  | 'submitting'
  | 'success'
  | 'error'

const ACTION_FALLBACKS: Record<PositionControlAction, string> = {
  pause: 'Failed to pause position.',
  resume: 'Failed to resume position.',
  withdraw: 'Failed to withdraw swapped funds.',
}

export function usePositionControls() {
  const client = useSolanaClient()
  const session = useWalletSession()
  const sendTransaction = useSendTransaction()
  const queryClient = useQueryClient()
  const pendingRef = useRef(false)
  const [status, setStatus] = useState<PositionControlStatus>('idle')
  const [action, setAction] = useState<PositionControlAction | null>(null)
  const [positionAddress, setPositionAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  const controlPosition = useCallback(
    async ({
      action: nextAction,
      marketAddress,
      tradePositionAddress,
    }: {
      action: PositionControlAction
      marketAddress: Address
      tradePositionAddress: Address
    }) => {
      if (pendingRef.current) return false

      if (!session) {
        setAction(nextAction)
        setStatus('error')
        setError('Connect a wallet to update this position.')
        setPositionAddress(null)
        return false
      }

      setAction(nextAction)
      setStatus('building')
      setError(null)
      setSignature(null)
      setPositionAddress(tradePositionAddress.toString())
      pendingRef.current = true

      try {
        setStatus('submitting')
        const request = { marketAddress, tradePositionAddress }
        const serializedSignature =
          nextAction === 'pause'
            ? await sendPauseTradePosition({
                client,
                request,
                sendTransaction,
                session,
              })
            : nextAction === 'resume'
              ? await sendUnpauseTradePosition({
                  client,
                  request,
                  sendTransaction,
                  session,
                })
              : await sendWithdrawSwapped({
                  client,
                  request,
                  sendTransaction,
                  session,
                })

        setSignature(serializedSignature)
        const connectedAddress = session.account.address.toString()
        await Promise.allSettled([
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.tradePositions(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.marketTradePositions(marketAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.streamingMarket(marketAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedExitsAccounts(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedPricesAccounts(connectedAddress),
          }),
        ])
        setStatus('success')
        return true
      } catch (caughtError) {
        setStatus('error')
        setError(
          formatTransactionError(caughtError, ACTION_FALLBACKS[nextAction]),
        )
        setPositionAddress(null)
        return false
      } finally {
        pendingRef.current = false
      }
    },
    [client, queryClient, sendTransaction, session],
  )

  const pausePosition = useCallback(
    (request: { marketAddress: Address; tradePositionAddress: Address }) =>
      controlPosition({ ...request, action: 'pause' }),
    [controlPosition],
  )
  const resumePosition = useCallback(
    (request: { marketAddress: Address; tradePositionAddress: Address }) =>
      controlPosition({ ...request, action: 'resume' }),
    [controlPosition],
  )
  const withdrawSwapped = useCallback(
    (request: { marketAddress: Address; tradePositionAddress: Address }) =>
      controlPosition({ ...request, action: 'withdraw' }),
    [controlPosition],
  )

  const reset = useCallback(() => {
    sendTransaction.reset()
    setAction(null)
    setStatus('idle')
    setError(null)
    setSignature(null)
    setPositionAddress(null)
  }, [sendTransaction])

  const isPending = status === 'building' || status === 'submitting'
  const isPendingAction = useCallback(
    (tradePositionAddress: Address, expectedAction: PositionControlAction) =>
      isPending &&
      action === expectedAction &&
      positionAddress === tradePositionAddress.toString(),
    [action, isPending, positionAddress],
  )

  return {
    action,
    error,
    isPending,
    isPendingAction,
    pausePosition,
    reset,
    resumePosition,
    signature,
    status,
    withdrawSwapped,
  }
}
