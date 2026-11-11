import type { Metadata } from "next";
import { Suspense } from "react";
import { ConvertPage } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Convert" };

export default function Convert() {
  return (
    <>
      <PageHeader title="Convert to real stock" sub="Sell the memes you pick into a real Stock Token, straight into your Jar." />
      <Suspense fallback={<CardSkeleton />}>
        <ConvertPage />
      </Suspense>
    </>
  );
}
