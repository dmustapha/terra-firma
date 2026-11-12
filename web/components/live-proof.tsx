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

function Fig({ label, value, href }: { label: string; value: ReactNode; href: string }) {
  return (
    <span className="whitespace-nowrap"><b className="num"><ExtLink href={href} className="no-underline">{value}</ExtLink></b> {label}</span>
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
    <section aria-labelledby="proof-title" className="rule-head pb-16">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="proof-title" className="font-display text-[1.75rem] leading-tight">Sources &amp; corrections</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-accent"><span className="live-dot" aria-hidden /> Live on Robinhood Chain mainnet{ago !== null && <>, up {since(ago)}</>}</p>
        </div>
        <div className="columns-1 gap-10 text-[0.9375rem] leading-relaxed text-fg/85 sm:columns-2 [&>p]:mb-3 [&>p]:break-inside-avoid">
          <p>Every figure in this edition is read from Robinhood Chain logs and the Chainlink round in force at each buy. Nothing is estimated or typed in. <TextLink inline href="/proof">{deployments.verified.length} verified contracts, every transaction</TextLink>.</p>
          <p>
            Since launch at block <span className="num">{Number(deployments.block).toLocaleString("en-US")}</span>: <Fig label="$WIF burned" href={addrUrl(TF.FeePool)} value={rv(burned, (v) => token(v))} />,{" "}
            <Fig label="ETH into stakers' stock" href={addrUrl(TF.FeePool)} value={rv(toStock, (v) => eth(v))} />,{" "}
            <Fig label="slice trades" href={addrUrl(TF.TerraRouter)} value={lv((l) => only(l.router, "Traded").length)} />,{" "}
            <Fig label="Jars opened" href={addrUrl(TF.Jar)} value={lv((l) => new Set(only(l.jar, "Credited").map((x) => x.args.user.toLowerCase())).size)} />.
            {fresh && <b className="text-accent"> The first sweep is still up for grabs.</b>} $WIF burns when each epoch closes.
          </p>
          <p>Terra Firma never sells or prices $WIF. Every stock fill is bounded by Chainlink. The Hindsight Edition counts gross buys of memes a wallet still holds; it is not profit and loss.</p>
        </div>
      </div>
    </section>
  );
}
