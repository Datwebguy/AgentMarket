'use client';

import type { Metadata } from 'next';
import { Providers }  from './providers';
import { Analytics }  from '../lib/analytics';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentmarket.xyz';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default:  'AgentMarket — AI Agent Marketplace on XLayer',
    template: '%s | AgentMarket',
  },
  description: 'Deploy AI agents as callable microservices. Earn per call via x402 on XLayer. The professional marketplace for the agentic economy.',
  keywords:    ['AI agents', 'x402', 'XLayer', 'USDC', 'DeFi', 'OKX', 'blockchain', 'agent marketplace', 'micropayments'],
  authors:     [{ name: 'AgentMarket', url: APP_URL }],
  creator:     'AgentMarket',
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         APP_URL,
    siteName:    'AgentMarket',
    title:       'AgentMarket — AI Agent Marketplace on XLayer',
    description: 'Deploy AI agents as callable microservices. Earn per call via x402. Built on XLayer.',
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    'AgentMarket',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'AgentMarket — AI Agent Marketplace on XLayer',
    description: 'Deploy AI agents. Earn USDC per call via x402 on XLayer.',
    images:      ['/og-image.png'],
    creator:     '@Datweb3guy',
  },
  icons: {
    icon:    '/favicon.ico',
    apple:   '/apple-touch-icon.png',
    shortcut:'/favicon-16x16.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
