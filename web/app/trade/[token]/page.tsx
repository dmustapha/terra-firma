import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { memeByToken } from "@/lib/registry";
import { short } from "@/lib/ui-format";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: `Trade ${memeByToken(token)?.symbol ?? short(token)}` };
}

export default async function TradeTokenPage({ params }: Props) {
  const { token } = await params;
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Meme terminal · Uniswap on Robinhood Chain</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          The casino floor. <em className="text-accent">Keep a slice.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Buy or sell through Uniswap. A slice of every trade can land in your Jar as real stock.</p>
      </header>
      <TradeTerminal initialToken={token} />
    </>
  );
}
