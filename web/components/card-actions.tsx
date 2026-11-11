"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { Abi, Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, hindsightLensAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { DEPLOYED, WIF, publicClient } from "@/lib/ui-chain";
import { plainError } from "@/lib/ui-errors";
import { shares18, usd8 } from "@/lib/ui-format";
import { useApproveStep, useTx } from "./hooks";
import { TxStatus } from "./tx-status";
import { AddrLink, Button, Notice, cx } from "./ui";

/** Card buys mapped to HindsightLens.Buy. */
export function lensBuys(card: Card) {
  return card.memes.flatMap((m) =>
    m.buys.map((b) => ({
      payKind: b.payKind,
      payStockId: b.payStockId,
      amountPaid: BigInt(b.amountPaid),
      payRoundId: BigInt(b.payRoundId),
      stockRoundId: BigInt(b.stockRoundId),
      ts: BigInt(b.ts),
    })),
  );
}

export const stockIdOf = (symbol: string) => STOCKS.find((s) => s.symbol === symbol)?.id ?? 0;

export function shareUrl(card: Card, origin: string) {
  const text =
    card.memes.length === 0
      ? "My Hindsight card: clean hands, no memes. Check yours on Terra Firma."
      : `I put ${usd8(card.totals.usdPaid8)} into memes. Today: ${usd8(card.totals.usdToday8)}. In ${card.stock}: ${usd8(card.totals.usdCounterfactual8)}. Every number from Robinhood Chain + Chainlink.`;
  const url = `${origin}/card/${card.wallet}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function ShareButton({ card }: { card: Card }) {
  return (
    <Button variant="secondary" onClick={() => window.open(shareUrl(card, window.location.origin), "_blank", "noopener,noreferrer")}>
      Share to X
    </Button>
  );
}

/** HindsightLens.recompute eth_call on the card's own inputs, shown beside the API totals. */
export function useRecompute(card: Card | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("No card");
      const [usdPaid8, sh, usdNow8] = await publicClient.readContract({
        address: TF.HindsightLens,
        abi: hindsightLensAbi,
        functionName: "recompute",
        args: [lensBuys(card), stockIdOf(card.stock)],
      });
      return { usdPaid8, shares18: sh, usdNow8 };
    },
  });
}

export function RecomputeResult({ card, data, error }: { card: Card; data?: { usdPaid8: bigint; shares18: bigint; usdNow8: bigint }; error?: unknown }) {
  if (error) return <Notice tone="danger" className="mt-3">{plainError(error)}</Notice>;
  if (!data) return null;
  const paidMatch = data.usdPaid8 === BigInt(card.totals.usdPaid8);
  const sharesDiff = data.shares18 - BigInt(card.totals.shares18);
  const sharesMatch = (sharesDiff < 0n ? -sharesDiff : sharesDiff) <= BigInt(card.memes.reduce((n, m) => n + m.buys.length, 0));
  const rows = [
    { k: "Paid (USD)", api: usd8(card.totals.usdPaid8), chain: usd8(data.usdPaid8), ok: paidMatch },
    { k: `Shares of ${card.stock}`, api: shares18(card.totals.shares18), chain: shares18(data.shares18), ok: sharesMatch },
    { k: `In ${card.stock} now`, api: usd8(card.totals.usdCounterfactual8), chain: usd8(data.usdNow8), ok: null },
  ];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line" role="status">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="px-3 py-2 font-medium">Figure</th><th className="px-3 py-2 text-right font-medium">API</th><th className="px-3 py-2 text-right font-medium">Onchain</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t border-line">
              <th scope="row" className="px-3 py-2 text-left font-normal text-muted">{r.k}</th>
              <td className="num px-3 py-2 text-right">{r.api}</td>
              <td className={cx("num px-3 py-2 text-right", r.ok === true && "text-accent", r.ok === false && "text-danger")}>
                {r.chain} {r.ok === true ? "✓" : r.ok === false ? "≠" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        Onchain = <AddrLink addr={TF.HindsightLens}>HindsightLens</AddrLink>.recompute() on the same buys. &ldquo;Now&rdquo; values use each side&apos;s latest feed read, so they can differ by a few cents.
      </p>
    </div>
  );
}

export function RecomputeButton({ card }: { card: Card }) {
  const m = useRecompute(card);
  const has = card.memes.length > 0;
  return (
    <div>
      <Button variant="secondary" disabled={!DEPLOYED || !has || m.isPending} onClick={() => m.mutate()} title={!DEPLOYED ? "Available once contracts are live" : undefined}>
        {m.isPending ? "Recomputing…" : "Recompute onchain"}
      </Button>
      <RecomputeResult card={card} data={m.data} error={m.error} />
    </div>
  );
}

const ONE_WIF = 10n ** 18n;

/** Approve exactly 1 $WIF to HindsightLens, then mintCard. Shown only to the connected owner holding >= 1 $WIF. */
export function MintButton({ card }: { card: Card }) {
  const { address } = useAccount();
  const bal = useReadContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address } });
  const tx = useTx();
  const approve = useApproveStep();
  const [minted, setMinted] = useState(false);
  const owner = address && address.toLowerCase() === card.wallet.toLowerCase();
  if (!owner || !DEPLOYED || (bal.data ?? 0n) < ONE_WIF || card.memes.length === 0) return null;
  const mint = async () => {
    const r = await tx.run([
      approve(WIF, TF.HindsightLens as Address, ONE_WIF, "$WIF"),
      { label: "Mint card (burns 1 $WIF)", call: { address: TF.HindsightLens, abi: hindsightLensAbi as unknown as Abi, functionName: "mintCard", args: [lensBuys(card), stockIdOf(card.stock)] } },
    ]);
    if (r) setMinted(true);
  };
  return (
    <div>
      <Button variant="secondary" disabled={tx.busy || minted} onClick={mint}>{minted ? "Minted onchain" : "Mint this card · burns 1 $WIF"}</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success="Minted onchain. 1 $WIF burned." />
    </div>
  );
}
