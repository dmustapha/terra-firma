"use client";

// The loop as one rail, told truthfully: your dead meme becomes stock that STAYS yours (parks in your Jar); only the 0.5% fee
// splits off and goes on to buy and burn $WIF. Runs once when it scrolls in, rests with every station lit, replays on re-entry.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LinkButton, cx } from "./ui";

const STATIONS = [
  { n: "01", title: "The sweep", line: "Tick the memes that died and sweep them in one transaction. Each meme needs a one-time approval first." },
  { n: "02", title: "Stock lands", line: "Real Stock Tokens in your Jar, your stock wallet. Withdraw any time." },
  { n: "03", title: "$WIF burns", line: "The 0.5% fee (0.3% if you stake 10k $WIF) splits off: half buys $WIF and burns it, half buys stock for stakers." },
];

// phase 0: dead meme at 01 · phase 1: it travels to 02 and becomes stock · phase 2: the fee chip splits off to 03.
const STEPS_MS = [1200, 2500];
// Centre of column i in a 3-column grid with a 2rem gap (matches the tiles below, so each tick meets its dot).
const COL = ["calc((100% - 4rem) / 6)", "50%", "calc(100% - (100% - 4rem) / 6)"];
const CHIPS = ["$AI · dead bag", "NVDA · in your Jar", "0.5% fee → half burns $WIF"];

export function LoopRail() {
  const [phase, setPhase] = useState(2);
  const [snap, setSnap] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      timers.forEach(clearTimeout);
      setSnap(true);
      setPhase(0);
      timers = [window.setTimeout(() => setSnap(false), 60), ...STEPS_MS.map((t, i) => window.setTimeout(() => setPhase(i + 1), t))];
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);
  const move = snap ? "transition-none" : "transition-[left,width,opacity] duration-[1000ms] ease-in-out";
  const main = phase === 0 ? { left: COL[0], label: "$AI · dead bag", tone: "bg-[color:var(--danger)]" } : { left: COL[1], label: "NVDA · in your Jar", tone: "bg-[color:var(--accent)]" };
  return (
    <div ref={ref} className="mt-14">
      <div className="relative hidden h-24 lg:block" aria-hidden>
        <div className="well absolute top-[62%] h-3 -translate-y-1/2 !rounded-full" style={{ left: COL[0], right: "calc((100% - 4rem) / 6)" }}>
          <span className={cx("absolute inset-y-0 left-0 rounded-full bg-accent", move)} style={{ width: `${Math.min(phase, 1) * 50}%` }} />
          <span className={cx("absolute top-1/2 left-1/2 h-0.5 -translate-y-1/2 bg-[color:var(--danger)]", move)} style={{ width: phase === 2 ? "50%" : "0%" }} />
        </div>
        {STATIONS.map((st, i) => (
          <span key={st.n} className={cx("absolute top-[62%] size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg transition-colors duration-300", i <= phase ? "bg-accent" : "bg-plate")} style={{ left: COL[i] }} />
        ))}
        <span className={cx("absolute top-[62%] -translate-x-1/2 -translate-y-[155%]", move)} style={{ left: main.left }}>
          <span key={main.label} className={cx("rise inline-block rounded-full border-[1.5px] border-fg px-4 py-1.5 text-[0.9375rem] font-semibold whitespace-nowrap text-[color:var(--plate)] shadow-[3px_3px_0_var(--plate-offset)]", main.tone)}>{main.label}</span>
        </span>
        <span className={cx("absolute top-[62%] -translate-x-[88%] -translate-y-[175%]", move, phase === 2 ? "opacity-100" : "opacity-0")} style={{ left: phase === 2 ? COL[2] : COL[1] }}>
          <span className="stamp !rotate-[-4deg] !text-[1rem] whitespace-nowrap !font-sans font-bold">0.5% fee → half burns $WIF</span>
        </span>
      </div>
      <ol className="mt-4 grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* tiles */}
        {STATIONS.map((st) => (
          <li key={st.n} id={`step-${st.n}`} className="relative scroll-mt-28 text-center">
            <span aria-hidden className="absolute -top-4 left-1/2 hidden h-4 w-0.5 -translate-x-1/2 bg-fg lg:block" />
            <div className="sheet h-full px-6 pt-5 pb-6">
            <p className="mb-3 lg:hidden"><span className={cx("inline-block rounded-full border-[1.5px] border-fg px-3 py-1 text-[0.875rem] font-semibold", ["bg-[color:var(--danger)] text-[color:var(--plate)]", "bg-[color:var(--accent)] text-[color:var(--plate)]", "border-[color:var(--danger)] text-danger"][Number(st.n) - 1])}>{CHIPS[Number(st.n) - 1]}</span></p>
            <p className="num text-sm font-semibold text-accent">{st.n}</p>
            <h3 className="mt-1 font-display text-[2.5rem] leading-none">{st.title}</h3>
            <p className="mx-auto mt-3 max-w-[30ch] text-[1rem] leading-relaxed text-fg/85">{st.line}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-x-8">
        <LinkButton href="/jar" className="min-h-13 px-7 text-[1.0625rem]">Sweep my dead memes</LinkButton>
        <LinkButton href="/stake" variant="secondary">Stake $WIF</LinkButton>
      </div>
      <p className="well mx-auto mt-8 max-w-[44rem] px-6 py-4 text-[1rem] text-fg/85">
        Still aping? Set <b>a slice</b> and part of every meme trade lands in stock, same transaction.{" "}
        <Link href="/trade" className="font-semibold text-accent underline decoration-accent-32 underline-offset-4 hover:decoration-accent">Trade with a slice →</Link>
      </p>
    </div>
  );
}
