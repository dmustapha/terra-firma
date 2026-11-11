"use client";

import { STOCKS } from "@/lib/config";
import { cx } from "./ui";

/** Radio group over the curated 6 (native radios: arrow keys work, one tab stop). */
export function StockSelect({ value, onChange, label = "Stock", name = "stock" }: { value: string; onChange: (symbol: string) => void; label?: string; name?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STOCKS.map((s) => (
          <label
            key={s.symbol}
            className={cx(
              "relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-sm border px-2 py-1.5 text-center transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-px",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg",
              value === s.symbol ? "border-accent bg-accent-soft text-fg shadow-[inset_3px_0_0_var(--accent)]" : "border-fg/40 bg-surface text-muted hover:border-fg hover:text-fg",
            )}
          >
            <input type="radio" name={name} value={s.symbol} checked={value === s.symbol} onChange={() => onChange(s.symbol)} className="sr-only" />
            <span className="text-sm font-semibold">{s.symbol}</span>
            <span className="text-[0.7rem] leading-tight">{s.hours}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
