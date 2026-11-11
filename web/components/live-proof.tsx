"use client";

// The loop's third leg, proven: live protocol totals read from Robinhood Chain (FeePool reads + Terra Firma logs).
// Errors show as words; nothing is typed or seeded.
import type { ReactNode } from "react";
import { useBlock, useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import deployments from "@/data/deployments.json";
import { eth, token } from "@/lib/ui-format";

const since = (sec: number) => (sec < 3600 ? `${Math.max(1, Math.floor(sec / 60))} minutes` : sec < 172800 ? `${Math.floor(sec / 3600)} hours` : `${Math.floor(sec / 86400)} days`);
import { only, type TfLogs } from "@/lib/ui-logs";
import { useTfLogs } from "./hooks";
import { ExtLink, Skeleton, TextLink } from "./ui";

const NA = <span className="text-danger">unreadable right now</span>;

function Fig({ label, value, href }: { label: string; value: ReactNode; href: string; lead?: boolean }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="num text-[1.125rem] font-bold leading-none"><ExtLink href={href} className="no-underline">{value}</ExtLink></span>
      <span>{label}</span>
    </li>
  );
}

export function LiveProof() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const head = useBlock({ chainId: CHAIN_ID, query: { enabled: DEPLOYED, refetchInterval: 30_000 } });
  const born = useBlock({ chainId: CHAIN_ID, blockNumber: BigInt(deployments.block), query: { enabled: DEPLOYED, staleTime: Infinity } });
  if (!DEPLOYED) return null;
  const [burned, toStock] = reads.data ?? [];
  const rv = (r: typeof burned, f: (v: bigint) => string) =>
    r?.status === "success" ? f(r.result as bigint) : reads.error || r?.status === "failure" ? NA : <Skeleton w="2.5rem" h="1rem" />;
  const lv = (f: (l: TfLogs) => number) => (logs.data ? f(logs.data).toLocaleString("en-US") : logs.error ? NA : <Skeleton w="2rem" h="1rem" />);
  const fresh = !!logs.data && only(logs.data.router, "Traded").length === 0 && only(logs.data.jar, "Credited").length === 0;
  const ago = head.data && born.data ? Number(head.data.timestamp - born.data.timestamp) : null;
  return (
    <section aria-labelledby="proof-title" className="bleed">
      <div className="mx-auto max-w-[80rem] px-4 pt-20 pb-4 sm:px-6 lg:px-8">
        <div className="sheet grid gap-6 px-7 py-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 id="proof-title" className="flex items-center gap-2 text-sm font-semibold text-accent"><span className="live-dot" aria-hidden /> Live on Robinhood Chain mainnet</h2>
            <p className="mt-2 font-display text-[1.875rem] leading-tight">
              {ago !== null ? <>Up for <span className="num">{since(ago)}</span>.</> : "Live."}{fresh && <span className="text-accent"> The first sweep is still up for grabs.</span>}
            </p>
            <p className="mt-2 text-sm text-muted">
              <TextLink inline href="/proof">{deployments.verified.length} verified contracts, every tx</TextLink> · since block <span className="num">{Number(deployments.block).toLocaleString("en-US")}</span>
            </p>
          </div>
          <div className="rounded-[10px] bg-fg px-5 py-4 text-bg shadow-[var(--sh-well)]">
            <p className="mb-2 text-xs font-semibold opacity-70">Since launch, read every 30s</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm opacity-90">
              <Fig label="$WIF burned" href={addrUrl(TF.FeePool)} value={rv(burned, (v) => token(v))} />
              <Fig label="ETH into stock" href={addrUrl(TF.FeePool)} value={rv(toStock, (v) => eth(v))} />
              <Fig label="trades with a slice" href={addrUrl(TF.TerraRouter)} value={lv((l) => only(l.router, "Traded").length)} />
              <Fig label="Jars opened" href={addrUrl(TF.Jar)} value={lv((l) => new Set(only(l.jar, "Credited").map((x) => x.args.user.toLowerCase())).size)} />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
