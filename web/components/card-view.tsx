"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAccount } from "wagmi";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { AddressLookup } from "./address-lookup";
import type { Card } from "@/lib/hindsight";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { ConnectButton } from "./connect-button";
import { HindsightCard } from "./hindsight-card";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, Panel } from "./ui";

/** The main action, visible but off until a wallet is connected (read-only and demo cards). */
export function ConvertLocked({ stock }: { stock: string }) {
  return (
    <Button disabled>
      Convert to {stock} <span className="font-normal">· connect to use</span>
    </Button>
  );
}

/** Read-only card for any wallet (server-fetched), ending with "Connect to fix yours". */
export function CardView({ card, error }: { card: Card | null; error: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const { address, isConnected } = useAccount();

  if (!card)
    return (
      <Panel>
        <p role="alert" className="font-display text-deck">{error}</p>
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
              {own ? <LinkButton href={`/app/convert?stock=${card.stock}`}>Fix it: convert to {card.stock}</LinkButton> : !isConnected && <ConvertLocked stock={card.stock} />}
              <ShareButton card={card} />
              {own && <MintButton card={card} />}
            </div>
            <RecomputeButton card={card} />
          </div>
        }
      />
      {pending && <Notice>Repricing against the selected stock…</Notice>}
      <section className="rule-head grid gap-8 pt-6 lg:grid-cols-2">
        <div>
          <p className="font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[0.95]">{own ? "This is your core." : <>Drill your own. <em className="text-accent">Then sweep it.</em></>}</p>
          <div className="mt-5">{isConnected ? <LinkButton href="/app">Open your core</LinkButton> : <ConnectButton label="Connect to drill yours" onConnected={() => router.push("/app")} />}</div>
        </div>
        <div aria-labelledby="card-lookup-title">
          <h2 id="card-lookup-title" className="eyebrow mb-3 text-muted">Or drill another wallet</h2>
          <AddressLookup id="card-lookup" placeholder="0x… any wallet" button="Drill it" />
          {card.wallet.toLowerCase() !== HISTORY_ADDR.toLowerCase() && <LinkButton href={`/card/${HISTORY_ADDR}`} variant="secondary" className="mt-3">See a wallet with real history</LinkButton>}
        </div>
      </section>
    </div>
  );
}
