"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ADDR, EXPLORER, STOCKS } from "@/lib/config";
import type { Card, CardBuy, CardMeme } from "@/lib/hindsight";
import { REGISTRY } from "@/lib/registry";
import { DASH, date, pct, pctChange, roundTail, shares18, token, usd8, usd8Label } from "@/lib/ui-format";
import { PlateInProof, StrataPlate } from "./strata-plate";
import { Guarantee } from "./guarantee";
import { AddrLink, Badge, ExtLink, Notice, Panel, TxLink, cx } from "./ui";

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
  const empty = card.memes.length === 0 && card.unpriced.length === 0;
  const who = owner ? "You" : "This wallet";
  return (
    <Panel aria-label={`Hindsight card for wallet ${card.wallet}`} className="space-y-6">
      <p className="border-b border-line pb-3 text-xs text-muted">
        Wallet <AddrLink addr={card.wallet} className="font-mono" /> · values re-read live · as of block{" "}
        <ExtLink href={`${EXPLORER}/block/${card.asOfBlock}`}><span className="num">{card.asOfBlock.toLocaleString("en-US")}</span></ExtLink>
      </p>

      {card.partial && <PartialBanner card={card} />}

      {empty ? (
        <div className="py-6">
          <p className="font-display text-deck">None of the {REGISTRY.memes.length} memes we track are in this wallet.</p>
          {REGISTRY.memes.length === 0 && <p className="mt-2 text-sm text-muted">The list of tracked memes is still being built, so nothing was scanned yet.</p>}
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7 lg:border-r lg:border-line lg:pr-10">
            <p className="font-display text-deck text-pretty">
              {who} put <span className="num">{usd8(card.totals.usdPaid8)}</span> into memes still held. Today{card.unquoted.length > 0 ? " (priced memes only)" : ""}: <span className="num">{usd8(card.totals.usdToday8)}</span>. In {stock.symbol}:{" "}
              <i className="num text-accent">{usd8(card.totals.usdCounterfactual8)}</i>.
            </p>
            <p className="text-sm text-muted">Gross buys of memes this wallet still holds, priced with the Chainlink round at each buy. Sells and transfers out are not netted; this is not profit and loss.</p>
            {card.worst && <WorstLine card={card} />}
            {stockControl && <div className="border-t border-line pt-4">{stockControl}</div>}
          </div>
          {card.memes.length > 0 && <StrataPlate card={card} className="order-first lg:order-none lg:col-span-5" />}
        </div>
      )}

      {empty && stockControl}

      {card.memes.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-xl">Receipts, meme by meme</h2>
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
    </Panel>
  );
}

/** The worst trade as two plain figures in ink: a loss is shown as the lower value, never as a red minus. */
function WorstLine({ card }: { card: Card }) {
  const m = card.memes.find((x) => x.symbol === card.worst?.symbol);
  if (!m) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-sm text-fg">
      <Badge>worst trade</Badge>
      <span className="num">
        <strong className="font-semibold">{m.symbol}</strong>: {usd8(m.usdPaid8)} paid → {m.usdToday8 === null ? `${DASH} today (no live quote)` : `${usd8(m.usdToday8)} today`}
      </span>
    </p>
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
    <Panel aria-busy="true" aria-labelledby="press-title">
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-6 lg:border-r lg:border-line lg:pr-10">
          <p className="mb-1 font-display text-[1.375rem] italic text-accent">Hindsight card</p>
          <h2 id="press-title" className="font-display text-title text-balance">
            Going to press: <em className="text-accent">reading buys</em> from Robinhood Chain
          </h2>
          <p role="status" className="mt-4 text-[1.0625rem] font-semibold">Scanning {memes} for this wallet.</p>
          <p className="num mt-1 text-sm text-muted">
            <span aria-hidden>{t} s elapsed · </span>usually 5–15 seconds{t > 20 ? ". Taking longer than usual; still reading." : "."}
          </p>
          <p className="mt-3 max-w-[50ch] text-[0.9375rem] text-muted">Nothing is estimated: the card is set in type only after every buy and its Chainlink round are read.</p>
          <ol className="mt-6 border-t border-fg">
            {steps.map((s) => (
              <li key={s.what} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-line py-3 text-[0.9375rem]">
                <span className="font-semibold">{s.what}</span>
                <span className="inline-flex items-center gap-2 font-semibold text-accent">
                  <span aria-hidden className="inking size-2.5 rounded-full border border-accent bg-accent-32" />
                  On the press
                </span>
                <span className="col-span-2 text-sm text-muted">{s.how}</span>
              </li>
            ))}
          </ol>
        </div>
        <PlateInProof className="lg:col-span-6" />
      </div>
    </Panel>
  );
}
