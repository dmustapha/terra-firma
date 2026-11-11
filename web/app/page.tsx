import Link from "next/link";
import { AddressLookup } from "@/components/address-lookup";
import { Guarantee } from "@/components/guarantee";
import { LandingConnect } from "@/components/landing-connect";
import { LandingDeck, LandingPlate } from "@/components/landing-figure";
import { Dispatches, EditionFigures } from "@/components/landing-live";
import { HISTORY_ADDR } from "@/lib/ui-chain";

const more =
  "inline-flex min-h-11 items-center rounded-sm text-[0.9375rem] font-semibold text-accent underline decoration-accent-32 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";

/** One department of the broadsheet: kicker, head, prose. Columns are separated by hairline rules, never boxed. */
function Dept({ kicker, title, href, cta, className, children }: { kicker: string; title: string; href: string; cta: string; className: string; children: React.ReactNode }) {
  return (
    <article className={`border-line max-lg:border-t max-lg:pt-5 lg:border-l lg:pl-8 lg:first:border-l-0 lg:first:pl-0 ${className}`}>
      <p className="mb-1 font-display text-[1.375rem] italic text-accent">{kicker}</p>
      <h3 className="mb-3 font-display text-deck">{title}</h3>
      {children}
      <Link href={href} className={more}>{cta}</Link>
    </article>
  );
}

export default function Home() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <article className="lg:col-span-7 lg:row-start-1">
          <h1 className="max-w-[13ch] font-display text-headline text-balance">
            Stand on $WIF. Sweep the rest <em className="text-accent">into stock.</em>
          </h1>
          <Guarantee lead addr={HISTORY_ADDR} className="mt-5 max-w-[46ch]" />
          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
            <LandingConnect />
            <div className="min-w-0 sm:max-w-[30rem] sm:flex-1">
              <AddressLookup id="lookup" label="Look up any wallet" />
            </div>
          </div>
        </article>
        <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-line lg:pl-10">
          <LandingPlate />
        </div>
        <div className="lg:col-span-7 lg:row-start-2">
          <LandingDeck />
        </div>
      </div>

      <EditionFigures />

      <section aria-label="Departments" className="grid gap-x-8 gap-y-6 lg:grid-cols-12">
        <Dept kicker="The Jar" title="Dead memes, settled into bedrock" href="/jar" cta="Open your Jar" className="lg:col-span-5">
          <div className="text-[0.9375rem] leading-relaxed sm:columns-2 sm:gap-x-8 sm:[column-rule:1px_solid_var(--line)]">
            <p className="mb-3">Pick the memes that stopped moving. Terra Firma converts them into real Stock Tokens and keeps them in your Jar, where you can see where each one came from and withdraw it whenever you like.</p>
            <p className="mb-3">Before you sign, you see what goes in and the least that comes out. Nothing is converted without your signature.</p>
          </div>
        </Dept>
        <Dept kicker="The Sweep" title="A slice of every trade" href="/trade" cta="Trade with a sweep" className="lg:col-span-3">
          <p className="mb-3 text-[0.9375rem] leading-relaxed">Trade memes as usual. You set the slice, and that part of every trade is swept into stock in the same transaction, instead of into the next coin.</p>
        </Dept>
        <Dept kicker="The Pool" title="Where the fees go" href="/stake" cta="Stake $WIF" className="lg:col-span-4">
          <p className="my-1 mb-3 border-y border-fg py-2 font-display text-[1.6rem] italic leading-tight">The fee pool buys $WIF and burns it, and streams stock to $WIF stakers.</p>
          <p className="mb-3 text-[0.9375rem] leading-relaxed">Every burn and every stream is a transaction you can open on the Proof page.</p>
        </Dept>
      </section>

      <Dispatches className="border-t-2 border-line-strong pt-4" />
    </div>
  );
}
