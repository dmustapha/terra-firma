"use client";

// Hero set-piece: headline + the gap as a HERO NUMERAL (counted in lockstep with the erosion) beside the example wallet's
// core sample drilling in a recessed, lit borehole. Server-prefetched card; client keeps it fresh.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Card } from "@/lib/hindsight";
import { usd8, usdWhole8 } from "@/lib/ui-format";
import { CoreSample, quoted, useDrill } from "./core-sample";
import { useCard } from "./hooks";

export function HeroCore({ addr, initial, recorded = false, headline, action }: { addr: string; initial: Card | null; recorded?: boolean; headline: ReactNode; action: ReactNode }) {
  const q = useCard(addr, "NVDA");
  const c = q.data ?? initial;
  const isRecorded = !q.data && recorded;
  const { ref, k, replay } = useDrill();
  const ready = c && c.memes.length > 0;
  const qt = ready ? quoted(c) : null;
  const gapRaw = qt ? (qt.gap > 0n ? qt.gap : 0n) : 0n;
  return (
    <div ref={ref} className="grid items-center gap-x-12 gap-y-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        {headline}
        {ready && (
          <div className="mt-8">
            <p className="eyebrow text-[color:var(--brick)]">Left on the table · a real wallet</p>
            <p className="num mt-2 font-display text-[clamp(4.5rem,1.6rem+9vw,12.5rem)] leading-[0.8] tracking-[-0.045em]"><span className="sr-only">{usdWhole8(gapRaw)}</span><span aria-hidden>
              {k >= 1 ? usdWhole8(gapRaw) : `$${Math.floor((Number(gapRaw) / 1e8) * k).toLocaleString("en-US")}`}</span>
            </p>
            <p className="mt-3 max-w-[46ch] text-[0.9375rem] text-muted">
              It aped <b className="num text-fg">{usdWhole8(qt!.paid)}</b> into memes now worth <b className="num text-[color:var(--brick)]">{usd8(qt!.today)}</b>. The same dollars in {c.stock}, bought at the same moments: <b className="num text-accent">{usdWhole8(qt!.cf)}</b>.{qt!.partial && " Priced memes only."}
            </p>
          </div>
        )}
        <div className="mt-8">{action}</div>
      </div>

      <div className="well-bore px-4 pt-4 pb-3">
        {ready ? (
          <>
            <p className="eyebrow mb-1 flex justify-between px-2 text-muted">
              <span>Core · {c.wallet.slice(0, 6)}…{c.wallet.slice(-4)}</span>
              <span className="num">{isRecorded ? "recorded read · " : "live · "}block {c.asOfBlock.toLocaleString("en-US")}</span>
            </p>
            <div className="-mx-2 -mb-10 lg:-mr-10 lg:-mb-16" onMouseEnter={() => k === 1 && replay()}><CoreSample card={c} k={k} /></div>
            <p className="relative mt-1 flex justify-between px-2 text-sm">
              <button type="button" onClick={replay} className="font-semibold underline underline-offset-4 hover:text-accent">Drill again</button>
              <Link href={`/card/${c.wallet}`} className="font-semibold underline underline-offset-4 hover:text-accent">Every layer →</Link>
            </p>
          </>
        ) : (
          <div role="status" className="flex min-h-[30rem] flex-col items-center justify-center gap-4 text-center">
            <span aria-hidden className="drill-bit" />
            <p className="eyebrow text-muted">{q.error ? "Core jammed: the chain is busy" : "Drilling: reading buys and Chainlink rounds"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
