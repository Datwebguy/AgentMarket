/**
 * Agent Code Runner
 *
 * Executes platform-hosted agent code in an isolated Node vm context.
 *
 * Root-cause of "fetch failed": Node's native fetch + Response use V8-internal
 * bindings that do NOT cross vm context boundaries. The fix is a safeFetch
 * wrapper that performs all I/O in the OUTER context and returns plain JS
 * objects back into the sandbox — no native objects ever enter the VM.
 */

import vm from 'vm';

const EXEC_TIMEOUT_MS  = 25_000; // hard wall-clock limit per call
const FETCH_TIMEOUT_MS = 12_000; // per-request HTTP timeout

/**
 * Build a fetch-compatible wrapper that runs entirely in the outer context.
 * The VM only ever sees plain { ok, status, json(), text() } objects.
 */
function makeSafeFetch() {
  return async function safeFetch(url: string, init?: Record<string, unknown>) {
    if (!url || typeof url !== 'string') {
      throw new Error('fetch: url must be a non-empty string');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await globalThis.fetch(url, {
        ...(init || {}),
        signal: controller.signal as AbortSignal,
      } as RequestInit);
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? `fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`
        : `fetch error: ${err?.message || String(err)}`;
      console.error('[runner] safeFetch network error:', msg);
      throw new Error(msg);
    } finally {
      clearTimeout(timer);
    }

    // Read the body HERE, in the outer context — critical to avoid cross-context crash
    let bodyText: string;
    try {
      bodyText = await res.text();
    } catch (err: any) {
      throw new Error(`fetch body read error: ${err?.message || String(err)}`);
    }

    // Return a plain object — safe to pass into the VM sandbox
    return {
      ok:         res.ok,
      status:     res.status,
      statusText: res.statusText,
      headers:    {
        get:     (key: string) => res.headers.get(key),
        has:     (key: string) => res.headers.has(key),
      },
      text: async () => bodyText,
      json: async () => {
        try {
          return JSON.parse(bodyText);
        } catch {
          throw new Error(`fetch: response is not valid JSON (status ${res.status}): ${bodyText.slice(0, 200)}`);
        }
      },
    };
  };
}

export async function runAgentCode(
  code: string,
  input: Record<string, unknown>
): Promise<unknown> {

  const safeFetch = makeSafeFetch();

  // Sandbox: explicit allow-list — no fs, process, require, or native globals
  const sandbox: Record<string, unknown> = {
    // Injected by caller
    input,
    result: undefined,

    // Network (wrapped — safe across vm boundary)
    fetch: safeFetch,

    // Logging (proxied to outer console so it shows in Railway logs)
    console: {
      log:   (...a: unknown[]) => console.log('[agent]',   ...a),
      error: (...a: unknown[]) => console.error('[agent]', ...a),
      warn:  (...a: unknown[]) => console.warn('[agent]',  ...a),
      info:  (...a: unknown[]) => console.info('[agent]',  ...a),
    },

    // Required for async/await to resolve correctly inside the VM
    Promise,

    // Standard globals that agent code legitimately needs
    JSON,
    Math,
    Date,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    TypeError,
    RegExp,
    Map,
    Set,
    encodeURIComponent,
    decodeURIComponent,

    // Timers — capped so agents can't block indefinitely
    setTimeout:  (fn: () => void, ms: number) => setTimeout(fn, Math.min(ms, 10_000)),
    clearTimeout,
  };

  // Wrap builder's code: they define `async function run(input)`,
  // we call it and capture the return value into `result`.
  const wrapped = `
(async () => {
  ${code}
  if (typeof run !== 'function') {
    throw new Error('Agent must export: async function run(input) { ... }');
  }
  result = await run(input);
})();
`.trim();

  const context = vm.createContext(sandbox);
  const script  = new vm.Script(wrapped, { filename: 'agent.js' });

  // NOTE: do NOT pass { timeout } to runInContext for async code —
  // the vm timeout only covers synchronous work and fires false positives
  // on async agents. We handle the wall-clock limit with Promise.race below.
  let execPromise: Promise<void>;
  try {
    execPromise = script.runInContext(context) as Promise<void>;
  } catch (syncErr: any) {
    // Synchronous parse / compile error in the agent code
    console.error('[runner] Agent compile error:', syncErr?.message);
    throw new Error(`Agent compile error: ${syncErr?.message || String(syncErr)}`);
  }

  // Hard wall-clock limit for the full async execution
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Agent timed out after ${EXEC_TIMEOUT_MS / 1000}s`)),
      EXEC_TIMEOUT_MS
    )
  );

  try {
    await Promise.race([execPromise, timeoutPromise]);
  } catch (err: any) {
    console.error('[runner] Agent execution error:', err?.message, err?.stack);
    throw new Error(`Agent execution failed: ${err?.message || String(err)}`);
  }

  return sandbox.result;
}
