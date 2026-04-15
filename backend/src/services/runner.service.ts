/**
 * Agent Code Runner
 *
 * Executes platform-hosted agent code in an isolated context.
 * Builders write an async function — the platform calls it with the input.
 *
 * Security: uses Node vm with a strict sandbox. No access to fs, process,
 * or network beyond what is explicitly provided (fetch via node-fetch).
 */

import vm from 'vm';

const TIMEOUT_MS = 25_000; // 25 seconds max per call

export async function runAgentCode(
  code: string,
  input: Record<string, unknown>
): Promise<unknown> {

  // Provide safe globals — fetch for HTTP, console for logging
  const sandbox = {
    input,
    result: undefined as unknown,
    fetch:  globalThis.fetch ?? require('node-fetch'),
    console: {
      log:   (...args: unknown[]) => console.log('[agent]', ...args),
      error: (...args: unknown[]) => console.error('[agent]', ...args),
    },
    JSON,
    Math,
    Date,
    parseFloat,
    parseInt,
    isNaN,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
  };

  // Wrap builder code: they export a `run` async function
  // We call it with `input` and capture the return value into `result`
  const wrapped = `
(async () => {
  ${code}
  if (typeof run !== 'function') throw new Error('Your agent must define: async function run(input) { ... }');
  result = await run(input);
})();
`;

  const context = vm.createContext(sandbox);
  const script  = new vm.Script(wrapped);

  // Run with timeout
  const promise = script.runInContext(context, { timeout: TIMEOUT_MS }) as Promise<void>;

  await Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Agent timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
    ),
  ]);

  return sandbox.result;
}
