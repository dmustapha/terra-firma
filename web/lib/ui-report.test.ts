import { afterEach, describe, expect, it, vi } from "vitest";
import { STOCKS } from "./config";
import { publicClient } from "./ui-chain";
import { sharesOf, stockQuotes, sumKnown, toQuote, usdOf, type StockQuote } from "./ui-report";

const ok = (result: unknown) => ({ status: "success" as const, result });
const fail = () => ({ status: "failure" as const, error: new Error("reverted") });
const round = (price: bigint, updatedAt = 1_700_000_000n) => ok([1n, price, 0n, updatedAt, 1n]);
const E18 = 10n ** 18n;

afterEach(() => vi.restoreAllMocks());

describe("toQuote", () => {
  it("maps successful reads", () => {
    expect(toQuote("NVDA", ok(E18), round(18_000_000_000n))).toEqual({ symbol: "NVDA", multiplier: E18, price8: 18_000_000_000n, updatedAt: 1_700_000_000 });
  });
  it("returns null fields on failed reads, never 1e18 or $0", () => {
    const q = toQuote("NVDA", fail(), fail());
    expect(q.multiplier).toBeNull();
    expect(q.price8).toBeNull();
    expect(q.updatedAt).toBeNull();
  });
  it("treats a non-positive answer or multiplier as unknown", () => {
    expect(toQuote("X", ok(0n), round(0n)).price8).toBeNull();
    expect(toQuote("X", ok(0n), round(-5n)).multiplier).toBeNull();
  });
});

describe("stockQuotes (multicall)", () => {
  it("keeps good stocks and nulls only the failed one", async () => {
    const res = STOCKS.flatMap((_, i) => (i === 0 ? [fail(), round(10_000_000_000n)] : [ok(E18), round(20_000_000_000n)]));
    vi.spyOn(publicClient, "multicall").mockResolvedValue(res as never);
    const qs = await stockQuotes();
    expect(qs).toHaveLength(STOCKS.length);
    expect(qs[0].multiplier).toBeNull();
    expect(qs[0].price8).toBe(10_000_000_000n);
    expect(qs[1].multiplier).toBe(E18);
  });
  it("surfaces a whole-call failure as a rejection (react-query error state)", async () => {
    vi.spyOn(publicClient, "multicall").mockRejectedValue(new Error("429"));
    await expect(stockQuotes()).rejects.toThrow("429");
  });
});

describe("sharesOf / usdOf / sumKnown", () => {
  const q: StockQuote = { symbol: "NVDA", multiplier: 2n * E18, price8: 100_00000000n, updatedAt: 1 };
  it("applies the multiplier and price", () => {
    expect(sharesOf(E18, q)).toBe(2n * E18);
    expect(usdOf(E18, q)).toBe(200);
    expect(sumKnown([1, 2.5])).toBe(3.5);
    expect(sumKnown([])).toBe(0);
  });
  it("is null when the quote is missing or partial", () => {
    expect(sharesOf(E18, undefined)).toBeNull();
    expect(sharesOf(E18, { ...q, multiplier: null })).toBeNull();
    expect(usdOf(E18, { ...q, price8: null })).toBeNull();
  });
  it("refuses to total over an unknown term", () => {
    expect(sumKnown([1, null, 2])).toBeNull();
  });
});
