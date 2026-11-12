// File: web/app/api/card-check/route.ts
// [VERIFIED] reuses buildCard (VERIFIED end to end on a real wallet). Answers: does a minted card's usdPaid8 match the
// card re-derived from chain logs for that wallet? HindsightLens proves pricing arithmetic only; this proves provenance.
// The derived card comes from the shared cache keyed (wallet, stock) only; the claimed value is compared afterwards,
// so varying usdPaid8 can neither bypass the cache nor grow it.
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { cardFailure, getCard, getCardWithin, matchesClaim } from "@/lib/card-cache";
import type { StockId } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Answer 503 + Retry-After before maxDuration so a slow cold build never surfaces as a platform 504. */
const ROUTE_DEADLINE_MS = 50_000;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const addr = u.searchParams.get("addr") ?? "";
  const claimed = u.searchParams.get("usdPaid8") ?? "";
  const sid = u.searchParams.get("stockId") ?? "0";
  if (!isAddress(addr) || !/^\d{1,40}$/.test(claimed) || !/^[0-5]$/.test(sid)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const card = await getCardWithin(getAddress(addr), Number(sid) as StockId, ROUTE_DEADLINE_MS, getCard);
    const derived = BigInt(card.totals.usdPaid8);
    return NextResponse.json({ verified: matchesClaim(derived, BigInt(claimed)), derived: derived.toString() });
  } catch (e) {
    console.error(JSON.stringify({ route: "card-check", error: String(e) }));
    const f = cardFailure(e);
    return NextResponse.json(f.body, { status: f.status, headers: f.headers });
  }
}
