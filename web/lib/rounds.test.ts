import { describe, expect, it } from "vitest";
import { normalize8, PHASE_BASE, roundAt, type RoundTable } from "./rounds";

const FEED = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";
const table = (rounds: RoundTable["rounds"]): RoundTable => ({ feed: FEED, decimals: 8, phase: 1, rounds });
const T = table([
  [1, "100", 1000],
  [2, "200", 2000],
  [3, "300", 3000],
]);

describe("roundAt", () => {
  it("returns the last round updated at or before ts", () => {
    expect(roundAt(T, 2500)).toEqual({ roundId: PHASE_BASE + 2n, price8: 200n, updatedAt: 2000 });
  });

  it("includes a round whose updatedAt equals ts, and clamps to the last round after the table", () => {
    expect(roundAt(T, 1000).roundId).toBe(PHASE_BASE + 1n);
    expect(roundAt(T, 3000).roundId).toBe(PHASE_BASE + 3n);
    expect(roundAt(T, 9_999_999).price8).toBe(300n);
    expect(roundAt(table([[7, "42", 50]]), 51)).toEqual({ roundId: PHASE_BASE + 7n, price8: 42n, updatedAt: 50 });
  });

  it("throws when ts precedes the feed or the table is empty", () => {
    expect(() => roundAt(T, 999)).toThrow(/no round before 999/);
    expect(() => roundAt(table([]), 1000)).toThrow(/no round before 1000/);
  });
});

describe("normalize8", () => {
  it("divides 1e16-scaled early answers by 1e8 (NVDA/USD round 24, SOURCE LOCK value)", () => {
    expect(normalize8(FEED, 24, 2030652000000000000n)).toBe(20306520000n);
  });

  it("uses a strict > 1e15 threshold, like StockOracle.SCALED_THRESHOLD", () => {
    expect(normalize8(FEED, 1, 10n ** 15n)).toBe(10n ** 15n);
    expect(normalize8(FEED, 1, 10n ** 15n + 1n)).toBe((10n ** 15n + 1n) / 10n ** 8n);
  });

  it("never rescales a normal 8-decimal answer", () => {
    expect(normalize8(FEED, 1718, 17107118018n)).toBe(17107118018n);
    expect(normalize8(FEED, 1, 0n)).toBe(0n);
  });
});
