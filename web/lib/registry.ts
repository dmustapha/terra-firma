// File: web/lib/registry.ts
// [VERIFIED] shape mirrors research/spike-pool-keys.json + spike-coverage.md; file built by scripts/build-registry.ts.
import type { Address, Hex } from "viem";
import registry from "@/data/memes.json";

export type PoolEntry =
  | { kind: 1; version: "v2"; pool: Address; quote: "WETH"; liquidityUsd: number }
  | { kind: 2; version: "v3"; pool: Address; fee: number; quote: "WETH"; liquidityUsd: number }
  | {
      kind: 3;
      version: "v4";
      id: Hex;
      key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
      liquidityUsd: number;
    };

export interface Meme {
  token: Address;
  symbol: string;
  decimals: number;
  firstBlock: number;
  pools: PoolEntry[];
  tested: boolean;
  taxed: boolean;
}

export interface Registry {
  version: 1;
  builtAt: string;
  memes: Meme[];
  /** Addresses whose outgoing token transfers count as a purchase source (pools, routers, PoolManager). */
  sources: Address[];
}

export const REGISTRY = registry as unknown as Registry;

export const memeByToken = (t: string) => REGISTRY.memes.find((m) => m.token.toLowerCase() === t.toLowerCase());
