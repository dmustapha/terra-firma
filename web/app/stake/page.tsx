import type { Metadata } from "next";
import { StakeView } from "@/components/stake-view";

export const metadata: Metadata = { title: "Stake $WIF" };

export default function StakePage() {
  return (
    <>
      <header className="mb-10 sm:mb-14">
        <p className="eyebrow text-accent">$WIF staking · hourly epochs</p>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(2.5rem,1.6rem+3vw,4.5rem)] leading-[0.92] tracking-[-0.025em] text-balance">
          Stake $WIF. <em className="text-accent">Earn real stock.</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-muted">Every hour, half the protocol fee buys and burns $WIF; the other half buys the stock each staker picked, ready to claim into their Jar.</p>
      </header>
      <StakeView />
    </>
  );
}
