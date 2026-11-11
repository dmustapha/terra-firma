"use client";

// One-tap convert (PRD F3): pick memes -> per-meme convert quotes -> exact approvals -> TerraRouter.convert.
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parseEventLogs, type Abi, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { terraRouterAbi } from "@/lib/abi";
import { CHAIN_ID, FEE_BPS, STOCKS, TF } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { memeByToken } from "@/lib/registry";
import { DEPLOYED, WIF } from "@/lib/ui-chain";
import { shares18, token as fmtToken, usd, usd8 } from "@/lib/ui-format";
import { sharesOf, usdOf } from "@/lib/ui-report";
import { GEO_BLOCKED, useStockGate } from "./geo-gate";
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

export function ConvertPanel({ card, initialStock = "NVDA", onDone }: { card: Card; initialStock?: string; onDone?: () => void }) {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [stock, setStock] = useState(initialStock);
  const stockInfo = STOCKS.find((s) => s.symbol === stock) ?? STOCKS[0];
  const candidates = useMemo(
    () => card.memes.filter((m) => BigInt(m.holding) > 0n && m.token.toLowerCase() !== WIF.toLowerCase()),
    [card],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.filter((m) => BigInt(m.usdToday8) >= HALF_DOLLAR).map((m) => m.token)));
  const fee = useReadContract({ address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: DEPLOYED && !!address } });
  const feeBps = fee.data ?? FEE_BPS;
  const quotes = useQueries({
    queries: candidates.map((m) => ({
      queryKey: ["quote", "convert", m.token, m.holding, stock, feeBps],
      queryFn: () => getJson<ConvertQuote>(`/api/quote?token=${m.token}&side=convert&amount=${m.holding}&stock=${stock}&feeBps=${feeBps}`),
      staleTime: 20_000,
      retry: 1,
    })),
  });
  const market = useStockQuotes();
  const sq = market.data?.find((q) => q.symbol === stock);
  const gate = useStockGate();
  const tx = useTx();
  const approve = useApproveStep();
  const [result, setResult] = useState<bigint | null>(null);

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
      steps.push({
        label: `Convert to ${stock}`,
        call: {
          address: TF.TerraRouter,
          abi: terraRouterAbi as unknown as Abi,
          functionName: "convert",
          args: [chosen.map((c) => c.q.data!.route), chosen.map((c) => c.m.token), chosen.map((c) => BigInt(c.m.holding)), stockInfo.id, minStock],
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
            Done. You own {result !== null && sq ? <span className="num">{shares18(sharesOf(result, sq))}</span> : "new"} {stock}. It&apos;s in your Jar. Withdraw any time.
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
        <Notice>No convertible memes in this wallet. $WIF is never converted; stake it instead.</Notice>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Memes to sell</legend>
          <ul className="space-y-2">
            {candidates.map((m, i) => {
              const q = quotes[i];
              const err = q.error as Error | null;
              const disabled = !!err || memeByToken(m.token)?.taxed;
              return (
                <li key={m.token}>
                  <label className={cx("flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5", disabled ? "border-line opacity-60" : "cursor-pointer border-line hover:border-muted")}>
                    <input type="checkbox" className="size-5 accent-[var(--accent)]" disabled={disabled} checked={picked.has(m.token) && !disabled} onChange={() => toggle(m.token)} />
                    <span className="flex-1">
                      <span className="font-semibold">{m.symbol}</span>{" "}
                      <span className="num text-sm text-muted">{fmtToken(m.holding)} · {usd8(m.usdToday8)}</span>
                    </span>
                    <span className="num text-right text-sm">
                      {q.isLoading ? <Skeleton w="5rem" /> : err ? <span className="text-danger">{err.message === "No Uniswap route for this token." ? "no route" : err.message}</span> : sq ? `≈ ${shares18(sharesOf(BigInt(q.data!.stockOut), sq))} ${stock}` : null}
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
          <strong className="num">{sq ? shares18(sharesOf(stockOut, sq)) : "…"} {stock}</strong> {sq && <>(≈ <span className="num">{usd(usdOf(stockOut, sq))}</span>)</>}. Fee{" "}
          {(Number(feeBps) / 100).toFixed(1)}%. Guaranteed at least <strong className="num">{sq ? shares18(sharesOf(minStock, sq)) : "…"} {stock}</strong> or nothing happens.
        </Notice>
      )}

      {gate.status === "restricted" && <Notice tone="warn">{GEO_BLOCKED}</Notice>}
      {!DEPLOYED && <Notice tone="warn">Convert opens when the Terra Firma contracts are live on mainnet.</Notice>}

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
