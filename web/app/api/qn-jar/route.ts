// File: web/app/api/qn-jar/route.ts
// Cross-checks the Jar contract's Stock Token balances via Quicknode qn_getStockTokenBalances against direct
// ERC-20 balanceOf reads. Display-only (never in the money path). [UNVERIFIED] Quicknode response field names:
// parsed defensively; anything unparseable returns enabled:false so the UI hides the badge.
import { NextResponse } from "next/server";
import { erc20Abi } from "@/lib/abi";
import { STOCKS, TF } from "@/lib/config";
import { DEPLOYED, publicClient } from "@/lib/ui-chain";

export const runtime = "nodejs";
export const revalidate = 0;

type QnRow = { address?: string; contractAddress?: string; token?: string; balance?: string; rawBalance?: string };

function rowsOf(result: unknown): QnRow[] {
  if (Array.isArray(result)) return result as QnRow[];
  const r = result as { balances?: QnRow[]; tokens?: QnRow[]; assets?: QnRow[] } | null;
  return r?.balances ?? r?.tokens ?? r?.assets ?? [];
}

export async function GET() {
  const url = process.env.QUICKNODE_RPC;
  if (!url || !DEPLOYED) return NextResponse.json({ enabled: false });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "qn_getStockTokenBalances", params: [{ wallet: TF.Jar }] }),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: unknown; error?: unknown };
    if (!res.ok || body.error || body.result === undefined) return NextResponse.json({ enabled: false });
    const qn = new Map(
      rowsOf(body.result)
        .map((r) => [(r.address ?? r.contractAddress ?? r.token ?? "").toLowerCase(), r.rawBalance ?? r.balance] as const)
        .filter(([a, b]) => a && b !== undefined),
    );
    const direct = await publicClient.multicall({
      allowFailure: false,
      contracts: STOCKS.map((s) => ({ address: s.token, abi: erc20Abi, functionName: "balanceOf", args: [TF.Jar] }) as const),
    });
    const checks = STOCKS.map((s, i) => {
      const q = qn.get(s.token.toLowerCase());
      const d = direct[i] as bigint;
      return { symbol: s.symbol, direct: d.toString(), quicknode: q ?? null, match: q === undefined ? d === 0n : (() => { try { return BigInt(q) === d; } catch { return false; } })() };
    });
    if (qn.size === 0 && checks.some((c) => c.direct !== "0")) return NextResponse.json({ enabled: false });
    return NextResponse.json({ enabled: true, agreement: checks.every((c) => c.match), checks });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
