// File: scripts/hindsight.live.ts
// LIVE tier (contract rule 24): builds a real Hindsight card for a known mainnet wallet with web/lib/hindsight.ts
// against the PUBLIC Robinhood Chain RPC only (GetBlock / Envio env vars are removed first), then checks it:
//   1. card shape + asOfBlock near head   2. every buy tx resolves onchain, succeeded, and was sent by the wallet
//   3. per-buy pricing arithmetic (usdPaid8 = amountPaid * payUsd8 / 10^dec; shares18 = usdPaid8 * 1e18 / stockUsd8)
//   4. meme totals == sum of the meme rows.   Exit 1 on any failure.
// Run (only via `pnpm test:live`): tsx --conditions=react-server scripts/hindsight.live.ts
//   (--conditions=react-server resolves "server-only" to its empty module, exactly as Next does on the server.)
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";

const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E" as Address;
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web");

for (const k of ["GETBLOCK_RPC_FRA", "GETBLOCK_RPC_NYC", "ENVIO_API_TOKEN"]) delete process.env[k];
process.chdir(WEB); // web/lib/rounds.ts reads data/rounds relative to the Next app root

type Receipt = { status: Hex; from: Address };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(PUBLIC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "terra-firma-live-test/1.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await res.json()) as { result?: T; error?: { message: string } };
  if (j.error || j.result === undefined) throw new Error(`${method}: ${j.error?.message ?? "no result"}`);
  return j.result;
}

async function main() {
  const { buildCard } = await import("../web/lib/hindsight");
  const t0 = Date.now();
  const card = await buildCard(WALLET, 0);
  const head = Number(await rpc<Hex>("eth_blockNumber", []));
  console.log(`card for ${WALLET} in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${card.memes.length} memes, ${card.unpriced.length} unpriced, block ${card.asOfBlock}`);

  assert.equal(card.wallet.toLowerCase(), WALLET.toLowerCase());
  assert.ok(card.asOfBlock > 0 && head - card.asOfBlock < 50_000, `asOfBlock ${card.asOfBlock} far from head ${head}`);
  assert.ok(card.memes.length > 0, "known active wallet produced an empty card");

  const buys = card.memes.flatMap((m) => m.buys);
  for (const b of buys) {
    const rc = await rpc<Receipt | null>("eth_getTransactionReceipt", [b.tx]);
    assert.ok(rc, `tx ${b.tx} not found onchain`);
    assert.equal(rc.status, "0x1", `tx ${b.tx} reverted`);
    assert.equal(rc.from.toLowerCase(), WALLET.toLowerCase(), `tx ${b.tx} not sent by the wallet`);
    const dec = b.payKind === 1 ? 10n ** 6n : 10n ** 18n;
    assert.equal(BigInt(b.usdPaid8), (BigInt(b.amountPaid) * BigInt(b.payUsd8)) / dec, `usdPaid8 arithmetic ${b.tx}`);
    assert.equal(BigInt(b.shares18), (BigInt(b.usdPaid8) * 10n ** 18n) / BigInt(b.stockUsd8), `shares18 arithmetic ${b.tx}`);
  }
  for (const m of card.memes) {
    assert.equal(BigInt(m.usdPaid8), m.buys.reduce((s, b) => s + BigInt(b.usdPaid8), 0n), `${m.symbol} usdPaid8 total`);
  }
  // M3: unquoted memes are null (never a fabricated $0), excluded from usdToday8 / usdPaidQuoted8 / worst, and flag partial.
  const quoted = card.memes.filter((m) => m.usdToday8 !== null);
  const sum = (rows: typeof card.memes, f: (m: (typeof card.memes)[number]) => string) => rows.reduce((s, m) => s + BigInt(f(m)), 0n);
  assert.equal(BigInt(card.totals.usdToday8), sum(quoted, (m) => m.usdToday8 as string), "usdToday8 total = sum of quoted memes");
  assert.equal(BigInt(card.totals.usdPaidQuoted8), sum(quoted, (m) => m.usdPaid8), "usdPaidQuoted8 = paid over quoted memes");
  assert.equal(BigInt(card.totals.usdPaid8), sum(card.memes, (m) => m.usdPaid8), "usdPaid8 total = sum of all memes");
  for (const m of card.memes) assert.equal(m.todayReason === null, m.usdToday8 !== null, `${m.symbol} todayReason iff unquoted`);
  assert.deepEqual(card.unquoted.map((u) => u.token), card.memes.filter((m) => m.usdToday8 === null).map((m) => m.token), "unquoted list");
  assert.equal(card.partial, card.unquoted.length > 0 || card.scanGaps.length > 0, "partial flag");
  if (card.worst) assert.ok(quoted.some((m) => m.symbol === card.worst?.symbol), "worst is a quoted meme");
  console.log(`today: ${quoted.length}/${card.memes.length} memes quoted, partial ${card.partial}, scan gaps ${card.scanGaps.length}`);
  console.log(`PASS hindsight.live: ${buys.length} buys resolved onchain (status 1, from = wallet), pricing arithmetic and totals consistent`);
}

main().catch((e) => {
  console.error(`FAIL hindsight.live: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
