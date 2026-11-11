// Primitives. Server-safe (no hooks) so both server and client components can use them.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { addrUrl, txUrl } from "@/lib/config";
import { short } from "@/lib/ui-format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong",
  secondary: "border border-line bg-surface-2 text-fg hover:border-muted",
  ghost: "text-fg hover:bg-surface-2",
  danger: "border border-danger/50 bg-danger-soft text-danger hover:border-danger",
};
type Variant = keyof typeof variants;

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cx(base, variants[variant], className)} {...p} />;
}

export function LinkButton({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...p} />;
}

export function Panel({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6", className)} {...p} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "warn" | "danger"; children: ReactNode }) {
  const t = {
    neutral: "border-line text-muted",
    accent: "border-accent/40 bg-accent-soft text-accent",
    warn: "border-warn/40 bg-warn-soft text-warn",
    danger: "border-danger/40 bg-danger-soft text-danger",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

/** Fixed-width skeleton so numbers never shift layout when they load. */
export function Skeleton({ w = "6rem", h = "1em", className }: { w?: string; h?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block animate-pulse rounded-md bg-surface-2 align-middle motion-reduce:animate-none", className)}
      style={{ width: w, height: h }}
    />
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkCls = "underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm";

export function TxLink({ hash, children, className }: { hash: string; children?: ReactNode; className?: string }) {
  return (
    <a href={txUrl(hash)} {...ext} className={cx(linkCls, "font-mono", className)} aria-label={`View transaction ${hash} on the explorer`}>
      {children ?? short(hash)}
    </a>
  );
}

export function AddrLink({ addr, children, className }: { addr: string; children?: ReactNode; className?: string }) {
  return (
    <a href={addrUrl(addr)} {...ext} className={cx(linkCls, !children && "font-mono", className)} aria-label={`View ${addr} on the explorer`}>
      {children ?? short(addr)}
    </a>
  );
}

export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} {...ext} className={cx(linkCls, className)}>
      {children}
    </a>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "warn" | "danger" | "accent"; children: ReactNode; className?: string }) {
  const t = {
    neutral: "border-line bg-surface-2 text-fg",
    warn: "border-warn/40 bg-warn-soft text-fg",
    danger: "border-danger/40 bg-danger-soft text-fg",
    accent: "border-accent/40 bg-accent-soft text-fg",
  }[tone];
  return <div className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", t, className)}>{children}</div>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

/** A labelled stat; `value` may be a Skeleton. */
export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="num mt-1 block text-2xl font-semibold tracking-tight">{value}</span>
      {sub && <span className="mt-1 block text-xs text-muted">{sub}</span>}
    </>
  );
  return href ? (
    <a href={href} {...ext} className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {body}
    </a>
  ) : (
    <div className="rounded-xl border border-line bg-surface p-4">{body}</div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-4 text-base text-fg placeholder:text-muted/70 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-danger";
