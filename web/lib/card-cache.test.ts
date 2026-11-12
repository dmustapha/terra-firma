import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { createCardCache, cardFailure, matchesClaim } from "./card-cache";
import { Busy, createLimiter } from "./concurrency";
import type { Card } from "./hindsight";

const A = "0x00000000000000000000000000000000000000Aa" as Address;
const addr = (i: number) => `0x${i.toString(16).padStart(40, "0")}` as Address;
const fakeCard = (wallet: Address) => ({ wallet, totals: { usdPaid8: "100" } }) as unknown as Card;
const deferred = () => {
  let resolve!: () => void;
  const p = new Promise<void>((r) => (resolve = r));
  return { p, resolve };
};

describe("createLimiter", () => {
  it("admits max holders, queues up to queueMax FIFO, refuses the rest with Busy", async () => {
    const l = createLimiter(1, 1, 7);
    const r1 = await l.acquire();
    const second = l.acquire();
    await expect(l.acquire()).rejects.toMatchObject({ retryAfter: 7 });
    expect([l.active, l.queued]).toEqual([1, 1]);
    r1();
    const r2 = await second;
    expect([l.active, l.queued]).toEqual([1, 0]);
    r2();
    r2(); // double release is a no-op
    expect(l.active).toBe(0);
  });

  it("queueMax 0 refuses immediately when full (stream cap)", async () => {
    const l = createLimiter(2, 0);
    await l.acquire();
    await l.acquire();
    await expect(l.acquire()).rejects.toBeInstanceOf(Busy);
  });
});

describe("createCardCache (M4)", () => {
  it("dedupes concurrent requests for one wallet into one build and serves repeats from cache", async () => {
    let builds = 0;
    const c = createCardCache({ build: async (w) => (builds++, fakeCard(w)) });
    const [x, y] = await Promise.all([c.get(A, 0), c.get(A.toLowerCase() as Address, 0)]);
    await c.get(A, 0);
    expect(builds).toBe(1);
    expect(x).toBe(y);
  });

  it("keys by stock as well as wallet", async () => {
    let builds = 0;
    const c = createCardCache({ build: async (w) => (builds++, fakeCard(w)) });
    await c.get(A, 0);
    await c.get(A, 1);
    expect(builds).toBe(2);
  });

  it("rebuilds after the TTL and never caches a failure", async () => {
    let t = 0;
    let builds = 0;
    let fail = true;
    const c = createCardCache({ now: () => t, ttlMs: 1000, build: async (w) => { builds++; if (fail) throw new Error("rpc"); return fakeCard(w); } });
    await expect(c.get(A, 0)).rejects.toThrow("rpc");
    fail = false;
    await c.get(A, 0);
    expect(builds).toBe(2);
    t = 999;
    await c.get(A, 0);
    expect(builds).toBe(2);
    t = 1000;
    await c.get(A, 0);
    expect(builds).toBe(3);
  });

  it("stays bounded: 50 distinct wallets with max 10 keep at most 10 entries", async () => {
    const c = createCardCache({ max: 10, build: async (w) => fakeCard(w) });
    for (let i = 1; i <= 50; i++) await c.get(addr(i), 0);
    expect(c.size).toBeLessThanOrEqual(10);
  });

  it("runs at most `concurrency` builds at once and refuses with Busy past the queue", async () => {
    const gate = deferred();
    let running = 0;
    let peak = 0;
    const c = createCardCache({ concurrency: 2, queue: 1, build: async (w) => { running++; peak = Math.max(peak, running); await gate.p; running--; return fakeCard(w); } });
    const ok = [c.get(addr(1), 0), c.get(addr(2), 0), c.get(addr(3), 0)];
    await expect(c.get(addr(4), 0)).rejects.toBeInstanceOf(Busy);
    gate.resolve();
    await Promise.all(ok);
    expect(peak).toBe(2);
  });
});

describe("matchesClaim (card-check)", () => {
  it("verifies within 1% and rejects a fabricated amount or an empty derived card", () => {
    expect(matchesClaim(10_000n, 10_000n)).toBe(true);
    expect(matchesClaim(10_000n, 10_100n)).toBe(true);
    expect(matchesClaim(10_000n, 9_900n)).toBe(true);
    expect(matchesClaim(10_000n, 10_101n)).toBe(false);
    expect(matchesClaim(10_000n, 1n)).toBe(false);
    expect(matchesClaim(0n, 0n)).toBe(false);
  });
});

describe("cardFailure (M-02: stable codes, no detail)", () => {
  it("maps Busy to busy + its Retry-After and anything else to rpc_unavailable", () => {
    expect(cardFailure(new Busy(9))).toEqual({ status: 503, body: { error: "busy", retryAfter: 9 }, headers: { "retry-after": "9" } });
    const f = cardFailure(new Error("https://secret.example/token123 failed"));
    expect(f.body).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
    expect(JSON.stringify(f)).not.toContain("secret");
  });
});

describe("stress DH-9: fail fast instead of a platform 504", () => {
  it("a queued acquire that waits past waitMs leaves the queue with Busy and does not leak a slot", async () => {
    const l = createLimiter(1, 2, 3);
    const r1 = await l.acquire();
    const late = l.acquire(20);
    await expect(late).rejects.toMatchObject({ retryAfter: 3 });
    expect([l.active, l.queued]).toEqual([1, 0]);
    const next = l.acquire(1000);
    r1(); // the slot goes to the live waiter, not the timed-out one
    const r2 = await next;
    expect([l.active, l.queued]).toEqual([1, 0]);
    r2();
    expect(l.active).toBe(0);
  });

  it("a waiter granted before its deadline is not rejected later", async () => {
    const l = createLimiter(1, 1);
    const r1 = await l.acquire();
    const w = l.acquire(30);
    r1();
    const r2 = await w;
    await new Promise((r) => setTimeout(r, 50));
    expect(l.active).toBe(1);
    r2();
  });

  it("the cache refuses a build that cannot get a slot within queueWaitMs, and does not cache the failure", async () => {
    const gate = deferred();
    let calls = 0;
    const cache = createCardCache({
      build: async (w) => {
        calls++;
        await gate.p;
        return fakeCard(w);
      },
      concurrency: 1,
      queue: 5,
      queueWaitMs: 20,
    });
    const first = cache.get(addr(1), 0);
    await expect(cache.get(addr(2), 0)).rejects.toBeInstanceOf(Busy);
    gate.resolve();
    await first;
    await expect(cache.get(addr(2), 0)).resolves.toMatchObject({ wallet: addr(2) }); // retried, not a cached failure
    expect(calls).toBe(2);
  });

  it("getCardWithin answers Busy at the deadline while the build keeps going", async () => {
    const { getCardWithin } = await import("./card-cache");
    const gate = deferred();
    let finished = false;
    const slow = async (w: Address) => {
      await gate.p;
      finished = true;
      return fakeCard(w);
    };
    await expect(getCardWithin(A, 0, 20, slow)).rejects.toBeInstanceOf(Busy);
    gate.resolve();
    await new Promise((r) => setTimeout(r, 5));
    expect(finished).toBe(true);
    await expect(getCardWithin(A, 0, 1000, async (w) => fakeCard(w))).resolves.toMatchObject({ wallet: A });
  });
});
