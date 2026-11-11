"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WagmiProvider, useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/config";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } } }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <ChainGuard />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/** Once per connection: ask the wallet to switch to (or add) Robinhood Chain 4663. */
function ChainGuard() {
  const { isConnected, chainId, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!isConnected || !address || chainId === CHAIN_ID || asked.current === address) return;
    asked.current = address;
    switchChain({ chainId: CHAIN_ID });
  }, [isConnected, chainId, address, switchChain]);
  return null;
}
