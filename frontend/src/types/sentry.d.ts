// Stub declaration for optional @sentry/nextjs dependency
declare module '@sentry/nextjs' {
  export function init(options: Record<string, unknown>): void;
  export function captureException(err: unknown): void;
  export function captureMessage(msg: string): void;
}
