// File: scripts/build-registry.ts
// Builds web/data/memes.json (type Registry in web/lib/registry.ts) from chain state:
//   meme list  : research/spike-coverage.md coverage table (top 20 + extras), $WIF excluded (the UI buys it via its own key)
//   decimals   : decimals() onchain          firstBlock: block of the token's first mint Transfer(0x0 -> *)
//   pools      : v2 factory getPair, v3 factory getPool (100/500/3000/10000) vs WETH, v4 native-ETH keys from
//                research/spike-pool-keys.json + PoolManager Initialize logs for any DexScreener v4 ETH pool not in that file
//   liquidity  : DexScreener token-pairs by pool address/id, else (v2/v3 only) 2 x WETH balance x Chainlink ETH/USD
//   tested     : a live ~$2 buy quote (V4Quoter / QuoterV2 / getAmountsOut) succeeded on a kept pool
// Run: pnpm tsx scripts/build-registry.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { decodeEventLog, encodeAbiParameters, getAddress, keccak256, parseAbi, type Address, type Hex } from "viem";
import { ADDR } from "../web/lib/config";
import type { Meme, PoolEntry, Registry } from "../web/lib/registry";
import { ROOT, WEB_DATA } from "./lib/env";
import { writeJson } from "./lib/files";
import { quotePools, ZERO } from "./lib/quote";
import { client, getLogsMany, headBlock, spans, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
const INITIALIZE = "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438" as Hex;
const PAD_ZERO = `0x${"0".repeat(64)}` as Hex;
const MIN_LIQ_USD = 500;
const V3_FEES = [100, 500, 3000, 10000] as const;

const abi = parseAbi([
  "function getPair(address,address) view returns (address)",
  "function getPool(address,address,uint24) view returns (address)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
]);

type SpikeKey = { c0: string; c1: string; fee: number; ts: number; hook: string; block: number };
type DexPair = { pairAddress: string; dexId: string; labels?: string[]; liquidity?: { usd?: number }; quoteToken: { address: string } };
type Candidate = { entry: PoolEntry; liqSource: string };

/** Rows `| n | SYM | \`0x..\` |` of the coverage table. */
function memeList(): { symbol: string; token: Address }[] {
  const md = readFileSync(path.join(ROOT, "research", "spike-coverage.md"), "utf8");
  const rows = [...md.matchAll(/^\|\s*\d+(?: \(extra\))?\s*\|\s*([^|]+?)\s*\|\s*`(0x[0-9a-fA-F]{40})`\s*\|/gm)];
  const list = rows.map((m) => ({ symbol: m[1], token: getAddress(m[2]) }));
  if (list.length < 20) throw new Error(`coverage table parse found only ${list.length} rows`);
  return list.filter((m) => m.token.toLowerCase() !== ADDR.wif.toLowerCase());
}

const poolId = (k: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }) =>
  keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
      [k.currency0, k.currency1, k.fee, k.tickSpacing, k.hooks],
    ),
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dexPairs(token: Address): Promise<DexPair[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/robinhood/${token}`, { headers: { "user-agent": "terra-firma-scripts/1.0" } });
    if (res.ok) return (await res.json()) as DexPair[];
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`DexScreener failed for ${token}`);
}

async function firstBlocks(tokens: Address[], head: number): Promise<Map<string, number>> {
  const queries = tokens.flatMap((t) => spans(0, head, 10_000_000).map(([from, to]) => ({ address: t, topics: [TRANSFER, PAD_ZERO], from, to })));
  const logs = await getLogsMany(queries);
  const first = new Map<string, number>();
  for (const l of logs) {
    const k = l.address.toLowerCase();
    const b = Number(l.blockNumber);
    if (!first.has(k) || b < first.get(k)!) first.set(k, b);
  }
  return first;
}

async function v2v3Pools(token: Address): Promise<{ kind: 1 | 2; pool: Address; fee: number }[]> {
  const pair = client.readContract({ address: ADDR.v2Factory, abi, functionName: "getPair", args: [token, ADDR.weth] });
  const v3 = V3_FEES.map((fee) => client.readContract({ address: ADDR.v3Factory, abi, functionName: "getPool", args: [token, ADDR.weth, fee] }));
  const [p2, ...p3] = await Promise.all([pair, ...v3]);
  const out: { kind: 1 | 2; pool: Address; fee: number }[] = [];
  if (p2 !== ZERO) out.push({ kind: 1, pool: p2, fee: 3000 });
  p3.forEach((p, i) => p !== ZERO && out.push({ kind: 2, pool: p, fee: V3_FEES[i] }));
  return out;
}

/** Resolve v4 pool ids to keys from PoolManager Initialize logs (one value per topic position, 10M spans). */
async function resolveV4(ids: Hex[], head: number): Promise<Map<string, SpikeKey>> {
  if (ids.length === 0) return new Map();
  const queries = ids.flatMap((id) =>
    spans(0, head, 10_000_000).map(([from, to]) => ({ address: ADDR.poolManager as Address, topics: [INITIALIZE, id], from, to })),
  );
  const logs: Log[] = await getLogsMany(queries);
  const out = new Map<string, SpikeKey>();
  for (const l of logs) {
    const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    if (ev.eventName !== "Initialize") continue;
    const a = ev.args;
    out.set(a.id.toLowerCase(), { c0: a.currency0, c1: a.currency1, fee: a.fee, ts: a.tickSpacing, hook: a.hooks, block: Number(l.blockNumber) });
  }
  return out;
}

const v4Entry = (id: Hex, k: SpikeKey, liquidityUsd: number): PoolEntry => ({
  kind: 3,
  version: "v4",
  id,
  key: { currency0: ZERO, currency1: getAddress(k.c1), fee: k.fee, tickSpacing: k.ts, hooks: getAddress(k.hook) },
  liquidityUsd,
});

async function v2v3Candidates(token: Address, liq: Map<string, number>, ethUsd: number): Promise<{ all: Address[]; cands: Candidate[] }> {
  const found = await v2v3Pools(token);
  const balances = await Promise.all(found.map((p) => client.readContract({ address: ADDR.weth, abi, functionName: "balanceOf", args: [p.pool] })));
  const cands = found.map((p, i): Candidate => {
    const dex = liq.get(p.pool.toLowerCase());
    const liquidityUsd = Math.round(dex ?? (Number(balances[i]) / 1e18) * 2 * ethUsd);
    const entry: PoolEntry =
      p.kind === 1
        ? { kind: 1, version: "v2", pool: p.pool, quote: "WETH", liquidityUsd }
        : { kind: 2, version: "v3", pool: p.pool, fee: p.fee, quote: "WETH", liquidityUsd };
    return { entry, liqSource: dex !== undefined ? "dexscreener" : "2xWETH*ETHUSD" };
  });
  return { all: found.map((p) => p.pool), cands };
}

function v4Candidates(token: Address, keys: Map<string, SpikeKey>, liq: Map<string, number>, dropped: string[]): Candidate[] {
  const out: Candidate[] = [];
  for (const [id, k] of keys) {
    if (k.c0 !== ZERO.toLowerCase() || k.c1.toLowerCase() !== token.toLowerCase()) continue;
    const entry = v4Entry(id as Hex, k, Math.round(liq.get(id) ?? -1));
    if (poolId((entry as Extract<PoolEntry, { kind: 3 }>).key) !== id) throw new Error(`pool id mismatch for ${id}`);
    if (!liq.has(id)) dropped.push(`v4 ${id.slice(0, 10)} liquidity unknown (not on DexScreener)`);
    else out.push({ entry, liqSource: "dexscreener" });
  }
  return out;
}

interface Ctx {
  head: number;
  ethUsd: number;
  buyWei: bigint;
  spikeKeys: Map<string, SpikeKey>;
  firstBlock: Map<string, number>;
  sources: Set<string>;
}

async function buildMeme(m: { symbol: string; token: Address }, ctx: Ctx): Promise<Meme & { liq: number }> {
  const pairs = await dexPairs(m.token);
  const liq = new Map(pairs.map((p) => [p.pairAddress.toLowerCase(), p.liquidity?.usd ?? 0]));
  for (const p of pairs) if (/^0x[0-9a-fA-F]{40}$/.test(p.pairAddress)) ctx.sources.add(getAddress(p.pairAddress));

  const missing = pairs
    .filter((p) => p.pairAddress.length === 66 && p.quoteToken.address.toLowerCase() === ZERO.toLowerCase() && !ctx.spikeKeys.has(p.pairAddress.toLowerCase()))
    .filter((p) => (p.liquidity?.usd ?? 0) >= MIN_LIQ_USD)
    .map((p) => p.pairAddress.toLowerCase() as Hex);
  for (const [id, k] of await resolveV4(missing, ctx.head)) ctx.spikeKeys.set(id, k);

  const dropped: string[] = [];
  const { all, cands: v23 } = await v2v3Candidates(m.token, liq, ctx.ethUsd);
  all.forEach((a) => ctx.sources.add(a));
  const cands = [...v23, ...v4Candidates(m.token, ctx.spikeKeys, liq, dropped)].filter((c) => {
    if (c.entry.liquidityUsd >= MIN_LIQ_USD) return true;
    dropped.push(`${c.entry.version} ${label(c.entry)} $${c.entry.liquidityUsd} < $${MIN_LIQ_USD}`);
    return false;
  });

  const quotes = await quotePools(m.token, cands.map((c) => c.entry), "buy", ctx.buyWei);
  const kept: PoolEntry[] = [];
  quotes.forEach((q, i) => {
    if ("error" in q) dropped.push(`${q.pool.version} ${label(q.pool)} quote failed: ${q.error}`);
    else if (q.amountOut === 0n) dropped.push(`${q.pool.version} ${label(q.pool)} quote returned 0`);
    else {
      kept.push(q.pool);
      console.log(`  keep ${q.pool.version} ${label(q.pool)} liq $${q.pool.liquidityUsd} (${cands[i].liqSource}) $2 buy -> ${q.amountOut}`);
    }
  });
  dropped.forEach((d) => console.log(`  drop ${d}`));
  kept.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

  const [decimals, symbol] = await Promise.all([
    client.readContract({ address: m.token, abi, functionName: "decimals" }),
    client.readContract({ address: m.token, abi, functionName: "symbol" }),
  ]);
  const firstBlock = ctx.firstBlock.get(m.token.toLowerCase());
  if (firstBlock === undefined) console.log(`  WARN no mint Transfer found for ${m.symbol}; firstBlock = 0 (full-history scan)`);
  return {
    token: m.token,
    symbol,
    decimals,
    firstBlock: firstBlock ?? 0,
    pools: kept,
    tested: kept.length > 0,
    taxed: false, // no quote-vs-transfer simulation is possible here; never claimed either way (see report)
    liq: kept.reduce((s, p) => s + p.liquidityUsd, 0),
  };
}

const label = (p: PoolEntry) => (p.kind === 3 ? `${p.id.slice(0, 10)} fee ${p.key.fee} ts ${p.key.tickSpacing}` : `${p.pool} fee ${"fee" in p ? p.fee : 3000}`);

async function ethUsdNow(): Promise<{ ethUsd: number; buyWei: bigint }> {
  const [, answer, , updatedAt] = await client.readContract({ address: ADDR.ethUsd, abi, functionName: "latestRoundData" });
  if (answer <= 0n) throw new Error("ETH/USD answer <= 0");
  console.log(`ETH/USD ${Number(answer) / 1e8} (updatedAt ${new Date(Number(updatedAt) * 1000).toISOString()})`);
  return { ethUsd: Number(answer) / 1e8, buyWei: (2n * 10n ** 26n) / answer }; // ~$2 of ETH
}

async function main() {
  const memes = memeList();
  console.log(`memes from coverage table (WIF excluded): ${memes.length}`);
  const head = await headBlock();
  const { ethUsd, buyWei } = await ethUsdNow();
  const raw = JSON.parse(readFileSync(path.join(ROOT, "research", "spike-pool-keys.json"), "utf8")) as Record<string, SpikeKey>;
  const spikeKeys = new Map(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
  const firstBlock = await firstBlocks(memes.map((m) => m.token), head);
  const sources = new Set<string>([ADDR.universalRouter, ADDR.universalRouter212, ADDR.poolManager, ...deployedRouter()].map((a) => getAddress(a)));
  const ctx: Ctx = { head, ethUsd, buyWei, spikeKeys, firstBlock, sources };

  const built: (Meme & { liq: number })[] = [];
  for (const m of memes) {
    console.log(`${m.symbol} ${m.token}`);
    built.push(await buildMeme(m, ctx));
  }
  built.sort((a, b) => b.liq - a.liq);
  const registry: Registry = {
    version: 1,
    builtAt: new Date().toISOString(),
    memes: built.map(({ liq: _liq, ...m }) => m),
    sources: await withCode([...sources] as Address[]),
  };
  writeJson(path.join(WEB_DATA, "memes.json"), registry);
  summarize(registry, head);
}

/** TerraRouter forwards bought memes to the buyer (Transfer.from = router): a purchase source once deployed. */
function deployedRouter(): Address[] {
  const d = JSON.parse(readFileSync(path.join(WEB_DATA, "deployments.json"), "utf8")) as { deployed?: boolean; TerraRouter?: string };
  if (d.deployed !== true || !d.TerraRouter || /^0x0{40}$/i.test(d.TerraRouter)) return [];
  console.log(`sources: + TerraRouter ${d.TerraRouter}`);
  return [getAddress(d.TerraRouter)];
}

/** Keep only source addresses that are contracts (DexScreener pair ids are data, not trusted). */
async function withCode(addrs: Address[]): Promise<Address[]> {
  const codes = await Promise.all(addrs.map((a) => client.getCode({ address: a })));
  const out = addrs.filter((_, i) => codes[i] && codes[i] !== "0x");
  if (out.length !== addrs.length) console.log(`sources: dropped ${addrs.length - out.length} without code`);
  return out;
}

function summarize(r: Registry, head: number) {
  const count = (k: 1 | 2 | 3) => r.memes.reduce((s, m) => s + m.pools.filter((p) => p.kind === k).length, 0);
  console.log(`\nwrote web/data/memes.json at head ${head}`);
  console.log(`memes ${r.memes.length} (tested ${r.memes.filter((m) => m.tested).length}); pools v2 ${count(1)} v3 ${count(2)} v4 ${count(3)}; sources ${r.sources.length}`);
  for (const m of r.memes) console.log(`  ${m.symbol.padEnd(10)} pools ${m.pools.length} tested ${m.tested} firstBlock ${m.firstBlock}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
