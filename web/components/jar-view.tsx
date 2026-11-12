"use client";
import Link from "next/link";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { formatUnits, parseUnits, type Abi, type Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { jarAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { DASH, dateTime, orDash, shares18, sig4, usd } from "@/lib/ui-format";
import { blockTimes, only, savingEventsOf, streakDays } from "@/lib/ui-logs";
import { sharesOf, sumKnown, usdOf, type StockQuote } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { useMounted, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, LinkButton, Notice, Panel, Skeleton, TextLink, TxLink, inputCls, isZeroLink } from "./ui";

export const SOURCE: Record<number, string> = { 1: "convert", 2: "sweep", 3: "staking reward", 4: "deposit" };

const PLATE = "plate-lit -mx-2 px-5 py-7 sm:-mx-4 sm:px-10 sm:py-10";
/** Bedrock slabs are cream-on-moss in both themes: re-point the ink tokens for everything inside one (links, inputs, buttons, focus). */
const ROCK_INK =
  "[--fg:#f3eddf] [--line-strong:#f3eddf] [--muted:color-mix(in_oklab,#f3eddf_76%,transparent)] [--line:color-mix(in_oklab,#f3eddf_24%,transparent)] " +
  "[--accent:#b9d6c0] [--accent-strong:#d3e6d8] [--accent-fg:#17140f] [--accent-soft:rgb(185_214_192/0.18)] [--accent-06:rgb(185_214_192/0.08)] [--accent-32:rgb(185_214_192/0.32)] " +
  "[--surface:color-mix(in_oklab,#000_22%,transparent)] [--surface-2:color-mix(in_oklab,#f3eddf_14%,transparent)] [--danger:#f2b49c] [--danger-soft:rgb(242_180_156/0.14)]";

/** Display figure under a mono eyebrow; links to the explorer page holding the number when it has one. */
function HeroFig({ k, sub, href, hero, children }: { k: string; sub?: string; href?: string; hero?: boolean; children: ReactNode }) {
  const size = hero ? "text-[clamp(4rem,2.4rem+5vw,7.5rem)]" : "text-[clamp(2.5rem,2rem+1.8vw,3.75rem)]";
  const fig = <span className={`num block font-display leading-[0.86] tracking-[-0.03em] [overflow-wrap:anywhere] ${size}`}>{children}</span>;
  return (
    <div className="min-w-0">
      <p className="eyebrow text-muted">{k}</p>
      {href && !isZeroLink(href) ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-sm decoration-accent-32 decoration-2 underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg">
          {fig}
          <span className="sr-only">View on the explorer</span>
        </a>
      ) : (
        <div className="mt-3">{fig}</div>
      )}
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function JarView() {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!mounted) return <Skeleton w="100%" h="12rem" className="block" />;
  if (!address)
    return (
      <div className="grid items-start gap-x-16 gap-y-12 lg:grid-cols-2">
        <section aria-label="Open your Jar" className={PLATE}>
          <p className="eyebrow text-accent">Bedrock vault</p>
          <p className="mt-3 font-display text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[1]">Your dead memes go in. <em className="text-accent">Real stock comes out.</em></p>
          <p className="mt-4 max-w-[44ch] text-[1.0625rem] leading-relaxed text-fg/85">
            The Jar holds the stock tokens you sweep into: NVDA, TSLA, SPY and more. An ownerless contract keeps them; only you can withdraw.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ConnectButton label="Connect to open your Jar" />
            <Link href="/#check" className="inline-flex min-h-11 items-center font-semibold underline decoration-accent underline-offset-4 hover:text-accent">First, see what your bag cost you →</Link>
          </div>
        </section>
        <div className="border-t-[3px] border-double border-line-strong pt-5 lg:mt-8">
          <p className="eyebrow mb-3 text-muted">What a Jar can hold</p>
          <ul className="columns-2 gap-8 text-[1.0625rem]">
            {STOCKS.map((s) => (
              <li key={s.symbol} className="break-inside-avoid border-b border-line py-2.5"><span className="font-display text-[1.625rem] leading-none">{s.symbol}</span> <span className="text-sm text-muted">{s.name}</span></li>
            ))}
          </ul>
        </div>
      </div>
    );
  return <Jar user={address} />;
}

/** The Jar before there is anything to show: the layers it can hold, unfilled. No figures stand in for missing reads. */
function JarShape() {
  return (
    <section aria-labelledby="shape-title" className="border-t-[3px] border-double border-line-strong pt-5">
      <p className="eyebrow text-muted">Unfilled layers</p>
      <h2 id="shape-title" className="mt-2 font-display text-deck">Balances</h2>
      <p className="mt-1 text-sm text-muted">{DEPLOYED ? "Connect a wallet to read your balances from the Jar contract." : "Balances are read from the Jar contract once it is live on Robinhood Chain."}</p>
      <ul className="mt-6">
        {STOCKS.map((s) => (
          <li key={s.symbol} className="slab slab-sieve flex flex-wrap items-baseline gap-x-4 px-7 pt-6 pb-12 last:pb-6 sm:px-10">
            <span className="font-display text-[2rem] leading-none">{s.symbol}</span>
            <span className="text-sm text-muted">{s.name}</span>
            <span className="eyebrow ml-auto text-muted">empty layer</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useJarBalances(user: Address) {
  return useReadContracts({
    contracts: STOCKS.map((s) => ({ address: TF.Jar, abi: jarAbi, functionName: "balanceOf", args: [user, s.token], chainId: CHAIN_ID }) as const),
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
}

/** Consecutive UTC days (ending today, or yesterday if today has none yet) with a sweep, convert or deposit. */
function useStreak(user: Address) {
  const logs = useTfLogs();
  return useQuery({
    queryKey: ["streak", user, logs.data?.head.toString()],
    enabled: !!logs.data,
    queryFn: async () => {
      const mine = savingEventsOf(logs.data!.router, user);
      if (mine.length === 0) return 0;
      const t = await blockTimes(mine.map((l) => l.blockNumber));
      return streakDays([...t.values()], Date.now());
    },
  });
}

function QuicknodeBadge() {
  const q = useQuery({ queryKey: ["qn-jar"], queryFn: async () => (await fetch("/api/qn-jar")).json() as Promise<{ enabled: boolean; agreement?: boolean }>, enabled: DEPLOYED, staleTime: 120_000 });
  if (!q.data?.enabled || q.data.agreement === undefined) return null;
  return q.data.agreement ? <Badge tone="accent">Verified by Quicknode Stock Token API</Badge> : <Badge tone="warn">Quicknode&apos;s count differs from the direct chain read</Badge>;
}

function Jar({ user }: { user: Address }) {
  const bals = useJarBalances(user);
  const market = useStockQuotes();
  const streak = useStreak(user);
  const rows = STOCKS.map((s, i) => {
    const raw = (bals.data?.[i]?.result as bigint | undefined) ?? 0n;
    const q = market.data?.[i];
    return { s, raw, q, usd: raw === 0n ? 0 : usdOf(raw, q) };
  });
  // Unknown price on any held stock = unknown total. Never summed from a guess.
  const total = sumKnown(rows.map((r) => r.usd));
  const loaded = !!bals.data && !!market.data;
  const empty = loaded && rows.every((r) => r.raw === 0n);

  return (
    <div className="space-y-14">
      <section aria-label="Jar value" className={PLATE}>
        <div className="flex flex-wrap items-center gap-2">
          <QuicknodeBadge />
          <TextLink href={`/jar/report/${user}`} className="text-sm">Weekly report</TextLink>
        </div>
        <div className="mt-6 grid items-end gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <HeroFig
            k="Jar value"
            href={DEPLOYED ? addrUrl(TF.Jar) : undefined}
            sub={loaded && total === null ? "A live stock price is unavailable right now" : "Chainlink live prices"}
            hero
          >
            {!DEPLOYED ? "Not live yet" : loaded ? orDash(total, usd) : bals.error || market.error ? <span className="font-sans text-base text-danger">couldn&apos;t read the chain</span> : <Skeleton w="16rem" h="5rem" />}
          </HeroFig>
          <HeroFig k="Saving streak" sub="UTC days with a sweep or convert">
            {!DEPLOYED ? "—" : streak.data === undefined ? <Skeleton w="6rem" h="3rem" /> : `${streak.data} day${streak.data === 1 ? "" : "s"}`}
          </HeroFig>
        </div>
        {!DEPLOYED && <Notice className="mt-6">Your Jar opens when the Terra Firma contracts are live on Robinhood Chain.</Notice>}
        {empty && (
          <div className="mt-8 flex flex-col items-start gap-4 border-t-[3px] border-double border-line-strong pt-6">
            <p className="max-w-[30ch] font-display text-deck">Nothing on bedrock yet. Convert a meme or make a trade to lay the first layer.</p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/app">See your Hindsight card</LinkButton>
              <LinkButton href="/trade" variant="secondary">Trade a meme</LinkButton>
            </div>
          </div>
        )}
      </section>
      {!DEPLOYED && <JarShape />}
      {DEPLOYED && !empty && (
        <section aria-labelledby="bal-title">
          <p className="eyebrow text-accent">Bedrock · what you own</p>
          <h2 id="bal-title" className="mt-2 font-display text-deck">Balances</h2>
          <ul className="mt-6">
            {rows.filter((r) => !loaded || r.raw > 0n).map((r) => (
              <BalanceRow key={r.s.symbol} stock={r.s} raw={r.raw} q={r.q} loaded={loaded} onDone={() => bals.refetch()} />
            ))}
          </ul>
        </section>
      )}
      <History user={user} />
    </div>
  );
}

function BalanceRow({ stock, raw, q, loaded, onDone }: { stock: (typeof STOCKS)[number]; raw: bigint; q?: StockQuote; loaded: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const tx = useTx();
  const qc = useQueryClient();
  const sharesRaw = sharesOf(raw, q);
  const toRaw = (s: string) => {
    if (!q?.multiplier || !/^\d*\.?\d+$/.test(s.trim())) return null;
    const want = parseUnits(s.trim(), 18);
    const r = (want * 10n ** 18n) / q.multiplier;
    return r > raw ? null : r;
  };
  const amountRaw = amt === "max" ? raw : toRaw(amt);
  const withdraw = async () => {
    if (!amountRaw) return;
    const r = await tx.run([{ label: `Withdraw ${stock.symbol}`, call: { address: TF.Jar, abi: jarAbi as unknown as Abi, functionName: "withdraw", args: [stock.token, amountRaw] } }]);
    if (r) {
      onDone();
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      setAmt("");
    }
  };
  return (
    <li className={`slab slab-rock ${ROCK_INK} px-7 pt-7 pb-14 last:pb-7 sm:px-10`}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p><span className="font-display text-[2.5rem] leading-none">{stock.symbol}</span> <span className="text-muted">{stock.name}</span></p>
          <p className="num mt-1 font-mono text-xs text-muted">
            {loaded ? (
              <>
                <AddrLink addr={TF.Jar}>{orDash(sharesRaw, shares18)} shares</AddrLink> · <AddrLink addr={stock.liveFeed}>{q?.price8 != null ? usd(Number(formatUnits(q.price8, 8))) : `${DASH} (price unavailable)`}</AddrLink> each
              </>
            ) : (
              <Skeleton w="10rem" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="num font-display text-[clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-none">{loaded ? orDash(usdOf(raw, q), usd) : <Skeleton w="7rem" h="2.5rem" />}</span>
          <Button variant="secondary" aria-expanded={open} aria-controls={`wd-${stock.symbol}`} onClick={() => setOpen((o) => !o)} disabled={raw === 0n}>Withdraw</Button>
        </div>
      </div>
      {open && (
        <div id={`wd-${stock.symbol}`} className="mt-5 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`wd-in-${stock.symbol}`} className="sr-only">Shares to withdraw</label>
            <input id={`wd-in-${stock.symbol}`} inputMode="decimal" value={amt === "max" ? (sharesRaw === null ? "" : sig4(Number(formatUnits(sharesRaw, 18)))) : amt} onChange={(e) => setAmt(e.target.value)} placeholder="Shares" className={`${inputCls} num sm:flex-1`} aria-invalid={amt !== "" && !amountRaw} />
            <Button variant="secondary" onClick={() => setAmt("max")} disabled={sharesRaw === null}>Max</Button>
            <Button onClick={withdraw} disabled={!amountRaw || tx.busy}>{tx.busy ? "Working…" : "Withdraw to wallet"}</Button>
          </div>
          <p className="text-xs text-muted">Sends the real {stock.symbol} Stock Token to your wallet.</p>
          <TxStatus state={tx.state} onReset={tx.reset} success={`Withdrawn. The ${stock.symbol} is in your wallet.`} />
        </div>
      )}
    </li>
  );
}

function History({ user }: { user: Address }) {
  const logs = useTfLogs();
  const market = useStockQuotes();
  const mine = (logs.data?.jar ?? []).filter((l) => l.args.user.toLowerCase() === user.toLowerCase()).reverse();
  const times = useQuery({ queryKey: ["jar-times", user, mine.length], enabled: mine.length > 0, queryFn: () => blockTimes(mine.slice(0, 30).map((l) => l.blockNumber)) });
  const credited = only(mine, "Credited");
  const bySource = new Map<number, number | null>();
  for (const c of credited) {
    const i = STOCKS.findIndex((s) => s.token.toLowerCase() === c.args.stock.toLowerCase());
    const v = usdOf(c.args.amount, market.data?.[i]);
    const prev = bySource.get(c.args.source);
    bySource.set(c.args.source, v === null || prev === null ? null : (prev ?? 0) + v);
  }
  if (!DEPLOYED) return null;
  return (
    <Panel aria-labelledby="hist-title">
      <p className="eyebrow text-muted">Core log · every credit and withdrawal</p>
      <h2 id="hist-title" className="mt-2 font-display text-deck">Where your stock came from</h2>
      {logs.isLoading ? (
        <Skeleton w="100%" h="4rem" className="mt-3 block" />
      ) : logs.error ? (
        <Notice tone="danger" className="mt-3">Couldn&apos;t read your Jar&apos;s history from the chain. Retrying.</Notice>
      ) : mine.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No Jar activity yet. Your first sweep or convert starts the log.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...bySource.entries()].map(([s, v]) => (
              <li key={s}><Badge tone="accent">{SOURCE[s] ?? `source ${s}`}: {v === null ? `${DASH} (price unavailable)` : <>{usd(v)} at today&apos;s price</>}</Badge></li>
            ))}
          </ul>
          <ul className="well-bore mt-5 divide-y divide-line px-5 py-2 text-sm sm:px-7">
            {mine.slice(0, 30).map((l) => {
              const s = STOCKS.find((x) => x.token.toLowerCase() === l.args.stock.toLowerCase());
              const q = s && market.data?.[s.id];
              const ts = times.data?.get(l.blockNumber);
              return (
                <li key={`${l.transactionHash}-${l.logIndex}`} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span>
                    {l.eventName === "Credited" ? `+ ${SOURCE[l.args.source] ?? "credit"}` : "− withdraw"}{" "}
                    <span className="num font-semibold">{market.data ? orDash(sharesOf(l.args.amount, q), shares18) : "…"} {s?.symbol}</span>
                  </span>
                  <span className="flex items-center gap-3 text-muted">
                    <span className="num text-xs">{ts ? dateTime(ts) : <Skeleton w="7rem" />}</span>
                    <TxLink hash={l.transactionHash} className="inline-flex min-h-11 items-center" />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
