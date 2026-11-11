// wagmi config: Robinhood Chain mainnet (4663) only, public RPC transport.
import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { robinhood } from "viem/chains";
import { PUBLIC_RPC } from "./config";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

/** Connectors touch browser APIs, so they are only built in the browser. */
function connectors() {
  if (typeof window === "undefined") return [];
  const list = [injected({ shimDisconnect: true }), coinbaseWallet({ appName: "Terra Firma" })];
  if (wcProjectId) {
    list.push(
      walletConnect({
        projectId: wcProjectId,
        showQrModal: true,
        metadata: { name: "Terra Firma", description: "Your memes, in real stock.", url: window.location.origin, icons: [] },
      }) as unknown as (typeof list)[number],
    );
  }
  return list;
}

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: connectors(),
  transports: { [robinhood.id]: http(PUBLIC_RPC, { batch: true }) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
