"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatUnits, parseUnits, type Abi, type Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { jarAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { dateTime, shares18, sig4, usd } from "@/lib/ui-format";
import { blockTimes, only } from "@/lib/ui-logs";
import { sharesOf, usdOf, type StockQuote } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { useMounted, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, LinkButton, Notice, Panel, Skeleton, Stat, TxLink, inputCls } from "./ui";

export const SOURCE: Record<number, string> = { 1: "convert", 2: "sweep", 3: "staking reward", 4: "deposit" };

export function JarView() {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!mounted) return <Skeleton w="100%" h="12rem" className="block" />;
  if (!address)
    return (
      <Panel className="flex flex-col items-start gap-4">
        <p className="text-lg">Connect a wallet to see your Jar.</p>
        <ConnectButton />
      </Panel>
    );
  return <Jar user={address} />;
}

function useJarBalances(user: Address) {
  return useReadContracts({
    contracts: STOCKS.map((s) => ({ address: TF.Jar, abi: jarAbi, functionName: "balanceOf", args: [user, s.token], chainId: CHAIN_ID }) as const),
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
}

/** Consecutive UTC days (ending today, or yesterday if today has none yet) with a Swept or Converted event. */
function useStreak(user: Address) {
  const logs = useTfLogs();
  return useQuery({
    queryKey: ["streak", user, logs.data?.head.toString()],
    enabled: !!logs.data,
    queryFn: async () => {
      const mine = logs.data!.router.filter((l) => (l.eventName === "Swept" || l.eventName === "Converted") && l.args.user.toLowerCase() === user.toLowerCase());
      if (mine.length === 0) return 0;
      const t = await blockTimes(mine.map((l) => l.blockNumber));
      const days = new Set([...t.values()].map((s) => Math.floor(s / 86400)));
      let d = Math.floor(Date.now() / 86_400_000);
      if (!days.has(d)) d -= 1;
      let n = 0;
      while (days.has(d - n)) n++;
      return n;
    },
  });
}

function QuicknodeBadge() {
  const q = useQuery({ queryKey: ["qn-jar"], queryFn: async () => (await fetch("/api/qn-jar")).json() as Promise<{ enabled: boolean; agreement?: boolean }>, enabled: DEPLOYED, staleTime: 120_000 });
  if (!q.data?.enabled || q.data.agreement === undefined) return null;
  return q.data.agreement ? <Badge tone="accent">Verified by Quicknode Stock Token API</Badge> : <Badge tone="warn">Quicknode check disagrees with direct reads</Badge>;
}

function Jar({ user }: { user: Address }) {
  const bals = useJarBalances(user);
  const market = useStockQuotes();
  const streak = useStreak(user);
  const rows = STOCKS.map((s, i) => {
    const raw = (bals.data?.[i]?.result as bigint | undefined) ?? 0n;
    const q = market.data?.[i];
    return { s, raw, q, usd: q ? usdOf(raw, q) : 0 };
  });
  const total = rows.reduce((a, r) => a + r.usd, 0);
  const loaded = !!bals.data && !!market.data;
  const empty = loaded && rows.every((r) => r.raw === 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <QuicknodeBadge />
        <Link href={`/jar/report/${user}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-accent">Weekly report</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Jar value" value={!DEPLOYED ? "Not live yet" : loaded ? usd(total) : <Skeleton w="6rem" h="1.6rem" />} sub="Chainlink live prices" href={DEPLOYED ? addrUrl(TF.Jar) : undefined} />
        <Stat label="Saving streak" value={!DEPLOYED ? "—" : streak.data === undefined ? <Skeleton w="3rem" h="1.6rem" /> : `${streak.data} day${streak.data === 1 ? "" : "s"}`} sub="UTC days with a sweep or convert" />
      </div>
      {!DEPLOYED && <Notice tone="warn">Your Jar opens when the Terra Firma contracts are live on mainnet.</Notice>}
      {empty ? (
        <Panel className="flex flex-col items-start gap-4">
          <p className="text-lg font-semibold">Your Jar is empty. Convert a meme or make a trade to start.</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/app">See your Hindsight card</LinkButton>
            <LinkButton href="/trade" variant="secondary">Trade a meme</LinkButton>
          </div>
        </Panel>
      ) : (
        DEPLOYED && (
          <Panel aria-labelledby="bal-title">
            <h2 id="bal-title" className="mb-4 font-semibold">Balances</h2>
            <ul className="divide-y divide-line">
              {rows.filter((r) => !loaded || r.raw > 0n).map((r) => (
                <BalanceRow key={r.s.symbol} stock={r.s} raw={r.raw} q={r.q} loaded={loaded} onDone={() => bals.refetch()} />
              ))}
            </ul>
          </Panel>
        )
      )}
      <History user={user} />
    </div>
  );
}

function BalanceRow({ stock, raw, q, loaded, onDone }: { stock: (typeof STOCKS)[number]; raw: bigint; q?: StockQuote; loaded: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const tx = useTx();
  const qc = useQueryClient();
  const sharesRaw = q ? sharesOf(raw, q) : 0n;
  const toRaw = (s: string) => {
    if (!q || !/^\d*\.?\d+$/.test(s.trim())) return null;
    const want = parseUnits(s.trim(), 18);
    const r = (want * 10n ** 18n) / q.multiplier;
    return r > raw ? null : r;
  };
  const amountRaw = amt === "max" ? raw : toRaw(amt);
  const withdraw = async () => {
    if (!amountRaw) return;
    const r = await tx.run([{ label: `Withdraw ${stock.symbol}`, call: { address: TF.Jar, abi: jarAbi as unknown as Abi, functionName: "withdraw", args: [stock.token, amountRaw] } }]);
    if (r) {
      onDone();
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      setAmt("");
    }
  };
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{stock.symbol} <span className="font-normal text-muted">{stock.name}</span></p>
          <p className="num text-sm text-muted">
            {loaded && q ? (
              <>
                {shares18(sharesRaw)} shares · <AddrLink addr={stock.liveFeed}>{usd(Number(formatUnits(q.price8, 8)))}</AddrLink> each
              </>
            ) : (
              <Skeleton w="10rem" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-lg font-semibold">{loaded && q ? usd(usdOf(raw, q)) : <Skeleton w="5rem" />}</span>
          <Button variant="secondary" aria-expanded={open} aria-controls={`wd-${stock.symbol}`} onClick={() => setOpen((o) => !o)} disabled={raw === 0n}>Withdraw</Button>
        </div>
      </div>
      {open && (
        <div id={`wd-${stock.symbol}`} className="mt-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`wd-in-${stock.symbol}`} className="sr-only">Shares to withdraw</label>
            <input id={`wd-in-${stock.symbol}`} inputMode="decimal" value={amt === "max" ? sig4(Number(formatUnits(sharesRaw, 18))) : amt} onChange={(e) => setAmt(e.target.value)} placeholder="Shares" className={`${inputCls} num sm:flex-1`} aria-invalid={amt !== "" && !amountRaw} />
            <Button variant="secondary" onClick={() => setAmt("max")}>Max</Button>
            <Button onClick={withdraw} disabled={!amountRaw || tx.busy}>{tx.busy ? "Working…" : "Withdraw to wallet"}</Button>
          </div>
          <p className="text-xs text-muted">Sends the real {stock.symbol} Stock Token to your wallet.</p>
          <TxStatus state={tx.state} onReset={tx.reset} success={`Withdrawn. The ${stock.symbol} is in your wallet.`} />
        </div>
      )}
    </li>
  );
}

function History({ user }: { user: Address }) {
  const logs = useTfLogs();
  const market = useStockQuotes();
  const mine = (logs.data?.jar ?? []).filter((l) => l.args.user.toLowerCase() === user.toLowerCase()).reverse();
  const times = useQuery({ queryKey: ["jar-times", user, mine.length], enabled: mine.length > 0, queryFn: () => blockTimes(mine.slice(0, 30).map((l) => l.blockNumber)) });
  const credited = only(mine, "Credited");
  const bySource = new Map<number, number>();
  for (const c of credited) {
    const i = STOCKS.findIndex((s) => s.token.toLowerCase() === c.args.stock.toLowerCase());
    const q = market.data?.[i];
    if (q) bySource.set(c.args.source, (bySource.get(c.args.source) ?? 0) + usdOf(c.args.amount, q));
  }
  if (!DEPLOYED) return null;
  return (
    <Panel aria-labelledby="hist-title">
      <h2 id="hist-title" className="font-semibold">Where your stock came from</h2>
      {logs.isLoading ? (
        <Skeleton w="100%" h="4rem" className="mt-3 block" />
      ) : logs.error ? (
        <Notice tone="danger" className="mt-3">Couldn&apos;t read Jar events from the chain. Retrying.</Notice>
      ) : mine.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No Jar activity yet.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...bySource.entries()].map(([s, v]) => (
              <li key={s}><Badge tone="accent">{SOURCE[s] ?? `source ${s}`}: {usd(v)} at today&apos;s price</Badge></li>
            ))}
          </ul>
          <ul className="mt-4 divide-y divide-line text-sm">
            {mine.slice(0, 30).map((l) => {
              const s = STOCKS.find((x) => x.token.toLowerCase() === l.args.stock.toLowerCase());
              const q = s && market.data?.[s.id];
              const ts = times.data?.get(l.blockNumber);
              return (
                <li key={`${l.transactionHash}-${l.logIndex}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span>
                    {l.eventName === "Credited" ? `+ ${SOURCE[l.args.source] ?? "credit"}` : "− withdraw"}{" "}
                    <span className="num font-semibold">{q ? shares18(sharesOf(l.args.amount, q)) : "…"} {s?.symbol}</span>
                  </span>
                  <span className="flex items-center gap-3 text-muted">
                    <span className="num text-xs">{ts ? dateTime(ts) : <Skeleton w="7rem" />}</span>
                    <TxLink hash={l.transactionHash} />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
