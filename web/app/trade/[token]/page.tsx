import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { PageHeader } from "@/components/ui";
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
      <PageHeader title="Meme terminal" sub="Buy or sell through Uniswap. A slice of every trade can land in your Jar as real stock." />
      <TradeTerminal initialToken={token} />
    </>
  );
}
