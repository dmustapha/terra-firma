// File: web/app/api/geo/route.ts
// [VERIFIED] Vercel sets `x-vercel-ip-country` on every request; list snapshot from docs.robinhood.com/rhj/restricted-jurisdictions.
import { NextResponse } from "next/server";
import restricted from "@/data/restricted.json";

export const runtime = "edge";

export function GET(req: Request) {
  const country = req.headers.get("x-vercel-ip-country") ?? "UNKNOWN";
  const list = (restricted as { countries: string[] }).countries;
  return NextResponse.json({ country, restricted: list.includes(country), unknown: country === "UNKNOWN", list: (restricted as { fetchedAt: string }).fetchedAt });
}
