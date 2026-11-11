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
  NoActiveStake: "You have no active stake yet. It activates at the next epoch.",
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
};

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
