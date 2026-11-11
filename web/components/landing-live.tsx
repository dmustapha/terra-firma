"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, short, token } from "@/lib/ui-format";
import { mergeTicker, only, parseFrame, toTickerEvents, type TfLogs, type TickerEvent } from "@/lib/ui-logs";
import { useTfLogs } from "./hooks";
import { ExtLink, Skeleton, TxLink } from "./ui";

const UNAVAILABLE = <span className="text-danger">couldn&apos;t be read right now</span>;
const PRE = <span className="italic text-muted">not live yet</span>;

/** One figure in the edition line. Linked to the explorer page holding the number once the contracts are live. */
function Figure({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  return (
    <li className="flex min-h-11 items-baseline gap-2 py-1.5 sm:px-5 sm:first:pl-0">
      <span className="num text-lg font-semibold">
        {href ? <ExtLink href={href}>{value}</ExtLink> : value}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </li>
  );
}

/** The edition figures: live protocol totals as one ruled line of plain words. Errors show, never shimmer forever (S5). */
export function EditionFigures() {
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
    !DEPLOYED ? PRE : r?.status === "success" ? f(r.result as bigint) : reads.error || r?.status === "failure" ? UNAVAILABLE : <Skeleton w="4rem" h="1.2rem" />;
  const logVal = (f: (l: TfLogs) => number) =>
    !DEPLOYED ? PRE : logs.data ? f(logs.data).toLocaleString("en-US") : logs.error ? UNAVAILABLE : <Skeleton w="3rem" h="1.2rem" />;
  const href = (a: string) => (DEPLOYED ? addrUrl(a) : undefined);
  if (!DEPLOYED)
    return (
      <section aria-labelledby="figures-title" className="border-y border-line-strong py-3">
        <p className="leading-relaxed">
          <span id="figures-title" className="font-display text-xl italic">Edition figures.</span>{" "}
          <span className="text-muted">
            $WIF bought with fees and burned, ETH streamed into stock for stakers, trades routed through Terra Firma and wallets with a Jar are read live here once the
            contracts are on Robinhood Chain. Until then nothing is shown in their place (see the{" "}
          </span>
          <Link href="/proof" className="rounded-sm font-semibold text-accent underline decoration-accent-32 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">Proof page</Link>
          <span className="text-muted">).</span>
        </p>
      </section>
    );
  return (
    <section aria-labelledby="figures-title" className="border-y border-line-strong py-3">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-6">
        <h2 id="figures-title" className="shrink-0 font-display text-xl italic">Edition figures</h2>
        <ul className="flex flex-col sm:flex-row sm:flex-wrap sm:divide-x sm:divide-line">
          <Figure label="$WIF bought with fees and burned" href={href(TF.FeePool)} value={readVal(burned, (v) => token(v))} />
          <Figure label="streamed into stock for stakers" href={href(TF.FeePool)} value={readVal(toStock, (v) => `${eth(v)} ETH`)} />
          <Figure label="trades routed through Terra Firma" href={href(TF.TerraRouter)} value={logVal((l) => only(l.router, "Traded").length)} />
          <Figure label="wallets with a Jar" href={href(TF.Jar)} value={logVal((l) => new Set(only(l.jar, "Credited").map((x) => x.args.user.toLowerCase())).size)} />
        </ul>
      </div>
      <p className="mt-1 text-sm text-muted">
        {DEPLOYED ? "Read live from Robinhood Chain, including the team's own demo trades (their wallets are listed on the " : "These fill in once the contracts are live on Robinhood Chain. Until then nothing is shown in their place (see the "}
        <Link href="/proof" className="rounded-sm font-semibold text-accent underline decoration-accent-32 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">Proof page</Link>).
      </p>
    </section>
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
      return `Epoch ${a.epoch} paid out: ${token(String(a.wifBurned))} $WIF burned`;
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
function useDispatches() {
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
  return { events: mergeTicker(live, backfill(logs.data), 8), status };
}

/** "Dispatches": the latest real Terra Firma events as a still column. No marquee, no auto-scroll. */
export function Dispatches({ className }: { className?: string }) {
  const { events, status } = useDispatches();
  const state = !DEPLOYED ? "Starts when the contracts are live" : status === "live" ? "Arriving live" : status === "connecting" ? "Connecting" : "Reconnecting";
  return (
    <section aria-labelledby="dispatch-title" className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-fg pb-2">
        <h2 id="dispatch-title" className="font-display text-deck">Dispatches</h2>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span aria-hidden className={`size-2 rounded-full border border-accent ${status === "live" && DEPLOYED ? "bg-accent" : "bg-transparent"}`} />
          {state}
        </span>
      </div>
      <ul aria-live="polite" className="text-[0.9375rem] lg:columns-2 lg:gap-x-10 lg:[column-rule:1px_solid_var(--line)]">
        {events.length === 0 && (
          <li className="py-3 text-muted">{DEPLOYED ? "No dispatches yet. The next Terra Firma transaction will appear here." : "No dispatches until the contracts are live. Nothing is simulated in the meantime."}</li>
        )}
        {events.map((e) => (
          <li key={`${e.tx}-${e.type}`} className="flex break-inside-avoid flex-wrap items-baseline justify-between gap-x-3 border-b border-line py-1.5">
            <span>{describe(e)}</span>
            <TxLink hash={e.tx} className="inline-flex min-h-11 items-center text-xs text-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Kept for /proof, which shows the same column. */
export const LiveTicker = Dispatches;

export { AddressLookup } from "./address-lookup";
