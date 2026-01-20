import { useState } from "react";
import {
  useConnectWallet,
  useDisconnectWallet,
  useWallet,
  useWalletConnection,
} from "@solana/react-hooks";


function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const wallet = useWallet();
  const { connectors } = useWalletConnection();
  const connectWallet = useConnectWallet();
  const disconnectWallet = useDisconnectWallet();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isConnected = wallet.status === "connected";
  const address = isConnected
    ? wallet.session.account.address.toString()
    : null;

  async function handleConnect(connectorId: string) {
    setError(null);
    try {
      await connectWallet(connectorId, { autoConnect: true });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect");
    }
  }

  async function handleDisconnect() {
    setError(null);
    try {
      await disconnectWallet();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to disconnect");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition"
      >
        {address ? (
          <span className="font-mono">{truncate(address)}</span>
        ) : (
          <span>Connect wallet</span>
        )}
        <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute z-10 mt-2 w-full min-w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          {isConnected ? (
            <div className="space-y-3">
              <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Connected</p>
                <p className="font-mono text-sm text-slate-900" title={address ?? ""}>
                  {address ? truncate(address) : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Wallet Standard</p>
              <div className="space-y-1.5">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => void handleConnect(connector.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>{connector.name}</span>
                    <span className="text-xs text-slate-500">Connect</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {error ? (
            <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}