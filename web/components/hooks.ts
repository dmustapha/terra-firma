"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { type Abi, type Address, type Hex, type TransactionReceipt } from "viem";
import { useAccount, useConfig } from "wagmi";
import { readContract, simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { erc20Abi } from "@/lib/abi";
import { ADDR, CHAIN_ID } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { aggregatorAbi, publicClient } from "@/lib/ui-chain";
import { API_ERRORS, plainError } from "@/lib/ui-errors";
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
}

export interface TxStep {
  label: string;
  call: WriteCall;
  /** Return true to skip (e.g. allowance already sufficient). */
  skip?: () => Promise<boolean>;
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
          setState({ phase: "sign", step: i + 1, total: steps.length, label: s.label, hashes: [...hashes] });
          // One localized cast: the steps array mixes ABIs, so wagmi's per-ABI generics cannot be inferred here.
          const { request } = await simulateContract(config, { ...s.call, account: address, chainId: CHAIN_ID } as never);
          const hash = await writeContract(config, request as never);
          hashes.push({ label: s.label, hash });
          setState({ phase: "pending", step: i + 1, total: steps.length, label: s.label, hash, hashes: [...hashes] });
          last = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
          if (last.status !== "success") throw new Error(`${s.label} reverted onchain.`);
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
