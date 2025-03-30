'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center mx-8">
        <Link href="/" className="sm:flex hidden items-center space-x-2">
          <span className="text-2xl font-bold text-primary">Mato</span>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-4">
          <Link
            href="#features"
            className="text-sm font-medium hover:underline"
            onClick={(e) => scrollToSection(e, 'features')}
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium hover:underline"
            onClick={(e) => scrollToSection(e, 'how-it-works')}
          >
            How It Works
          </Link>
          <Button asChild variant="outline">
            <Link href="/swap">Launch App</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
