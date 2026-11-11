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
const MEME = { x: 34, w: 206 };
const ROCK = { x: 256, w: 234 };
const RIGHT = ROCK.x + ROCK.w;
const AXIS = 502;
/** Smallest meme horizon we draw, in plate units. Thinner real values are thickened and the caption says so. */
const MIN_CRUST = 5;
const VB = { w: 600, h: 440 };

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
  return `M${ROCK.x} ${y} C${ROCK.x + 50} ${y - a} ${ROCK.x + 100} ${y + a} ${ROCK.x + 150} ${y} S${ROCK.x + 210} ${y - a} ${RIGHT} ${y + a * 0.4}`;
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
      {dot(3, 1.45)}
      {dot(4, 1.8)}
      <pattern id={`${id}removed`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" className="stroke-accent" strokeOpacity=".32" strokeWidth="1" />
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

/**
 * Text on the plate is HTML laid over the SVG at viewBox-percentage positions, so it keeps its CSS size
 * (never below 11px) at every plate width instead of shrinking with the drawing.
 */
type Anchor = "start" | "middle" | "end";
type VAlign = "mid" | "above" | "below";
const hx: Record<Anchor, string> = { start: "0", middle: "-50%", end: "-100%" };
const vy: Record<VAlign, string> = { mid: "-50%", above: "-100%", below: "0" };

function At({ x, y, anchor = "start", v = "mid", className, children }: { x: number; y: number; anchor?: Anchor; v?: VAlign; className?: string; children: ReactNode }) {
  return (
    <span className={cx("absolute", className)} style={{ left: `${(x / VB.w) * 100}%`, top: `${(y / VB.h) * 100}%`, transform: `translate(${hx[anchor]},${vy[v]})` }}>
      {children}
    </span>
  );
}

function Tag({ letter, moss }: { letter: string; moss?: boolean }) {
  return (
    <span aria-hidden className={cx("grid size-5 shrink-0 place-items-center rounded-full border font-display text-sm leading-none", moss ? "border-accent bg-accent text-accent-fg" : "border-fg bg-bg text-fg")}>
      {letter}
    </span>
  );
}

/** A plate label: letter tag, plain words, and the geology name as a small italic secondary caption. */
function PlateLabel({ letter, moss, name, geo, wideOnly, className }: { letter: string; moss?: boolean; name: string; geo?: string; wideOnly?: boolean; className?: string }) {
  return (
    <span className={cx("flex items-start justify-end gap-1.5", className)}>
      <Tag letter={letter} moss={moss} />
      <span className={cx("bg-bg/85 px-1 text-xs leading-tight font-semibold text-fg", wideOnly && "max-sm:hidden")}>
        {name}
        {geo && <i className="block font-display text-[0.75rem] font-normal text-muted">{geo}</i>}
      </span>
    </span>
  );
}

function PlateFrame({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <Screens id={id} />
      <rect x="0" y="0" width={VB.w} height={VB.h} className="fill-bg" />
      <rect x="10.5" y="10.5" width="579" height="419" fill="none" className="stroke-fg" strokeWidth=".6" />
      <rect x="24" y="22" width={RIGHT - 24} height={TOP - 22} fill={`url(#${id}sky)`} />
      {children}
      <rect x="24" y={BASE} width={RIGHT - 24} height="18" fill={`url(#${id}hatch)`} opacity=".55" />
      <line x1="24" y1={BASE} x2={RIGHT} y2={BASE} className="stroke-fg" strokeWidth="1.4" />
    </>
  );
}

const scaleTicks = (max: number) => {
  const step = niceStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max * 1.0001; v += step) ticks.push(v);
  return ticks;
};

function ScaleLines({ max }: { max: number }) {
  const y = (v: number) => BASE - (v / max) * SPAN;
  return (
    <g className="stroke-fg">
      <line x1={AXIS} y1={TOP} x2={AXIS} y2={BASE} strokeWidth=".8" />
      {scaleTicks(max).map((v) => <line key={v} x1={v === 0 ? AXIS - 5 : AXIS - 3} y1={y(v)} x2={v === 0 ? AXIS + 5 : AXIS + 3} y2={y(v)} />)}
    </g>
  );
}

function ScaleLabels({ max }: { max: number }) {
  const y = (v: number) => BASE - (v / max) * SPAN;
  return (
    <>
      <At x={AXIS + 9} y={40} className="text-[0.6875rem] text-muted">USD</At>
      {scaleTicks(max).map((v) => (
        <At key={v} x={AXIS + 9} y={y(v)} className="num text-[0.6875rem] leading-none text-fg">{v === 0 ? "$0" : compact.format(v)}</At>
      ))}
    </>
  );
}

/** Bedrock: one horizon line splits the column into at most two bands. */
function Bedrock({ id, yR }: { id: string; yR: number }) {
  const h = BASE - yR;
  const mid = h >= 36 ? yR + h * 0.55 : null;
  const amp = Math.min(6, h / 14);
  return (
    <g>
      <rect x={ROCK.x} y={yR} width={ROCK.w} height={h} fill={`url(#${id}${mid === null ? "ht3" : "ht1"})`} />
      {mid !== null && (
        <>
          <path d={`${wave(mid, amp, false)} L${RIGHT} ${BASE} L${ROCK.x} ${BASE}Z`} fill={`url(#${id}ht4)`} />
          <path d={wave(mid, amp, false)} fill="none" className="stroke-fg" strokeWidth=".7" />
        </>
      )}
      <line x1={ROCK.x} y1={yR} x2={RIGHT} y2={yR} className="stroke-fg" strokeWidth="1.6" />
      <line x1={ROCK.x} y1={yR} x2={ROCK.x} y2={BASE} className="stroke-fg" strokeWidth="1.2" />
    </g>
  );
}

const DIM_X = MEME.x + 16;

/** Meme column. Ground the memes once held is hatched (removed, not missing); the dimension line measures the gap. */
function MemeColumn({ id, yD, aTop, today }: { id: string; yD: number; aTop: number; today: number | null }) {
  if (today === null) {
    return <rect x={MEME.x + 0.5} y={yD + 0.5} width={MEME.w - 1} height={BASE - yD - 1} fill="none" className="stroke-fg" strokeOpacity=".55" strokeWidth=".7" strokeDasharray="2 3" />;
  }
  const eroded = aTop > yD;
  const thick = BASE - aTop > 14;
  return (
    <g>
      {eroded && (
        <>
          <rect x={MEME.x} y={yD} width={MEME.w} height={aTop - yD} className="fill-accent-06" />
          <rect x={MEME.x} y={yD} width={MEME.w} height={aTop - yD} fill={`url(#${id}removed)`} />
          <rect x={MEME.x + 0.5} y={yD + 0.5} width={MEME.w - 1} height={aTop - yD - 1} fill="none" className="stroke-fg" strokeOpacity=".55" strokeWidth=".7" strokeDasharray="2 3" />
          {aTop - yD > 12 && (
            <g className="stroke-fg" strokeWidth="1">
              <line x1={DIM_X} y1={yD + 1} x2={DIM_X} y2={aTop - 1} />
              <line x1={DIM_X - 6} y1={yD + 1} x2={DIM_X + 6} y2={yD + 1} />
              <line x1={DIM_X - 6} y1={aTop - 1} x2={DIM_X + 6} y2={aTop - 1} />
              <path d={`M${DIM_X - 4} ${yD + 8} L${DIM_X} ${yD + 1} L${DIM_X + 4} ${yD + 8} M${DIM_X - 4} ${aTop - 8} L${DIM_X} ${aTop - 1} L${DIM_X + 4} ${aTop - 8}`} fill="none" />
            </g>
          )}
        </>
      )}
      <rect x={MEME.x} y={aTop} width={MEME.w} height={BASE - aTop} fill={`url(#${id}${thick ? "ht4" : "crust"})`} />
      {thick && <rect x={MEME.x} y={aTop} width={MEME.w} height={BASE - aTop} fill="none" className="stroke-fg" strokeWidth=".8" />}
    </g>
  );
}

export interface PlateFigures {
  paid: number;
  today: number | null;
  stock: number;
}

const memeTop = (f: PlateFigures, s: number, yD: number) => (f.today === null ? yD : BASE - Math.max(f.today * s, MIN_CRUST));

/** Labels over the plate (HTML, see `At`). */
function PlateLabels({ f, yD, yR, aTop, stockSymbol, lost }: { f: PlateFigures; yD: number; yR: number; aTop: number; stockSymbol: string; lost?: string }) {
  const dLabelY = Math.max(TOP - 26, yD - 8);
  const rockTall = BASE - yR > 80;
  const mid = MEME.x + MEME.w / 2;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <At x={MEME.x - 4} y={dLabelY} v="above"><PlateLabel letter="D" name="What you paid" geo="paid datum" className="justify-start" /></At>
      {f.today === null ? (
        <At x={mid} y={(yD + BASE) / 2} anchor="middle" className="text-center">
          <span className="block font-display text-base italic text-fg">no live quote</span>
          <span className="block text-[0.6875rem] text-muted">today&apos;s value could not be read</span>
        </At>
      ) : (
        <>
          <At x={MEME.x + MEME.w - 4} y={aTop - 6} anchor="end" v="above" className="w-[28%]">
            <PlateLabel letter="A" wideOnly name="What your memes are worth now" geo={f.today < f.paid ? "eroded meme horizon" : "meme horizon"} />
          </At>
          {lost && aTop - yD > 12 && (
            <At x={DIM_X + 8} y={(yD + aTop) / 2} className="num max-w-[28%] bg-bg/85 px-1 text-xs font-semibold text-fg">{lost}</At>
          )}
        </>
      )}
      <At x={ROCK.x + 8} y={rockTall ? yR + 10 : yR - 6} v={rockTall ? "below" : "above"} className="max-w-[36%]">
        <PlateLabel letter="R" moss name={`What ${stockSymbol} would be worth`} geo="bedrock horizon" className="justify-start" />
      </At>
    </div>
  );
}

/** The engraved plate: SVG shapes plus HTML labels positioned over it. */
export function StrataSvg({ f, label, stockSymbol, lost }: { f: PlateFigures; label: string; stockSymbol: string; lost?: string }) {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const max = Math.max(f.paid, f.today ?? 0, f.stock, 0.01);
  const s = SPAN / max;
  const yD = BASE - f.paid * s;
  const yR = BASE - f.stock * s;
  const aTop = memeTop(f, s, yD);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label={label} className="block h-auto w-full">
        <PlateFrame id={id}>
          <MemeColumn id={id} yD={yD} aTop={aTop} today={f.today} />
          <Bedrock id={id} yR={yR} />
          <line x1="24" y1={yD} x2={RIGHT} y2={yD} className="stroke-fg" strokeWidth="1" strokeDasharray="7 4" />
        </PlateFrame>
        <ScaleLines max={max} />
      </svg>
      <PlateLabels f={f} yD={yD} yR={yR} aTop={aTop} stockSymbol={stockSymbol} lost={lost} />
      <div aria-hidden className="pointer-events-none absolute inset-0"><ScaleLabels max={max} /></div>
    </div>
  );
}

function Horizon({ letter, moss, name, geo, value, children }: { letter: string; moss?: boolean; name: string; geo: string; value: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-line py-2.5">
      <span aria-hidden className={cx("mt-0.5 grid size-6 place-items-center self-start rounded-full border font-display text-base leading-none", moss ? "border-accent bg-accent text-accent-fg" : "border-fg")}>{letter}</span>
      <span className="text-[0.9375rem] font-semibold">
        {name} <i className="font-display text-sm font-normal text-muted">{geo}</i>
      </span>
      <span className="num text-right text-[1.0625rem] font-semibold">{value}</span>
      <span className="col-span-2 col-start-2 text-[0.8125rem] leading-snug text-muted [overflow-wrap:anywhere]">{children}</span>
    </li>
  );
}

/** Dimension label for the gap between what was paid and what the memes are worth now (null when not measurable). */
function lostLabel(card: Card, todayV8: string | null, quoted: number) {
  if (todayV8 === null) return undefined;
  const gap = BigInt(card.totals.usdPaid8) - BigInt(todayV8);
  if (gap <= 0n) return undefined;
  return quoted < card.memes.length ? `${usd8(gap)} below paid` : `${usd8(gap)} lost`;
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
  const lost = lostLabel(card, todayV8, quoted);
  const label = `Cross-section of wallet ${who}, drawn to scale. What you paid: ${usd8(card.totals.usdPaid8)}. What the memes are worth now: ${todayV8 === null ? "no live quote" : usd8(todayV8)}${lost ? ` (${lost})` : ""}. What ${card.stock} would be worth: ${usd8(card.totals.usdCounterfactual8)}.`;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <figure aria-labelledby={titleId} className={cx("m-0", className)}>
      <div className="border border-fg bg-bg p-[5px] shadow-[var(--shadow-plate)]">
        <StrataSvg f={f} label={label} stockSymbol={card.stock} lost={lost} />
      </div>
      <figcaption className="mt-3">
        <p id={titleId} className="mb-2 font-display text-xl leading-tight">
          <i>Fig. 1.</i> Section through wallet <span className="num">{who}</span>, drawn to scale.
        </p>
        <ol className="border-t border-fg">
          <Horizon letter="D" name="What you paid" geo="paid datum" value={usd8(card.totals.usdPaid8)}>
            Sum of {plural(buys, "buy")} in USD. Source: the buy transactions on Robinhood Chain, each priced by the Chainlink round in force when it landed.
          </Horizon>
          <Horizon letter="A" name="What your memes are worth now" geo={f.today !== null && f.today < f.paid ? "eroded meme horizon" : "meme horizon"} value={todayV8 === null ? "No live quote" : usd8(todayV8)}>
            {todayV8 === null
              ? "No live price could be read for these memes right now. Nothing is estimated in its place."
              : <>Memes still held, at today&apos;s price{quoted < card.memes.length ? ` (${quoted} of ${card.memes.length} memes have a live price; paid for those: ${usd8(card.totals.usdPaidQuoted8)})` : ""}. Source: {plural(buys, "buy transaction")} on Robinhood Chain.{thickened ? " Line thickened to stay visible." : ""}</>}
          </Horizon>
          <Horizon letter="R" moss name={`What ${card.stock} would be worth`} geo="bedrock horizon" value={usd8(card.totals.usdCounterfactual8)}>
            {shares18(card.totals.shares18)} {card.stock} shares, had the same dollars bought {card.stock} on the same days. Source: the Chainlink {card.stock} round in force at each buy.
          </Horizon>
        </ol>
        <p className="mt-2 text-xs text-muted">
          Values re-read live, as of block <span className="num">{card.asOfBlock.toLocaleString("en-US")}</span>.
        </p>
      </figcaption>
    </figure>
  );
}

/** Fig. 1 "in proof": the plate while its horizons are being read. Two bands engrave in sequence (CSS; off under reduced motion). */
export function PlateInProof({ className }: { className?: string }) {
  const id = `q${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bands = [300, 170];
  return (
    <figure aria-labelledby={`${id}-t`} className={cx("m-0", className)}>
      <div className="border border-fg bg-bg p-[5px] shadow-[var(--shadow-plate)]">
        <div className="relative">
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} role="img" aria-label="Fig. 1 being engraved. Each horizon is drawn only after its buys and Chainlink rounds are read." className="block h-auto w-full">
            <PlateFrame id={id}>
              <line x1="24" y1={TOP} x2={RIGHT} y2={TOP} className="stroke-fg" strokeDasharray="7 4" />
              <rect x={MEME.x + 0.5} y={TOP + 0.5} width={MEME.w - 1} height={BASE - TOP - 1} fill="none" className="stroke-fg" strokeOpacity=".45" strokeDasharray="2 4" />
              {bands.map((y, i) => (
                <path key={y} className="engrave" style={{ "--i": i } as CSSProperties} d={`${wave(y, 6, i % 2 === 1)} L${RIGHT} ${BASE} L${ROCK.x} ${BASE}Z`} fill={`url(#${id}ht${i === 0 ? 4 : 1})`} />
              ))}
              <g fill="none" className="stroke-fg" strokeOpacity=".5" strokeWidth=".7" strokeDasharray="3 4">
                {bands.map((y, i) => <path key={y} d={wave(y, 6, i % 2 === 1)} />)}
                <path d={`M${ROCK.x} ${BASE} V100 H${RIGHT} V${BASE}`} />
              </g>
            </PlateFrame>
          </svg>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <At x={MEME.x - 4} y={TOP - 8} v="above"><PlateLabel letter="D" name="What you paid" geo="summing buys" className="justify-start" /></At>
            <At x={MEME.x + MEME.w / 2} y={236} anchor="middle" className="font-display text-base italic whitespace-nowrap text-fg">not yet read</At>
            <At x={ROCK.x + ROCK.w / 2} y={128} anchor="middle" className="bg-bg/85 px-1 font-display text-base italic whitespace-nowrap text-fg">engraving</At>
          </div>
        </div>
      </div>
      <figcaption className="mt-3">
        <p id={`${id}-t`} className="mb-2 font-display text-xl leading-tight"><i>Fig. 1.</i> The section, in proof.</p>
        <ol className="border-t border-fg">
          <Horizon letter="D" name="What you paid" geo="paid datum" value="Reading">Source: the buy transactions on Robinhood Chain, priced by Chainlink rounds.</Horizon>
          <Horizon letter="A" name="What your memes are worth now" geo="meme horizon" value="Reading">Source: today&apos;s price of each meme still held.</Horizon>
          <Horizon letter="R" moss name="What the stock would be worth" geo="bedrock horizon" value="Reading">Source: the Chainlink stock round in force at each buy.</Horizon>
        </ol>
      </figcaption>
    </figure>
  );
}
