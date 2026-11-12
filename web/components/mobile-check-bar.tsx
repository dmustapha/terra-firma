"use client";

// Phones only: the primary action stays one thumb away. Hidden while the wallet field is on screen.
import { useEffect, useState } from "react";

export function MobileCheckBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const field = document.getElementById("lookup");
    if (!field) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top > innerHeight * 0.5));
    io.observe(field);
    return () => io.disconnect();
  }, []);
  return (
    <div inert={!show} className={`fixed inset-x-0 bottom-0 z-40 border-t border-fg/20 bg-sheet/95 px-4 py-2.5 backdrop-blur-md transition-transform duration-300 sm:hidden ${show ? "translate-y-0" : "translate-y-full"}`}>
      <button
        type="button"
        onClick={() => {
          const f = document.getElementById("lookup") as HTMLInputElement | null;
          f?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
          window.setTimeout(() => f?.focus({ preventScroll: true }), 450);
        }}
        className="flex min-h-12 w-full items-center justify-center rounded-sm border border-accent bg-accent text-[1.0625rem] font-semibold text-accent-fg "
      >
        Check my bag →
      </button>
    </div>
  );
}
