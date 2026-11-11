// Route-level input validation: every case here is rejected before any RPC is reached (no mocks needed).
import { describe, expect, it } from "vitest";
import { GET as cardCheck } from "@/app/api/card-check/route";
import { GET as geo } from "@/app/api/geo/route";
import { GET as hindsight } from "@/app/api/hindsight/route";
import { GET as quote } from "@/app/api/quote/route";
import { ADDR } from "./config";

const MEME = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const call = async (h: (r: Request) => Promise<Response> | Response, path: string, headers?: Record<string, string>) => {
  const res = await h(new Request(`http://localhost${path}`, { headers }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, res };
};

describe("/api/hindsight validation", () => {
  it("400 bad_address for a missing, malformed or bad-checksum address", async () => {
    for (const a of ["", "0x123", "not-an-address", "0x3fdbeb0fc14cca8fdd238dd21725f0b8585ab09E"]) {
      expect(await call(hindsight, `/api/hindsight?addr=${a}`)).toMatchObject({ status: 400, body: { error: "bad_address" } });
    }
  });

  it("400 bad_stock for a stock outside the curated six", async () => {
    expect(await call(hindsight, `/api/hindsight?addr=${WALLET}&stock=AAPL`)).toMatchObject({ status: 400, body: { error: "bad_stock" } });
  });
});

describe("/api/quote validation", () => {
  const q = (qs: string) => call(quote, `/api/quote?${qs}`);
  it("400 bad_side for an unknown side (used to fall through to a sell quote)", async () => {
    expect(await q(`token=${MEME}&amount=1000&side=xyz`)).toMatchObject({ status: 400, body: { error: "bad_side" } });
  });

  it("400 for amounts that are zero, non-numeric or above uint128 (2^128 + 1)", async () => {
    for (const amount of ["0", "-1", "1e18", "340282366920938463463374607431768211457"]) {
      expect((await q(`token=${MEME}&amount=${amount}`)).status).toBe(400);
    }
  });

  it("400 for a bad token, stock, sweep or fee tier", async () => {
    expect((await q(`token=0xnope&amount=1`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&stock=AAPL`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&sweepBps=1001`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&feeBps=10`)).status).toBe(400);
  });

  it("422 wif_not_sellable for a $WIF sell or convert (INVARIANT 1)", async () => {
    for (const side of ["sell", "convert"]) {
      expect(await q(`token=${ADDR.wif}&amount=1000&side=${side}`)).toMatchObject({ status: 422, body: { error: "wif_not_sellable" } });
    }
  });
});

describe("/api/card-check validation", () => {
  const c = (qs: string) => call(cardCheck, `/api/card-check?${qs}`);
  it("400 for a fractional or out-of-range stockId (1.5 used to pass and 503)", async () => {
    for (const sid of ["1.5", "6", "-1", "x"]) expect((await c(`addr=${WALLET}&usdPaid8=100&stockId=${sid}`)).status).toBe(400);
  });

  it("400 for a bad address or a non-digit / oversize claim", async () => {
    expect((await c(`addr=0x1&usdPaid8=100`)).status).toBe(400);
    expect((await c(`addr=${WALLET}&usdPaid8=1.5`)).status).toBe(400);
    expect((await c(`addr=${WALLET}&usdPaid8=${"9".repeat(41)}`)).status).toBe(400);
  });
});

describe("/api/geo", () => {
  it("reads the Vercel country header, flags restricted, and is never cached by intermediaries", async () => {
    const r = await call(geo, "/api/geo", { "x-vercel-ip-country": "US" });
    expect(r.body).toMatchObject({ country: "US", unknown: false });
    expect(typeof r.body.restricted).toBe("boolean");
    expect(r.res.headers.get("cache-control")).toBe("private, no-store");
    expect((await call(geo, "/api/geo")).body).toMatchObject({ country: "UNKNOWN", unknown: true });
  });
});
