"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, short, token } from "@/lib/ui-format";
import { only } from "@/lib/ui-logs";
import { useTfLogs } from "./hooks";
import { Button, Skeleton, Stat, TxLink, inputCls } from "./ui";

/** Live protocol counters, each linking to the contract that holds the number. */
export function Counters() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const pre = <span className="text-base font-normal text-muted">Not live yet</span>;
  const val = (ready: boolean, v: () => string) => (!DEPLOYED ? pre : ready ? v() : <Skeleton w="5rem" h="1.6rem" />);
  const [burned, toStock] = reads.data ?? [];
  const trades = logs.data ? only(logs.data.router, "Traded").length : 0;
  const jars = logs.data ? new Set(only(logs.data.jar, "Credited").map((l) => l.args.user.toLowerCase())).size : 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="$WIF burned" href={addrUrl(TF.FeePool)} value={val(burned?.status === "success", () => token(burned!.result as bigint))} sub="FeePool.totalWifBurned" />
      <Stat label="Stock streamed" href={addrUrl(TF.FeePool)} value={val(toStock?.status === "success", () => `${eth(toStock!.result as bigint)} ETH`)} sub="FeePool.totalEthToStock" />
      <Stat label="Routed trades" href={addrUrl(TF.TerraRouter)} value={val(!!logs.data, () => trades.toLocaleString("en-US"))} sub="Traded events" />
      <Stat label="Jars" href={addrUrl(TF.Jar)} value={val(!!logs.data, () => jars.toLocaleString("en-US"))} sub="Distinct wallets credited" />
    </div>
  );
}

interface StreamEvent {
  type: "traded" | "swept" | "converted" | "distributed" | "credited" | "cardMinted";
  tx: string;
  block: number;
  args: Record<string, string | boolean | string[]>;
}

const stockSym = (id?: string) => STOCKS[Number(id ?? 0)]?.symbol ?? "stock";

function describe(e: StreamEvent): string {
  const a = e.args;
  switch (e.type) {
    case "traded":
      return `${short(String(a.user))} ${a.isBuy ? "bought" : "sold"} a meme for ${eth(String(a.ethAmount))} ETH`;
    case "swept":
      return `${short(String(a.user))} swept ${eth(String(a.ethIn))} ETH into ${stockSym(String(a.stockId))}`;
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

/** Server-Sent Events from /api/stream (the RPC endpoint never reaches the browser). */
export function LiveTicker() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!DEPLOYED) return;
    const es = new EventSource("/api/stream");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as StreamEvent | { type: "hello" };
      if (e.type === "hello") return;
      setEvents((prev) => (prev.some((p) => p.tx === (e as StreamEvent).tx && p.type === e.type) ? prev : [e as StreamEvent, ...prev].slice(0, 8)));
    };
    return () => es.close();
  }, []);
  return (
    <section aria-labelledby="ticker-title" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 id="ticker-title" className="text-sm font-semibold">Live from the chain</h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={`size-2 rounded-full ${live ? "bg-accent" : "bg-line"}`} />
          {!DEPLOYED ? "Starts at deploy" : live ? "Streaming" : "Reconnecting"}
        </span>
      </div>
      <ul aria-live="polite" className="mt-3 space-y-2 text-sm">
        {events.length === 0 && <li className="text-muted">{DEPLOYED ? "Waiting for the next Terra Firma event…" : "No events until the contracts are live."}</li>}
        {events.map((e) => (
          <li key={`${e.tx}-${e.type}`} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span>{describe(e)}</span>
            <TxLink hash={e.tx} className="text-xs text-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "or look up any wallet" (0x only, validated before any request). */
export function AddressLookup() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  return (
    <form
      className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        const a = v.trim();
        if (!isAddress(a)) return setErr(true);
        router.push(`/card/${a}`);
      }}
    >
      <label htmlFor="lookup" className="sr-only">Wallet address</label>
      <input
        id="lookup"
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        placeholder="or look up any wallet: 0x…"
        className={`${inputCls} font-mono text-sm sm:flex-1 sm:w-auto`}
        aria-invalid={err}
        aria-describedby={err ? "lookup-err" : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" variant="secondary">Look up</Button>
      {err && <p id="lookup-err" role="alert" className="text-sm text-danger sm:basis-full">Enter a 0x address (42 characters).</p>}
    </form>
  );
}
