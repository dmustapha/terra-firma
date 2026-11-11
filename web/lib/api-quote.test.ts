// /api/quote response mapping. Only the three RPC-backed lib calls are replaced; the fee/sweep arithmetic in the route
// and pickBestQuote's pool selection (quote.test.ts) run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BestQuote } from "./quote";

const m = vi.hoisted(() => ({ bestQuote: vi.fn(), quoteStock: vi.fn(), oracleMinStock: vi.fn() }));
vi.mock("@/lib/quote", async (orig) => ({ ...(await orig<typeof import("./quote")>()), ...m }));

const { GET: quote } = await import("@/app/api/quote/route");
const { QuoteUnavailable } = await import("./quote");

const MEME = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const q = async (qs: string) => {
  const res = await quote(new Request(`http://localhost/api/quote?${qs}`));
  return { status: res.status, res, body: (await res.json()) as Record<string, unknown> };
};
const best = { route: { kind: 1, v2Path: [], v3Path: "0x", key: {} }, pool: {}, amountOut: 5000n } as unknown as BestQuote;
const oracle = (min: bigint) => ({ min, ethUsd8: 1n, stockUsd8: 1n, fresh: true });

beforeEach(() => {
  m.bestQuote.mockReset().mockResolvedValue(best);
  m.quoteStock.mockReset().mockResolvedValue(100n);
  m.oracleMinStock.mockReset().mockResolvedValue(oracle(90n));
});

describe("/api/quote", () => {
  it("buy: fee and sweep are bps of the ETH notional; meme leg gets the rest; band ok", async () => {
    const r = await q(`token=${MEME}&amount=10000&side=buy&sweepBps=200&feeBps=50`);
    expect(r.status).toBe(200);
    expect(m.bestQuote).toHaveBeenCalledWith(MEME, "buy", 10000n - 50n - 200n);
    expect(r.body).toMatchObject({ fee: "50", ethToStock: "200", stockOut: "100", minStockOut: "90", bandOk: true, warning: null });
  });

  it("warns outside_oracle_band when the pool returns less than the Chainlink floor (tx would revert)", async () => {
    m.oracleMinStock.mockResolvedValue(oracle(101n));
    for (const side of ["buy", "sell", "convert"]) {
      expect((await q(`token=${MEME}&amount=10000&side=${side}`)).body).toMatchObject({ bandOk: false, warning: "outside_oracle_band" });
    }
  });

  it("404 no_route only when pools genuinely cannot fill", async () => {
    m.bestQuote.mockResolvedValue(null);
    expect(await q(`token=${MEME}&amount=10000`)).toMatchObject({ status: 404, body: { error: "no_route" } });
  });

  it("503 quote_unavailable (retryable) when every quote call errored, never as no_route", async () => {
    m.bestQuote.mockImplementation(async () => { throw new QuoteUnavailable("all 2 quote calls failed"); });
    const r = await q(`token=${MEME}&amount=10000`);
    expect(r).toMatchObject({ status: 503, body: { error: "quote_unavailable", retryAfter: 5 } });
    expect(r.res.headers.get("retry-after")).toBe("5");
  });

  it("503 quote_failed without a detail field (M-02)", async () => {
    m.quoteStock.mockImplementation(async () => { throw new Error("viem: https://go.getblock.io/SECRET reverted"); });
    const r = await q(`token=${MEME}&amount=10000`);
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ error: "quote_failed", retryAfter: 5 });
  });

  it("409 oracle_stale when the stock feed is stale and there is a sweep", async () => {
    m.oracleMinStock.mockResolvedValue({ ...oracle(1n), fresh: false });
    expect((await q(`token=${MEME}&amount=10000`)).status).toBe(409);
  });
});
