import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAddress, isAddress } from "viem";
import { CardView } from "@/components/card-view";
import { PageHeader } from "@/components/ui";
import { stockBySymbol, type StockId } from "@/lib/config";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { short, usd8 } from "@/lib/ui-format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ addr: string }>; searchParams: Promise<{ stock?: string }> };

const load = cache(async (addr: string, stock: string): Promise<{ card: Card | null; error: string | null }> => {
  const s = stockBySymbol(stock) ?? stockBySymbol("NVDA")!;
  try {
    return { card: await getCard(getAddress(addr), s.id as StockId), error: null };
  } catch {
    return { card: null, error: "The chain is busy. Try again in a few seconds." };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { addr } = await params;
  if (!isAddress(addr)) return { title: "Card" };
  return { title: `Hindsight card ${short(addr)}`, description: "What this wallet's memes cost it in real stock, priced from Chainlink rounds." };
}

export default async function CardPage({ params, searchParams }: Props) {
  const { addr } = await params;
  const { stock = "NVDA" } = await searchParams;
  if (!isAddress(addr)) notFound();
  const { card, error } = await load(addr, stock.toUpperCase());
  return (
    <>
      <PageHeader
        title="Hindsight card"
        sub={card && card.memes.length > 0 ? `This wallet put ${usd8(card.totals.usdPaid8)} into memes. In ${card.stock} it would be ${usd8(card.totals.usdCounterfactual8)}.` : "Read-only. Every number links to its transaction or Chainlink round."}
      />
      <CardView card={card} error={error} />
    </>
  );
}
