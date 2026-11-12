"use client";

import { STOCKS } from "@/lib/config";
import { cx } from "./ui";

/** Radio group over the curated 6 (native radios: arrow keys work, one tab stop). */
export function StockSelect({ value, onChange, label = "Stock", name = "stock" }: { value: string; onChange: (symbol: string) => void; label?: string; name?: string }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-muted">{label}</legend>
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        {STOCKS.map((s) => (
          <label
            key={s.symbol}
            className={cx(
              "relative flex min-h-11 cursor-pointer flex-col items-start justify-end pb-2 transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:rounded-[2px] after:transition-opacity",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg",
              value === s.symbol ? "text-fg after:bg-[color:var(--rock-bg)] after:[background-image:repeating-linear-gradient(-35deg,transparent_0_4px,var(--rock-line)_4px_5px)] after:opacity-100" : "text-muted after:bg-line-strong after:opacity-20 hover:text-fg",
            )}
          >
            <input type="radio" name={name} value={s.symbol} checked={value === s.symbol} onChange={() => onChange(s.symbol)} className="sr-only" />
            <span className="font-display text-[1.75rem] leading-none">{s.symbol}</span>
            <span className="eyebrow mt-1 text-[0.5625rem]">{s.hours}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
