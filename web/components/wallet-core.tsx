"use client";

// /card + /app: the wallet's own core sample, drilling, beside its report. Same signature as the landing, now about YOU.
import type { Card } from "@/lib/hindsight";
import { countUp, shares18, usd8, usdWhole8 } from "@/lib/ui-format";
import { CoreSample, quoted, useDrill } from "./core-sample";

export function WalletCore({ card: c, owner }: { card: Card; owner: boolean }) {
  const { ref, k, replay } = useDrill();
  const qt = quoted(c);
  const gapRaw = qt.gap > 0n ? qt.gap : 0n;
  if (c.memes.length === 0)
    return (
      <div className="grid items-center gap-10 py-10 lg:grid-cols-2">
        <p className="eyebrow text-muted">Bare rock</p>
        <h2 className="font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92]">No dead memes in this core. <em className="text-accent">Nothing to sweep.</em></h2>
      </div>
    );
  const memes = [...c.memes].sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8)));
  return (
    <div ref={ref} className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[0.85fr_1.15fr]">
      <div onMouseEnter={() => k === 1 && replay()} className="well-bore px-4 pt-4 pb-2">
        <p className="eyebrow mb-3 flex justify-between px-2 text-muted">
          <span>Core sample</span>
          <span className="num">block {c.asOfBlock.toLocaleString("en-US")}</span>
        </p>
        <CoreSample card={c} k={k} />
      </div>
      <div>
        <p className="eyebrow text-muted">{owner ? "Your field report" : "Field report"} · {c.wallet.slice(0, 6)}…{c.wallet.slice(-4)}</p>
        <h2 className="mt-4 font-display text-[clamp(2.4rem,1.5rem+3vw,4.25rem)] leading-[0.92] tracking-[-0.025em]">
          {owner ? "You turned" : "This wallet turned"} <span className="num">{usdWhole8(qt.paid)}</span> into{" "}
          <span className="num text-[color:var(--brick)]">{usd8(qt.today)}</span>.
          <br />
          <em className="text-accent">In {c.stock}: <span className="num">{usdWhole8(qt.cf)}</span>.</em>
        </h2>
        <div className="mt-8 border-t border-line-strong pt-3">
          <p className="eyebrow mb-3 text-accent">Left on the table</p>
          <p className="num font-display text-[clamp(4rem,2.4rem+5vw,7.5rem)] leading-[0.82] tracking-[-0.035em]">
            {k >= 1 ? usdWhole8(gapRaw) : countUp((Number(gapRaw) / 1e8) * k)}
          </p>
          <p className="mt-2 text-sm text-muted">
            <span className="num">{shares18(c.totals.shares18)}</span> {c.stock} you never bought, each buy priced at the Chainlink round in force when it landed.
            {c.unquoted.length > 0 && " Priced memes only."}
          </p>
        </div>
        <ol className="mt-8">
          {memes.slice(0, 4).map((m) => {
            const left = m.usdToday8 === null ? null : Number(m.usdToday8) / Math.max(Number(m.usdPaid8), 1);
            return (
              <li key={m.token} className="grid grid-cols-[minmax(4rem,auto)_1fr_auto] items-center gap-4 border-t border-line-strong/30 py-3">
                <b className="font-display text-[1.5rem] leading-none">${m.symbol}</b>
                <span className="relative h-3 rounded-[2px] bg-[color:var(--sed-bg)]">
                  <span className="absolute inset-y-0 left-0 rounded-[2px] bg-[color:var(--brick)]" style={{ width: left === null ? "100%" : `${Math.max(left * 100, 0.6)}%` }} />
                </span>
                <span className="num text-right text-sm">{usdWhole8(m.usdPaid8)} → <b className="text-[color:var(--brick)]">{m.usdToday8 === null ? "no price" : usd8(m.usdToday8)}</b></span>
              </li>
            );
          })}
          {memes.length > 4 && <li className="eyebrow border-t border-line-strong/30 pt-3 text-muted">+{memes.length - 4} more in the ledger below</li>}
        </ol>
      </div>
    </div>
  );
}
