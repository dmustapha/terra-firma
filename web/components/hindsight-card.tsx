"use client";

import { useState, type ReactNode } from "react";
import { ADDR, EXPLORER, STOCKS } from "@/lib/config";
import type { Card, CardBuy, CardMeme } from "@/lib/hindsight";
import { REGISTRY } from "@/lib/registry";
import { DASH, date, pct, pctChange, roundTail, shares18, token, usd8, usd8Label } from "@/lib/ui-format";
import { Guarantee } from "./guarantee";
import { AddrLink, Badge, ExtLink, Notice, Panel, Skeleton, TxLink, cx } from "./ui";

const payAsset = (b: CardBuy) =>
  b.payKind === 0
    ? { sym: "ETH", dec: 18, feed: ADDR.ethUsd }
    : b.payKind === 1
      ? { sym: "USDG", dec: 6, feed: ADDR.usdgUsd }
      : { sym: STOCKS[b.payStockId]?.symbol ?? "stock", dec: 18, feed: STOCKS[b.payStockId]?.historyFeed ?? ADDR.ethUsd };

function Receipt({ b, stock }: { b: CardBuy; stock: (typeof STOCKS)[number] }) {
  const p = payAsset(b);
  return (
    <li className="rounded-lg bg-bg/60 px-3 py-2.5 text-sm leading-relaxed text-muted">
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
    <li className={cx("rounded-xl border", worst ? "border-danger/50 bg-danger-soft" : "border-line")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
      >
        <span className="flex items-center gap-2 font-semibold">
          {m.symbol}
          {worst && <Badge tone="danger">worst trade</Badge>}
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
          {change !== null && <span className={cx("ml-1 text-xs", change < 0 ? "text-danger" : "text-accent")}>{pct(change)}</span>}
        </span>
        <span className="num text-right text-sm font-semibold text-accent sm:text-base">
          <span className="font-normal text-muted sm:hidden">in {stock.symbol} </span>
          <span aria-hidden>{usd8(m.usdCounterfactual8)}</span>
          <span className="sr-only">in {stock.symbol} {usd8Label(m.usdCounterfactual8)}</span>
        </span>
        <span aria-hidden className={cx("col-span-2 text-xs text-muted transition-transform sm:col-span-1", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div id={id} className="px-4 pb-4">
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
  const empty = card.memes.length === 0 && card.unpriced.length === 0;
  const who = owner ? "You" : "This wallet";
  return (
    <Panel aria-labelledby="card-title" className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="card-title" className="text-sm font-medium uppercase tracking-wider text-muted">Hindsight card</h2>
          <p className="mt-1 font-mono text-sm"><AddrLink addr={card.wallet} /></p>
        </div>
        <p className="text-xs text-muted">
          As of block <ExtLink href={`${EXPLORER}/block/${card.asOfBlock}`}><span className="num">{card.asOfBlock.toLocaleString("en-US")}</span></ExtLink>
        </p>
      </div>

      {card.partial && <PartialBanner card={card} />}

      {empty ? (
        <div className="py-6 text-center">
          <p className="text-2xl font-semibold">None of the {REGISTRY.memes.length} memes we track are in this wallet.</p>
          {REGISTRY.memes.length === 0 && <p className="mt-2 text-sm text-muted">The meme registry is still being built, so no tokens were scanned yet.</p>}
        </div>
      ) : (
        <>
          <p className="text-xl font-semibold leading-snug sm:text-2xl">
            {who} put <span className="num">{usd8(card.totals.usdPaid8)}</span> into memes still held. Today{card.unquoted.length > 0 ? " (priced memes only)" : ""}: <span className="num">{usd8(card.totals.usdToday8)}</span>. In {stock.symbol}:{" "}
            <span className="num text-accent">{usd8(card.totals.usdCounterfactual8)}</span>.
          </p>
          <p className="text-xs text-muted">Gross buys of memes this wallet still holds, priced with the Chainlink round at each buy. Sells and transfers out are not netted; this is not P&amp;L.</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label="Paid" value={usd8(card.totals.usdPaid8)} aria={usd8Label(card.totals.usdPaid8)} />
            <Figure label="Today" value={usd8(card.totals.usdToday8)} aria={usd8Label(card.totals.usdToday8)} sub={card.unquoted.length > 0 ? `${card.memes.filter((m) => m.usdToday8 !== null).length} of ${card.memes.length} memes priced; paid for those: ${usd8(card.totals.usdPaidQuoted8)}` : undefined} />
            <Figure label={`In ${stock.symbol}`} value={usd8(card.totals.usdCounterfactual8)} aria={usd8Label(card.totals.usdCounterfactual8)} sub={`${shares18(card.totals.shares18)} shares`} accent />
          </dl>
          {card.worst && (
            <p className="text-sm text-muted">
              Worst trade: <strong className="text-fg">{card.worst.symbol}</strong> <span className="num text-danger">{pct(card.worst.pct)}</span>
            </p>
          )}
        </>
      )}

      {stockControl}

      {card.memes.length > 0 && (
        <div>
          <div className="mb-2 hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-x-3 px-4 text-xs uppercase tracking-wider text-muted sm:grid" aria-hidden>
            <span>Meme</span><span className="text-right">Paid</span><span className="text-right">Today</span><span className="text-right">In {stock.symbol}</span><span className="w-3" />
          </div>
          <ul className="space-y-2" aria-label="Meme buys. Expand a row for receipts.">
            {card.memes.map((m) => (
              <MemeRow key={m.token} m={m} stock={stock} worst={card.worst?.symbol === m.symbol} />
            ))}
          </ul>
        </div>
      )}

      {card.unpriced.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Not priced ({card.unpriced.length})</h3>
          <p className="text-xs text-muted">Shown for honesty, excluded from totals. We never estimate these.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {card.unpriced.map((u) => (
              <li key={`${u.tx}-${u.token}`} className="flex flex-wrap items-center gap-x-2 text-muted">
                <span className="font-semibold text-fg">{u.symbol}</span>
                <span>{u.reason}</span>
                <TxLink hash={u.tx} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions}

      <Guarantee addr={card.wallet} stock={card.stock} className="border-t border-line pt-4" />
    </Panel>
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

function Figure({ label, value, aria, sub, accent }: { label: string; value: string; aria: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cx("rounded-xl border p-4", accent ? "border-accent/40 bg-accent-soft" : "border-line bg-surface-2/50")}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cx("num mt-1 text-2xl font-bold tracking-tight sm:text-3xl", accent && "text-accent")} aria-label={`${label}: ${aria}`}>
        {value}
      </dd>
      {sub && <dd className="num mt-0.5 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

export function CardSkeleton() {
  const n = REGISTRY.memes.length;
  return (
    <Panel aria-busy="true" className="space-y-6">
      <p role="status" className="text-sm text-muted">
        Reading your meme buys from the chain… (scanning {n} meme{n === 1 ? "" : "s"})
      </p>
      <Skeleton w="85%" h="1.75rem" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <Skeleton w="3rem" h="0.9rem" />
            <div className="mt-2"><Skeleton w="7rem" h="2rem" /></div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} w="100%" h="3rem" className="block" />
        ))}
      </div>
    </Panel>
  );
}
