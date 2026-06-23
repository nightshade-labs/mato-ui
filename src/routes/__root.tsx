import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { SolanaProvider } from '../integrations/solana'
import { Navbar } from '../components/navbar'
import { RiskDisclaimerDialog } from '../components/risk-disclaimer-dialog'
import { Toaster } from '../components/ui/sonner'
import { WalletConnectionButton } from '../features/trading/components/wallet-connection-button'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Mato',
      },
      {
        name: 'description',
        content: 'Continuous Clearing Auctions',
      },
      {
        property: 'og:title',
        content: 'Mato',
      },
      {
        property: 'og:description',
        content: 'Continuous Clearing Auctions',
      },
      {
        property: 'og:image',
        content: 'https://www.mato.finance/icon-512.png',
      },
      {
        property: 'og:url',
        content: 'https://www.mato.finance',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary',
      },
      {
        name: 'twitter:title',
        content: 'Mato',
      },
      {
        name: 'twitter:description',
        content: 'Continuous Clearing Auctions',
      },
      {
        name: 'twitter:image',
        content: 'https://www.mato.finance/icon-512.png',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/icon-180.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),

  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  return (
    <>
      <Navbar>
        <WalletConnectionButton />
      </Navbar>
      <Outlet />
      <RiskDisclaimerDialog />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <SolanaProvider>
          {children}
          <Toaster position="top-right" />
        </SolanaProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
