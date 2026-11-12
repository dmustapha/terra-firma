import type { Metadata } from "next";
import { ProofView } from "@/components/proof-view";

export const metadata: Metadata = { title: "Proof" };

export default function ProofPage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Proof · read live from Robinhood Chain</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Don&apos;t trust the core. <em className="text-accent">Drill it yourself.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Every number here is read from Robinhood Chain. Click anything to verify. Terra Firma never prices or sells $WIF: it only buys, burns and stakes it.</p>
      </header>
      <ProofView />
    </>
  );
}
