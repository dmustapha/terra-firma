import type { Metadata } from "next";
import { StakeView } from "@/components/stake-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Stake $WIF" };

export default function StakePage() {
  return (
    <>
      <PageHeader title="Stake $WIF, earn real stock" sub="Every hour, half the protocol fee buys and burns $WIF; the other half buys the stock each staker picked and streams it to their Jar." />
      <StakeView />
    </>
  );
}
