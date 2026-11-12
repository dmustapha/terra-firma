// File: scripts/regret-index.ts
// Robinhood Chain Regret Index (PLAN P7.4): a one-off, block-numbered snapshot. For the 5 most liquid registry memes,
// rebuild every balance from Transfer logs (deployment block to head), take the top 20 holders that are wallets
// (no contract code, or an EIP-7702 delegated EOA), dedupe, then read each wallet's Hindsight card from the live
// /api/hindsight route (the same code path /card/<addr> renders) and sum the totals. Nothing is estimated: a card that
// fails or comes back partial is listed and excluded from the sums.
// Run: RPC_MIN_GAP_MS=500 pnpm tsx scripts/regret-index.ts [--site https://terra-firma-henna.vercel.app]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createPublicClient, getAddress, http, type Address, type Hex } from "viem";
import { robinhood } from "viem/chains";
import { ROOT } from "./lib/env";
import { loadRegistry } from "./lib/files";
import { getLogsMany, RpcError, spans, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
const MEMES = 5;
const TOP = 20;
const argSite = process.argv.indexOf("--site");
const SITE = argSite > 0 ? process.argv[argSite + 1] : "https://terra-firma-henna.vercel.app";
// Only eth_getLogs goes to the shared public RPC (wide ranges), paced at <= 2 req/s; every other call uses the private
// GetBlock endpoint so this script never rate-limits other users of the public RPC on the same IP.
if (Number(process.env.RPC_MIN_GAP_MS ?? 0) < 500) throw new Error("run with RPC_MIN_GAP_MS=500 (<= 2 req/s to the public RPC)");
const PRIVATE = process.env.GETBLOCK_RPC_FRA;
if (!PRIVATE) throw new Error("GETBLOCK_RPC_FRA missing (~/wif-hack/.env.local)");
const client = createPublicClient({ chain: robinhood, transport: http(PRIVATE, { batch: false }) });
const TOKEN_BUDGET_MS = Number(process.env.REGRET_TOKEN_BUDGET_MS ?? 180_000);
const CACHE = path.join(ROOT, "scripts", ".cache", "regret-index");
mkdirSync(CACHE, { recursive: true });
const SKIP = new Set(["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead"]);

type Totals = { usdPaid8: string; usdToday8: string; usdCounterfactual8: string };
type Card = { totals: Totals; partial: boolean; asOfBlock: number; worst?: { symbol: string; pct: number } | null };
type Row = { wallet: Address; memes: string[]; paid: bigint; today: bigint; cf: bigint; worst: string };

const topicAddr = (t: Hex) => getAddress(`0x${t.slice(26)}`);

type Bal = Map<Address, bigint>;

/** Folds Transfer logs for [a, b] into `bal`; halves the range on "response too large", backs off on 429. */
async function foldTransfers(token: Address, a: number, b: number, bal: Bal, attempt = 0): Promise<void> {
  let logs: Log[];
  try {
    logs = await getLogsMany([{ address: token, topics: [TRANSFER], from: a, to: b }]);
  } catch (e) {
    if (e instanceof RpcError && e.code === 429 && attempt < 10) {
      await new Promise((s) => setTimeout(s, 3000 * (attempt + 1))); // public RPC rate limit: back off, same range
      return foldTransfers(token, a, b, bal, attempt + 1);
    }
    if (!(e instanceof RpcError) || !/too large/i.test(e.message) || b <= a) throw e;
    const mid = Math.floor((a + b) / 2);
    await foldTransfers(token, a, mid, bal);
    return foldTransfers(token, mid + 1, b, bal);
  }
  for (const l of logs) {
    if (l.topics.length < 3) continue;
    const v = BigInt(l.data);
    const f = topicAddr(l.topics[1]);
    const t = topicAddr(l.topics[2]);
    bal.set(f, (bal.get(f) ?? 0n) - v);
    bal.set(t, (bal.get(t) ?? 0n) + v);
  }
}

/** Balances from Transfer logs, resumable: progress is cached per token so a rerun only scans new blocks. */
async function balancesFromLogs(token: Address, from: number, head: number): Promise<{ bal: Bal; scannedTo: number }> {
  const t0 = Date.now();
  const file = path.join(CACHE, `${token.toLowerCase()}.json`);
  let start = from;
  const bal: Bal = new Map();
  if (existsSync(file)) {
    const c = JSON.parse(readFileSync(file, "utf8")) as { to: number; bal: [Address, string][] };
    c.bal.forEach(([k, v]) => bal.set(k, BigInt(v)));
    start = c.to + 1;
  }
  let scannedTo = start - 1;
  for (const [a, b] of spans(start, head, 1_000_000)) {
    if (Date.now() - t0 > TOKEN_BUDGET_MS) break; // time box: keep the cache, report the token as incomplete
    await foldTransfers(token, a, b, bal);
    scannedTo = b;
    writeFileSync(file, JSON.stringify({ to: b, bal: [...bal].filter(([, v]) => v !== 0n).map(([k, v]) => [k, v.toString()]) }));
  }
  return { bal, scannedTo };
}

async function isWallet(a: Address): Promise<boolean> {
  if (SKIP.has(a.toLowerCase())) return false;
  const code = (await client.getCode({ address: a })) ?? "0x";
  return code === "0x" || code.toLowerCase().startsWith("0xef0100");
}

async function topWallets(token: Address, from: number, head: number): Promise<Address[] | null> {
  const { bal, scannedTo } = await balancesFromLogs(token, from, head);
  if (scannedTo < head) return null; // incomplete scan: never rank holders from partial balances
  const ranked = [...bal.entries()].filter(([, v]) => v > 0n).sort((x, y) => (y[1] > x[1] ? 1 : y[1] < x[1] ? -1 : 0));
  const out: Address[] = [];
  for (const [a] of ranked) {
    if (out.length >= TOP) break;
    if (await isWallet(a)) out.push(a);
  }
  return out;
}

async function card(wallet: Address): Promise<Card | null> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${SITE}/api/hindsight?addr=${wallet}`, { headers: { "user-agent": "terra-firma-regret-index/1.0" } });
    if (r.ok) return (await r.json()) as Card;
    await new Promise((s) => setTimeout(s, 3000 * (i + 1)));
  }
  return null;
}

const usd = (v8: bigint) =>
  `${v8 < 0n ? "-" : ""}$${(Math.abs(Number(v8)) / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function main() {
  const t0 = Date.now();
  const head = Number(await client.getBlockNumber());
  const { timestamp } = await client.getBlock({ blockNumber: BigInt(head) });
  const memes = loadRegistry()
    .memes.filter((m) => m.tested && m.pools.length > 0)
    .sort((a, b) => Math.max(...b.pools.map((p) => p.liquidityUsd)) - Math.max(...a.pools.map((p) => p.liquidityUsd)))
    .slice(0, MEMES);

  const holders = new Map<Address, string[]>();
  const covered: string[] = [];
  const skipped: string[] = [];
  for (const m of memes) {
    const top = await topWallets(m.token as Address, m.firstBlock, head);
    if (!top) {
      skipped.push(m.symbol);
      console.log(`${m.symbol}: skipped (log scan exceeded the per-token time box)`);
      continue;
    }
    covered.push(m.symbol);
    console.log(`${m.symbol}: ${top.length} wallets`);
    for (const w of top) holders.set(w, [...(holders.get(w) ?? []), m.symbol]);
  }

  const rows: Row[] = [];
  const excluded: { wallet: Address; reason: string }[] = [];
  for (const [wallet, ms] of holders) {
    await new Promise((s) => setTimeout(s, 1500)); // gentle pacing on the live site
    const c = await card(wallet);
    if (!c) excluded.push({ wallet, reason: "card request failed" });
    else if (c.partial) excluded.push({ wallet, reason: "partial card (scan incomplete)" });
    else {
      const t = c.totals;
      rows.push({ wallet, memes: ms, paid: BigInt(t.usdPaid8), today: BigInt(t.usdToday8), cf: BigInt(t.usdCounterfactual8), worst: c.worst?.symbol ?? "" });
    }
  }

  const priced = rows.filter((r) => r.paid > 0n);
  const sum = (k: "paid" | "today" | "cf") => priced.reduce((s, r) => s + r[k], 0n);
  const [paid, today, cf] = [sum("paid"), sum("today"), sum("cf")];
  const regret = (r: Row) => r.cf - r.today;
  const top10 = [...priced].sort((a, b) => (regret(b) > regret(a) ? 1 : -1)).slice(0, 10);
  const nvdaWins = priced.filter((r) => regret(r) > 0n).length;
  const secs = Math.round((Date.now() - t0) / 1000);
  const when = new Date(Number(timestamp) * 1000).toISOString();

  const md = [
    "# Robinhood Chain Regret Index",
    "",
    `Snapshot at block **${head.toLocaleString("en-US")}** (${when}). Generated by \`RPC_MIN_GAP_MS=500 pnpm tsx scripts/regret-index.ts\` in ${secs}s.`,
    "",
    `The top ${TOP} wallet holders of ${covered.length === memes.length ? `the ${MEMES} most liquid memes` : `${covered.length} of the ${MEMES} most liquid memes`} in the Terra Firma registry (${covered.join(", ")}), deduplicated: **${holders.size} wallets**, of which **${priced.length}** have priced buys on their Hindsight card.`,
    "",
    "| | Total |",
    "|---|---|",
    `| Paid for memes still held (USD at the Chainlink round of each buy) | ${usd(paid)} |`,
    `| Those memes today | ${usd(today)} |`,
    `| Same money in NVDA Stock Tokens at each buy, valued now | ${usd(cf)} |`,
    `| Gap: NVDA path minus meme path (positive means NVDA would have done better) | ${usd(cf - today)} |`,
    "",
    `**${nvdaWins} of ${priced.length}** priced wallets would be better off today had the same money gone into NVDA Stock Tokens. The rest are ahead on their memes at this block. Terra Firma reports either outcome as measured.`,
    "",
    "## Wallet by wallet (largest NVDA advantage first)",
    "",
    "| Wallet | Memes held | Paid | Today | Had it been NVDA | Gap | Card |",
    "|---|---|---|---|---|---|---|",
    ...top10.map((r) => `| \`${short(r.wallet)}\` | ${r.memes.join(", ")} | ${usd(r.paid)} | ${usd(r.today)} | ${usd(r.cf)} | ${usd(regret(r))} | [card](${SITE}/card/${r.wallet}) |`),
    "",
    "## Method",
    "",
    "- Holders: balances rebuilt from every `Transfer` log of each token, registry first block to the snapshot block. Addresses with contract code (pools, routers, lockers) are skipped; EIP-7702 delegated wallets count as wallets.",
    "- Cards: each wallet's numbers come from the live `/api/hindsight` route, the same code that renders `/card/<address>`. Every buy is priced with the Chainlink ETH/USD (or USDG/USD) round in effect at that block; the NVDA path uses the NVDA Stock Token feed round at the same time. Anyone can recompute a card onchain with `HindsightLens.recompute`.",
    "",
    "## Caveats",
    "",
    "- Gross buys of memes still held. Sells and transfers out are not netted. This is not profit and loss.",
    "- Buys paid with assets outside ETH, WETH, USDG or the curated stocks are shown as unpriced on a card and are not in these sums. Nothing is estimated.",
    `- Wallets excluded from the sums: ${excluded.length}${excluded.length ? ` (${excluded.map((e) => `\`${short(e.wallet)}\` ${e.reason}`).join("; ")})` : ""}.`,
    ...(skipped.length ? [`- Not covered in this snapshot: ${skipped.join(", ")}. Their full Transfer history is too large to rebuild within this run's time box on a shared public RPC; rerunning the script resumes the cached scan and adds them.`] : []),
    "- Live numbers move; rerun the script to get a new block-numbered snapshot.",
    "",
  ].join("\n");
  writeFileSync(path.join(ROOT, "submission", "regret-index.md"), md);
  console.log(JSON.stringify({ head, covered, skipped, nvdaWins, wallets: holders.size, priced: priced.length, paid: usd(paid), today: usd(today), cf: usd(cf), secs, excluded: excluded.length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
