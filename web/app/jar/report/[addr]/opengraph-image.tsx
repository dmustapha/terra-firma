import { ImageResponse } from "next/og";
import { isAddress } from "viem";
import { short, sig4, usd } from "@/lib/ui-format";
import { jarReport } from "@/lib/ui-report";

export const runtime = "nodejs";
export const alt = "Weekly Jar report: real stock saved from meme trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const C = { bg: "#12100d", surface: "#1b1814", line: "#3b342b", fg: "#f3ede4", muted: "#b6aa98", accent: "#46d27a" };

export default async function Image({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const report = isAddress(addr) ? await jarReport(addr).catch(() => null) : null;
  const body =
    !report || !report.deployed ? (
      <div style={{ display: "flex", marginTop: 120, fontSize: 56, fontWeight: 700 }}>Your memes, in real stock.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>Weekly Jar report · {short(report.user)}</div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 96, fontWeight: 800, color: C.accent }}>
          {report.usdWeek >= 0 ? "+" : ""}
          {usd(report.usdWeek)}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: C.fg }}>added this week · Jar now {usd(report.usdNow)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          {report.rows.slice(0, 4).map((r) => (
            <div key={r.symbol} style={{ display: "flex", flexDirection: "column", padding: 20, borderRadius: 16, border: `2px solid ${C.line}`, background: C.surface, minWidth: 220 }}>
              <div style={{ fontSize: 26, color: C.muted }}>{r.symbol}</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>+{sig4(r.sharesWeek)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
        <div style={{ width: 40, height: 8, borderRadius: 4, background: C.accent }} />
        Terra Firma
      </div>
      {body}
      <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: C.muted }}>From Jar events and Chainlink prices on Robinhood Chain mainnet.</div>
    </div>,
    size,
  );
}
