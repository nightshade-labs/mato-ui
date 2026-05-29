import { useBalance, useWalletSession } from '@solana/react-hooks'

export function useWalletSolBalance() {
  const session = useWalletSession()
  const owner = session?.account.address ?? null
  const nativeBalance = useBalance(owner ?? undefined)
  const nativeBalanceWithRefresh = nativeBalance as typeof nativeBalance & {
    refresh?: () => Promise<unknown>
  }

  const refresh = async () => {
    await nativeBalanceWithRefresh.refresh?.()
  }

  return {
    isReady: session !== undefined,
    lamports: nativeBalance.lamports ?? null,
    loading: nativeBalance.fetching,
    refresh,
  }
}
