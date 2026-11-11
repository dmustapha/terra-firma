import { AddressLookup, Counters, LiveTicker } from "@/components/landing-live";
import { Guarantee } from "@/components/guarantee";
import { LandingConnect } from "@/components/landing-connect";
import { LinkButton } from "@/components/ui";
import { DEMO_ADDR } from "@/lib/ui-chain";

const STEPS = [
  { n: "1", t: "Hindsight", d: "See what every meme you bought would be worth today in NVDA, priced from the Chainlink round at that block." },
  { n: "2", t: "Convert", d: "Sell the memes you pick into a real Stock Token, straight into your Jar. Withdraw any time." },
  { n: "3", t: "Every trade builds stock", d: "Trade memes here and a slice of each trade lands in your Jar as stock. Fees burn $WIF and pay stakers." },
];

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="pt-2 sm:pt-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">The world is flat. Stand on solid ground.</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">Stand on $WIF. Sweep the rest into stock.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">See what your memes would be in NVDA today. Move the dead ones into real stock with one confirmation.</p>
        <Guarantee addr={DEMO_ADDR || undefined} className="mt-4 max-w-xl" />
        <div className="mt-8 flex max-w-xl flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <LandingConnect />
            {DEMO_ADDR && <LinkButton href={`/card/${DEMO_ADDR}`} variant="secondary">See a real card</LinkButton>}
          </div>
          <AddressLookup />
        </div>
      </section>

      <section aria-labelledby="counters-title" className="space-y-4">
        <h2 id="counters-title" className="sr-only">Protocol counters</h2>
        <Counters />
        <p className="text-sm text-muted">Every number here is read from Robinhood Chain mainnet. Includes team demo transactions (team wallets listed on /proof).</p>
        <LiveTicker />
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <span className="num flex size-9 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent" aria-hidden>{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
