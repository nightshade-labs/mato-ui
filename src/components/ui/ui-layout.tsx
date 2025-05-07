"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ReactNode, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "./toast";
import { BookText, Menu, X } from "lucide-react";
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
import { LogoIcon } from "../logo";

export function UiLayout({
  children,
  links,
}: {
  children: ReactNode;
  links: { label: string; path: string }[];
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation links as shadcn buttons
  const NavLinks = (
    <>
      {links.map(({ label, path }) => (
        <Button
          key={path}
          asChild
          variant={pathname.startsWith(path) ? "secondary" : "ghost"}
          className="font-bold px-4 py-2 rounded-lg"
        >
          <Link href={path}>{label}</Link>
        </Button>
      ))}
    </>
  );

  return (
    <div className="w-full bg-[url(/bg.png)] min-h-screen flex flex-col bg-no-repeat bg-cover overflow-hidden ">
      {/* Desktop Navbar */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 w-full min-h-16 border-b border-[#0A352B] bg-[#102924]">
        <div className="flex items-center gap-8">
          <Link href="/" className="mr-2">
            <LogoIcon />
          </Link>
          <div className="flex gap-2">{NavLinks}</div>
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
      {/* Mobile Navbar */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 w-full min-h-16 border-b border-[#0A352B] bg-[#102924]">
        <Link href="/">
          <LogoIcon />
        </Link>
        <div className="flex items-center gap-2">
          <WalletButton />
          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed top-0 left-0 w-full h-full bg-black/60 z-40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 w-2/3 max-w-xs h-full bg-[#102924] shadow-lg flex flex-col gap-4 p-6 border-l border-[#0A352B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <LogoIcon />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </Button>
            </div>
            <div className="flex flex-col gap-2">{NavLinks}</div>
          </div>
        </div>
      )}
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
