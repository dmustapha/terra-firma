// File: scripts/lib/rpc.ts
// Node twin of web/lib/rpc.ts (that file imports "server-only", which throws outside Next).
// Limits (spike-indexing.md): <= 36 calls per JSON-RPC batch, ~4 req/s sustained, 10,000-log responses are ERRORS.
import { createPublicClient, fallback, http, type Address, type Hex } from "viem";
import { robinhood } from "viem/chains";
import { logProviders, providers } from "./env";

type RpcCall = { method: string; params: unknown[] };
type RpcReply = { id: number; result?: unknown; error?: { code: number; message: string } };

export class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export const TOO_MANY_LOGS = (e: unknown) =>
  e instanceof RpcError && /exceeds limit|more than 10000|10000 results|query returned more/i.test(e.message);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MIN_GAP_MS = 260; // ~4 POSTs per second across the whole process
let nextSlot = 0;

/** Global pacing: every outgoing POST (raw or viem) waits for its slot. */
async function throttle() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

const UA = { "content-type": "application/json", "user-agent": "terra-firma-scripts/1.0" };

export const throttledFetch: typeof fetch = async (input, init) => {
  await throttle();
  return fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), ...UA } });
};

async function postBatch(url: string, calls: RpcCall[]): Promise<(unknown | RpcError)[]> {
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params })));
  const res = await throttledFetch(url, { method: "POST", body });
  if (res.status === 429 || res.status >= 500) throw new RpcError(res.status, `HTTP ${res.status}`);
  const json = (await res.json()) as RpcReply[] | RpcReply;
  const byId = new Map((Array.isArray(json) ? json : [json]).map((r) => [r.id, r]));
  return calls.map((_, i) => {
    const r = byId.get(i);
    if (!r) return new RpcError(-1, "missing response");
    return r.error ? new RpcError(r.error.code, r.error.message) : r.result;
  });
}

/** One JSON-RPC batch with provider failover and backoff. Per-call errors come back as RpcError values. */
export async function rpcBatch(calls: RpcCall[], urls = providers()): Promise<(unknown | RpcError)[]> {
  if (calls.length === 0) return [];
  if (calls.length > 36) throw new Error(`batch of ${calls.length} exceeds 36`);
  let lastErr: unknown;
  for (const url of urls) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await postBatch(url, calls);
      } catch (e) {
        lastErr = e;
        await sleep(Math.min(500 * 2 ** attempt, 8000));
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

/** Chunked batches, `parallel` POSTs in flight (pacing still applies globally). Order preserved. */
export async function rpcChunked(calls: RpcCall[], size = 30, parallel = 2, urls = providers()): Promise<(unknown | RpcError)[]> {
  const chunks: RpcCall[][] = [];
  for (let i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
  const out: (unknown | RpcError)[][] = new Array(chunks.length);
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      out[i] = await rpcBatch(chunks[i], urls);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, chunks.length) }, worker));
  return out.flat();
}

export const hex = (n: number | bigint) => `0x${n.toString(16)}`;

export type Log = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex; logIndex: Hex };
export type LogQuery = { address?: Address | Address[]; topics: (Hex | Hex[] | null)[]; from: number; to: number };

/**
 * getLogs over many ranges at once, sent to logProviders() (GetBlock shared caps getLogs at ~1,000 blocks;
 * the public RPC allows 10M for a single address). Ranges that hit the 10,000-log cap are split in half and retried;
 * any other error throws (an error is never "no logs").
 */
export async function getLogsMany(queries: LogQuery[], maxRounds = 14): Promise<Log[]> {
  let queue = queries;
  const logs: Log[] = [];
  for (let round = 0; queue.length > 0; round++) {
    if (round >= maxRounds) throw new Error(`getLogs still splitting after ${maxRounds} rounds`);
    const res = await rpcChunked(
      queue.map((q) => ({ method: "eth_getLogs", params: [{ address: q.address, topics: q.topics, fromBlock: hex(q.from), toBlock: hex(q.to) }] })),
      12,
      1,
      logProviders(),
    );
    const retry: LogQuery[] = [];
    res.forEach((r, i) => {
      const q = queue[i];
      if (TOO_MANY_LOGS(r) && q.to > q.from) {
        const mid = Math.floor((q.from + q.to) / 2);
        retry.push({ ...q, to: mid }, { ...q, from: mid + 1 });
      } else if (r instanceof RpcError) {
        throw r;
      } else {
        logs.push(...(r as Log[]));
      }
    });
    queue = retry;
  }
  return logs;
}

/** Split [from, to] into spans of `span` blocks. */
export function spans(from: number, to: number, span: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = from; a <= to; a += span) out.push([a, Math.min(a + span - 1, to)]);
  return out;
}

export const headBlock = async () => Number(await rpc<Hex>("eth_blockNumber", []));

/** viem client: provider failover, JSON-RPC batching (<= 30 per POST), shared pacing. */
export const client = createPublicClient({
  chain: robinhood,
  batch: { multicall: false },
  transport: fallback(
    providers().map((url) => http(url, { batch: { batchSize: 30, wait: 20 }, fetchFn: throttledFetch, retryCount: 4, retryDelay: 600 })),
  ),
});

export const transports = () =>
  fallback(providers().map((url) => http(url, { fetchFn: throttledFetch, retryCount: 4, retryDelay: 600 })));
