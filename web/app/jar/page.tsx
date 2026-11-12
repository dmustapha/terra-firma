import type { Metadata } from "next";
import { JarView } from "@/components/jar-view";

export const metadata: Metadata = { title: "Jar" };

export default function JarPage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">Your Jar · ownerless contract</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Your bedrock. <em className="text-accent">Only you can dig it out.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Real Stock Tokens held for you by an ownerless contract. Withdraw any time; nobody else can.</p>
      </header>
      <JarView />
    </>
  );
}
