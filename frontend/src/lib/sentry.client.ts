/**
 * Sentry Error Tracking
 *
 * Install: npm install @sentry/nextjs
 * Run:     npx @sentry/wizard@latest -i nextjs
 * Env var: NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
 *
 * This file initializes Sentry on the client side.
 * Sentry auto-captures JS errors, React errors, and network failures.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample 100% of errors in dev, 20% of traces in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Replay 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate:  1.0,

  environment: process.env.NODE_ENV,

  // Ignore known benign errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^ChunkLoadError/,
  ],

  beforeSend(event) {
    // Strip wallet private keys from error context (should never appear but safety first)
    if (event.extra && JSON.stringify(event.extra).includes('privateKey')) {
      return null;
    }
    return event;
  },
});
