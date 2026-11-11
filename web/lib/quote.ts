// File: web/lib/quote.ts
// [VERIFIED] quoter ABIs + behaviour from spike-coverage.md (V4Quoter handles hooked + dynamic-fee keys, QuoterV2,
// v2 Router02 getAmountsOut; no quoter reverted in 30+ live calls). Route shapes match TerraRouter.Route.
import "server-only";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, encodePacked, type Address, type Hex } from "viem";
import { ADDR, ORACLE_BAND_BPS, STOCKS, type StockId } from "./config";
import { memeByToken, type PoolEntry } from "./registry";
import { RpcError, rpcBatch } from "./rpc";
import { latestPrice8 } from "./rounds";

/** Mirrors TerraRouter.Route (kind 1 = v2, 2 = v3, 3 = v4 native-ETH single hop). */
export interface Route {
  kind: 1 | 2 | 3;
  v2Path: Address[];
  v3Path: Hex;
  key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const EMPTY_KEY = { currency0: ZERO, currency1: ZERO, fee: 0, tickSpacing: 0, hooks: ZERO };

const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "ticks", type: "uint32" },
      { name: "gas", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "s", type: "uint160[]" },
      { name: "t", type: "uint32[]" },
      { name: "gas", type: "uint256" },
    ],
  },
] as const;

const v4QuoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const v2RouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

/** Packed v3 path WETH -> fee -> token (buy) or token -> fee -> WETH (sell). */
export const v3Path = (a: Address, fee: number, b: Address) => encodePacked(["address", "uint24", "address"], [a, fee, b]);

export function routeFor(p: PoolEntry, token: Address, side: "buy" | "sell"): Route {
  if (p.kind === 1) {
    const path: Address[] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { kind: 1, v2Path: path, v3Path: "0x", key: EMPTY_KEY };
  }
  if (p.kind === 2) {
    const path = side === "buy" ? v3Path(ADDR.weth, p.fee, token) : v3Path(token, p.fee, ADDR.weth);
    return { kind: 2, v2Path: [], v3Path: path, key: EMPTY_KEY };
  }
  return { kind: 3, v2Path: [], v3Path: "0x", key: p.key };
}

function quoteCall(p: PoolEntry, token: Address, side: "buy" | "sell", amountIn: bigint) {
  if (p.kind === 1) {
    const path = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { to: ADDR.v2Router, data: encodeFunctionData({ abi: v2RouterAbi, functionName: "getAmountsOut", args: [amountIn, path as Address[]] }) };
  }
  if (p.kind === 2) {
    const [tokenIn, tokenOut] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return {
      to: ADDR.quoterV2,
      data: encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", args: [{ tokenIn, tokenOut, amountIn, fee: p.fee, sqrtPriceLimitX96: 0n }] }),
    };
  }
  return {
    to: ADDR.v4Quoter,
    data: encodeFunctionData({
      abi: v4QuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey: p.key, zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" }],
    }),
  };
}

function decodeQuote(p: PoolEntry, raw: Hex): bigint {
  if (p.kind === 1) {
    const amounts = decodeFunctionResult({ abi: v2RouterAbi, functionName: "getAmountsOut", data: raw });
    return amounts[amounts.length - 1];
  }
  if (p.kind === 2) return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", data: raw })[0];
  return decodeFunctionResult({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", data: raw })[0];
}

export interface BestQuote {
  route: Route;
  pool: PoolEntry;
  amountOut: bigint;
}

/** Quote every registry pool for `token` in one JSON-RPC batch and return the best output. */
export async function bestQuote(token: Address, side: "buy" | "sell", amountIn: bigint): Promise<BestQuote | null> {
  const meme = token.toLowerCase() === ADDR.wif.toLowerCase() ? WIF_MEME : memeByToken(token);
  if (!meme || meme.pools.length === 0 || amountIn === 0n) return null;
  if (meme === WIF_MEME && side !== "buy") return null; // $WIF is never sold (INVARIANT 1)
  const calls = meme.pools.map((p) => ({ method: "eth_call", params: [quoteCall(p, token, side, amountIn), "latest"] }));
  const res = await rpcBatch(calls);
  let best: BestQuote | null = null;
  res.forEach((r, i) => {
    if (r instanceof RpcError || typeof r !== "string") return;
    try {
      const out = decodeQuote(meme.pools[i], r as Hex);
      if (!best || out > best.amountOut) best = { route: routeFor(meme.pools[i], token, side), pool: meme.pools[i], amountOut: out };
    } catch {
      /* undecodable quote: skip this pool */
    }
  });
  return best;
}

/** ETH -> stock quote along the same packed path TerraRouter uses (StockOracle path). */
export async function quoteStock(stockId: StockId, ethIn: bigint): Promise<bigint> {
  if (ethIn === 0n) return 0n;
  const s = STOCKS[stockId];
  const path = STOCK_PATHS[stockId];
  const data = encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInput", args: [path, ethIn] });
  const [r] = await rpcBatch([{ method: "eth_call", params: [{ to: ADDR.quoterV2, data }, "latest"] }]);
  if (r instanceof RpcError) throw new Error(`quote ${s.symbol}: ${r.message}`);
  return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInput", data: r as Hex })[0];
}

/** $WIF is not a Hindsight meme, but the terminal may BUY it through its own v4 pool (owned third-party hook). */
const WIF_MEME = {
  token: ADDR.wif,
  symbol: "WIF",
  decimals: 18,
  firstBlock: 0,
  tested: true,
  taxed: false,
  pools: [
    {
      kind: 3,
      version: "v4",
      id: "0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79",
      key: { currency0: ZERO, currency1: ADDR.wif, fee: 0, tickSpacing: 200, hooks: ADDR.wifHook },
      liquidityUsd: 100_000,
    },
  ] as PoolEntry[],
};

/** Chainlink-implied minimum the contract will enforce (mirrors StockOracle.minStockOut). */
export async function oracleMinStock(stockId: StockId, ethIn: bigint) {
  const [e, s] = await Promise.all([latestPrice8(ADDR.ethUsd), latestPrice8(STOCKS[stockId].liveFeed)]);
  const min = ((ethIn * e.price8) / s.price8) * BigInt(10_000 - ORACLE_BAND_BPS) / 10_000n;
  return { min, ethUsd8: e.price8, stockUsd8: s.price8, fresh: Date.now() / 1000 - s.updatedAt < 25 * 3600 };
}

/** Same packed paths as contracts/script/TerraConfig.sol stocks(). */
export const STOCK_PATHS: Record<StockId, Hex> = {
  0: v3Path(ADDR.weth, 500, STOCKS[0].token),
  1: v3Path(ADDR.weth, 3000, STOCKS[1].token),
  2: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 500, STOCKS[2].token]),
  3: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 10000, STOCKS[3].token]),
  4: v3Path(ADDR.weth, 500, STOCKS[4].token),
  5: v3Path(ADDR.weth, 3000, STOCKS[5].token),
};

/** ABI-encode a Route for logging/debug parity with Solidity tests. */
export const encodeRoute = (r: Route) =>
  encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "kind", type: "uint8" },
          { name: "v2Path", type: "address[]" },
          { name: "v3Path", type: "bytes" },
          {
            name: "key",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
        ],
      },
    ],
    [r],
  );
