// File: web/lib/rounds.ts
// [VERIFIED] round layout: roundId = (1 << 64) | n (phase 1 for all used feeds); NVDA/USD n <= 24 scaled
// (usd8 = raw / 1e8 when raw > 1e15, on every stock history feed). Tables are built by scripts/build-rounds.ts into web/data/rounds/*.json.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decodeFunctionResult, encodeFunctionData, type Address } from "viem";
import { rpc } from "./rpc";

export type RoundRow = [n: number, answer8: string, updatedAt: number];
export interface RoundTable {
  feed: Address;
  decimals: 8;
  phase: 1;
  rounds: RoundRow[];
}

export const PHASE_BASE = 1n << 64n;
export const NVDA_HISTORY_FEED = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";

const aggAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const cache = new Map<string, RoundTable>();

export async function loadTable(feed: Address): Promise<RoundTable> {
  const key = feed.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const file = path.join(process.cwd(), "data", "rounds", `${key}.json`);
  const t = JSON.parse(await readFile(file, "utf8")) as RoundTable;
  cache.set(key, t);
  return t;
}

/** Early rounds of every stock history feed are 1e16-scaled; mirrors StockOracle.historicalAnswer8 (threshold 1e15). */
export function normalize8(_feed: string, _n: number, raw: bigint): bigint {
  return raw > 10n ** 15n ? raw / 10n ** 8n : raw;
}

/** The round in effect at `ts` (last round with updatedAt <= ts). Throws if ts precedes the feed. */
export function roundAt(t: RoundTable, ts: number): { roundId: bigint; price8: bigint; updatedAt: number } {
  const r = t.rounds;
  let lo = 0;
  let hi = r.length - 1;
  if (r.length === 0 || r[0][2] > ts) throw new Error(`no round before ${ts} for ${t.feed}`);
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (r[mid][2] <= ts) lo = mid;
    else hi = mid - 1;
  }
  const [n, a, at] = r[lo];
  return { roundId: PHASE_BASE + BigInt(n), price8: BigInt(a), updatedAt: at };
}

const getRoundAbi = [
  {
    type: "function",
    name: "getRoundData",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint80" }],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

async function roundData(feed: Address, n: number): Promise<{ price8: bigint; updatedAt: number }> {
  const data = encodeFunctionData({ abi: getRoundAbi, functionName: "getRoundData", args: [PHASE_BASE + BigInt(n)] });
  const raw = await rpc<`0x${string}`>("eth_call", [{ to: feed, data }, "latest"]);
  const [, answer, , updatedAt] = decodeFunctionResult({ abi: getRoundAbi, functionName: "getRoundData", data: raw });
  return { price8: answer, updatedAt: Number(updatedAt) };
}

/**
 * Round in effect at `ts`, exact even when `ts` is newer than the committed table: rounds after the table's last row
 * are read live (binary search between the last table round and the latest round), so HindsightLens.recompute on the
 * same inputs never reverts BadRound for a recent buy. Returns null when `ts` precedes the feed (row goes "unpriced").
 */
export async function roundAtLive(t: RoundTable, ts: number) {
  const rows = t.rounds;
  if (rows.length === 0 || rows[0][2] > ts) return null;
  const last = rows[rows.length - 1];
  const nOf = (id: bigint) => Number(id & ((1n << 64n) - 1n));
  // Case 1: ts is before the table's last row, so the next round is in the table and the answer is exact.
  if (ts < last[2]) {
    const r = roundAt(t, ts);
    return { ...r, price8: normalize8(t.feed, nOf(r.roundId), r.price8) };
  }
  // Case 2: no newer round exists onchain, or the latest round is not after ts.
  const latest = await latestPrice8(t.feed);
  const latestN = nOf(latest.roundId);
  if (latestN <= last[0]) return { roundId: PHASE_BASE + BigInt(last[0]), price8: BigInt(last[1]), updatedAt: last[2] };
  if (latest.updatedAt <= ts) return { roundId: latest.roundId, price8: normalize8(t.feed, latestN, latest.price8), updatedAt: latest.updatedAt };
  // Case 3: binary-search the live rounds between the table's last row and the latest round.
  let lo = last[0];
  let hi = latestN - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const r = await roundData(t.feed, mid);
    if (r.updatedAt !== 0 && r.updatedAt <= ts) lo = mid;
    else hi = mid - 1;
  }
  const r = lo === last[0] ? { price8: BigInt(last[1]), updatedAt: last[2] } : await roundData(t.feed, lo);
  return { roundId: PHASE_BASE + BigInt(lo), price8: normalize8(t.feed, lo, r.price8), updatedAt: r.updatedAt };
}

/** Live latest price (8dp) straight from the feed; used for "today" values. */
export async function latestPrice8(feed: Address): Promise<{ roundId: bigint; price8: bigint; updatedAt: number }> {
  const data = encodeFunctionData({ abi: aggAbi, functionName: "latestRoundData" });
  const raw = await rpc<`0x${string}`>("eth_call", [{ to: feed, data }, "latest"]);
  const [roundId, answer, , updatedAt] = decodeFunctionResult({ abi: aggAbi, functionName: "latestRoundData", data: raw });
  return { roundId, price8: answer, updatedAt: Number(updatedAt) };
}
