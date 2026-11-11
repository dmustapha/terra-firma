"use client";

import { useEffect, useRef, useState } from "react";
import { useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, short, token } from "@/lib/ui-format";
import { mergeTicker, only, parseFrame, toTickerEvents, type TfLogs, type TickerEvent } from "@/lib/ui-logs";
import { useTfLogs } from "./hooks";
import { Skeleton, Stat, TxLink } from "./ui";

const UNAVAILABLE = <span className="text-base font-normal text-danger">RPC unavailable</span>;
const PRE = <span className="text-base font-normal text-muted">Not live yet</span>;

/** Live protocol counters, each linking to the contract that holds the number. Errors show, never shimmer forever (S5). */
export function Counters() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const [burned, toStock] = reads.data ?? [];
  const readVal = (r: typeof burned, f: (v: bigint) => string) =>
    !DEPLOYED ? PRE : r?.status === "success" ? f(r.result as bigint) : reads.error || r?.status === "failure" ? UNAVAILABLE : <Skeleton w="5rem" h="1.6rem" />;
  const logVal = (f: (l: TfLogs) => number) =>
    !DEPLOYED ? PRE : logs.data ? f(logs.data).toLocaleString("en-US") : logs.error ? UNAVAILABLE : <Skeleton w="5rem" h="1.6rem" />;
  const href = (a: string) => (DEPLOYED ? addrUrl(a) : undefined);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="$WIF burned" href={href(TF.FeePool)} value={readVal(burned, (v) => token(v))} sub="FeePool.totalWifBurned" />
      <Stat label="Stock streamed" href={href(TF.FeePool)} value={readVal(toStock, (v) => `${eth(v)} ETH`)} sub="FeePool.totalEthToStock" />
      <Stat label="Routed trades" href={href(TF.TerraRouter)} value={logVal((l) => only(l.router, "Traded").length)} sub="Traded events" />
      <Stat label="Jars" href={href(TF.Jar)} value={logVal((l) => new Set(only(l.jar, "Credited").map((x) => x.args.user.toLowerCase())).size)} sub="Distinct wallets credited" />
    </div>
  );
}

const stockSym = (id?: string) => STOCKS[Number(id ?? 0)]?.symbol ?? "stock";

function describe(e: TickerEvent): string {
  const a = e.args;
  switch (e.type) {
    case "traded":
      return `${short(String(a.user))} ${a.isBuy ? "bought" : "sold"} a meme for ${eth(String(a.ethAmount))} ETH`;
    case "swept":
      return `${short(String(a.user))} swept ${eth(String(a.ethIn))} ETH into ${stockSym(String(a.stockId))}`;
    case "deposited":
      return `${short(String(a.user))} deposited ${eth(String(a.ethIn))} ETH into ${stockSym(String(a.stockId))}`;
    case "converted":
      return `${short(String(a.user))} converted ${a.memes} meme${a.memes === "1" ? "" : "s"} into ${stockSym(String(a.stockId))}`;
    case "distributed":
      return `Epoch ${a.epoch} distributed: ${token(String(a.wifBurned))} $WIF burned`;
    case "credited":
      return `${short(String(a.user))}'s Jar was credited`;
    case "cardMinted":
      return `${short(String(a.wallet))} minted a Hindsight card`;
  }
}

/** Recent events from the incremental log scan: fills any gap the SSE stream missed across reconnects (S11). */
function backfill(l: TfLogs | undefined): TickerEvent[] {
  if (!l) return [];
  return mergeTicker(toTickerEvents([...l.router, ...l.feePool, ...l.jar, ...l.lens]), [], 8);
}

/** Server-Sent Events from /api/stream (the RPC endpoint never reaches the browser), merged with the log backfill. */
export function LiveTicker() {
  const [live, setLive] = useState<TickerEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const logs = useTfLogs();
  const drop = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!DEPLOYED) return;
    const es = new EventSource("/api/stream");
    es.onopen = () => {
      if (drop.current) clearTimeout(drop.current);
      setStatus("live");
    };
    // The server closes the stream every ~55 s and the browser reconnects in ~3 s: only flag a real outage.
    es.onerror = () => {
      if (drop.current) clearTimeout(drop.current);
      drop.current = setTimeout(() => setStatus("reconnecting"), 8000);
    };
    es.onmessage = (m) => {
      const e = parseFrame(m.data);
      if (e) setLive((prev) => mergeTicker([e], prev, 8));
    };
    return () => {
      if (drop.current) clearTimeout(drop.current);
      es.close();
    };
  }, []);
  const events = mergeTicker(live, backfill(logs.data), 8);
  return (
    <section aria-labelledby="ticker-title" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 id="ticker-title" className="text-sm font-semibold">Live from the chain</h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={`size-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
          {!DEPLOYED ? "Starts at deploy" : status === "live" ? "Streaming" : status === "connecting" ? "Connecting" : "Reconnecting"}
        </span>
      </div>
      <ul aria-live="polite" className="mt-3 space-y-1 text-sm">
        {events.length === 0 && <li className="text-muted">{DEPLOYED ? "Waiting for the next Terra Firma event…" : "No events until the contracts are live."}</li>}
        {events.map((e) => (
          <li key={`${e.tx}-${e.type}`} className="flex flex-wrap items-center justify-between gap-x-3">
            <span>{describe(e)}</span>
            <TxLink hash={e.tx} className="inline-flex min-h-11 items-center text-xs text-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export { AddressLookup } from "./address-lookup";
