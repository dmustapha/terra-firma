"use client";

import { usd } from "@/lib/ui-format";
import { Button } from "./ui";

export function ReportShare({ addr, usdWeek }: { addr: string; usdWeek: number }) {
  const share = () => {
    const url = `${window.location.origin}/jar/report/${addr}`;
    const text = `My Jar grew ${usd(usdWeek)} in real stock this week, from meme trades. Read straight from Robinhood Chain.`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };
  return <Button variant="secondary" onClick={share}>Share to X</Button>;
}
