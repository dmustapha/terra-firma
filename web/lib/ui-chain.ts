// Client-safe chain helpers: deployment state, a public viem client, extra read ABIs.
// Never imports server-only modules (rpc, rounds, quote, hindsight).
import { createPublicClient, http, zeroAddress, type Address } from "viem";
import { robinhood } from "viem/chains";
import { ADDR, PUBLIC_RPC, TF } from "./config";

/** True only once Deploy.s.sol has written real addresses into data/deployments.json. */
export const DEPLOYED = (TF as unknown as { deployed?: boolean }).deployed !== false && TF.TerraRouter !== zeroAddress;

/** JSON-RPC batching (<= 30 calls per POST) keeps chunked getLogs scans under the public RPC rate limit. */
export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(PUBLIC_RPC, { batch: { batchSize: 30, wait: 20 }, retryCount: 3, retryDelay: 400 }),
});

export type ContractKey = "StockOracle" | "Jar" | "WifStaking" | "FeePool" | "TerraRouter" | "HindsightLens" | "FriendJar";

export const CONTRACTS: { key: ContractKey; address: Address; role: string }[] = [
  { key: "TerraRouter", address: TF.TerraRouter, role: "Routes meme trades through Uniswap and sweeps a slice into stock." },
  { key: "Jar", address: TF.Jar, role: "Ownerless ledger holding your real Stock Tokens." },
  { key: "FeePool", address: TF.FeePool, role: "Each epoch: half buys and burns $WIF, half buys stock for stakers." },
  { key: "WifStaking", address: TF.WifStaking, role: "Stake $WIF, pick a reward stock, claim it to your Jar." },
  { key: "StockOracle", address: TF.StockOracle, role: "Chainlink reads and the 3% min-out band on every stock fill." },
  { key: "HindsightLens", address: TF.HindsightLens, role: "Recomputes any Hindsight card onchain; mints it by burning 1 $WIF." },
  { key: "FriendJar", address: TF.FriendJar, role: "Shared Jars owned pro-rata by contribution." },
];

export const WIF = ADDR.wif;

/** Chainlink AggregatorV3 subset. */
export const aggregatorAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "";
export const DEMO_ADDR = process.env.NEXT_PUBLIC_DEMO_ADDR || "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
export const FRIEND_JARS = process.env.NEXT_PUBLIC_FRIEND_JARS === "1";
/** Real long-history wallet used as the Scene 2 contrast shot (PRD §6). Its card is read live from chain like any other. */
export const HISTORY_ADDR = process.env.NEXT_PUBLIC_HISTORY_ADDR || "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";

/** Addresses marked Blockscout-verified in data/deployments.json ("verified": [...]) after `forge verify-contract`. Empty = no badge. */
export const VERIFIED = new Set(((TF as unknown as { verified?: string[] }).verified ?? []).map((a) => a.toLowerCase()));

/** Contracts shown on /proof: FriendJar only when the feature flag is on. */
export const SHOWN_CONTRACTS = CONTRACTS.filter((c) => c.key !== "FriendJar" || FRIEND_JARS);
