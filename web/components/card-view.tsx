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
import { Button, LinkButton, Notice } from "./ui";

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
      <div className="plate-lit grid items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="well-bore flex min-h-[22rem] flex-col items-center justify-center gap-0 px-4 py-6" aria-hidden>
          <span className="drill-bit relative z-10" />
          <span className="relative z-10 -mt-1 h-56 w-40 rounded-b-[999px] rounded-t-[999px] bg-[color:var(--rock-void)] [background-image:repeating-linear-gradient(-35deg,transparent_0_9px,color-mix(in_oklab,var(--fg)_14%,transparent)_9px_10px)] [clip-path:inset(8%_0_0_0_round_20px)]" />
        </div>
        <div>
          <p className="eyebrow text-[color:var(--brick)]">Core jammed</p>
          <p role="alert" className="mt-3 font-display text-[clamp(2.2rem,1.4rem+2.6vw,3.75rem)] leading-[0.95]">The chain is busy. <em className="text-accent">The bit is stuck, not your bag.</em></p>
          <p className="mt-3 max-w-[42ch] text-muted">{error} Nothing is shown in its place: no number here is ever guessed.</p>
          <Button className="mt-6" onClick={() => start(() => router.refresh())} disabled={pending}>{pending ? "Drilling again…" : "Drill again"}</Button>
        </div>
      </div>
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
