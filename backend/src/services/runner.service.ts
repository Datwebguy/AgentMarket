/**
 * Agent Code Runner
 *
 * Executes platform-hosted agent code in an isolated Node vm context.
 *
 * Key design decision: we do NOT use globalThis.fetch inside safeFetch.
 * Node's native fetch (undici) throws "fetch failed" on many Railway/Docker
 * environments due to SSL / network-stack issues. Instead we use axios,
 * which relies on Node's battle-tested http/https modules and works
 * reliably in every hosted environment.
 *
 * The safeFetch wrapper runs entirely in the OUTER context and returns a
 * plain JS object into the sandbox — no native V8-bound objects ever
 * cross the vm context boundary.
 */

import vm    from 'vm';
import axios from 'axios';

const EXEC_TIMEOUT_MS  = 25_000;
const FETCH_TIMEOUT_MS = 12_000;

function makeSafeFetch() {
  return async function safeFetch(
    url:  string,
    init?: Record<string, unknown>
  ): Promise<{
    ok: boolean; status: number; statusText: string;
    headers: { get: (k: string) => string | null; has: (k: string) => boolean };
    text: () => Promise<string>;
    json: () => Promise<unknown>;
  }> {
    if (!url || typeof url !== 'string') {
      throw new Error('fetch: url must be a non-empty string');
    }

    // Build axios-compatible options from the fetch-style init object
    const method  = ((init?.method as string) || 'GET').toUpperCase();
    const headers = (init?.headers as Record<string, string>) || {};
    const body    = init?.body;

    console.log(`[runner] fetch → ${method} ${url}`);

    let bodyText: string;
    let status:   number;
    let statusText: string;
    let resHeaders: Record<string, string>;

    try {
      const response = await axios.request<string>({
        url,
        method:          method as any,
        headers:         { 'Accept': 'application/json', ...headers },
        data:            body,
        timeout:         FETCH_TIMEOUT_MS,
        responseType:    'text',          // always get raw text so we control parsing
        validateStatus:  () => true,      // never throw on HTTP error status
        maxRedirects:    5,
      });

      bodyText   = response.data as string;
      status     = response.status;
      statusText = response.statusText;
      resHeaders = Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [k, String(v)])
      );

      console.log(`[runner] fetch ← ${status} ${url} (${bodyText.length} bytes)`);
    } catch (err: any) {
      // axios throws only on network-level failures (timeout, DNS, refused)
      const msg = err?.code === 'ECONNABORTED'
        ? `fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`
        : err?.code === 'ECONNREFUSED'
          ? `fetch: connection refused: ${url}`
          : err?.code === 'ENOTFOUND'
            ? `fetch: DNS lookup failed: ${url}`
            : `fetch: ${err?.message || String(err)}`;

      console.error('[runner] fetch network error:', msg);
      throw new Error(msg);
    }

    const ok = status >= 200 && status < 300;

    // Return a plain object — safe to hand into the VM sandbox
    return {
      ok,
      status,
      statusText,
      headers: {
        get: (key: string) => resHeaders[key.toLowerCase()] ?? null,
        has: (key: string) => key.toLowerCase() in resHeaders,
      },
      text: async () => bodyText,
      json: async () => {
        try {
          return JSON.parse(bodyText);
        } catch {
          throw new Error(
            `fetch: response is not valid JSON (status ${status}): ${bodyText.slice(0, 300)}`
          );
        }
      },
    };
  };
}

export async function runAgentCode(
  code:  string,
  input: Record<string, unknown>
): Promise<unknown> {

  const sandbox: Record<string, unknown> = {
    input,
    result: undefined,

    // Network — axios-backed, runs entirely outside VM context
    fetch: makeSafeFetch(),

    // Console — proxied to outer process (visible in Railway logs)
    console: {
      log:   (...a: unknown[]) => console.log('[agent]',   ...a),
      error: (...a: unknown[]) => console.error('[agent]', ...a),
      warn:  (...a: unknown[]) => console.warn('[agent]',  ...a),
      info:  (...a: unknown[]) => console.info('[agent]',  ...a),
    },

    // Promise MUST be in the sandbox for async/await to resolve in VM
    Promise,

    // Standard globals
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
    RangeError,
    RegExp,
    Map,
    Set,
    encodeURIComponent,
    decodeURIComponent,

    // Timers — capped so agents can't stall forever
    setTimeout:  (fn: () => void, ms: number) => setTimeout(fn, Math.min(ms, 10_000)),
    clearTimeout,
  };

  // Builder writes `async function run(input) { ... }`
  // We wrap and call it, capturing the return value in `result`
  const wrapped = `
(async () => {
  ${code}
  if (typeof run !== 'function') {
    throw new Error('Agent must define: async function run(input) { ... }');
  }
  result = await run(input);
})();
`.trim();

  const context = vm.createContext(sandbox);

  let execPromise: Promise<void>;
  try {
    const script = new vm.Script(wrapped, { filename: 'agent.js' });
    // No { timeout } here — vm timeout only covers synchronous work and
    // fires false positives for async agents. Use Promise.race instead.
    execPromise = script.runInContext(context) as Promise<void>;
  } catch (syncErr: any) {
    console.error('[runner] Agent compile/syntax error:', syncErr?.message);
    throw new Error(`Agent syntax error: ${syncErr?.message || String(syncErr)}`);
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Agent timed out after ${EXEC_TIMEOUT_MS / 1000}s`)),
      EXEC_TIMEOUT_MS
    )
  );

  try {
    await Promise.race([execPromise, timeoutPromise]);
  } catch (err: any) {
    console.error('[runner] Agent runtime error:', err?.message);
    // Re-throw without double-wrapping
    throw err;
  }

  return sandbox.result;
}
