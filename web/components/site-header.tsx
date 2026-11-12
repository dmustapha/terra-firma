"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEPLOYED } from "@/lib/ui-chain";
import { ConnectButton } from "./connect-button";
import { ThemeToggle } from "./theme-toggle";
import { cx } from "./ui";

const NAV = [
  { href: "/app", label: "My card" },
  { href: "/app/convert", label: "Convert" },
  { href: "/trade", label: "Trade" },
  { href: "/jar", label: "My Jar" },
  { href: "/stake", label: "Stake $WIF" },
  { href: "/board", label: "Leaderboard" },
  { href: "/proof", label: "Proof" },
];

/** Broadsheet masthead on "/", a compact one elsewhere. One Connect button, one pre-deploy line. No horizontal overflow at 375. */
export function SiteHeader() {
  const path = usePathname();
  const home = path === "/";
  // "/app" is a prefix of "/app/convert": the longest matching nav href wins, so only one tab is ever active.
  const match = NAV.map((n) => n.href).filter((h) => path === h || path.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
  const active = (href: string) => href === match;
  const linkCls = (href: string) =>
    cx(
      "inline-flex min-h-11 items-center border-b-2 px-1 text-[0.9375rem] font-medium transition-[color,border-color] duration-150",
      "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg",
      active(href) ? "border-accent text-fg" : "border-transparent text-muted hover:border-fg hover:text-fg",
    );

  return (
    <header className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-line py-1">
        <p className="min-w-0 truncate font-display text-[1.0625rem] italic">
          Robinhood Chain<span className="max-sm:hidden"> edition · read live</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <ConnectButton variant="secondary" className="min-h-11 px-3 text-sm sm:px-4" />
        </div>
      </div>
      {!DEPLOYED && (
        <p role="note" className="border-b border-line py-1.5 text-sm text-warn">
          Contracts deploying: this is a read-only preview, and transaction buttons switch on once Terra Firma is live on Robinhood Chain.
        </p>
      )}

      <div className={cx("flex items-center justify-between gap-3", home ? "py-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:py-5" : "py-2")}>
        {home && (
          <p className="hidden max-w-[24ch] border border-line bg-surface px-3 py-2 text-[0.8125rem] leading-snug text-muted lg:block">
            <em className="block font-display text-[1.0625rem] text-fg">Measured, not estimated.</em>
            Every figure on this site carries its source.
          </p>
        )}
        <Link
          href="/"
          className={cx(
            "rounded-sm font-display whitespace-nowrap transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg",
            home ? "text-nameplate lg:text-center" : "text-deck",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, decorative next to the wordmark */}
          <img src="/logo.svg" alt="" width={64} height={64} className="mr-[0.22em] inline-block size-[0.82em] align-[-0.06em]" />
          Terra <i className="text-accent">Firma</i>
        </Link>
        {home ? (
          <p className="hidden max-w-[24ch] justify-self-end border border-line bg-surface px-3 py-2 text-right text-[0.8125rem] leading-snug text-muted lg:block">
            <em className="block font-display text-[1.0625rem] text-fg">Prices from Chainlink.</em>
            Buys and holdings from Robinhood Chain.
          </p>
        ) : (
          <p className="hidden font-display text-[1.0625rem] italic text-muted sm:block">Measured, not estimated.</p>
        )}
      </div>

      <div className="dblrule" />
      <nav aria-label="Main" className="border-b border-line">
        <ul className="flex flex-wrap justify-center gap-x-4 sm:gap-x-8">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
