// import "./globals.css";
import { ClusterProvider } from "@/components/cluster/cluster-data-access";
import { SolanaProvider } from "@/components/solana/solana-provider";
import { UiLayout } from "@/components/ui/ui-layout";

const links: { label: string; path: string }[] = [
  { label: "Swap", path: "/swap" },
  { label: "Transactions", path: "/positions" },
];

export default function MatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClusterProvider>
          <SolanaProvider>
            <UiLayout links={links}>{children}</UiLayout>
          </SolanaProvider>
        </ClusterProvider>
      </body>
    </html>
  );
}
