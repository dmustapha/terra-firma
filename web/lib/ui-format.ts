// Display formatting. Inputs are integer strings/bigints from chain or API; nothing is estimated here.
import { formatUnits, parseUnits } from "viem";

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toBig = (v: string | bigint | number) => (typeof v === "bigint" ? v : BigInt(v));

/** 8-decimal USD integer -> "$1,234.56". */
export const usd8 = (v: string | bigint) => usdFmt.format(Number(formatUnits(toBig(v), 8)));

/** 8-decimal USD integer -> whole dollars, FLOORED in integer math ("$17,194"). One rounding mode everywhere on the card,
 *  so a difference can never print larger than the figure it was taken from. */
export const usdWhole8 = (v: string | bigint) => {
  const n = toBig(v);
  const abs = n < 0n ? -n : n;
  const whole = abs / 100_000_000n;
  // Under $100, whole dollars hide the story ("$1 into $0.60, in NVDA $1, left $0"), so small figures keep floored cents.
  const cents = whole < 100n ? `.${((abs / 1_000_000n) % 100n).toString().padStart(2, "0")}` : "";
  return `${n < 0n ? "-" : ""}$${whole.toLocaleString("en-US")}${cents}`;
};

/** Mid-animation count-up value, same rounding as usdWhole8: floored cents under $100, floored dollars above. */
export const countUp = (dollars: number) =>
  dollars < 100 ? `$${(Math.floor(dollars * 100) / 100).toFixed(2)}` : `$${Math.floor(dollars).toLocaleString("en-US")}`;

/** Accessible label: "41.07 dollars". */
export const usd8Label = (v: string | bigint) => `${Number(formatUnits(toBig(v), 8)).toFixed(2)} dollars`;

/** USD from a float (already derived from chain integers). */
export const usd = (n: number) => usdFmt.format(n);

/** 4 significant digits, no scientific notation for normal ranges. */
export function sig4(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return Number(n.toPrecision(4)).toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

/** 18-decimal shares -> 4 significant digits. */
export const shares18 = (v: string | bigint) => sig4(Number(formatUnits(toBig(v), 18)));

/** Wei -> ETH with up to 6 decimals. */
export function eth(v: string | bigint): string {
  const n = Number(formatUnits(toBig(v), 18));
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Arbitrary token raw -> readable amount (4 significant digits under 10k). */
export const token = (v: string | bigint, decimals = 18) => sig4(Number(formatUnits(toBig(v), decimals)));

export const short = (h: string, n = 4) => (h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h);

/** Last digits of a Chainlink roundId ("…001"). */
export const roundTail = (r: string) => `…${r.slice(-3)}`;

export const date = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const dateTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });

/** "12m 04s" / "3h 02m". */
export function duration(sec: number): string {
  if (sec <= 0) return "now";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** parseUnits that returns null instead of throwing on bad input. */
export function parseAmount(s: string, decimals = 18): bigint | null {
  const t = s.trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  try {
    return parseUnits(t, decimals);
  } catch {
    return null;
  }
}

/** Percent change between two 8dp USD values. */
export function pctChange(from: string | bigint, to: string | bigint | null | undefined): number | null {
  if (to === null || to === undefined) return null;
  const a = Number(toBig(from));
  if (a === 0) return null;
  return (Number(toBig(to)) / a - 1) * 100;
}

export const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Shown wherever a chain read failed or a value is unknown. Never replaced by a guess. */
export const DASH = "—";

/** Format a value that may be unknown: null/undefined -> "—". */
export const orDash = <T,>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? DASH : f(v));

/** 8dp USD that may be unknown (e.g. a meme with no quote today). */
export const usd8OrDash = (v: string | bigint | null | undefined) => orDash(v, usd8);

/** "+$1.23" / "-$1.23"; "—" when unknown. */
export const signedUsd = (n: number | null | undefined) => orDash(n, (x) => `${x >= 0 ? "+" : ""}${usd(x)}`);

/** "+1.234" / "-1.234"; "—" when unknown. */
export const signedSig4 = (n: number | null | undefined) => orDash(n, (x) => `${x >= 0 ? "+" : ""}${sig4(x)}`);
