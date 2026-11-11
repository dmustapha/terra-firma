// Integration tier: web/lib/config.ts STOCKS + web/lib/quote.ts STOCK_PATHS must match contracts/script/TerraConfig.sol
// stocks() byte for byte (same tokens, feeds, symbols, pool fees and hops), or the UI quotes a path the contract won't use.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { encodePacked, type Address, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { ADDR, STOCKS } from "./config";
import { STOCK_PATHS } from "./quote";

type SolStock = { id: number; token: Address; liveFeed: Address; historyFeed: Address; path: Hex; fees: number[]; symbol: string };
const SOL = readFileSync(fileURLToPath(new URL("../../contracts/script/TerraConfig.sol", import.meta.url)), "utf8");
const STOCK_RE =
  /s\[(\d)\] = StockOracle\.Stock\(\s*(\w+), (0x[0-9a-fA-F]{40}), (0x[0-9a-fA-F]{40}),\s*abi\.encodePacked\(((?:[^()]|\([^()]*\))*)\), "(\w+)"\s*\);/g;

function parseStocks(sol: string): SolStock[] {
  const consts = new Map([...sol.matchAll(/address internal constant (\w+) = (0x[0-9a-fA-F]{40});/g)].map((m) => [m[1], m[2] as Address]));
  const addr = (name: string) => {
    const a = consts.get(name);
    if (!a) throw new Error(`unknown constant ${name}`);
    return a;
  };
  return [...sol.matchAll(STOCK_RE)].map((m) => {
    const parts = m[5].split(",").map((s) => s.trim());
    const fees = parts.filter((p) => p.startsWith("uint24(")).map((p) => Number(p.slice(7, -1)));
    const types = parts.map((p) => (p.startsWith("uint24(") ? "uint24" : "address"));
    const values = parts.map((p) => (p.startsWith("uint24(") ? Number(p.slice(7, -1)) : addr(p)));
    return { id: Number(m[1]), token: addr(m[2]), liveFeed: m[3] as Address, historyFeed: m[4] as Address, path: encodePacked(types, values), fees, symbol: m[6] };
  });
}

describe("STOCKS / STOCK_PATHS vs TerraConfig.sol stocks()", () => {
  const sol = parseStocks(SOL);

  it("has the same 6 stocks with identical tokens, feeds, symbols and packed paths", () => {
    expect(sol.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const s of sol) {
      const w = STOCKS[s.id];
      expect(w.symbol).toBe(s.symbol);
      expect(w.token.toLowerCase()).toBe(s.token.toLowerCase());
      expect(w.liveFeed.toLowerCase()).toBe(s.liveFeed.toLowerCase());
      expect(w.historyFeed.toLowerCase()).toBe(s.historyFeed.toLowerCase());
      expect(STOCK_PATHS[w.id].toLowerCase()).toBe(s.path.toLowerCase());
    }
  });

  it("routes GOOGL and SNDK through USDG (2 hops, fees 500/500 and 500/10000)", () => {
    expect(sol[2].fees).toEqual([500, 500]);
    expect(sol[3].fees).toEqual([500, 10000]);
    for (const id of [2, 3] as const) expect(STOCK_PATHS[id].toLowerCase()).toContain(ADDR.usdg.slice(2).toLowerCase());
    expect(sol.filter((s) => s.fees.length === 1).map((s) => s.fees[0])).toEqual([500, 3000, 500, 3000]);
  });

  it("fails loudly on a path constant it cannot resolve", () => {
    const bad = SOL.replace("abi.encodePacked(WETH, uint24(500), NVDA)", "abi.encodePacked(WETH, uint24(500), NOPE)");
    expect(() => parseStocks(bad)).toThrow(/unknown constant NOPE/);
  });
});
