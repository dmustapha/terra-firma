"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ADDR, STOCKS } from "@/lib/config";
import type { Card, CardBuy, CardMeme } from "@/lib/hindsight";
import { REGISTRY } from "@/lib/registry";
import { DASH, date, pct, pctChange, roundTail, shares18, token, usd8, usd8Label } from "@/lib/ui-format";
import { WalletCore } from "./wallet-core";
import { Guarantee } from "./guarantee";
import { AddrLink, Badge, Notice, TxLink, cx } from "./ui";

const payAsset = (b: CardBuy) =>
  b.payKind === 0
    ? { sym: "ETH", dec: 18, feed: ADDR.ethUsd }
    : b.payKind === 1
      ? { sym: "USDG", dec: 6, feed: ADDR.usdgUsd }
      : { sym: STOCKS[b.payStockId]?.symbol ?? "stock", dec: 18, feed: STOCKS[b.payStockId]?.historyFeed ?? ADDR.ethUsd };

function Receipt({ b, stock }: { b: CardBuy; stock: (typeof STOCKS)[number] }) {
  const p = payAsset(b);
  return (
    <li className="border-l-2 border-line bg-bg/60 px-3 py-2.5 text-sm leading-relaxed text-muted">
      Paid <span className="num text-fg">{token(b.amountPaid, p.dec)} {p.sym}</span> ({usd8(b.usdPaid8)}) on {date(b.ts)} (tx <TxLink hash={b.tx} />).{" "}
      {p.sym} was <span className="num text-fg">{usd8(b.payUsd8)}</span> (<AddrLink addr={p.feed}>Chainlink round {roundTail(b.payRoundId)}</AddrLink>
      <span className="sr-only"> full id {b.payRoundId}</span>). {stock.symbol} was <span className="num text-fg">{usd8(b.stockUsd8)}</span> (
      <AddrLink addr={stock.historyFeed}>round {roundTail(b.stockRoundId)}</AddrLink>
      <span className="sr-only"> full id {b.stockRoundId}</span>), so it would have bought <span className="num text-fg">{shares18(b.shares18)} {stock.symbol}</span>.
    </li>
  );
}

function MemeRow({ m, stock, worst }: { m: CardMeme; stock: (typeof STOCKS)[number]; worst: boolean }) {
  const [open, setOpen] = useState(false);
  const id = `receipts-${m.token}`;
  const change = pctChange(m.usdPaid8, m.usdToday8);
  return (
    <li className={cx("border-b border-line", worst && "bg-danger-soft shadow-[inset_3px_0_0_var(--danger)]")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-sm px-3 py-3 text-left transition-colors duration-150 hover:bg-accent-06 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
      >
        <span className="flex items-center gap-2 font-semibold">
          {m.symbol}
          {worst && <Badge tone="neutral">worst trade</Badge>}
        </span>
        <span className="num text-right text-sm sm:text-base">
          <span className="text-muted sm:hidden">paid </span>
          <span aria-hidden>{usd8(m.usdPaid8)}</span>
          <span className="sr-only">paid {usd8Label(m.usdPaid8)}</span>
        </span>
        <span className="num text-sm sm:text-right sm:text-base">
          <span className="text-muted sm:hidden">today </span>
          {m.usdToday8 === null ? (
            <>
              <span aria-hidden>{DASH}</span>
              <span className="ml-1 text-xs text-muted">price unavailable</span>
              <span className="sr-only">value today unavailable{m.todayReason ? `: ${m.todayReason}` : ""}</span>
            </>
          ) : (
            <>
              <span aria-hidden>{usd8(m.usdToday8)}</span>
              <span className="sr-only">value today {usd8Label(m.usdToday8)}</span>
            </>
          )}
          {change !== null && <span className="ml-1 text-xs text-muted">{pct(change)}</span>}
        </span>
        <span className="num text-right text-sm font-semibold text-accent sm:text-base">
          <span className="font-normal text-muted sm:hidden">in {stock.symbol} </span>
          <span aria-hidden>{usd8(m.usdCounterfactual8)}</span>
          <span className="sr-only">in {stock.symbol} {usd8Label(m.usdCounterfactual8)}</span>
        </span>
        <span aria-hidden className={cx("col-span-2 text-xs text-muted transition-transform sm:col-span-1", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div id={id} className="px-3 pb-4">
          <p className="mb-2 text-xs text-muted">
            {m.buys.length} priced buy{m.buys.length === 1 ? "" : "s"} · holding <span className="num">{token(m.holding)}</span> {m.symbol} ·{" "}
            <AddrLink addr={m.token}>token</AddrLink>
          </p>
          <ul className="space-y-2">
            {m.buys.map((b) => (
              <Receipt key={`${b.tx}-${b.block}`} b={b} stock={stock} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function HindsightCard({ card, owner = true, stockControl, actions }: { card: Card; owner?: boolean; stockControl?: ReactNode; actions?: ReactNode }) {
  const stock = STOCKS.find((s) => s.symbol === card.stock) ?? STOCKS[0];
  return (
    <div aria-label={`Hindsight edition for wallet ${card.wallet}`} className="space-y-10">
      <WalletCore card={card} owner={owner} />

      {card.partial && <PartialBanner card={card} />}

      {stockControl && <div className="rule-head">{stockControl}</div>}

      {card.memes.length > 0 && (
        <div>
          <h2 className="rule-head mb-3 font-display text-[1.75rem]">The ledger, coin by coin</h2>
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-x-3 border-y border-fg px-3 py-2 text-[0.8125rem] font-semibold text-muted sm:grid" aria-hidden>
            <span>Meme</span><span className="text-right">Paid</span><span className="text-right">Today</span><span className="text-right">In {stock.symbol}</span><span className="w-3" />
          </div>
          <ul className="border-t border-fg sm:border-t-0" aria-label="Meme buys. Expand a row for receipts.">
            {card.memes.map((m) => (
              <MemeRow key={m.token} m={m} stock={stock} worst={card.worst?.symbol === m.symbol} />
            ))}
          </ul>
        </div>
      )}

      {card.unpriced.length > 0 && (
        <details className="group border-t border-line pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3 rounded-sm transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
            <span className="font-display text-xl">Not priced ({card.unpriced.length})</span>
            <span className="text-xs text-muted">Shown for honesty, excluded from totals. We never estimate these.</span>
            <span aria-hidden className="ml-auto text-xs text-muted transition-transform duration-150 group-open:rotate-180">▾</span>
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {card.unpriced.map((u) => (
              <li key={`${u.tx}-${u.token}`} className="flex flex-wrap items-center gap-x-2 text-muted">
                <span className="font-semibold text-fg">{u.symbol}</span>
                <span>{u.reason}</span>
                <TxLink hash={u.tx} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {actions}

      <Guarantee addr={card.wallet} stock={card.stock} />
    </div>
  );
}

/** Server flagged the card incomplete: say exactly what is missing. Totals come from the server; nothing is filled in here. */
function PartialBanner({ card }: { card: Card }) {
  return (
    <Notice tone="warn">
      <p className="font-semibold">Partial card: some numbers could not be read right now.</p>
      {card.unquoted.length > 0 && (
        <p className="mt-1">
          No price today for {card.unquoted.map((u) => `${u.symbol} (${u.reason})`).join(", ")}. Those show {DASH} and are left out of the Today total.
        </p>
      )}
      {card.scanGaps.length > 0 && (
        <p className="mt-1">
          History for {[...new Set(card.scanGaps.map((g) => g.symbol))].join(", ")} could not be read completely, so some buys may be missing. Refresh to retry.
        </p>
      )}
    </Notice>
  );
}

/** Seconds since mount, for an honest elapsed counter. */
function useElapsed() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setT(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Cold load, "going to press". The API does not stream progress, so nothing here pretends to count tokens. */
export function CardSkeleton() {
  const n = REGISTRY.memes.length;
  const t = useElapsed();
  const memes = `${n} meme${n === 1 ? "" : "s"}`;
  const steps = [
    { what: `Buys of ${memes}`, how: "Reading transfers into this wallet on Robinhood Chain" },
    { what: "Prices at each buy", how: "Matching every buy to the Chainlink round in force" },
    { what: "Today's value", how: "Reading live prices for the memes still held" },
  ];
  return (
    <div aria-busy="true" aria-labelledby="press-title" className="grid items-center gap-x-16 gap-y-8 py-10 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-5">
        <span aria-hidden className="drill-bit" />
        <span aria-hidden className="h-40 w-px bg-[repeating-linear-gradient(var(--line-strong)_0_6px,transparent_6px_12px)]" />
      </div>
      <div>
        <p className="eyebrow text-muted">Drilling</p>
        <h2 id="press-title" className="mt-4 font-display text-[clamp(2.4rem,1.5rem+3vw,4.25rem)] leading-[0.92]">Reading {memes} for this wallet.</h2>
        <p role="status" className="num mt-3 text-muted">{t}s · usually 5–15{t > 20 ? ". Taking longer than usual; still reading." : "."}</p>
        <ol className="mt-6">
          {steps.map((s) => (
            <li key={s.what} className="flex items-baseline justify-between gap-4 border-t border-line-strong/30 py-3">
              <span><b>{s.what}</b><span className="block text-sm text-muted">{s.how}</span></span>
              <span aria-hidden className="inking size-2.5 shrink-0 rounded-full bg-accent" />
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">Nothing is estimated: the core is drawn only after every buy and its Chainlink round are read.</p>
      </div>
    </div>
  );
}
