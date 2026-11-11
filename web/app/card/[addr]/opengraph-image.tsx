import { ImageResponse } from "next/og";
import { getAddress, isAddress } from "viem";
import { getCard } from "@/lib/card-cache";
import { short, usd8 } from "@/lib/ui-format";

export const runtime = "nodejs";
export const alt = "Hindsight card: what this wallet's memes cost it in real stock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const C = { bg: "#12100d", surface: "#1b1814", line: "#3b342b", fg: "#f3ede4", muted: "#b6aa98", accent: "#46d27a", danger: "#f7867c" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
        <div style={{ width: 40, height: 8, borderRadius: 4, background: C.accent }} />
        Terra Firma
      </div>
      {children}
    </div>
  );
}

function Fig({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 28, borderRadius: 20, border: `2px solid ${accent ? C.accent : C.line}`, background: C.surface }}>
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
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>Hindsight card · {short(card.wallet)} · block {card.asOfBlock}</div>
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
        <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: C.muted }}>Every number from Robinhood Chain mainnet and Chainlink rounds.</div>
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
