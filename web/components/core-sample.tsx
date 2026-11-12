"use client";

// THE SIGNATURE: a drill core through one wallet. Geometry IS the data model.
// Upper strata = each meme held (thickness = dollars aped) that ERODES to its true size today, shedding grains.
// A sieve seam. Below, NVDA bedrock: one lamina per buy (thickness = what that buy would be in stock), stacking up.
// Every length is to one dollar scale, read from the card (Robinhood Chain logs + Chainlink rounds). Nothing typed.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/hindsight";
import { usd8, usdWhole8 } from "@/lib/ui-format";

/** Like-for-like totals over memes that HAVE a live price (unquoted memes are left out, never counted as $0). */
export function quoted(c: Card) {
  const q = c.memes.filter((m) => m.usdToday8 !== null);
  const sum = (f: (m: Card["memes"][number]) => string) => q.reduce((a, m) => a + BigInt(f(m)), 0n);
  const paid = sum((m) => m.usdPaid8), today = sum((m) => m.usdToday8 as string), cf = sum((m) => m.usdCounterfactual8);
  return { paid, today, cf, gap: cf - today, lost: paid > today ? paid - today : 0n, partial: q.length < c.memes.length };
}

const W = 480, CX = 196, R = 96, CAP = 16; // core radius and top-cap ellipse ry
const TOP = 30, SED_MAX = 200, ROCK_MAX = 200, SEAM = 14;

/** One eased 0→1 drill progress; replays on re-entry / hover / button. Reduced motion: 1. */
export function useDrill() {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = true; // first sighting is the mount run
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen) setRun((r) => r + 1);
      seen = e.isIntersecting;
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setK(1);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const x = Math.min(1, Math.max(0, (t - t0 - 350) / 1900));
      setK(x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    setK(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return { ref, k, replay: () => setRun((r) => r + 1) };
}

/** Deterministic pseudo-random so grains are stable across renders. */
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function CoreSample({ card: c, k, label = true }: { card: Card; k: number; label?: boolean }) {
  const paid = Number(c.totals.usdPaid8);
  const stock = Number(c.totals.usdCounterfactual8);
  const todayAll = c.memes.reduce((a, m) => a + Number(m.usdToday8 ?? 0), 0);
  const max = Math.max(paid, stock, todayAll, 1);
  const sedFull = (paid / max) * SED_MAX;
  const rockH = Math.max((stock / max) * ROCK_MAX, 4);

  // meme bands, largest first; each erodes from its paid share to its today share
  const memes = useMemo(() => [...c.memes].sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))), [c.memes]);
  const bands = memes.map((m) => {
    const full = (Number(m.usdPaid8) / max) * SED_MAX;
    const left = m.usdToday8 === null ? full : Math.min(full, Math.max((Number(m.usdToday8) / max) * SED_MAX, 2));
    return { m, full, now: full - (full - left) * k };
  });
  const sedNow = bands.reduce((s, b) => s + b.now, 0);
  const sedTop = TOP + CAP + (sedFull - sedNow); // sediment surface sinks as it erodes
  const seamY = TOP + CAP + sedFull;
  const rockTop = seamY + SEAM;

  // laminae: one per buy (cap 48 drawn; widths proportional), stacking bottom-up with k
  const buys = memes.flatMap((m) => m.buys).sort((a, b) => a.ts - b.ts);
  const drawn = buys.length > 48 ? buys.slice(-48) : buys;
  const total = drawn.reduce((s, b) => s + Number(b.usdPaid8), 0) || 1;
  let acc = 0;
  const laminae = drawn.map((b, i) => {
    const h = (Number(b.usdPaid8) / total) * rockH;
    const y = rockTop + rockH - acc - h;
    acc += h;
    return { y, h, i, on: k >= (i + 1) / (drawn.length + 1) };
  });

  // grains shed from the eroded volume, falling past the seam
  const shed = sedFull - sedNow;
  const grains = Array.from({ length: Math.min(38, Math.round(shed / 4)) }, (_, i) => ({
    x: CX - R + 12 + rnd(i) * (2 * R - 24),
    y0: sedTop + rnd(i + 99) * 8,
    d: rnd(i + 7) * 1.6,
    r: 1.2 + rnd(i + 3) * 1.6,
  }));

  const H = rockTop + rockH + CAP + 18;
  const bottom = rockTop + rockH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img"
      aria-label={`Core sample of wallet ${c.wallet}: ${usdWhole8(c.totals.usdPaid8)} aped into memes now worth ${usd8(c.totals.usdToday8)}; the same money in ${c.stock} would be ${usdWhole8(c.totals.usdCounterfactual8)}, drawn to one scale.`}>
      <defs>
        <pattern id="sed" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--sed-bg)" />
          <circle cx="1.5" cy="1.5" r="1.1" fill="var(--sed-dot)" />
          <circle cx="4.5" cy="4.2" r="0.6" fill="var(--sed-dot)" />
        </pattern>
        <pattern id="rock" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="8" height="8" fill="var(--rock-bg)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--rock-line)" strokeWidth="1.4" />
        </pattern>
        <linearGradient id="cyl" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.32" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <clipPath id="core"><rect x={CX - R} y={TOP + CAP} width={2 * R} height={bottom - TOP - CAP} /></clipPath>
      </defs>

      {/* the empty borehole sleeve above the sediment (what eroded away) */}
      <rect x={CX - R} y={TOP + CAP} width={2 * R} height={sedTop - TOP - CAP} fill="none" stroke="var(--fg)" strokeOpacity="0.35" strokeDasharray="3 4" />
      {sedTop - TOP - CAP > 44 && (
        <g fontFamily="var(--font-mono)" textAnchor="middle" fill="var(--brick)" style={{ opacity: Math.min(1, k * 1.4) }}>
          <text x={CX} y={(TOP + CAP + sedTop) / 2 - 4} fontSize="10" letterSpacing="0.2em">ERODED</text>
          <text x={CX} y={(TOP + CAP + sedTop) / 2 + 14} fontSize="15" fontFamily="var(--font-display)" letterSpacing="0">{usdWhole8(BigInt(Math.round(Number(quoted(c).lost) * Math.min(1, k))))} gone</text>
        </g>
      )}

      <g clipPath="url(#core)">
        {/* sediment: one band per meme */}
        {(() => {
          let y = sedTop;
          return bands.map((b, i) => {
            const el = (
              <g key={b.m.token}>
                <rect x={CX - R} y={y} width={2 * R} height={b.now} fill="url(#sed)" />
                <line x1={CX - R} x2={CX + R} y1={y} y2={y} stroke="var(--brick)" strokeOpacity={i === 0 ? 0.9 : 0.5} strokeWidth="1.2" />
              </g>
            );
            y += b.now;
            return el;
          });
        })()}
        {/* bedrock laminae */}
        <rect x={CX - R} y={rockTop} width={2 * R} height={rockH} fill="var(--rock-void)" />
        {laminae.map((l) => (
          <rect key={l.i} x={CX - R} y={l.y} width={2 * R} height={Math.max(l.h, 0.6)} fill="url(#rock)"
            style={{ opacity: l.on ? 1 : 0, transition: "opacity 260ms var(--ease-out)" }}
            stroke="var(--rock-seam)" strokeWidth="0.5" />
        ))}
        <rect x={CX - R} y={TOP} width={2 * R} height={H} fill="url(#cyl)" />
      </g>

      {/* falling grains (the erosion, performed) */}
      {k < 1 && grains.map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y0 + Math.min(1, Math.max(0, k * 1.6 - g.d * 0.4)) * (seamY - g.y0 + 6)} r={g.r}
          fill="var(--brick)" opacity={Math.max(0, 0.9 - k)} />
      ))}

      {/* sieve seam: where the sweep happens */}
      <g>
        <rect x={CX - R - 6} y={seamY} width={2 * R + 12} height={SEAM} fill="var(--bg)" />
        <line x1={CX - R - 10} x2={CX + R + 10} y1={seamY + 3} y2={seamY + 3} stroke="var(--fg)" strokeWidth="1" />
        <line x1={CX - R - 10} x2={CX + R + 10} y1={seamY + SEAM - 3} y2={seamY + SEAM - 3} stroke="var(--fg)" strokeWidth="1" strokeDasharray="2 3" />
      </g>

      {/* top cap + bottom cap of the cylinder */}
      <ellipse cx={CX} cy={TOP + CAP} rx={R} ry={CAP} fill="var(--bg)" stroke="var(--fg)" strokeOpacity="0.5" />
      <ellipse cx={CX} cy={bottom} rx={R} ry={CAP} fill="url(#rock)" stroke="var(--fg)" strokeOpacity="0.6" />
      <line x1={CX - R} x2={CX - R} y1={TOP + CAP} y2={bottom} stroke="var(--fg)" strokeOpacity="0.6" />
      <line x1={CX + R} x2={CX + R} y1={TOP + CAP} y2={bottom} stroke="var(--fg)" strokeOpacity="0.6" />

      {label && (
        <g fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="0.06em" fill="var(--fg)">
          {/* left: depth scale */}
          <g fillOpacity="0.6">
            <text x={CX - R - 16} y={TOP + CAP + 4} textAnchor="end">SURFACE</text>
            <text x={CX - R - 16} y={seamY + 11} textAnchor="end">SIEVE</text>
            <text x={CX - R - 16} y={bottom + 4} textAnchor="end">BEDROCK</text>
          </g>
          {/* right: leaders */}
          <line x1={CX + R} x2={CX + R + 18} y1={sedTop + Math.max(sedNow, 2) / 2} y2={sedTop + Math.max(sedNow, 2) / 2} stroke="var(--brick)" />
          <text x={CX + R + 22} y={sedTop + Math.max(sedNow, 2) / 2 - 4} fill="var(--brick)">{memes.length === 1 ? `$${memes[0].symbol}` : `${memes.length} MEMES`}</text>
          <text x={CX + R + 22} y={sedTop + Math.max(sedNow, 2) / 2 + 10} fill="var(--brick)">{k >= 1 ? `${usd8(c.totals.usdToday8)} LEFT` : `${usdWhole8(c.totals.usdPaid8)} APED`}</text>
          <line x1={CX + R} x2={CX + R + 18} y1={rockTop + rockH / 2} y2={rockTop + rockH / 2} stroke="var(--moss)" />
          <text x={CX + R + 22} y={rockTop + rockH / 2 - 4} fill="var(--moss)">{c.stock} BEDROCK</text>
          <text x={CX + R + 22} y={rockTop + rockH / 2 + 10} fill="var(--moss)">{buys.length} LAYERS · {usdWhole8(c.totals.usdCounterfactual8)}</text>
        </g>
      )}
    </svg>
  );
}
