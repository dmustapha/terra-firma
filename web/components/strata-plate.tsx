"use client";

// Fig. 1, the Strata readout: a Hindsight card drawn as a measured cross-section, TO SCALE.
// y = BASE is $0; the tallest of (paid, today, counterfactual) reaches TOP. Nothing here is estimated.
import { useId, type CSSProperties, type ReactNode } from "react";
import type { Card } from "@/lib/hindsight";
import { shares18, short, usd8 } from "@/lib/ui-format";
import { cx } from "./ui";

const BASE = 400;
const TOP = 70;
const SPAN = BASE - TOP;
const MEME = { x: 40, w: 230 };
const ROCK = { x: 290, w: 246 };
const RIGHT = ROCK.x + ROCK.w;
/** Smallest meme horizon we draw, in plate units. Thinner real values are thickened and the caption says so. */
const MIN_CRUST = 5;

const dollars = (v8: string) => Number(v8) / 1e8;
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function niceStep(max: number) {
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/** A gentle horizon across the bedrock column at height y. */
function wave(y: number, amp: number, flip: boolean) {
  const a = flip ? -amp : amp;
  return `M${ROCK.x} ${y} C${ROCK.x + 50} ${y - a} ${ROCK.x + 100} ${y + a} ${ROCK.x + 150} ${y} S${ROCK.x + 220} ${y - a} ${RIGHT} ${y + a * 0.4}`;
}

/** Shared engraving screens. Colors come from tokens, so the plate re-inks itself in dark mode. */
function Screens({ id }: { id: string }) {
  const dot = (n: number, r: number, cls = "fill-accent") => (
    <pattern id={`${id}ht${n}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
      <circle cx="3" cy="3" r={r} className={cls} />
    </pattern>
  );
  return (
    <defs>
      {dot(1, 0.75)}
      {dot(2, 1.1)}
      {dot(3, 1.45)}
      {dot(4, 1.8)}
      {dot(5, 2.15, "fill-accent-strong")}
      <pattern id={`${id}ht6`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="6" height="6" className="fill-accent" />
        <circle cx="3" cy="3" r="1.3" className="fill-bg" />
      </pattern>
      <pattern id={`${id}ghost`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="4" cy="4" r="0.6" className="fill-fg" fillOpacity=".32" />
      </pattern>
      <pattern id={`${id}hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" className="stroke-fg" strokeWidth=".8" />
      </pattern>
      <pattern id={`${id}sky`} width="8" height="5" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2.5" x2="8" y2="2.5" className="stroke-fg" strokeOpacity=".16" strokeWidth=".6" />
      </pattern>
      <pattern id={`${id}crust`} width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" className="fill-fg" />
        <circle cx="1.5" cy="1.5" r=".55" className="fill-bg" />
      </pattern>
    </defs>
  );
}

const serif = { fontFamily: "var(--font-instrument-serif), Georgia, serif" } as CSSProperties;
const sans = { fontFamily: "var(--font-public-sans), system-ui, sans-serif", fontVariantNumeric: "tabular-nums" } as CSSProperties;

function Tag({ x, y, letter, r = 11 }: { x: number; y: number; letter: string; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className="fill-bg stroke-fg" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={r + 5} style={serif} className="fill-fg">{letter}</text>
    </g>
  );
}

function PlateFrame({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <Screens id={id} />
      <rect x="0" y="0" width="600" height="440" className="fill-bg" />
      <rect x="10.5" y="10.5" width="579" height="419" fill="none" className="stroke-fg" strokeWidth=".6" />
      <rect x="24" y="22" width="512" height={TOP - 22} fill={`url(#${id}sky)`} />
      {children}
      <rect x="24" y={BASE} width="512" height="18" fill={`url(#${id}hatch)`} opacity=".55" />
      <line x1="24" y1={BASE} x2="536" y2={BASE} className="stroke-fg" strokeWidth="1.4" />
    </>
  );
}

function Scale({ max }: { max: number }) {
  const step = niceStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max * 1.0001; v += step) ticks.push(v);
  const y = (v: number) => BASE - (v / max) * SPAN;
  return (
    <g fontSize="10.5" style={sans} className="fill-fg">
      <line x1="548" y1={TOP} x2="548" y2={BASE} className="stroke-fg" strokeWidth=".8" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={v === 0 ? 543 : 545} y1={y(v)} x2={v === 0 ? 553 : 551} y2={y(v)} className="stroke-fg" />
          <text x="557" y={y(v) + 4}>{v === 0 ? "$0" : compact.format(v)}</text>
        </g>
      ))}
      <text x="557" y="40">USD</text>
    </g>
  );
}

function Bedrock({ id, yR }: { id: string; yR: number }) {
  const h = BASE - yR;
  const bands = h >= 36 ? [1, 2, 3, 4, 5].map((k) => yR + (h * k) / 6) : [];
  const amp = Math.min(7, h / 14);
  return (
    <g>
      <rect x={ROCK.x} y={yR} width={ROCK.w} height={h} fill={`url(#${id}${bands.length ? "ht1" : "ht3"})`} />
      {bands.map((y, i) => (
        <path key={i} d={`${wave(y, amp, i % 2 === 1)} L${RIGHT} ${BASE} L${ROCK.x} ${BASE}Z`} fill={`url(#${id}ht${i + 2})`} />
      ))}
      <g fill="none" className="stroke-fg" strokeWidth=".7">
        {bands.map((y, i) => <path key={i} d={wave(y, amp, i % 2 === 1)} />)}
      </g>
      <line x1={ROCK.x} y1={yR} x2={RIGHT} y2={yR} className="stroke-fg" strokeWidth="1.6" />
      <line x1={ROCK.x} y1={yR} x2={ROCK.x} y2={BASE} className="stroke-fg" strokeWidth="1.2" />
    </g>
  );
}

function MemeColumn({ id, yD, today, s }: { id: string; yD: number; today: number | null; s: number }) {
  const mid = MEME.x + MEME.w / 2;
  if (today === null) {
    return (
      <g>
        <rect x={MEME.x + 0.5} y={yD + 0.5} width={MEME.w - 1} height={BASE - yD - 1} fill="none" className="stroke-fg" strokeOpacity=".55" strokeWidth=".7" strokeDasharray="2 3" />
        <text x={mid} y={(yD + BASE) / 2} textAnchor="middle" fontSize="24" fontStyle="italic" style={serif} className="fill-fg" fillOpacity=".78">no live quote</text>
        <text x={mid} y={(yD + BASE) / 2 + 20} textAnchor="middle" fontSize="11" style={sans} className="fill-fg" fillOpacity=".78">today&apos;s value could not be read</text>
      </g>
    );
  }
  const top = BASE - Math.max(today * s, MIN_CRUST);
  const eroded = top > yD;
  const thick = BASE - top > 14;
  return (
    <g>
      {eroded && (
        <>
          <rect x={MEME.x} y={yD} width={MEME.w} height={top - yD} fill={`url(#${id}ghost)`} />
          <rect x={MEME.x + 0.5} y={yD + 0.5} width={MEME.w - 1} height={top - yD - 1} fill="none" className="stroke-fg" strokeOpacity=".55" strokeWidth=".7" strokeDasharray="2 3" />
          {top - yD > 70 && (
            <>
              <text x={mid} y={(yD + top) / 2} textAnchor="middle" fontSize="26" fontStyle="italic" style={serif} className="fill-fg" fillOpacity=".78">eroded</text>
              <text x={mid} y={(yD + top) / 2 + 22} textAnchor="middle" fontSize="11" style={sans} className="fill-fg" fillOpacity=".78">ground the memes once held</text>
            </>
          )}
        </>
      )}
      <rect x={MEME.x} y={top} width={MEME.w} height={BASE - top} fill={`url(#${id}${thick ? "ht4" : "crust"})`} />
      {thick && <rect x={MEME.x} y={top} width={MEME.w} height={BASE - top} fill="none" className="stroke-fg" strokeWidth=".8" />}
    </g>
  );
}

export interface PlateFigures {
  paid: number;
  today: number | null;
  stock: number;
}

/** The engraved plate itself (SVG only). */
export function StrataSvg({ f, label, stockSymbol }: { f: PlateFigures; label: string; stockSymbol: string }) {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const max = Math.max(f.paid, f.today ?? 0, f.stock, 0.01);
  const s = SPAN / max;
  const yD = BASE - f.paid * s;
  const yR = BASE - f.stock * s;
  const aTop = f.today === null ? yD : BASE - Math.max(f.today * s, MIN_CRUST);
  return (
    <svg viewBox="0 0 600 440" role="img" aria-label={label} className="block h-auto w-full">
      <PlateFrame id={id}>
        <MemeColumn id={id} yD={yD} today={f.today} s={s} />
        <Bedrock id={id} yR={yR} />
        <line x1="24" y1={yD} x2="536" y2={yD} className="stroke-fg" strokeWidth="1" strokeDasharray="7 4" />
        <Tag x={44} y={Math.max(30, yD - 20)} letter="D" r={10} />
        <text x="60" y={Math.max(30, yD - 20) + 4} fontSize="12" fontWeight="600" style={sans} className="fill-fg">Paid datum</text>
        {f.today !== null && (
          <>
            <line x1="92" y1={Math.max(aTop - 14, 40)} x2="92" y2={aTop - 1} className="stroke-fg" strokeWidth=".8" />
            <Tag x={92} y={Math.max(aTop - 26, 30)} letter="A" />
          </>
        )}
        <Tag x={413} y={BASE - yR > 60 ? yR + 28 : Math.max(30, yR - 18)} letter="R" r={12} />
        <text x={ROCK.x + ROCK.w / 2} y={BASE - 8} textAnchor="middle" fontSize="11" fontWeight="600" style={sans} className="fill-bg" opacity={BASE - yR > 40 ? 1 : 0}>{stockSymbol}</text>
      </PlateFrame>
      <Scale max={max} />
    </svg>
  );
}

function Horizon({ letter, moss, name, value, children }: { letter: string; moss?: boolean; name: string; value: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-line py-2.5">
      <span aria-hidden className={cx("mt-0.5 grid size-6 place-items-center self-start rounded-full border font-display text-base leading-none", moss ? "border-accent bg-accent text-accent-fg" : "border-fg")}>{letter}</span>
      <span className="text-[0.9375rem] font-semibold">{name}</span>
      <span className="num text-right text-[1.0625rem] font-semibold">{value}</span>
      <span className="col-span-2 col-start-2 text-[0.8125rem] leading-snug text-muted [overflow-wrap:anywhere]">{children}</span>
    </li>
  );
}

/** Fig. 1 for a real card: the plate plus captions citing where each horizon was read. */
export function StrataPlate({ card, className, titleId = "fig1-title" }: { card: Card; className?: string; titleId?: string }) {
  const buys = card.memes.reduce((n, m) => n + m.buys.length, 0);
  const quoted = card.memes.filter((m) => m.usdToday8 !== null).length;
  const noQuote = card.memes.length > 0 && quoted === 0;
  const totals = card.totals as Card["totals"] & { usdToday8: string | null };
  const todayV8 = noQuote ? null : totals.usdToday8;
  const f: PlateFigures = { paid: dollars(card.totals.usdPaid8), today: todayV8 === null ? null : dollars(todayV8), stock: dollars(card.totals.usdCounterfactual8) };
  const s = SPAN / Math.max(f.paid, f.today ?? 0, f.stock, 0.01);
  const thickened = f.today !== null && f.today * s < MIN_CRUST;
  const who = short(card.wallet);
  const label = `Cross-section of wallet ${who}, drawn to scale. Paid datum ${usd8(card.totals.usdPaid8)}. Meme horizon today ${todayV8 === null ? "has no live quote" : usd8(todayV8)}. ${card.stock} bedrock horizon ${usd8(card.totals.usdCounterfactual8)}.`;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <figure aria-labelledby={titleId} className={cx("m-0", className)}>
      <div className="border border-fg bg-bg p-[5px] shadow-[var(--shadow-plate)]">
        <StrataSvg f={f} label={label} stockSymbol={card.stock} />
      </div>
      <figcaption className="mt-3">
        <p id={titleId} className="mb-2 font-display text-xl leading-tight">
          <i>Fig. 1.</i> Section through wallet <span className="num">{who}</span>, drawn to scale.
        </p>
        <ol className="border-t border-fg">
          <Horizon letter="A" name={f.today !== null && f.today < f.paid ? "Eroded meme horizon" : "Meme horizon"} value={todayV8 === null ? "No live quote" : usd8(todayV8)}>
            {todayV8 === null
              ? "No live price could be read for these memes right now. Nothing is estimated in its place."
              : <>Memes still held, at today&apos;s price{quoted < card.memes.length ? ` (${quoted} of ${card.memes.length} memes have a live price; paid for those: ${usd8(card.totals.usdPaidQuoted8)})` : ""}. Source: {plural(buys, "buy transaction")} on Robinhood Chain.{thickened ? " Line thickened to stay visible." : ""}</>}
          </Horizon>
          <Horizon letter="R" moss name={`Bedrock ${card.stock} horizon`} value={usd8(card.totals.usdCounterfactual8)}>
            {shares18(card.totals.shares18)} {card.stock} shares, had the same dollars bought {card.stock} on the same days. Source: the Chainlink {card.stock} round in force at each buy.
          </Horizon>
          <Horizon letter="D" name="Paid datum" value={usd8(card.totals.usdPaid8)}>
            Sum of {plural(buys, "buy")} in USD. Source: the buy transactions on Robinhood Chain, each priced by the Chainlink round in force when it landed.
          </Horizon>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Values re-read live, as of block <span className="num">{card.asOfBlock.toLocaleString("en-US")}</span>.
        </p>
      </figcaption>
    </figure>
  );
}

/** Fig. 1 "in proof": the plate while its horizons are being read. Bands engrave in sequence (CSS; off under reduced motion). */
export function PlateInProof({ className }: { className?: string }) {
  const id = `q${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bands = [346, 292, 238, 184, 128];
  return (
    <figure aria-labelledby={`${id}-t`} className={cx("m-0", className)}>
      <div className="border border-fg bg-bg p-[5px] shadow-[var(--shadow-plate)]">
        <svg viewBox="0 0 600 440" role="img" aria-label="Fig. 1 being engraved. Each horizon is drawn only after its buys and Chainlink rounds are read." className="block h-auto w-full">
          <PlateFrame id={id}>
            <line x1="24" y1={TOP} x2="536" y2={TOP} className="stroke-fg" strokeDasharray="7 4" />
            <Tag x={44} y={50} letter="D" r={10} />
            <text x="60" y="54" fontSize="12" fontWeight="600" style={sans} className="fill-fg">Paid datum · summing buys</text>
            <rect x={MEME.x + 0.5} y={TOP + 0.5} width={MEME.w - 1} height={BASE - TOP - 1} fill="none" className="stroke-fg" strokeOpacity=".45" strokeDasharray="2 4" />
            <text x={MEME.x + MEME.w / 2} y="236" textAnchor="middle" fontSize="22" fontStyle="italic" style={serif} className="fill-fg" fillOpacity=".78">not yet read</text>
            {bands.map((y, i) => (
              <path key={y} className="engrave" style={{ "--i": i } as CSSProperties} d={`${wave(y, 6, i % 2 === 1)} L${RIGHT} ${BASE} L${ROCK.x} ${BASE}Z`} fill={`url(#${id}ht${6 - i})`} />
            ))}
            <g fill="none" className="stroke-fg" strokeOpacity=".5" strokeWidth=".7" strokeDasharray="3 4">
              {bands.map((y, i) => <path key={y} d={wave(y, 6, i % 2 === 1)} />)}
              <path d={`M${ROCK.x} ${BASE} V100 H${RIGHT} V${BASE}`} />
            </g>
            <text x="413" y="92" textAnchor="middle" fontSize="20" fontStyle="italic" style={serif} className="fill-fg" fillOpacity=".78">engraving</text>
          </PlateFrame>
        </svg>
      </div>
      <figcaption className="mt-3">
        <p id={`${id}-t`} className="mb-2 font-display text-xl leading-tight"><i>Fig. 1.</i> The section, in proof.</p>
        <ol className="border-t border-fg">
          <Horizon letter="D" name="Paid datum" value="Reading">Source: the buy transactions on Robinhood Chain, priced by Chainlink rounds.</Horizon>
          <Horizon letter="R" moss name="Bedrock stock horizon" value="Reading">Source: the Chainlink stock round in force at each buy.</Horizon>
          <Horizon letter="A" name="Meme horizon" value="Reading">Source: today&apos;s price of each meme still held.</Horizon>
        </ol>
      </figcaption>
    </figure>
  );
}
