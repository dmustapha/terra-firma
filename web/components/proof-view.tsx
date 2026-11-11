"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { isAddress, type Abi } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import evidence from "@/data/evidence.json";
import { feePoolAbi, hindsightLensAbi } from "@/lib/abi";
import { ADDR, CHAIN_ID, FEE_BPS, STAKER_FEE_BPS, DISCOUNT_STAKE, TF, addrUrl, stockBySymbol } from "@/lib/config";
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
      <RubricMap />
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

// ---- Rubric map (critique E-2): the three judging criteria, each pointing at live evidence ----

const PENDING = "live after mainnet deploy";
const anchorCls = "inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm";
const bps = (b: number) => `${(b / 100).toFixed(1)}%`;

function Jump({ to, children }: { to: string; children: ReactNode }) {
  return <a href={`#${to}`} className={anchorCls}>{children}</a>;
}

/** One evidence line: what it proves, then the link (or an honest pending/loading state). */
function Row({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right">{children}</span>
    </li>
  );
}

function RubricCard({ id, title, claim, children }: { id: string; title: string; claim: string; children: ReactNode }) {
  return (
    <Panel aria-labelledby={id} className="flex flex-col">
      <h3 id={id} className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{claim}</p>
      <ul className="mt-3 divide-y divide-line">{children}</ul>
    </Panel>
  );
}

function RubricMap() {
  const { logs, l, volume, burned, toStock } = useProofTotals();
  const f = l ? firsts(l) : undefined;
  const dist = l ? only(l.feePool, "Distributed") : [];
  const lastDist = dist[dist.length - 1];
  const failed = DEPLOYED && !!logs.error;
  /** Event-derived link: pending pre-deploy, explicit on RPC failure, skeleton while scanning. */
  const ev = (hash: string | undefined, none: string) =>
    !DEPLOYED ? <span className="text-muted">{PENDING}</span> : failed ? <span className="text-danger">RPC unavailable</span> : !l ? <Skeleton w="6rem" /> : hash ? <TxLink hash={hash} /> : <span className="text-muted">{none}</span>;
  const total = (x: bigint | undefined, fmt: (n: bigint) => string, href: string) =>
    !DEPLOYED ? <span className="text-muted">{PENDING}</span> : x === undefined ? <Skeleton w="5rem" /> : <ExtLink href={href}><span className="num">{fmt(x)}</span></ExtLink>;
  return (
    <section aria-labelledby="rubric-title" className="space-y-3">
      <h2 id="rubric-title" className="text-sm font-medium uppercase tracking-wider text-muted">Judging criteria, mapped to evidence</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <RubricCard id="rb-wif" title="A real reason to use $WIF" claim="Fees buy and burn $WIF, stakers earn real stock, and staking cuts your trade fee.">
          <Row k="First fee-funded $WIF burn">{ev(f?.[2].log?.transactionHash, "not yet")}</Row>
          <Row k="First staker claim">{ev(f?.[3].log?.transactionHash, "not yet")}</Row>
          <Row k={`Fee discount: ${token(DISCOUNT_STAKE)} $WIF staked → ${bps(STAKER_FEE_BPS)} instead of ${bps(FEE_BPS)}`}>
            {DEPLOYED ? <AddrLink addr={TF.TerraRouter}>TerraRouter.feeBps</AddrLink> : <span className="text-muted">{PENDING}</span>}
          </Row>
          <Row k="$WIF token (the router reverts any $WIF sell)"><AddrLink addr={ADDR.wif} /></Row>
        </RubricCard>
        <RubricCard id="rb-fly" title="A flywheel that holds up" claim="Routed volume pays fees; each epoch burns $WIF and streams stock to stakers. Live totals, no projections.">
          <Row k="Routed volume">{total(l ? volume : undefined, (n) => `${eth(n)} ETH`, addrUrl(TF.TerraRouter))}</Row>
          <Row k="$WIF burned">{total(burned, (n) => token(n), addrUrl(TF.FeePool))}</Row>
          <Row k="ETH streamed to staker stock">{total(toStock, (n) => `${eth(n)} ETH`, addrUrl(TF.FeePool))}</Row>
          <Row k="Latest distribute">{ev(lastDist?.transactionHash, "no distribute yet")}</Row>
          <Row k="Burn path: hooked WIF/ETH pool"><AddrLink addr={ADDR.wifHook} /></Row>
        </RubricCard>
        <RubricCard id="rb-built" title="Works and built well" claim="Ownerless contracts, a mainnet-fork test suite, and every card recomputable by eth_call.">
          <Row k={`${CONTRACTS.length} ownerless contracts${DEPLOYED ? ", verified" : ""}`}>
            {DEPLOYED ? <Jump to="contracts">Addresses</Jump> : <span className="text-muted">{PENDING}</span>}
          </Row>
          <Row k={`${evidence.forkTests} fork tests passing`}><Jump to="fork-tests">Command and output</Jump></Row>
          <Row k="Recompute any card onchain"><Jump to="recompute">Recompute box</Jump></Row>
        </RubricCard>
      </div>
    </section>
  );
}

function Contracts() {
  return (
    <Panel id="contracts" aria-labelledby="c-title" className="scroll-mt-24">
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

/** FeePool totals + router volume, shared by the rubric map and the totals row (one read, one log scan). */
function useProofTotals() {
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
  const burned = reads.data?.[0]?.result as bigint | undefined;
  const toStock = reads.data?.[1]?.result as bigint | undefined;
  return { logs, l, traded, volume, fees, burned, toStock };
}

function Totals() {
  const { l, traded, volume, fees, burned, toStock } = useProofTotals();
  const v = (ok: boolean, f: () => string) => (!DEPLOYED ? "—" : ok ? f() : <Skeleton w="4rem" h="1.6rem" />);
  return (
    <div id="totals" className="grid scroll-mt-24 grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="$WIF burned" href={addrUrl(TF.FeePool)} value={v(burned !== undefined, () => token(burned!))} />
      <Stat label="ETH to staker stock" href={addrUrl(TF.FeePool)} value={v(toStock !== undefined, () => eth(toStock!))} />
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

/** ?addr=0x…&stock=NVDA from a "Recompute this card" link. Read after mount so /proof stays static. */
function useQueryPrefill() {
  const [q, setQ] = useState<{ addr: string; stock: string } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const addr = p.get("addr")?.trim() ?? "";
    if (isAddress(addr)) setQ({ addr, stock: stockBySymbol(p.get("stock") ?? "")?.symbol ?? "NVDA" });
  }, []);
  return q;
}

function RecomputeBox() {
  const [v, setV] = useState("");
  const [stock, setStock] = useState("NVDA");
  const [err, setErr] = useState(false);
  const prefill = useQueryPrefill();
  const run = useMutation({
    mutationFn: async ({ addr, stock }: { addr: string; stock: string }) => {
      const card = await getJson<Card>(`/api/hindsight?addr=${addr}&stock=${stock}`);
      if (!DEPLOYED || card.memes.length === 0) return { card, chain: undefined };
      const [usdPaid8, shares18, usdNow8] = await publicClient.readContract({ address: TF.HindsightLens, abi: hindsightLensAbi, functionName: "recompute", args: [lensBuys(card), stockIdOf(card.stock)] });
      return { card, chain: { usdPaid8, shares18, usdNow8 } };
    },
  });
  const { mutate } = run;
  useEffect(() => {
    if (!prefill) return;
    setV(prefill.addr);
    setStock(prefill.stock);
    mutate(prefill);
  }, [prefill, mutate]);
  return (
    <Panel id="recompute" aria-labelledby="r-title" className="scroll-mt-24">
      <h2 id="r-title" className="font-semibold">Recompute a card</h2>
      <p className="mt-1 text-sm text-muted">Runs /api/hindsight, then HindsightLens.recompute on the same inputs via eth_call. Priced in {stock}.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isAddress(v.trim())) return setErr(true);
          run.mutate({ addr: v.trim(), stock });
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
    <Panel id="fork-tests" aria-labelledby="e-title" className="scroll-mt-24 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
