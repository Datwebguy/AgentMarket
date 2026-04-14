/**
 * Plausible Analytics
 *
 * Privacy-friendly, no cookies, GDPR compliant.
 * Free for up to 10k monthly pageviews.
 * https://plausible.io
 *
 * Setup:
 * 1. Create account at plausible.io
 * 2. Add your domain
 * 3. Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN in .env
 * 4. Add <Analytics /> to your root layout
 */

'use client';

import Script from 'next/script';

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!domain || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}

/**
 * Track custom events — call anywhere in client components
 *
 * Usage:
 *   trackEvent('agent_call_initiated', { agentId: '...', priceUsdc: '0.002' });
 *   trackEvent('agent_deployed');
 *   trackEvent('wallet_connected');
 */
export function trackEvent(name: string, props?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  if (!(window as any).plausible) return;
  (window as any).plausible(name, { props });
}
