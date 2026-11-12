import Link from "next/link";
import { getAddress } from "viem";
import { AddressLookup } from "@/components/address-lookup";
import { BurnSeam } from "@/components/burn-seam";
import { DepthGauge } from "@/components/depth-gauge";
import { HeroCore } from "@/components/hero-core";
import { LiveProof } from "@/components/live-proof";
import { MobileCheckBar } from "@/components/mobile-check-bar";
import { SweepDemo } from "@/components/sweep-demo";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { FEE_BPS } from "@/lib/config";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import snapshot from "@/data/hero-snapshot.json";
import { shares18, usd8, usdWhole8 } from "@/lib/ui-format";

// The example core is the same cached on-chain read /api/hindsight serves (5-min TTL); re-render on that cadence.
export const revalidate = 300;

/** Live read, capped at 8s. If the chain is slow, fall back to a RECORDED real read of the same wallet (labelled with its
 *  block in the UI) so the signature is never absent; the client swaps in the live read when it lands. */
async function heroCard(): Promise<{ card: Card; recorded: boolean }> {
  const cap = new Promise<null>((r) => setTimeout(() => r(null), 8000));
  try {
    const live = await Promise.race([getCard(getAddress(HISTORY_ADDR), 0), cap]);
    if (live) return { card: live, recorded: false };
  } catch {}
  return { card: snapshot as unknown as Card, recorded: true };
}

const STRATA = [
  { name: "Sediment", head: "Your dead memes", body: "Loose, eroding, worth a sliver of what you aped. Every coin you still hold is read from Robinhood Chain." },
  { name: "The sieve", head: "One sweep", body: "Tick the dead ones and sweep them in one transaction. Still aping? Set a slice and part of every trade drops through too." },
  { name: "Bedrock", head: "Real stock, in your Jar", body: "NVDA, TSLA, SPY and more, held by an ownerless contract. Fees pool up; each epoch half buys $WIF and burns it." },
];

export default async function Home() {
  const { card, recorded } = await heroCard();
  const top = card?.memes.slice().sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8)))[0];
  const tag = (i: number) =>
    !card || !top ? ["surface", "the sweep", "bedrock"][i]
    : i === 0 ? `$${top.symbol} · ${usdWhole8(card.totals.usdPaidQuoted8)} → ${usd8(card.totals.usdToday8)}`
    : i === 1 ? `${FEE_BPS / 100}% fee · one tx`
    : `${shares18(card.totals.shares18)} ${card.stock}`;
  return (
    <div>
      <DepthGauge />

      {/* HERO — surface: the headline + your wallet; the example core drills beside it. */}
      <section aria-labelledby="hero-title" className="plate-lit -mx-2 mt-2 px-6 py-8 sm:-mx-4 sm:px-10 lg:px-12 lg:py-10">
        <HeroCore
          addr={HISTORY_ADDR}
          initial={card}
          recorded={recorded}
          headline={
            <>
              <p className="eyebrow text-muted">Field report · Robinhood Chain · read live</p>
              <h1 id="hero-title" className="mt-4 font-display text-[clamp(2.75rem,1.4rem+3.8vw,5rem)] leading-[0.9] tracking-[-0.03em]">
                Your memes died. <em className="text-accent">NVDA didn&apos;t.</em>
              </h1>
            </>
          }
          action={
            <div id="check" className="max-w-[34rem]">
              <AddressLookup id="lookup" label="Drill your own wallet" placeholder="0x… paste it here" button="Drill my wallet" primary />
              <p className="mt-3 text-sm text-muted">Read-only. Nothing to sign. Every layer is a transaction or a Chainlink round.</p>
            </div>
          }
        />
      </section>

      {/* THE STRATA — the way out as physical layers: each a deeper level, overlapping like rock. */}
      <section aria-labelledby="strata-title" className="pt-24">
        <p className="eyebrow text-accent">Borehole log</p>
        <h2 id="strata-title" className="mt-3 max-w-[18ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em]">
          From loose sediment to <em className="text-accent">solid ground.</em>
        </h2>
        <ol className="mt-12">
          {STRATA.map((s, i) => (
            <li key={s.name} className={`slab ${["slab-sed", "slab-sieve", "slab-rock"][i]} grid gap-x-10 gap-y-2 px-8 pt-8 ${i === 2 ? "pb-10" : "pb-14"} sm:grid-cols-[13rem_12rem_1fr] sm:items-baseline sm:px-10`}>
              <span className={`eyebrow num ${i === 2 ? "opacity-75" : "text-muted"}`}>{tag(i)}</span>
              <span className={`font-display text-[2.5rem] leading-none ${i === 0 ? "text-[color:var(--brick)]" : ""}`}>{s.name}</span>
              <span><b className="text-[1.125rem]">{s.head}.</b> <span className={`text-[1.0625rem] ${i === 2 ? "opacity-85" : "text-fg/80"}`}>{s.body}</span></span>
            </li>
          ))}
        </ol>
      </section>

      {/* SET-PIECE 2 — the product performing itself, on its own plate */}
      <section aria-label="The sweep" className="plate-lit -mx-2 mt-24 mb-20 px-6 py-12 sm:-mx-4 sm:px-10 lg:px-12">
        <SweepDemo initial={card} />
      </section>

      <LiveProof />

      {/* CLOSER — bedrock, full bleed, with the live burn seam at its edge */}
      <div className="bleed"><BurnSeam /></div>
      <section aria-labelledby="closer-title" className="bedrock-band bleed">
        <div className="mx-auto grid max-w-[80rem] items-end gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <p className="eyebrow">Terra firma</p>
            <h2 id="closer-title" className="mt-4 font-display text-[clamp(3rem,1.8rem+4.4vw,6rem)] leading-[0.88] tracking-[-0.03em]">Stand on bedrock.</h2>
            <p className="mt-5 max-w-[40ch] text-[1.125rem] leading-relaxed">Your bag is still sitting in the sediment. Drill it, see the gap, sweep it into something that holds.</p>
          </div>
          <div className="[&_input]:bg-[#f3eddf] [&_input]:text-[#17140f]">
            <AddressLookup id="lookup-close" label="Your wallet" placeholder="0x… paste it here" button="Drill my wallet" primary />
            <p className="mt-3 text-sm">
              Or <Link href={`/card/${HISTORY_ADDR}`} className="font-semibold underline underline-offset-4">read the example core in full</Link>.
            </p>
          </div>
        </div>
      </section>

      <MobileCheckBar />
    </div>
  );
}
