'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';
import { injected, walletConnect } from 'wagmi/connectors';
import { useState } from 'react';

// Define X Layer as a custom chain
const xLayer = defineChain({
  id:   196,
  name: 'X Layer',
  nativeCurrency: {
    decimals: 18,
    name:     'OKB',
    symbol:   'OKB',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'OKLink',
      url:  'https://www.oklink.com/xlayer',
    },
  },
});

const xLayerTestnet = defineChain({
  id:   195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    decimals: 18,
    name:     'OKB',
    symbol:   'OKB',
  },
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech'],
    },
  },
});

const wagmiConfig = createConfig({
  chains:     [xLayer, xLayerTestnet, mainnet],
  connectors: [
    injected(),
    // Add WalletConnect if you have a project ID:
    // walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: {
    [xLayer.id]:        http(),
    [xLayerTestnet.id]: http(),
    [mainnet.id]:       http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
