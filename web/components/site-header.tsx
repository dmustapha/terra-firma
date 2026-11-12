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
];

/** Broadsheet masthead on "/", a compact one elsewhere. One Connect button, one pre-deploy line. No horizontal overflow at 375. */
export function SiteHeader() {
  const path = usePathname();
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
    <header className="sticky top-0 z-40 border-b-[3px] border-double border-line-strong bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[80rem] items-center justify-between gap-2 px-4 sm:gap-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 rounded-sm font-display text-[1.375rem] leading-none sm:gap-2.5 sm:text-[1.875rem] whitespace-nowrap transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={44} height={44} className="seal size-9 shrink-0 sm:size-11" />
          <span>Terra <i className="text-accent">Firma</i></span>
        </Link>
        <nav aria-label="Main" className="max-lg:hidden">
          <ul className="flex gap-x-6">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <ConnectButton variant="secondary" label="Connect" className="min-h-10 min-w-0 px-3 text-sm sm:px-4" />
        </div>
      </div>
      <nav aria-label="Main (compact)" className="border-t border-fg/10 [mask-image:linear-gradient(90deg,#000_85%,transparent)] lg:hidden">
        <ul className="mx-auto flex max-w-[80rem] gap-x-4 overflow-x-auto px-4 sm:px-6">
          {NAV.map((n) => (
            <li key={n.href} className="shrink-0">
              <Link href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      {!DEPLOYED && (
        <p role="note" className="border-t border-fg/10 py-1.5 text-center text-sm text-warn">
          Read-only preview: transaction buttons switch on once Terra Firma is live on Robinhood Chain.
        </p>
      )}
    </header>
  );
}
