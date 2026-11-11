"use client";

import type { ReactNode } from "react";
import { STOCKS } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, pct, pctChange, usd, usd8 } from "@/lib/ui-format";
import { mapLimit, only, type TfLogs } from "@/lib/ui-logs";
import { sumKnown, usdOf, type StockQuote } from "@/lib/ui-report";
import { useQuery } from "@tanstack/react-query";
import { useStockQuotes, useTfLogs } from "./hooks";
import { AddrLink, Notice, Panel, Skeleton, TxLink } from "./ui";

interface Row {
  who: string;
  tx: string;
  main: ReactNode;
  sub?: ReactNode;
}

/** Minted cards ranked by regret, ONLY if the server re-derived the same card from chain logs (provenance check). */
function regretCandidates(logs: TfLogs) {
  return only(logs.lens, "CardMinted")
    .map((l) => ({ l, gap: l.args.usdNow8 - l.args.usdPaid8 }))
    .sort((a, b) => (b.gap > a.gap ? 1 : b.gap < a.gap ? -1 : 0))
    .slice(0, 10);
}

/** Re-derive each minted card server-side, at most 3 at a time (each check is a full card build). */
async function checkCards(cands: ReturnType<typeof regretCandidates>) {
  const res = await mapLimit(cands, 3, async ({ l: m }) => {
    const r = await fetch(`/api/card-check?addr=${m.args.wallet}&usdPaid8=${m.args.usdPaid8}&stockId=${m.args.stockId}`);
    const j = (await r.json().catch(() => ({}))) as { verified?: boolean };
    if (!r.ok) throw new Error("check failed");
    return { tx: m.transactionHash, ok: j.verified === true };
  });
  const verified = new Set(res.flatMap((x) => (x.status === "fulfilled" && x.value.ok ? [x.value.tx] : [])));
  return { verified, failed: res.filter((x) => x.status === "rejected").length };
}

function regret(cands: ReturnType<typeof regretCandidates>, verified: Set<string>): Row[] {
  return cands
    .filter(({ l }) => verified.has(l.transactionHash))
    .slice(0, 10)
    .map(({ l }) => {
      const c = pctChange(l.args.usdPaid8, l.args.usdNow8);
      return {
        who: l.args.wallet,
        tx: l.transactionHash,
        main: <>{usd8(l.args.usdPaid8)} → {usd8(l.args.usdNow8)} in {STOCKS[l.args.stockId]?.symbol}</>,
        sub: c !== null ? `${pct(c)} if it had been stock` : undefined,
      };
    });
}

function jars(logs: TfLogs, quotes: StockQuote[]): Row[] {
  const net = new Map<string, { raw: Map<number, bigint>; tx: string }>();
  for (const l of logs.jar) {
    const i = STOCKS.findIndex((s) => s.token.toLowerCase() === l.args.stock.toLowerCase());
    if (i < 0) continue;
    const u = l.args.user.toLowerCase();
    const e = net.get(u) ?? { raw: new Map(), tx: l.transactionHash };
    const d = l.eventName === "Credited" ? l.args.amount : -l.args.amount;
    e.raw.set(i, (e.raw.get(i) ?? 0n) + d);
    e.tx = l.transactionHash;
    net.set(u, e);
  }
  return [...net.entries()]
    // A wallet whose stock has no live price is left out of the ranking rather than valued at a guess.
    .flatMap(([who, e]) => {
      const v = sumKnown([...e.raw.entries()].map(([i, r]) => usdOf(r, quotes[i])));
      return v !== null && v > 0 ? [{ who, tx: e.tx, v }] : [];
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 10)
    .map((r) => ({ who: r.who, tx: r.tx, main: usd(r.v), sub: "at current Chainlink prices" }));
}

function fees(logs: TfLogs): Row[] {
  const by = new Map<string, { fee: bigint; n: number; tx: string }>();
  for (const l of only(logs.router, "Traded")) {
    const u = l.args.user.toLowerCase();
    const e = by.get(u) ?? { fee: 0n, n: 0, tx: l.transactionHash };
    e.fee += l.args.fee;
    e.n++;
    e.tx = l.transactionHash;
    by.set(u, e);
  }
  return [...by.entries()]
    .sort((a, b) => (b[1].fee > a[1].fee ? 1 : b[1].fee < a[1].fee ? -1 : 0))
    .slice(0, 10)
    .map(([who, e]) => ({ who, tx: e.tx, main: `${eth(e.fee)} ETH`, sub: `${e.n} trade${e.n === 1 ? "" : "s"}` }));
}

function Board({ title, desc, rows, loading, empty, note }: { title: string; desc: string; rows: Row[]; loading: boolean; empty: string; note?: string }) {
  const id = title.replace(/\W+/g, "-").toLowerCase();
  return (
    <Panel aria-labelledby={id}>
      <h2 id={id} className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      {note && <p className="mt-2 text-xs text-warn">{note}</p>}
      {loading ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} w="100%" h="2.75rem" className="block" />)}</div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-line">
          {rows.map((r, i) => (
            <li key={`${r.who}-${r.tx}`} className="flex items-center gap-3 py-3">
              <span className="num w-6 text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="num font-semibold">{r.main}</p>
                {r.sub && <p className="text-xs text-muted">{r.sub}</p>}
              </div>
              <div className="flex flex-col items-end text-sm">
                <AddrLink addr={r.who} />
                <TxLink hash={r.tx} className="inline-flex min-h-11 items-center text-xs text-muted">tx</TxLink>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function BoardView() {
  const logs = useTfLogs();
  const quotes = useStockQuotes();
  const cands = logs.data ? regretCandidates(logs.data) : [];
  const checks = useQuery({
    queryKey: ["card-checks", cands.map((c) => c.l.transactionHash).join(",")],
    enabled: cands.length > 0,
    staleTime: 600_000,
    retry: false,
    queryFn: () => checkCards(cands),
  });
  const verified = checks.data?.verified ?? new Set<string>();
  const failed = checks.data?.failed ?? 0;
  const pricesMissing = quotes.data?.some((q) => q.price8 === null || q.multiplier === null);
  if (!DEPLOYED) return <Notice tone="warn">Leaderboards fill from contract events once Terra Firma is live on mainnet.</Notice>;
  if (logs.error) return <Notice tone="danger">Couldn&apos;t read events from the chain. Retrying shortly.</Notice>;
  const l = logs.data;
  const loading = !l;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Board title="Biggest regret" desc="Minted Hindsight cards, re-verified against chain logs: what was paid vs. what it would be in stock." rows={regret(cands, verified)} loading={loading || (cands.length > 0 && checks.isLoading)} empty="No verified minted cards yet (each mint is re-derived from chain logs before it is ranked)." note={failed > 0 ? `${failed} card check${failed === 1 ? "" : "s"} couldn't run right now; those cards are not ranked.` : undefined} />
      <Board title="Biggest Jars" desc="Credited minus withdrawn, per wallet." note={pricesMissing ? "Some live stock prices are unavailable; wallets holding those stocks are left out until they read again." : undefined} rows={l && quotes.data ? jars(l, quotes.data) : []} loading={loading || !quotes.data} empty="No Jars yet." />
      <Board title="Most fees paid" desc="Sum of Traded.fee per wallet (half buys and burns $WIF, half buys stakers' stock)." rows={l ? fees(l) : []} loading={loading} empty="No routed trades yet." />
    </div>
  );
}
