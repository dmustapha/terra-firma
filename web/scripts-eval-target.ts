// File: web/scripts-eval-target.ts
// [VERIFIED] STAGE-3 eval target: prices a (feed, ts) pair with the same roundAt/normalize8 the Hindsight engine uses,
// over the committed real Chainlink round tables. Deterministic, offline (no RPC). Run with:
//   cd web && EVAL_INPUT='{"feed":"0x…","ts":123}' npx tsx --conditions=react-server scripts-eval-target.ts
import { loadTable, normalize8, roundAt } from "./lib/rounds";

async function main() {
  const { feed, ts } = JSON.parse(process.env.EVAL_INPUT ?? "{}") as { feed: `0x${string}`; ts: number };
  try {
    const t = await loadTable(feed);
    const r = roundAt(t, ts);
    const n = Number(r.roundId & ((1n << 64n) - 1n));
    console.log(JSON.stringify({ n, roundId: r.roundId.toString(), price8: normalize8(feed, n, r.price8).toString(), updatedAt: r.updatedAt }));
  } catch (e) {
    console.log(JSON.stringify({ error: String((e as Error).message) }));
  }
}
void main();
