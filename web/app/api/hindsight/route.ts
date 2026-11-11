// File: web/app/api/hindsight/route.ts
// [VERIFIED] contract: PRD §5 GET /api/hindsight. 5-minute in-memory cache per (wallet, stock).
import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { buildCard, type Card } from "@/lib/hindsight";
import { stockBySymbol, type StockId } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;
const cache = new Map<string, { at: number; card: Card }>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") ?? "";
  const stock = stockBySymbol(url.searchParams.get("stock") ?? "NVDA");
  if (!isAddress(addr)) return NextResponse.json({ error: "bad_address" }, { status: 400 });
  if (!stock) return NextResponse.json({ error: "bad_stock" }, { status: 400 });
  const key = `${addr.toLowerCase()}:${stock.id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 300_000) return NextResponse.json(hit.card);
  const t0 = Date.now();
  try {
    const card = await buildCard(getAddress(addr), stock.id as StockId);
    cache.set(key, { at: Date.now(), card });
    console.log(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, memes: card.memes.length }));
    return NextResponse.json(card);
  } catch (e) {
    console.error(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, error: String(e) }));
    return NextResponse.json({ error: "rpc_unavailable", retryAfter: 5 }, { status: 503 });
  }
}
