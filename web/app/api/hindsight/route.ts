// File: web/app/api/hindsight/route.ts
// [VERIFIED] contract: PRD §5 GET /api/hindsight. Cards come from the shared cache (lib/card-cache: 5-min TTL per
// (wallet, stock), in-flight de-duplication, bounded size, global build concurrency cap).
import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { cardFailure, getCard, getCardWithin } from "@/lib/card-cache";
import { stockBySymbol, type StockId } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Answer 503 + Retry-After before maxDuration so a slow cold build never surfaces as a platform 504. */
const ROUTE_DEADLINE_MS = 50_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") ?? "";
  const stock = stockBySymbol(url.searchParams.get("stock") ?? "NVDA");
  if (!isAddress(addr)) return NextResponse.json({ error: "bad_address" }, { status: 400 });
  if (!stock) return NextResponse.json({ error: "bad_stock" }, { status: 400 });
  const t0 = Date.now();
  try {
    const card = await getCardWithin(getAddress(addr), stock.id as StockId, ROUTE_DEADLINE_MS, getCard);
    console.log(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, memes: card.memes.length, partial: card.partial }));
    return NextResponse.json(card);
  } catch (e) {
    console.error(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, error: String(e) }));
    const f = cardFailure(e);
    return NextResponse.json(f.body, { status: f.status, headers: f.headers });
  }
}
