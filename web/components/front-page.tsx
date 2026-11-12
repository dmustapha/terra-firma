"use client";

// THE HINDSIGHT EDITION: a wallet's loss, printed as a newspaper front page. One sheet of paper, the only object.
// Every figure comes from the card (Robinhood Chain logs + Chainlink rounds); the headline is composed from them, never typed.
// The signature: the bag's column drains from what was aped to its true size, set to scale against the stock column.
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/hindsight";
import { date, shares18, short, usd8, usdWhole8 } from "@/lib/ui-format";
import { recomputeHref } from "./guarantee";
import { useCard } from "./hooks";
import { cx } from "./ui";

const $ = usdWhole8;

/** Loss on priced memes, truncated (never rounded) so 99.998% never prints as 100%. */
function lossPct(c: Card): string | null {
  const paid = Number(c.totals.usdPaidQuoted8);
  const today = Number(c.totals.usdToday8);
  if (!paid || today >= paid) return null;
  return (Math.floor((1 - today / paid) * 10000) / 100).toFixed(2);
}

/** One eased 0→1 progress that replays when the sheet scrolls back into view. Reduced motion: 1 at once. */
function usePress() {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = true;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen) setRun((r) => r + 1);
      seen = e.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setK(1);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const x = Math.min(1, Math.max(0, (t - t0 - 600) / 1600));
      setK(x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    setK(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return { ref, k, replay: () => setRun((r) => r + 1) };
}

/** The drawing: three columns to one scale. The bag drains from what was aped down to what it is worth. */
function ToScale({ c, k }: { c: Card; k: number }) {
  const paid = Number(c.totals.usdPaid8);
  const today = Number(c.totals.usdToday8);
  const stock = Number(c.totals.usdCounterfactual8);
  const max = Math.max(paid, stock, 1);
  const H = 190;
  const h = (v: number) => Math.max((v / max) * H, 2);
  const bagH = h(paid) - (h(paid) - h(today)) * k;
  const col = "flex w-full flex-col items-center justify-end";
  return (
    <figure className="m-0" aria-label={`Drawn to scale: aped ${$(c.totals.usdPaid8)}, bag today ${usd8(c.totals.usdToday8)}, same money in ${c.stock} ${$(c.totals.usdCounterfactual8)}`}>
      <div className="grid grid-cols-3 items-end gap-3 border-b-2 border-[color:var(--ink)]" style={{ height: H + 4 }} aria-hidden>
        <div className={col}><span className="w-full border-[1.5px] border-dashed border-[color:var(--ink)]/50" style={{ height: h(paid) }} /></div>
        <div className={col}><span className="w-full bg-[color:var(--brick)]" style={{ height: bagH }} /></div>
        <div className={col}><span className="w-full bg-[color:var(--moss)] bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(0_0_0/0.18)_5px_6px)]" style={{ height: h(stock) }} /></div>
      </div>
      <figcaption className="mt-2 grid grid-cols-3 gap-3 text-center text-[0.75rem] leading-tight">
        <span>Aped<b className="num block text-[0.9375rem]">{$(c.totals.usdPaid8)}</b></span>
        <span className="text-[color:var(--brick)]">The bag today<b className="num block text-[0.9375rem]">{usd8(c.totals.usdToday8)}</b></span>
        <span className="text-[color:var(--moss)]">In {c.stock}<b className="num block text-[0.9375rem]">{$(c.totals.usdCounterfactual8)}</b></span>
      </figcaption>
    </figure>
  );
}

/** One obituary per coin: when it was bought, what it fell to. */
function Obituaries({ c }: { c: Card }) {
  const dead = [...c.memes].sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))).slice(0, 2);
  return (
    <div className="space-y-4">
      {dead.map((m) => {
        const ts = m.buys.map((b) => b.ts).sort((a, b) => a - b);
        const span = ts.length ? (date(ts[0]) === date(ts[ts.length - 1]) ? `on ${date(ts[0])}` : `${date(ts[0])} to ${date(ts[ts.length - 1])}`) : "";
        return (
          <p key={m.token} className="text-[0.9375rem] leading-snug">
            <b className="font-display text-[1.375rem] font-normal">${m.symbol}</b>, memecoin. Bought {m.buys.length} time{m.buys.length === 1 ? "" : "s"} {span} for {$(m.usdPaid8)}.{" "}
            {m.usdToday8 === null ? <>No live price today ({m.todayReason ?? "no quote"}); not counted.</> : <>Survived by <b className="num">{usd8(m.usdToday8)}</b>.</>}
          </p>
        );
      })}
      {c.memes.length > dead.length && <p className="text-[0.8125rem] italic">{c.memes.length - dead.length} more on the inside pages.</p>}
    </div>
  );
}

export function FrontPage({ card: c, owner = false, tilt = false, footer }: { card: Card; owner?: boolean; tilt?: boolean; footer?: React.ReactNode }) {
  const { ref, k, replay } = usePress();
  const loss = lossPct(c);
  const empty = c.memes.length === 0;
  const who = owner ? "You turned" : "Local degen turns";
  return (
    <div ref={ref} className={cx("paper-sheet relative", tilt && "lg:rotate-[0.8deg]")}>
      <article aria-labelledby={`fp-${c.wallet}`} className="paper relative px-5 pt-4 pb-5 sm:px-8 sm:pt-5 sm:pb-6">
        {/* nameplate */}
        <header className="border-b-[3px] border-double border-[color:var(--ink)] pb-2 text-center">
          <p className="font-display text-[clamp(1.6rem,1.1rem+1.6vw,2.5rem)] leading-none tracking-[-0.01em]">The Hindsight Edition</p>
        </header>
        <p className="flex flex-wrap justify-between gap-x-4 border-b border-[color:var(--ink)] py-1 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
          <span>Robinhood Chain</span>
          <span className="num">Block {c.asOfBlock.toLocaleString("en-US")}</span>
          <span>Wallet <span className="num normal-case">{short(c.wallet)}</span></span>
        </p>

        {empty ? (
          <h2 id={`fp-${c.wallet}`} className="mt-5 font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[0.95]">Nothing to report. None of the memes we track are in this wallet.</h2>
        ) : (
          <>
            <h2 id={`fp-${c.wallet}`} className="mt-4 font-display text-[clamp(2.4rem,1.5rem+3.2vw,4.25rem)] leading-[0.9] tracking-[-0.02em] uppercase">
              {who} <span className="num">{$(c.totals.usdPaid8)}</span> into <span className="num text-[color:var(--brick)]">{usd8(c.totals.usdToday8)}</span>
            </h2>
            <p className="mt-3 border-b border-[color:var(--ink)] pb-3 font-display text-[1.375rem] leading-snug italic">
              Same money in {c.stock}, bought at the same moments: <span className="num not-italic">{$(c.totals.usdCounterfactual8)}</span>.
              {c.unquoted.length > 0 && " Priced memes only."}
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_1.1fr] sm:gap-0">
              <div className="sm:border-r sm:border-[color:var(--ink)]/40 sm:pr-5">
                <p className="mb-1.5 text-[0.6875rem] font-bold tracking-[0.08em] uppercase">Obituaries</p>
                <Obituaries c={c} />
                <p className="mt-4 border-t border-[color:var(--ink)]/40 pt-2 text-[0.8125rem] leading-snug">
                  The other timeline: <b className="num">{shares18(c.totals.shares18)} {c.stock}</b>, each buy priced at the Chainlink round in force when it landed.
                </p>
              </div>
              <div className="sm:pl-5">
                <p className="mb-1.5 flex items-baseline justify-between text-[0.6875rem] font-bold tracking-[0.08em] uppercase">
                  Drawn to scale
                  <button type="button" onClick={replay} className="rounded-sm text-[0.6875rem] tracking-normal normal-case underline underline-offset-2 hover:opacity-70">replay</button>
                </p>
                <ToScale c={c} k={k} />
              </div>
            </div>
          </>
        )}
        {footer && <div className="mt-5 border-t-[3px] border-double border-[color:var(--ink)] pt-3">{footer}</div>}
        {!footer && (
          <p className="mt-5 flex flex-wrap justify-between gap-x-4 border-t-[3px] border-double border-[color:var(--ink)] pt-2 text-[0.8125rem]">
            <span>Every figure in this edition is read from Robinhood Chain.</span>
            <a href={recomputeHref(c.wallet, c.stock)} className="font-semibold underline underline-offset-2 hover:opacity-70">Recompute it on-chain →</a>
          </p>
        )}
      </article>
      {loss && (
        <span title={`Exact: −${(100 - (Number(c.totals.usdToday8) / Number(c.totals.usdPaidQuoted8)) * 100).toFixed(4)}%`} className="stamp stamp-land absolute -top-4 -right-3 z-10 text-[1.5rem] sm:-top-6 sm:-right-6 sm:text-[2.25rem]">
          −{loss}%
        </span>
      )}
    </div>
  );
}

/** The landing's example edition: server-prefetched, kept fresh client-side. Honest reading state, never an empty sheet. */
export function LiveFrontPage({ addr, initial, footer }: { addr: string; initial: Card | null; footer?: React.ReactNode }) {
  const q = useCard(addr, "NVDA");
  const c = q.data ?? initial;
  if (c) return <FrontPage card={c} tilt footer={footer} />;
  return (
    <div className="paper-sheet">
      <div role="status" className="paper px-8 py-10">
        <p className="font-display text-[2rem] leading-none">The Hindsight Edition</p>
        <p className="mt-4 border-t border-[color:var(--ink)] pt-3 text-[0.9375rem]">
          {q.error ? "This edition could not be printed right now. Nothing is shown in its place." : "Going to press: reading this wallet's buys and the Chainlink rounds they landed in. Usually 5–15 seconds."}
        </p>
      </div>
    </div>
  );
}
