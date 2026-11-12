import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FPS, MONO, SANS, SERIF, f } from "../theme";
import plan from "../plan.json";

export type Seg = { clip: string; f0: number; f1: number; s0: number; speed: number; join: string; scene: string; tag?: string | null; card?: { action: string; tx?: string | null; step?: string | null } };
export type Call = { t: number; d: number; rect: number[]; label: string | null; sub?: string | null; place?: string; zoom?: number | null };
export const SEGS = plan.segs as Seg[];
export const CALLS = plan.calls as Call[];
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const XF = 5; // frames of dissolve on a jump cut inside a scene

export const useT = () => useCurrentFrame() / FPS;
export const ramp = (t: number, a: number, b: number, c: number, d: number) =>
  interpolate(t, [a, b, c, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// camera: focus zooms on the thing being named; the target moves toward frame centre but never past an edge
type Focus = { t: number; d: number; rect: number[]; s: number };
const HOOK_FOCUS: Focus[] = [
  { t: plan.hook.gone - 0.5, d: 2.2, rect: [900, 226, 150, 64], s: 1.1 },
  { t: plan.hook.nvda - 0.3, d: 3.6, rect: [900, 288, 400, 70], s: 1.12 },
];
export const FOCUS: Focus[] = [...HOOK_FOCUS, ...CALLS.filter((c) => c.zoom).map((c) => ({ t: c.t - 0.15, d: c.d + 0.35, rect: c.rect, s: c.zoom as number }))];
export const camera = (t: number) => {
  let s = 1, tx = 0, ty = 0;
  for (const z of FOCUS) {
    const k = ramp(t, z.t, z.t + 0.55, z.t + z.d - 0.45, z.t + z.d);
    if (k <= 0.001) continue;
    const cx = z.rect[0] + z.rect[2] / 2, cy = z.rect[1] + z.rect[3] / 2, S = z.s;
    const X = Math.min(0, Math.max(1920 * (1 - S), 960 - S * cx)), Y = Math.min(0, Math.max(1080 * (1 - S), 470 - S * cy));
    s = 1 + (S - 1) * k; tx = X * k; ty = Y * k;
  }
  return { s, tx, ty };
};

const SegView: React.FC<{ s: Seg; next?: Seg }> = ({ s, next }) => {
  const frame = useCurrentFrame();
  const src = staticFile(`clips/${s.clip}.mp4`);
  const fadeIn = s.join === "cut" && s.speed !== 0 ? interpolate(frame, [0, XF], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const style: React.CSSProperties = { width: 1920, height: 1080, opacity: fadeIn };
  if (s.speed === 0) return <Img src={staticFile((s as any).img)} style={style} />;
  return <OffthreadVideo src={src} trimBefore={Math.round(s.s0 * FPS)} playbackRate={s.speed} muted style={style} />;
};

export const Footage: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {SEGS.map((s, i) => {
      const next = SEGS[i + 1];
      const tail = next && next.join === "cut" && next.speed !== 0 ? XF : 0; // keep playing under the incoming dissolve
      const from = f(s.f0), dur = Math.max(1, f(s.f1) - from + tail);
      return <Sequence key={i} from={from} durationInFrames={dur} layout="none"><AbsoluteFill><SegView s={s} next={next} /></AbsoluteFill></Sequence>;
    })}
  </AbsoluteFill>
);

// a ring drawn round the named element, with a paper tag (pixel-offset shadow, almanac style)
export const Callout: React.FC<{ c: Call; t: number }> = ({ c, t }) => {
  const k = ramp(t, c.t, c.t + 0.4, c.t + c.d - 0.3, c.t + c.d);
  if (k <= 0.001 || !c.label) return null;
  const pad = 8, [x, y, w, h] = c.rect, X = x - pad, Y = y - pad, Wd = w + pad * 2, H = h + pad * 2, per = 2 * (Wd + H);
  const place = c.place ?? "below", chipW = Math.max(260, Math.min(620, 18 * Math.max(c.label.length, (c.sub ?? "").length * 0.72)));
  const cx = Math.min(Math.max(X, 24), 1920 - chipW - 24);
  const pos: React.CSSProperties = place === "above" ? { left: cx, top: Y - 16, transform: `translateY(-100%) translateY(${(1 - k) * 8}px)` }
    : place === "below" ? { left: cx, top: Y + H + 16, transform: `translateY(${(1 - k) * 8}px)` }
    : place === "left" ? { left: Math.max(24, X - chipW - 22), top: Y, transform: `translateX(${(1 - k) * -8}px)` }
    : { left: Math.min(X + Wd + 22, 1920 - chipW - 24), top: Y, transform: `translateX(${(1 - k) * 8}px)` };
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: Math.min(1, k * 1.5) }}>
        <rect x={X} y={Y} width={Wd} height={H} rx={4} fill="none" stroke={C.mossHi} strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - k)} />
      </svg>
      <div style={{ position: "absolute", width: chipW, opacity: k, ...pos }}>
        <div style={{ background: C.paper, color: C.ink, border: `1.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}`, borderRadius: 3, padding: "10px 16px" }}>
          <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.05 }}>{c.label}</div>
          {c.sub ? <div style={{ fontFamily: SANS, fontSize: 19, color: "#4B4438", marginTop: 4, lineHeight: 1.25 }}>{c.sub}</div> : null}
        </div>
      </div>
    </>
  );
};

export const Captions: React.FC<{ t: number; top: boolean }> = ({ t, top }) => {
  const cur = (plan.caps as { t: number; e: number; text: string }[]).find((c) => t >= c.t - 0.02 && t <= c.e + 0.12);
  if (!cur) return null;
  const e = Math.max(cur.e, cur.t + 0.3);
  const k = interpolate(t, [cur.t, cur.t + 0.12, e, e + 0.12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, [top ? "top" : "bottom"]: top ? 92 : 44, display: "flex", justifyContent: "center", opacity: k }}>
      <div style={{ maxWidth: 1480, textAlign: "center", fontFamily: SANS, fontWeight: 500, fontSize: 40, lineHeight: 1.28, color: C.text, background: "rgba(17,14,10,0.9)", borderLeft: `4px solid ${C.mossHi}`, padding: "12px 26px", borderRadius: 3, boxShadow: "4px 4px 0 rgba(0,0,0,0.6)" }}>{cur.text}</div>
    </div>
  );
};

export const SpeedTag: React.FC<{ t: number }> = ({ t }) => {
  const s = SEGS.find((x) => t >= x.f0 && t < x.f1 && x.tag);
  if (!s) return null;
  const k = ramp(t, s.f0, s.f0 + 0.15, s.f1 - 0.1, s.f1) * 0.75;
  return <div style={{ position: "absolute", right: 22, bottom: 18, opacity: k, fontFamily: MONO, fontSize: 17, letterSpacing: 1, color: C.soft, background: "rgba(17,14,10,0.7)", border: `1px solid ${C.line}`, padding: "4px 10px", borderRadius: 3 }}>{"▸▸ " + s.tag}</div>;
};

export const WalletCard: React.FC<{ t: number }> = ({ t }) => {
  const s = SEGS.find((x) => x.card && t >= x.f0 - 0.02 && t < x.f1 + 0.12);
  if (!s || !s.card) return null;
  const k = interpolate(t, [s.f0, s.f0 + 0.16, s.f1 - 0.02, s.f1 + 0.12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ background: `rgba(17,14,10,${0.42 * k})` }}>
      <div style={{ position: "absolute", left: 960 - 330, top: 330, width: 660, opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>
        <div style={{ background: C.paper, color: C.ink, border: `2px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.ink}`, borderRadius: 4, padding: "22px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={staticFile("img/logo.svg")} style={{ width: 44, height: 44 }} />
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.moss, letterSpacing: 0.3 }}>Confirmed in wallet {"✓"}</div>
            {s.card.step ? <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 16, color: "#4B4438" }}>{s.card.step}</div> : null}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 50, lineHeight: 1.05, marginTop: 12 }}>{s.card.action}</div>
          <div style={{ fontFamily: MONO, fontSize: 19, color: "#4B4438", marginTop: 10 }}>{s.card.tx ? `tx ${s.card.tx} · Robinhood Chain mainnet` : "token approval · Robinhood Chain mainnet"}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// strata wipe: three sediment layers rise through the cut (bedrock, sieve, sediment) and carry on up, revealing the next shot
export const Strata: React.FC<{ t: number }> = ({ t }) => {
  const w = (plan.wipes as number[]).find((x) => t > x - 0.45 && t < x + 0.45);
  if (w === undefined) return null;
  // rust (sediment) leads, sand (sieve) and moss (bedrock) follow; bands overlap so the stagger never opens a gap
  const bands = [{ c: C.rust, y: 0, d: 0 }, { c: "#8F8672", y: 360, d: 0.035 }, { c: C.moss, y: 720, d: 0.07 }];
  return (
    <AbsoluteFill>
      {bands.map((b, i) => {
        const p = interpolate(t, [w - 0.4 + b.d, w - 0.03, w + 0.03, w + 0.4 + b.d], [1080, 0, 0, -1240], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        return <div key={i} style={{ position: "absolute", left: 0, width: 1920, top: b.y + p, height: i === 2 ? 600 : 580, background: b.c, backgroundImage: "repeating-linear-gradient(-45deg, rgba(0,0,0,0.14) 0 2px, transparent 2px 16px)", borderTop: `3px solid ${C.ink}`, zIndex: 3 - i }} />;
      })}
    </AbsoluteFill>
  );
};
