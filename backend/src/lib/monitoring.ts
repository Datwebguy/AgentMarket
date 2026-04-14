/**
 * Backend Monitoring
 *
 * Install: npm install @sentry/node
 * Env var: SENTRY_DSN=https://...@sentry.io/...
 *
 * Initialize at the very top of src/index.ts before anything else:
 *
 * import './lib/monitoring';
 */

import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment:        process.env.NODE_ENV || 'development',
    tracesSampleRate:   process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    beforeSend(event) {
      // Strip sensitive data before sending to Sentry
      const str = JSON.stringify(event);
      if (str.includes('privateKey') || str.includes('JWT_SECRET') || str.includes('OKX_SECRET')) {
        return null;
      }
      return event;
    },
  });
  console.log('✓ Sentry monitoring initialized');
}

/**
 * Track a custom metric or event in Sentry
 */
export function captureMetric(name: string, value: number, tags?: Record<string, string>) {
  Sentry.metrics?.set(name, value, { tags });
}

/**
 * Capture a handled error with context
 */
export function captureError(err: Error, context?: Record<string, unknown>) {
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

export { Sentry };
