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

export function Guarantee({ addr, stock, className }: { addr?: string; stock?: string; className?: string }) {
  return (
    <p className={cx("flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3", className)}>
      <span>{GUARANTEE}</span>
      <Link
        href={recomputeHref(addr, stock)}
        className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
      >
        Recompute this card<span aria-hidden>&nbsp;→</span>
      </Link>
    </p>
  );
}
