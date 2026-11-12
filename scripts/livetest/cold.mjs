// Cold-stranger hero: fresh context, no storage, no wallet, env-isolated process. Hero (USER-ONBOARDING U3):
// a stranger drills any wallet into a receipt-backed Hindsight card and recomputes it onchain, no wallet, no login.
import { chromium } from "playwright-core";
const URL = process.env.URL; const W = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); // no storageState
const p = await ctx.newPage(); const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
const t0 = Date.now();
await p.goto(URL, { waitUntil: "load" });
const input = p.getByPlaceholder(/paste it here/i).first();
await input.fill(W);
await p.getByRole("button", { name: /Drill my wallet/i }).first().click();
await p.waitForURL(/\/card\//, { timeout: 60000 });
await p.getByText(/\$1\d,\d{3}/).first().waitFor({ timeout: 75000 });
const tCard = (Date.now() - t0) / 1000;
const rb = p.getByRole("button", { name: /Recompute onchain/i }).first();
await rb.click();
const res = await p.getByText(/\u2713/).first().waitFor({ timeout: 45000 }).then(() => "matched").catch(() => "no-match");
const tAll = (Date.now() - t0) / 1000;
await p.screenshot({ path: "cold-stranger.png" });
const body = (await p.innerText("body")).match(/[^\n]*(match|agree|verified)[^\n]*/i)?.[0]?.slice(0, 160);
console.log(JSON.stringify({ url: p.url(), cardSeconds: tCard, totalSeconds: tAll, recompute: res, line: body, errs: errs.length }));
await b.close();
