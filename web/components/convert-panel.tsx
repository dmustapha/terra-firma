"use client";

// One-tap convert (PRD F3): pick memes -> per-meme convert quotes -> exact approvals -> TerraRouter.convert.
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Abi, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { terraRouterAbi } from "@/lib/abi";
import { CHAIN_ID, FEE_BPS, STOCKS, TF } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { memeByToken } from "@/lib/registry";
import { DEPLOYED, WIF } from "@/lib/ui-chain";
import { DASH, orDash, shares18, token as fmtToken, usd, usd8OrDash } from "@/lib/ui-format";
import { sharesOf, usdOf } from "@/lib/ui-report";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { getJson, useApproveStep, useStockQuotes, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { Button, LinkButton, Notice, Skeleton, TxLink, cx } from "./ui";

interface ConvertQuote {
  route: { kind: number; v2Path: Address[]; v3Path: `0x${string}`; key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address } };
  stockOut: string;
  minStockOut: string;
  fee: string;
  ethFromSale: string;
}

const HALF_DOLLAR = 50_000_000n;

/** Today's value of one meme; null when the server had no quote for it (Card.partial). */
const todayOf = (m: Card["memes"][number]): bigint | null => (m.usdToday8 === null ? null : BigInt(m.usdToday8));

export function ConvertPanel({ card, initialStock = "NVDA", onDone, onBusy }: { card: Card; initialStock?: string; onDone?: () => void; onBusy?: (busy: boolean) => void }) {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [stock, setStock] = useState(initialStock);
  const stockInfo = STOCKS.find((s) => s.symbol === stock) ?? STOCKS[0];
  const candidates = useMemo(
    () => card.memes.filter((m) => BigInt(m.holding) > 0n && m.token.toLowerCase() !== WIF.toLowerCase()),
    [card],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.filter((m) => (todayOf(m) ?? 0n) >= HALF_DOLLAR).map((m) => m.token)));
  const fee = useReadContract({ address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: DEPLOYED && !!address } });
  const feeBps = fee.data ?? FEE_BPS;
  const quoteOpts = (m: Card["memes"][number]) => ({
    queryKey: ["quote", "convert", m.token, m.holding, stock, feeBps],
    queryFn: () => getJson<ConvertQuote>(`/api/quote?token=${m.token}&side=convert&amount=${m.holding}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 20_000,
    retry: 1,
  });
  const quotes = useQueries({ queries: candidates.map(quoteOpts) });
  const market = useStockQuotes();
  const sq = market.data?.find((q) => q.symbol === stock);
  const gate = useStockGate();
  const tx = useTx();
  const approve = useApproveStep();
  const [result, setResult] = useState<bigint | null>(null);
  useEffect(() => onBusy?.(tx.busy), [tx.busy, onBusy]);

  const chosen = candidates.map((m, i) => ({ m, q: quotes[i] })).filter(({ m, q }) => picked.has(m.token) && q.data);
  const stockOut = chosen.reduce((s, c) => s + BigInt(c.q.data!.stockOut), 0n);
  const minStock = chosen.reduce((s, c) => s + BigInt(c.q.data!.minStockOut), 0n);
  const loading = quotes.some((q, i) => picked.has(candidates[i].token) && q.isLoading);

  const toggle = (t: string) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(t)) n.delete(t);
    else n.add(t);
    return n;
  });

  const submit = () =>
    gate.gate(async () => {
      const steps = chosen.map(({ m }) => approve(m.token, TF.TerraRouter, BigInt(m.holding), m.symbol));
      const memes = chosen.map((c) => c.m);
      steps.push({
        label: `Convert to ${stock}`,
        // Re-quote every meme right before the convert signature (after approvals), so minStockOut is never stale (S2).
        build: async () => {
          const fresh = await Promise.all(memes.map((m) => qc.fetchQuery({ ...quoteOpts(m), staleTime: 0 })));
          const min = fresh.reduce((a, f) => a + BigInt(f.minStockOut), 0n);
          const minSh = sharesOf(min, sq);
          return {
            label: minSh === null ? `Convert to ${stock} (fresh minimum applied; live ${stock} price unavailable to display)` : `Convert to ${stock}, at least ${shares18(minSh)} ${stock}`,
            call: {
              address: TF.TerraRouter,
              abi: terraRouterAbi as unknown as Abi,
              functionName: "convert",
              args: [fresh.map((f) => f.route), memes.map((m) => m.token), memes.map((m) => BigInt(m.holding)), stockInfo.id, min],
            },
          };
        },
      });
      const r = await tx.run(steps);
      if (!r) return;
      const ev = parseEventLogs({ abi: terraRouterAbi, logs: r.logs, eventName: "Converted" })[0];
      setResult(ev ? ev.args.stockOut : null);
      qc.invalidateQueries({ queryKey: ["card"] });
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      qc.invalidateQueries({ queryKey: ["jar"] });
    });

  if (tx.state.phase === "done") {
    return (
      <div className="space-y-4">
        <Notice tone="accent">
          <p className="text-lg font-semibold">
            Done. You own {result !== null && sharesOf(result, sq) !== null ? <span className="num">{shares18(sharesOf(result, sq)!)}</span> : "new"} {stock}. It&apos;s in your Jar. Withdraw any time.
          </p>
        </Notice>
        <ul className="space-y-1 text-sm text-muted">
          {tx.state.hashes.map((h) => (
            <li key={h.hash}>{h.label}: <TxLink hash={h.hash} /></li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/jar">Open your Jar</LinkButton>
          {onDone && <Button variant="secondary" onClick={onDone}>Back to card</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gate.dialog}
      {candidates.length === 0 ? (
        <div className="well-bore px-6 py-8">
          <p className="relative font-display text-deck">Nothing loose to sieve here.</p>
          <p className="relative mt-2 text-sm text-muted">No convertible memes in this wallet. $WIF is never converted; stake it instead.</p>
        </div>
      ) : (
        <fieldset>
          <legend className="eyebrow mb-3 text-muted">Sediment to sieve · memes to sell</legend>
          <ul className="well-bore overflow-hidden px-2 py-2 sm:px-3">
            {candidates.map((m, i) => {
              const q = quotes[i];
              const err = q.error as Error | null;
              const disabled = !!err || memeByToken(m.token)?.taxed;
              return (
                <li key={m.token} className="border-b border-line last:border-b-0">
                  <label className={cx("relative flex min-h-14 items-center gap-3 rounded-[14px] px-3 py-3 transition-colors duration-150 has-[:checked]:bg-accent-soft has-[:checked]:shadow-[inset_3px_0_0_var(--accent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-fg", disabled ? "opacity-60" : "cursor-pointer hover:bg-accent-06")}>
                    <input type="checkbox" className="size-5 accent-[var(--accent)]" disabled={disabled} checked={picked.has(m.token) && !disabled} onChange={() => toggle(m.token)} />
                    <span className="flex-1">
                      <span className="font-display text-2xl leading-none text-[color:var(--brick)]">{m.symbol}</span>{" "}
                      <span className="num block font-mono text-xs text-muted sm:ml-2 sm:inline">{fmtToken(m.holding)} · {usd8OrDash(todayOf(m))}{todayOf(m) === null && <span className="ml-1 text-xs">(price unavailable)</span>}</span>
                    </span>
                    <span className="num text-right font-mono text-sm">
                      {q.isLoading ? <Skeleton w="5rem" /> : err ? <span className="text-danger">{err.message === "No Uniswap route for this token." ? "no route" : err.message}</span> : `≈ ${orDash(sharesOf(BigInt(q.data!.stockOut), sq), shares18)} ${stock}`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <StockSelect value={stock} onChange={setStock} label="Into stock" name="convert-stock" />

      {chosen.length > 0 && (
        <Notice>
          Sell {chosen.map((c) => c.m.symbol).join(", ")} → get ≈{" "}
          <strong className="num">{orDash(sharesOf(stockOut, sq), shares18)} {stock}</strong> (≈ <span className="num">{orDash(usdOf(stockOut, sq), usd)}</span>). Fee{" "}
          {(Number(feeBps) / 100).toFixed(1)}%. Guaranteed at least <strong className="num">{orDash(sharesOf(minStock, sq), shares18)} {stock}</strong> or nothing happens.
          {(sharesOf(stockOut, sq) === null || usdOf(stockOut, sq) === null) && <span className="mt-1 block text-xs text-muted">{DASH} = live {stock} price unavailable right now; the onchain minimum still applies.</span>}
          <span className="mt-1 block text-xs text-muted">The quote is refreshed right before you sign, and the minimum you sign is shown in the wallet step.</span>
        </Notice>
      )}

      {gate.status === "restricted" && <Notice tone="warn">{GEO_BLOCKED}</Notice>}
      <GeoLoadingNote status={gate.status} />
      {!DEPLOYED && <Notice tone="warn">Convert opens when the Terra Firma contracts are live on Robinhood Chain.</Notice>}

      <Button
        className="w-full"
        disabled={!DEPLOYED || !address || chosen.length === 0 || loading || tx.busy || gate.status === "restricted" || gate.status === "loading"}
        onClick={submit}
      >
        {tx.busy ? "Working…" : chosen.length > 1 ? `Approve ${chosen.length} memes and convert` : "Convert"}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} />
      <p className="text-xs text-muted">
        One exact-amount approval per meme, then one convert transaction. The stock fill is bounded by Chainlink minus 3%.
      </p>
    </div>
  );
}
