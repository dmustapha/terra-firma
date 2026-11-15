// Flywheel math for the proof page and the trade strip. Pure, so it is unit-tested; every figure comes
// from FeePool Distributed events that already happened, never from a projection.
import { FEE_BPS } from "./config";

export interface DistArgs {
  ethIn: bigint;
  wifBurned: bigint;
  stockBought: readonly bigint[];
}

const ONE_ETH = 10n ** 18n;

/** Sums over every distribute: ETH the pool spent, $WIF it burned, and how many payouts burned anything. */
export function flywheelTotals(dists: readonly DistArgs[]) {
  let ethIn = 0n;
  let burned = 0n;
  let burns = 0;
  for (const d of dists) {
    ethIn += d.ethIn;
    burned += d.wifBurned;
    if (d.wifBurned > 0n) burns++;
  }
  return { ethIn, burned, burns, payouts: dists.length };
}

/**
 * $WIF burned per 1 ETH of routed trading, at the rate the pool has actually achieved:
 * 1 ETH traded pays FEE_BPS of fees, and each ETH of fees has burned (total burned / total ETH in).
 * Returns null until at least one distribute spent ETH, so nothing is ever extrapolated from zero.
 */
export function wifBurnedPerEthTraded(dists: readonly DistArgs[], feeBps = FEE_BPS): bigint | null {
  const t = flywheelTotals(dists);
  if (t.ethIn === 0n) return null;
  const feePerEth = (ONE_ETH * BigInt(feeBps)) / 10_000n;
  return (t.burned * feePerEth) / t.ethIn;
}

/** Non-zero stock legs of one payout as [stockId, amount] pairs, in stock-id order. */
export function stockLegs(stockBought: readonly bigint[]): [number, bigint][] {
  const out: [number, bigint][] = [];
  stockBought.forEach((a, i) => {
    if (a > 0n) out.push([i, a]);
  });
  return out;
}
