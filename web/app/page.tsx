import Link from "next/link";
import { getAddress } from "viem";
import { AddressLookup } from "@/components/address-lookup";
import { DepthGauge } from "@/components/depth-gauge";
import { HeroCore } from "@/components/hero-core";
import { LiveProof } from "@/components/live-proof";
import { MobileCheckBar } from "@/components/mobile-check-bar";
import { SweepDemo } from "@/components/sweep-demo";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { HISTORY_ADDR } from "@/lib/ui-chain";

// The example core is the same cached on-chain read /api/hindsight serves (5-min TTL); re-render on that cadence.
export const revalidate = 300;

async function heroCard(): Promise<Card | null> {
  const cap = new Promise<null>((r) => setTimeout(() => r(null), 25000));
  try {
    return await Promise.race([getCard(getAddress(HISTORY_ADDR), 0), cap]);
  } catch {
    return null;
  }
}

const STRATA = [
  { depth: "0 m", name: "Sediment", head: "Your dead memes", body: "Loose, eroding, worth a sliver of what you aped. Every coin you still hold is read from Robinhood Chain." },
  { depth: "1 m", name: "The sieve", head: "One sweep", body: "Tick the dead ones and sweep them in one transaction. Still aping? Set a slice and part of every trade drops through too." },
  { depth: "2 m", name: "Bedrock", head: "Real stock, in your Jar", body: "NVDA, TSLA, SPY and more, held by an ownerless contract. Fees pool up; each epoch half buys $WIF and burns it." },
];

export default async function Home() {
  const card = await heroCard();
  return (
    <div>
      <DepthGauge />

      {/* HERO — surface: the headline + your wallet; the example core drills beside it. */}
      <section aria-labelledby="hero-title" className="grid items-start gap-x-14 gap-y-12 pt-4 pb-16 lg:grid-cols-[1fr_1fr] lg:pt-6">
        <div className="lg:pt-10">
          <p className="eyebrow text-muted">Field report · Robinhood Chain · read live</p>
          <h1 id="hero-title" className="mt-5 font-display text-[clamp(3.25rem,1.4rem+5vw,6.25rem)] leading-[0.88] tracking-[-0.03em]">
            Your memes died.
            <br />
            <em className="text-accent">NVDA didn&apos;t.</em>
          </h1>
          <p className="mt-6 max-w-[34ch] text-[1.1875rem] leading-relaxed text-fg/85">
            Drill into any wallet. See what the bag is worth now, and what the same dollars would be in real stock.
          </p>
          <div id="check" className="mt-8 max-w-[34rem]">
            <AddressLookup id="lookup" label="Your wallet" placeholder="0x… paste it here" button="Drill my wallet" primary />
            <p className="mt-3 text-sm text-muted">Read-only. Nothing to sign. Every layer is a transaction or a Chainlink round.</p>
          </div>
        </div>
        <HeroCore addr={HISTORY_ADDR} initial={card} />
      </section>

      <div className="strata-seam" aria-hidden />

      {/* THE STRATA — the way out, read as a borehole log. Rules and depth marks, no boxes. */}
      <section aria-labelledby="strata-title" className="py-20">
        <p className="eyebrow text-accent">Borehole log</p>
        <h2 id="strata-title" className="mt-3 max-w-[18ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em]">
          From loose sediment to <em className="text-accent">solid ground.</em>
        </h2>
        <ol className="mt-12">
          {STRATA.map((s, i) => (
            <li key={s.name} className="grid gap-x-10 gap-y-2 border-t border-line-strong/40 py-7 sm:grid-cols-[8rem_14rem_1fr] sm:items-baseline">
              <span className="eyebrow num text-muted">{s.depth} · {String(i + 1).padStart(2, "0")}</span>
              <span className={`font-display text-[2.25rem] leading-none ${i === 2 ? "text-accent" : i === 0 ? "text-[color:var(--brick)]" : ""}`}>{s.name}</span>
              <span><b className="text-[1.125rem]">{s.head}.</b> <span className="text-[1.0625rem] text-fg/80">{s.body}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <div className="strata-seam" aria-hidden />

      {/* SET-PIECE 2 — the product performing itself */}
      <section aria-label="The sweep" className="py-20">
        <SweepDemo initial={card} />
      </section>

      <LiveProof />

      {/* CLOSER — bedrock, full bleed */}
      <section aria-labelledby="closer-title" className="bedrock-band bleed">
        <div className="mx-auto grid max-w-[80rem] items-end gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <p className="eyebrow opacity-75">Terra firma</p>
            <h2 id="closer-title" className="mt-4 font-display text-[clamp(3rem,1.8rem+4.4vw,6rem)] leading-[0.88] tracking-[-0.03em]">Stand on bedrock.</h2>
            <p className="mt-5 max-w-[40ch] text-[1.125rem] leading-relaxed opacity-85">Your bag is still sitting in the sediment. Drill it, see the gap, sweep it into something that holds.</p>
          </div>
          <div className="rounded-[14px] bg-[color:var(--bg)] p-5 text-fg">
            <AddressLookup id="lookup-close" label="Your wallet" placeholder="0x… paste it here" button="Drill my wallet" primary />
            <p className="mt-3 text-sm text-muted">
              Or <Link href={`/card/${HISTORY_ADDR}`} className="font-semibold underline underline-offset-4">read the example core in full</Link>.
            </p>
          </div>
        </div>
      </section>

      <MobileCheckBar />
    </div>
  );
}
