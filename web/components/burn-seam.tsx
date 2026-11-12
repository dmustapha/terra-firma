"use client";

// The closer's burn seam: a heat line at the bedrock edge carrying the live $WIF burned total (FeePool.totalWifBurned).
// Honest: shows "reading…" until the chain answers; never a typed number.
import { useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { token } from "@/lib/ui-format";

export function BurnSeam() {
  const r = useReadContracts({
    contracts: [{ address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID }],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const v = r.data?.[0];
  const burned = v?.status === "success" ? token(v.result as bigint) : null;
  return (
    <div className="relative" aria-label={burned ? `${burned} WIF burned so far` : "Reading WIF burned"}>
      <span aria-hidden className="burn-seam block h-[3px] w-full" />
      <a href={addrUrl(TF.FeePool)} target="_blank" rel="noopener noreferrer"
        className="eyebrow absolute top-3 right-4 rounded-full bg-[color:var(--ground)] px-3 py-1 text-[0.625rem] text-[color:var(--brick)] no-underline hover:underline sm:right-8">
        {burned ? <><b className="num">{burned}</b> $WIF burned so far</> : "reading the burn…"}
      </a>
    </div>
  );
}
