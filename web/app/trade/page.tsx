import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Meme terminal · Uniswap on Robinhood Chain</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          The casino floor. <em className="text-accent">Keep a slice.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Paste a contract address, buy or sell. Every trade can sweep a slice into your Jar as real stock, in the same transaction.</p>
      </header>
      <TradeTerminal />
    </>
  );
}
