"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { isAddress, type Abi } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import evidence from "@/data/evidence.json";
import { feePoolAbi, hindsightLensAbi } from "@/lib/abi";
import { CHAIN_ID, TF, addrUrl } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { CONTRACTS, DEPLOYED, REPO_URL, publicClient } from "@/lib/ui-chain";
import { dateTime, eth, token } from "@/lib/ui-format";
import { blockTimes, only, type TfLogs } from "@/lib/ui-logs";
import { lensBuys, RecomputeResult, stockIdOf } from "./card-actions";
import { getJson, useTfLogs, useTx } from "./hooks";
import { LiveTicker } from "./landing-live";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, ExtLink, Notice, Panel, Skeleton, Stat, TxLink, inputCls } from "./ui";

export function ProofView() {
  return (
    <div className="space-y-6">
      <Contracts />
      <Totals />
      <FirstOfKind />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecomputeBox />
        <Distribute />
      </div>
      <Evidence />
      <LiveTicker />
    </div>
  );
}

function Contracts() {
  return (
    <Panel aria-labelledby="c-title">
      <h2 id="c-title" className="font-semibold">Contracts</h2>
      <p className="mt-1 text-sm text-muted">No owner, no pause, no upgrade, no admin withdraw (checked by the fork test <code className="font-mono">test_noOwnerFunctions</code>).</p>
      <ul className="mt-4 divide-y divide-line">
        {CONTRACTS.map((c) => (
          <li key={c.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-semibold">{c.key} {DEPLOYED && <Badge tone="accent">ownerless</Badge>}</p>
              <p className="text-sm text-muted">{c.role}</p>
            </div>
            {DEPLOYED ? <AddrLink addr={c.address} className="text-sm" /> : <span className="text-sm text-muted">deploying</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Totals() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const l = logs.data;
  const traded = l ? only(l.router, "Traded") : [];
  const volume = traded.reduce((a, t) => a + t.args.ethAmount, 0n);
  const fees = traded.reduce((a, t) => a + t.args.fee, 0n);
  const v = (ok: boolean, f: () => string) => (!DEPLOYED ? "—" : ok ? f() : <Skeleton w="4rem" h="1.6rem" />);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="$WIF burned" href={addrUrl(TF.FeePool)} value={v(!!reads.data?.[0]?.result, () => token(reads.data![0].result as bigint))} />
      <Stat label="ETH to staker stock" href={addrUrl(TF.FeePool)} value={v(!!reads.data, () => eth((reads.data![1].result as bigint) ?? 0n))} />
      <Stat label="Routed trades" href={addrUrl(TF.TerraRouter)} value={v(!!l, () => traded.length.toLocaleString("en-US"))} />
      <Stat label="Routed volume" href={addrUrl(TF.TerraRouter)} value={v(!!l, () => `${eth(volume)} ETH`)} sub={l ? `${eth(fees)} ETH in fees` : undefined} />
      <Stat label="Cards minted" href={addrUrl(TF.HindsightLens)} value={v(!!l, () => only(l!.lens, "CardMinted").length.toString())} />
    </div>
  );
}

function firsts(l: TfLogs) {
  return [
    { k: "First convert", log: only(l.router, "Converted")[0] },
    { k: "First sweep", log: only(l.router, "Swept")[0] },
    { k: "First distribute with a $WIF burn", log: only(l.feePool, "Distributed").find((d) => d.args.wifBurned > 0n) },
    { k: "First staking claim", log: only(l.staking, "Claimed")[0] },
  ];
}

function FirstOfKind() {
  const logs = useTfLogs();
  const l = logs.data;
  const dist = l ? only(l.feePool, "Distributed") : [];
  const lastDist = dist[dist.length - 1];
  const t = useQuery({ queryKey: ["dist-time", lastDist?.blockNumber.toString()], enabled: !!lastDist, queryFn: () => blockTimes([lastDist!.blockNumber]) });
  return (
    <Panel aria-labelledby="f-title">
      <h2 id="f-title" className="font-semibold">First-of-kind transactions</h2>
      {!DEPLOYED ? (
        <p className="mt-3 text-sm text-muted">These appear from contract logs after deploy.</p>
      ) : logs.error ? (
        <Notice tone="danger" className="mt-3">Live data unavailable: couldn&apos;t read logs from the public RPC. Nothing is shown in its place.</Notice>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {(l ? firsts(l) : [0, 1, 2, 3].map((i) => ({ k: String(i), log: undefined }))).map((f) => (
            <li key={f.k} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>{l ? f.k : <Skeleton w="12rem" />}</span>
              {!l ? <Skeleton w="7rem" /> : f.log ? <TxLink hash={f.log.transactionHash} /> : <span className="text-muted">not yet</span>}
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>Keeper last run (latest Distributed)</span>
            {!l ? <Skeleton w="7rem" /> : lastDist ? (
              <span className="flex items-center gap-3"><span className="num text-muted">{t.data ? dateTime(t.data.get(lastDist.blockNumber)!) : "…"}</span><TxLink hash={lastDist.transactionHash} /></span>
            ) : (
              <span className="text-muted">no distribute yet</span>
            )}
          </li>
        </ul>
      )}
    </Panel>
  );
}

function RecomputeBox() {
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const run = useMutation({
    mutationFn: async (addr: string) => {
      const card = await getJson<Card>(`/api/hindsight?addr=${addr}&stock=NVDA`);
      if (!DEPLOYED || card.memes.length === 0) return { card, chain: undefined };
      const [usdPaid8, shares18, usdNow8] = await publicClient.readContract({ address: TF.HindsightLens, abi: hindsightLensAbi, functionName: "recompute", args: [lensBuys(card), stockIdOf(card.stock)] });
      return { card, chain: { usdPaid8, shares18, usdNow8 } };
    },
  });
  return (
    <Panel aria-labelledby="r-title">
      <h2 id="r-title" className="font-semibold">Recompute a card</h2>
      <p className="mt-1 text-sm text-muted">Runs /api/hindsight, then HindsightLens.recompute on the same inputs via eth_call.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isAddress(v.trim())) return setErr(true);
          run.mutate(v.trim());
        }}
      >
        <label htmlFor="rc-addr" className="sr-only">Wallet address</label>
        <input id="rc-addr" value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} placeholder="0x…" className={`${inputCls} font-mono text-sm sm:flex-1`} aria-invalid={err} spellCheck={false} />
        <Button type="submit" disabled={run.isPending}>{run.isPending ? "Running…" : "Recompute"}</Button>
      </form>
      {err && <p role="alert" className="mt-2 text-sm text-danger">Enter a 0x address.</p>}
      {run.error && <Notice tone="danger" className="mt-3">{(run.error as Error).message}</Notice>}
      {run.data && (run.data.card.memes.length === 0 ? <p className="mt-3 text-sm text-muted">No priced meme buys for this wallet.</p> : !DEPLOYED ? <Notice className="mt-3">API card loaded. The onchain side runs once HindsightLens is deployed.</Notice> : <RecomputeResult card={run.data.card} data={run.data.chain} />)}
    </Panel>
  );
}

function Distribute() {
  const { address } = useAccount();
  const can = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "canDistribute", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "epoch", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 20_000 },
  });
  const bal = useQuery({ queryKey: ["feepool-bal"], enabled: DEPLOYED, queryFn: () => publicClient.getBalance({ address: TF.FeePool }), refetchInterval: 20_000 });
  const tx = useTx();
  const ok = can.data?.[0]?.result === true;
  return (
    <Panel aria-labelledby="d-title">
      <h2 id="d-title" className="font-semibold">Run distribute</h2>
      <p className="mt-1 text-sm text-muted">Anyone can trigger the hourly epoch if the keeper hasn&apos;t: half buys and burns $WIF, half buys stakers&apos; stock.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">Fee pool balance</dt><dd className="num font-semibold">{!DEPLOYED ? "—" : bal.data !== undefined ? `${eth(bal.data)} ETH` : <Skeleton w="4rem" />}</dd></div>
        <div><dt className="text-muted">Current epoch</dt><dd className="num font-semibold">{!DEPLOYED ? "—" : can.data?.[1]?.result !== undefined ? String(can.data[1].result) : <Skeleton w="3rem" />}</dd></div>
      </dl>
      <Button
        className="mt-4 w-full"
        disabled={!DEPLOYED || !address || !ok || tx.busy}
        onClick={async () => {
          await tx.run([{ label: "Distribute", call: { address: TF.FeePool, abi: feePoolAbi as unknown as Abi, functionName: "distribute", args: [0n] } }]);
          can.refetch();
        }}
      >
        {!DEPLOYED ? "Available after deploy" : !address ? "Connect a wallet to run it" : ok ? "Run distribute" : "Not due yet"}
      </Button>
      <p className="mt-2 text-xs text-muted">wifMinOut = 0 is safe here: the $WIF buy is capped at 0.01 ETH per call, so price games can only shave dust.</p>
      <TxStatus state={tx.state} onReset={tx.reset} success="Distributed. The burn and staker stream are onchain." />
    </Panel>
  );
}

function Evidence() {
  return (
    <Panel aria-labelledby="e-title" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 id="e-title" className="font-semibold">Fork tests</h2>
        <p className="mt-1 text-sm text-muted">
          <span className="num text-fg">{evidence.forkTests}</span> passing against a Robinhood Chain mainnet fork. Run it yourself: <code className="font-mono text-fg">{evidence.command}</code>
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {REPO_URL && <ExtLink href={`${REPO_URL}/blob/main/evidence/forge-test.txt`}>Test output</ExtLink>}
        {REPO_URL && <ExtLink href={`${REPO_URL}/blob/main/SECURITY.md`}>SECURITY.md</ExtLink>}
      </div>
    </Panel>
  );
}
