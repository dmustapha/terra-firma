// File: web/lib/config.ts
// [VERIFIED] addresses read live on Robinhood Chain mainnet 4663 (intel, fact-check, forge spike + fork tests).
import type { Address } from "viem";
import deployments from "@/data/deployments.json";

export const CHAIN_ID = 4663;
export const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
/** Browser reads go through the site's own read-only proxy (private node, public fallback); SSR uses the public RPC. */
export const BROWSER_RPC = typeof window === "undefined" ? PUBLIC_RPC : `${window.location.origin}/api/rpc`;
export const EXPLORER = "https://robinhoodchain.blockscout.com";

export const ADDR = {
  universalRouter: "0x8876789976dEcBfCbBbe364623C63652db8C0904",
  universalRouter212: "0x204FAca1764B154221e35c0d20aBb3c525710498",
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  v4Quoter: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
  quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
  v2Router: "0x89e5db8b5aa49aa85ac63f691524311aeb649eba",
  v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
  v2Factory: "0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  wif: "0x5173b8eA6923c2d40267890D45C46a3480954773",
  wifHook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
  multicall3: "0xca11bde05977b3631167028862be2a173976ca11",
  ethUsd: "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9",
  usdgUsd: "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2",
} as const satisfies Record<string, Address>;

/** Terra Firma contracts (written by contracts/script/Deploy.s.sol, copied by scripts/sync-deployments.mjs). */
export const TF = deployments as unknown as {
  chainId: number;
  block: number;
  start: number;
  StockOracle: Address;
  Jar: Address;
  WifStaking: Address;
  FeePool: Address;
  TerraRouter: Address;
  HindsightLens: Address;
  FriendJar: Address;
};

export type StockId = 0 | 1 | 2 | 3 | 4 | 5;

export interface StockInfo {
  id: StockId;
  symbol: "NVDA" | "TSLA" | "GOOGL" | "SNDK" | "SPY" | "QQQ";
  name: string;
  token: Address;
  liveFeed: Address;
  historyFeed: Address;
  hours: "24/7" | "24/5";
}

/** Curated 6 (OD4). Same order and ids as contracts/script/TerraConfig.sol `stocks()`. */
export const STOCKS: readonly StockInfo[] = [
  { id: 0, symbol: "NVDA", name: "NVIDIA", token: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", liveFeed: "0x321A36e441DfBadA01Aa6f9884F14a344E133D1F", historyFeed: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", hours: "24/7" },
  { id: 1, symbol: "TSLA", name: "Tesla", token: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", liveFeed: "0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37", historyFeed: "0x4A1166a659A55625345e9515b32adECea5547C38", hours: "24/7" },
  { id: 2, symbol: "GOOGL", name: "Alphabet", token: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", liveFeed: "0x53e040D2C8c9278cBc4b702328aC652068a0E063", historyFeed: "0xF6f373a037c30F0e5010d854385cA89185AE638b", hours: "24/7" },
  { id: 3, symbol: "SNDK", name: "SanDisk", token: "0xB90A19fF0Af67f7779afF50A882A9CfF42446400", liveFeed: "0x7FA2c251b345b8492C039a59a42b38603a05Ed9b", historyFeed: "0xfb133Fa4B7b385802B693a293606682Df47109A3", hours: "24/7" },
  { id: 4, symbol: "SPY", name: "S&P 500 ETF", token: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", liveFeed: "0x319724394D3A0e3669269846abE664Cd621f9f6A", historyFeed: "0x319724394D3A0e3669269846abE664Cd621f9f6A", hours: "24/5" },
  { id: 5, symbol: "QQQ", name: "Nasdaq-100 ETF", token: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", liveFeed: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", historyFeed: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", hours: "24/5" },
] as const;

export const stockBySymbol = (s: string) => STOCKS.find((x) => x.symbol === s.toUpperCase());

export const FEE_BPS = 50;
export const STAKER_FEE_BPS = 30;
export const DISCOUNT_STAKE = 10_000n * 10n ** 18n;
export const DEFAULT_SWEEP_BPS = 200;
export const ORACLE_BAND_BPS = 300;

export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;
