import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHome } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";

export const metadata: Metadata = { title: "Your card" };

export default function AppPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <AppHome />
    </Suspense>
  );
}
