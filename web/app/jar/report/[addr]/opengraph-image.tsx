import { ImageResponse } from "next/og";
import { isAddress } from "viem";
import { orDash, short, signedSig4, signedUsd, usd } from "@/lib/ui-format";
import { jarReport } from "@/lib/ui-report";

export const runtime = "nodejs";
export const alt = "Weekly Jar report: real stock saved from meme trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

// Almanac palette: paper, ink, bedrock moss.
const C = { bg: "#f1ebdd", surface: "#f7f3e9", line: "#1a1712", rule: "#bcb4a2", fg: "#1a1712", muted: "#554f47", accent: "#3f6b4a" };

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
          {signedUsd(report.usdWeek)}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: C.fg }}>added this week · Jar now {orDash(report.usdNow, usd)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          {report.rows.slice(0, 4).map((r) => (
            <div key={r.symbol} style={{ display: "flex", flexDirection: "column", padding: 20, borderRadius: 4, borderTop: `4px solid ${C.line}`, background: C.surface, minWidth: 220 }}>
              <div style={{ fontSize: 26, color: C.muted }}>{r.symbol}</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{signedSig4(r.sharesWeek)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 40, paddingBottom: 12, borderBottom: `3px solid ${C.line}` }}>
        <span style={{ fontWeight: 700 }}>Terra</span>
        <span style={{ fontStyle: "italic", color: C.accent }}>Firma</span>
        <span style={{ marginLeft: "auto", fontSize: 22, color: C.muted, fontStyle: "italic" }}>Robinhood Chain edition · read live</span>
      </div>
      {body}
      <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: C.muted }}>From the Jar&apos;s history and Chainlink prices on Robinhood Chain.</div>
    </div>,
    size,
  );
}
