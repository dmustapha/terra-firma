// File: scripts/proof.ts
// Regenerates submission/proof.md and web/data/proof.json from chain: every TerraRouter / Jar / FeePool / WifStaking /
// HindsightLens event since the deployment block, plus an independent $WIF burn check (WIF Transfer FeePool -> 0x0)
// and FeePool.totalWifBurned(). Refuses (exit 1) when there is no live deployment; nothing is ever estimated.
// Run: pnpm tsx scripts/proof.ts
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { decodeEventLog, formatEther, pad, type Abi, type Address, type Hex } from "viem";
import { feePoolAbi, hindsightLensAbi, jarAbi, terraRouterAbi, wifStakingAbi } from "../web/lib/abi";
import { ADDR, EXPLORER, STOCKS } from "../web/lib/config";
import { ROOT, WEB_DATA } from "./lib/env";
import { CONTRACT_NAMES, loadDeployments, writeJson, type Deployments } from "./lib/files";
import { client, getLogsMany, headBlock, spans, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
type Ev = { contract: string; name: string; args: Record<string, unknown>; tx: Hex; block: number; logIndex: number };

async function events(d: Deployments, head: number): Promise<Ev[]> {
  const sources: [string, Address, Abi][] = [
    ["TerraRouter", d.TerraRouter, terraRouterAbi],
    ["Jar", d.Jar, jarAbi],
    ["FeePool", d.FeePool, feePoolAbi],
    ["WifStaking", d.WifStaking, wifStakingAbi],
    ["HindsightLens", d.HindsightLens, hindsightLensAbi],
  ];
  const out: Ev[] = [];
  for (const [contract, address, abi] of sources) {
    const logs = await getLogsMany(spans(d.block, head, 10_000_000).map(([from, to]) => ({ address, topics: [], from, to })));
    for (const l of logs) {
      const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]], strict: false });
      out.push({ contract, name: ev.eventName ?? "?", args: (ev.args ?? {}) as Record<string, unknown>, tx: l.transactionHash, block: Number(l.blockNumber), logIndex: Number(l.logIndex) });
    }
  }
  return out.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
}

async function wifBurnTransfers(d: Deployments, head: number): Promise<Log[]> {
  const topics = [TRANSFER, pad(d.FeePool), pad("0x0000000000000000000000000000000000000000")];
  return getLogsMany(spans(d.block, head, 10_000_000).map(([from, to]) => ({ address: ADDR.wif as Address, topics, from, to })));
}

const big = (v: unknown) => (typeof v === "bigint" ? v : 0n);
const sum = (evs: Ev[], name: string, field: string) => evs.filter((e) => e.name === name).reduce((s, e) => s + big(e.args[field]), 0n);
const first = (evs: Ev[], name: string, pred: (e: Ev) => boolean = () => true) => evs.find((e) => e.name === name && pred(e))?.tx ?? null;

function totals(evs: Ev[], burnLogs: Log[], onchainBurned: bigint) {
  const streamed = STOCKS.map((s) => evs.filter((e) => e.name === "Distributed").reduce((t, e) => t + big((e.args.stockBought as bigint[])[s.id]), 0n));
  const burnedByTransfer = burnLogs.reduce((s, l) => s + BigInt(l.data), 0n);
  const burnedByEvent = sum(evs, "Distributed", "wifBurned");
  return {
    trades: evs.filter((e) => e.name === "Traded").length,
    routedEthWei: sum(evs, "Traded", "ethAmount").toString(),
    tradeFeesWei: sum(evs, "Traded", "fee").toString(),
    feePoolReceivedWei: sum(evs.filter((e) => e.contract === "FeePool"), "Received", "amount").toString(),
    sweeps: evs.filter((e) => e.name === "Swept").length,
    converts: evs.filter((e) => e.name === "Converted").length,
    distributions: evs.filter((e) => e.name === "Distributed").length,
    wifBurnedWei: { byEvent: burnedByEvent.toString(), byTransferToZero: burnedByTransfer.toString(), feePoolTotal: onchainBurned.toString() },
    burnConsistent: burnedByEvent === burnedByTransfer && burnedByEvent === onchainBurned,
    stockStreamed: Object.fromEntries(STOCKS.map((s) => [s.symbol, streamed[s.id].toString()])),
    jars: new Set(evs.filter((e) => e.name === "Credited").map((e) => String(e.args.user).toLowerCase())).size,
    claims: evs.filter((e) => e.name === "Claimed").length,
    claimedWei: sum(evs, "Claimed", "amount").toString(),
    cardsMinted: evs.filter((e) => e.name === "CardMinted").length,
  };
}

function firsts(evs: Ev[]) {
  return {
    trade: first(evs, "Traded"),
    convert: first(evs, "Converted"),
    sweepTrade: first(evs, "Swept"),
    distributeWithBurn: first(evs, "Distributed", (e) => big(e.args.wifBurned) > 0n),
    stake: first(evs, "Staked"),
    claim: first(evs, "Claimed"),
    cardMint: first(evs, "CardMinted"),
  };
}

function markdown(d: Deployments, head: number, t: ReturnType<typeof totals>, f: ReturnType<typeof firsts>): string {
  const tx = (h: string | null) => (h ? `[\`${h}\`](${EXPLORER}/tx/${h})` : "not yet (no such event onchain)");
  const contracts = CONTRACT_NAMES.map((n) => `| ${n} | [\`${d[n]}\`](${EXPLORER}/address/${d[n]}) |`).join("\n");
  const streamed = Object.entries(t.stockStreamed).map(([s, v]) => `${s} ${formatEther(BigInt(v))}`).join(", ");
  return `# Terra Firma: onchain proof (Robinhood Chain mainnet 4663)

Generated ${new Date().toISOString()} by \`pnpm tsx scripts/proof.ts\` from RPC logs, deployment block ${d.block} to head ${head}. Every number below is a sum of onchain events; rerun the script to recompute.

## Contracts
| Contract | Address |
|---|---|
${contracts}

## First-of-kind transactions
| Event | Tx |
|---|---|
| First routed trade (Traded) | ${tx(f.trade)} |
| First convert (Converted) | ${tx(f.convert)} |
| First sweep trade (Swept) | ${tx(f.sweepTrade)} |
| First Distributed with WIF burn | ${tx(f.distributeWithBurn)} |
| First stake (Staked) | ${tx(f.stake)} |
| First staker claim (Claimed) | ${tx(f.claim)} |
| First card mint (CardMinted) | ${tx(f.cardMint)} |

## Totals
| Metric | Value |
|---|---|
| Routed trades | ${t.trades} |
| Routed ETH (Traded.ethAmount) | ${formatEther(BigInt(t.routedEthWei))} ETH |
| Trade fees (Traded.fee) | ${formatEther(BigInt(t.tradeFeesWei))} ETH |
| ETH received by FeePool (all fees) | ${formatEther(BigInt(t.feePoolReceivedWei))} ETH |
| Sweeps / converts | ${t.sweeps} / ${t.converts} |
| Distributions | ${t.distributions} |
| WIF burned (Distributed events) | ${formatEther(BigInt(t.wifBurnedWei.byEvent))} |
| WIF burned (WIF Transfer FeePool -> 0x0) | ${formatEther(BigInt(t.wifBurnedWei.byTransferToZero))} |
| WIF burned (FeePool.totalWifBurned) | ${formatEther(BigInt(t.wifBurnedWei.feePoolTotal))} |
| Burn sources agree | ${t.burnConsistent ? "yes" : "NO, investigate"} |
| Stock streamed to stakers | ${streamed} |
| Jars (distinct credited users) | ${t.jars} |
| Staker claims | ${t.claims} (${formatEther(BigInt(t.claimedWei))} stock) |
| Cards minted | ${t.cardsMinted} |
`;
}

async function main() {
  const d = loadDeployments();
  if (!d) throw new Error("no live deployment in web/data/deployments.json (run contracts deploy + scripts/sync-deployments.mjs)");
  const head = await headBlock();
  const [evs, burnLogs, onchainBurned] = await Promise.all([
    events(d, head),
    wifBurnTransfers(d, head),
    client.readContract({ address: d.FeePool, abi: feePoolAbi, functionName: "totalWifBurned" }),
  ]);
  const t = totals(evs, burnLogs, onchainBurned);
  const f = firsts(evs);
  mkdirSync(path.join(ROOT, "submission"), { recursive: true });
  writeFileSync(path.join(ROOT, "submission", "proof.md"), markdown(d, head, t, f));
  writeJson(path.join(WEB_DATA, "proof.json"), { generatedAt: new Date().toISOString(), chainId: 4663, fromBlock: d.block, head, contracts: Object.fromEntries(CONTRACT_NAMES.map((n) => [n, d[n]])), firsts: f, totals: t });
  console.log(`wrote submission/proof.md + web/data/proof.json: ${evs.length} events, trades ${t.trades}, distributions ${t.distributions}, burn consistent ${t.burnConsistent}`);
  if (!t.burnConsistent) process.exit(1);
}

main().catch((e) => {
  console.error(`proof FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
