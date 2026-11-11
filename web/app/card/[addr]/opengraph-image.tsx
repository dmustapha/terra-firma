import { ImageResponse } from "next/og";
import { getAddress, isAddress } from "viem";
import { getCard } from "@/lib/card-cache";
import { short, usd8 } from "@/lib/ui-format";

export const runtime = "nodejs";
export const alt = "Hindsight card: what this wallet's memes cost it in real stock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

// Almanac palette: paper, ink, bedrock moss.
const C = { bg: "#f1ebdd", surface: "#f7f3e9", line: "#1a1712", rule: "#bcb4a2", fg: "#1a1712", muted: "#554f47", accent: "#3f6b4a", danger: "#9b3b1f" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 40, paddingBottom: 12, borderBottom: `3px solid ${C.line}` }}>
        <span style={{ fontWeight: 700 }}>Terra</span>
        <span style={{ fontStyle: "italic", color: C.accent }}>Firma</span>
        <span style={{ marginLeft: "auto", fontSize: 22, color: C.muted, fontStyle: "italic" }}>Robinhood Chain edition · read live</span>
      </div>
      {children}
    </div>
  );
}

function Fig({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 24, borderRadius: 4, borderTop: `4px solid ${accent ? C.accent : C.line}`, background: C.surface, boxShadow: `6px 6px 0 rgba(26,23,18,0.16)` }}>
      <div style={{ fontSize: 28, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 64, fontWeight: 800, color: accent ? C.accent : C.fg, marginTop: 8 }}>{value}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!isAddress(addr)) {
    return new ImageResponse(<Shell><div style={{ display: "flex", marginTop: 120, fontSize: 56 }}>Your memes, in real stock.</div></Shell>, size);
  }
  try {
    const card = await getCard(getAddress(addr), 0);
    const empty = card.memes.length === 0;
    return new ImageResponse(
      <Shell>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>Hindsight card · {short(card.wallet)}</div>
        {empty ? (
          <div style={{ display: "flex", marginTop: 120, fontSize: 60, fontWeight: 700 }}>None of the tracked memes here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", marginTop: 40, fontSize: 44, fontWeight: 700 }}>What these memes would be in {card.stock}</div>
            <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
              <Fig label="Paid" value={usd8(card.totals.usdPaid8)} />
              <Fig label="Today" value={usd8(card.totals.usdToday8)} />
              <Fig label={`In ${card.stock}`} value={usd8(card.totals.usdCounterfactual8)} accent />
            </div>
          </div>
        )}
        <div style={{ display: "flex", marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.rule}`, fontSize: 24, color: C.muted }}>
          <span style={{ fontStyle: "italic", color: C.fg, marginRight: 12 }}>Measured, not estimated.</span>
          <span>Every number from Robinhood Chain and Chainlink rounds, as of block {card.asOfBlock.toLocaleString("en-US")}.</span>
        </div>
      </Shell>,
      size,
    );
  } catch {
    return new ImageResponse(
      <Shell>
        <div style={{ display: "flex", marginTop: 120, fontSize: 56, fontWeight: 700 }}>Your memes, in real stock.</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: C.muted }}>Open the card to see this wallet&apos;s numbers.</div>
      </Shell>,
      size,
    );
  }
}
