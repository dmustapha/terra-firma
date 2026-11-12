// File: scripts/stress-dh9.mjs
// hackathon-stress DH-9 re-vector: N distinct cold wallets hit /api/hindsight at once, each behaving like the real
// client (components/hooks.ts useCard: 3 retries, 2/4/8 s backoff). Pass = no response is a 504 or takes >= 55 s,
// every non-200 is a 503 carrying Retry-After, and every wallet ends with its card.
// Run: node scripts/stress-dh9.mjs <baseUrl> 0xA,0xB,...
const [base, list] = process.argv.slice(2);
const wallets = (list ?? "").split(",").filter(Boolean);
if (!base || wallets.length === 0) throw new Error("usage: node scripts/stress-dh9.mjs <baseUrl> 0xA,0xB,...");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function client(w) {
  const attempts = [];
  for (let n = 0; n <= 3; n++) {
    const t0 = Date.now();
    let status = 0, retryAfter = null;
    try {
      const r = await fetch(`${base}/api/hindsight?addr=${w}`, { signal: AbortSignal.timeout(70_000) });
      status = r.status;
      retryAfter = r.headers.get("retry-after");
      await r.arrayBuffer();
    } catch { status = 0; }
    attempts.push({ status, ms: Date.now() - t0, retryAfter });
    if (status === 200) break;
    if (n < 3) await sleep(1000 * 2 ** (n + 1));
  }
  return { w, attempts, ok: attempts.at(-1).status === 200 };
}

const t0 = Date.now();
const out = await Promise.all(wallets.map(client));
const all = out.flatMap((o) => o.attempts);
const bad = all.filter((a) => a.status === 504 || a.status === 0 || a.ms >= 55_000 || (a.status !== 200 && !(a.status === 503 && a.retryAfter)));
for (const o of out) console.log(`${o.ok ? "OK  " : "MISS"} ${o.w} ${o.attempts.map((a) => `${a.status}/${a.ms}ms`).join(" -> ")}`);
console.log(`\nwallets ${out.length}, carded ${out.filter((o) => o.ok).length}, first-try 200 ${out.filter((o) => o.attempts[0].status === 200).length}`);
console.log(`responses ${all.length}, 504/timeouts/>=55s/unhandled ${bad.length}, slowest ${Math.max(...all.map((a) => a.ms))} ms, wall ${Date.now() - t0} ms`);
process.exit(bad.length === 0 ? 0 : 1);
