// DH-1 / DH-6 on a mainnet fork: drive the REAL UI with an injected test wallet through buy+sweep, $WIF buy, stake,
// convert, (warp) distribute, claim, Jar withdraw. Every tx is signed by anvil's test account on the fork only.
import { open, BASE, ACCT, rpc } from "./fork-lib.mjs";

const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const WIF = "0x5173b8eA6923c2d40267890D45C46a3480954773";
const D = { Router: "0xBa4d301D9fD6f5e96c47961EE582851AF4db56Fa", FeePool: "0xb1FDE1C822a3fA7542B7A87D730a1969B2bFf5EB", Staking: "0x065783d9C37c10E1067B5042108E9EEa24429571", Jar: "0xa921DCaF524c4A50f46F26543B0EA3DBD2a4d5bF" };
const TOPIC = (sig) => sig; // topics compared by contract address + count only
const results = [];
const { browser, page, errs } = await open();

const nonce = async () => parseInt(await rpc("eth_getTransactionCount", [ACCT, "latest"]), 16);
async function txsSince(n0, want, ms = 90_000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if ((await nonce()) >= n0 + want) break; await page.waitForTimeout(1000); }
  const head = parseInt(await rpc("eth_blockNumber"), 16);
  const out = [];
  for (let b = head; b > head - 12 && out.length < want; b--) {
    const blk = await rpc("eth_getBlockByNumber", ["0x" + b.toString(16), true]);
    for (const tx of blk.transactions) if (tx.from.toLowerCase() === ACCT.toLowerCase() && parseInt(tx.nonce, 16) >= n0) {
      const r = await rpc("eth_getTransactionReceipt", [tx.hash]);
      out.push({ hash: tx.hash, to: tx.to, status: r.status, logs: r.logs.map((l) => l.address.toLowerCase()) });
    }
  }
  return out.reverse();
}
async function step(id, fn, want, check) {
  const n0 = await nonce();
  try {
    await fn();
    const txs = await txsSince(n0, want);
    const pass = txs.length >= want && txs.every((t) => t.status === "0x1") && (!check || check(txs));
    results.push({ id, pass, txs: txs.map((t) => `${t.hash.slice(0, 12)} ${t.status} logs:${t.logs.length}`) });
  } catch (e) { results.push({ id, pass: false, err: String(e).slice(0, 200) }); }
  await page.screenshot({ path: `fork-${id}.png` }).catch(() => {});
  console.log(JSON.stringify(results.at(-1)));
}
const go = async (path) => { await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForTimeout(4000); };
const clickBtn = async (re) => { const b = page.getByRole("button", { name: re }).first(); await b.waitFor({ state: "visible", timeout: 30_000 }); for (let i = 0; i < 30 && (await b.isDisabled()); i++) await page.waitForTimeout(1000); await b.click(); };

// A. Buy PONS 0.001 ETH with 2% sweep into NVDA (F-004)
await step("FORK-F004-buy-sweep", async () => {
  await go(`/trade/${PONS}`);
  await page.fill("#buy-amt", "0.001");
  await page.waitForTimeout(3000);
  await clickBtn(/^Buy PONS/);
}, 1, (t) => t[0].logs.includes(D.Router.toLowerCase()) && t[0].logs.includes(D.Jar.toLowerCase()));

// B. Buy $WIF 0.002 ETH
await step("FORK-WIF-buy", async () => {
  await go(`/trade/${WIF}`);
  await page.fill("#buy-amt", "0.002");
  await page.waitForTimeout(3000);
  await clickBtn(/^Buy \$WIF/);
}, 1);

// C. Stake all WIF to NVDA (approve + stake)
await step("FORK-F007-stake", async () => {
  await go("/stake");
  await clickBtn(/^Max$/);
  await page.waitForTimeout(800);
  await clickBtn(/Approve and stake|^Stake/);
}, 2, (t) => t.at(-1).logs.includes(D.Staking.toLowerCase()));

// D. Convert PONS -> NVDA (F-003)
await step("FORK-F003-convert", async () => {
  await go("/app/convert?stock=NVDA");
  await page.waitForTimeout(8000);
  const box = page.locator("input[type=checkbox]").first();
  if (await box.count()) { if (!(await box.isChecked())) await box.check(); }
  await clickBtn(/Convert|Approve/);
  await page.waitForTimeout(4000);
  const again = page.getByRole("button", { name: /^Convert/ }).first();
  if (await again.isVisible().catch(() => false) && !(await again.isDisabled())) await again.click().catch(() => {});
}, 1, (t) => t.some((x) => x.logs.includes(D.Jar.toLowerCase())));

// E. Warp 2 epochs, distribute (anvil account 1 signs), then claim in the UI (F-006 / F-007)
const ACCT1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
await rpc("evm_increaseTime", [2 * 3600 + 120]); await rpc("evm_mine");
await rpc("evm_increaseTime", [10]); await rpc("evm_mine");
const dHash = await rpc("eth_sendTransaction", [{ from: ACCT1, to: D.FeePool, data: "0xe4fc6b6d" }]).catch((e) => "ERR " + e.message);
const dr = dHash.startsWith("0x") ? await rpc("eth_getTransactionReceipt", [dHash]) : null;
results.push({ id: "FORK-F006-distribute", pass: dr?.status === "0x1", note: dHash.slice(0, 60) });
console.log(JSON.stringify(results.at(-1)));
await step("FORK-F007-claim", async () => { await go("/stake"); await page.waitForTimeout(3000); await clickBtn(/Claim to Jar/); }, 1, (t) => t[0].logs.includes(D.Jar.toLowerCase()));

// F. Jar withdraw (F-011)
await step("FORK-F011-withdraw", async () => { await go("/jar"); await page.waitForTimeout(6000); await clickBtn(/Withdraw/); await page.waitForTimeout(1500); const c = page.getByRole("button", { name: /^(Withdraw|Confirm)/ }).nth(1); if (await c.isVisible().catch(() => false)) await c.click().catch(() => {}); }, 1);

console.log("first-party errors:", JSON.stringify(errs.slice(0, 8)));
console.log(`FORK UI: ${results.filter((r) => r.pass).length} PASS / ${results.filter((r) => !r.pass).length} FAIL`);
await browser.close();
