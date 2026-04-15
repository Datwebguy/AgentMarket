/**
 * Agent Code Runner
 *
 * Executes platform-hosted agent code in an isolated Node vm context.
 *
 * Network strategy:
 *  - axios with forced IPv4 (Railway containers can fail IPv6 DNS)
 *  - 3 automatic retries with exponential backoff for transient failures
 *  - 10-second per-request timeout
 *  - All I/O runs in outer context; VM only receives plain JS objects
 */

import vm    from 'vm';
import axios from 'axios';
import https from 'https';
import http  from 'http';

const EXEC_TIMEOUT_MS  = 25_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RETRIES      = 3;

// Force IPv4 to prevent Railway/Docker IPv6 DNS failures (ENOTFOUND / EAI_AGAIN)
const httpsAgent = new https.Agent({ family: 4, keepAlive: true });
const httpAgent  = new http.Agent ({  family: 4, keepAlive: true });

async function fetchWithRetry(
  url: string,
  init: Record<string, unknown>
): Promise<{ status: number; statusText: string; bodyText: string; headers: Record<string, string> }> {

  const method  = ((init.method as string) || 'GET').toUpperCase();
  const headers = (init.headers as Record<string, string>) || {};
  const body    = init.body;

  let lastErr: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[runner] fetch attempt ${attempt}/${MAX_RETRIES} → ${method} ${url}`);

      const response = await axios.request<string>({
        url,
        method:         method as any,
        headers:        { Accept: 'application/json, text/plain', ...headers },
        data:           body,
        timeout:        FETCH_TIMEOUT_MS,
        responseType:   'text',
        validateStatus: () => true,   // never throw on HTTP status codes
        maxRedirects:   5,
        httpsAgent,
        httpAgent,
      });

      const bodyText   = response.data as string;
      const resHeaders = Object.fromEntries(
        Object.entries(response.headers).map(([k, v]) => [k, String(v)])
      );

      console.log(`[runner] fetch ← ${response.status} ${url} (${bodyText.length}b)`);
      return { status: response.status, statusText: response.statusText, bodyText, headers: resHeaders };

    } catch (err: any) {
      lastErr = err;

      const code    = err?.code || '';
      const isRetry = ['ECONNRESET','ECONNABORTED','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','ENETUNREACH'].includes(code);

      console.error(`[runner] fetch error attempt ${attempt}: ${code} — ${err?.message}`);

      if (!isRetry || attempt === MAX_RETRIES) break;

      // Exponential back-off: 300ms, 900ms
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }

  // Translate raw network codes into human-readable messages
  const code = (lastErr as any)?.code || '';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    throw new Error(`External API unreachable (DNS): ${url} — please try again in a moment`);
  }
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    throw new Error(`External API timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
  }
  if (code === 'ECONNREFUSED') {
    throw new Error(`External API refused connection: ${url}`);
  }
  throw new Error(`fetch: ${lastErr?.message || String(lastErr)}`);
}

function makeSafeFetch() {
  return async function safeFetch(
    url:   string,
    init?: Record<string, unknown>
  ) {
    if (!url || typeof url !== 'string') throw new Error('fetch: url must be a non-empty string');

    const { status, statusText, bodyText, headers } = await fetchWithRetry(url, init || {});

    return {
      ok:         status >= 200 && status < 300,
      status,
      statusText,
      headers: {
        get: (k: string) => headers[k.toLowerCase()] ?? null,
        has: (k: string) => k.toLowerCase() in headers,
      },
      text: async () => bodyText,
      json: async () => {
        try   { return JSON.parse(bodyText); }
        catch { throw new Error(`Response not valid JSON (status ${status}): ${bodyText.slice(0, 300)}`); }
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
    result:  undefined,
    fetch:   makeSafeFetch(),
    console: {
      log:   (...a: unknown[]) => console.log('[agent]',   ...a),
      error: (...a: unknown[]) => console.error('[agent]', ...a),
      warn:  (...a: unknown[]) => console.warn('[agent]',  ...a),
      info:  (...a: unknown[]) => console.info('[agent]',  ...a),
    },
    Promise,          // required for async/await inside VM
    JSON, Math, Date,
    parseFloat, parseInt, isNaN, isFinite,
    Array, Object, String, Number, Boolean,
    Error, TypeError, RangeError, RegExp,
    Map, Set,
    encodeURIComponent, decodeURIComponent,
    setTimeout:  (fn: () => void, ms: number) => setTimeout(fn, Math.min(ms, 10_000)),
    clearTimeout,
  };

  const wrapped = `
(async () => {
  ${code}
  if (typeof run !== 'function') throw new Error('Agent must define: async function run(input) { ... }');
  result = await run(input);
})();
`.trim();

  const context = vm.createContext(sandbox);

  let execPromise: Promise<void>;
  try {
    execPromise = new vm.Script(wrapped, { filename: 'agent.js' }).runInContext(context) as Promise<void>;
  } catch (syncErr: any) {
    console.error('[runner] compile error:', syncErr?.message);
    throw new Error(`Agent syntax error: ${syncErr?.message}`);
  }

  await Promise.race([
    execPromise,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`Agent timed out after ${EXEC_TIMEOUT_MS / 1000}s`)), EXEC_TIMEOUT_MS)
    ),
  ]).catch(err => {
    console.error('[runner] execution error:', err?.message);
    throw err;
  });

  return sandbox.result;
}
