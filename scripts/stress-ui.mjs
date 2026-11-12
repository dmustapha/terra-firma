// File: scripts/stress-ui.mjs
// hackathon-stress Phases 2/6/7/8 at the functional level (no visual judgments): every route at 375 and 1440 px,
// primary error paths (API 503 then recovery), XSS-shaped inputs, corrupted localStorage, slow network, dropped SSE,
// refresh-during-load, back button and rapid navigation. Read-only: no wallet, no transactions.
// Needs playwright-core and a Chromium (PW_CHROMIUM=/path/to/chrome).
// Run: PW_CHROMIUM=... node scripts/stress-ui.mjs [baseUrl]
import { chromium } from "playwright-core";

const BASE = (process.argv[2] ?? "https://terra-firma-henna.vercel.app").replace(/\/$/, "");
const DEMO = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const NOISE = /favicon|walletconnect|web3modal|reown|coinbase|metamask|Failed to load resource.*(403|401)|Download the React DevTools|hydrat.*warning|lit-element|pulse\.walletconnect|cca-lite|ERR_BLOCKED_BY_CLIENT/i;
const results = [];
const record = (id, pass, note = "") => results.push({ id, pass, note });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM, headless: true });

async function page(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 900 }, isMobile: width < 500, hasTouch: width < 500 });
  const p = await ctx.newPage();
  const errs = { page: [], console: [], dialogs: 0 };
  p.on("pageerror", (e) => errs.page.push(String(e).slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text())) errs.console.push(m.text().slice(0, 160)); });
  p.on("dialog", async (d) => { errs.dialogs++; await d.dismiss(); });
  if (opts.setup) await opts.setup(p, ctx);
  return { ctx, p, errs };
}

async function overflowX(p) {
  return p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// ---------------------------------------------------------------- Phase 2: every route, two viewports
const ROUTES = ["/", "/app", `/card/${DEMO}`, "/trade", `/trade/${PONS}`, "/jar", "/stake", "/board", "/proof", "/app/convert", "/friends", `/jar/report/${DEMO}`];
const GATED = new Set(["/friends"]); // Friend Jars UI is gated off for the submission: a clean 404 is the expected state
for (const width of [375, 1440]) {
  for (const route of ROUTES) {
    const { ctx, p, errs } = await page(width);
    let status = 0;
    try {
      const r = await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45_000 });
      status = r?.status() ?? 0;
      await p.waitForTimeout(4000);
      const ox = await overflowX(p);
      const h1 = await p.locator("main, h1").first().isVisible().catch(() => false);
      const ok = (GATED.has(route) ? status === 404 : status < 400 && h1) && errs.page.length === 0 && ox <= 1;
      record(`J-ROUTE ${width} ${route}`, ok, `status ${status} overflowX ${ox} pageErrors ${errs.page.length}${errs.page[0] ? " " + errs.page[0] : ""} consoleErrors ${errs.console.length}${errs.console[0] ? " " + errs.console[0] : ""}`);
    } catch (e) { record(`J-ROUTE ${width} ${route}`, false, String(e).slice(0, 160)); }
    await ctx.close();
  }
}

// not-found + malformed params
for (const [id, route] of [["J-404", "/no-such-page"], ["J-BADCARD", "/card/0xnotanaddress"], ["J-XSSCARD", `/card/${encodeURIComponent("<img src=x onerror=alert(1)>")}`], ["J-XSSTRADE", `/trade/${encodeURIComponent("<script>alert(1)</script>")}`]]) {
  const { ctx, p, errs } = await page(1440);
  try {
    const r = await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await p.waitForTimeout(2500);
    const body = await p.locator("body").innerText();
    record(id, errs.dialogs === 0 && errs.page.length === 0 && body.length > 20, `status ${r?.status()} dialogs ${errs.dialogs} pageErrors ${errs.page.length}`);
  } catch (e) { record(id, false, String(e).slice(0, 160)); }
  await ctx.close();
}

// primary error path: hindsight 503 busy twice, then real -> card recovers (client retry), no crash
{
  let n = 0;
  const { ctx, p, errs } = await page(1440, {
    setup: (pg) => pg.route("**/api/hindsight**", (route) => (n++ < 2 ? route.fulfill({ status: 503, headers: { "retry-after": "5", "content-type": "application/json" }, body: '{"error":"busy","retryAfter":5}' }) : route.continue())),
  });
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); // landing Fig. 1 reads /api/hindsight client-side
  const recovered = await p.waitForFunction(() => /\$\s?[0-9][0-9,]*\.\d\d/.test(document.body.innerText), null, { timeout: 60_000 }).then(() => true).catch(() => false);
  record("J-ERR-HINDSIGHT-503-RECOVER", recovered && errs.page.length === 0, `forced 503s ${Math.min(n, 2)}, recovered ${recovered}`);
  await ctx.close();
}
// hard failure: hindsight always 503 -> visible, plain error state (not a blank page or spinner forever)
{
  const { ctx, p, errs } = await page(1440, {
    setup: (pg) => pg.route("**/api/hindsight**", (route) => route.fulfill({ status: 503, headers: { "content-type": "application/json" }, body: '{"error":"rpc_unavailable","retryAfter":5}' })),
  });
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const shown = await p.waitForFunction(() => /busy|try again|couldn.t|unavailable/i.test(document.body.innerText), null, { timeout: 60_000 }).then(() => true).catch(() => false);
  record("J-ERR-HINDSIGHT-HARD", shown && errs.page.length === 0, `error state visible ${shown}`);
  await ctx.close();
}
// quote failure on the terminal: 503 -> message, page alive
{
  const { ctx, p, errs } = await page(1440, {
    setup: (pg) => pg.route("**/api/quote**", (route) => route.fulfill({ status: 503, headers: { "content-type": "application/json" }, body: '{"error":"quote_failed"}' })),
  });
  await p.goto(`${BASE}/trade/${PONS}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  const amt = p.locator('input[inputmode="decimal"], input[type="number"], input[name*="amount" i]').first();
  let quoteCalls = 0;
  p.on("request", (r) => { if (r.url().includes("/api/quote")) quoteCalls++; });
  if (await amt.count()) await amt.fill("0.0003");
  const shown = await p.waitForFunction(() => /couldn.t get a quote|try again/i.test(document.body.innerText), null, { timeout: 30_000 }).then(() => true).catch(() => false);
  record("J-ERR-QUOTE-503", errs.page.length === 0 && shown, `amount input found ${await amt.count()}, quote calls ${quoteCalls}, error shown ${shown}`);
  await ctx.close();
}
// boundary inputs into the terminal amount box
{
  const { ctx, p, errs } = await page(1440);
  await p.goto(`${BASE}/trade/${PONS}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  const amt = p.locator('input[inputmode="decimal"], input[type="number"], input[name*="amount" i]').first();
  const bad = [];
  if (await amt.count()) {
    for (const v of ["", " ", "-1", "0", "1e308", "NaN", "Infinity", "0.000000000000000000001", "<script>alert(1)</script>", "🔥💀", "9".repeat(80)]) {
      await amt.fill("").catch(() => {});
      await amt.type(v).catch(() => {});
      await p.waitForTimeout(400);
      if (errs.page.length) bad.push(v);
    }
  }
  record("J-INPUT-BOUNDARY", (await amt.count()) > 0 && bad.length === 0 && errs.dialogs === 0, `crashing inputs: ${bad.join(" | ") || "none"}`);
  await ctx.close();
}
// paste-CA box: junk and unknown token
{
  const { ctx, p, errs } = await page(1440);
  await p.goto(`${BASE}/trade`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  const box = p.locator('input[placeholder*="0x" i], input[aria-label*="token" i], input[name*="token" i]').first();
  let note = "no token box";
  if (await box.count()) {
    for (const v of ["not-an-address", "<script>alert(1)</script>", "0x000000000000000000000000000000000000dEaD"]) {
      await box.fill(v);
      await box.press("Enter");
      await p.waitForTimeout(2500);
    }
    note = (await p.locator("body").innerText()).match(/(not a valid|no uniswap|invalid|couldn.t)[^\n]{0,60}/i)?.[0] ?? "no message";
  }
  record("J-PASTE-CA-JUNK", errs.page.length === 0 && errs.dialogs === 0, note);
  await ctx.close();
}

// ---------------------------------------------------------------- Phase 6: corrupted localStorage
{
  const { ctx, p, errs } = await page(1440);
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate(() => {
    for (const k of ["tf.theme", "tf.geo.ack", "wagmi.store", "wagmi.recentConnectorId", "wagmi.wallet", "rk-latest-id"]) localStorage.setItem(k, '{"broken":');
    localStorage.setItem("tf.theme", "\u0000￿<script>");
  });
  for (const route of ["/", "/app", "/stake", "/jar"]) { await p.goto(BASE + route, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500); }
  record("S-LOCALSTORAGE-CORRUPT", errs.page.length === 0, `pageErrors ${errs.page.length}${errs.page[0] ? " " + errs.page[0] : ""}`);
  await ctx.close();
}
// malformed API shape: hindsight returns 200 with a wrong schema -> error boundary, not a white screen
{
  const { ctx, p, errs } = await page(1440, {
    setup: (pg) => pg.route("**/api/hindsight**", (route) => route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: '{"wallet":"x","memes":"not-an-array","totals":null}' })),
  });
  await p.goto(`${BASE}/card/${DEMO}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  const txt = await p.locator("body").innerText();
  record("S-MALFORMED-API", txt.trim().length > 50, `pageErrors ${errs.page.length} (caught by error boundary if >0 and text present)${errs.page[0] ? " " + errs.page[0] : ""}`);
  await ctx.close();
}

// ---------------------------------------------------------------- Phase 7: slow network, dropped SSE, intermittent 503
{
  const { ctx, p, errs } = await page(375);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  const t0 = Date.now();
  const ok = await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90_000 }).then(() => true).catch(() => false);
  const visible = ok && (await p.locator("h1, main").first().isVisible({ timeout: 30_000 }).catch(() => false));
  record("N-SLOW-3G-LANDING", visible && errs.page.length === 0, `domcontentloaded+visible in ${Date.now() - t0} ms on 400 kbps/400 ms`);
  await ctx.close();
}
{
  const { ctx, p, errs } = await page(1440, { setup: (pg) => pg.route("**/api/stream**", (route) => route.abort("connectionreset")) });
  await p.goto(BASE + "/proof", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(8000);
  record("N-SSE-DROPPED", errs.page.length === 0, `pageErrors ${errs.page.length}`);
  await ctx.close();
}
{
  let n = 0;
  const { ctx, p, errs } = await page(1440, { setup: (pg) => pg.route("**/api/**", (route) => (n++ % 2 === 0 ? route.fulfill({ status: 503, body: '{"error":"busy","retryAfter":1}', headers: { "content-type": "application/json", "retry-after": "1" } }) : route.continue())) });
  for (const route of ["/board", "/proof", "/jar", "/stake"]) { await p.goto(BASE + route, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000); }
  record("N-INTERMITTENT-503", errs.page.length === 0, `api calls ${n}, pageErrors ${errs.page.length}`);
  await ctx.close();
}

// ---------------------------------------------------------------- Phase 8: refresh during load, back button, rapid nav
{
  const { ctx, p, errs } = await page(1440);
  await p.goto(`${BASE}/card/${DEMO}`, { waitUntil: "commit" });
  await p.reload({ waitUntil: "commit" });
  await p.reload({ waitUntil: "domcontentloaded" });
  const ok = await p.waitForFunction(() => /\$\s?[0-9][0-9,]*\.\d\d/.test(document.body.innerText), null, { timeout: 60_000 }).then(() => true).catch(() => false);
  record("R-REFRESH-DURING-LOAD", ok && errs.page.length === 0, `card rendered after double refresh ${ok}`);
  await ctx.close();
}
{
  const { ctx, p, errs } = await page(1440);
  for (const r of ["/", "/trade", "/stake", "/board"]) await p.goto(BASE + r, { waitUntil: "domcontentloaded" });
  await p.goBack(); await p.goBack(); await p.goForward();
  await p.waitForTimeout(2000);
  record("R-BACK-FORWARD", errs.page.length === 0 && p.url().endsWith("/stake"), `ended at ${p.url().replace(BASE, "")}`);
  await ctx.close();
}
{
  const { ctx, p, errs } = await page(1440);
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  for (const r of ["/trade", "/jar", "/stake", "/board", "/proof", "/app", "/trade", "/"]) { p.goto(BASE + r).catch(() => {}); await p.waitForTimeout(150); }
  await p.waitForTimeout(4000);
  record("R-RAPID-NAV", errs.page.length === 0, `pageErrors ${errs.page.length}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.id} :: ${r.note}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
