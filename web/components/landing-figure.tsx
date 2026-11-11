"use client";

import Link from "next/link";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { shares18, short, usd8 } from "@/lib/ui-format";
import { useCard } from "./hooks";
import { PlateInProof, StrataPlate } from "./strata-plate";
import { Button, Notice, Skeleton } from "./ui";

/** Fig. 1 on the landing: a real long-history wallet's card, read live from /api/hindsight like any other card. */
export function LandingPlate() {
  const card = useCard(HISTORY_ADDR, "NVDA");
  if (card.data && card.data.memes.length > 0) return <StrataPlate card={card.data} titleId="fig1-landing" />;
  if (card.error)
    return (
      <div className="space-y-3">
        <Notice tone="danger">
          <p className="font-semibold">Fig. 1 could not be printed this time.</p>
          <p className="mt-1">{(card.error as Error).message} Nothing is shown in its place.</p>
        </Notice>
        <Button variant="secondary" onClick={() => card.refetch()} disabled={card.isFetching}>{card.isFetching ? "Reading again…" : "Try again"}</Button>
      </div>
    );
  if (card.data) return <Notice>This wallet holds none of the memes we track right now, so there is no section to draw.</Notice>;
  return (
    <div>
      <p role="status" className="mb-3 text-sm text-muted">
        <span className="font-display text-base italic text-accent">Going to press:</span> reading wallet {short(HISTORY_ADDR)} from Robinhood Chain. Usually 5–15 seconds.
      </p>
      <PlateInProof />
    </div>
  );
}

/** The plate's story in words, from the same live card. */
export function LandingDeck() {
  const card = useCard(HISTORY_ADDR, "NVDA");
  const c = card.data;
  const buys = c ? c.memes.reduce((n, m) => n + m.buys.length, 0) : 0;
  return (
    <section aria-labelledby="deck-title" className="border-t border-line pt-5">
      <h2 id="deck-title" className="mb-3 font-display text-deck">
        The hindsight of wallet <span className="num">{short(HISTORY_ADDR)}</span>
      </h2>
      {c && c.memes.length > 0 ? (
        <div className="text-[0.96875rem] leading-relaxed sm:columns-2 sm:gap-x-8 sm:[column-rule:1px_solid_var(--line)]">
          <p className="mb-3 first-letter:float-left first-letter:pr-1.5 first-letter:pt-1 first-letter:font-display first-letter:text-[3.4rem] first-letter:leading-[0.8] first-letter:text-accent">
            Over <strong className="num font-semibold">{buys.toLocaleString("en-US")}</strong> buys, this wallet paid <strong className="num font-semibold">{usd8(c.totals.usdPaid8)}</strong> for memes it still holds. Read today
            {c.unquoted.length > 0 ? " (priced memes only)" : ""}, those holdings are worth <strong className="num font-semibold">{usd8(c.totals.usdToday8)}</strong>.
          </p>
          <p className="mb-3">
            Had the same dollars bought {c.stock} on the same days, it would hold <strong className="num font-semibold">{shares18(c.totals.shares18)}</strong> {c.stock} shares, worth{" "}
            <strong className="num font-semibold">{usd8(c.totals.usdCounterfactual8)}</strong>. Each buy is priced from the Chainlink round in force when it landed.
          </p>
          <p className="mb-3">
            <Link href={`/card/${HISTORY_ADDR}`} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-accent underline decoration-accent-32 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">
              Read the full card, with every receipt<span aria-hidden>&nbsp;→</span>
            </Link>
          </p>
        </div>
      ) : card.error ? (
        <p className="text-muted">This wallet&apos;s numbers could not be read right now.</p>
      ) : (
        <div aria-hidden className="space-y-2">
          <Skeleton w="100%" h="1rem" className="block" />
          <Skeleton w="92%" h="1rem" className="block" />
          <Skeleton w="70%" h="1rem" className="block" />
        </div>
      )}
    </section>
  );
}
