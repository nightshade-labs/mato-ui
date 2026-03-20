import { useCallback, useState } from 'react'
import { WRAPPED_SOL_MINT } from '@solana/client'
import { type Address } from '@solana/kit'
import { useSolanaClient, useWalletSession } from '@solana/react-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { sendSubmitOrder } from '../api/twob-client'
import { formatTransactionError } from '../lib/transaction-errors'
import { tradingQueryKeys } from '../query-keys'

type SubmitOrderStatus = 'idle' | 'building' | 'wrapping' | 'submitting' | 'success' | 'error'

export function useSubmitOrder() {
  const client = useSolanaClient()
  const session = useWalletSession()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<SubmitOrderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  const submitOrder = useCallback(
    async ({
      amount,
      durationSlots,
      id,
      isBuy,
      marketAddress,
      existingWrappedAtoms = 0n,
      inputMintAddress,
    }: {
      amount: bigint
      durationSlots: number
      existingWrappedAtoms?: bigint
      id: bigint
      inputMintAddress: string
      isBuy: boolean
      marketAddress: Address
    }) => {
      if (!session) {
        setStatus('error')
        setError('Connect a wallet to submit an order.')
        return false
      }

      setStatus('building')
      setError(null)
      setSignature(null)

      try {
        if (inputMintAddress === WRAPPED_SOL_MINT && amount > existingWrappedAtoms) {
          setStatus('wrapping')
        }

        const serializedSignature = await sendSubmitOrder({
          client,
          onBeforeSend: () => setStatus('submitting'),
          request: {
            amount,
            durationSlots,
            existingWrappedAtoms,
            id,
            inputMintAddress,
            isBuy,
            marketAddress,
          },
          session,
        })
        setStatus('success')
        setSignature(serializedSignature)
        void queryClient.invalidateQueries({
          queryKey: tradingQueryKeys.tradePositions(session.account.address.toString()),
        })
        return true
      } catch (error) {
        setStatus('error')
        setError(formatTransactionError(error, 'Failed to submit order.'))
        return false
      }
    },
    [client, queryClient, session],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setSignature(null)
  }, [])

  return {
    error,
    isSubmitting: status === 'building' || status === 'wrapping' || status === 'submitting',
    reset,
    signature,
    status,
    submitOrder,
  }
}
