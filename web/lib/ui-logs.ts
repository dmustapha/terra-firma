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

export async function getLogsChunked(address: Address[], from: bigint, to: bigint): Promise<Log[]> {
  const ranges: [bigint, bigint][] = [];
  for (let s = from; s <= to; s += CHUNK) ranges.push([s, s + CHUNK - 1n > to ? to : s + CHUNK - 1n]);
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
