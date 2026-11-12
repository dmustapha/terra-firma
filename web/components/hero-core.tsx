"use client";

// Hero set-piece: the example wallet's core sample drilling live, with the gap as the hero numeral (counted from the same
// progress, so the number and the erosion move together). Server-prefetched card; client keeps it fresh.
import Link from "next/link";
import type { Card } from "@/lib/hindsight";
import { usdWhole8 } from "@/lib/ui-format";
import { CoreSample, useDrill } from "./core-sample";
import { useCard } from "./hooks";

export function HeroCore({ addr, initial }: { addr: string; initial: Card | null }) {
  const q = useCard(addr, "NVDA");
  const c = q.data ?? initial;
  const { ref, k, replay } = useDrill();
  if (!c || c.memes.length === 0)
    return (
      <div ref={ref} role="status" className="flex min-h-[28rem] flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden className="drill-bit" />
        <p className="eyebrow text-muted">{q.error ? "Core jammed: the chain is busy" : "Drilling: reading buys and Chainlink rounds"}</p>
      </div>
    );
  const gapRaw = BigInt(c.totals.usdCounterfactual8) - BigInt(c.totals.usdToday8);
  const gap = Number(gapRaw) / 1e8;
  return (
    <div ref={ref} onMouseEnter={() => k === 1 && replay()}>
      <p className="eyebrow mb-3 flex justify-between text-muted">
        <span>Core sample · wallet {c.wallet.slice(0, 6)}…{c.wallet.slice(-4)}</span>
        <span className="num">block {c.asOfBlock.toLocaleString("en-US")}</span>
      </p>
      <div className="core-glow mx-auto max-w-[27rem]">
        <CoreSample card={c} k={k} />
      </div>
      <div className="mt-4 border-t border-line-strong pt-3">
        <p className="eyebrow text-accent">Left on the table</p>
        <p className="num font-display text-[clamp(4rem,2.4rem+5vw,7.5rem)] leading-[0.82] tracking-[-0.035em]" aria-label={usdWhole8(gapRaw)}>
          {k >= 1 ? usdWhole8(gapRaw) : `$${Math.floor(gap * k).toLocaleString("en-US")}`}
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-between gap-x-4 text-sm text-muted">
          <span>The same dollars in {c.stock}, bought at the same moments, minus what the bag is worth now.</span>
          <span className="flex gap-4">
            <button type="button" onClick={replay} className="font-semibold text-fg underline underline-offset-4 hover:text-accent">Drill again</button>
            <Link href={`/card/${c.wallet}`} className="font-semibold text-fg underline underline-offset-4 hover:text-accent">Every layer →</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
