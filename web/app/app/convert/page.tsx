import type { Metadata } from "next";
import { Suspense } from "react";
import { ConvertPage } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";

export const metadata: Metadata = { title: "Convert" };

export default function Convert() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Convert · memes into stock</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Sieve the sediment. <em className="text-accent">Keep the stock.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Sell the memes you pick into a real Stock Token, straight into your Jar.</p>
      </header>
      {/* The one lit plate; the inner ruled sections drop their top rule because the plate edge already frames them. */}
      <section aria-label="Convert" className="plate-lit -mx-2 px-5 py-7 sm:-mx-4 sm:px-10 sm:py-10 [&>section]:border-t-0 [&>section]:pt-0">
        <Suspense fallback={<CardSkeleton />}>
          <ConvertPage />
        </Suspense>
      </section>
    </>
  );
}
