// Livetest V1 sweep: every route at 1440 light, 375 mobile light, 1440 dark. Read-only, gentle (sequential).
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = (process.argv[2] ?? "https://terra-firma-henna.vercel.app").replace(/\/$/, "");
const OUT = process.argv[3] ?? "./shots";
mkdirSync(OUT, { recursive: true });
const DEMO = "0x7204f8fec453efe771e69559b597a1229dca05aa";
const LONG = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const WIF = "0x5173b8eA6923c2d40267890D45C46a3480954773";
const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const ROUTES = ["/", "/app", "/app/convert", "/trade", `/trade/${WIF}`, `/trade/${PONS}`, "/jar", "/stake", "/board", "/proof",
  `/card/${LONG}`, `/card/${DEMO}`, `/jar/${DEMO}`, "/friends", "/no-such-page", "/card/0xnotanaddress"];
const NOISE = /walletconnect|web3modal|reown|coinbase|metamask|Download the React DevTools|lit-element|cca-lite|ERR_BLOCKED_BY_CLIENT|chrome-extension/i;
const BAD = /\b(undefined|NaN|\[object Object\]|lorem ipsum|TODO)\b/;

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const rows = [];
const variants = [
  { name: "d1440", width: 1440, height: 900, mobile: false, dark: false },
  { name: "m375", width: 375, height: 812, mobile: true, dark: false },
  { name: "dark1440", width: 1440, height: 900, mobile: false, dark: true },
];
for (const v of variants) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: v.mobile ? 2 : 1 });
  if (v.dark) await ctx.addInitScript(() => { try { localStorage.setItem("tf.theme", "dark"); } catch {} });
  for (const r of ROUTES) {
    if (v.name !== "d1440" && /no-such|notanaddress|friends/.test(r)) continue;
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 200)));
    p.on("console", (m) => { if (m.type() === "error" && !NOISE.test(m.text()) && !NOISE.test(m.location()?.url ?? "")) errs.push(m.text().slice(0, 200)); });
    const t0 = Date.now();
    let status = 0;
    try {
      const res = await p.goto(BASE + r, { waitUntil: "load", timeout: 75_000 });
      status = res?.status() ?? 0;
      await p.waitForTimeout(r.startsWith("/card") || r === "/" || r === "/app" ? 12_000 : 6_000);
    } catch (e) { errs.push("goto: " + String(e).slice(0, 160)); }
    const info = await p.evaluate(() => {
      const text = document.body.innerText;
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
      const small = [...document.querySelectorAll("a,button,input,select,[role=button]")].filter((e) => {
        const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
        return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && (b.height < 44 && b.width < 44 || b.height < 24);
      }).map((e) => (e.textContent || e.getAttribute("aria-label") || e.tagName).trim().slice(0, 30));
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, dup, imgs, small: small.slice(0, 8), smallCount: small.length, h1: document.querySelector("h1")?.innerText?.slice(0, 80) ?? "", sample: text.slice(0, 20000), theme: document.documentElement.dataset.theme };
    }).catch((e) => ({ err: String(e) }));
    const bad = info.sample ? (info.sample.match(BAD) || [])[0] : null;
    const file = `${OUT}/livetest-${v.name}-${r.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "home"}.png`;
    await p.screenshot({ path: file, fullPage: false }).catch(() => {});
    rows.push({ variant: v.name, route: r, status, ms: Date.now() - t0, overflow: info.overflow, dupIds: info.dup, brokenImgs: info.imgs, smallTargets: info.smallCount, smallSample: info.small, badText: bad, h1: info.h1, theme: info.theme, errors: errs });
    console.log(JSON.stringify({ v: v.name, r, status, ov: info.overflow, dup: info.dup?.length, img: info.imgs?.length, small: info.smallCount, bad, errs: errs.length, h1: info.h1 }));
    await p.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/v1-sweep.json`, JSON.stringify(rows, null, 2));
