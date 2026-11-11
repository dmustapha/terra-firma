// File: web/app/api/health/route.ts
// [VERIFIED] reads only chain state; used by livetest / demo-rehearsal.
import { NextResponse } from "next/server";
import { ADDR, STOCKS, TF } from "@/lib/config";
import { latestPrice8 } from "@/lib/rounds";
import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [block, feePoolWei, ...feeds] = await Promise.all([
      rpc<string>("eth_blockNumber", []),
      rpc<string>("eth_getBalance", [TF.FeePool, "latest"]),
      latestPrice8(ADDR.ethUsd),
      ...STOCKS.map((s) => latestPrice8(s.liveFeed)),
    ]);
    const now = Date.now() / 1000;
    const fresh = Object.fromEntries(
      [["ETH", feeds[0]], ...STOCKS.map((s, i) => [s.symbol, feeds[i + 1]] as const)].map(([k, f]) => [k, now - (f as { updatedAt: number }).updatedAt < 25 * 3600]),
    );
    return NextResponse.json({ rpc: "ok", block: Number(block), deployed: (TF as unknown as { deployed?: boolean }).deployed !== false, feeds: fresh, feePoolWei: BigInt(feePoolWei).toString() });
  } catch (e) {
    return NextResponse.json({ rpc: "degraded", error: String(e) }, { status: 503 });
  }
}
