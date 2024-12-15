"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ellipsify } from "../ui/ui-layout";
import { useCluster } from "../cluster/cluster-data-access";
import { ExplorerLink } from "../cluster/cluster-ui";
import {
  useGetBalance,
  useGetSignatures,
  useGetTokenAccounts,
  useRequestAirdrop,
  useTransferSol,
} from "./account-data-access";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { LoadingSpinner } from "../ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

export function AccountBalance({ address }: { address: PublicKey }) {
  const query = useGetBalance({ address });

  return (
    <div>
      <h1
        className="text-5xl font-bold cursor-pointer"
        onClick={() => query.refetch()}
      >
        {query.data ? <BalanceSol balance={query.data} /> : "..."} SOL
      </h1>
    </div>
  );
}
export function AccountChecker() {
  const { publicKey } = useWallet();
  if (!publicKey) {
    return null;
  }
  return <AccountBalanceCheck address={publicKey} />;
}
export function AccountBalanceCheck({ address }: { address: PublicKey }) {
  const { cluster } = useCluster();
  const mutation = useRequestAirdrop({ address });
  const query = useGetBalance({ address });

  if (query.isLoading) {
    return null;
  }
  if (query.isError || !query.data) {
    return (
      <Alert className="flex justify-center rounded-none bg-destructive">
        <div className="flex gap-4">
          <MagicWandIcon className="h-4 w-4" />
          <div>
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              <span>
                You are connected to <strong>{cluster.name}</strong> but your
                account is not found on this cluster.
              </span>
            </AlertDescription>
            <Button
              size={"sm"}
              onClick={() =>
                mutation.mutateAsync(1).catch((err) => console.log(err))
              }
            >
              Request Airdrop
            </Button>
          </div>
        </div>
      </Alert>
    );
  }
  return null;
}

export function AccountButtons({ address }: { address: PublicKey }) {
  const { cluster } = useCluster();

  return (
    <div className="space-x-2">
      <ModalAirdrop
        address={address}
        disabled={cluster.network?.includes("mainnet")}
      />
      <ModalReceive address={address} />
      <ModalSend address={address} />
    </div>
  );
}

export function AccountTokens({ address }: { address: PublicKey }) {
  const [showAll, setShowAll] = useState(false);
  const query = useGetTokenAccounts({ address });
  const client = useQueryClient();
  const items = useMemo(() => {
    if (showAll) return query.data;
    return query.data?.slice(0, 5);
  }, [query.data, showAll]);

  return (
    <div className="space-y-2 min-w-[400px] max-w-[800px]">
      <div className="justify-between">
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold">Token Accounts</h2>
          <div className="space-x-2">
            {query.isLoading ? (
              <LoadingSpinner />
            ) : (
              <Button
                variant={"outline"}
                onClick={async () => {
                  await query.refetch();
                  await client.invalidateQueries({
                    queryKey: ["getTokenAccountBalance"],
                  });
                }}
              >
                <IconRefresh size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
      {query.isError && (
        <Alert>
          <AlertTitle> Error: {query.error?.message.toString()}</AlertTitle>
        </Alert>
      )}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>No token accounts found.</div>
          ) : (
            <Table>
              <TableCaption>A list of your token accounts.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Public Key</TableHead>
                  <TableHead>Mint</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map(({ account, pubkey }) => (
                  <TableRow key={pubkey.toString()}>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink
                            label={ellipsify(pubkey.toString())}
                            path={`account/${pubkey.toString()}`}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink
                            label={ellipsify(account.data.parsed.info.mint)}
                            path={`account/${account.data.parsed.info.mint.toString()}`}
                          />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">
                        {account.data.parsed.info.tokenAmount.uiAmount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

export function AccountTransactions({ address }: { address: PublicKey }) {
  const query = useGetSignatures({ address });
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    if (showAll) return query.data;
    return query.data?.slice(0, 5);
  }, [query.data, showAll]);

  return (
    <div className="space-y-2 min-w-[400px] max-w-[800px]">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <div className="space-x-2">
          {query.isLoading ? (
            <LoadingSpinner />
          ) : (
            <Button
              variant={"outline"}
              size={"sm"}
              onClick={() => query.refetch()}
            >
              <IconRefresh size={16} />
            </Button>
          )}
        </div>
      </div>
      {query.isError && (
        <Alert>
          <AlertTitle> Error: {query.error?.message.toString()}</AlertTitle>
        </Alert>
      )}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div>No transactions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signature</TableHead>
                  <TableHead className="text-right">Slot</TableHead>
                  <TableHead>Block Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.signature}>
                    <TableCell className="font-mono font-bold">
                      <ExplorerLink
                        path={`tx/${item.signature}`}
                        label={ellipsify(item.signature, 8)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      <ExplorerLink
                        path={`block/${item.slot}`}
                        label={item.slot.toString()}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date((item.blockTime ?? 0) * 1000).toISOString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.err ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge>Success</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(query.data?.length ?? 0) > 5 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Button
                        variant={"outline"}
                        size={"sm"}
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? "Show Less" : "Show All"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

function BalanceSol({ balance }: { balance: number }) {
  return (
    <span>{Math.round((balance / LAMPORTS_PER_SOL) * 100000) / 100000}</span>
  );
}

function ModalReceive({ address }: { address: PublicKey }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="py-6">
          Receive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive</DialogTitle>
          <DialogDescription>
            Receive assets by sending them to your public key:
            <code>{address.toString()}</code>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function ModalAirdrop({
  disabled,
  address,
}: {
  disabled: boolean | undefined;
  address: PublicKey;
}) {
  const mutation = useRequestAirdrop({ address });
  const [amount, setAmount] = useState("2");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="inline">
      <Button
        variant="outline"
        className="py-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        Airdrop
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Airdrop tokens to your wallet</DialogTitle>
          </DialogHeader>
          <input
            disabled={mutation.isPending}
            type="number"
            step="any"
            min="1"
            placeholder="Amount"
            className="input input-bordered w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <DialogFooter className="sm:justify-end">
            <Button
              disabled={disabled || mutation.isPending}
              type="button"
              variant="default"
              onClick={() =>
                mutation
                  .mutateAsync(parseFloat(amount))
                  .then(() => setIsOpen(false))
              }
            >
              Request Airdrop
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModalSend({ address }: { address: PublicKey }) {
  const wallet = useWallet();
  const mutation = useTransferSol({ address });
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("1");
  const [isOpen, setIsOpen] = useState(false);

  if (!address || !wallet.sendTransaction) {
    return <div>Wallet not connected</div>;
  }

  return (
    <div className="inline">
      <Button
        variant="outline"
        className="py-6"
        onClick={() => setIsOpen(!isOpen)}
      >
        Send
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send</DialogTitle>
          </DialogHeader>
          <input
            disabled={mutation.isPending}
            type="text"
            placeholder="Destination"
            className="input input-bordered w-full"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <input
            disabled={mutation.isPending}
            type="number"
            step="any"
            min="1"
            placeholder="Amount"
            className="input input-bordered w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <DialogFooter className="sm:justify-end">
            <Button
              disabled={!destination || !amount || mutation.isPending}
              type="button"
              variant="default"
              onClick={() => {
                mutation
                  .mutateAsync({
                    destination: new PublicKey(destination),
                    amount: parseFloat(amount),
                  })
                  .then(() => setIsOpen(false));
              }}
            >
              Send
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
