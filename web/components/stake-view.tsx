"use client";

import { useState, type ReactNode } from "react";
import { formatUnits, type Abi, type Address } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, feePoolAbi, terraRouterAbi, wifStakingAbi } from "@/lib/abi";
import { CHAIN_ID, DISCOUNT_STAKE, EXPLORER, STAKER_FEE_BPS, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED, WIF } from "@/lib/ui-chain";
import { DASH, duration, parseAmount, shares18, token } from "@/lib/ui-format";
import { only } from "@/lib/ui-logs";
import { sharesOf, type StockQuote } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { useApproveStep, useMounted, useNow, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, ExtLink, LinkButton, Notice, Panel, RuledTable, Skeleton, TxLink, cx, inputCls } from "./ui";

const S = { address: TF.WifStaking, abi: wifStakingAbi, chainId: CHAIN_ID } as const;

function usePools() {
  const head = useReadContracts({
    contracts: [
      { ...S, functionName: "currentEpoch" },
      { ...S, functionName: "start" },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const pools = useReadContracts({
    contracts: STOCKS.map((s) => ({ ...S, functionName: "activeStake", args: [s.id] }) as const),
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  return {
    epoch: head.data?.[0]?.result as bigint | undefined,
    start: head.data?.[1]?.result as bigint | undefined,
    burned: head.data?.[2]?.result as bigint | undefined,
    active: (i: number) => pools.data?.[i]?.result as bigint | undefined,
  };
}

export function StakeView() {
  const { epoch, start, burned, active: activeOf } = usePools();
  const logs = useTfLogs();
  // Minute-grained clock for the activation sentence; the per-second countdown lives in <Countdown>.
  const now = useNow(30_000, DEPLOYED);
  const nextAt = epoch !== undefined && start !== undefined ? Number(start + (epoch + 1n) * 3600n) : undefined;
  const rewards = only(logs.data?.staking ?? [], "RewardNotified");
  const lastReward = (id: number) => [...rewards].reverse().find((l) => l.args.stockId === id);
  const market = useStockQuotes();

  const act = activationText(epoch, nextAt, now);

  return (
    <div className="space-y-14">
      <section aria-labelledby="wait-title" className="plate-lit -mx-2 grid gap-x-12 gap-y-8 px-5 py-7 sm:-mx-4 sm:px-10 sm:py-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <p className="eyebrow text-accent">The pool</p>
          <h2 id="wait-title" className="mt-2 font-display text-deck">When a stake starts earning</h2>
          <p className="mt-3 text-[0.96875rem] leading-relaxed">The fee pool buys $WIF and burns it, and streams Stock Tokens to everyone staking $WIF. You choose which stock you are paid in. Your $WIF is never sold.</p>
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-6">
            <BigFig k="Next epoch in" hero className="col-span-2">{!DEPLOYED ? "not live yet" : nextAt ? <Countdown nextAt={nextAt} /> : <Skeleton w="12rem" h="4rem" />}</BigFig>
            <BigFig k="Current epoch">{!DEPLOYED ? DASH : epoch != null ? epoch.toString() : <Skeleton w="5rem" h="3rem" />}</BigFig>
            <BigFig k="$WIF burned" sub="bought with fees">
              {!DEPLOYED ? DASH : burned !== undefined ? <ExtLink href={addrUrl(TF.FeePool)}>{token(burned)}</ExtLink> : <Skeleton w="6rem" h="3rem" />}
            </BigFig>
          </dl>
        </div>
        <div className="min-w-0 lg:col-span-7">
          <StakeJump />
          <p className="max-w-[40ch] font-display text-xl leading-snug">
            Your stake starts earning after one full hour-long epoch.{" "}
            <strong className="font-normal italic text-accent">
              {act.staked !== undefined ? `Staked in epoch ${act.staked} → earning from epoch ${act.earning}` : "Staked now → earning from the second epoch after this one"}
              {act.mins ? ` (about ${act.mins} min)` : ""}.
            </strong>
          </p>
          <EpochRuler staked={act.staked} />
        </div>
      </section>

      <Panel aria-labelledby="pools-title">
        <p className="eyebrow text-muted">Bedrock payouts · per stock</p>
        <h2 id="pools-title" className="mt-2 font-display text-deck">Reward pools</h2>
        <p className="mt-1 text-sm text-muted">Half of every fee buys real stock for stakers, split by active stake per pool. Pick the stock you want to earn.</p>
        <RuledTable
          className="mt-4"
          caption="Reward pools per Stock Token"
          heads={["Stock", "Hours", "Staked", "Last reward"]}
          rows={STOCKS.map((s, i) => {
            const active = activeOf(i);
            const last = lastReward(s.id);
            const staked = !DEPLOYED ? DASH : active != null ? `${token(active)} $WIF` : <Skeleton w="4rem" />;
            const reward = !DEPLOYED ? DASH : last ? <TxLink hash={last.transactionHash}>{rewardText(last.args.amount, market.data?.[i], s.symbol)}</TxLink> : logs.isLoading ? <Skeleton w="4rem" /> : "none yet";
            return [s.symbol, <span key="h" className="text-muted">{s.hours}</span>, staked, reward];
          })}
          foot={!DEPLOYED ? "None yet: pools fill once the contracts are live on Robinhood Chain and the first hourly distribute runs." : undefined}
        />
      </Panel>

      <YourStake epoch={epoch} nextAt={nextAt} />
    </div>
  );
}

/** Per-second countdown to the next epoch. Isolated so only this text re-renders every second. */
function Countdown({ nextAt }: { nextAt: number }) {
  const now = useNow();
  return <>{duration(nextAt - now)}</>;
}

/** Mobile shortcut near the top of the page to the stake form (or to connecting first). */
function StakeJump() {
  const mounted = useMounted();
  const { address } = useAccount();
  return (
    <div className="mb-4 lg:hidden">
      {mounted && address ? <LinkButton href="#your-stake" className="w-full sm:w-auto">Stake $WIF</LinkButton> : <ConnectButton label="Connect to stake" className="w-full sm:w-auto" />}
    </div>
  );
}

function YourStake({ epoch, nextAt }: { epoch?: bigint; nextAt?: number }) {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!mounted) return <Skeleton w="100%" h="10rem" className="block" />;
  if (!address)
    return (
      <section id="your-stake" aria-label="Your stake" className="plate-lit -mx-2 flex scroll-mt-24 flex-col items-start gap-5 px-5 py-8 sm:-mx-4 sm:px-10 sm:py-10">
        <p className="eyebrow text-accent">Your stake</p>
        <p className="max-w-[24ch] font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[0.95]">Connect a wallet to stake $WIF.</p>
        <ConnectButton />
      </section>
    );
  return <Staker user={address} epoch={epoch} nextAt={nextAt} />;
}

function Staker({ user, epoch, nextAt }: { user: Address; epoch?: bigint; nextAt?: number }) {
  const now = useNow(15_000, DEPLOYED);
  const me = useReadContracts({
    contracts: [
      { ...S, functionName: "stakers", args: [user] },
      { ...S, functionName: "pending", args: [user] },
      { ...S, functionName: "activeOf", args: [user] },
      { address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: [user], chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 20_000 },
  });
  const wifBal = useReadContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: [user], chainId: CHAIN_ID });
  const market = useStockQuotes();
  const gate = useStockGate();
  const tx = useTx();
  const approve = useApproveStep();
  const [amt, setAmt] = useState("");
  const [unAmt, setUnAmt] = useState("");
  const [pick, setPick] = useState("NVDA");
  const [msg, setMsg] = useState<string | null>(null);

  const st = me.data?.[0]?.result as readonly [number, bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
  const pend = me.data?.[1]?.result as readonly [number, bigint] | undefined;
  const activeOf = me.data?.[2]?.result as bigint | undefined;
  const feeBps = me.data?.[3]?.result as number | undefined;
  const [stockId, active, pendingStake, , , , unstaking, unlockAt] = st ?? [0, 0n, 0n, 0n, 0n, 0n, 0n, 0n];
  const hasStake = active + pendingStake > 0n;
  const mySym = STOCKS[stockId]?.symbol ?? "NVDA";
  const stakeSym = hasStake ? mySym : pick;
  const wei = parseAmount(amt);
  const unWei = parseAmount(unAmt);
  const { label: activation, mins } = activationText(epoch, nextAt, now);
  // `stakers().pendingStake` keeps matured buckets until the next interaction; activeOf() already counts them (S9).
  const matured = activeOf !== undefined && activeOf > active ? activeOf - active : 0n;
  const waiting = pendingStake > matured ? pendingStake - matured : 0n;
  const reward = pend?.[1] ?? 0n;
  const rq = market.data?.[pend?.[0] ?? stockId];
  const blocked = gate.status === "restricted";
  const geoWait = gate.status === "loading";
  const stakingUrl = addrUrl(TF.WifStaking);
  const after = (m: string) => () => {
    setMsg(m);
    me.refetch();
    wifBal.refetch();
  };

  const stake = () =>
    gate.gate(async () => {
      if (!wei) return;
      const id = STOCKS.find((s) => s.symbol === stakeSym)!.id;
      const r = await tx.run([approve(WIF, TF.WifStaking, wei, "$WIF"), { label: "Stake $WIF", call: { address: TF.WifStaking, abi: wifStakingAbi as unknown as Abi, functionName: "stake", args: [wei, id] } }]);
      if (r) after(`Staked. It ${activation}${mins ? ` (in about ${mins} min)` : ""} and earns ${stakeSym} from the first distribute after that.`)();
    });
  const call = (label: string, fn: string, args: readonly unknown[], done: string, stockLeg = false) => {
    const go = async () => {
      const r = await tx.run([{ label, call: { address: TF.WifStaking, abi: wifStakingAbi as unknown as Abi, functionName: fn, args } }]);
      if (r) after(done)();
    };
    return stockLeg ? gate.gate(go) : go();
  };

  if (!DEPLOYED) return (
      <div id="your-stake" className="scroll-mt-24">
        <Notice>Staking opens when the Terra Firma contracts are live on Robinhood Chain.</Notice>
      </div>
    );

  return (
    <section id="your-stake" aria-labelledby="mine-title" className="plate-lit -mx-2 scroll-mt-24 space-y-7 px-5 py-7 sm:-mx-4 sm:px-10 sm:py-10">
      {gate.dialog}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow text-accent">Your stake</p>
          <h2 id="mine-title" className="mt-2 font-display text-deck">What you have in the ground</h2>
        </div>
        {feeBps === STAKER_FEE_BPS ? (
          <Badge tone="accent">0.3% fee unlocked</Badge>
        ) : (
          <Badge>Stake {token(DISCOUNT_STAKE)} $WIF active to unlock a 0.3% trade fee</Badge>
        )}
      </div>
      {blocked && <Notice tone="warn">{GEO_BLOCKED} Staking and claiming earn stock, so they are off in your region.</Notice>}
      <GeoLoadingNote status={gate.status} />

      <dl className="well-bore grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-6 sm:px-7 lg:grid-cols-4">
        <Fig k="Wallet $WIF" v={wifBal.data !== undefined ? token(wifBal.data) : undefined} href={`${EXPLORER}/address/${user}?tab=tokens`} />
        <Fig k="Active" v={activeOf !== undefined ? token(activeOf) : undefined} sub={hasStake ? `earning ${mySym}` : undefined} href={stakingUrl} />
        <Fig k="Activating" v={st && activeOf !== undefined ? token(waiting) : undefined} sub={waiting > 0n ? (epoch !== undefined ? `earns from epoch ${(epoch + 2n).toString()}` : "earns from the second epoch after staking") : undefined} href={stakingUrl} />
        <Fig k="Reward to claim" v={pend ? rewardText(reward, rq, STOCKS[pend[0]]?.symbol ?? "") : undefined} href={stakingUrl} accent />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="stake-h" className="space-y-4">
          <h3 id="stake-h" className="font-display text-xl">Stake</h3>
          {hasStake ? <p className="text-sm text-muted">Adding to your {mySym} stake. Use Switch to change stock.</p> : <StockSelect value={pick} onChange={setPick} label="Reward stock" name="stake-stock" />}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="stake-amt" className="sr-only">$WIF to stake</label>
            <input id="stake-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="$WIF amount" className={cx(inputCls, "num sm:flex-1")} aria-invalid={amt !== "" && !wei} />
            {wifBal.data !== undefined && <Button variant="secondary" onClick={() => setAmt(formatUnits(wifBal.data!, 18))}>Max</Button>}
          </div>
          <Button className="w-full" disabled={!wei || blocked || geoWait || tx.busy || (wifBal.data !== undefined && wei > wifBal.data)} onClick={stake}>Approve and stake</Button>
          <p className="text-xs text-muted">A stake placed now {activation}{mins ? ` (about ${mins} min)` : ""}, so nobody can grab a payout by staking just before a distribute.</p>
        </section>

        <section aria-labelledby="manage-h" className="space-y-4">
          <h3 id="manage-h" className="font-display text-xl">Manage</h3>
          <Button className="w-full" disabled={reward === 0n || blocked || geoWait || tx.busy} onClick={() => call("Claim to Jar", "claim", [], "Claimed. The reward stock is in your Jar.", true)}>
            Claim to Jar
          </Button>
          {hasStake && (
            <div className="space-y-2">
              <StockSelect value={pick} onChange={setPick} label="Switch reward stock" name="switch-stock" />
              <Button variant="secondary" className="w-full" disabled={pick === mySym || blocked || geoWait || tx.busy} onClick={() => call(`Switch to ${pick}`, "switchStock", [STOCKS.find((s) => s.symbol === pick)!.id], `Switched. Your stake earns ${pick} once it is active: it ${activation}.`, true)}>
                Switch to {pick}
              </Button>
            </div>
          )}
          {hasStake && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="un-amt" className="sr-only">$WIF to unstake</label>
                <input id="un-amt" inputMode="decimal" value={unAmt} onChange={(e) => setUnAmt(e.target.value)} placeholder="$WIF to unstake" className={cx(inputCls, "num sm:flex-1")} />
                <Button variant="secondary" onClick={() => setUnAmt(formatUnits(active + pendingStake, 18))}>All</Button>
              </div>
              <Button variant="secondary" className="w-full" disabled={!unWei || unWei > active + pendingStake || tx.busy} onClick={() => call("Request unstake", "requestUnstake", [unWei], "Unstaking stops rewards now. Your $WIF unlocks in 24h.")}>
                Request unstake
              </Button>
              <p className="text-xs text-muted">Unstaking stops rewards now. Your $WIF unlocks in 24h.</p>
            </div>
          )}
          {unstaking > 0n && (
            <div className="well-bore px-5 py-5">
              <p className="num relative text-sm">
                {token(unstaking)} $WIF unstaking · {Number(unlockAt) > now ? `unlocks in ${duration(Number(unlockAt) - now)}` : "unlocked"}
              </p>
              <Button className="relative mt-3 w-full" disabled={Number(unlockAt) > now || tx.busy} onClick={() => call("Withdraw $WIF", "withdraw", [], "Withdrawn. Your $WIF is back in your wallet.")}>
                Withdraw $WIF
              </Button>
            </div>
          )}
        </section>
      </div>
      <TxStatus state={tx.state} onReset={tx.reset} success={msg ?? "Done."} />
      <p className="text-xs text-muted">Read from the <AddrLink addr={TF.WifStaking}>staking contract</AddrLink>. No projected yield is shown: rewards depend only on real routed fees.</p>
    </section>
  );
}

/** Contract truth (WifStaking._matured): a stake placed in epoch e is active from the start of epoch e+2. */
export function activationText(epoch: bigint | undefined, nextAt: number | undefined, now: number) {
  const label = epoch !== undefined ? `activates at the start of epoch ${(epoch + 2n).toString()}` : "activates at the start of the second epoch from now";
  const mins = nextAt ? Math.max(1, Math.ceil((nextAt + 3600 - now) / 60)) : null;
  /** Epoch a stake placed now lands in, and the first epoch it earns in (undefined until the chain is read). */
  const staked = epoch?.toString();
  const earning = epoch !== undefined ? (epoch + 2n).toString() : undefined;
  return { label, mins, staked, earning };
}

/** Epoch timeline: staked in N, one full waiting epoch N+1, earning from N+2. Each epoch is one hour on Robinhood Chain.
 *  Sits in a recessed well; HTML, not SVG, so labels keep their size; under 640px the three cells stack as rows. */
function EpochRuler({ staked }: { staked?: string }) {
  const n = staked !== undefined ? BigInt(staked) : undefined;
  const name = (k: bigint, fallback: string) => (n !== undefined ? `epoch ${(n + k).toString()}` : fallback);
  const cells = [
    { label: name(0n, "this epoch"), note: "staked now", bar: "bg-accent-32", ink: "text-fg" },
    { label: name(1n, "next epoch"), note: "one full epoch", bar: "bg-line", ink: "text-fg" },
    { label: name(2n, "the one after"), note: "earning from here", bar: "bg-accent", ink: "text-accent" },
  ];
  return (
    <figure className="well-bore mt-6 px-5 py-6 sm:px-7">
      <p className="eyebrow relative text-muted">Epoch timeline</p>
      <ol aria-label="Epoch timeline" className="relative mt-4 sm:grid sm:grid-cols-[5fr_5fr_7fr] sm:gap-2">
        {cells.map((c) => (
          <li key={c.note} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0 sm:block sm:border-b-0 sm:py-0">
            <span aria-hidden className={cx("block size-4 shrink-0 rounded-full sm:h-3 sm:w-full", c.bar)} />
            <span className="min-w-0 sm:block sm:pt-3">
              <i className={cx("font-display text-lg sm:block", c.ink)}>{c.note}</i>
              <span className={cx("num font-mono text-xs max-sm:ml-2 sm:mt-0.5 sm:block", c.ink)}>{c.label}</span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="relative mt-4 text-[0.8125rem] text-muted">Each epoch is one hour, counted on Robinhood Chain.</figcaption>
    </figure>
  );
}

/** Reward in displayed shares; "—" when the quote is unavailable (never the raw amount presented as shares). */
function rewardText(raw: bigint, q: StockQuote | undefined, sym: string) {
  const sh = sharesOf(raw, q);
  return sh === null ? `${DASH} ${sym} (price unavailable)` : `${shares18(sh)} ${sym}`;
}

/** Hero figure on the pool plate: mono eyebrow over a display numeral. */
function BigFig({ k, sub, hero, className, children }: { k: string; sub?: string; hero?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="eyebrow text-muted">{k}</dt>
      <dd className={cx("num mt-2 font-display leading-[0.9] tracking-[-0.02em] [overflow-wrap:anywhere]", hero ? "text-[clamp(4rem,2.6rem+4vw,6rem)] text-accent" : "text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)]")}>{children}</dd>
      {sub && <dd className="mt-1 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

/** Figure linked to the explorer page that holds the number (invariant: every onchain number links). */
function Fig({ k, v, sub, accent, href }: { k: string; v?: string; sub?: string; accent?: boolean; href?: string }) {
  const value = v ?? <Skeleton w="4rem" h="2rem" />;
  return (
    <div className="relative min-w-0">
      <dt className={cx("eyebrow", accent ? "text-accent" : "text-muted")}>{k}</dt>
      <dd className={cx("num mt-1 font-display text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] leading-none", accent && "text-accent")}>
        {href && v ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-sm underline decoration-line decoration-1 underline-offset-[6px] hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg" aria-label={`${k}: ${v}. View on the explorer`}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}
