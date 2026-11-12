import { describe, expect, it } from "vitest";
import { DASH, duration, eth, orDash, parseAmount, pct, pctChange, roundTail, shares18, short, sig4, signedSig4, signedUsd, usd8, usd8Label, usd8OrDash } from "./ui-format";

describe("usd8 / usd8Label", () => {
  it("formats 8-decimal integers as dollars", () => {
    expect(usd8("4107000000")).toBe("$41.07");
    expect(usd8(123456789012n)).toBe("$1,234.57");
    expect(usd8Label("4107000000")).toBe("41.07 dollars");
  });
  it("handles zero and negative", () => {
    expect(usd8("0")).toBe("$0.00");
    expect(usd8(-150000000n)).toBe("-$1.50");
  });
  it("throws on non-integer input instead of guessing", () => {
    expect(() => usd8("1.5")).toThrow();
  });
});

describe("orDash / usd8OrDash", () => {
  it("formats known values", () => {
    expect(orDash(2, (x) => `${x * 2}`)).toBe("4");
    expect(usd8OrDash("100000000")).toBe("$1.00");
  });
  it("renders the dash for null/undefined, never zero", () => {
    expect(usd8OrDash(null)).toBe(DASH);
    expect(usd8OrDash(undefined)).toBe(DASH);
    expect(orDash<number>(null, () => "$0.00")).toBe(DASH);
  });
  it("keeps a real zero as zero", () => {
    expect(orDash(0, (x) => String(x))).toBe("0");
  });
});

describe("signedUsd / signedSig4", () => {
  it("prefixes positives with +", () => {
    expect(signedUsd(1.5)).toBe("+$1.50");
    expect(signedSig4(0.123456)).toBe("+0.1235");
  });
  it("keeps negatives negative", () => {
    expect(signedUsd(-2)).toBe("-$2.00");
  });
  it("dash on unknown", () => {
    expect(signedUsd(null)).toBe(DASH);
    expect(signedSig4(null)).toBe(DASH);
  });
});

describe("sig4 / shares18 / eth", () => {
  it("rounds to 4 significant digits", () => {
    expect(sig4(1.23456)).toBe("1.235");
    expect(shares18(10n ** 18n)).toBe("1");
    expect(eth(1_500_000_000_000_000n)).toBe("0.0015");
  });
  it("keeps large values whole and zero exact", () => {
    expect(sig4(0)).toBe("0");
    expect(sig4(12345.6)).toBe("12,346");
  });
});

describe("parseAmount", () => {
  it("parses decimals", () => {
    expect(parseAmount("1.5")).toBe(1_500_000_000_000_000_000n);
    expect(parseAmount(" 2 ", 6)).toBe(2_000_000n);
  });
  it("returns null on empty or a lone dot", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(".")).toBeNull();
  });
  it("rejects exponent, negative and junk", () => {
    expect(parseAmount("1e18")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("pctChange / pct", () => {
  it("computes percent change", () => {
    expect(pctChange("100", "150")).toBeCloseTo(50);
    expect(pct(50)).toBe("+50.0%");
    expect(pct(-12.34)).toBe("-12.3%");
  });
  it("returns null for a zero base", () => {
    expect(pctChange("0", "10")).toBeNull();
  });
  it("returns null when today's value is unknown", () => {
    expect(pctChange("100", null)).toBeNull();
    expect(pctChange("100", undefined)).toBeNull();
  });
});

describe("duration / short / roundTail", () => {
  it("formats countdowns", () => {
    expect(duration(724)).toBe("12m 04s");
    expect(duration(3 * 3600 + 120)).toBe("3h 02m");
  });
  it("says now for elapsed time", () => {
    expect(duration(0)).toBe("now");
    expect(duration(-5)).toBe("now");
  });
  it("shortens long hex and leaves short strings", () => {
    expect(short("0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E")).toBe("0x3fDB…b09E");
    expect(short("0x12")).toBe("0x12");
    expect(roundTail("18446744073709551001")).toBe("…001");
  });
});

import { usdWhole8 as _usdWhole8 } from "./ui-format";
describe("usdWhole8", () => {
  it("floors in integer math and never rounds up at the cents edge", () => {
    expect(_usdWhole8("1719499500000")).toBe("$17,194"); // 17,194.995 would round to 17,195 via cents
    expect(_usdWhole8("0")).toBe("$0.00");
    expect(_usdWhole8(2n)).toBe("$0.00");
  });
  it("keeps floored cents under $100 so small cards are not '$1 into $0.60, left $0'", () => {
    expect(_usdWhole8(122_990_000n)).toBe("$1.22");
    expect(_usdWhole8(62_000_000n)).toBe("$0.62");
    expect(_usdWhole8(9_999_999_999n)).toBe("$99.99");
    expect(_usdWhole8(10_000_000_000n)).toBe("$100");
    expect(_usdWhole8(-62_000_000n)).toBe("-$0.62");
  });
  it("a gap never prints larger than the figure it was taken from", () => {
    const cf = 1719499500000n, today = 1000000n;
    const n = (s: string) => Number(s.replace(/[$,]/g, ""));
    expect(n(_usdWhole8(cf - today))).toBeLessThanOrEqual(n(_usdWhole8(cf)));
  });
});
