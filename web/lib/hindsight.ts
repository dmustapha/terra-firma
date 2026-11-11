// File: web/lib/hindsight.ts
// [VERIFIED] algorithm from spike-indexing.md (per-token getLogs, 10M-block spans, batch <= 36, tx.value on
// Universal Router calls, receipts only when value == 0). Receipt path VERIFIED by scripts/test-hindsight.ts on two
// real txs (WETH-paid 0x9965...6ab0, USDG-paid 0x2ac2...28db) and an end-to-end card for 0x3fDB...b09E in 5.6s.
import "server-only";
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, getAddress, type Address, type Hex } from "viem";
import { erc20Abi, terraRouterAbi } from "./abi";
import { ADDR, STOCKS, type StockId } from "./config";
import { REGISTRY, type Meme } from "./registry";
import { bestQuote } from "./quote";
import { RpcError, TOO_MANY_LOGS, hex, rpc, rpcBatch, rpcChunked } from "./rpc";
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
  usdToday8: string;
  usdCounterfactual8: string;
  holding: string;
  buys: CardBuy[];
}

export interface Card {
  wallet: Address;
  stock: (typeof STOCKS)[number]["symbol"];
  asOfBlock: number;
  totals: { usdPaid8: string; usdToday8: string; usdCounterfactual8: string; shares18: string };
  memes: CardMeme[];
  unpriced: { token: Address; symbol: string; tx: Hex; reason: string }[];
  worst: { symbol: string; pct: number } | null;
}

type Log = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex };
type Tx = { from: Address; to: Address | null; value: Hex; blockNumber: Hex; hash: Hex };
type Receipt = { logs: (Log & { blockTimestamp?: Hex })[] };
/** Block time from a receipt's logs (Nitro includes blockTimestamp there; eth_getLogs reports "0x0", never used). */
const receiptTs = (rc: Receipt | undefined) => {
  const ts = Number(rc?.logs[0]?.blockTimestamp ?? 0);
  return ts > 0 ? ts : undefined;
};

/** Step 1-2: every Transfer(to = wallet) of each registry meme, per-token, 10M-block spans, split on overflow. */
async function scanBuys(wallet: Address, head: number, memes: Meme[]): Promise<Log[]> {
  if (memes.length === 0) return [];
  const sources = new Set(REGISTRY.sources.map((s) => s.toLowerCase()));
  if (hypersyncEnabled()) {
    try {
      const from = Math.min(...memes.map((m) => m.firstBlock));
      const hs = (await transfersTo(wallet, memes.map((m) => m.token), from)) as Log[];
      return hs.filter((l) => Number(l.blockNumber) <= head && sources.has(topicAddr(l.topics[1]).toLowerCase()));
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
  return logs.filter((l) => sources.has(topicAddr(l.topics[1]).toLowerCase()));
}

type Payment = { payKind: 0 | 1 | 2; payStockId: number; amount: bigint; block: number; ts?: number };
type Unpriced = { unpriced: string };

/** Meme leg of a buy through Terra Firma's own router: tx.value minus the protocol fee and the sweep (from its events). */
function routerMemeLeg(rc: Receipt | undefined, value: bigint): bigint | null {
  let fee: bigint | null = null;
  let sweep = 0n;
  for (const l of rc?.logs ?? []) {
    if (l.address.toLowerCase() !== TF.TerraRouter.toLowerCase()) continue;
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
  const txs = (await rpcChunked(hashes.map((h) => ({ method: "eth_getTransactionByHash", params: [h] })), 10)) as Tx[];
  const viaRouter = (t: Tx) => !!t.to && t.to.toLowerCase() === TF.TerraRouter.toLowerCase();
  const needReceipt = txs.filter((t) => t && t.from.toLowerCase() === me && (BigInt(t.value) === 0n || viaRouter(t)));
  const receipts = (await rpcChunked(needReceipt.map((t) => ({ method: "eth_getTransactionReceipt", params: [t.hash] })), 10)) as Receipt[];
  const receiptByHash = new Map(needReceipt.map((t, i) => [t.hash, receipts[i]]));
  const stockIdx = new Map(STOCKS.map((x) => [x.token.toLowerCase(), x.id]));
  const payable = new Set([ADDR.weth.toLowerCase(), ADDR.usdg.toLowerCase(), ...stockIdx.keys()]);
  const out = new Map<Hex, Payment | Unpriced>();
  for (const t of txs) {
    if (!t) continue;
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

async function blockTimes(blocks: number[]): Promise<Map<number, number>> {
  const uniq = [...new Set(blocks)];
  const res = (await rpcChunked(uniq.map((b) => ({ method: "eth_getBlockByNumber", params: [hex(b), false] })), 20)) as { timestamp: Hex }[];
  return new Map(uniq.map((b, i) => [b, Number(res[i].timestamp)]));
}

async function balances(wallet: Address, tokens: Address[]): Promise<bigint[]> {
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [wallet] });
  const res = await rpcBatch(tokens.map((t) => ({ method: "eth_call", params: [{ to: t, data }, "latest"] })));
  return res.map((r) => (r instanceof RpcError ? 0n : decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: r as Hex })));
}

/** Build a wallet's Hindsight card against `stockId` (default NVDA). $WIF, stables, WETH and stocks are never memes. */
export async function buildCard(wallet: Address, stockId: StockId = 0): Promise<Card> {
  const stock = STOCKS[stockId];
  const head = Number(await rpc<Hex>("eth_blockNumber", []));
  // The card covers memes the wallet still holds (PRD F1): read all registry balances first (GetBlock, no log limits),
  // then scan history only for held memes. Cuts a card from ~158 getLogs calls to ~5 per held meme.
  const allBal = await balances(wallet, REGISTRY.memes.map((m) => m.token));
  const heldMemes = REGISTRY.memes.filter((_, i) => allBal[i] > 0n);
  const logs = await scanBuys(wallet, head, heldMemes);
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
    const ts = p.ts ?? times.get(Number(txLogs[0].blockNumber))!;
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
      ({ token: meme.token, symbol: meme.symbol, usdPaid8: "0", usdToday8: "0", usdCounterfactual8: "0", holding: "0", buys: [] } as CardMeme);
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
      const q = held[i] > 0n ? await bestQuote(m.token, "sell", held[i]) : null;
      m.usdToday8 = q ? ((q.amountOut * nowEth.price8) / 10n ** 18n).toString() : "0";
      const shares = m.buys.reduce((s, b) => s + BigInt(b.shares18), 0n);
      m.usdCounterfactual8 = ((shares * nowStock.price8) / 10n ** 18n).toString();
    }),
  );

  const sum = (f: (m: CardMeme) => string) => memes.reduce((s, m) => s + BigInt(f(m)), 0n);
  const shares18 = memes.reduce((s, m) => s + m.buys.reduce((x, b) => x + BigInt(b.shares18), 0n), 0n);
  const worst = memes
    .filter((m) => BigInt(m.usdPaid8) > 0n)
    .map((m) => ({ symbol: m.symbol, pct: (Number(m.usdToday8) / Number(m.usdPaid8) - 1) * 100 }))
    .sort((a, b) => a.pct - b.pct)[0] ?? null;

  return {
    wallet,
    stock: stock.symbol,
    asOfBlock: head,
    totals: {
      usdPaid8: sum((m) => m.usdPaid8).toString(),
      usdToday8: sum((m) => m.usdToday8).toString(),
      usdCounterfactual8: sum((m) => m.usdCounterfactual8).toString(),
      shares18: shares18.toString(),
    },
    memes: memes.sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))),
    unpriced,
    worst,
  };
}
