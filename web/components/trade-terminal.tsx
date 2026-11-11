"use client";

// Meme terminal (PRD F5): paste a CA, buy with ETH or sell for ETH; a sweep slice lands in the Jar as stock.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getAddress, isAddress, parseEventLogs, type Abi, type Address, type Hex } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi, terraRouterAbi } from "@/lib/abi";
import { CHAIN_ID, DEFAULT_SWEEP_BPS, FEE_BPS, STAKER_FEE_BPS, STOCKS, TF } from "@/lib/config";
import { REGISTRY, memeByToken } from "@/lib/registry";
import { DEPLOYED, WIF, publicClient } from "@/lib/ui-chain";
import { PLAIN } from "@/lib/ui-errors";
import { eth, orDash, parseAmount, shares18, short, token as fmtToken } from "@/lib/ui-format";
import { sharesOf } from "@/lib/ui-report";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { getJson, useApproveStep, useStockQuotes, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, Notice, Panel, Skeleton, TxLink, cx, inputCls } from "./ui";

type Route = { kind: number; v2Path: Address[]; v3Path: Hex; key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address } };
interface BuyQuote { route: Route; tokenOut: string; ethToStock: string; stockOut: string; fee: string; minTokenOut: string; minStockOut: string }
interface SellQuote { route: Route; ethFromSale: string; ethOut: string; minEthOut: string; ethToStock: string; stockOut: string; fee: string; minStockOut: string }

const liq = (t: (typeof REGISTRY.memes)[number]) => Math.max(0, ...t.pools.map((p) => p.liquidityUsd));
const TRENDING = [...REGISTRY.memes].sort((a, b) => liq(b) - liq(a)).slice(0, 12);

function useDebounced<T>(v: T, ms = 400) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

function useTokenInfo(addr?: Address) {
  return useQuery({
    queryKey: ["token-info", addr],
    enabled: !!addr,
    staleTime: Infinity,
    queryFn: async () => {
      const m = memeByToken(addr!);
      if (m) return { symbol: m.symbol, decimals: m.decimals };
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: addr!, abi: erc20Abi, functionName: "symbol" }),
        publicClient.readContract({ address: addr!, abi: erc20Abi, functionName: "decimals" }),
      ]);
      return { symbol, decimals };
    },
  });
}

export function TradeTerminal({ initialToken }: { initialToken?: string }) {
  const tokenAddr = initialToken && isAddress(initialToken) ? getAddress(initialToken) : undefined;
  if (!tokenAddr)
    return (
      <div className="space-y-6">
        <PasteCa />
        {initialToken && <Notice tone="danger">That isn&apos;t a valid token address.</Notice>}
        <Trending wide />
      </div>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <PasteCa current={tokenAddr} />
        <TradeBox token={tokenAddr} key={tokenAddr} />
      </div>
      <Trending current={tokenAddr} />
    </div>
  );
}

function PasteCa({ current }: { current?: Address }) {
  const router = useRouter();
  const [v, setV] = useState(current ?? "");
  const [err, setErr] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isAddress(v.trim())) return setErr(true);
        router.push(`/trade/${getAddress(v.trim())}`);
      }}
    >
      <label htmlFor="ca" className="sr-only">Token contract address</label>
      <input
        id="ca"
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        placeholder="Paste a contract address: 0x…"
        className={cx(inputCls, "font-mono sm:w-auto sm:flex-1")}
        aria-invalid={err}
        aria-describedby={err ? "ca-err" : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit">Load token</Button>
      {err && <p id="ca-err" role="alert" className="text-sm text-danger sm:basis-full">Enter a valid 0x contract address.</p>}
    </form>
  );
}

/** Tracked memes by pool liquidity. `wide` = the page's main body (no token loaded): two columns of rows on lg. */
function Trending({ current, wide = false }: { current?: Address; wide?: boolean }) {
  return (
    <Panel aria-labelledby="trending-title" className="h-fit">
      <h2 id="trending-title" className="font-display text-deck">Trending by liquidity</h2>
      {wide && <p className="mt-1 text-sm text-muted">Pick a meme to load it, or paste any contract address above.</p>}
      {TRENDING.length === 0 ? (
        <p className="mt-3 text-sm text-muted">The list of tracked memes isn&apos;t ready yet. Paste any contract address above.</p>
      ) : (
        <ul className={cx("mt-3 border-t border-fg", wide && "lg:grid lg:grid-cols-2 lg:gap-x-10")}>
          {[{ token: WIF, symbol: "WIF", liq: null as number | null }, ...TRENDING.filter((m) => m.token.toLowerCase() !== WIF.toLowerCase()).map((m) => ({ token: m.token, symbol: m.symbol, liq: liq(m) }))].map((m) => (
            <li key={m.token}>
              <Link
                href={`/trade/${m.token}`}
                aria-current={current?.toLowerCase() === m.token.toLowerCase() ? "page" : undefined}
                className={cx("flex min-h-11 items-center justify-between gap-3 border-b border-line px-2 transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-accent-06 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg", current?.toLowerCase() === m.token.toLowerCase() && "bg-accent-soft shadow-[inset_3px_0_0_var(--accent)]")}
              >
                <span className="font-semibold">{m.symbol === "WIF" ? "$WIF" : m.symbol}</span>
                <span className="num py-1 text-right text-sm text-muted">{m.liq === null ? "buy only: Terra Firma never sells $WIF." : `$${Math.round(m.liq).toLocaleString("en-US")} in pool`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Tabs({ tab, setTab }: { tab: "buy" | "sell"; setTab: (t: "buy" | "sell") => void }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = tab === "buy" ? "sell" : "buy";
      setTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };
  return (
    <div role="tablist" aria-label="Trade side" className="grid grid-cols-2 border-b border-fg" onKeyDown={onKey}>
      {(["buy", "sell"] as const).map((t) => (
        <button
          key={t}
          id={`tab-${t}`}
          role="tab"
          type="button"
          aria-selected={tab === t}
          aria-controls={`panel-${t}`}
          tabIndex={tab === t ? 0 : -1}
          onClick={() => setTab(t)}
          className={cx("-mb-px min-h-11 border-b-[3px] font-display text-xl capitalize transition-[color,border-color] duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg", tab === t ? "border-accent text-fg" : "border-transparent text-muted hover:border-fg hover:text-fg")}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function TradeBox({ token }: { token: Address }) {
  const info = useTokenInfo(token);
  const meme = memeByToken(token);
  const isWif = token.toLowerCase() === WIF.toLowerCase();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const { address } = useAccount();
  const fee = useReadContract({ address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: DEPLOYED && !!address } });
  const feeBps = Number(fee.data ?? FEE_BPS);
  const sym = info.data?.symbol ?? short(token);

  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-title">{info.isLoading ? <Skeleton w="6rem" h="1.6rem" /> : isWif ? "$WIF" : sym}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {meme ? <Badge tone="accent">tracked meme</Badge> : <Badge>not on our list</Badge>}
          {meme?.taxed && <Badge tone="danger">taxed token: can&apos;t trade here</Badge>}
          <AddrLink addr={token} />
        </div>
      </div>
      {info.error && <Notice tone="danger">This address doesn&apos;t look like a token on Robinhood Chain.</Notice>}
      {feeBps === STAKER_FEE_BPS && <Notice tone="accent">0.3% fee unlocked by your $WIF stake.</Notice>}
      <Tabs tab={tab} setTab={setTab} />
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "buy" ? (
          <BuyForm token={token} sym={sym} decimals={info.data?.decimals ?? 18} feeBps={feeBps} disabled={!!meme?.taxed || !!info.error} />
        ) : isWif ? (
          <Notice className="text-base">{PLAIN.WifNotSellable} <Link className="underline underline-offset-4" href="/stake">Stake $WIF</Link></Notice>
        ) : (
          <SellForm token={token} sym={sym} decimals={info.data?.decimals ?? 18} feeBps={feeBps} disabled={!!meme?.taxed || !!info.error} />
        )}
      </div>
    </Panel>
  );
}

/** Sweep slider + stock picker; hidden and forced to 0 for restricted regions. */
function SweepControls({ sweep, setSweep, stock, setStock, restricted }: { sweep: number; setSweep: (n: number) => void; stock: string; setStock: (s: string) => void; restricted: boolean }) {
  if (restricted) return <Notice tone="warn">{GEO_BLOCKED} Your trade still works; the Jar slice is off.</Notice>;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sweep" className="flex justify-between text-sm">
          <span className="text-muted">Slice to your Jar</span>
          <span className="num font-semibold">{(sweep / 100).toFixed(1)}%</span>
        </label>
        <input id="sweep" type="range" min={0} max={1000} step={50} value={sweep} onChange={(e) => setSweep(Number(e.target.value))} className="mt-2 h-11 w-full cursor-pointer accent-[var(--accent)]" aria-valuetext={`${(sweep / 100).toFixed(1)} percent`} />
      </div>
      <StockSelect value={stock} onChange={setStock} label="Jar stock" name="sweep-stock" />
    </div>
  );
}

function useTradeResult() {
  const market = useStockQuotes();
  return (logs: Parameters<typeof parseEventLogs>[0]["logs"]) => {
    const evs = parseEventLogs({ abi: terraRouterAbi, logs });
    const traded = evs.find((e) => e.eventName === "Traded");
    const swept = evs.find((e) => e.eventName === "Swept");
    const q = swept ? market.data?.[Number(swept.args.stockId)] : undefined;
    return {
      tokenAmount: traded?.eventName === "Traded" ? traded.args.tokenAmount : undefined,
      ethAmount: traded?.eventName === "Traded" ? traded.args.ethAmount : undefined,
      fee: traded?.eventName === "Traded" ? traded.args.fee : undefined,
      // Always reported when a sweep happened; shares are null (shown "—") if the quote is not loaded (N4).
      stock: swept?.eventName === "Swept" ? { sym: STOCKS[Number(swept.args.stockId)].symbol, shares: sharesOf(swept.args.stockOut, q), hash: swept.transactionHash } : undefined,
    };
  };
}

type TradeResult = ReturnType<ReturnType<typeof useTradeResult>>;

function ResultBox({ r, sym, decimals, isBuy }: { r: TradeResult; sym: string; decimals: number; isBuy: boolean }) {
  return (
    <ul className="space-y-1">
      {isBuy && r.tokenAmount !== undefined && <li>Received <strong className="num">{fmtToken(r.tokenAmount, decimals)} {sym}</strong> in your wallet.</li>}
      {!isBuy && r.ethAmount !== undefined && <li>Sold for <strong className="num">{eth(r.ethAmount)} ETH</strong> gross.</li>}
      {r.stock && <li><strong className="num">{orDash(r.stock.shares, shares18)} {r.stock.sym}</strong> went to your <Link href="/jar" className="underline underline-offset-4">Jar</Link>.</li>}
      {r.fee !== undefined && <li><span className="num">{eth(r.fee)} ETH</span> fee went to the <AddrLink addr={TF.FeePool}>fee pool</AddrLink> (burns $WIF, pays stakers).</li>}
    </ul>
  );
}

function BuyForm({ token, sym, decimals, feeBps, disabled }: { token: Address; sym: string; decimals: number; feeBps: number; disabled: boolean }) {
  const { address } = useAccount();
  const ethBal = useBalance({ address, chainId: CHAIN_ID, query: { enabled: !!address } });
  const [amt, setAmt] = useState("");
  const [sweepRaw, setSweep] = useState(DEFAULT_SWEEP_BPS);
  const [stock, setStock] = useState("NVDA");
  const gate = useStockGate();
  const restricted = gate.status === "restricted";
  const sweep = restricted ? 0 : sweepRaw;
  const wei = parseAmount(amt, 18);
  const dWei = useDebounced(wei?.toString() ?? "");
  const buyOpts = {
    queryKey: ["quote", "buy", token, dWei, sweep, stock, feeBps],
    queryFn: () => getJson<BuyQuote>(`/api/quote?token=${token}&side=buy&amount=${dWei}&sweepBps=${sweep}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 15_000,
    retry: 1,
  };
  const q = useQuery({ ...buyOpts, enabled: !!dWei && dWei !== "0" });
  const market = useStockQuotes();
  const sq = market.data?.find((s) => s.symbol === stock);
  const tx = useTx();
  const qc = useQueryClient();
  const parse = useTradeResult();
  const [result, setResult] = useState<TradeResult | null>(null);
  const over = wei !== null && ethBal.data && wei > ethBal.data.value;
  const stale = q.data && dWei !== (wei?.toString() ?? "");

  const send = async () => {
    if (!q.data || !wei) return;
    const sid = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([
      {
        label: `Buy ${sym}`,
        // Fresh quote right before signing (S2); the step label shows the exact minimum the user signs.
        build: async () => {
          const f = await qc.fetchQuery({ ...buyOpts, staleTime: 0 });
          return {
            label: `Buy ${sym}, at least ${fmtToken(f.minTokenOut, decimals)} ${sym}`,
            call: { address: TF.TerraRouter, abi: terraRouterAbi as unknown as Abi, functionName: "buy", args: [f.route, token, sweep, sid, BigInt(f.minTokenOut), BigInt(f.minStockOut)], value: wei },
          };
        },
      },
    ]);
    if (r) {
      setResult(parse(r.logs));
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      ethBal.refetch();
    }
  };
  const submit = () => (sweep > 0 ? gate.gate(send) : send());

  return (
    <div className="space-y-5">
      {gate.dialog}
      <div>
        <label htmlFor="buy-amt" className="flex justify-between text-sm text-muted">
          <span>Pay (ETH)</span>
          {ethBal.data && <span className="num">Balance {eth(ethBal.data.value)}</span>}
        </label>
        <input id="buy-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} placeholder="0.003" className={cx(inputCls, "num mt-2 text-lg")} aria-invalid={amt !== "" && wei === null} />
      </div>
      <SweepControls sweep={sweep} setSweep={setSweep} stock={stock} setStock={setStock} restricted={restricted} />
      <div aria-live="polite" className="min-h-14">
        {q.isFetching && !q.data && <Skeleton w="100%" h="3rem" className="block" />}
        {q.error && <Notice tone="danger">{(q.error as Error).message}</Notice>}
        {q.data && (
          <Notice className={cx(stale && "opacity-60")}>
            Buy ≈ <strong className="num">{fmtToken(q.data.tokenOut, decimals)} {sym}</strong>
            {sweep > 0 && (
              <> · {(sweep / 100).toFixed(1)}% (<span className="num">{eth(q.data.ethToStock)} ETH</span>) goes to your Jar as {stock} ≈ <span className="num">{orDash(sharesOf(BigInt(q.data.stockOut), sq), shares18)}</span></>
            )}{" "}
            · {(feeBps / 100).toFixed(1)}% fee (<span className="num">{eth(q.data.fee)} ETH</span>) builds the $WIF burn.
            <span className="mt-1 block text-xs text-muted">At least <span className="num">{fmtToken(q.data.minTokenOut, decimals)} {sym}</span> or nothing happens. Re-quoted right before you sign.</span>
          </Notice>
        )}
      </div>
      {over && <p className="text-sm text-danger">That&apos;s more ETH than your wallet holds.</p>}
      {sweep > 0 && <GeoLoadingNote status={gate.status} />}
      <Button className="w-full" onClick={submit} disabled={!DEPLOYED || !address || disabled || !q.data || !!stale || !!over || tx.busy || (sweep > 0 && gate.status === "loading")}>
        {!DEPLOYED ? "Opens when contracts are live" : !address ? "Connect a wallet to trade" : tx.busy ? "Working…" : `Buy ${sym}`}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={result ? <ResultBox r={result} sym={sym} decimals={decimals} isBuy /> : "Done."} />
    </div>
  );
}

function SellForm({ token, sym, decimals, feeBps, disabled }: { token: Address; sym: string; decimals: number; feeBps: number; disabled: boolean }) {
  const { address } = useAccount();
  const bal = useReadContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address } });
  const [amt, setAmt] = useState("");
  const [sweepRaw, setSweep] = useState(DEFAULT_SWEEP_BPS);
  const [stock, setStock] = useState("NVDA");
  const gate = useStockGate();
  const restricted = gate.status === "restricted";
  const sweep = restricted ? 0 : sweepRaw;
  const raw = useMemo(() => parseAmount(amt, decimals), [amt, decimals]);
  const dRaw = useDebounced(raw?.toString() ?? "");
  const sellOpts = {
    queryKey: ["quote", "sell", token, dRaw, sweep, stock, feeBps],
    queryFn: () => getJson<SellQuote>(`/api/quote?token=${token}&side=sell&amount=${dRaw}&sweepBps=${sweep}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 15_000,
    retry: 1,
  };
  const q = useQuery({ ...sellOpts, enabled: !!dRaw && dRaw !== "0" });
  const market = useStockQuotes();
  const sq = market.data?.find((s) => s.symbol === stock);
  const tx = useTx();
  const approve = useApproveStep();
  const qc = useQueryClient();
  const parse = useTradeResult();
  const [result, setResult] = useState<TradeResult | null>(null);
  const over = raw !== null && bal.data !== undefined && raw > bal.data;
  const stale = q.data && dRaw !== (raw?.toString() ?? "");

  const send = async () => {
    if (!q.data || !raw) return;
    const sid = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([
      approve(token, TF.TerraRouter, raw, sym),
      {
        label: `Sell ${sym}`,
        // Re-quote after the approval, right before the sell signature (S2).
        build: async () => {
          const f = await qc.fetchQuery({ ...sellOpts, staleTime: 0 });
          return {
            label: `Sell ${sym}, at least ${eth(f.minEthOut)} ETH back`,
            call: { address: TF.TerraRouter, abi: terraRouterAbi as unknown as Abi, functionName: "sell", args: [f.route, token, raw, sweep, sid, BigInt(f.minEthOut), BigInt(f.minStockOut)] },
          };
        },
      },
    ]);
    if (r) {
      setResult(parse(r.logs));
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      bal.refetch();
    }
  };
  const submit = () => (sweep > 0 ? gate.gate(send) : send());

  return (
    <div className="space-y-5">
      {gate.dialog}
      <div>
        <label htmlFor="sell-amt" className="flex justify-between text-sm text-muted">
          <span>Sell ({sym})</span>
          {bal.data !== undefined && (
            <button type="button" className="num min-h-11 underline underline-offset-4 hover:text-fg sm:min-h-0" onClick={() => setAmt(fmtExact(bal.data!, decimals))}>
              Max {fmtToken(bal.data, decimals)}
            </button>
          )}
        </label>
        <input id="sell-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} placeholder="0.0" className={cx(inputCls, "num mt-2 text-lg")} aria-invalid={amt !== "" && raw === null} />
      </div>
      <SweepControls sweep={sweep} setSweep={setSweep} stock={stock} setStock={setStock} restricted={restricted} />
      <div aria-live="polite" className="min-h-14">
        {q.isFetching && !q.data && <Skeleton w="100%" h="3rem" className="block" />}
        {q.error && <Notice tone="danger">{(q.error as Error).message}</Notice>}
        {q.data && (
          <Notice className={cx(stale && "opacity-60")}>
            You get ≈ <strong className="num">{eth(q.data.ethOut)} ETH</strong>
            {sweep > 0 && <> · <span className="num">{eth(q.data.ethToStock)} ETH</span> goes to your Jar as {stock} ≈ <span className="num">{orDash(sharesOf(BigInt(q.data.stockOut), sq), shares18)}</span></>} · fee{" "}
            <span className="num">{eth(q.data.fee)} ETH</span> builds the $WIF burn.
            <span className="mt-1 block text-xs text-muted">At least <span className="num">{eth(q.data.minEthOut)} ETH</span> or nothing happens. Re-quoted right before you sign.</span>
          </Notice>
        )}
      </div>
      {over && <p className="text-sm text-danger">That&apos;s more than your balance.</p>}
      {sweep > 0 && <GeoLoadingNote status={gate.status} />}
      <Button className="w-full" onClick={submit} disabled={!DEPLOYED || !address || disabled || !q.data || !!stale || over || tx.busy || (sweep > 0 && gate.status === "loading")}>
        {!DEPLOYED ? "Opens when contracts are live" : !address ? "Connect a wallet to trade" : tx.busy ? "Working…" : `Approve and sell ${sym}`}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={result ? <ResultBox r={result} sym={sym} decimals={decimals} isBuy={false} /> : "Done."} />
      {tx.state.hash && tx.state.phase === "done" && <p className="text-xs text-muted">Last tx: <TxLink hash={tx.state.hash} /></p>}
    </div>
  );
}

/** Exact decimal string for a raw balance (Max button must not round). */
function fmtExact(raw: bigint, decimals: number) {
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
