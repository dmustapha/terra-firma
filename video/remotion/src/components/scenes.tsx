import React from "react";
import { AbsoluteFill, Easing, interpolate, staticFile } from "remotion";
import { C, MONO, SANS, SERIF } from "../theme";
import plan from "../plan.json";
import { ramp } from "./film";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const money = (v: number, dp = 0) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const Paper: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.paper, color: C.ink, border: `1.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}`, borderRadius: 3, ...style }}>{children}</div>
);
const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.soft }) => (
  <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 2.2, textTransform: "uppercase", color }}>{children}</div>
);

// (1) hook: the card's own three numbers, counted up on the words that name them
export const HookCount: React.FC<{ t: number }> = ({ t }) => {
  const h = plan.hook, end = plan.wipes[0];
  const k = ramp(t, h.paid - 0.5, h.paid - 0.1, end - 0.5, end - 0.35);
  if (k <= 0) return null;
  const paid = interpolate(t, [h.paid - 0.2, h.paid + 1.1], [0, 18421], { ...clamp, easing: Easing.out(Easing.cubic) });
  const now = interpolate(t, [h.gone - 1.0, h.gone + 0.15], [18421, 0.35], { ...clamp, easing: Easing.in(Easing.quad) });
  const nv = interpolate(t, [h.nvda - 0.1, h.nvda + 1.4], [0, 16972], { ...clamp, easing: Easing.out(Easing.cubic) });
  const row = (label: string, value: string, color: string, on: number) => (
    <div style={{ opacity: on, transform: `translateY(${(1 - on) * 10}px)`, borderTop: `1px solid ${C.line}`, padding: "14px 0 10px" }}>
      <Kicker>{label}</Kicker>
      <div style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 1, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
  const on = (a: number) => interpolate(t, [a - 0.3, a], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 1596, top: 176, width: 300, opacity: k }}>
      <div style={{ background: "rgba(17,14,10,0.92)", border: `1px solid ${C.line}`, boxShadow: "5px 5px 0 #000", padding: "16px 20px 6px" }}>
        <Kicker color={C.mossHi}>core log · 0x3fDB…b09E</Kicker>
        <div style={{ height: 8 }} />
        {row("paid in", money(paid), C.text, on(h.paid - 0.2))}
        {row("worth now", now > 1 ? money(now) : money(now, 2), C.rustHi, on(h.gone - 1.0))}
        {row("same dollars in NVDA", money(nv), C.mossHi, on(h.nvda - 0.1))}
      </div>
    </div>
  );
};

// title plate on the home hero
export const TitlePlate: React.FC<{ t: number }> = ({ t }) => {
  const p = plan.title, k = ramp(t, p.t, p.t + 0.45, p.t + p.d - 0.4, p.t + p.d);
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{ background: `rgba(17,14,10,${0.35 * k})` }}>
      <div style={{ position: "absolute", left: 960 - 330, top: 360, width: 660, opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
        <Paper style={{ padding: "26px 34px", display: "flex", alignItems: "center", gap: 26, boxShadow: `8px 8px 0 ${C.ink}` }}>
          <img src={staticFile("img/logo.svg")} style={{ width: 108, height: 108 }} />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 0.95 }}>Terra <span style={{ fontStyle: "italic", color: C.moss }}>Firma</span></div>
            <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 2, textTransform: "uppercase", color: "#4B4438", marginTop: 10 }}>live on Robinhood Chain</div>
          </div>
        </Paper>
      </div>
    </AbsoluteFill>
  );
};

// (2) the system, drawn onto the sediment / sieve / bedrock bands (band rects from home.mp4 at 19.45 s)
const LABELS = [
  { y: 540, h: 130, title: "your memes", sub: "read live from Robinhood Chain", tone: C.rustHi },
  { y: 670, h: 124, title: "Router keeps a slice", sub: "of any buy or sell, up to 10%", tone: C.sand },
  { y: 794, h: 136, title: "Jar holds Stock Tokens", sub: "ownerless, withdraw any time", tone: C.mossHi },
];
export const SystemLabels: React.FC<{ t: number }> = ({ t }) => {
  const L = plan.labels, out = ramp(t, L.t, L.t + 0.3, L.end - 0.5, L.end - 0.3);
  if (out <= 0) return null;
  const step = (L.end - L.t - 1.0) / 4;
  const on = (i: number) => interpolate(t, [L.t + i * step, L.t + i * step + 0.45], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {LABELS.map((l, i) => <line key={i} x1={1560} y1={l.y + l.h / 2} x2={1560 + 40 * on(i)} y2={l.y + l.h / 2} stroke={l.tone} strokeWidth={3} />)}
      </svg>
      {LABELS.map((l, i) => (
        <div key={i} style={{ position: "absolute", left: 1606, top: l.y + l.h / 2 - 46, width: 296, opacity: on(i), transform: `translateX(${(1 - on(i)) * 14}px)` }}>
          <Paper style={{ padding: "9px 14px", borderLeft: `6px solid ${l.tone}` }}>
            <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.02 }}>{l.title}</div>
            <div style={{ fontFamily: SANS, fontSize: 16, color: "#4B4438", marginTop: 3 }}>{l.sub}</div>
          </Paper>
        </div>
      ))}
      <div style={{ position: "absolute", left: 360, top: 944, width: 1200, opacity: on(3), transform: `translateY(${(1 - on(3)) * 12}px)` }}>
        <Paper style={{ padding: "10px 18px", display: "flex", alignItems: "baseline", gap: 18, borderLeft: `6px solid ${C.mossHi}` }}>
          <div style={{ fontFamily: SERIF, fontSize: 32 }}>Fee pool</div>
          <div style={{ fontFamily: SANS, fontSize: 20, color: "#4B4438" }}>every trade pays 0.5%: half buys $WIF and burns it, half buys stock for $WIF stakers</div>
        </Paper>
      </div>
    </AbsoluteFill>
  );
};

// (3) the flywheel, drawn over the distribute footage
const NODES = [
  { a: -90, title: "a meme trade", sub: "any buy or sell" },
  { a: -18, title: "0.5% fee buys $WIF", sub: "never sold" },
  { a: 54, title: "half is burned", sub: "every hour" },
  { a: 126, title: "half buys stock", sub: "paid to $WIF stakers" },
  { a: 198, title: "more reason to hold $WIF", sub: "and more trades" },
];
export const Flywheel: React.FC<{ t: number }> = ({ t }) => {
  const F = plan.fly, k = ramp(t, F.t0 + 0.15, F.t0 + 0.6, F.t1 - 0.6, F.t1 - 0.3);
  if (k <= 0) return null;
  const at = [F.t0 + 0.5, F.bought, F.burned, F.paid - 0.5, F.stock - 0.3];
  const on = (i: number) => interpolate(t, [at[i] - 0.15, at[i] + 0.3], [0, 1], { ...clamp, easing: ease });
  const loop = interpolate(t, [at[0], F.stock + 0.4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const R = 290, cx = 960, cy = 470, circ = 2 * Math.PI * R;
  const spin = interpolate(t, [F.stock + 0.4, F.t1], [0, 40], clamp);
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(17,14,10,0.9) 35%, rgba(17,14,10,0.72) 75%)" }} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.line} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.mossHi} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={circ * (1 - loop)} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
        {[0, 72, 144, 216, 288].map((d, i) => {
          const a = ((d - 54 + spin) * Math.PI) / 180, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), deg = d - 54 + spin + 90;
          return <polygon key={i} points="-11,-9 11,0 -11,9" fill={C.mossHi} opacity={loop > (i + 0.5) / 5 ? 1 : 0} transform={`translate(${x} ${y}) rotate(${deg})`} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: cx - 150, top: cy - 70, width: 300, textAlign: "center" }}>
        <img src={staticFile("img/logo.svg")} style={{ width: 70, height: 70 }} />
        <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: C.mossHi, marginTop: 8 }}>THE $WIF FLYWHEEL</div>
      </div>
      {NODES.map((n, i) => {
        const a = (n.a * Math.PI) / 180, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), o = on(i);
        return (
          <div key={i} style={{ position: "absolute", left: x - 170, top: y - 44, width: 340, opacity: o, transform: `scale(${0.92 + 0.08 * o})`, textAlign: "center" }}>
            <Paper style={{ padding: "10px 14px", boxShadow: `5px 5px 0 ${C.ink}` }}>
              <div style={{ fontFamily: SERIF, fontSize: 31, lineHeight: 1.02 }}>{n.title}</div>
              <div style={{ fontFamily: SANS, fontSize: 17, color: "#4B4438", marginTop: 2 }}>{n.sub}</div>
            </Paper>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ on: number; style: React.CSSProperties; title: string; sub?: string; tone?: string }> = ({ on, style, title, sub, tone = C.mossHi }) => (
  <div style={{ position: "absolute", opacity: on, transform: `translateY(${(1 - on) * 12}px)`, ...style }}>
    <Paper style={{ padding: "12px 18px", borderLeft: `6px solid ${tone}` }}>
      <div style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.02 }}>{title}</div>
      {sub ? <div style={{ fontFamily: SANS, fontSize: 19, color: "#4B4438", marginTop: 4 }}>{sub}</div> : null}
    </Paper>
  </div>
);
export const WhoChips: React.FC<{ t: number }> = ({ t }) => {
  const w = plan.who, out = ramp(t, w.traders - 0.4, w.traders, w.end - 0.5, w.end - 0.3);
  if (out <= 0) return null;
  const on = (a: number) => interpolate(t, [a, a + 0.4], [0, 1], { ...clamp, easing: ease }) * out;
  return (
    <>
      <Chip on={on(w.traders)} style={{ left: 1010, top: 150, width: 560 }} title="meme traders on Robinhood Chain" sub="see the number, keep a slice of every trade" tone={C.rustHi} />
      <Chip on={on(w.holders)} style={{ left: 1010, top: 300, width: 560 }} title="$WIF holders, paid in stock" sub="stake once, collect every hour" />
    </>
  );
};
export const LimitsChip: React.FC<{ t: number }> = ({ t }) => {
  const l = plan.limits, on = ramp(t, l.t, l.t + 0.4, l.end - 0.5, l.end - 0.3);
  if (on <= 0) return null;
  return <Chip on={on} style={{ left: 1060, top: 150, width: 640 }} title="what it doesn't claim" sub="prices only the memes it tracks · not profit and loss · Chainlink-priced, unaudited" tone={C.sand} />;
};

// (6) close, over the home page's own "Stand on bedrock." band
export const ClosePlate: React.FC<{ t: number }> = ({ t }) => {
  const c = plan.close, k = interpolate(t, [c.t + 0.1, c.t + 0.7], [0, 1], { ...clamp, easing: ease });
  const k2 = interpolate(t, [c.t + 0.6, c.t + 1.2], [0, 1], { ...clamp, easing: ease });
  const black = interpolate(t, [c.end - 0.55, c.end - 0.05], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(17,14,10,${0.93 * k}) 0%, rgba(17,14,10,${0.9 * k}) 56%, rgba(17,14,10,0) 72%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", flexDirection: "column", alignItems: "center", opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>
        <img src={staticFile("img/logo.svg")} style={{ width: 132, height: 132 }} />
        <div style={{ fontFamily: SERIF, fontSize: 128, lineHeight: 1, color: C.text, marginTop: 18 }}>Terra <span style={{ fontStyle: "italic", color: C.mossHi }}>Firma</span></div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 50, color: C.paper2, marginTop: 14, opacity: k2 }}>Stand on $WIF. Sweep the rest into stock.</div>
        <div style={{ display: "flex", gap: 22, marginTop: 30, opacity: k2 }}>
          {["terrafirma-wif.vercel.app", "github.com/dmustapha/terra-firma"].map((u) => (
            <div key={u} style={{ fontFamily: MONO, fontSize: 26, color: C.ink, background: C.paper, border: `1.5px solid ${C.ink}`, boxShadow: `5px 5px 0 #000`, padding: "8px 16px", borderRadius: 3 }}>{u}</div>
          ))}
        </div>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </AbsoluteFill>
  );
};
