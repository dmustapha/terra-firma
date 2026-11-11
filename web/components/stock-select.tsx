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
              "relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-colors duration-150",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
              value === s.symbol ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:border-muted hover:text-fg",
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
