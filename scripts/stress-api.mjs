// File: scripts/stress-api.mjs
// hackathon-stress Phase 4 + DH-9: read-only stress of every /api route on a deployment (no transactions are sent).
// Valid/invalid/malformed/oversized inputs, wrong methods, a claimed-vs-derived card check, SSE hello + slot cap,
// and N concurrent distinct-wallet Hindsight cards (no 5xx, wall clock < 60 s).
// Run: node scripts/stress-api.mjs [baseUrl] [--wallets=0x..,0x..]   (default https://terra-firma-henna.vercel.app)
const BASE = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "https://terra-firma-henna.vercel.app").replace(/\/$/, "");
const walletsArg = process.argv.find((a) => a.startsWith("--wallets="));
const DEMO = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const WIF = "0x5173b8eA6923c2d40267890D45C46a3480954773"; // $WIF on Robinhood Chain (web/lib/config.ts ADDR.wif)
const results = [];

async function hit(id, path, { method = "GET", expect, check, headers } = {}) {
  const t0 = Date.now();
  let status = 0, body = null, err = null;
  try {
    const r = await fetch(`${BASE}${path}`, { method, headers, signal: AbortSignal.timeout(90_000) });
    status = r.status;
    const text = await r.text();
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  } catch (e) { err = String(e); }
  const okStatus = Array.isArray(expect) ? expect.includes(status) : status === expect;
  const okCheck = check ? check(body, status) : true;
  const pass = !err && okStatus && okCheck;
  results.push({ id, path: path.slice(0, 90), method, status, ms: Date.now() - t0, pass, err });
  return { status, body };
}

const long = "a".repeat(10_000);
const xss = encodeURIComponent("<script>alert(1)</script>");

// health
await hit("API-HEALTH-01", "/api/health", { expect: 200, check: (b) => b && typeof b === "object" });
await hit("API-HEALTH-02", "/api/health", { method: "POST", expect: 405 });

// hindsight
const card = await hit("API-HS-01", `/api/hindsight?addr=${DEMO}`, { expect: 200, check: (b) => Array.isArray(b?.memes) && b.memes.length > 0 });
await hit("API-HS-02", `/api/hindsight?addr=${DEMO.toLowerCase()}`, { expect: 200 });
await hit("API-HS-03", `/api/hindsight?addr=0xnot`, { expect: 400 });
await hit("API-HS-04", `/api/hindsight?addr=${xss}`, { expect: 400 });
await hit("API-HS-05", `/api/hindsight?addr=${long}`, { expect: [400, 414, 431] });
await hit("API-HS-06", `/api/hindsight?addr=${DEMO}&stock=FAKE`, { expect: 400 });
await hit("API-HS-07", `/api/hindsight`, { expect: 400 });
await hit("API-HS-08", `/api/hindsight?addr=0x0000000000000000000000000000000000000000`, { expect: [200, 400], check: (b, s) => s === 400 || (Array.isArray(b?.memes) && b.memes.length === 0) });
await hit("API-HS-09", `/api/hindsight?addr=${DEMO}`, { method: "DELETE", expect: 405 });
await hit("API-HS-10", `/api/hindsight?addr=${DEMO}&stock=TSLA`, { expect: 200 });

// card-check: the leaderboard's provenance gate (fabricated mints must never verify)
const paid = card.body?.totals?.usdPaid8 ?? card.body?.usdPaid8;
if (paid != null) {
  await hit("API-CC-01", `/api/card-check?addr=${DEMO}&usdPaid8=${paid}&stockId=0`, { expect: 200, check: (b) => b?.match === true || b?.verified === true || b?.ok === true });
  await hit("API-CC-02", `/api/card-check?addr=${DEMO}&usdPaid8=${BigInt(paid) * 100n}&stockId=0`, { expect: 200, check: (b) => !(b?.match === true || b?.verified === true || b?.ok === true) });
} else results.push({ id: "API-CC-01/02", path: "card-check", status: 0, pass: false, err: "no usdPaid8 in hindsight body (shape changed?)" });
await hit("API-CC-03", `/api/card-check?addr=${DEMO}&usdPaid8=1&stockId=6`, { expect: 400 });
await hit("API-CC-04", `/api/card-check?addr=${DEMO}&usdPaid8=${"9".repeat(41)}&stockId=0`, { expect: 400 });
await hit("API-CC-05", `/api/card-check?addr=bad&usdPaid8=1&stockId=0`, { expect: 400 });
await hit("API-CC-06", `/api/card-check?addr=${DEMO}&usdPaid8=-5&stockId=0`, { expect: 400 });

// quote
await hit("API-Q-01", `/api/quote?token=${PONS}&side=buy&amount=300000000000000&sweepBps=200&feeBps=50`, { expect: 200 });
await hit("API-Q-02", `/api/quote?token=${PONS}&side=steal&amount=1`, { expect: 400 });
await hit("API-Q-03", `/api/quote?token=${PONS}&side=buy&amount=0`, { expect: 400 });
await hit("API-Q-04", `/api/quote?token=${PONS}&side=buy&amount=${"9".repeat(78)}`, { expect: 400 });
await hit("API-Q-05", `/api/quote?token=${PONS}&side=buy&amount=1000&sweepBps=1001`, { expect: 400 });
await hit("API-Q-06", `/api/quote?token=${PONS}&side=buy&amount=1000&feeBps=40`, { expect: 400 });
await hit("API-Q-07", `/api/quote?token=${xss}&side=buy&amount=1000`, { expect: 400 });
await hit("API-Q-08", `/api/quote?token=0x000000000000000000000000000000000000dEaD&side=buy&amount=300000000000000`, { expect: [404, 422, 200], check: (b, s) => s !== 200 || b?.error == null });
await hit("API-Q-09", `/api/quote?token=${PONS}&side=buy&amount=-1`, { expect: 400 });
await hit("API-Q-10", `/api/quote?token=${PONS}&side=buy&amount=1.5`, { expect: 400 });
if (WIF) await hit("API-Q-11", `/api/quote?token=${WIF}&side=sell&amount=1000`, { expect: 422 });
await hit("API-Q-12", `/api/quote?token=${PONS}&side=buy&amount=1000`, { method: "PUT", expect: 405 });

// geo + qn-jar
await hit("API-GEO-01", `/api/geo`, { expect: 200, check: (b) => typeof b?.restricted === "boolean" });
await hit("API-GEO-02", `/api/geo`, { expect: 200, headers: { "x-vercel-ip-country": "US" }, check: (b) => typeof b?.restricted === "boolean" });
// Vercel overwrites client-sent x-vercel-ip-country at the edge: a spoofed header must not change the derived country.
const real = (await hit("API-GEO-03a", `/api/geo`, { expect: 200 })).body?.country;
await hit("API-GEO-03", `/api/geo`, { expect: 200, headers: { "x-vercel-ip-country": real === "US" ? "NG" : "US" }, check: (b) => !BASE.includes("vercel.app") || b?.country === real });
await hit("API-QN-01", `/api/qn-jar`, { expect: [200, 503], check: (b) => b && typeof b === "object" });

// SSE: hello within 5 s
{
  const t0 = Date.now();
  let pass = false, status = 0, err = null;
  try {
    const ac = new AbortController();
    const r = await fetch(`${BASE}/api/stream`, { signal: ac.signal });
    status = r.status;
    const rd = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const timer = setTimeout(() => ac.abort(), 5000);
    while (!buf.includes('"hello"')) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value); }
    clearTimeout(timer);
    pass = buf.includes('"hello"');
    ac.abort();
  } catch (e) { err = String(e); }
  results.push({ id: "API-SSE-01", path: "/api/stream", method: "GET", status, ms: Date.now() - t0, pass, err });
}

// DH-9: N concurrent distinct-wallet cards
const wallets = walletsArg ? walletsArg.split("=")[1].split(",") : [];
if (wallets.length) {
  const t0 = Date.now();
  const rs = await Promise.all(wallets.map((w) => fetch(`${BASE}/api/hindsight?addr=${w}`, { signal: AbortSignal.timeout(90_000) }).then((r) => r.status).catch(() => 0)));
  const wall = Date.now() - t0;
  const fivexx = rs.filter((s) => s >= 500 || s === 0).length;
  results.push({ id: "DH9-CONC-01", path: `/api/hindsight x${wallets.length} concurrent`, method: "GET", status: rs.join(","), ms: wall, pass: fivexx === 0 && wall < 60_000, err: fivexx ? `${fivexx} 5xx/timeouts` : null });
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.method} ${r.path} -> ${r.status} (${r.ms} ms)${r.err ? " " + r.err : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
