"use client";

// Set-piece 2: the product demonstrating itself. The example wallet's dead memes sit as sediment; "Run the sweep" drops them
// through the sieve and they fuse into a NVDA layer. Figures: today's bag value from the card; NVDA price now = the card's
// counterfactual / shares (its live Chainlink read). Labelled as an estimate: the real minimum is quoted from Chainlink at signing.
import Link from "next/link";
import { useState } from "react";
import type { Card } from "@/lib/hindsight";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { usd, usd8 } from "@/lib/ui-format";
import { useCard } from "./hooks";
import { LinkButton, cx } from "./ui";

const FEE = 0.005;

export function SweepDemo({ initial }: { initial: Card | null }) {
  const q = useCard(HISTORY_ADDR, "NVDA");
  const c = q.data ?? initial;
  const [phase, setPhase] = useState<"idle" | "falling" | "done">("idle");
  if (!c || c.memes.length === 0) return null;
  const bag = Number(c.totals.usdToday8) / 1e8;
  const price = Number(c.totals.usdCounterfactual8) / 1e8 / (Number(c.totals.shares18) / 1e18);
  const shares = (bag * (1 - FEE)) / price;
  const run = () => {
    setPhase("falling");
    window.setTimeout(() => setPhase("done"), 1400);
  };
  return (
    <div className="grid items-center gap-x-16 gap-y-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="eyebrow text-accent">The sweep, performed</p>
        <h2 className="mt-3 font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em]">
          Drop the dead bag through the sieve. <em className="text-accent">Keep what lands.</em>
        </h2>
        <p className="mt-5 max-w-[42ch] text-[1.0625rem] leading-relaxed text-fg/85">
          One transaction sweeps every coin you tick into real stock tokens in your Jar. Each coin needs a one-time approval first. You see the least you get, from Chainlink, before you sign.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <LinkButton href="/jar" className="min-h-12 px-6">Sweep my dead memes</LinkButton>
          <button type="button" onClick={run} disabled={phase === "falling"} className="min-h-11 font-semibold underline decoration-accent underline-offset-4 hover:text-accent disabled:opacity-50">
            {phase === "done" ? "Run it again" : "Watch this wallet's sweep"}
          </button>
        </div>
      </div>

      <div className="relative" aria-live="polite">
        {/* sediment: the dead coins */}
        <div className="flex flex-wrap justify-center gap-2 pb-6">
          {c.memes.slice(0, 6).map((m, i) => (
            <span key={m.token} style={{ transitionDelay: `${i * 90}ms` }}
              className={cx("eyebrow inline-flex items-center gap-2 rounded-full bg-[color:var(--sed-bg)] px-4 py-2 text-[0.75rem] text-[color:var(--brick)] transition-[transform,opacity] duration-[1100ms] [transition-timing-function:cubic-bezier(.5,0,.75,0)]",
                phase !== "idle" && "translate-y-[150px] scale-50 opacity-0")}>
              ${m.symbol} <b className="num">{usd8(m.usdToday8 ?? "0")}</b>
            </span>
          ))}
        </div>
        {/* the sieve */}
        <div className="relative h-4 border-y border-line-strong [background:repeating-linear-gradient(90deg,var(--line-strong)_0_2px,transparent_2px_9px)] opacity-70" />
        {/* bedrock layer that forms */}
        <div className="mt-6 overflow-hidden">
          <div className={cx("origin-bottom rounded-[3px] bg-[color:var(--rock-bg)] [background-image:repeating-linear-gradient(-35deg,transparent_0_6px,var(--rock-line)_6px_7.5px)] transition-[transform,opacity] duration-700 [transition-timing-function:var(--ease-out)]",
            phase === "done" ? "h-16 scale-y-100 opacity-100" : "h-16 scale-y-0 opacity-0")} />
        </div>
        <p className={cx("mt-4 text-center transition-opacity duration-500", phase === "done" ? "opacity-100" : "opacity-0")}>
          <span className="eyebrow block text-muted">Lands in the Jar as</span>
          <span className="num font-display text-[2.75rem] leading-none">≈ {shares < 0.01 ? shares.toFixed(5) : shares.toFixed(3)} {c.stock}</span>
          <span className="mt-1 block text-sm text-muted">{usd(bag)} of memes at {c.stock} {usd(price)} (Chainlink), less the 0.5% fee. An estimate; the real minimum is quoted when you sign.</span>
        </p>
        {phase !== "done" && <p className="eyebrow mt-4 text-center text-muted">bedrock forms here</p>}
        {q.error && !c && <p className="text-danger">Chain busy.</p>}
        <Link href={`/card/${c.wallet}`} className="sr-only">This wallet&apos;s full core</Link>
      </div>
    </div>
  );
}
