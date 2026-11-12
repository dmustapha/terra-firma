import { chromium } from "playwright-core";
const B = "https://terra-firma-henna.vercel.app";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
await p.goto(B + "/proof", { waitUntil: "load" }); await p.waitForTimeout(10000);
const links = await p.$$eval("a[href]", (as) => [...new Set(as.map((a) => a.href))]);
const ext = links.filter((h) => !h.startsWith(B));
const hosts = {}; for (const h of ext) { const u = new URL(h).host; hosts[u] = (hosts[u] ?? 0) + 1; }
const txs = ext.filter((h) => /\/tx\/0x[0-9a-f]{64}$/i.test(h)).map((h) => h.split("/tx/")[1]);
const addrs = ext.filter((h) => /\/address\/0x[0-9a-fA-F]{40}/.test(h)).map((h) => h.match(/0x[0-9a-fA-F]{40}/)[0]);
console.log(JSON.stringify({ total: links.length, external: ext.length, hosts, txLinks: txs.length, addrLinks: addrs.length }));
// TSLA recompute on the long-history card
await p.goto(B + "/card/0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E", { waitUntil: "load" }); await p.waitForTimeout(12000);
await p.getByText(/^TSLA$/).first().click(); await p.waitForTimeout(9000);
await p.getByRole("button", { name: /Recompute onchain/i }).first().click();
const ok = await p.getByText(/✓/).first().waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
const rows = await p.$$eval("table tr", (trs) => trs.map((t) => t.innerText.replace(/\s+/g, " ")).filter((t) => /Paid \(USD\)|Shares of|now/.test(t)));
await p.screenshot({ path: "dh4-tsla.png" });
console.log(JSON.stringify({ tslaRecompute: ok, rows, url: p.url() }));
await b.close();
console.log("TXS " + txs.join(" ")); console.log("ADDRS " + [...new Set(addrs)].join(" "));
