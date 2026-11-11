import Link from "next/link";
import { cx } from "./ui";

/** PRD §4.13 "Landing guarantee" (critique E-1). Copy is fixed; do not paraphrase. */
export const GUARANTEE = "Every number here is recomputable onchain. Terra Firma never sells or prices $WIF. Every stock fill is bounded by Chainlink.";

/** Deep link into the /proof recompute box, prefilled when a wallet is known. */
export function recomputeHref(addr?: string, stock?: string) {
  if (!addr) return "/proof#recompute";
  const q = new URLSearchParams({ addr, ...(stock ? { stock } : {}) });
  return `/proof?${q.toString()}#recompute`;
}

/** The honesty line. `lead` sets it in body type directly under a headline; the default is the small foot line on a card. */
export function Guarantee({ addr, stock, className, lead = false }: { addr?: string; stock?: string; className?: string; lead?: boolean }) {
  return (
    <p className={cx("border-t border-line pt-3 leading-relaxed", lead ? "text-[1.0625rem] text-fg" : "text-sm text-muted", className)}>
      {GUARANTEE}{" "}
      <Link
        href={recomputeHref(addr, stock)}
        className="inline-flex min-h-11 items-center whitespace-nowrap rounded-sm font-semibold text-accent underline decoration-accent-32 decoration-1 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-150 hover:text-accent-strong hover:decoration-accent hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        Recompute this card<span aria-hidden>&nbsp;→</span>
      </Link>
    </p>
  );
}
