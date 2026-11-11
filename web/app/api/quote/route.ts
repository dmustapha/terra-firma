// File: web/app/api/quote/route.ts
// [VERIFIED] contract: PRD §5 GET /api/quote. Fee/sweep math mirrors TerraRouter (bps of ETH notional).
import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { QuoteUnavailable, bestQuote, oracleMinStock, quoteStock } from "@/lib/quote";
import { ADDR, FEE_BPS, stockBySymbol, type StockId } from "@/lib/config";
import { memeByToken } from "@/lib/registry";

export const runtime = "nodejs";
const SLIP_BPS = 150n; // meme-leg default slippage 1.5%
const MAX_AMOUNT = 2n ** 128n - 1n; // V4Quoter exactAmount is uint128
const SIDES = ["buy", "sell", "convert"] as const;
type Side = (typeof SIDES)[number];

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token") ?? "";
  const side = (u.searchParams.get("side") ?? "buy") as Side;
  if (!SIDES.includes(side)) return NextResponse.json({ error: "bad_side" }, { status: 400 });
  const num = (k: string, d: string) => (/^\d{1,78}$/.test(u.searchParams.get(k) ?? d) ? BigInt(u.searchParams.get(k) ?? d) : -1n);
  const amount = num("amount", "0");
  const sweepBps = num("sweepBps", "200");
  const feeBps = num("feeBps", String(FEE_BPS));
  if (amount < 0n || amount > MAX_AMOUNT || sweepBps < 0n || sweepBps > 1000n || (feeBps !== 30n && feeBps !== 50n)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const stock = stockBySymbol(u.searchParams.get("stock") ?? "NVDA");
  if (!isAddress(token) || !stock || amount <= 0n) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (side !== "buy" && getAddress(token) === getAddress(ADDR.wif)) return NextResponse.json({ error: "wif_not_sellable" }, { status: 422 });
  const meme = memeByToken(token);
  if (meme?.taxed) return NextResponse.json({ error: "taxed_token" }, { status: 422 });
  try {
    const sid = stock.id as StockId;
    if (side === "buy") {
      const fee = (amount * feeBps) / 10_000n;
      const sweep = (amount * sweepBps) / 10_000n;
      const q = await bestQuote(getAddress(token), "buy", amount - fee - sweep);
      if (!q) return NextResponse.json({ error: "no_route" }, { status: 404 });
      const [stockOut, o] = await Promise.all([quoteStock(sid, sweep), oracleMinStock(sid, sweep)]);
      if (!o.fresh && sweep > 0n) return NextResponse.json({ error: "oracle_stale", stock: stock.symbol }, { status: 409 });
      return NextResponse.json(json({ token, symbol: meme?.symbol, route: q.route, amountIn: amount, tokenOut: q.amountOut, ethToStock: sweep, stockOut, fee, minTokenOut: (q.amountOut * (10_000n - SLIP_BPS)) / 10_000n, minStockOut: o.min, oracle: o, ...band(stockOut, o.min) }));
    }
    const q = await bestQuote(getAddress(token), "sell", amount);
    if (!q) return NextResponse.json({ error: "no_route" }, { status: 404 });
    const fee = (q.amountOut * feeBps) / 10_000n;
    const toStock = side === "convert" ? q.amountOut - fee : (q.amountOut * sweepBps) / 10_000n;
    const ethOut = side === "convert" ? 0n : q.amountOut - fee - toStock;
    const [stockOut, o] = await Promise.all([quoteStock(sid, toStock), oracleMinStock(sid, toStock)]);
    if (!o.fresh && toStock > 0n) return NextResponse.json({ error: "oracle_stale", stock: stock.symbol }, { status: 409 });
    return NextResponse.json(json({ token, symbol: meme?.symbol, route: q.route, amountIn: amount, ethFromSale: q.amountOut, ethOut, minEthOut: (ethOut * (10_000n - SLIP_BPS)) / 10_000n, ethToStock: toStock, stockOut, fee, minStockOut: o.min, oracle: o, ...band(stockOut, o.min) }));
  } catch (e) {
    console.error(JSON.stringify({ route: "quote", error: String(e) })); // detail stays server-side (M-02)
    const error = e instanceof QuoteUnavailable ? "quote_unavailable" : "quote_failed";
    return NextResponse.json({ error, retryAfter: 5 }, { status: 503, headers: { "retry-after": "5" } });
  }
}

/** The stock leg reverts on-chain when the pool returns less than the Chainlink floor: say so before the user signs. */
const band = (stockOut: bigint, minStockOut: bigint) =>
  stockOut >= minStockOut ? { bandOk: true, warning: null } : { bandOk: false, warning: "outside_oracle_band" };

/** bigint-safe JSON body. */
const json = (o: unknown) => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
