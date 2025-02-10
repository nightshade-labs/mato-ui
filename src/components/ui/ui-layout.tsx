"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "./toast";
import { BookText } from "lucide-react";
import { AccountChecker } from "../account/account-ui";
import {
  ClusterChecker,
  ClusterUiSelect,
  ExplorerLink,
} from "../cluster/cluster-ui";
import { WalletButton } from "../solana/solana-provider";
import { Button } from "./button";
import { LoadingSpinner } from "./loading-spinner";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function UiLayout({
  children,
  links,
}: {
  children: ReactNode;
  links: { label: string; path: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="w-full min-h-screen flex flex-col bg-gradient-to-b from-purple-500/10 to-red-500/10">
      <div className="flex items-center p-2 w-full min-h-16 flex-col md:flex-row space-y-2 md:space-y-0">
        <div className="flex-1 flex items-center">
          <Button variant="ghost" asChild>
            <Link className="text-xl mr-8" href="/">
              <div className="flex items-center gap-2">
                {/* <div className="w-8 h-8 rounded-full bg-red-500" /> */}
                <span className="text-2xl font-bold text-primary">Mato</span>
              </div>
            </Link>
          </Button>
          <NavigationMenu>
            <NavigationMenuList className="gap-4">
              {links.map(({ label, path }) => (
                <NavigationMenuItem
                  key={path}
                  className={pathname.startsWith(path) ? "underline" : ""}
                >
                  <Link href={path} legacyBehavior passHref>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                    >
                      {label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex-none space-x-2 flex items-center mx-8">
          <WalletButton />
          {/* <ClusterUiSelect /> */}
        </div>
      </div>
      <ClusterChecker>
        <AccountChecker />
      </ClusterChecker>
      <div className="flex-grow mx-4">
        <Suspense
          fallback={
            <div className="text-center my-32">
              <LoadingSpinner />
            </div>
          }
        >
          {children}
        </Suspense>
        <Toaster />
      </div>
      {/* <footer className="text-center p-4 bg-red-100 w-full">
        <aside>
          <Link
            className="text-xl mr-8"
            target="_blank"
            rel="noopener noreferrer"
            href="https://eki-solana.github.io/docs/"
          >
            <div className="flex gap-2 w-full justify-center items-center">
              Docs <BookText className="h-4 md:h-6" />
            </div>
          </Link>
        </aside>
      </footer> */}
    </div>
  );
}

export function AppHero({
  children,
  title,
  subtitle,
}: {
  children?: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <div className="grid w-full place-items-center bg-cover bg-center py-[64px]">
      <div className="flex items-center justify-center gap-4 p-4 z-0 text-center">
        <div className="max-w-2xl">
          {typeof title === "string" ? (
            <h1 className="text-5xl font-bold">{title}</h1>
          ) : (
            title
          )}
          {typeof subtitle === "string" ? (
            <p className="py-6">{subtitle}</p>
          ) : (
            subtitle
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ellipsify(str = "", len = 4) {
  if (str.length > 30) {
    return (
      str.substring(0, len) + ".." + str.substring(str.length - len, str.length)
    );
  }
  return str;
}

export function useTransactionToast() {
  const { toast } = useToast();
  return (signature: string, description: string) => {
    toast({
      title: "Transaction sent",
      description: description,
      action: (
        <ToastAction altText="Transaction Signature">
          <ExplorerLink path={`tx/${signature}`} label={"View Transaction"} />
        </ToastAction>
      ),
    });
  };
}
