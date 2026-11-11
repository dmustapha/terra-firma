// File: scripts/debug-p2-hindsight-latency.live.ts
// LIVE tier, added by hackathon-debug Phase 2 (known risk: heavy-wallet Hindsight latency, 28.7-32s before hardening).
// Builds the card for the heaviest known wallet on the PUBLIC RPC only (worst case; GetBlock/Envio env removed, like
// hindsight.live.ts) and asserts: (1) it completes in < 20 s, (2) every buy at or before the fixture's cutoff block is
// byte-identical to the pre-change output (scripts/fixtures/debug-p2-hindsight-baseline.json) and their totals match,
// (3) every pre-change unpriced row is still unpriced with the same reason. Exit 1 on any failure.
// Run: tsx --conditions=react-server scripts/debug-p2-hindsight-latency.live.ts   (part of `pnpm test:live`)
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Address } from "viem";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIMIT_MS = 20_000;
type Buy = Record<string, unknown> & { tx: string; block: number; usdPaid8: string; shares18: string; token: string };
type Fixture = { wallet: Address; cutoffBlock: number; totals: { usdPaid8: string; shares18: string }; buys: Buy[]; unpriced: { tx: string; reason: string }[] };
const fx = JSON.parse(readFileSync(path.join(HERE, "fixtures", "debug-p2-hindsight-baseline.json"), "utf8")) as Fixture;

for (const k of ["GETBLOCK_RPC_FRA", "GETBLOCK_RPC_NYC", "ENVIO_API_TOKEN"]) delete process.env[k];
process.chdir(path.resolve(HERE, "..", "web")); // rounds.ts reads data/rounds relative to the Next app root

async function main() {
  const { buildCard } = await import("../web/lib/hindsight");
  const t0 = Date.now();
  const card = await buildCard(fx.wallet, 0);
  const ms = Date.now() - t0;
  console.log(`card for ${fx.wallet} in ${(ms / 1000).toFixed(1)}s (limit ${LIMIT_MS / 1000}s), block ${card.asOfBlock}`);

  const got = card.memes.flatMap((m) => m.buys.map((b) => ({ token: m.token, ...b }))).filter((b) => b.block <= fx.cutoffBlock);
  assert.equal(got.length, fx.buys.length, "buy count up to cutoff changed");
  const byTx = new Map(got.map((b) => [b.tx, b]));
  for (const want of fx.buys) assert.deepEqual(byTx.get(want.tx as `0x${string}`), want, `buy ${want.tx} differs from pre-change output`);
  const sum = (k: "usdPaid8" | "shares18") => got.reduce((s, b) => s + BigInt(b[k]), 0n).toString();
  assert.equal(sum("usdPaid8"), fx.totals.usdPaid8, "usdPaid8 total differs from pre-change");
  assert.equal(sum("shares18"), fx.totals.shares18, "shares18 total differs from pre-change");
  const unpriced = new Map(card.unpriced.map((u) => [u.tx, u.reason]));
  for (const u of fx.unpriced) assert.equal(unpriced.get(u.tx as `0x${string}`), u.reason, `unpriced row ${u.tx} changed`);
  assert.ok(ms < LIMIT_MS, `heavy-wallet card took ${ms} ms (>= ${LIMIT_MS} ms)`);
  console.log(`PASS debug-p2 hindsight latency: ${ms} ms < ${LIMIT_MS}; ${got.length} buys + ${fx.unpriced.length} unpriced rows identical to pre-change; usdPaid8 ${fx.totals.usdPaid8}, shares18 ${fx.totals.shares18}`);
}

main().catch((e) => {
  console.error(`FAIL debug-p2 hindsight latency: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
