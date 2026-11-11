"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAccount } from "wagmi";
import type { Card } from "@/lib/hindsight";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { ConnectButton } from "./connect-button";
import { HindsightCard } from "./hindsight-card";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, Panel } from "./ui";

/** Read-only card for any wallet (server-fetched), ending with "Connect to fix yours". */
export function CardView({ card, error }: { card: Card | null; error: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const { address, isConnected } = useAccount();

  if (!card)
    return (
      <Panel>
        <p role="alert" className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => start(() => router.refresh())} disabled={pending}>{pending ? "Retrying…" : "Try again"}</Button>
      </Panel>
    );

  const own = isConnected && address?.toLowerCase() === card.wallet.toLowerCase();
  return (
    <div className="space-y-6" aria-busy={pending}>
      <HindsightCard
        card={card}
        owner={own}
        stockControl={<StockSelect value={card.stock} onChange={(s) => start(() => router.replace(`${path}?stock=${s}`, { scroll: false }))} label="Compare against" name="card-stock" />}
        actions={
          <div className="space-y-4 border-t border-line pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ShareButton card={card} />
              {own && <MintButton card={card} />}
            </div>
            <RecomputeButton card={card} />
          </div>
        }
      />
      {pending && <Notice>Repricing against the selected stock…</Notice>}
      <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold">{own ? "This is your wallet." : "Connect to fix yours."}</p>
        {isConnected ? <LinkButton href="/app">Open your card</LinkButton> : <ConnectButton label="Connect to fix yours" onConnected={() => router.push("/app")} />}
      </Panel>
    </div>
  );
}
