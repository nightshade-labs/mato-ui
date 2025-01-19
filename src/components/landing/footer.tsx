import Link from "next/link";
import { FaXTwitter } from "react-icons/fa6";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 px-4 sm:px-8">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold">Mato</span>
          </Link>
          <p className="text-center text-sm leading-loose md:text-left">
            Built on Solana.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://x.com/MatoExchange"
            className="text-md"
          >
            <FaXTwitter size={20} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
