// File: web/lib/hindsight.ts
// [VERIFIED] algorithm from spike-indexing.md (per-token getLogs, 10M-block spans, batch <= 36, tx.value on
// Universal Router calls, receipts only when value == 0). Receipt path VERIFIED by scripts/test-hindsight.ts on two
// real txs (WETH-paid 0x9965...6ab0, USDG-paid 0x2ac2...28db) and an end-to-end card for 0x3fDB...b09E in 5.6s.
import "server-only";
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, getAddress, zeroAddress, type Address, type Hex } from "viem";
import { erc20Abi, terraRouterAbi } from "./abi";
import { ADDR, STOCKS, type StockId } from "./config";
import { REGISTRY, type Meme } from "./registry";
import { QuoteUnavailable, bestQuote } from "./quote";
import { RpcError, TOO_MANY_LOGS, hex, rpc, rpcBatch, rpcChunked, unwrap } from "./rpc";
import { latestPrice8, loadTable, roundAtLive } from "./rounds";
import { TF } from "./config";
import { hypersyncEnabled, transfersTo } from "./hypersync";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SPAN = 10_000_000;
const pad = (a: string) => `0x000000000000000000000000${a.slice(2).toLowerCase()}`;
const topicAddr = (t: string) => getAddress(`0x${t.slice(26)}`);

/** Matches HindsightLens.Buy so the browser/proof page can call recompute() with the same inputs. */
export interface CardBuy {
  tx: Hex;
  block: number;
  ts: number;
  payKind: 0 | 1 | 2; // 0 ETH/WETH, 1 USDG, 2 curated stock
  payStockId: number;
  amountPaid: string; // raw units of the paying asset
  payRoundId: string;
  payUsd8: string;
  stockRoundId: string;
  stockUsd8: string;
  usdPaid8: string;
  shares18: string;
}

export interface CardMeme {
  token: Address;
  symbol: string;
  usdPaid8: string;
  /** Sell-quote value of the holding now; null when no quote is available (never a fabricated $0). */
  usdToday8: string | null;
  /** Why usdToday8 is null ("no liquid pool" / "quote unavailable (RPC error)"); null when priced. */
  todayReason: string | null;
  usdCounterfactual8: string;
  holding: string;
  buys: CardBuy[];
}

export interface Card {
  wallet: Address;
  stock: (typeof STOCKS)[number]["symbol"];
  asOfBlock: number;
  /**
   * usdToday8 sums only memes with a quote; usdPaidQuoted8 is usdPaid8 over those same memes, so today-vs-paid is
   * like for like. usdPaid8 / usdCounterfactual8 / shares18 cover every priced buy.
   */
  totals: { usdPaid8: string; usdPaidQuoted8: string; usdToday8: string; usdCounterfactual8: string; shares18: string };
  memes: CardMeme[];
  unpriced: { token: Address; symbol: string; tx: Hex; reason: string }[];
  /** Worst today-vs-paid among quoted memes only. */
  worst: { symbol: string; pct: number } | null;
  /** True when any number above is incomplete: some held meme is unquoted or a history scan was cut short. */
  partial: boolean;
  /** Held memes whose usdToday8 is null, with the reason. */
  unquoted: { token: Address; symbol: string; reason: string }[];
  /** Block ranges whose Transfer history could not be read completely (buys there may be missing). */
  scanGaps: { token: Address; symbol: string; fromBlock: number; toBlock: number }[];
}

type Log = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex };
type Tx = { from: Address; to: Address | null; value: Hex; blockNumber: Hex; hash: Hex };
export type Receipt = { logs: (Log & { blockTimestamp?: Hex })[] };
/** Block time from a receipt's logs (Nitro includes blockTimestamp there; eth_getLogs reports "0x0", never used). */
const receiptTs = (rc: Receipt | undefined) => {
  const ts = Number(rc?.logs[0]?.blockTimestamp ?? 0);
  return ts > 0 ? ts : undefined;
};

/**
 * Addresses whose outgoing meme transfers count as a purchase. TerraRouter forwards the meme it receives from the
 * Universal Router to the buyer, so router buys arrive with from = TerraRouter (memes.json is built pre-deploy).
 */
export function purchaseSources(registrySources: readonly string[], router: string = TF.TerraRouter): Set<string> {
  const all = [...registrySources, ...(router && router.toLowerCase() !== zeroAddress ? [router] : [])];
  return new Set(all.map((a) => a.toLowerCase()));
}

type ScanGap = Card["scanGaps"][number];

/** Step 1-2: every Transfer(to = wallet) of each registry meme, per-token, 10M-block spans, split on overflow. */
async function scanBuys(wallet: Address, head: number, memes: Meme[]): Promise<{ logs: Log[]; gaps: ScanGap[] }> {
  if (memes.length === 0) return { logs: [], gaps: [] };
  const sources = purchaseSources(REGISTRY.sources);
  if (hypersyncEnabled()) {
    try {
      const from = Math.min(...memes.map((m) => m.firstBlock));
      const hs = (await transfersTo(wallet, memes.map((m) => m.token), from)) as Log[];
      return { logs: hs.filter((l) => Number(l.blockNumber) <= head && sources.has(topicAddr(l.topics[1]).toLowerCase())), gaps: [] };
    } catch (e) {
      console.warn(JSON.stringify({ route: "hindsight", hypersync: "fallback", error: String(e) }));
    }
  }
  type Q = { meme: Meme; from: number; to: number };
  let queue: Q[] = [];
  for (const meme of memes) {
    for (let from = meme.firstBlock; from <= head; from += SPAN) queue.push({ meme, from, to: Math.min(from + SPAN - 1, head) });
  }
  const logs: Log[] = [];
  for (let round = 0; queue.length > 0 && round < 6; round++) {
    const res = await rpcChunked(
      queue.map((q) => ({
        method: "eth_getLogs",
        params: [{ address: q.meme.token, fromBlock: hex(q.from), toBlock: hex(q.to), topics: [TRANSFER, null, pad(wallet)] }],
      })),
      4, // public RPC throttles at ~4-5 calls/s and counts each call inside a batch
      1,
    );
    const retry: Q[] = [];
    res.forEach((r, i) => {
      const q = queue[i];
      if (TOO_MANY_LOGS(r)) {
        const mid = Math.floor((q.from + q.to) / 2);
        retry.push({ meme: q.meme, from: q.from, to: mid }, { meme: q.meme, from: mid + 1, to: q.to });
      } else if (r instanceof RpcError) {
        throw r; // never treat an error as "no logs"
      } else {
        logs.push(...(r as Log[]));
      }
    });
    queue = retry;
  }
  // Split rounds exhausted: report the unread ranges instead of returning a silently truncated history.
  const gaps = queue.map((q) => ({ token: q.meme.token, symbol: q.meme.symbol, fromBlock: q.from, toBlock: q.to }));
  return { logs: logs.filter((l) => sources.has(topicAddr(l.topics[1]).toLowerCase())), gaps };
}

type Payment = { payKind: 0 | 1 | 2; payStockId: number; amount: bigint; block: number; ts?: number };
type Unpriced = { unpriced: string };

/** Meme leg of a buy through Terra Firma's own router: tx.value minus the protocol fee and the sweep (from its events). */
export function routerMemeLeg(rc: Receipt | undefined, value: bigint, router: Address = TF.TerraRouter): bigint | null {
  let fee: bigint | null = null;
  let sweep = 0n;
  for (const l of rc?.logs ?? []) {
    if (l.address.toLowerCase() !== router.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: terraRouterAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      if (ev.eventName === "Traded") fee = (ev.args as { fee: bigint }).fee;
      if (ev.eventName === "Swept") sweep += (ev.args as { ethIn: bigint }).ethIn;
    } catch {
      /* other event */
    }
  }
  return fee === null ? null : value - fee - sweep;
}

/** Step 3-4: what the wallet paid in each buy tx (ETH from tx.value, else outgoing WETH/USDG/stock in the receipt). */
async function payments(wallet: Address, hashes: Hex[]) {
  const me = wallet.toLowerCase();
  const txRes = await rpcChunked(hashes.map((h) => ({ method: "eth_getTransactionByHash", params: [h] })), 10);
  const txs = txRes.map((r, i) => unwrap<Tx>(r, `tx ${hashes[i]}`));
  const viaRouter = (t: Tx) => !!t.to && t.to.toLowerCase() === TF.TerraRouter.toLowerCase();
  const needReceipt = txs.filter((t) => t.from.toLowerCase() === me && (BigInt(t.value) === 0n || viaRouter(t)));
  const rcRes = await rpcChunked(needReceipt.map((t) => ({ method: "eth_getTransactionReceipt", params: [t.hash] })), 10);
  const receipts = rcRes.map((r, i) => unwrap<Receipt>(r, `receipt ${needReceipt[i].hash}`));
  const receiptByHash = new Map(needReceipt.map((t, i) => [t.hash, receipts[i]]));
  const stockIdx = new Map(STOCKS.map((x) => [x.token.toLowerCase(), x.id]));
  const payable = new Set([ADDR.weth.toLowerCase(), ADDR.usdg.toLowerCase(), ...stockIdx.keys()]);
  const out = new Map<Hex, Payment | Unpriced>();
  for (const t of txs) {
    if (t.from.toLowerCase() !== me) {
      out.set(t.hash, { unpriced: "received, not bought by this wallet" });
      continue;
    }
    const block = Number(t.blockNumber);
    const value = BigInt(t.value);
    if (value > 0n) {
      const leg = viaRouter(t) ? routerMemeLeg(receiptByHash.get(t.hash), value) : value;
      out.set(t.hash, leg === null ? { unpriced: "router tx without a Traded event" } : { payKind: 0, payStockId: 0, amount: leg, block, ts: receiptTs(receiptByHash.get(t.hash)) });
      continue;
    }
    const outgoing = (receiptByHash.get(t.hash)?.logs ?? []).filter(
      (l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]).toLowerCase() === me,
    );
    // A batched (EIP-7702) tx may move other tokens first; the payment is the outgoing WETH/USDG/curated-stock transfer.
    const paid = outgoing.find((l) => payable.has(l.address.toLowerCase()));
    if (!paid) {
      out.set(t.hash, { unpriced: outgoing.length ? "paid in tokens, not priced" : "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)" });
      continue;
    }
    const tok = paid.address.toLowerCase();
    const amount = BigInt(paid.data);
    const ts = receiptTs(receiptByHash.get(t.hash));
    if (tok === ADDR.weth.toLowerCase()) out.set(t.hash, { payKind: 0, payStockId: 0, amount, block, ts });
    else if (tok === ADDR.usdg.toLowerCase()) out.set(t.hash, { payKind: 1, payStockId: 0, amount, block, ts });
    else out.set(t.hash, { payKind: 2, payStockId: stockIdx.get(tok)!, amount, block, ts });
  }
  return out;
}

/** A block timestamp from an RPC result; throws on an error, a null block or a non-positive/NaN time. */
export function blockTs(r: unknown, block: number): number {
  const ts = Number(unwrap<{ timestamp: Hex }>(r, `block ${block}`).timestamp);
  if (!Number.isFinite(ts) || ts <= 0) throw new RpcError(-2, `block ${block}: bad timestamp`);
  return ts;
}

async function blockTimes(blocks: number[]): Promise<Map<number, number>> {
  const uniq = [...new Set(blocks)];
  const res = await rpcChunked(uniq.map((b) => ({ method: "eth_getBlockByNumber", params: [hex(b), false] })), 20);
  return new Map(uniq.map((b, i) => [b, blockTs(res[i], b)]));
}

/** balanceOf results; a failed call throws (an unreadable balance is not a zero balance). */
export function decodeBalances(res: unknown[], tokens: readonly Address[]): bigint[] {
  return res.map((r, i) => decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: unwrap<Hex>(r, `balanceOf ${tokens[i]}`) }));
}

async function balances(wallet: Address, tokens: Address[]): Promise<bigint[]> {
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [wallet] });
  return decodeBalances(await rpcBatch(tokens.map((t) => ({ method: "eth_call", params: [{ to: t, data }, "latest"] }))), tokens);
}

/** Sell-quote value of `held` in USD8, or null with the reason when no quote exists right now. */
async function valueToday(token: Address, held: bigint, ethUsd8: bigint): Promise<{ usd8: bigint | null; reason: string | null }> {
  if (held === 0n) return { usd8: 0n, reason: null };
  try {
    const q = await bestQuote(token, "sell", held);
    return q ? { usd8: (q.amountOut * ethUsd8) / 10n ** 18n, reason: null } : { usd8: null, reason: "no liquid pool" };
  } catch (e) {
    if (!(e instanceof QuoteUnavailable || e instanceof RpcError)) throw e;
    return { usd8: null, reason: "quote unavailable (RPC error)" };
  }
}

/** Card totals, `worst` and `partial` from finished meme rows (pure; nulls never count as $0). */
export function summarize(memes: CardMeme[], gaps: ScanGap[]) {
  const sum = (rows: CardMeme[], f: (m: CardMeme) => string) => rows.reduce((s, m) => s + BigInt(f(m)), 0n).toString();
  const quoted = memes.filter((m) => m.usdToday8 !== null);
  const unquoted = memes.filter((m) => m.usdToday8 === null).map((m) => ({ token: m.token, symbol: m.symbol, reason: m.todayReason ?? "unquoted" }));
  const worst =
    quoted
      .filter((m) => BigInt(m.usdPaid8) > 0n)
      .map((m) => ({ symbol: m.symbol, pct: (Number(m.usdToday8) / Number(m.usdPaid8) - 1) * 100 }))
      .sort((a, b) => a.pct - b.pct)[0] ?? null;
  const totals = {
    usdPaid8: sum(memes, (m) => m.usdPaid8),
    usdPaidQuoted8: sum(quoted, (m) => m.usdPaid8),
    usdToday8: sum(quoted, (m) => m.usdToday8 as string),
    usdCounterfactual8: sum(memes, (m) => m.usdCounterfactual8),
    shares18: memes.reduce((s, m) => s + m.buys.reduce((x, b) => x + BigInt(b.shares18), 0n), 0n).toString(),
  };
  return { totals, worst, unquoted, partial: unquoted.length > 0 || gaps.length > 0 };
}

/** Build a wallet's Hindsight card against `stockId` (default NVDA). $WIF, stables, WETH and stocks are never memes. */
export async function buildCard(wallet: Address, stockId: StockId = 0): Promise<Card> {
  const stock = STOCKS[stockId];
  const head = Number(await rpc<Hex>("eth_blockNumber", []));
  // The card covers memes the wallet still holds (PRD F1): read all registry balances first (GetBlock, no log limits),
  // then scan history only for held memes. Cuts a card from ~158 getLogs calls to ~5 per held meme.
  const allBal = await balances(wallet, REGISTRY.memes.map((m) => m.token));
  const heldMemes = REGISTRY.memes.filter((_, i) => allBal[i] > 0n);
  const { logs, gaps } = await scanBuys(wallet, head, heldMemes);
  const hashes = [...new Set(logs.map((l) => l.transactionHash))];
  // payments() runs alone first: overlapping it with blockTimes() put ~8 POSTs in flight and drew a 429 storm with
  // multi-second backoffs on the public RPC (heavy wallet 29s, debug-results/phase-2-known-risks.md). Only priced txs
  // need a block timestamp, and those with a receipt already carry it, so blockTimes() fetches only the rest.
  const pay = await payments(wallet, hashes);
  const untimed = logs.filter((l) => { const p = pay.get(l.transactionHash); return p && !("unpriced" in p) && p.ts === undefined; });
  const [times, ethT, usdgT, histT, nowStock, nowEth] = await Promise.all([
    blockTimes(untimed.map((l) => Number(l.blockNumber))),
    loadTable(ADDR.ethUsd),
    loadTable(ADDR.usdgUsd),
    loadTable(stock.historyFeed),
    latestPrice8(stock.historyFeed),
    latestPrice8(ADDR.ethUsd),
  ]);

  const byMeme = new Map<string, CardMeme>();
  const unpriced: Card["unpriced"] = [];
  // One payment per transaction: group received logs by tx; a single payment that bought several different memes
  // cannot be split honestly, so those rows are shown unpriced instead of counting the payment twice.
  const byTx = new Map<Hex, Log[]>();
  for (const l of logs) byTx.set(l.transactionHash, [...(byTx.get(l.transactionHash) ?? []), l]);
  for (const [tx, txLogs] of byTx) {
    const tokens = [...new Set(txLogs.map((l) => l.address.toLowerCase()))];
    const memesInTx = tokens.map((t) => REGISTRY.memes.find((m) => m.token.toLowerCase() === t)!);
    const p = pay.get(tx);
    const skip = (reason: string) => memesInTx.forEach((m) => unpriced.push({ token: m.token, symbol: m.symbol, tx, reason }));
    if (!p || "unpriced" in p) {
      skip(p && "unpriced" in p ? p.unpriced : "unknown");
      continue;
    }
    if (memesInTx.length > 1) {
      skip("one payment bought several memes");
      continue;
    }
    const meme = memesInTx[0];
    const ts = p.ts ?? times.get(Number(txLogs[0].blockNumber));
    if (ts === undefined || !Number.isFinite(ts)) throw new Error(`no block time for ${tx}`); // never price with NaN ts
    const payTable = p.payKind === 0 ? ethT : p.payKind === 1 ? usdgT : await loadTable(STOCKS[p.payStockId].historyFeed);
    const payLatest = p.payKind === 0 ? nowEth : undefined;
    const [payRound, stockRound] = await Promise.all([roundAtLive(payTable, ts, payLatest), roundAtLive(histT, ts, nowStock)]);
    if (!payRound || !stockRound) {
      skip("before Chainlink price history");
      continue;
    }
    const payDec = p.payKind === 1 ? 10n ** 6n : 10n ** 18n;
    const usdPaid8 = (p.amount * payRound.price8) / payDec;
    const shares18 = (usdPaid8 * 10n ** 18n) / stockRound.price8;
    const entry =
      byMeme.get(meme.token) ??
      ({ token: meme.token, symbol: meme.symbol, usdPaid8: "0", usdToday8: null, todayReason: null, usdCounterfactual8: "0", holding: "0", buys: [] } as CardMeme);
    entry.buys.push({
      tx,
      block: Number(txLogs[0].blockNumber),
      ts,
      payKind: p.payKind,
      payStockId: p.payStockId,
      amountPaid: p.amount.toString(),
      payRoundId: payRound.roundId.toString(),
      payUsd8: payRound.price8.toString(),
      stockRoundId: stockRound.roundId.toString(),
      stockUsd8: stockRound.price8.toString(),
      usdPaid8: usdPaid8.toString(),
      shares18: shares18.toString(),
    });
    entry.usdPaid8 = (BigInt(entry.usdPaid8) + usdPaid8).toString();
    byMeme.set(meme.token, entry);
  }

  const memes = [...byMeme.values()];
  const held = await balances(wallet, memes.map((m) => m.token));
  await Promise.all(
    memes.map(async (m, i) => {
      m.holding = held[i].toString();
      const today = await valueToday(m.token, held[i], nowEth.price8);
      m.usdToday8 = today.usd8 === null ? null : today.usd8.toString();
      m.todayReason = today.reason;
      const shares = m.buys.reduce((s, b) => s + BigInt(b.shares18), 0n);
      m.usdCounterfactual8 = ((shares * nowStock.price8) / 10n ** 18n).toString();
    }),
  );

  const { totals, worst, unquoted, partial } = summarize(memes, gaps);
  return {
    wallet,
    stock: stock.symbol,
    asOfBlock: head,
    totals,
    memes: memes.sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))),
    unpriced,
    worst,
    partial,
    unquoted,
    scanGaps: gaps,
  };
}
