"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { type Abi, type Address, type Hex, type TransactionReceipt } from "viem";
import { useAccount, useConfig } from "wagmi";
import { getAccount, readContract, simulateContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { erc20Abi } from "@/lib/abi";
import { ADDR, CHAIN_ID } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { aggregatorAbi, publicClient } from "@/lib/ui-chain";
import { API_ERRORS, WRONG_CHAIN, plainError } from "@/lib/ui-errors";
import { scanLogs } from "@/lib/ui-logs";
import { stockQuotes } from "@/lib/ui-report";

/** Ticking clock (seconds). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Every Terra Firma event since deploy, refreshed incrementally every 30s. */
export function useTfLogs() {
  return useQuery({ queryKey: ["tf-logs"], queryFn: scanLogs, refetchInterval: 30_000, staleTime: 15_000 });
}

/** uiMultiplier + Chainlink live price per curated stock. */
export function useStockQuotes() {
  return useQuery({ queryKey: ["stock-quotes"], queryFn: stockQuotes, refetchInterval: 60_000, staleTime: 30_000 });
}

export function useEthUsd() {
  return useQuery({
    queryKey: ["eth-usd"],
    queryFn: async () => {
      const r = await publicClient.readContract({ address: ADDR.ethUsd, abi: aggregatorAbi, functionName: "latestRoundData" });
      return { roundId: r[0], price8: r[1], updatedAt: Number(r[3]) };
    },
    refetchInterval: 60_000,
  });
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(API_ERRORS[(body as { error?: string }).error ?? ""] ?? "The chain is busy. Try again in a few seconds.");
  return body as T;
}

export function useCard(addr: string | undefined, stock: string) {
  return useQuery({
    queryKey: ["card", addr?.toLowerCase(), stock],
    queryFn: () => getJson<Card>(`/api/hindsight?addr=${addr}&stock=${stock}`),
    enabled: !!addr,
    staleTime: 300_000,
    retry: 3,
    retryDelay: (n) => 1000 * 2 ** n,
  });
}

export { getJson };

// ---------------------------------------------------------------------------------------------
// Transactions: simulate (decodes custom errors before the wallet opens), sign, wait for receipt.

export interface WriteCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Explicit gas limit (FeePool.distribute needs ~3.1M with all six pools live; wallet estimates can under-shoot). */
  gas?: bigint;
}

export interface TxStep {
  label: string;
  /** Static call, or `build` to compute it right before signing (fresh quote + min-out). One of the two is required. */
  call?: WriteCall;
  build?: () => Promise<{ call: WriteCall; label?: string }>;
  /** Return true to skip (e.g. allowance already sufficient). */
  skip?: () => Promise<boolean>;
}

/** Make sure the wallet is on 4663 before a write; ask it to switch if not. Throws a plain-language error. */
async function ensureChain(config: Parameters<typeof getAccount>[0]) {
  if (getAccount(config).chainId === CHAIN_ID) return;
  try {
    await switchChain(config, { chainId: CHAIN_ID });
  } catch (e) {
    const msg = plainError(e);
    throw new Error(msg === "You cancelled in your wallet." ? `${WRONG_CHAIN} The switch was cancelled.` : WRONG_CHAIN);
  }
  if (getAccount(config).chainId !== CHAIN_ID) throw new Error(WRONG_CHAIN);
}

export type TxPhase = "idle" | "sign" | "pending" | "done" | "error";

export interface TxState {
  phase: TxPhase;
  step: number;
  total: number;
  label: string;
  hash?: Hex;
  hashes: { label: string; hash: Hex }[];
  error?: string;
}

const IDLE: TxState = { phase: "idle", step: 0, total: 0, label: "", hashes: [] };

export function useTx() {
  const config = useConfig();
  const { address } = useAccount();
  const [state, setState] = useState<TxState>(IDLE);

  const run = useCallback(
    async (steps: TxStep[]): Promise<TransactionReceipt | null> => {
      if (!address) return null;
      const hashes: TxState["hashes"] = [];
      let last: TransactionReceipt | null = null;
      try {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (s.skip && (await s.skip())) continue;
          await ensureChain(config);
          let call = s.call;
          let label = s.label;
          if (s.build) {
            setState({ phase: "sign", step: i + 1, total: steps.length, label: `${s.label}: refreshing the quote`, hashes: [...hashes] });
            const b = await s.build();
            call = b.call;
            label = b.label ?? s.label;
          }
          if (!call) throw new Error("Nothing to sign.");
          setState({ phase: "sign", step: i + 1, total: steps.length, label, hashes: [...hashes] });
          // One localized cast: the steps array mixes ABIs, so wagmi's per-ABI generics cannot be inferred here.
          const { request } = await simulateContract(config, { ...call, account: address, chainId: CHAIN_ID } as never);
          const hash = await writeContract(config, request as never);
          hashes.push({ label, hash });
          setState({ phase: "pending", step: i + 1, total: steps.length, label, hash, hashes: [...hashes] });
          last = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
          if (last.status !== "success") throw new Error(`${label} reverted onchain.`);
        }
        setState((p) => ({ ...p, phase: "done", hashes: [...hashes] }));
        return last;
      } catch (e) {
        setState((p) => ({ ...p, phase: "error", error: plainError(e), hashes: [...hashes] }));
        return null;
      }
    },
    [address, config],
  );

  const reset = useCallback(() => setState(IDLE), []);
  const busy = state.phase === "sign" || state.phase === "pending";
  return { state, run, reset, busy };
}

/** Exact-amount ERC-20 approval step, skipped when the allowance already covers it. */
export function useApproveStep() {
  const config = useConfig();
  const { address } = useAccount();
  return useCallback(
    (tokenAddr: Address, spender: Address, amount: bigint, symbol: string): TxStep => ({
      label: `Approve ${symbol}`,
      call: { address: tokenAddr, abi: erc20Abi as unknown as Abi, functionName: "approve", args: [spender, amount] },
      skip: async () => {
        if (!address) return false;
        const a = await readContract(config, { address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [address, spender], chainId: CHAIN_ID });
        return a >= amount;
      },
    }),
    [address, config],
  );
}
