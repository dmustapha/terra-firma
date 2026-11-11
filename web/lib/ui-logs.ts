// Client-side event index: every Terra Firma log since the deploy block, read straight from the public RPC
// in <= 100k-block chunks (batched 30 per POST), split on "too many results", then decoded per contract.
// Incremental: later calls only scan new blocks. Pre-deploy it returns empty lists without any request.
import { parseEventLogs, type Address, type Log, type ParseEventLogsReturnType } from "viem";
import { feePoolAbi, friendJarAbi, hindsightLensAbi, jarAbi, terraRouterAbi, wifStakingAbi } from "./abi";
import { TF } from "./config";
import { DEPLOYED, publicClient } from "./ui-chain";

const CHUNK = 100_000n;
const GROUP = 30;

export interface TfLogs {
  head: bigint;
  router: ParseEventLogsReturnType<typeof terraRouterAbi, undefined, true>;
  jar: ParseEventLogsReturnType<typeof jarAbi, undefined, true>;
  feePool: ParseEventLogsReturnType<typeof feePoolAbi, undefined, true>;
  staking: ParseEventLogsReturnType<typeof wifStakingAbi, undefined, true>;
  lens: ParseEventLogsReturnType<typeof hindsightLensAbi, undefined, true>;
  friend: ParseEventLogsReturnType<typeof friendJarAbi, undefined, true>;
}

const empty = (head = 0n): TfLogs => ({ head, router: [], jar: [], feePool: [], staking: [], lens: [], friend: [] });

/** Narrow a decoded log list to one event. */
export function only<L extends { eventName: string }, N extends L["eventName"]>(list: readonly L[], name: N) {
  return list.filter((l): l is Extract<L, { eventName: N }> => l.eventName === name);
}

async function rangeLogs(address: Address[], from: bigint, to: bigint, depth = 0): Promise<Log[]> {
  try {
    return await publicClient.getLogs({ address, fromBlock: from, toBlock: to });
  } catch (e) {
    if (depth > 6 || to <= from) throw e; // never treat an error as "no logs"
    const mid = (from + to) / 2n;
    const [a, b] = await Promise.all([rangeLogs(address, from, mid, depth + 1), rangeLogs(address, mid + 1n, to, depth + 1)]);
    return [...a, ...b];
  }
}

/** Inclusive [from, to] block ranges of at most `chunk` blocks. Empty when from > to. */
export function chunkRanges(from: bigint, to: bigint, chunk = CHUNK): [bigint, bigint][] {
  if (chunk <= 0n) throw new Error("chunk must be positive");
  const ranges: [bigint, bigint][] = [];
  for (let s = from; s <= to; s += chunk) ranges.push([s, s + chunk - 1n > to ? to : s + chunk - 1n]);
  return ranges;
}

export async function getLogsChunked(address: Address[], from: bigint, to: bigint): Promise<Log[]> {
  const ranges = chunkRanges(from, to);
  const out: Log[] = [];
  for (let i = 0; i < ranges.length; i += GROUP) {
    const part = await Promise.all(ranges.slice(i, i + GROUP).map(([a, b]) => rangeLogs(address, a, b)));
    out.push(...part.flat());
  }
  return out;
}

function decode(raw: Log[], head: bigint): TfLogs {
  const by = (a: Address) => raw.filter((l) => l.address.toLowerCase() === a.toLowerCase());
  return {
    head,
    router: parseEventLogs({ abi: terraRouterAbi, logs: by(TF.TerraRouter) }),
    jar: parseEventLogs({ abi: jarAbi, logs: by(TF.Jar) }),
    feePool: parseEventLogs({ abi: feePoolAbi, logs: by(TF.FeePool) }),
    staking: parseEventLogs({ abi: wifStakingAbi, logs: by(TF.WifStaking) }),
    lens: parseEventLogs({ abi: hindsightLensAbi, logs: by(TF.HindsightLens) }),
    friend: parseEventLogs({ abi: friendJarAbi, logs: by(TF.FriendJar) }),
  };
}

const WATCH: Address[] = [TF.TerraRouter, TF.Jar, TF.FeePool, TF.WifStaking, TF.HindsightLens, TF.FriendJar];
let cache: { to: bigint; raw: Log[] } | null = null;
let inflight: Promise<TfLogs> | null = null;

export function scanLogs(): Promise<TfLogs> {
  if (!DEPLOYED) return Promise.resolve(empty());
  inflight ??= (async () => {
    try {
      const head = await publicClient.getBlockNumber();
      const from = cache ? cache.to + 1n : BigInt(TF.block);
      const fresh = from <= head ? await getLogsChunked(WATCH, from, head) : [];
      cache = { to: head, raw: [...(cache?.raw ?? []), ...fresh] };
      return decode(cache.raw, head);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const times = new Map<bigint, number>();

/** Block timestamps (seconds), cached; requests are batched by the transport. */
export async function blockTimes(blocks: bigint[]): Promise<Map<bigint, number>> {
  const need = [...new Set(blocks)].filter((b) => !times.has(b));
  const got = await Promise.all(need.map((b) => publicClient.getBlock({ blockNumber: b })));
  got.forEach((b, i) => times.set(need[i], Number(b.timestamp)));
  return new Map(blocks.map((b) => [b, times.get(b)!]));
}

// ---- Pure helpers (unit-tested in ui-logs.test.ts) ----

/** Router events that put stock into a user's Jar. `Deposited` replaced `Swept` for TerraRouter.deposit. */
export const SAVING_EVENTS: ReadonlySet<string> = new Set(["Swept", "Converted", "Deposited"]);

type UserLog = { eventName: string; args: object };
const userOf = (l: UserLog) => (l.args as { user?: unknown }).user;

/** A user's Jar-building router events (sweep, convert, direct deposit). */
export function savingEventsOf<L extends UserLog>(router: readonly L[], user: string): L[] {
  const u = user.toLowerCase();
  return router.filter((l) => SAVING_EVENTS.has(l.eventName) && typeof userOf(l) === "string" && (userOf(l) as string).toLowerCase() === u);
}

/** Consecutive UTC days ending today (or yesterday, if today has none yet) that contain at least one timestamp. */
export function streakDays(timestamps: number[], nowMs: number): number {
  const days = new Set(timestamps.map((s) => Math.floor(s / 86400)));
  let d = Math.floor(nowMs / 86_400_000);
  if (!days.has(d)) d -= 1;
  let n = 0;
  while (days.has(d - n)) n++;
  return n;
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. A rejection is kept, not thrown. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

/** Ticker event, same shape /api/stream sends (bigints as decimal strings). */
export interface TickerEvent {
  type: "traded" | "swept" | "deposited" | "converted" | "distributed" | "credited" | "cardMinted";
  tx: string;
  block: number;
  args: Record<string, string | boolean | string[]>;
}

const KINDS: Record<string, TickerEvent["type"]> = {
  Traded: "traded",
  Swept: "swept",
  Deposited: "deposited",
  Converted: "converted",
  Distributed: "distributed",
  Credited: "credited",
  CardMinted: "cardMinted",
};

type DecodedLog = { eventName: string; args: object; transactionHash: string; blockNumber: bigint | number };

export const tickerKey = (e: Pick<TickerEvent, "tx" | "type">) => `${e.tx}-${e.type}`;

/** Decoded logs -> ticker events (unknown event names are dropped). */
export function toTickerEvents(logs: readonly DecodedLog[]): TickerEvent[] {
  return logs.flatMap((l) => {
    const type = KINDS[l.eventName];
    if (!type) return [];
    const args = JSON.parse(JSON.stringify(l.args, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
    return [{ type, tx: l.transactionHash, block: Number(l.blockNumber), args }];
  });
}

/** Merge live and backfilled events: de-duplicated by tx+type, newest block first, capped. */
export function mergeTicker(a: readonly TickerEvent[], b: readonly TickerEvent[], cap = 8): TickerEvent[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((e) => (seen.has(tickerKey(e)) ? false : (seen.add(tickerKey(e)), true)))
    .sort((x, y) => y.block - x.block)
    .slice(0, cap);
}

/** Safe SSE frame parse: a malformed frame yields null instead of throwing in the handler. */
export function parseFrame(data: string): TickerEvent | null {
  try {
    const e = JSON.parse(data) as { type?: unknown; tx?: unknown; block?: unknown; args?: unknown } | null;
    if (!e || typeof e !== "object" || typeof e.type !== "string" || typeof e.tx !== "string") return null;
    if (!Object.values(KINDS).includes(e.type as TickerEvent["type"])) return null;
    return { type: e.type as TickerEvent["type"], tx: e.tx, block: Number(e.block ?? 0), args: (e.args ?? {}) as TickerEvent["args"] };
  } catch {
    return null;
  }
}
