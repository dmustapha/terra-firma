"use client";

// The hero object: a real wallet's Hindsight card as a popped PLATE. Read from Robinhood Chain logs + Chainlink rounds
// (server-prefetched, then kept fresh by /api/hindsight). States: reading → resolved (plate seats, stamp lands).
import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/hindsight";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { dateTime, shares18, short, usd8, usdWhole8 } from "@/lib/ui-format";
import { recomputeHref } from "./guarantee";
import { useCard } from "./hooks";
import { Skeleton, TextLink, TxLink } from "./ui";

const big = usdWhole8;


/** Loss on the priced memes, truncated (never rounded) so a 99.998% drop never reads as −100%. */
function lossPct(c: Card): string | null {
  const paid = Number(c.totals.usdPaidQuoted8);
  const today = Number(c.totals.usdToday8);
  if (!paid || today >= paid) return null;
  return (Math.floor((1 - today / paid) * 10000) / 100).toFixed(2);
}

/** One eased 0→1 progress, replayable. Bar width and the counted gap both read it, so they move in lockstep.
 *  Reduced motion: jumps to 1. */
function useProgress(run: number) {
  const [k, setK] = useState(1);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setK(1);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const x = Math.min(1, Math.max(0, (t - t0 - 450) / 1500));
      setK(x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    setK(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return k;
}

/** THE SIGNATURE: the bag drains. Full brick (what was aped) drains to its true size against the stock line while the gap
 *  counts up with it. Every figure from the card. Replays when it scrolls back into view, on hover, and on Replay. */
function Drain({ c }: { c: Card }) {
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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
  const k = useProgress(run);
  const stock = Number(c.totals.usdCounterfactual8) / 1e8;
  const bag = Number(c.totals.usdToday8) / 1e8;
  if (!stock) return null;
  const pct = (bag / stock) * 100;
  const w = 100 - (100 - pct) * k;
  const gapRaw = BigInt(c.totals.usdCounterfactual8) - BigInt(c.totals.usdToday8);
  return (
    <div ref={ref} onMouseEnter={() => k === 1 && setRun((r) => r + 1)} className="mt-3 rounded-[10px] bg-fg px-5 pt-4 pb-5 text-bg">
      <p className="mb-3 text-[0.9375rem] font-semibold opacity-80">You left on the table</p>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <p className="num font-display text-[clamp(4rem,2.4rem+5vw,7.25rem)] leading-[0.85] tracking-[-0.025em]" aria-label={big(gapRaw)}>
          {k >= 1 ? big(gapRaw) : `$${Math.floor((stock - bag) * k).toLocaleString("en-US")}`}
        </p>
        <p className="pb-2 text-right font-display text-[1.25rem] leading-tight italic opacity-80">= <span className="num">{shares18(c.totals.shares18)}</span> {c.stock} shares<br />you don&apos;t own</p>
      </div>
      <div className="relative mt-6 h-12 rounded-[4px] bg-[color:var(--accent)] bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(0_0_0/0.16)_6px_7px)]" role="img" aria-label={`To scale: the bag is ${pct.toFixed(2)}% of the ${c.stock} line`}>
        <span className="absolute inset-y-0 left-0 flex min-w-[3px] items-center overflow-hidden rounded-l-[4px] bg-[color:var(--danger)]" style={{ width: `${w}%` }}>
          <span className={`px-3 text-[0.9375rem] font-semibold whitespace-nowrap text-[color:var(--plate)] transition-opacity duration-300 ${k < 0.55 ? "opacity-100" : "opacity-0"}`}>{big(c.totals.usdPaid8)} aped</span>
        </span>
        <span className={`absolute top-full left-0 flex flex-col items-start transition-opacity duration-500 ${k >= 1 ? "opacity-100" : "opacity-0"}`} aria-hidden>
          <span className="ml-[1px] h-3 w-px bg-[color:var(--danger)]" />
          <span className="rounded-[4px] bg-[color:var(--danger)] px-2 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap text-[color:var(--plate)]">your bag: {usd8(c.totals.usdToday8)}</span>
        </span>
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-right text-[0.875rem] leading-tight font-semibold text-[color:var(--plate)]">{big(c.totals.usdCounterfactual8)} in {c.stock}<span className="block font-display text-[0.9375rem] font-normal italic opacity-85">not yours</span></span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 text-[0.8125rem]">
        <span className="mr-auto pl-36 opacity-75 max-sm:pl-0 max-sm:pt-6">bag drawn to scale</span>
        <button type="button" onClick={() => setRun((r) => r + 1)} className="rounded-sm px-1 font-semibold underline decoration-1 underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-current">Replay ↺</button>
      </div>
    </div>
  );
}

/** The receipts: the wallet's real buys, largest first, each with the Chainlink stock price in force when it landed. */
export function HindsightReceipts({ initial }: { initial: Card | null }) {
  const q = useCard(HISTORY_ADDR, "NVDA");
  const c = q.data ?? initial;
  if (!c || c.memes.length === 0) return null;
  const buys = c.memes.flatMap((m) => m.buys.map((b) => ({ ...b, sym: m.symbol }))).sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8)));
  const top = buys.slice(0, 6);
  return (
    <section aria-labelledby="receipts-title" className="band bleed">
      <div className="mx-auto grid max-w-[80rem] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr] lg:px-8">
        <div>
          <p className="mb-3 text-sm font-semibold text-accent">The receipts</p>
          <h2 id="receipts-title" className="font-display text-[clamp(2.2rem,1.5rem+2.2vw,3.5rem)] leading-[1.02] tracking-[-0.02em]">Every buy, priced the day it landed.</h2>
          <p className="mt-4 max-w-[36ch] text-[1rem] leading-relaxed text-fg/80">
            Wallet {short(HISTORY_ADDR)} made <b className="num">{buys.length.toLocaleString("en-US")}</b> buys. Each one is paired with the Chainlink {c.stock} round in force when it landed. Yours will be too.
          </p>
          <TextLink href={`/card/${HISTORY_ADDR}`} className="mt-4">All {buys.length.toLocaleString("en-US")} receipts<span aria-hidden>&nbsp;→</span></TextLink>
        </div>
        <div className="plate overflow-x-auto px-2 pt-2 pb-1">
          <table className="num w-full text-[0.9375rem] sm:min-w-[34rem]">
            <caption className="px-4 pt-3 pb-1 text-left text-xs font-semibold text-muted">The {top.length} biggest of {buys.length.toLocaleString("en-US")} buys</caption>
            <thead className="text-left text-xs font-semibold text-muted">
              <tr><th className="px-4 py-3">Day</th><th className="px-4 py-3">Aped into</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right max-sm:hidden">{c.stock} that day</th><th className="px-4 py-3 text-right max-sm:hidden">Would be {c.stock}</th><th className="px-4 py-3 text-right max-sm:hidden">Tx</th></tr>
            </thead>
            <tbody>
              {top.map((b) => (
                <tr key={b.tx + b.usdPaid8} className="border-t border-dashed border-fg/15">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{dateTime(b.ts).replace(/, \d{4}/, "")}</td>
                  <td className="px-4 py-3 font-semibold">${b.sym}</td>
                  <td className="px-4 py-3 text-right font-semibold">{big(b.usdPaid8)}</td>
                  <td className="px-4 py-3 text-right text-muted max-sm:hidden">{usd8(b.stockUsd8)}</td>
                  <td className="px-4 py-3 text-right max-sm:hidden">{shares18(b.shares18)} sh</td>
                  <td className="px-4 py-3 text-right text-sm max-sm:hidden"><TxLink hash={b.tx} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-fg">
                <td colSpan={6} className="p-2">
                  <div className="well grid gap-3 px-5 py-4 sm:grid-cols-3 sm:gap-4">
                    <p><span className="block text-xs font-semibold text-muted">All {buys.length.toLocaleString("en-US")} buys, paid</span><span className="font-display text-[1.75rem] leading-tight">{big(c.totals.usdPaid8)}</span></p>
                    <p><span className="block text-xs font-semibold text-danger">Worth now</span><span className="font-display text-[1.75rem] leading-tight text-danger">{usd8(c.totals.usdToday8)}</span></p>
                    <p><span className="block text-xs font-semibold text-accent">Would be, in {c.stock}</span><span className="font-display text-[1.75rem] leading-tight text-accent">{big(c.totals.usdCounterfactual8)}</span></p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function memesLine(c: Card) {
  const syms = [...c.memes].sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))).map((m) => `$${m.symbol}`);
  return syms.length <= 2 ? syms.join(" + ") : `${syms.slice(0, 2).join(", ")} +${syms.length - 2} more`;
}

export function HindsightPlate({ initial }: { initial: Card | null }) {
  const q = useCard(HISTORY_ADDR, "NVDA");
  const c = q.data ?? initial ?? null;
  const loss = c ? lossPct(c) : null;

  return (
    <div className="plate-stack">
      <article aria-labelledby="hs-title" className="plate seat px-6 pt-5 pb-6 sm:px-8">
        <header className="mb-2 flex items-center justify-between gap-3 pr-24 sm:pr-0">
          <h2 id="hs-title" className="ui-label">Hindsight · a real wallet <span className="num block text-muted sm:inline">{short(HISTORY_ADDR)}</span></h2>
        </header>

        {c && c.memes.length > 0 ? (
          <>
            <p className="mt-3 text-[1.0625rem] leading-snug">
              Aped <b className="num font-semibold">{big(c.totals.usdPaid8)}</b> into <b className="font-semibold">{memesLine(c)}</b>.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="well px-5 pt-4 pb-5">
                <p className="ui-label text-danger">You have</p>
                <p className="num mt-1 font-display text-[clamp(2.25rem,1.5rem+2.4vw,3.6rem)] leading-[0.95] text-danger">{usd8(c.totals.usdToday8)}</p>
                <p className="mt-2 text-sm text-muted">the bag, sold today</p>
              </div>
              <div className="sheet !rounded-[10px] px-5 pt-4 pb-5">
                <p className="ui-label text-accent">In {c.stock} you&apos;d have</p>
                <p className="num mt-1 font-display text-[clamp(2.25rem,1.5rem+2.4vw,3.6rem)] leading-[0.95]">{big(c.totals.usdCounterfactual8)}</p>
                <p className="mt-2 text-sm text-muted"><span className="num">{shares18(c.totals.shares18)}</span> shares, same days</p>
              </div>
            </div>
            <Drain c={c} />
            {loss && (
              <span aria-label={`the bag is down ${loss} percent`} className="stamp stamp-land absolute -top-5 -right-2 text-[1.375rem] sm:-top-6 sm:-right-6 sm:text-[2.1rem]">
                −{loss}%
              </span>
            )}
            <footer className="mt-5 border-t border-dashed border-fg/20 pt-3 flex flex-wrap items-center justify-between gap-x-4 text-sm">
              <span className="ui-label flex items-center gap-2 text-muted"><span className="live-dot" aria-hidden />{c ? <>read at block <span className="num">{c.asOfBlock.toLocaleString("en-US")}</span></> : "reading"}</span>
              <TextLink href={recomputeHref(HISTORY_ADDR, "NVDA")} className="text-sm">Recompute it on-chain<span aria-hidden>&nbsp;→</span></TextLink>
            </footer>
          </>
        ) : q.error && !c ? (
          <p className="py-10 text-muted">This wallet could not be read right now. Nothing is shown in its place.</p>
        ) : (
          <div role="status" className="py-2">
            <p className="mb-4 text-sm text-muted">Reading the wallet&apos;s buys and the Chainlink rounds they landed in. Usually 5–15 seconds.</p>
            <Skeleton w="100%" h="2.4rem" className="mb-3 block" />
            <Skeleton w="100%" h="2.4rem" className="mb-5 block" />
            <Skeleton w="100%" h="8rem" className="block" />
          </div>
        )}
      </article>
    </div>
  );
}
