// Weekly Jar report: 7-day net credits per stock from Jar events, valued at current Chainlink prices.
// Shared by /jar/report/[addr] (server) and its OG image. Reads chain only; never estimates.
import { formatUnits, getAddress, parseEventLogs, type Address } from "viem";
import { erc20Abi, jarAbi } from "./abi";
import { STOCKS, TF } from "./config";
import { DEPLOYED, aggregatorAbi, publicClient } from "./ui-chain";
import { blockTimes, getLogsChunked } from "./ui-logs";

/** Live read per curated stock. A field is null when its read failed: callers render "—", never a default. */
export interface StockQuote {
  symbol: string;
  multiplier: bigint | null;
  price8: bigint | null;
  updatedAt: number | null;
}

type Read = { status: "success"; result: unknown } | { status: "failure"; error: Error };

/** Pure mapper from one multicall result pair to a quote (null on any failed or non-positive read). */
export function toQuote(symbol: string, m: Read, p: Read): StockQuote {
  const round = p.status === "success" ? (p.result as readonly [bigint, bigint, bigint, bigint, bigint]) : null;
  const price = round && round[1] > 0n ? round[1] : null;
  const mult = m.status === "success" && typeof m.result === "bigint" && m.result > 0n ? m.result : null;
  return { symbol, multiplier: mult, price8: price, updatedAt: price !== null && round ? Number(round[3]) : null };
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
  return STOCKS.map((s, i) => toQuote(s.symbol, res[2 * i] as Read, res[2 * i + 1] as Read));
}

/** Displayed shares (raw * uiMultiplier). Null when the quote or its multiplier is unknown. */
export const sharesOf = (raw: bigint, q: StockQuote | null | undefined): bigint | null =>
  q?.multiplier != null ? (raw * q.multiplier) / 10n ** 18n : null;

/** USD value at the live Chainlink price. Null when shares or price are unknown. */
export function usdOf(raw: bigint, q: StockQuote | null | undefined): number | null {
  const sh = sharesOf(raw, q);
  if (sh === null || q?.price8 == null) return null;
  return Number(formatUnits(sh, 18)) * Number(formatUnits(q.price8, 8));
}

/** Sum that refuses to guess: any unknown term makes the total unknown. */
export const sumKnown = (xs: (number | null)[]): number | null => (xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, x) => a + x, 0));

export interface JarReport {
  user: Address;
  deployed: boolean;
  asOfBlock: string;
  rows: { symbol: string; sharesNow: number | null; sharesWeek: number | null; usdNow: number | null; usdWeek: number | null }[];
  usdNow: number | null;
  usdWeek: number | null;
  creditsWeek: number;
}

const num18 = (v: bigint | null) => (v === null ? null : Number(formatUnits(v, 18)));

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
  const rows = STOCKS.flatMap((s, i) => {
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
    if (now === 0n && week === 0n) return [];
    return [{ symbol: s.symbol, sharesNow: num18(sharesOf(now, q)), sharesWeek: num18(sharesOf(week, q)), usdNow: usdOf(now, q), usdWeek: usdOf(week, q) }];
  });
  return {
    user,
    deployed: true,
    asOfBlock: head.toString(),
    rows,
    usdNow: sumKnown(rows.map((r) => r.usdNow)),
    usdWeek: sumKnown(rows.map((r) => r.usdWeek)),
    creditsWeek,
  };
}
