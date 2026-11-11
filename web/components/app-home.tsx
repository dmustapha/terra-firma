"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { short } from "@/lib/ui-format";
import { AddressLookup } from "./address-lookup";
import { ConvertPanel } from "./convert-panel";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { ConvertLocked } from "./card-view";
import { ConnectButton } from "./connect-button";
import { CardSkeleton, HindsightCard } from "./hindsight-card";
import { useCard, useMounted } from "./hooks";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, PageHeader, Panel } from "./ui";

/** Connected wallet, or "guest" once wagmi finished reconnecting without one (guests see the demo card, read-only). */
function useWallet() {
  const { status, address } = useAccount();
  const mounted = useMounted();
  const guest = mounted && status === "disconnected";
  return { address, ready: mounted && status === "connected", guest };
}

/** Top bar over a demo card: says whose card it is and offers the real thing. */
function DemoBar({ next, text = "This is a real wallet's card. Connect yours to see your own." }: { next: string; text?: string }) {
  const router = useRouter();
  return (
    <div className="mb-6 flex flex-col items-start gap-3 border-y border-line-strong py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[1.0625rem]">{text}</p>
      <ConnectButton className="w-full sm:w-auto" onConnected={() => router.push(next)} />
    </div>
  );
}

export function AppHome() {
  const { address, ready, guest } = useWallet();
  const params = useSearchParams();
  const router = useRouter();
  const [stock, setStock] = useState(params.get("stock") ?? "NVDA");
  const who = guest ? HISTORY_ADDR : address;
  const card = useCard(who, stock);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const onBusy = useCallback((b: boolean) => setBusy(b), []);

  const openConvert = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setSheet(true);
    else router.push(`/app/convert?stock=${stock}`);
  };

  const title = guest ? `Hindsight card · ${short(HISTORY_ADDR)}` : address ? `Your Hindsight card · ${short(address)}` : "Your Hindsight card";
  const header = <PageHeader title={title} sub="What meme buys cost, priced with the Chainlink round at each block. Expand any row for receipts." />;
  const bar = guest && <DemoBar next="/app" />;
  if ((!ready && !guest) || card.isLoading) return <>{header}{bar}<CardSkeleton /></>;
  if (card.error || !card.data)
    return (
      <>
        {header}
        {bar}
        <Panel>
          <p role="alert" className="font-display text-deck">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</p>
          <Button className="mt-4" onClick={() => card.refetch()}>Try again</Button>
        </Panel>
      </>
    );

  const c = card.data;
  const stockControl = <StockSelect value={stock} onChange={setStock} label="Compare against" name="card-stock" />;
  if (guest)
    return (
      <>
        {header}
        {bar}
        <HindsightCard
          card={c}
          owner={false}
          stockControl={stockControl}
          actions={
            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:flex-wrap">
              <ConvertLocked stock={stock} />
              <ShareButton card={c} />
            </div>
          }
        />
      </>
    );
  const hasMemes = c.memes.some((m) => BigInt(m.holding) > 0n);
  return (
    <>
      {header}
      <HindsightCard
        card={c}
        stockControl={stockControl}
        actions={
          <div className="space-y-4 border-t border-line pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hasMemes ? (
                <Button onClick={openConvert}>Fix it: convert to {stock}</Button>
              ) : (
                <>
                  <LinkButton href="/stake">Stake $WIF</LinkButton>
                  <LinkButton href="/trade" variant="secondary">Open the terminal</LinkButton>
                </>
              )}
              <ShareButton card={c} />
              <MintButton card={c} />
            </div>
            <RecomputeButton card={c} />
          </div>
        }
      />
      <Panel aria-labelledby="lookup-title" className="mt-6 space-y-3">
        <h2 id="lookup-title" className="font-display text-deck">Look up any wallet</h2>
        <p className="text-sm text-muted">Every card is read live from chain. Try a wallet with years of real meme buys, or paste any address.</p>
        <LinkButton href={`/card/${HISTORY_ADDR}`} variant="secondary">See a wallet with real history</LinkButton>
        <AddressLookup id="app-lookup" />
      </Panel>
      <ConvertSheet open={sheet} locked={busy} onClose={() => setSheet(false)}>
        <ConvertPanel card={c} initialStock={stock} onDone={() => setSheet(false)} onBusy={onBusy} />
      </ConvertSheet>
    </>
  );
}

/** Side sheet. While a transaction is in flight (`locked`) it cannot be closed, so its status and hashes stay visible (S4). */
function ConvertSheet({ open, locked, onClose, children }: { open: boolean; locked: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => locked && e.preventDefault()}
      onClose={() => (locked ? ref.current?.showModal() : onClose())}
      aria-labelledby="convert-title"
      className="mb-0 ml-auto mr-0 mt-0 h-dvh max-h-none w-[min(34rem,100vw)] max-w-none overflow-y-auto border-l-2 border-line-strong bg-surface p-6 text-fg shadow-lg"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="convert-title" className="font-display text-deck">Convert memes to real stock</h2>
        <Button variant="ghost" aria-label={locked ? "Close (disabled while the transaction confirms)" : "Close"} onClick={onClose} disabled={locked} className="size-11 px-0">✕</Button>
      </div>
      {locked && <p className="mb-4 text-sm text-muted" role="status">Keep this open until the transaction confirms.</p>}
      {(open || locked) && children}
    </dialog>
  );
}

/** What convert does, shown read-only to visitors without a wallet. Nothing here is a quote. */
function ConvertExplainer({ stock }: { stock: string }) {
  const steps = [
    "Pick the memes you still hold that you want out of.",
    `Each one is sold through Uniswap and the ETH buys real ${stock} Stock Tokens, in one transaction.`,
    "Before you sign you see what goes in and the least that comes out; a worse fill reverts and nothing happens.",
    "The stock lands in your Jar, where you can withdraw it whenever you like.",
  ];
  return (
    <Panel aria-labelledby="convert-how" className="space-y-5">
      <h2 id="convert-how" className="font-display text-deck">What convert does</h2>
      <ol className="max-w-[62ch] border-t border-fg">
        {steps.map((t, i) => (
          <li key={t} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3 text-[0.96875rem] leading-relaxed">
            <span className="num font-display text-lg leading-tight text-muted">{i + 1}.</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ConvertLocked stock={stock} />
        <LinkButton href={`/card/${HISTORY_ADDR}`} variant="secondary">See a real wallet&apos;s card</LinkButton>
      </div>
    </Panel>
  );
}

export function ConvertPage() {
  const { address, ready, guest } = useWallet();
  const params = useSearchParams();
  const stock = params.get("stock") ?? "NVDA";
  const card = useCard(address, stock);
  const router = useRouter();
  if (guest)
    return (
      <>
        <DemoBar next={`/app/convert?stock=${stock}`} text="Convert works on your own wallet. Connect it to pick your memes." />
        <ConvertExplainer stock={stock} />
      </>
    );
  if (!ready || card.isLoading) return <CardSkeleton />;
  if (card.error || !card.data) return <Notice tone="danger">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</Notice>;
  return (
    <Panel>
      <ConvertPanel card={card.data} initialStock={stock} onDone={() => router.push("/app")} />
    </Panel>
  );
}
