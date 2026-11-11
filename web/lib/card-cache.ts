// File: web/lib/card-cache.ts
// One shared Hindsight card cache for /api/hindsight, /api/card-check, /card/[addr] and its OG image.
// Keyed `addr:stockId` only (never by caller-chosen values), stores the in-flight promise so concurrent requests for
// one wallet share one build, bounded to MAX entries with oldest-first eviction, and admits at most CONCURRENCY builds.
import "server-only";
import type { Address } from "viem";
import type { StockId } from "./config";
import { Busy, createLimiter } from "./concurrency";
import { buildCard, type Card } from "./hindsight";

type Entry = { at: number; card: Promise<Card> };

export interface CardCacheOptions {
  build: (wallet: Address, stockId: StockId) => Promise<Card>;
  ttlMs?: number;
  max?: number;
  concurrency?: number;
  queue?: number;
  now?: () => number;
}

export function createCardCache({ build, ttlMs = 300_000, max = 200, concurrency = 3, queue = 6, now = Date.now }: CardCacheOptions) {
  const entries = new Map<string, Entry>();
  const builds = createLimiter(concurrency, queue);

  const evict = () => {
    const t = now();
    for (const [k, e] of entries) if (t - e.at >= ttlMs) entries.delete(k);
    while (entries.size >= max) entries.delete(entries.keys().next().value as string); // Map keeps insertion order
  };

  async function limitedBuild(wallet: Address, stockId: StockId): Promise<Card> {
    const release = await builds.acquire(); // throws Busy when the queue is full
    try {
      return await build(wallet, stockId);
    } finally {
      release();
    }
  }

  return {
    get size() {
      return entries.size;
    },
    limiter: builds,
    /** Cached (or shared in-flight) card for wallet + stock. Failures are never cached. Throws Busy when saturated. */
    get(wallet: Address, stockId: StockId): Promise<Card> {
      const key = `${wallet.toLowerCase()}:${stockId}`;
      const hit = entries.get(key);
      if (hit && now() - hit.at < ttlMs) return hit.card;
      if (hit) entries.delete(key);
      evict();
      const card = limitedBuild(wallet, stockId);
      entries.set(key, { at: now(), card });
      card.catch(() => {
        if (entries.get(key)?.card === card) entries.delete(key);
      });
      return card;
    },
  };
}

const shared = createCardCache({ build: buildCard });

/** The process-wide cached card getter every route and page uses instead of calling buildCard directly. */
export const getCard = (wallet: Address, stockId: StockId = 0) => shared.get(wallet, stockId);

/** Stable client-facing failure for a card build (detail stays in server logs, never in the body). */
export function cardFailure(e: unknown): { status: 503; body: { error: "busy" | "rpc_unavailable"; retryAfter: number }; headers: Record<string, string> } {
  const retryAfter = e instanceof Busy ? e.retryAfter : 5;
  const error = e instanceof Busy ? "busy" : "rpc_unavailable";
  return { status: 503, body: { error, retryAfter }, headers: { "retry-after": String(retryAfter) } };
}

/** card-check rule: a minted usdPaid8 is verified within 1% of the re-derived one (a later buy may postdate the mint). */
export function matchesClaim(derived: bigint, claimed: bigint): boolean {
  return derived > 0n && (claimed > derived ? claimed - derived : derived - claimed) * 100n <= derived;
}
