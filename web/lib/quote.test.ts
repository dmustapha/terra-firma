import { describe, expect, it } from "vitest";
import { encodeAbiParameters, type Address } from "viem";
import { ADDR } from "./config";
import type { PoolEntry } from "./registry";
import { QuoteUnavailable, bestQuote, pickBestQuote, quoteStock, routeFor, v3Path } from "./quote";
import { RpcError } from "./rpc";

const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571" as Address;
const NVDA = "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const hexOf = (a: string) => a.slice(2).toLowerCase();

const v2: PoolEntry = { kind: 1, version: "v2", pool: ZERO, quote: "WETH", liquidityUsd: 1 };
const v3: PoolEntry = { kind: 2, version: "v3", pool: ZERO, fee: 3000, quote: "WETH", liquidityUsd: 1 };
const v4Key = { currency0: ZERO, currency1: PONS, fee: 8388608, tickSpacing: 60, hooks: ADDR.wifHook };
const v4: PoolEntry = { kind: 3, version: "v4", id: "0x01", key: v4Key, liquidityUsd: 1 };

describe("v3Path", () => {
  it("packs address(20) + uint24 fee(3) + address(20)", () => {
    const p = v3Path(ADDR.weth, 500, NVDA);
    expect(p).toBe(`0x${hexOf(ADDR.weth)}0001f4${hexOf(NVDA)}`);
    expect((p.length - 2) / 2).toBe(43);
  });

  it("encodes the 1% tier and the zero fee at the edges of uint24", () => {
    expect(v3Path(ADDR.weth, 10000, NVDA).slice(42, 48)).toBe("002710");
    expect(v3Path(ADDR.weth, 0, NVDA).slice(42, 48)).toBe("000000");
  });

  it("rejects a fee that does not fit uint24", () => {
    expect(() => v3Path(ADDR.weth, 2 ** 24, NVDA)).toThrow();
  });
});

describe("routeFor", () => {
  it("builds v2 and v3 routes with WETH on the input side for buys and the output side for sells", () => {
    expect(routeFor(v2, PONS, "buy").v2Path).toEqual([ADDR.weth, PONS]);
    expect(routeFor(v2, PONS, "sell").v2Path).toEqual([PONS, ADDR.weth]);
    expect(routeFor(v3, PONS, "buy")).toMatchObject({ kind: 2, v2Path: [], v3Path: v3Path(ADDR.weth, 3000, PONS) });
    expect(routeFor(v3, PONS, "sell").v3Path).toBe(v3Path(PONS, 3000, ADDR.weth));
  });

  it("passes a hooked, dynamic-fee v4 key through verbatim (fee 8388608 kept)", () => {
    const r = routeFor(v4, PONS, "buy");
    expect(r).toEqual({ kind: 3, v2Path: [], v3Path: "0x", key: v4Key });
  });

  it("never returns a v2/v3 route whose endpoints differ from the declared token (TerraRouter._validate would revert BadRoute)", () => {
    for (const side of ["buy", "sell"] as const) {
      const r2 = routeFor(v2, PONS, side);
      expect(r2.v2Path).toContain(PONS);
      expect(r2.v2Path).toContain(ADDR.weth);
      expect(routeFor(v3, PONS, side).v3Path.toLowerCase()).toContain(hexOf(PONS));
    }
  });
});

describe("bestQuote / quoteStock guards (no RPC reached)", () => {
  it("refuses to quote a $WIF sell (INVARIANT 1)", async () => {
    await expect(bestQuote(ADDR.wif, "sell", 10n ** 18n)).resolves.toBeNull();
  });

  it("returns null for a zero amount and for a token outside the registry", async () => {
    await expect(bestQuote(ADDR.wif, "buy", 0n)).resolves.toBeNull();
    await expect(bestQuote("0x000000000000000000000000000000000000dEaD", "buy", 1n)).resolves.toBeNull();
  });

  it("quotes zero ETH into stock as zero without a call", async () => {
    await expect(quoteStock(0, 0n)).resolves.toBe(0n);
  });
});

describe("pickBestQuote (M3/S8: unavailable vs no route)", () => {
  const v2Out = (n: bigint) => encodeAbiParameters([{ type: "uint256[]" }], [[1n, n]]);
  const v3Out = (n: bigint) => encodeAbiParameters([{ type: "uint256" }, { type: "uint160" }, { type: "uint32" }, { type: "uint256" }], [n, 0n, 0, 0n]);
  const rateLimited = new RpcError(429, "HTTP 429");

  it("picks the largest decoded output and builds that pool's route", () => {
    const best = pickBestQuote([v2, v3], [v2Out(100n), v3Out(250n)], PONS, "sell");
    expect(best?.amountOut).toBe(250n);
    expect(best?.route.kind).toBe(2);
  });

  it("uses the surviving pools when only some calls errored", () => {
    expect(pickBestQuote([v2, v3], [rateLimited, v3Out(7n)], PONS, "sell")?.amountOut).toBe(7n);
  });

  it("throws QuoteUnavailable when every call failed at the RPC layer (never 'no route' / $0)", () => {
    expect(() => pickBestQuote([v2, v3], [rateLimited, new RpcError(-32603, "internal")], PONS, "sell")).toThrow(QuoteUnavailable);
  });

  it("returns null when pools answered but none can fill (revert, zero output, undecodable)", () => {
    const revert = new RpcError(3, "execution reverted");
    expect(pickBestQuote([v2, v3], [revert, v3Out(0n)], PONS, "sell")).toBeNull();
    expect(pickBestQuote([v2], ["0xdead"], PONS, "sell")).toBeNull();
    expect(pickBestQuote([], [], PONS, "sell")).toBeNull();
  });
});
