"use client";

// Scroll-linked system: a borehole log down the left gutter. A drill bit descends as you read; strata labels mark the sections.
// Pure CSS var update in rAF (compositor transform). Hidden below xl. Reduced motion: the bit still tracks, no easing.
import { useEffect, useRef } from "react";

const MARKS = [
  { at: 0.02, label: "surface" },
  { at: 0.3, label: "sediment" },
  { at: 0.55, label: "sieve" },
  { at: 0.8, label: "bedrock" },
];

export function DepthGauge() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      ref.current?.style.setProperty("--p", String(p));
      raf = 0;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); };
  }, []);
  return (
    <div ref={ref} aria-hidden className="depth-gauge pointer-events-none fixed top-24 bottom-10 left-3 z-30 hidden w-10 xl:block">
      <span className="absolute inset-y-0 left-3 w-px bg-line-strong/40" />
      <span className="absolute top-0 left-3 w-[3px] -translate-x-px bg-accent" style={{ height: "calc(var(--p, 0) * 100%)" }} />
      {Array.from({ length: 21 }, (_, i) => (
        <span key={i} className="absolute left-3 h-px bg-line-strong/50" style={{ top: `${i * 5}%`, width: i % 5 === 0 ? 10 : 5 }} />
      ))}
      {MARKS.map((m) => (
        <span key={m.label} className="eyebrow absolute left-6 -translate-y-1/2 text-[0.5625rem] text-muted [writing-mode:vertical-rl]" style={{ top: `${m.at * 100}%` }}>{m.label}</span>
      ))}
      <span className="drill-tip absolute left-3 -translate-x-1/2" style={{ top: "calc(var(--p, 0) * 100%)" }} />
    </div>
  );
}
