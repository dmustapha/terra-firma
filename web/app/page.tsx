import Link from "next/link";
import { getAddress } from "viem";
import { AddressLookup } from "@/components/address-lookup";
import { LiveFrontPage } from "@/components/front-page";
import { LiveProof } from "@/components/live-proof";
import { MobileCheckBar } from "@/components/mobile-check-bar";
import { LinkButton } from "@/components/ui";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { HISTORY_ADDR } from "@/lib/ui-chain";

// The example edition is the same cached on-chain read /api/hindsight serves (5-min TTL); re-render on that cadence.
export const revalidate = 300;

async function heroCard(): Promise<Card | null> {
  const cap = new Promise<null>((r) => setTimeout(() => r(null), 25000));
  try {
    return await Promise.race([getCard(getAddress(HISTORY_ADDR), 0), cap]);
  } catch {
    return null;
  }
}

/** The way out, as three newspaper columns divided by rules. No boxes. */
const COLUMNS = [
  { n: "I", head: "Sweep the dead ones", body: "Tick the memes that died. One transaction swaps them into real stock tokens (each coin needs a one-time approval first).", href: "/jar", cta: "Sweep into your Jar" },
  { n: "II", head: "It lands as stock", body: "NVDA, TSLA, SPY and more, held in your Jar by an ownerless contract. Yours to withdraw any time. Still aping? Set a slice and part of every trade lands there too.", href: "/trade", cta: "Trade with a slice" },
  { n: "III", head: "Half the fees burn $WIF", body: "Every trade pays 0.5% (0.3% if you stake 10k $WIF) into a pool. Each epoch, half of it buys $WIF and burns it; half buys stock for stakers.", href: "/stake", cta: "Stake $WIF" },
];

export default async function Home() {
  const card = await heroCard();
  return (
    <div>
      {/* HERO: your wallet is the action; the example edition is the only object on the page. */}
      <section aria-labelledby="hero-title" className="grid items-center gap-x-16 gap-y-12 pt-6 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:pt-12">
        <div>
          <h1 id="hero-title" className="font-display text-[clamp(3rem,1.2rem+4.4vw,5.5rem)] leading-[0.9] tracking-[-0.03em]">
            Your memes died.
            <br />
            <em className="text-accent">NVDA didn&apos;t.</em>
          </h1>
          <p className="mt-6 max-w-[30ch] font-display text-[1.625rem] leading-snug">Paste your wallet. We print the front page of what it cost you.</p>
          <div id="check" className="mt-8 max-w-[34rem]">
            <AddressLookup id="lookup" label="Your wallet" placeholder="0x… paste it here" button="Print my edition" primary />
            <p className="mt-3 text-sm text-muted">Read-only. Nothing to sign. Priced from Robinhood Chain and Chainlink.</p>
          </div>
        </div>
        <div className="lg:-mr-4">
          <LiveFrontPage addr={HISTORY_ADDR} initial={card} />
          <p className="mt-4 text-center text-sm text-muted">
            Today&apos;s example: a real wallet.{" "}
            <Link href={`/card/${HISTORY_ADDR}`} className="font-semibold text-fg underline underline-offset-4 hover:text-accent">Read the full edition →</Link>
          </p>
        </div>
      </section>

      {/* THE WAY OUT: columns and rules, set straight on the paper. */}
      <section aria-labelledby="out-title" className="rule-head pb-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 id="out-title" className="font-display text-[clamp(2.25rem,1.5rem+2.4vw,3.75rem)] leading-none tracking-[-0.02em]">The way out of a dead bag</h2>
          <LinkButton href="/jar" className="min-h-12 px-6">Sweep my dead memes</LinkButton>
        </div>
        <ol className="mt-10 grid gap-y-10 lg:grid-cols-3">
          {COLUMNS.map((c, i) => (
            <li key={c.n} className={i > 0 ? "lg:border-l lg:border-line-strong/30 lg:pl-10" : "lg:pr-10"}>
              <p className="font-display text-[4.5rem] leading-[0.8] text-accent">{c.n}</p>
              <h3 className="mt-4 font-display text-[2rem] leading-tight">{c.head}</h3>
              <p className="mt-3 max-w-[38ch] text-[1.0625rem] leading-relaxed text-fg/85">{c.body}</p>
              <Link href={c.href} className="mt-4 inline-flex min-h-11 items-center font-semibold underline decoration-accent underline-offset-4 hover:text-accent">{c.cta} →</Link>
            </li>
          ))}
        </ol>
      </section>

      <LiveProof />

      <MobileCheckBar />
    </div>
  );
}
