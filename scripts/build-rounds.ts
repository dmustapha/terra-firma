// File: scripts/build-rounds.ts
// Builds web/data/rounds/<feed-lowercase>.json (type RoundTable in web/lib/rounds.ts) for ETH/USD, USDG/USD and every
// curated stock's history feed: every round n = 1..latest of phase 1 via Multicall3 aggregate3 (30 getRoundData each).
// Early 18dp-scaled answers (> 1e15) are normalized to 8dp (answer / 1e8): spike-indexing.md found this on NVDA/USD
// n <= 24; this build found the same leading block on TSLA, GOOGL, SNDK, SPY and QQQ (VERIFIED 2026-11-11, boundary
// ratio ~1e-8 raw, ~1.00 after /1e8). Each feed's scaled rows must be a contiguous prefix that joins the 8dp series
// within 10%, or the build fails. Rows with answer <= 0 or updatedAt == 0 are skipped (counted, never filled in).
// Run: pnpm tsx scripts/build-rounds.ts [--update]   (--update appends rounds after the last stored n)
import { existsSync } from "node:fs";
import path from "node:path";
import { decodeFunctionResult, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { ADDR, STOCKS } from "../web/lib/config";
import type { RoundRow, RoundTable } from "../web/lib/rounds";
import { hasFlag, WEB_DATA } from "./lib/env";
import { readJson, writeJson } from "./lib/files";
import { client, RpcError, rpcChunked } from "./lib/rpc";

const PHASE_BASE = 1n << 64n;
const NVDA_HISTORY = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15".toLowerCase();
const PER_MULTICALL = 30;

const aggAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);
const mcAbi = parseAbi([
  "struct Call3 { address target; bool allowFailure; bytes callData; }",
  "struct Result { bool success; bytes returnData; }",
  "function aggregate3(Call3[] calls) payable returns (Result[] returnData)",
]);

type Stats = { fetched: number; skipped: number; failed: number; scaled: number[] };

async function feedHead(feed: Address) {
  const read = { address: feed, abi: aggAbi } as const;
  const [decimals, description, latest] = await Promise.all([
    client.readContract({ ...read, functionName: "decimals" }),
    client.readContract({ ...read, functionName: "description" }),
    client.readContract({ ...read, functionName: "latestRoundData" }),
  ]);
  const phase = latest[0] >> 64n;
  if (decimals !== 8) throw new Error(`${feed} decimals ${decimals} != 8`);
  if (phase !== 1n) throw new Error(`${feed} phase ${phase} != 1 (RoundTable is phase 1 only)`);
  return { description, latestN: Number(latest[0] - PHASE_BASE) };
}

const SCALED = 10n ** 15n; // an 8dp answer above $10M is impossible for these assets: it is the early 18dp encoding

function normalize(n: number, raw: bigint, stats: Stats): bigint {
  if (raw <= SCALED) return raw;
  stats.scaled.push(n);
  return raw / 10n ** 8n;
}

function multicallData(feed: Address, ns: number[]): Hex {
  const calls = ns.map((n) => ({
    target: feed,
    allowFailure: true,
    callData: encodeFunctionData({ abi: aggAbi, functionName: "getRoundData", args: [PHASE_BASE + BigInt(n)] }),
  }));
  return encodeFunctionData({ abi: mcAbi, functionName: "aggregate3", args: [calls] });
}

function decodeRows(feed: Address, ns: number[], raw: Hex, stats: Stats): RoundRow[] {
  const results = decodeFunctionResult({ abi: mcAbi, functionName: "aggregate3", data: raw });
  const rows: RoundRow[] = [];
  results.forEach((r, i) => {
    if (!r.success) return void stats.failed++;
    const [, answer, , updatedAt] = decodeFunctionResult({ abi: aggAbi, functionName: "getRoundData", data: r.returnData });
    if (answer <= 0n || updatedAt === 0n) return void stats.skipped++;
    stats.fetched++;
    rows.push([ns[i], normalize(ns[i], answer, stats).toString(), Number(updatedAt)]);
  });
  return rows;
}

async function fetchRounds(feed: Address, fromN: number, toN: number, stats: Stats): Promise<RoundRow[]> {
  const groups: number[][] = [];
  for (let n = fromN; n <= toN; n += PER_MULTICALL) groups.push(Array.from({ length: Math.min(PER_MULTICALL, toN - n + 1) }, (_, i) => n + i));
  const res = await rpcChunked(
    groups.map((ns) => ({ method: "eth_call", params: [{ to: ADDR.multicall3, data: multicallData(feed, ns) }, "latest"] })),
    10,
  );
  return res.flatMap((r, i) => {
    if (r instanceof RpcError) throw new Error(`multicall ${feed} n ${groups[i][0]}..: ${r.message}`);
    return decodeRows(feed, groups[i], r as Hex, stats);
  });
}

/** Scaled rows must be rounds 1..k and round k+1 must continue the price within 10%. */
function assertScaledPrefix(t: RoundTable, scaled: number[]) {
  if (scaled.length === 0) return;
  const k = scaled.length;
  if (scaled.some((n, i) => n !== i + 1)) throw new Error(`${t.feed}: scaled rounds are not a 1..${k} prefix: ${scaled.slice(0, 5)}`);
  const i = t.rounds.findIndex((r) => r[0] === k);
  const [a, b] = [t.rounds[i], t.rounds[i + 1]];
  if (!b) throw new Error(`${t.feed}: no 8dp round after the scaled prefix`);
  const ratio = Number(b[1]) / Number(a[1]);
  if (ratio < 0.9 || ratio > 1.1) throw new Error(`${t.feed}: n=${k}->${b[0]} ratio ${ratio} after normalization`);
  console.log(`  scaled prefix n=1..${k} normalized /1e8; boundary n=${k} ${a[1]} -> n=${b[0]} ${b[1]} (x${ratio.toFixed(4)})`);
}

function assertNvdaBoundary(t: RoundTable) {
  if (t.feed.toLowerCase() !== NVDA_HISTORY) return;
  const at = (n: number) => t.rounds.find((r) => r[0] === n)?.[1];
  if (at(24) !== "20306520000" || at(25) !== "20344000000") throw new Error(`NVDA boundary check failed: n24=${at(24)} n25=${at(25)}`);
  console.log("  NVDA boundary OK: n=24 -> 20306520000, n=25 -> 20344000000");
}

function assertMonotonic(t: RoundTable) {
  for (let i = 1; i < t.rounds.length; i++) {
    const [a, b] = [t.rounds[i - 1], t.rounds[i]];
    if (b[0] <= a[0]) throw new Error(`${t.feed}: round order broken at n=${b[0]}`);
    if (b[2] < a[2]) throw new Error(`${t.feed}: updatedAt decreases at n=${b[0]}`);
  }
}

async function buildFeed(feed: Address, label: string, update: boolean) {
  const file = path.join(WEB_DATA, "rounds", `${feed.toLowerCase()}.json`);
  const prev = update && existsSync(file) ? readJson<RoundTable>(file) : null;
  const { description, latestN } = await feedHead(feed);
  const fromN = prev && prev.rounds.length > 0 ? prev.rounds[prev.rounds.length - 1][0] + 1 : 1;
  const stats: Stats = { fetched: 0, skipped: 0, failed: 0, scaled: [] };
  const fresh = fromN <= latestN ? await fetchRounds(feed, fromN, latestN, stats) : [];
  const table: RoundTable = { feed, decimals: 8, phase: 1, rounds: [...(prev?.rounds ?? []), ...fresh] };
  if (prev && stats.scaled.length > 0) throw new Error(`${feed}: new rounds look 18dp-scaled (${stats.scaled.slice(0, 3)}); rebuild without --update`);
  assertMonotonic(table);
  assertScaledPrefix(table, stats.scaled);
  assertNvdaBoundary(table);
  writeJson(file, table, false);
  const range = fromN <= latestN ? `n ${fromN}..${latestN}` : "up to date";
  console.log(
    `${label.padEnd(8)} ${feed} "${description}" ${range}: +${fresh.length} rows (total ${table.rounds.length}; skipped ${stats.skipped}, failed ${stats.failed}, normalized ${stats.scaled.length})`,
  );
}

async function main() {
  const update = hasFlag("--update");
  const feeds = new Map<string, { feed: Address; label: string }>();
  const add = (feed: Address, label: string) => feeds.has(feed.toLowerCase()) || feeds.set(feed.toLowerCase(), { feed, label });
  add(ADDR.ethUsd, "ETH/USD");
  add(ADDR.usdgUsd, "USDG/USD");
  for (const s of STOCKS) add(s.historyFeed, `${s.symbol}/USD`);
  for (const { feed, label } of feeds.values()) await buildFeed(feed, label, update);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
