import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <>
      <PageHeader title="Meme terminal" sub="Paste a contract address, buy or sell. Every trade can sweep a slice into your Jar as real stock, in the same transaction." />
      <TradeTerminal />
    </>
  );
}
