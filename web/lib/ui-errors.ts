// Turn wallet / contract failures into plain words (PRD 4.13). Custom errors are decoded against every
// Terra Firma ABI, because a router call can bubble up an oracle or Jar error.
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, decodeErrorResult, type Abi, type Hex } from "viem";
import { feePoolAbi, friendJarAbi, hindsightLensAbi, jarAbi, stockOracleAbi, terraRouterAbi, wifStakingAbi } from "./abi";

const ALL_ERRORS = [terraRouterAbi, jarAbi, feePoolAbi, wifStakingAbi, stockOracleAbi, hindsightLensAbi, friendJarAbi]
  .flat()
  .filter((x) => x.type === "error") as unknown as Abi;

export const PLAIN: Record<string, string> = {
  WifNotSellable: "Terra Firma never sells $WIF. Stake it to earn real stock instead.",
  Slippage: "The price moved past your guaranteed minimum, so nothing happened. Get a fresh quote and try again.",
  StaleOracle: "Stock prices are paused right now (market data closed). Try again soon.",
  BadAnswer: "Stock prices are paused right now (market data closed). Try again soon.",
  SweepTooHigh: "The Jar slice can be at most 10% of the trade.",
  BadRoute: "That route isn't supported. Refresh the quote or pick another token.",
  EpochNotElapsed: "This epoch was already distributed. The next one opens on the hour.",
  BelowThreshold: "The fee pool is below the minimum to distribute. Try after more trades.",
  Locked: "Your $WIF is still locked. Withdraw opens 24h after you asked to unstake.",
  Insufficient: "You don't have enough balance for that.",
  NothingToConvert: "Nothing to convert. Select at least one meme with a balance.",
  NoActiveStake: "You have no active stake yet. A stake placed in epoch e activates at the start of epoch e+2 (60 to 120 minutes).",
  ZeroAmount: "Enter an amount above zero.",
  BadStock: "That stock isn't one of the six supported.",
  BadRound: "The card inputs changed. Refresh the card and try again.",
  BadPayKind: "The card has a payment type the contract doesn't support. Refresh the card.",
  BadInvite: "That invite code doesn't match this Jar.",
  NotMember: "Join this Jar first.",
  NothingToExit: "You have nothing in this Jar to exit.",
  LengthMismatch: "The request was malformed. Refresh and try again.",
  EthTransferFailed: "Sending ETH back to your wallet failed.",
  SafeERC20FailedOperation: "A token transfer failed. Check your balance and approval.",
  ReentrancyGuardReentrantCall: "The contract rejected a nested call.",
  NotDepositor: "Only Terra Firma contracts can credit the Jar.",
  Unbacked: "The Jar refused a credit that wasn't backed by tokens.",
  NotFeePool: "Only the fee pool can do that.",
  InsufficientGas: "The transaction ran out of gas budget. Increase the gas limit and retry.",
  OnlySelf: "That function can only be called by the contract itself.",
};

export const WRONG_CHAIN = "Switch your wallet to Robinhood Chain (4663) to continue.";

/** True if any error in the cause chain has one of these names (wagmi and viem errors both carry `name`). */
function hasName(e: unknown, names: string[], depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 8) return false;
  const x = e as { name?: unknown; cause?: unknown };
  return (typeof x.name === "string" && names.includes(x.name)) || hasName(x.cause, names, depth + 1);
}

/** A contract revert (as opposed to a network/RPC failure). Used to tell "no such function" from "RPC down". */
export function isRevert(e: unknown): boolean {
  if (hasName(e, ["ContractFunctionRevertedError", "ExecutionRevertedError"])) return true;
  return e instanceof Error && /revert/i.test(e.message);
}

export type OwnerProbe = "ownerless" | "has-owner" | "unknown";

/** Classify a raw eth_call of owner() (0x8da5cb5b): a revert or empty return means the contract has no owner(). */
export function classifyOwnerProbe(r: { data?: string } | { error: unknown }): OwnerProbe {
  if ("error" in r) return isRevert(r.error) ? "ownerless" : "unknown";
  const d = r.data ?? "0x";
  return d === "0x" ? "ownerless" : d.length >= 66 ? "has-owner" : "unknown";
}

function revertName(err: BaseError): string | undefined {
  const rev = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  if (rev?.data?.errorName) return rev.data.errorName;
  const raw = (rev?.raw ?? findData(err)) as Hex | undefined;
  if (!raw || raw.length < 10) return undefined;
  try {
    return decodeErrorResult({ abi: ALL_ERRORS, data: raw }).errorName;
  } catch {
    return undefined;
  }
}

function findData(err: BaseError): Hex | undefined {
  let found: Hex | undefined;
  err.walk((e) => {
    const d = (e as { data?: unknown }).data;
    if (typeof d === "string" && d.startsWith("0x")) found = d as Hex;
    return false;
  });
  return found;
}

/** Plain-language message for any thrown error. */
export function plainError(e: unknown): string {
  if (hasName(e, ["ConnectorChainMismatchError", "ChainMismatchError", "ChainNotConfiguredError", "SwitchChainNotSupportedError"])) return WRONG_CHAIN;
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You cancelled in your wallet.";
    const name = revertName(e);
    if (name && PLAIN[name]) return PLAIN[name];
    if (/insufficient funds/i.test(e.message)) return "Not enough ETH for this amount plus gas.";
    if (/user rejected|denied/i.test(e.message)) return "You cancelled in your wallet.";
    return e.shortMessage || "The transaction failed.";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

/** API error codes from /api/quote and /api/hindsight. */
export const API_ERRORS: Record<string, string> = {
  bad_request: "Enter a valid amount.",
  no_route: "No Uniswap route for this token.",
  taxed_token: "This token charges a transfer tax; Terra Firma doesn't route taxed tokens.",
  wif_not_sellable: PLAIN.WifNotSellable,
  oracle_stale: PLAIN.StaleOracle,
  quote_failed: "Couldn't get a quote right now. Try again in a few seconds.",
  rpc_unavailable: "The chain is busy. Try again in a few seconds.",
  bad_address: "That isn't a valid wallet address.",
  bad_stock: "That stock isn't supported.",
};
