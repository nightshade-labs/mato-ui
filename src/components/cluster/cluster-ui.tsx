"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useCluster } from "./cluster-data-access";

import Link from "next/link";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function ExplorerLink({
  path,
  label,
  className,
}: {
  path: string;
  label: string;
  className?: string;
}) {
  const { getExplorerUrl } = useCluster();
  return (
    <Link
      href={getExplorerUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
    </Link>
  );
}

export function ClusterChecker({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const { connection } = useConnection();

  const query = useQuery({
    queryKey: ["version", { cluster, endpoint: connection.rpcEndpoint }],
    queryFn: () => connection.getVersion(),
    retry: 1,
  });
  if (query.isLoading) {
    return null;
  }
  if (query.isError || !query.data) {
    return (
      <div className="alert alert-warning text-warning-content/80 rounded-none flex justify-center">
        <span>
          Error connecting to cluster <strong>{cluster.name}</strong>
        </span>
        <Button size={"sm"} onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>
    );
  }
  return children;
}

export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster();
  return (
    <Select defaultValue={cluster.name}>
      <SelectTrigger className="w-[120px] h-full p-1 bg-red-500 ring-0 focus:ring-0 border-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {clusters.map((item) => (
          <SelectItem key={item.name} value={item.name}>
            <Button variant={"ghost"} onClick={() => setCluster(item)}>
              {item.name}
            </Button>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
