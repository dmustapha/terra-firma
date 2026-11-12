// File: scripts/stress-ui-errors.mjs
// hackathon-stress Phase 2 primary error paths, run LOCAL ONLY (a `next start` against an anvil fork). Every request to
// the public Robinhood Chain RPC or the live Vercel site is aborted by the browser, so this run puts zero load on
// shared infrastructure (it also proves the pages survive those hosts being unreachable).
//   J-ERR-HINDSIGHT-503-RECOVER  landing Fig. 1 (client useCard): two 503 busy, then a valid card -> no error left
//   J-ERR-HINDSIGHT-HARD         every /api/hindsight 503 -> a plain, visible error (not a blank or endless spinner)
//   J-ERR-QUOTE-503              /trade/[token]: /api/quote 503 -> "Couldn't get a quote" notice, page alive
//   J-GATED-FRIENDS              /friends is gated off for the submission -> clean 404, no page error
// Run: PW_CHROMIUM=... node scripts/stress-ui-errors.mjs http://localhost:3202
import { chromium } from "playwright-core";

const BASE = (process.argv[2] ?? "http://localhost:3202").replace(/\/$/, "");
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error("local base URL only");
const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const results = [];
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM, headless: true });

const emptyCard = (wallet) => ({
  wallet, stock: "NVDA", asOfBlock: 1,
  totals: { usdPaid8: "0", usdPaidQuoted8: "0", usdToday8: "0", usdCounterfactual8: "0", shares18: "0" },
  memes: [], unpriced: [], worst: null, partial: false, unquoted: [], scanGaps: [],
});

async function open(setup) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = { page: [], blocked: 0 };
  p.on("pageerror", (e) => errs.page.push(String(e).slice(0, 160)));
  await p.route(/rpc\.mainnet\.chain\.robinhood\.com|terra-firma-henna\.vercel\.app/, (r) => { errs.blocked++; return r.abort("blockedbyclient"); });
  if (setup) await setup(p);
  return { ctx, p, errs };
}

{
  let n = 0;
  const { ctx, p, errs } = await open((pg) => pg.route("**/api/hindsight**", (r) => {
    n++;
    if (n <= 2) return r.fulfill({ status: 503, headers: { "retry-after": "5", "content-type": "application/json" }, body: '{"error":"busy","retryAfter":5}' });
    const addr = new URL(r.request().url()).searchParams.get("addr");
    return r.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(emptyCard(addr)) });
  }));
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const t0 = Date.now();
  while (n < 3 && Date.now() - t0 < 30_000) await p.waitForTimeout(250); // client retries at 2 s and 4 s
  const third = n >= 3;
  await p.waitForTimeout(1500);
  const alert = await p.locator('[role="alert"]').filter({ hasText: /busy|try again/i }).count();
  results.push({ id: "J-ERR-HINDSIGHT-503-RECOVER", pass: third && alert === 0 && errs.page.length === 0, note: `hindsight calls ${n} (2 forced 503), error alert after recovery ${alert}, pageErrors ${errs.page.length}, blocked external ${errs.blocked}` });
  await ctx.close();
}
{
  let n = 0;
  const { ctx, p, errs } = await open((pg) => pg.route("**/api/hindsight**", (r) => { n++; return r.fulfill({ status: 503, headers: { "content-type": "application/json", "retry-after": "5" }, body: '{"error":"rpc_unavailable","retryAfter":5}' }); }));
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const shown = await p.waitForFunction(() => /chain is busy|try again/i.test(document.body.innerText), null, { timeout: 60_000 }).then(() => true).catch(() => false);
  results.push({ id: "J-ERR-HINDSIGHT-HARD", pass: shown && errs.page.length === 0, note: `hindsight calls ${n} (client retries), plain error visible ${shown}, pageErrors ${errs.page.length}` });
  await ctx.close();
}
{
  let n = 0;
  const { ctx, p, errs } = await open((pg) => pg.route("**/api/quote**", (r) => { n++; return r.fulfill({ status: 503, headers: { "content-type": "application/json" }, body: '{"error":"quote_failed"}' }); }));
  await p.goto(`${BASE}/trade/${PONS}`, { waitUntil: "domcontentloaded" });
  const amt = p.locator('input[inputmode="decimal"], input[type="number"], input[name*="amount" i]').first();
  await amt.waitFor({ timeout: 30_000 }).catch(() => {});
  if (await amt.count()) await amt.fill("0.0003");
  const shown = await p.waitForFunction(() => /couldn.t get a quote|try again/i.test(document.body.innerText), null, { timeout: 30_000 }).then(() => true).catch(() => false);
  results.push({ id: "J-ERR-QUOTE-503", pass: shown && errs.page.length === 0, note: `quote calls ${n}, notice shown ${shown}, pageErrors ${errs.page.length}` });
  await ctx.close();
}
{
  const { ctx, p, errs } = await open();
  const r = await p.goto(`${BASE}/friends`, { waitUntil: "domcontentloaded" });
  results.push({ id: "J-GATED-FRIENDS", pass: r?.status() === 404 && errs.page.length === 0, note: `status ${r?.status()} (gated off by NEXT_PUBLIC_FRIEND_JARS)` });
  await ctx.close();
}

await browser.close();
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.id} :: ${r.note}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
