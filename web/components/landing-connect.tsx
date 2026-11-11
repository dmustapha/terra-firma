"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "./connect-button";
import { useMounted } from "./hooks";
import { LinkButton } from "./ui";

/** Primary hero CTA: Connect wallet -> /app. Already connected -> straight to the card. */
export function LandingConnect() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const mounted = useMounted();
  if (mounted && isConnected) return <LinkButton href="/app" variant="secondary" className="min-h-10 px-4 text-sm">Open your card</LinkButton>;
  return <ConnectButton variant="secondary" className="min-h-10 px-4 text-sm" onConnected={() => router.push("/app")} />;
}
