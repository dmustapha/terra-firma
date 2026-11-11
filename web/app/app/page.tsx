import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHome } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Your card" };

export default function AppPage() {
  return (
    <>
      <PageHeader title="Your Hindsight card" sub="What your meme buys cost you, priced with the Chainlink round at each block. Expand any row for receipts." />
      <Suspense fallback={<CardSkeleton />}>
        <AppHome />
      </Suspense>
    </>
  );
}
