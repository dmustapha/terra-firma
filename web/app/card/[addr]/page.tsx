import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAddress, isAddress } from "viem";
import { CardView } from "@/components/card-view";
import { stockBySymbol, type StockId } from "@/lib/config";
import { getCard, getCardWithin } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { short } from "@/lib/ui-format";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import snapshot from "@/data/hero-snapshot.json";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the card load gives up at 50 s and renders the busy state, never a platform 504

type Props = { params: Promise<{ addr: string }>; searchParams: Promise<{ stock?: string }> };

const load = cache(async (addr: string, stock: string): Promise<{ card: Card | null; error: string | null }> => {
  const s = stockBySymbol(stock) ?? stockBySymbol("NVDA")!;
  try {
    return { card: await getCardWithin(getAddress(addr), s.id as StockId, 50_000, getCard), error: null };
  } catch {
    // the example wallet falls back to its recorded real read (block shown on the core); any other wallet shows the jammed core
    if (addr.toLowerCase() === HISTORY_ADDR.toLowerCase() && s.symbol === "NVDA") return { card: snapshot as unknown as Card, error: null };
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
      <h1 className="sr-only">The Hindsight Edition for wallet {short(getAddress(addr))}</h1>
      <div className="h-6" />
      <CardView card={card} error={error} />
    </>
  );
}
