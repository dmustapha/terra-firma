"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/config";
import { short } from "@/lib/ui-format";
import { useMounted } from "./hooks";
import { Button, cx } from "./ui";

/** Connect / account button. Connecting always targets chain 4663 (the wallet is asked to add it if missing). */
export function ConnectButton({ className, label = "Connect wallet", onConnected }: { className?: string; label?: string; onConnected?: () => void }) {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (!mounted) return <Button className={cx("w-40", className)} disabled>{label}</Button>;
  if (isConnected && address) {
    if (chainId !== CHAIN_ID)
      return (
        <Button variant="secondary" className={className} disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
          {switching ? "Switching…" : "Switch to Robinhood Chain"}
        </Button>
      );
    return (
      <Button variant="secondary" className={cx("font-mono", className)} onClick={() => disconnect()} aria-label={`Connected as ${address}. Disconnect`} title="Disconnect">
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        {short(address)}
      </Button>
    );
  }
  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>{label}</Button>
      <WalletDialog open={open} onClose={() => setOpen(false)} onConnected={onConnected} />
    </>
  );
}

function WalletDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { connectors, connect, isPending, error, variables } = useConnect();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // EIP-6963 discovery can surface the same wallet twice (generic "Injected" + named). Keep named ones.
  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (c.id === "injected" && connectors.some((x) => x.type === "injected" && x.id !== "injected")) return false;
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="wallet-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-6 text-fg">
      <h2 id="wallet-title" className="text-xl font-semibold">Connect a wallet</h2>
      <p className="mt-2 text-sm text-muted">Terra Firma runs on Robinhood Chain mainnet (chain 4663). Your wallet will be asked to switch.</p>
      <ul className="mt-5 space-y-2">
        {list.length === 0 && <li className="text-sm text-muted">No wallet found. Install a browser wallet or use WalletConnect.</li>}
        {list.map((c) => (
          <li key={c.uid}>
            <Button
              variant="secondary"
              className="w-full justify-between"
              disabled={isPending}
              onClick={() =>
                connect(
                  { connector: c, chainId: CHAIN_ID },
                  {
                    onSuccess: () => {
                      onClose();
                      onConnected?.();
                    },
                  },
                )
              }
            >
              <span>{c.name}</span>
              {isPending && variables && "connector" in variables && variables.connector === c && <span className="text-sm text-muted">Opening…</span>}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {/rejected|denied/i.test(error.message) ? "You cancelled in your wallet." : error.message.split("\n")[0]}
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </dialog>
  );
}
