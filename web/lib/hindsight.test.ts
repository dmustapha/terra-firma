import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionResult, zeroAddress, type Address, type Hex } from "viem";
import { erc20Abi, terraRouterAbi } from "./abi";
import { blockTs, decodeBalances, purchaseSources, routerMemeLeg, summarize, type CardMeme, type Receipt } from "./hindsight";
import { RpcError } from "./rpc";

const ROUTER = "0x1111111111111111111111111111111111111111" as Address;
const USER = "0x2222222222222222222222222222222222222222" as Address;
const MEME = "0x3333333333333333333333333333333333333333" as Address;
const OTHER = "0x4444444444444444444444444444444444444444" as Address;

type EventName = "Traded" | "Swept";
/** A receipt log for a TerraRouter event, encoded with viem from the generated ABI (topics + non-indexed data). */
function routerLog(address: Address, eventName: EventName, args: Record<string, unknown>): Receipt["logs"][number] {
  const ev = terraRouterAbi.find((x) => x.type === "event" && x.name === eventName) as { inputs: readonly { name: string; type: string; indexed?: boolean }[] };
  const topics = encodeEventTopics({ abi: terraRouterAbi, eventName, args: args as never }) as Hex[];
  const data = encodeAbiParameters(
    ev.inputs.filter((i) => !i.indexed),
    ev.inputs.filter((i) => !i.indexed).map((i) => args[i.name]),
  );
  return { address, topics, data, blockNumber: "0x1", transactionHash: "0xaa" };
}

const ETH = 10n ** 18n;
const value = ETH; // tx.value sent to TerraRouter.buy
const fee = (value * 50n) / 10_000n; // 0.5%
const sweep = (value * 200n) / 10_000n; // 2% to stock
const traded = routerLog(ROUTER, "Traded", { user: USER, token: MEME, isBuy: true, ethAmount: value - fee - sweep, tokenAmount: 123n, fee });
const swept = routerLog(ROUTER, "Swept", { user: USER, stockId: 0, ethIn: sweep, stockOut: 456n });

describe("routerMemeLeg (M1: router buys price only the meme leg)", () => {
  it("paid = tx.value - Traded.fee - Swept.ethIn on a synthetic router receipt", () => {
    const rc: Receipt = { logs: [traded, swept] };
    expect(routerMemeLeg(rc, value, ROUTER)).toBe(value - fee - sweep);
    expect(routerMemeLeg(rc, value, ROUTER)).toBe(975n * 10n ** 15n);
  });

  it("ignores identical events emitted by any other contract, and unrelated logs", () => {
    const fake = routerLog(OTHER, "Swept", { user: USER, stockId: 0, ethIn: 10n ** 17n, stockOut: 1n });
    const transfer = { ...traded, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex], data: "0x" as Hex };
    expect(routerMemeLeg({ logs: [fake, { ...transfer, address: ROUTER }, traded, swept] }, value, ROUTER)).toBe(value - fee - sweep);
  });

  it("sums several Swept legs and treats a no-sweep buy as value - fee", () => {
    expect(routerMemeLeg({ logs: [traded, swept, swept] }, value, ROUTER)).toBe(value - fee - 2n * sweep);
    expect(routerMemeLeg({ logs: [traded] }, value, ROUTER)).toBe(value - fee);
  });

  it("is null without a Traded event (the tx is not a router buy we can price)", () => {
    expect(routerMemeLeg({ logs: [swept] }, value, ROUTER)).toBeNull();
    expect(routerMemeLeg(undefined, value, ROUTER)).toBeNull();
  });
});

describe("purchaseSources (M1: TerraRouter counts as a source once deployed)", () => {
  const reg = ["0x8876789976dEcBfCbBbe364623C63652db8C0904"];
  it("adds the router, lower-cased, so Transfer(from = TerraRouter) is a buy", () => {
    const s = purchaseSources(reg, ROUTER);
    expect(s.has(ROUTER.toLowerCase())).toBe(true);
    expect(s.has(reg[0].toLowerCase())).toBe(true);
    expect(s.size).toBe(2);
  });

  it("skips the zero address before Deploy has written deployments.json", () => {
    expect(purchaseSources(reg, zeroAddress).size).toBe(1);
    expect(purchaseSources(reg, zeroAddress).has(zeroAddress)).toBe(false);
  });
});

describe("blockTs (M2: never price with NaN ts)", () => {
  it("reads a hex timestamp", () => {
    expect(blockTs({ timestamp: "0x6a5b0c00" }, 1)).toBe(0x6a5b0c00);
  });

  it("throws on an RpcError item, a null block and a missing/zero timestamp", () => {
    expect(() => blockTs(new RpcError(-32005, "limit"), 1)).toThrow(/limit/);
    expect(() => blockTs(null, 9)).toThrow(/block 9/);
    expect(() => blockTs({}, 2)).toThrow(/bad timestamp/);
    expect(() => blockTs({ timestamp: "0x0" }, 3)).toThrow(/bad timestamp/);
  });
});

describe("decodeBalances (M2: an unreadable balance is not 0)", () => {
  const enc = (n: bigint) => encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: n });
  it("decodes balanceOf results in order", () => {
    expect(decodeBalances([enc(5n), enc(0n)], [MEME, OTHER])).toEqual([5n, 0n]);
  });

  it("throws on an RpcError item instead of reading it as 0n", () => {
    expect(() => decodeBalances([enc(5n), new RpcError(429, "HTTP 429")], [MEME, OTHER])).toThrow(/429/);
  });
});

const meme = (symbol: string, usdPaid8: string, usdToday8: string | null, shares18 = "0"): CardMeme => ({
  token: `0x${symbol.padEnd(40, "0")}` as Address,
  symbol,
  usdPaid8,
  usdToday8,
  todayReason: usdToday8 === null ? "quote unavailable (RPC error)" : null,
  usdCounterfactual8: "100",
  holding: "1",
  buys: [{ shares18 } as CardMeme["buys"][number]],
});

describe("summarize (M3: no fabricated $0 today)", () => {
  it("excludes unquoted memes from usdToday8 and usdPaidQuoted8, keeps them in paid/counterfactual/shares", () => {
    const s = summarize([meme("AAA", "1000", "500", "7"), meme("BBB", "4000", null, "3")], []);
    expect(s.totals).toEqual({ usdPaid8: "5000", usdPaidQuoted8: "1000", usdToday8: "500", usdCounterfactual8: "200", shares18: "10" });
    expect(s.partial).toBe(true);
    expect(s.unquoted).toEqual([{ token: meme("BBB", "0", null).token, symbol: "BBB", reason: "quote unavailable (RPC error)" }]);
  });

  it("never names an unquoted meme the worst trade (it would read as -100%)", () => {
    const s = summarize([meme("AAA", "1000", "900"), meme("BBB", "1000", null)], []);
    expect(s.worst?.symbol).toBe("AAA");
    expect(s.worst?.pct).toBeCloseTo(-10, 9);
    expect(summarize([meme("BBB", "1000", null)], []).worst).toBeNull();
  });

  it("keeps a genuine $0 (holding sold to zero) as a priced value", () => {
    const s = summarize([meme("AAA", "1000", "0")], []);
    expect(s.totals.usdToday8).toBe("0");
    expect(s.worst).toEqual({ symbol: "AAA", pct: -100 });
    expect(s.partial).toBe(false);
  });

  it("marks the card partial when a history scan left gaps, even if every meme is quoted", () => {
    const gap = { token: MEME, symbol: "AAA", fromBlock: 1, toBlock: 2 };
    expect(summarize([meme("AAA", "1", "1")], [gap]).partial).toBe(true);
    expect(summarize([], []).partial).toBe(false);
  });
});
