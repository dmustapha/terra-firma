// File: scripts/verify-claims.ts
// Re-derives every row of CLAIMS.md from its source and fails (exit 1) on any mismatch or unbacked value.
// PENDING rows are skipped; a deployment-dependent row with a value but no live deployment is a failure.
// Run: pnpm tsx scripts/verify-claims.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatEther } from "viem";
import { feePoolAbi } from "../web/lib/abi";
import { ROOT } from "./lib/env";
import { CONTRACT_NAMES, loadDeployments } from "./lib/files";
import { client } from "./lib/rpc";

type Row = { id: string; claim: string; value: string };
const NO_DEPLOYMENT = "no live deployment";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function deployment() {
  const d = loadDeployments();
  if (!d) throw new Error(NO_DEPLOYMENT);
  return d;
}

const derive: Record<string, () => Promise<string>> = {
  "fork-tests": async () => {
    const all = [...read("evidence/forge-test.txt").matchAll(/(\d+) tests passed, (\d+) failed/g)];
    const last = all.at(-1);
    if (!last) throw new Error("no forge summary line");
    if (last[2] !== "0") throw new Error(`${last[2]} fork tests failed`);
    return last[1];
  },
  "deployed-contracts": async () => {
    const d = deployment();
    const codes = await Promise.all(CONTRACT_NAMES.map((n) => client.getCode({ address: d[n] })));
    return String(codes.filter((c) => c && c !== "0x").length);
  },
  "wif-burned": async () => {
    const d = deployment();
    return formatEther(await client.readContract({ address: d.FeePool, abi: feePoolAbi, functionName: "totalWifBurned" }));
  },
  "nvda-fill-deviation": async () => {
    const m = read("research/spike-fork.md").match(/CL-implied [\d.]+ \((-?[\d.]+%)\)/);
    if (!m) throw new Error("CL-implied deviation not found");
    return m[1];
  },
};

function rows(): Row[] {
  const lines = read("CLAIMS.md").split("\n").filter((l) => /^\|\s*[a-z0-9-]+\s*\|/.test(l));
  const cells = lines.map((l) => l.split("|").slice(1).map((c) => c.trim()));
  return cells.filter(([id]) => id !== "id" && !/^-+$/.test(id)).map(([id, claim, value]) => ({ id, claim, value }));
}

async function check(r: Row): Promise<boolean> {
  const fn = derive[r.id];
  if (!fn) return console.log(`FAIL ${r.id}: no derivation for this claim`), false;
  try {
    const got = await fn();
    if (r.value === "PENDING") return console.log(`PENDING ${r.id} (derivable now: ${got}; copy it into CLAIMS.md)`), true;
    const ok = got === r.value;
    console.log(`${ok ? "OK  " : "FAIL"} ${r.id}: claimed ${r.value}, derived ${got}`);
    return ok;
  } catch (e) {
    const msg = (e as Error).message;
    if (r.value === "PENDING" && msg === NO_DEPLOYMENT) return console.log(`PENDING ${r.id} (skipped: ${msg})`), true;
    console.log(`FAIL ${r.id}: ${msg}`);
    return false;
  }
}

async function main() {
  const all = rows();
  if (all.length === 0) throw new Error("CLAIMS.md has no rows");
  let ok = true;
  for (const r of all) ok = (await check(r)) && ok;
  if (!ok) process.exit(1);
  console.log(`claims verified: ${all.length} rows`);
}

main().catch((e) => {
  console.error(`verify-claims FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
