"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="py-16">
      <h1 className="text-3xl font-bold">The chain is busy.</h1>
      <p className="mt-3 text-muted">Something failed while reading Robinhood Chain. No partial numbers are shown.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
