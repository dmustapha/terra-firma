// Weekly Jar report: 7-day net credits per stock from Jar events, valued at current Chainlink prices.
// Shared by /jar/report/[addr] (server) and its OG image. Reads chain only; never estimates.
import { formatUnits, getAddress, parseEventLogs, type Address } from "viem";
import { erc20Abi, jarAbi } from "./abi";
import { STOCKS, TF } from "./config";
import { DEPLOYED, aggregatorAbi, publicClient } from "./ui-chain";
import { blockTimes, getLogsChunked } from "./ui-logs";

export interface StockQuote {
  symbol: string;
  multiplier: bigint;
  price8: bigint;
  updatedAt: number;
}

/** uiMultiplier + Chainlink live price for the curated 6 (one multicall). */
export async function stockQuotes(): Promise<StockQuote[]> {
  const res = await publicClient.multicall({
    allowFailure: true,
    contracts: STOCKS.flatMap((s) => [
      { address: s.token, abi: erc20Abi, functionName: "uiMultiplier" } as const,
      { address: s.liveFeed, abi: aggregatorAbi, functionName: "latestRoundData" } as const,
    ]),
  });
  return STOCKS.map((s, i) => {
    const m = res[2 * i];
    const p = res[2 * i + 1];
    const round = p.status === "success" ? (p.result as readonly [bigint, bigint, bigint, bigint, bigint]) : null;
    return {
      symbol: s.symbol,
      multiplier: m.status === "success" ? (m.result as bigint) : 10n ** 18n,
      price8: round ? round[1] : 0n,
      updatedAt: round ? Number(round[3]) : 0,
    };
  });
}

export const sharesOf = (raw: bigint, q: StockQuote) => (raw * q.multiplier) / 10n ** 18n;
export const usdOf = (raw: bigint, q: StockQuote) => Number(formatUnits(sharesOf(raw, q), 18)) * Number(formatUnits(q.price8, 8));

export interface JarReport {
  user: Address;
  deployed: boolean;
  asOfBlock: string;
  rows: { symbol: string; sharesNow: number; sharesWeek: number; usdNow: number; usdWeek: number }[];
  usdNow: number;
  usdWeek: number;
  creditsWeek: number;
}

export async function jarReport(addr: string): Promise<JarReport> {
  const user = getAddress(addr);
  if (!DEPLOYED) return { user, deployed: false, asOfBlock: "0", rows: [], usdNow: 0, usdWeek: 0, creditsWeek: 0 };
  const head = await publicClient.getBlockNumber();
  const raw = await getLogsChunked([TF.Jar], BigInt(TF.block), head);
  const mine = parseEventLogs({ abi: jarAbi, logs: raw }).filter((l) => l.args.user.toLowerCase() === user.toLowerCase());
  const times = await blockTimes(mine.map((l) => l.blockNumber));
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  const quotes = await stockQuotes();
  const balances = await publicClient.multicall({
    allowFailure: false,
    contracts: STOCKS.map((s) => ({ address: TF.Jar, abi: jarAbi, functionName: "balanceOf", args: [user, s.token] }) as const),
  });
  let creditsWeek = 0;
  const rows = STOCKS.map((s, i) => {
    let week = 0n;
    for (const l of mine) {
      if (l.args.stock.toLowerCase() !== s.token.toLowerCase() || times.get(l.blockNumber)! < weekAgo) continue;
      if (l.eventName === "Credited") {
        week += l.args.amount;
        creditsWeek++;
      } else week -= l.args.amount;
    }
    const q = quotes[i];
    const now = balances[i] as bigint;
    return {
      symbol: s.symbol,
      sharesNow: Number(formatUnits(sharesOf(now, q), 18)),
      sharesWeek: Number(formatUnits(sharesOf(week, q), 18)),
      usdNow: usdOf(now, q),
      usdWeek: usdOf(week, q),
    };
  }).filter((r) => r.sharesNow !== 0 || r.sharesWeek !== 0);
  return {
    user,
    deployed: true,
    asOfBlock: head.toString(),
    rows,
    usdNow: rows.reduce((a, r) => a + r.usdNow, 0),
    usdWeek: rows.reduce((a, r) => a + r.usdWeek, 0),
    creditsWeek,
  };
}
