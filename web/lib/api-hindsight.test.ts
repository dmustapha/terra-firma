// /api/hindsight + /api/card-check response mapping. The card source (lib/card-cache) is replaced so no RPC is reached;
// pricing itself is covered by hindsight.test.ts fixtures and the live tier.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "./hindsight";

const getCard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/card-cache", async (orig) => ({ ...(await orig<typeof import("./card-cache")>()), getCard }));

const { GET: hindsight } = await import("@/app/api/hindsight/route");
const { GET: cardCheck } = await import("@/app/api/card-check/route");
const { Busy } = await import("./concurrency");

const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const card = { wallet: WALLET, totals: { usdPaid8: "10000" }, memes: [], partial: false } as unknown as Card;
const get = (h: (r: Request) => Promise<Response>, path: string) => h(new Request(`http://localhost${path}`));

beforeEach(() => { getCard.mockReset(); });

describe("/api/hindsight", () => {
  it("returns the cached card for (wallet, stock id)", async () => {
    getCard.mockResolvedValue(card);
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET.toLowerCase()}&stock=tsla`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ wallet: WALLET });
    expect(getCard).toHaveBeenCalledWith(WALLET, 1);
  });

  it("503 busy with a Retry-After header when the build queue is full", async () => {
    getCard.mockImplementation(async () => { throw new Busy(5); });
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET}`);
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("5");
    expect(await res.json()).toEqual({ error: "busy", retryAfter: 5 });
  });

  it("503 rpc_unavailable without echoing the error text", async () => {
    getCard.mockImplementation(async () => { throw new Error("fetch https://go.getblock.io/SECRET failed"); });
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET}`);
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(text).not.toContain("SECRET");
    expect(JSON.parse(text)).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
  });
});

describe("/api/card-check", () => {
  it("uses the (wallet, stock) card for every claimed value: 50 different claims, one cache key", async () => {
    getCard.mockResolvedValue(card);
    for (let i = 1; i <= 50; i++) await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=${i}&stockId=2`);
    expect(new Set(getCard.mock.calls.map((c) => `${c[0]}:${c[1]}`))).toEqual(new Set([`${WALLET}:2`]));
  });

  it("verified only within 1% of the derived usdPaid8; no internal fields in the body", async () => {
    getCard.mockResolvedValue(card);
    const ok = await (await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=10050`)).json();
    const bad = await (await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=1`)).json();
    expect(ok).toEqual({ verified: true, derived: "10000" });
    expect(bad).toEqual({ verified: false, derived: "10000" });
  });

  it("503 with a stable code on failure", async () => {
    getCard.mockImplementation(async () => { throw new Error("boom"); });
    const res = await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=1`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
  });
});

describe("stress DH-9: route deadline", () => {
  it("answers 503 busy with Retry-After when a cold build outlives the route deadline (never a platform 504)", async () => {
    vi.useFakeTimers();
    try {
      getCard.mockImplementation(() => new Promise(() => {})); // a build that never finishes in time
      const pending = get(hindsight, `/api/hindsight?addr=${WALLET}`);
      await vi.advanceTimersByTimeAsync(50_000);
      const res = await pending;
      expect(res.status).toBe(503);
      expect(res.headers.get("retry-after")).toBe("5");
      expect(await res.json()).toEqual({ error: "busy", retryAfter: 5 });
    } finally {
      vi.useRealTimers();
    }
  });
});
