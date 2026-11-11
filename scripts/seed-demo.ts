// File: scripts/seed-demo.ts
// Earns the PRD §6 demo state with REAL mainnet transactions from the demo wallet (never fabricated). Idempotent: every
// step reads chain state first and skips when already satisfied.
//   a) buy 3 memes (top liquidity, tested) ~0.0005 ETH each via TerraRouter.buy, sweep 0
//   b) one convert of one meme into NVDA         c) two buys with sweep 2% (NVDA)
//   d) hold >= 500 WIF (buy ~600 via TerraRouter.buy on the WIF key if short) and stake 500 to NVDA (approve exact)
//   e) print what remains (epoch wait, keeper)
// Env: RPC_URL (optional), DEMO_KEY (0x private key; not needed with --dry, DEMO_ADDR then picks the wallet to inspect).
// Run: pnpm tsx scripts/seed-demo.ts [--dry]
import { createWalletClient, encodeEventTopics, formatEther, formatUnits, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood } from "viem/chains";
import { erc20Abi, terraRouterAbi, wifStakingAbi } from "../web/lib/abi";
import { ADDR, FEE_BPS } from "../web/lib/config";
import type { Meme, PoolEntry } from "../web/lib/registry";
import { hasFlag } from "./lib/env";
import { loadDeployments, loadRegistry, type Deployments } from "./lib/files";
import { bestQuote, type BestQuote, type Route } from "./lib/quote";
import { client, getLogsMany, headBlock, transports } from "./lib/rpc";

const BUY_ETH = parseEther("0.0005");
const MEME_SLIPPAGE_BPS = 150n;
const STAKE_WIF = 500n * 10n ** 18n;
const WIF_TARGET = 600n * 10n ** 18n;
const NVDA = 0;
const WIF_POOL: PoolEntry = {
  kind: 3,
  version: "v4",
  id: "0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79",
  key: { currency0: "0x0000000000000000000000000000000000000000", currency1: ADDR.wif, fee: 0, tickSpacing: 200, hooks: ADDR.wifHook },
  liquidityUsd: 0,
};

interface Ctx {
  user: Address | null;
  d: Deployments | null;
  send: ((label: string, req: () => Promise<Hex>) => Promise<void>) | null;
}

const minOut = (q: BestQuote) => (q.amountOut * (10_000n - MEME_SLIPPAGE_BPS)) / 10_000n;
const routeArg = (r: Route) => ({ ...r, v2Path: [...r.v2Path] });

function pickMemes(): Meme[] {
  const memes = loadRegistry().memes.filter((m) => m.tested && m.pools.length > 0);
  const liq = (m: Meme) => Math.max(...m.pools.map((p) => p.liquidityUsd));
  return memes.sort((a, b) => liq(b) - liq(a)).slice(0, 3);
}

async function balanceOf(token: Address, user: Address | null): Promise<bigint> {
  if (!user) return 0n;
  return client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [user] });
}

/** Count of router `eventName` logs for `user` since deployment (topic0 + topic1 = user is an exact filter). */
async function routerEvents(ctx: Ctx, eventName: "Swept" | "Converted"): Promise<number> {
  if (!ctx.d || !ctx.user) return 0;
  const topics = encodeEventTopics({ abi: terraRouterAbi, eventName, args: { user: ctx.user } }) as Hex[];
  return (await getLogsMany([{ address: ctx.d.TerraRouter, topics, from: ctx.d.block, to: await headBlock() }])).length;
}

/** The ETH TerraRouter actually swaps: msg.value - fee - sweep (contract math, fee from router.feeBps(user)). */
async function tradeLeg(ctx: Ctx, eth: bigint, sweepBps: number): Promise<bigint> {
  const fee = ctx.d && ctx.user
    ? await client.readContract({ address: ctx.d.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: [ctx.user] })
    : FEE_BPS;
  return eth - (eth * BigInt(fee)) / 10_000n - (eth * BigInt(sweepBps)) / 10_000n;
}

async function buy(ctx: Ctx, m: Pick<Meme, "token" | "symbol" | "pools">, eth: bigint, sweepBps: number) {
  const q = await bestQuote(m.token, m.pools, "buy", await tradeLeg(ctx, eth, sweepBps));
  if (!q) throw new Error(`no live quote for ${m.symbol}`);
  console.log(`  plan buy ${formatEther(eth)} ETH -> ${m.symbol} via ${q.pool.version}: quote ${formatUnits(q.amountOut, 18)} min ${formatUnits(minOut(q), 18)} sweep ${sweepBps}bps`);
  if (!ctx.send || !ctx.d) return;
  const d = ctx.d;
  const args = [routeArg(q.route), m.token, sweepBps, NVDA, minOut(q), 0n] as const;
  await ctx.send(`buy ${m.symbol}`, () => wallet().writeContract({ address: d.TerraRouter, abi: terraRouterAbi, functionName: "buy", args, value: eth, chain: robinhood, account: account() }));
}

async function seedMemes(ctx: Ctx, memes: Meme[]) {
  console.log("(a) meme holdings with history");
  for (const m of memes) {
    const bal = await balanceOf(m.token, ctx.user);
    if (bal > 0n) console.log(`  skip ${m.symbol}: holds ${formatUnits(bal, m.decimals)}`);
    else await buy(ctx, m, BUY_ETH, 0);
  }
}

async function approveExact(ctx: Ctx, token: Address, spender: Address, amount: bigint, label: string) {
  const allowance = ctx.user ? await client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [ctx.user, spender] }) : 0n;
  if (allowance >= amount) return console.log(`  skip approve ${label}: allowance ${allowance}`);
  console.log(`  plan approve ${label} exact ${amount}`);
  await ctx.send?.(`approve ${label}`, () => wallet().writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount], chain: robinhood, account: account() }));
}

async function seedConvert(ctx: Ctx, m: Meme) {
  console.log("(b) one convert into NVDA");
  if ((await routerEvents(ctx, "Converted")) > 0) return console.log("  skip: Converted event exists");
  const bal = await balanceOf(m.token, ctx.user);
  const amount = bal / 2n;
  if (amount === 0n) return console.log(`  pending: needs a ${m.symbol} balance from step (a) first`);
  const q = await bestQuote(m.token, m.pools, "sell", amount);
  if (!q) throw new Error(`no sell quote for ${m.symbol}`);
  console.log(`  plan convert ${formatUnits(amount, m.decimals)} ${m.symbol} -> ~${formatEther(q.amountOut)} ETH -> NVDA (oracle band min)`);
  if (!ctx.d) return;
  const d = ctx.d;
  await approveExact(ctx, m.token, d.TerraRouter, amount, `${m.symbol}->TerraRouter`);
  const args = [[routeArg(q.route)], [m.token], [amount], NVDA, 0n] as const;
  await ctx.send?.(`convert ${m.symbol}`, () => wallet().writeContract({ address: d.TerraRouter, abi: terraRouterAbi, functionName: "convert", args, chain: robinhood, account: account() }));
}

async function seedSweeps(ctx: Ctx, m: Meme) {
  console.log("(c) two buys with sweep 2%");
  const have = await routerEvents(ctx, "Swept");
  if (have >= 2) return console.log(`  skip: ${have} Swept events exist`);
  for (let i = have; i < 2; i++) await buy(ctx, m, BUY_ETH, 200);
}

async function seedStake(ctx: Ctx) {
  console.log("(d) 500 WIF staked to NVDA");
  const staked = ctx.d && ctx.user ? await client.readContract({ address: ctx.d.WifStaking, abi: wifStakingAbi, functionName: "stakers", args: [ctx.user] }) : null;
  if (staked && staked[1] + staked[2] >= STAKE_WIF) return console.log(`  skip: active ${formatEther(staked[1])} pending ${formatEther(staked[2])} WIF`);
  const wif = await balanceOf(ADDR.wif, ctx.user);
  if (wif < STAKE_WIF) await buy(ctx, { token: ADDR.wif, symbol: "WIF", pools: [WIF_POOL] }, await ethFor(WIF_TARGET - wif), 0);
  if (!ctx.d) return console.log("  plan approve exact 500 WIF + stake(500e18, 0) after deployment");
  const d = ctx.d;
  await approveExact(ctx, ADDR.wif, d.WifStaking, STAKE_WIF, "WIF->WifStaking");
  console.log("  plan stake 500 WIF to stockId 0 (NVDA)");
  await ctx.send?.("stake 500 WIF", () => wallet().writeContract({ address: d.WifStaking, abi: wifStakingAbi, functionName: "stake", args: [STAKE_WIF, NVDA], chain: robinhood, account: account() }));
}

/** ETH to send for ~`wifOut`: scaled from a live 0.0005 ETH quote, +5% headroom, grossed up for the fee. */
async function ethFor(wifOut: bigint): Promise<bigint> {
  const q = await bestQuote(ADDR.wif, [WIF_POOL], "buy", BUY_ETH);
  if (!q || q.amountOut === 0n) throw new Error("no live WIF quote");
  const swapped = (BUY_ETH * wifOut * 105n) / (q.amountOut * 100n);
  return (swapped * 10_000n) / BigInt(10_000 - FEE_BPS); // gross up for the router fee taken before the swap
}

async function remaining(ctx: Ctx) {
  console.log("(e) what remains");
  if (!ctx.d || !ctx.user) return console.log("  deploy, run sync-deployments, fund DEMO wallet, rerun without --dry");
  const [, pend] = await client.readContract({ address: ctx.d.WifStaking, abi: wifStakingAbi, functionName: "pending", args: [ctx.user] });
  console.log(`  staker pending reward: ${formatEther(pend)} NVDA`);
  if (pend === 0n) console.log("  wait for the next epoch (stake activates next hour), then run `pnpm tsx scripts/keeper.ts` twice across epochs");
}

let acct: ReturnType<typeof privateKeyToAccount> | null = null;
const account = () => {
  if (!acct) throw new Error("DEMO_KEY is not set");
  return acct;
};
const wallet = () => createWalletClient({ account: account(), chain: robinhood, transport: transports() });

async function sendAndWait(label: string, req: () => Promise<Hex>) {
  const hash = await req();
  console.log(`  tx ${label}: ${hash}`);
  const r = await client.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${label} reverted (${hash})`);
}

async function main() {
  const dry = hasFlag("--dry");
  if (process.env.DEMO_KEY) acct = privateKeyToAccount(process.env.DEMO_KEY as Hex);
  if (!dry && !acct) throw new Error("DEMO_KEY is required unless --dry");
  const d = loadDeployments();
  if (!dry && !d) throw new Error("no live deployment in web/data/deployments.json; run sync-deployments first");
  const user = acct?.address ?? ((process.env.DEMO_ADDR as Address | undefined) ?? null);
  const ctx: Ctx = { user, d, send: dry ? null : sendAndWait };
  console.log(`seed-demo ${dry ? "DRY RUN (nothing is sent)" : "LIVE"} wallet ${user ?? "(none)"} deployment ${d ? d.TerraRouter : "none"}`);
  if (user) console.log(`  ETH balance ${formatEther(await client.getBalance({ address: user }))}`);
  const memes = pickMemes();
  await seedMemes(ctx, memes);
  await seedConvert(ctx, memes[0]);
  await seedSweeps(ctx, memes[1] ?? memes[0]);
  await seedStake(ctx);
  await remaining(ctx);
}

main().catch((e) => {
  console.error(`seed-demo FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  process.exit(1);
});
