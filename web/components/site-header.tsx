"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

/** Broadsheet masthead: edition line, nameplate with ears, double rule, section nav. No horizontal overflow at 375. */
export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const linkCls = (href: string) =>
    cx(
      "inline-flex min-h-11 items-center border-b-2 px-1 text-[0.9375rem] font-medium transition-[color,border-color] duration-150",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
      active(href) ? "border-accent text-fg" : "border-transparent text-muted hover:border-fg hover:text-fg",
    );

  return (
    <header className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-line py-1">
        <p className="min-w-0 truncate font-display text-[1.0625rem] italic">Robinhood Chain edition · read live</p>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <div className="hidden lg:block"><ConnectButton /></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:py-5">
        <p className="hidden max-w-[24ch] border border-line px-3 py-2 text-[0.8125rem] leading-snug text-muted lg:block">
          <em className="block font-display text-[1.0625rem] text-fg">Measured, not estimated.</em>
          Every figure on this site carries its source.
        </p>
        <Link
          href="/"
          className="rounded-sm font-display text-nameplate whitespace-nowrap transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg lg:text-center"
        >
          Terra <i className="text-accent">Firma</i>
        </Link>
        <p className="hidden max-w-[24ch] justify-self-end border border-line px-3 py-2 text-right text-[0.8125rem] leading-snug text-muted lg:block">
          <em className="block font-display text-[1.0625rem] text-fg">Prices from Chainlink.</em>
          Buys and holdings from Robinhood Chain.
        </p>
        <div className="shrink-0 lg:hidden"><ConnectButton className="min-h-11 px-3 text-sm" /></div>
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
