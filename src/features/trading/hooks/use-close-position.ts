import { useCallback, useState } from 'react'
import {
  useSendTransaction,
  useSolanaClient,
  useWalletSession,
} from '@solana/react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { sendClosePosition, sendClosePositions } from '../api/twob-client'
import { formatTransactionError } from '../lib/transaction-errors'
import { tradingQueryKeys } from '../query-keys'
import type { Address } from '@solana/kit'

type ClosePositionStatus =
  | 'idle'
  | 'building'
  | 'submitting'
  | 'success'
  | 'error'

export function useClosePosition() {
  const client = useSolanaClient()
  const session = useWalletSession()
  const sendTransaction = useSendTransaction()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ClosePositionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [closedCount, setClosedCount] = useState(0)
  const [closingPositionAddresses, setClosingPositionAddresses] = useState<
    Array<string>
  >([])

  const closePosition = useCallback(
    async ({
      marketAddress,
      tradePositionAddress,
    }: {
      marketAddress: Address
      tradePositionAddress: Address
    }) => {
      if (!session) {
        setStatus('error')
        setError('Connect a wallet to close a position.')
        setClosingPositionAddresses([])
        return false
      }

      setStatus('building')
      setError(null)
      setSignature(null)
      setClosedCount(0)
      setClosingPositionAddresses([tradePositionAddress.toString()])

      try {
        setStatus('submitting')
        const serializedSignature = await sendClosePosition({
          client,
          request: {
            marketAddress,
            tradePositionAddress,
          },
          sendTransaction,
          session,
        })
        setStatus('success')
        setSignature(serializedSignature)
        setClosedCount(1)
        const connectedAddress = session.account.address.toString()
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.tradePositions(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.closedPositions(
              connectedAddress,
              undefined,
              50,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedExitsAccounts(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedPricesAccounts(connectedAddress),
          }),
        ])
        return true
      } catch (caughtError) {
        setStatus('error')
        setError(
          formatTransactionError(caughtError, 'Failed to close position.'),
        )
        setClosingPositionAddresses([])
        return false
      }
    },
    [client, queryClient, sendTransaction, session],
  )

  const closePositions = useCallback(
    async ({
      marketAddress,
      tradePositionAddresses,
    }: {
      marketAddress: Address
      tradePositionAddresses: Array<Address>
    }) => {
      if (!session) {
        setStatus('error')
        setError('Connect a wallet to close positions.')
        setClosingPositionAddresses([])
        return false
      }
      if (tradePositionAddresses.length === 0) {
        setStatus('error')
        setError('Select at least one position to close.')
        setClosingPositionAddresses([])
        return false
      }

      setStatus('building')
      setError(null)
      setSignature(null)
      setClosedCount(0)
      setClosingPositionAddresses(
        tradePositionAddresses.map((address) => address.toString()),
      )

      try {
        setStatus('submitting')
        const serializedSignature = await sendClosePositions({
          client,
          request: {
            marketAddress,
            tradePositionAddresses,
          },
          sendTransaction,
          session,
        })
        setStatus('success')
        setSignature(serializedSignature)
        setClosedCount(tradePositionAddresses.length)
        const connectedAddress = session.account.address.toString()
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.tradePositions(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.closedPositions(
              connectedAddress,
              undefined,
              50,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedExitsAccounts(connectedAddress),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.ownedPricesAccounts(connectedAddress),
          }),
        ])
        return true
      } catch (caughtError) {
        setStatus('error')
        setError(
          formatTransactionError(caughtError, 'Failed to close positions.'),
        )
        setClosingPositionAddresses([])
        return false
      }
    },
    [client, queryClient, sendTransaction, session],
  )

  const reset = useCallback(() => {
    sendTransaction.reset()
    setStatus('idle')
    setError(null)
    setSignature(null)
    setClosedCount(0)
    setClosingPositionAddresses([])
  }, [sendTransaction])

  const isClosing = status === 'building' || status === 'submitting'
  const isClosingPosition = useCallback(
    (tradePositionAddress: Address) =>
      isClosing &&
      closingPositionAddresses.includes(tradePositionAddress.toString()),
    [closingPositionAddresses, isClosing],
  )

  return {
    closePosition,
    closePositions,
    closedCount,
    error,
    isClosing,
    isClosingPosition,
    reset,
    signature,
    status,
  }
}
