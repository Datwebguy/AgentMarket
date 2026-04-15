/**
 * Sentry Error Tracking
 *
 * To enable: npm install @sentry/nextjs
 * Env var:   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  // Dynamically import Sentry only when DSN is configured and package is installed
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate:  1.0,
      environment: process.env.NODE_ENV,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        /^ChunkLoadError/,
      ],
      beforeSend(event: any) {
        if (event.extra && JSON.stringify(event.extra).includes('privateKey')) {
          return null;
        }
        return event;
      },
    });
  }).catch(() => {
    // @sentry/nextjs not installed — skip silently
  });
}
