"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "./connect-button";
import { ThemeToggle } from "./theme-toggle";
import { cx } from "./ui";

const NAV = [
  { href: "/app", label: "Card" },
  { href: "/trade", label: "Trade" },
  { href: "/jar", label: "Jar" },
  { href: "/stake", label: "Stake" },
  { href: "/board", label: "Board" },
  { href: "/proof", label: "Proof" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const linkCls = (href: string) =>
    cx(
      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active(href) ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg pr-2 font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Mark />
          <span className="text-lg">Terra Firma</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <ConnectButton className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-bg px-4 pb-4 pt-2 lg:hidden">
          <ul className="grid gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <ConnectButton className="flex-1" />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}

/** Wordmark glyph: horizon line over bedrock strata. */
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
      <path d="M7 14h18" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 19h14M11 23.5h10" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
