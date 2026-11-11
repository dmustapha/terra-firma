// File: web/app/api/card-check/route.ts
// [VERIFIED] reuses buildCard (VERIFIED end to end on a real wallet). Answers: does a minted card's usdPaid8 match the
// card re-derived from chain logs for that wallet? HindsightLens proves pricing arithmetic only; this proves provenance.
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { STOCKS, type StockId } from "@/lib/config";
import { buildCard } from "@/lib/hindsight";

export const runtime = "nodejs";
export const maxDuration = 60;
const cache = new Map<string, { at: number; verified: boolean; derived: string }>();

export async function GET(req: Request) {
  const u = new URL(req.url);
  const addr = u.searchParams.get("addr") ?? "";
  const claimed = u.searchParams.get("usdPaid8") ?? "";
  const sid = Number(u.searchParams.get("stockId") ?? "0");
  if (!isAddress(addr) || !/^\d{1,40}$/.test(claimed) || !(sid >= 0 && sid < STOCKS.length)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const key = `${addr.toLowerCase()}:${claimed}:${sid}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600_000) return NextResponse.json(hit);
  try {
    const card = await buildCard(getAddress(addr), sid as StockId);
    const derived = BigInt(card.totals.usdPaid8);
    const c = BigInt(claimed);
    // within 1%: the minted card may predate a later buy; a fabricated amount will not match
    const verified = derived > 0n && (c > derived ? c - derived : derived - c) * 100n <= derived;
    const res = { at: Date.now(), verified, derived: derived.toString() };
    cache.set(key, res);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: "rpc_unavailable" }, { status: 503 });
  }
}
