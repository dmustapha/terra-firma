import { describe, expect, it } from "vitest";
import { flywheelTotals, stockLegs, wifBurnedPerEthTraded } from "./ui-flywheel";

const E = 10n ** 18n;
const d = (ethIn: bigint, wifBurned: bigint, stock: bigint[] = [0n, 0n, 0n, 0n, 0n, 0n]) => ({ ethIn, wifBurned, stockBought: stock });

describe("flywheelTotals", () => {
  it("sums ETH in and $WIF burned and counts burning payouts", () => {
    const t = flywheelTotals([d(E / 100n, 10n * E), d(E / 100n, 0n), d(E / 50n, 5n * E)]);
    expect(t).toEqual({ ethIn: (4n * E) / 100n, burned: 15n * E, burns: 2, payouts: 3 });
  });
  it("is all zero for no payouts", () => {
    expect(flywheelTotals([])).toEqual({ ethIn: 0n, burned: 0n, burns: 0, payouts: 0 });
  });
});

describe("wifBurnedPerEthTraded", () => {
  it("returns null before any ETH was distributed (no extrapolation from zero)", () => {
    expect(wifBurnedPerEthTraded([])).toBeNull();
    expect(wifBurnedPerEthTraded([d(0n, 0n)])).toBeNull();
  });
  it("scales the realised burn rate by the fee taken on 1 ETH", () => {
    // 0.01 ETH in burned 20 WIF => 2,000 WIF per ETH of fees; 1 ETH traded at 0.5% = 0.005 ETH fee => 10 WIF
    expect(wifBurnedPerEthTraded([d(E / 100n, 20n * E)], 50)).toBe(10n * E);
  });
  it("uses the staker fee when asked", () => {
    expect(wifBurnedPerEthTraded([d(E / 100n, 20n * E)], 30)).toBe(6n * E);
  });
});

describe("stockLegs", () => {
  it("keeps only non-zero legs with their stock id", () => {
    expect(stockLegs([0n, 5n, 0n, 0n, 7n, 0n])).toEqual([[1, 5n], [4, 7n]]);
  });
});
