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
  if (calls.some((c) => LOG_METHODS.has(c.method))) return [PUBLIC_RPC, PUBLIC_RPC];
  return [process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC, PUBLIC_RPC].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST a JSON-RPC batch with provider failover and exponential backoff on 429/5xx. Results keep call order. */
export async function rpcBatch(calls: RpcCall[]): Promise<(unknown | RpcError)[]> {
  if (calls.length === 0) return [];
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params })));
  let lastErr: unknown;
  for (const url of providers(calls)) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "user-agent": "terra-firma/1.0" },
          body,
          cache: "no-store",
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new RpcError(res.status, `HTTP ${res.status}`);
          await sleep(800 * 2 ** attempt);
          continue;
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

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const [r] = await rpcBatch([{ method, params }]);
  if (r instanceof RpcError) throw r;
  return r as T;
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

export const hex = (n: number | bigint) => `0x${n.toString(16)}`;
