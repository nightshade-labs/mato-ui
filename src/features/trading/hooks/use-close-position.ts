import { useCallback, useState } from 'react'
import type { Address } from '@solana/kit'
import { useSendTransaction, useSolanaClient, useWalletSession } from '@solana/react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { sendClosePosition } from '../api/twob-client'
import { tradingQueryKeys } from '../query-keys'

type ClosePositionStatus = 'idle' | 'building' | 'submitting' | 'success' | 'error'

export function useClosePosition() {
  const client = useSolanaClient()
  const session = useWalletSession()
  const sendTransaction = useSendTransaction()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ClosePositionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

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
        return false
      }

      setStatus('building')
      setError(null)
      setSignature(null)

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
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.tradePositions(session.account.address.toString()),
          }),
          queryClient.invalidateQueries({
            queryKey: tradingQueryKeys.closedPositions(session.account.address.toString(), undefined, 50),
          }),
        ])
        return true
      } catch (error) {
        setStatus('error')
        setError(error instanceof Error ? error.message : 'Failed to close position.')
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
  }, [sendTransaction])

  return {
    closePosition,
    error,
    isClosing: status === 'building' || status === 'submitting',
    reset,
    signature,
    status,
  }
}
