"use client";

import { useState } from "react";
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
    <div className="space-y-8">
      <section aria-labelledby="wait-title" className="grid gap-x-10 gap-y-6 border-t-2 border-line-strong pt-5 lg:grid-cols-12">
        <div className="lg:col-span-5 lg:border-r lg:border-line lg:pr-10">
          <p className="mb-1 font-display text-[1.375rem] italic text-accent">The Pool</p>
          <h2 id="wait-title" className="font-display text-deck">When a stake starts earning</h2>
          <p className="mt-3 text-[0.96875rem] leading-relaxed">The fee pool buys $WIF and burns it, and streams Stock Tokens to everyone staking $WIF. You choose which stock you are paid in. Your $WIF is never sold.</p>
          <table className="num mt-5 w-full border-collapse text-[0.96875rem]">
            <tbody>
              <tr className="border-y border-fg">
                <th scope="row" className="py-2.5 text-left font-medium text-muted">Next epoch in</th>
                <td className="py-2.5 text-right font-semibold">{!DEPLOYED ? "not live yet" : nextAt ? <Countdown nextAt={nextAt} /> : <Skeleton w="5rem" />}</td>
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="py-2.5 text-left font-medium text-muted">Current epoch</th>
                <td className="py-2.5 text-right font-semibold">{!DEPLOYED ? DASH : epoch != null ? epoch.toString() : <Skeleton w="3rem" />}</td>
              </tr>
              <tr className="border-b border-line">
                <th scope="row" className="py-2.5 text-left font-medium text-muted">$WIF bought with fees and burned</th>
                <td className="py-2.5 text-right font-semibold">
                  {!DEPLOYED ? DASH : burned !== undefined ? <ExtLink href={addrUrl(TF.FeePool)}>{token(burned)}</ExtLink> : <Skeleton w="4rem" />}
                </td>
              </tr>
            </tbody>
          </table>
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
        <h2 id="pools-title" className="font-display text-deck">Reward pools</h2>
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
      <Panel id="your-stake" className="flex scroll-mt-24 flex-col items-start gap-4">
        <p className="font-display text-deck">Connect a wallet to stake $WIF.</p>
        <ConnectButton />
      </Panel>
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
    <Panel id="your-stake" aria-labelledby="mine-title" className="scroll-mt-24 space-y-6">
      {gate.dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mine-title" className="font-display text-deck">Your stake</h2>
        {feeBps === STAKER_FEE_BPS ? (
          <Badge tone="accent">0.3% fee unlocked</Badge>
        ) : (
          <Badge>Stake {token(DISCOUNT_STAKE)} $WIF active to unlock a 0.3% trade fee</Badge>
        )}
      </div>
      {blocked && <Notice tone="warn">{GEO_BLOCKED} Staking and claiming earn stock, so they are off in your region.</Notice>}
      <GeoLoadingNote status={gate.status} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <div className="border-l-[3px] border-fg bg-surface-2/60 p-4">
              <p className="num text-sm">
                {token(unstaking)} $WIF unstaking · {Number(unlockAt) > now ? `unlocks in ${duration(Number(unlockAt) - now)}` : "unlocked"}
              </p>
              <Button className="mt-3 w-full" disabled={Number(unlockAt) > now || tx.busy} onClick={() => call("Withdraw $WIF", "withdraw", [], "Withdrawn. Your $WIF is back in your wallet.")}>
                Withdraw $WIF
              </Button>
            </div>
          )}
        </section>
      </div>
      <TxStatus state={tx.state} onReset={tx.reset} success={msg ?? "Done."} />
      <p className="text-xs text-muted">Read from the <AddrLink addr={TF.WifStaking}>staking contract</AddrLink>. No projected yield is shown: rewards depend only on real routed fees.</p>
    </Panel>
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

/** Fig. 4: staked in N, one full waiting epoch N+1, earning from N+2. Each epoch is one hour on Robinhood Chain.
 *  HTML, not SVG, so its labels keep their size; under 640px the three cells stack as rows. */
function EpochRuler({ staked }: { staked?: string }) {
  const n = staked !== undefined ? BigInt(staked) : undefined;
  const name = (k: bigint, fallback: string) => (n !== undefined ? `epoch ${(n + k).toString()}` : fallback);
  const cells = [
    { label: name(0n, "this epoch"), note: "staked now", bar: "bg-accent-soft", ink: "text-fg" },
    { label: name(1n, "next epoch"), note: "one full epoch", bar: "bg-surface-2", ink: "text-fg" },
    { label: name(2n, "the one after"), note: "earning from here", bar: "bg-accent", ink: "text-accent" },
  ];
  return (
    <figure className="mt-5">
      <ol aria-label="Epoch ruler" className="border-fg max-sm:border-t sm:grid sm:grid-cols-[5fr_5fr_7fr] sm:border-x">
        {cells.map((c, i) => (
          <li key={c.note} className={cx("flex items-center gap-3 border-line py-2 max-sm:border-b sm:block sm:py-0", i > 0 && "sm:border-l sm:border-l-fg", i === 2 && "sm:border-l-2")}>
            <span aria-hidden className={cx("block size-5 shrink-0 border border-fg sm:mt-2 sm:h-6 sm:w-full sm:border-x-0", c.bar)} />
            <span className="min-w-0 sm:block sm:px-2.5 sm:pt-1.5">
              <i className={cx("font-display text-base sm:block", c.ink)}>{c.note}</i>
              <span className={cx("num text-sm font-semibold max-sm:ml-2 sm:block", c.ink)}>{c.label}</span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-[0.8125rem] text-muted"><i className="font-display text-base">Fig. 4.</i> Epoch ruler. Each epoch is one hour, counted on Robinhood Chain.</figcaption>
    </figure>
  );
}

/** Reward in displayed shares; "—" when the quote is unavailable (never the raw amount presented as shares). */
function rewardText(raw: bigint, q: StockQuote | undefined, sym: string) {
  const sh = sharesOf(raw, q);
  return sh === null ? `${DASH} ${sym} (price unavailable)` : `${shares18(sh)} ${sym}`;
}

/** Figure linked to the explorer page that holds the number (invariant: every onchain number links). */
function Fig({ k, v, sub, accent, href }: { k: string; v?: string; sub?: string; accent?: boolean; href?: string }) {
  const value = v ?? <Skeleton w="4rem" />;
  return (
    <div className={cx("border-t-2 pt-2", accent ? "border-accent" : "border-line-strong")}>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="num mt-1 text-lg font-semibold">
        {href && v ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-sm underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg" aria-label={`${k}: ${v}. View on the explorer`}>
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
