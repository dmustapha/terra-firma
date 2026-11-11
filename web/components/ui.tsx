// Primitives. Server-safe (no hooks) so both server and client components can use them.
// Almanac language: ruled sheets, ink outlines, pixel-offset shadow on primary actions only.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { addrUrl, txUrl } from "@/lib/config";
import { short } from "@/lib/ui-format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

const focus = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-base font-semibold whitespace-nowrap " +
  "transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out " +
  `${focus} disabled:cursor-not-allowed disabled:opacity-50`;

/** Primary carries the registration offset; hover lifts it, press seats it. Disabled buttons never move. */
const variants = {
  primary:
    "border border-accent bg-accent text-accent-fg shadow-[var(--shadow-press)] " +
    "enabled:hover:-translate-x-px enabled:hover:-translate-y-px enabled:hover:bg-accent-strong enabled:hover:shadow-[var(--shadow-press-up)] " +
    "enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none",
  secondary:
    "border border-fg bg-transparent text-fg enabled:hover:-translate-y-px enabled:hover:bg-accent-soft enabled:hover:shadow-[var(--shadow-press)] enabled:active:translate-y-0 enabled:active:shadow-none",
  ghost: "text-fg enabled:hover:-translate-y-px enabled:hover:bg-surface-2",
  danger: "border border-danger bg-danger-soft text-danger enabled:hover:-translate-y-px enabled:hover:shadow-[var(--shadow-press)]",
};
type Variant = keyof typeof variants;

/** Links have no :enabled state: same language, written out so Tailwind sees every class. */
const linkVariants: Record<Variant, string> = {
  primary:
    "border border-accent bg-accent text-accent-fg shadow-[var(--shadow-press)] " +
    "hover:-translate-x-px hover:-translate-y-px hover:bg-accent-strong hover:shadow-[var(--shadow-press-up)] " +
    "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  secondary: "border border-fg bg-transparent text-fg hover:-translate-y-px hover:bg-accent-soft hover:shadow-[var(--shadow-press)] active:translate-y-0 active:shadow-none",
  ghost: "text-fg hover:-translate-y-px hover:bg-surface-2",
  danger: "border border-danger bg-danger-soft text-danger hover:-translate-y-px hover:shadow-[var(--shadow-press)]",
};

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cx(base, variants[variant], className)} {...p} />;
}

export function LinkButton({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, linkVariants[variant], className)} {...p} />;
}

/** A ruled sheet: ink rule on top, a fresh-paper step up from the ground, hairline foot. */
export function Panel({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("border-t-2 border-line-strong border-b border-b-line bg-surface px-4 py-5 sm:px-6 sm:py-6", className)} {...p} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "warn" | "danger"; children: ReactNode }) {
  const t = {
    neutral: "border-line text-muted",
    accent: "border-accent-55 bg-accent-soft text-accent-strong",
    warn: "border-warn/50 bg-warn-soft text-warn",
    danger: "border-danger/50 bg-danger-soft text-danger",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

/** Fixed-width skeleton so numbers never shift layout when they load. */
export function Skeleton({ w = "6rem", h = "1em", className }: { w?: string; h?: string; className?: string }) {
  return (
    <>
      <span className="sr-only">Loading</span>
      <span
        aria-hidden
        className={cx("inline-block animate-pulse rounded-sm bg-surface-2 align-middle motion-reduce:animate-none", className)}
        style={{ width: w, height: h }}
      />
    </>
  );
}

const textLinkTone = {
  accent: "text-accent decoration-accent-32 hover:text-accent-strong hover:decoration-accent",
  ink: "text-fg decoration-accent hover:decoration-accent-strong",
};

/** In-site text link: moss (or ink with a moss underline); the underline thickens on hover. `inline` keeps it in running text. */
export function TextLink({ tone = "accent", inline = false, className, ...p }: ComponentProps<typeof Link> & { tone?: keyof typeof textLinkTone; inline?: boolean }) {
  return (
    <Link
      className={cx(
        "rounded-sm font-semibold underline decoration-1 underline-offset-4 transition-[color,text-decoration-color,text-decoration-thickness] duration-150 hover:decoration-2",
        !inline && "inline-flex min-h-11 items-center",
        focus,
        textLinkTone[tone],
        className,
      )}
      {...p}
    />
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkCls = `rounded-sm underline decoration-fg/35 decoration-1 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-150 hover:decoration-accent hover:decoration-2 ${focus}`;

export function TxLink({ hash, children, className }: { hash: string; children?: ReactNode; className?: string }) {
  return (
    <a href={txUrl(hash)} {...ext} className={cx(linkCls, "font-mono", className)} aria-label={`View transaction ${hash} on the explorer`}>
      {children ?? short(hash)}
    </a>
  );
}

const ZERO_ADDR = /0x0{40}(?![0-9a-f])/i;
/** True for links that would point at the zero address (pre-deploy placeholders). Those render as plain text. */
export const isZeroLink = (s: string | undefined) => !!s && ZERO_ADDR.test(s);

export function AddrLink({ addr, children, className }: { addr: string; children?: ReactNode; className?: string }) {
  if (isZeroLink(addr)) return <span className={className}>{children ?? "not live yet"}</span>;
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

/** Editorial notice: a coloured rule down the left edge over a tinted ground. */
export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "warn" | "danger" | "accent"; children: ReactNode; className?: string }) {
  const t = {
    neutral: "border-fg/60 bg-surface-2/70",
    warn: "border-warn bg-warn-soft",
    danger: "border-danger bg-danger-soft",
    accent: "border-accent bg-accent-soft",
  }[tone];
  return <div className={cx("border-l-[3px] px-4 py-3 text-sm leading-relaxed text-fg", t, className)}>{children}</div>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-title text-balance">{title}</h1>
        {sub && <p className="mt-3 max-w-[62ch] text-[1.0625rem] leading-relaxed text-muted">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

/** A labelled figure under an ink rule; `value` may be a Skeleton. Linked figures open the explorer page holding the number. */
export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="num mt-1 block text-2xl font-semibold tracking-tight">{value}</span>
      {sub && <span className="mt-1 block text-xs text-muted">{sub}</span>}
    </>
  );
  const cls = "block min-w-0 border-t-2 border-line-strong pt-3 pb-1";
  return href && !isZeroLink(href) ? (
    <a href={href} {...ext} className={cx(cls, "group rounded-sm transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-accent-06", focus)}>
      {body}
      <span className="mt-1 block text-xs text-accent underline decoration-accent-32 underline-offset-4 group-hover:decoration-accent">View on the explorer</span>
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A ruled ledger table: ink rule under the heads, hairlines between rows, figures right-aligned and tabular.
 *  The first column is the row label. Empty states pass "—" cells so the shape of the data shows before any data exists. */
export function RuledTable({ caption, heads, rows, foot, className }: { caption: string; heads: string[]; rows: ReactNode[][]; foot?: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <table className="num w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-fg text-[0.8125rem] text-muted">
          <tr>
            {heads.map((h, i) => (
              <th key={h} scope="col" className={cx("py-2 font-medium", i === 0 ? "text-left" : "text-right")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line">
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-2.5 pr-3 text-left font-semibold">{c}</th>
                ) : (
                  <td key={i} className="py-2.5 pl-3 text-right">{c}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {foot && <p className="mt-2 text-xs text-muted">{foot}</p>}
    </div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-sm border border-fg/70 bg-surface px-4 text-base text-fg placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-150 hover:border-fg focus-visible:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[inset_3px_0_0_var(--danger)]";
