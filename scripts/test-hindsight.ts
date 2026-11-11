// File: scripts/test-hindsight.ts
// Closes F-026: proves the receipt path of web/lib/hindsight.ts `payments` on REAL mainnet buys where tx.value == 0
// and the buyer paid WETH or USDG. Scans recent Transfer logs of registry memes sent from registry sources, keeps
// txs with value == 0 sent by the recipient whose receipt shows the recipient paying WETH/USDG (and not sending the
// meme back out: round-trips are not buys), then runs a verbatim
// replica of `payments` on them. Exit 1 if fewer than 2 are found in the scanned range (reported honestly).
// Run: pnpm tsx scripts/test-hindsight.ts [--windows N]
import { getAddress, type Address, type Hex } from "viem";
import { ADDR, STOCKS } from "../web/lib/config";
import { loadRegistry } from "./lib/files";
import { getLogsMany, headBlock, rpcChunked, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const WINDOW = 100_000; // ~2.8 h of blocks at ~10 blocks/s
const WANT = 2;
const topicAddr = (t: string) => getAddress(`0x${t.slice(26)}`);

type Tx = { from: Address; to: Address | null; value: Hex; blockNumber: Hex; hash: Hex };
type Receipt = { logs: Log[] };
type Payment = { payKind: 0 | 1 | 2; payStockId: number; amount: bigint; block: number } | { unpriced: string };

/** VERBATIM replica of web/lib/hindsight.ts `payments` (only the rpc import differs). Keep in sync. */
async function payments(wallet: Address, hashes: Hex[]) {
  const txs = (await rpcChunked(hashes.map((h) => ({ method: "eth_getTransactionByHash", params: [h] })), 10)) as Tx[];
  const needReceipt = txs.filter((t) => t && t.from.toLowerCase() === wallet.toLowerCase() && BigInt(t.value) === 0n);
  const receipts = (await rpcChunked(needReceipt.map((t) => ({ method: "eth_getTransactionReceipt", params: [t.hash] })), 10)) as Receipt[];
  const receiptByHash = new Map(needReceipt.map((t, i) => [t.hash, receipts[i]]));
  const stockIdx = new Map(STOCKS.map((s) => [s.token.toLowerCase(), s.id]));
  const out = new Map<Hex, Payment>();
  for (const t of txs) {
    if (!t) continue;
    if (t.from.toLowerCase() !== wallet.toLowerCase()) {
      out.set(t.hash, { unpriced: "received, not bought by this wallet" });
      continue;
    }
    const block = Number(t.blockNumber);
    if (BigInt(t.value) > 0n) {
      out.set(t.hash, { payKind: 0, payStockId: 0, amount: BigInt(t.value), block });
      continue;
    }
    const rc = receiptByHash.get(t.hash);
    const paid = (rc?.logs ?? []).find(
      (l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]).toLowerCase() === wallet.toLowerCase(),
    );
    if (!paid) {
      out.set(t.hash, { unpriced: "no payment found" });
      continue;
    }
    const tok = paid.address.toLowerCase();
    const amount = BigInt(paid.data);
    if (tok === ADDR.weth.toLowerCase()) out.set(t.hash, { payKind: 0, payStockId: 0, amount, block });
    else if (tok === ADDR.usdg.toLowerCase()) out.set(t.hash, { payKind: 1, payStockId: 0, amount, block });
    else if (stockIdx.has(tok)) out.set(t.hash, { payKind: 2, payStockId: stockIdx.get(tok)!, amount, block });
    else out.set(t.hash, { unpriced: "paid in tokens, not priced" });
  }
  return out;
}

type Candidate = { tx: Hex; wallet: Address; token: string; meme: string; memeAmount: bigint; paidWith?: string };

/** Buys in [from, to]: meme Transfers out of a registry source into the tx sender, with tx.value == 0. */
async function zeroValueBuys(from: number, to: number): Promise<Candidate[]> {
  const reg = loadRegistry();
  const sources = new Set(reg.sources.map((s) => s.toLowerCase()));
  const sym = new Map(reg.memes.map((m) => [m.token.toLowerCase(), m.symbol]));
  const logs = await getLogsMany(reg.memes.map((m) => ({ address: m.token, topics: [TRANSFER as Hex], from, to })));
  const byTx = new Map<Hex, Candidate>();
  for (const l of logs) {
    if (l.topics.length !== 3 || !sources.has(topicAddr(l.topics[1]).toLowerCase())) continue;
    byTx.set(l.transactionHash, { tx: l.transactionHash, wallet: topicAddr(l.topics[2]), token: l.address.toLowerCase(), meme: sym.get(l.address.toLowerCase()) ?? l.address, memeAmount: BigInt(l.data) });
  }
  const cands = [...byTx.values()];
  const txs = (await rpcChunked(cands.map((c) => ({ method: "eth_getTransactionByHash", params: [c.tx] })), 10)) as (Tx | null)[];
  console.log(`  blocks ${from}..${to}: ${logs.length} meme transfers, ${cands.length} source->wallet txs`);
  return cands.filter((c, i) => {
    const t = txs[i];
    return t && BigInt(t.value) === 0n && t.from.toLowerCase() === c.wallet.toLowerCase();
  });
}

/** Clean buys only: the wallet sends WETH or USDG and never sends the bought meme back out (no round-trips). */
async function paidInWethOrUsdg(cands: Candidate[]): Promise<Candidate[]> {
  const receipts = (await rpcChunked(cands.map((c) => ({ method: "eth_getTransactionReceipt", params: [c.tx] })), 10)) as Receipt[];
  const quote = new Set([ADDR.weth.toLowerCase(), ADDR.usdg.toLowerCase()]);
  return cands.flatMap((c, i) => {
    const out = (receipts[i]?.logs ?? []).filter((l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]) === c.wallet);
    const pay = out.find((l) => quote.has(l.address.toLowerCase()));
    return pay && !out.some((l) => l.address.toLowerCase() === c.token) ? [{ ...c, paidWith: pay.address.toLowerCase() }] : [];
  });
}

const describe = (p: Payment | undefined) => {
  if (!p) return "missing";
  if ("unpriced" in p) return `unpriced (${p.unpriced})`;
  const asset = p.payKind === 0 ? "ETH/WETH" : p.payKind === 1 ? "USDG" : STOCKS[p.payStockId].symbol;
  const dec = p.payKind === 1 ? 6 : 18;
  return `payKind ${p.payKind} (${asset}) amount ${p.amount} (= ${Number(p.amount) / 10 ** dec}) block ${p.block}`;
};

async function main() {
  const i = process.argv.indexOf("--windows");
  const windows = i > 0 ? Number(process.argv[i + 1]) : 20;
  const head = await headBlock();
  const found: Candidate[] = [];
  let zeroValue = 0;
  let scanned = 0;
  const covered = () => new Set(found.map((f) => f.paidWith)).size >= 2;
  for (let w = 0; w < windows && !covered(); w++, scanned++) {
    const to = head - w * WINDOW;
    const cands = await zeroValueBuys(to - WINDOW + 1, to);
    zeroValue += cands.length;
    const paid = await paidInWethOrUsdg(cands);
    console.log(`    value==0 self-sent: ${cands.length}; paid WETH/USDG in receipt: ${paid.length}`);
    found.push(...paid.filter((p) => !found.some((f) => f.wallet === p.wallet)));
  }
  console.log(`\nscanned ${scanned * WINDOW} blocks back from head ${head}; zero-value self-sent buys: ${zeroValue}; WETH/USDG-paid: ${found.length}`);
  let detected = 0;
  const weth = found.find((f) => f.paidWith === ADDR.weth.toLowerCase());
  const usdg = found.find((f) => f.paidWith === ADDR.usdg.toLowerCase());
  const picks = [weth, usdg, ...found].filter((c, i, a): c is Candidate => !!c && a.indexOf(c) === i).slice(0, WANT);
  console.log(`WETH-paid ${found.filter((f) => f.paidWith === ADDR.weth.toLowerCase()).length}, USDG-paid ${found.filter((f) => f.paidWith === ADDR.usdg.toLowerCase()).length}`);
  for (const c of picks) {
    const p = (await payments(c.wallet, [c.tx])).get(c.tx);
    if (p && !("unpriced" in p) && p.payKind <= 1) detected++;
    console.log(`\ntx ${c.tx}\n  wallet ${c.wallet} bought ${Number(c.memeAmount) / 1e18} ${c.meme}\n  payments(): ${describe(p)}`);
  }
  if (detected < picks.length) {
    console.error(`\nFAIL: payments() did not price ${picks.length - detected} real WETH/USDG-paid buy(s).`);
    process.exit(1);
  }
  if (found.length < WANT) {
    console.error(`\nFAIL: found ${found.length} WETH/USDG-paid buy(s); need ${WANT}. Receipt path remains unproven on mainnet.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
