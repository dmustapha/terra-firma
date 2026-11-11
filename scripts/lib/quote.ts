// File: scripts/lib/quote.ts
// Node twin of web/lib/quote.ts (same quoter ABIs, same Route shapes, same best-output rule) without "server-only".
import { decodeFunctionResult, encodeFunctionData, encodePacked, type Address, type Hex } from "viem";
import { ADDR, STOCKS, type StockId } from "../../web/lib/config";
import type { PoolEntry } from "../../web/lib/registry";
import { RpcError, rpcChunked } from "./rpc";

export interface Route {
  kind: 1 | 2 | 3;
  v2Path: Address[];
  v3Path: Hex;
  key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
}

export const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const EMPTY_KEY = { currency0: ZERO, currency1: ZERO, fee: 0, tickSpacing: 0, hooks: ZERO };

const poolKeyComponents = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export const quoterV2Abi = [
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

export const v4QuoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: poolKeyComponents },
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

export function quoteCall(p: PoolEntry, token: Address, side: "buy" | "sell", amountIn: bigint): { to: Address; data: Hex } {
  if (p.kind === 1) {
    const path: Address[] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { to: ADDR.v2Router, data: encodeFunctionData({ abi: v2RouterAbi, functionName: "getAmountsOut", args: [amountIn, path] }) };
  }
  if (p.kind === 2) {
    const [tokenIn, tokenOut] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    const args = [{ tokenIn, tokenOut, amountIn, fee: p.fee, sqrtPriceLimitX96: 0n }] as const;
    return { to: ADDR.quoterV2, data: encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", args }) };
  }
  const args = [{ poolKey: p.key, zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" as Hex }] as const;
  return { to: ADDR.v4Quoter, data: encodeFunctionData({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", args }) };
}

function decodeQuote(p: PoolEntry, raw: Hex): bigint {
  if (p.kind === 1) {
    const amounts = decodeFunctionResult({ abi: v2RouterAbi, functionName: "getAmountsOut", data: raw });
    return amounts[amounts.length - 1];
  }
  if (p.kind === 2) return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", data: raw })[0];
  return decodeFunctionResult({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", data: raw })[0];
}

export type PoolQuote = { pool: PoolEntry; amountOut: bigint } | { pool: PoolEntry; error: string };

/** Quote each pool independently; failures are returned, never swallowed into a zero. */
export async function quotePools(token: Address, pools: PoolEntry[], side: "buy" | "sell", amountIn: bigint): Promise<PoolQuote[]> {
  const calls = pools.map((p) => ({ method: "eth_call", params: [quoteCall(p, token, side, amountIn), "latest"] }));
  const res = await rpcChunked(calls, 20);
  return res.map((r, i) => {
    if (r instanceof RpcError) return { pool: pools[i], error: r.message.slice(0, 120) };
    try {
      return { pool: pools[i], amountOut: decodeQuote(pools[i], r as Hex) };
    } catch (e) {
      return { pool: pools[i], error: `undecodable: ${(e as Error).message.slice(0, 80)}` };
    }
  });
}

export interface BestQuote {
  route: Route;
  pool: PoolEntry;
  amountOut: bigint;
}

export async function bestQuote(token: Address, pools: PoolEntry[], side: "buy" | "sell", amountIn: bigint): Promise<BestQuote | null> {
  if (pools.length === 0 || amountIn === 0n) return null;
  let best: BestQuote | null = null;
  for (const q of await quotePools(token, pools, side, amountIn)) {
    if ("error" in q) continue;
    if (!best || q.amountOut > best.amountOut) best = { route: routeFor(q.pool, token, side), pool: q.pool, amountOut: q.amountOut };
  }
  return best;
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

/** ETH -> stock quote along the StockOracle path. */
export async function quoteStock(stockId: StockId, ethIn: bigint): Promise<bigint> {
  if (ethIn === 0n) return 0n;
  const data = encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInput", args: [STOCK_PATHS[stockId], ethIn] });
  const [r] = await rpcChunked([{ method: "eth_call", params: [{ to: ADDR.quoterV2, data }, "latest"] }]);
  if (r instanceof RpcError) throw new Error(`quote ${STOCKS[stockId].symbol}: ${r.message}`);
  return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInput", data: r as Hex })[0];
}
