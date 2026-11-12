// File: web/app/api/qn-jar/route.ts
// Cross-checks the Jar contract's Stock Token balances via Quicknode qn_getStockTokenBalances against direct
// ERC-20 balanceOf reads. Display-only (never in the money path). Verified shape (2026-11-12, Robinhood Chain mainnet):
// params [address] -> { result: { holdings: [{ token, balanceRaw, ... }] } }. Anything else returns enabled:false.
import { NextResponse } from "next/server";
import { erc20Abi } from "@/lib/abi";
import { STOCKS, TF } from "@/lib/config";
import { quicknodeUrl } from "@/lib/rpc";
import { DEPLOYED, publicClient } from "@/lib/ui-chain";

export const runtime = "nodejs";
export const revalidate = 0;

type QnRow = { address?: string; contractAddress?: string; token?: string; balance?: string; rawBalance?: string; balanceRaw?: string };

function rowsOf(result: unknown): QnRow[] {
  if (Array.isArray(result)) return result as QnRow[];
  const r = result as { holdings?: QnRow[]; balances?: QnRow[]; tokens?: QnRow[]; assets?: QnRow[] } | null;
  return r?.holdings ?? r?.balances ?? r?.tokens ?? r?.assets ?? [];
}

export async function GET() {
  const url = quicknodeUrl(); // QUICKNODE_RPC, or QUICKNODE_BASE + QUICKNODE_TOKEN
  if (!url || !DEPLOYED) return NextResponse.json({ enabled: false });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "qn_getStockTokenBalances", params: [TF.Jar] }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await res.json()) as { result?: unknown; error?: unknown };
    if (!res.ok || body.error || body.result === undefined) return NextResponse.json({ enabled: false });
    const qn = new Map(
      rowsOf(body.result)
        .map((r) => [(r.address ?? r.contractAddress ?? r.token ?? "").toLowerCase(), r.balanceRaw ?? r.rawBalance ?? r.balance] as const)
        .filter(([a, b]) => a && b !== undefined),
    );
    const direct = await publicClient.multicall({
      allowFailure: false,
      contracts: STOCKS.map((s) => ({ address: s.token, abi: erc20Abi, functionName: "balanceOf", args: [TF.Jar] }) as const),
    });
    // A balance that is not an integer string (e.g. decimal-formatted) is an unknown format, not a disagreement.
    if ([...qn.values()].some((q) => !/^\d+$/.test(String(q)))) return NextResponse.json({ enabled: false });
    const checks = STOCKS.map((s, i) => {
      const q = qn.get(s.token.toLowerCase());
      const d = direct[i] as bigint;
      return { symbol: s.symbol, direct: d.toString(), quicknode: q ?? null, match: q === undefined ? d === 0n : BigInt(q) === d };
    });
    if (qn.size === 0 && checks.some((c) => c.direct !== "0")) return NextResponse.json({ enabled: false });
    return NextResponse.json({ enabled: true, agreement: checks.every((c) => c.match), checks });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
