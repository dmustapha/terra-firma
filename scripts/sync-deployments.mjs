// File: scripts/sync-deployments.mjs
// Copies contracts/deployments/4663.json (written by contracts/script/Deploy.s.sol) to web/data/deployments.json with
// "deployed": true. Refuses on a wrong chain or any zero/malformed address, so the web never points at nothing.
// Run: node scripts/sync-deployments.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "contracts", "deployments", "4663.json");
const dst = path.join(root, "web", "data", "deployments.json");
const NAMES = ["StockOracle", "Jar", "WifStaking", "FeePool", "TerraRouter", "HindsightLens", "FriendJar"];

function fail(msg) {
  console.error(`sync-deployments REFUSED: ${msg}`);
  process.exit(1);
}

let d;
try {
  d = JSON.parse(readFileSync(src, "utf8"));
} catch (e) {
  fail(`cannot read ${path.relative(root, src)} (${e.message})`);
}
if (Number(d.chainId) !== 4663) fail(`chainId ${d.chainId} != 4663`);
for (const n of NAMES) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(d[n] ?? "")) fail(`${n} is not an address: ${d[n]}`);
  if (/^0x0{40}$/i.test(d[n])) fail(`${n} is the zero address`);
}
if (!(Number(d.block) > 0) || !(Number(d.start) > 0)) fail(`block/start missing (${d.block}/${d.start})`);

const out = { deployed: true, chainId: 4663, block: Number(d.block), start: Number(d.start) };
for (const n of NAMES) out[n] = d[n];
writeFileSync(dst, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${path.relative(root, dst)}: TerraRouter ${out.TerraRouter}, block ${out.block}`);
