import { Link } from '@tanstack/react-router'

export function Navbar({ children }: { children?: React.ReactNode }) {
  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/8 bg-[color:var(--color-page-bg)]/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="text-xl" role="img" aria-label="Mato logo">
            🍅
          </span>
          <span className="text-base font-semibold tracking-tight">mato</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <Link
            to="/"
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            activeProps={{
              className:
                'rounded-lg px-3 py-1.5 text-sm text-foreground bg-white/5 transition-colors',
            }}
          >
            Trade
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">{children}</div>
    </nav>
  )
}
