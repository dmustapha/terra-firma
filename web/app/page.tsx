import { getAddress } from "viem";
import { AddressLookup } from "@/components/address-lookup";
import { HindsightPlate, HindsightReceipts } from "@/components/hindsight-plate";
import { LiveProof } from "@/components/live-proof";
import { LoopRail } from "@/components/loop-rail";
import { MobileCheckBar } from "@/components/mobile-check-bar";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { HISTORY_ADDR } from "@/lib/ui-chain";

// The hero card is the same cached on-chain read /api/hindsight serves (5-min TTL); re-render on that cadence.
export const revalidate = 300;

/** Server read of the hero wallet, capped. With ISR visitors get the last resolved plate; the client re-reads if null. */
async function heroCard(): Promise<Card | null> {
  const cap = new Promise<null>((r) => setTimeout(() => r(null), 25000));
  try {
    return await Promise.race([getCard(getAddress(HISTORY_ADDR), 0), cap]);
  } catch {
    return null;
  }
}

const LOOP = [
  { n: "01", head: "Dead memes in" },
  { n: "02", head: "Real stock out" },
  { n: "03", head: "$WIF burns" },
];

/** The loop in one line: no container, no tabs. Each step keeps its leading arrow (never an orphaned arrow). */
function LoopLine() {
  return (
    <p aria-label="How Terra Firma works" className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-[clamp(1.2rem,1rem+1vw,2rem)] leading-tight sm:gap-x-3">
      {LOOP.map((s, i) => (
        <span key={s.n} style={{ "--i": i } as React.CSSProperties} className="rise inline-flex items-baseline gap-2 whitespace-nowrap sm:gap-3">
          {i > 0 && <span aria-hidden className="text-muted">→</span>}
          <a href={`#step-${s.n}`} className={`underline decoration-transparent decoration-1 underline-offset-[6px] transition-colors hover:decoration-current ${i === 2 ? "text-accent" : ""}`}>{s.head}</a>
        </span>
      ))}
    </p>
  );
}

export default async function Home() {
  const card = await heroCard();
  return (
    <div className="-mt-8 sm:-mt-10">
      {/* HERO: a recessed press bed; the plate pops off it. */}
      <section aria-labelledby="hero-title" className="band bleed">
        <div className="mx-auto grid max-w-[80rem] items-center gap-x-16 gap-y-10 px-4 pt-10 pb-16 sm:pt-14 lg:gap-y-8 sm:px-6 lg:grid-cols-[1fr_1.12fr] lg:px-8 lg:pt-20 lg:pb-20">
          <div className="lg:self-end">
            <p className="mb-6 flex items-center gap-2 text-sm font-semibold text-muted max-sm:hidden">
              <span className="live-dot" aria-hidden /> Live on Robinhood Chain
            </p>
            <h1 id="hero-title" className="font-display text-[clamp(3rem,1.6rem+5vw,6rem)] leading-[0.92] tracking-[-0.025em] text-balance">
              Your memes died. <em className="text-accent">NVDA didn&apos;t.</em>
            </h1>
            <p className="mt-6 max-w-[44ch] text-[1.1875rem] leading-relaxed text-fg/85 max-sm:hidden">
              See what your bag would be worth in real stock. Then sweep the dead coins into it in one transaction. Half of every 0.5% fee buys $WIF and burns it.
            </p>
            <div className="mt-5 sm:mt-8"><LoopLine /></div>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1"><HindsightPlate initial={card} /></div>
          <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
            <div id="check" className="max-w-[34rem]">
              <AddressLookup id="lookup" label="Paste your wallet" placeholder="0x… your wallet" button="Check my bag" primary />
              <p className="mt-3 text-sm text-muted">Read-only. Nothing to sign to see your card.</p>
            </div>
          </div>
        </div>
      </section>

      <LiveProof />

      <HindsightReceipts initial={card} />

      {/* THE LOOP, as one connected flow that climbs out of the ground: well → sheet → plate. */}
      <section aria-labelledby="how-title" className="py-24 text-center">
        <p className="ui-label mb-4 text-accent">What you do with a dead bag</p>
        <h2 id="how-title" className="mx-auto max-w-[16ch] font-display text-[clamp(2.4rem,1.6rem+2.6vw,4rem)] leading-[1] tracking-[-0.02em]">
          Sweep it into stock.<br /><span className="text-muted">Burn $WIF on the way.</span>
        </h2>
        <LoopRail />
      </section>

      <MobileCheckBar />

      {/* CLOSE: the one inverted plate. */}
      <section aria-labelledby="close-title" className="mb-16 rounded-[20px] border-[1.5px] border-fg bg-[color:var(--slab)] px-8 py-14 text-[color:var(--slab-fg)] shadow-[8px_8px_0_var(--plate-offset)] sm:px-14">
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="ui-label mb-4 opacity-70">Every number is read from the chain</p>
            <h2 id="close-title" className="font-display text-[clamp(2.2rem,1.4rem+2.4vw,3.75rem)] leading-[1.02]">
              Your bag is still sitting there. <em className="opacity-75">Check what it cost you.</em>
            </h2>
          </div>
          <div className="space-y-3 text-[1rem] leading-relaxed opacity-85">
            <p>Buys from Robinhood Chain logs. Prices from the Chainlink round each buy landed in. Terra Firma never sells or prices $WIF.</p>
            <div className="rounded-[12px] bg-[color:var(--plate)] p-4 text-fg"><AddressLookup id="lookup-close" label="Paste your wallet" placeholder="0x… your wallet" button="Check my bag" primary /></div>
          </div>
        </div>
      </section>
    </div>
  );
}
