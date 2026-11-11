"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ConvertPanel } from "./convert-panel";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { CardSkeleton, HindsightCard } from "./hindsight-card";
import { useCard, useMounted } from "./hooks";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, Panel } from "./ui";

/** Sends visitors without a wallet back to the landing page once wagmi finished reconnecting. */
function useRequireWallet() {
  const { status, address } = useAccount();
  const router = useRouter();
  const mounted = useMounted();
  useEffect(() => {
    if (mounted && status === "disconnected") router.replace("/");
  }, [mounted, status, router]);
  return { address, ready: mounted && status === "connected" };
}

export function AppHome() {
  const { address, ready } = useRequireWallet();
  const params = useSearchParams();
  const router = useRouter();
  const [stock, setStock] = useState(params.get("stock") ?? "NVDA");
  const card = useCard(address, stock);
  const [sheet, setSheet] = useState(false);

  const openConvert = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setSheet(true);
    else router.push(`/app/convert?stock=${stock}`);
  };

  if (!ready) return <CardSkeleton />;
  if (card.isLoading) return <CardSkeleton />;
  if (card.error || !card.data)
    return (
      <Panel>
        <p role="alert" className="text-lg font-semibold">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</p>
        <Button className="mt-4" onClick={() => card.refetch()}>Try again</Button>
      </Panel>
    );

  const c = card.data;
  const hasMemes = c.memes.some((m) => BigInt(m.holding) > 0n);
  return (
    <>
      <HindsightCard
        card={c}
        stockControl={<StockSelect value={stock} onChange={setStock} label="Compare against" name="card-stock" />}
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
      <ConvertSheet open={sheet} onClose={() => setSheet(false)}>
        <ConvertPanel card={c} initialStock={stock} onDone={() => setSheet(false)} />
      </ConvertSheet>
    </>
  );
}

function ConvertSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
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
      onClose={onClose}
      aria-labelledby="convert-title"
      className="mb-0 ml-auto mr-0 mt-0 h-dvh max-h-none w-[min(34rem,100vw)] max-w-none overflow-y-auto border-l border-line bg-surface p-6 text-fg"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="convert-title" className="text-xl font-semibold">Convert memes to real stock</h2>
        <Button variant="ghost" aria-label="Close" onClick={onClose} className="size-11 px-0">✕</Button>
      </div>
      {open && children}
    </dialog>
  );
}

export function ConvertPage() {
  const { address, ready } = useRequireWallet();
  const params = useSearchParams();
  const stock = params.get("stock") ?? "NVDA";
  const card = useCard(address, stock);
  const router = useRouter();
  if (!ready || card.isLoading) return <CardSkeleton />;
  if (card.error || !card.data) return <Notice tone="danger">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</Notice>;
  return (
    <Panel>
      <ConvertPanel card={card.data} initialStock={stock} onDone={() => router.push("/app")} />
    </Panel>
  );
}
