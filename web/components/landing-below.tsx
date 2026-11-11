"use client";

// Below-the-fold landing sections, split into their own chunk so the hero hydrates first.
// The placeholders reserve the sections' height so nothing jumps when they arrive.
import dynamic from "next/dynamic";

export const LazyEditionFigures = dynamic(() => import("./landing-live").then((m) => m.EditionFigures), {
  ssr: false,
  loading: () => <div aria-hidden className="min-h-14 border-y border-line-strong" />,
});

export const LazyDispatches = dynamic(() => import("./landing-live").then((m) => m.Dispatches), {
  ssr: false,
  loading: () => <div aria-hidden className="min-h-24 border-t-2 border-line-strong" />,
});
