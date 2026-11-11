// File: scripts/keeper.ts
// Hourly FeePool.distribute (PRD C10). distribute is permissionless; the keeper only saves someone the click.
// Env: RPC_URL (else the .env.local GetBlock/public chain), KEEPER_KEY (0x private key; not needed with --dry).
// Flags: --dry (print, send nothing), --rounds (also run build-rounds --update afterwards).
// Run: pnpm tsx scripts/keeper.ts [--dry] [--rounds]
import { spawnSync } from "node:child_process";
import { createWalletClient, formatEther, parseEther, parseEventLogs, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood } from "viem/chains";
import { feePoolAbi } from "../web/lib/abi";
import { hasFlag, ROOT } from "./lib/env";
import { loadDeployments } from "./lib/files";
import { client, transports } from "./lib/rpc";

const KEEPER_MIN_ETH = parseEther("0.0002");
/** distribute has no caller-set minimum; with all 6 pools live it needs ~3.1M gas, so never rely on a tight estimate. */
const DISTRIBUTE_GAS = 3_500_000n;

async function distribute(dry: boolean) {
  const d = loadDeployments();
  if (!d) return console.log("skip: web/data/deployments.json has no live deployment yet");
  const pool = { address: d.FeePool, abi: feePoolAbi } as const;
  const [can, balance, cap, epoch] = await Promise.all([
    client.readContract({ ...pool, functionName: "canDistribute" }),
    client.getBalance({ address: d.FeePool }),
    client.readContract({ ...pool, functionName: "MAX_WIF_BUY_ETH" }),
    client.readContract({ ...pool, functionName: "epoch" }),
  ]);
  console.log(`FeePool ${d.FeePool} epoch ${epoch} balance ${formatEther(balance)} ETH canDistribute ${can}`);
  if (!can || balance < KEEPER_MIN_ETH) return console.log(`skip (${!can ? "epoch already distributed" : "balance < 0.0002 ETH"})`);

  const wifEth = balance / 2n < cap ? balance / 2n : cap;
  console.log(`burn leg ${formatEther(wifEth)} ETH (capped per epoch; $WIF is never priced, no minimum is sent)`);
  if (dry) return console.log("dry run: distribute not sent");

  const key = process.env.KEEPER_KEY;
  if (!key) throw new Error("KEEPER_KEY is not set");
  const account = privateKeyToAccount(key as Hex);
  const wallet = createWalletClient({ account, chain: robinhood, transport: transports() });
  const { request } = await client.simulateContract({ ...pool, functionName: "distribute", account, gas: DISTRIBUTE_GAS });
  const hash = await wallet.writeContract(request);
  console.log(`distribute tx ${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`distribute reverted in block ${receipt.blockNumber}`);
  for (const ev of parseEventLogs({ abi: feePoolAbi, logs: receipt.logs, eventName: "Distributed" })) {
    const a = ev.args;
    const bought = a.stockBought.map((x) => x.toString()).join(",");
    console.log(`Distributed epoch ${a.epoch} ethIn ${formatEther(a.ethIn)} wifBurned ${formatEther(a.wifBurned)} stockBought [${bought}] carried ${formatEther(a.carried)}`);
  }
}

async function main() {
  await distribute(hasFlag("--dry"));
  if (hasFlag("--rounds")) {
    const r = spawnSync("pnpm", ["exec", "tsx", "scripts/build-rounds.ts", "--update"], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) throw new Error(`build-rounds --update exited ${r.status}`);
  }
}

main().catch((e) => {
  console.error(`keeper FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  process.exit(1);
});
