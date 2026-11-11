// File: web/lib/rpc.ts
// [VERIFIED] limits from spike-indexing.md: batch <= 36 getLogs per POST, 429 at ~4-5 req/s sustained,
// 10,000-log responses come back as a JSON-RPC ERROR (never treat as empty), public RPC needs a User-Agent.
// Server-only: GetBlock endpoints are shared hackathon secrets and must never reach the browser.
import "server-only";
import { PUBLIC_RPC } from "./config";

type RpcCall = { method: string; params: unknown[] };
type RpcOk = { jsonrpc: "2.0"; id: number; result: unknown };
type RpcErr = { jsonrpc: "2.0"; id: number; error: { code: number; message: string } };

export class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export const TOO_MANY_LOGS = (e: unknown) =>
  e instanceof RpcError && /more than 10000|10000 results|query returned more|exceeds limit of 10000/i.test(e.message);

/** GetBlock caps eth_getLogs at ~1,000 blocks ("Block range is too large"); the public RPC allows 10M (VERIFIED). */
const LOG_METHODS = new Set(["eth_getLogs"]);

function providers(calls: RpcCall[] = []): string[] {
  // LOGS_RPC (optional) points log scans at another 10M-range provider, e.g. a local fork in wire tests.
  const logs = process.env.LOGS_RPC || PUBLIC_RPC;
  if (calls.some((c) => LOG_METHODS.has(c.method))) return [logs, logs];
  return [process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC, PUBLIC_RPC].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Per-POST timeout, and the total time one rpcBatch may spend retrying, so a card fails as JSON 503 inside maxDuration 60. */
const FETCH_TIMEOUT_MS = 8_000;
const BATCH_BUDGET_MS = 40_000;

/**
 * Token bucket: `rate` tokens/s, at most `burst` banked. take(n) reserves n tokens (one per call inside a JSON-RPC batch)
 * and resolves when they are available. Tokens can go negative, so a large batch waits instead of starving forever.
 */
export function createTokenBucket(rate: number, burst: number, now = () => Date.now()) {
  let tokens = burst;
  let at = now();
  return {
    /** Milliseconds the caller must wait before sending n calls. */
    reserve(n: number): number {
      const t = now();
      tokens = Math.min(burst, tokens + ((t - at) / 1000) * rate);
      at = t;
      tokens -= n;
      return tokens >= 0 ? 0 : Math.ceil((-tokens / rate) * 1000);
    },
  };
}

/**
 * Process-wide budget for the public RPC, per POST: the spike's 429 threshold is ~4-5 requests/s sustained, and the
 * heavy-wallet live run (~400 calls in small batches, < 20 s) shows batched calls are not charged one token each
 * (charging per call at 4/s made that card take 106 s). Shared by every route so concurrent cards cannot double the rate.
 */
const publicBucket = createTokenBucket(5, 10);

async function postOnce(url: string, body: string): Promise<Response> {
  if (url === PUBLIC_RPC) {
    const wait = publicBucket.reserve(1);
    if (wait > 0) await sleep(wait);
  }
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "terra-firma/1.0" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** POST a JSON-RPC batch with provider failover and exponential backoff on 429/5xx. Results keep call order. */
export async function rpcBatch(calls: RpcCall[]): Promise<(unknown | RpcError)[]> {
  if (calls.length === 0) return [];
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params })));
  const deadline = Date.now() + BATCH_BUDGET_MS;
  let lastErr: unknown;
  for (const url of providers(calls)) {
    for (let attempt = 0; attempt < 5 && Date.now() < deadline; attempt++) {
      try {
        const res = await postOnce(url, body);
        if (res.status === 429 || res.status >= 500) {
          lastErr = new RpcError(res.status, `HTTP ${res.status}`);
          await sleep(800 * 2 ** attempt);
          continue;
        }
        if (!res.ok) {
          lastErr = new RpcError(res.status, `HTTP ${res.status}`);
          break; // other 4xx will not succeed on retry: try the next provider
        }
        const json = (await res.json()) as (RpcOk | RpcErr)[] | RpcOk | RpcErr;
        const arr = Array.isArray(json) ? json : [json];
        const byId = new Map(arr.map((r) => [r.id, r]));
        return calls.map((_, i) => {
          const r = byId.get(i);
          if (!r) return new RpcError(-1, "missing response");
          return "error" in r ? new RpcError(r.error.code, r.error.message) : r.result;
        });
      } catch (e) {
        lastErr = e;
        await sleep(300 * 2 ** attempt);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all RPC providers failed");
}

/** A batch result as data: throws on a per-call RpcError or a null/absent result (never read an error as 0 or "none"). */
export function unwrap<T>(r: unknown, what = "rpc result"): T {
  if (r instanceof RpcError) throw r;
  if (r === null || r === undefined) throw new RpcError(-2, `${what}: null result`);
  return r as T;
}

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const [r] = await rpcBatch([{ method, params }]);
  return unwrap<T>(r, method);
}

/** Run batches in chunks of `size` with at most `parallel` POSTs in flight. */
export async function rpcChunked(calls: RpcCall[], size = 36, parallel = 3): Promise<(unknown | RpcError)[]> {
  const chunks: RpcCall[][] = [];
  for (let i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
  const out: (unknown | RpcError)[][] = new Array(chunks.length);
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      out[i] = await rpcBatch(chunks[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, chunks.length) }, worker));
  return out.flat();
}

/** QuickNode endpoint: QUICKNODE_RPC, or `${QUICKNODE_BASE}/${QUICKNODE_TOKEN}/` (the names .env.local uses). */
export function quicknodeUrl(env: Record<string, string | undefined> = process.env): string | null {
  if (env.QUICKNODE_RPC) return env.QUICKNODE_RPC;
  const base = env.QUICKNODE_BASE?.replace(/\/+$/, "");
  const token = env.QUICKNODE_TOKEN?.replace(/^\/+|\/+$/g, "");
  return base && token ? `${base}/${token}/` : null;
}

export const hex = (n: number | bigint) => `0x${n.toString(16)}`;
