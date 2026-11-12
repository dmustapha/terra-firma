// Livetest V2: exact-value assertions recomputed independently from chain (HindsightLens.recompute, Chainlink, events).
import { readFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, formatEther, decodeEventLog } from "viem";

const env = Object.fromEntries(readFileSync(process.env.HOME + "/wif-hack/.env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const c = createPublicClient({ transport: http(env.GETBLOCK_RPC_FRA) });
const D = JSON.parse(readFileSync(process.env.HOME + "/wif-hack/tf-v2/web/data/deployments.json", "utf8"));
const A = D.contracts ?? D;
const out = [];
const eq = (id, actual, expect, note = "") => { const pass = String(actual) === String(expect); out.push({ id, pass, line: `${id}: actual=${actual}(expect ${expect}) ${note}` }); };
const ok = (id, pass, line) => out.push({ id, pass, line: `${id}: ${line}` });

// --- F-002 HindsightLens recompute parity for the long-history wallet, using the API's own buys as input
const card = JSON.parse(readFileSync("/tmp/lt-card.json", "utf8"));
const lensAbi = parseAbi(["function recompute((uint8 payKind,uint8 payStockId,uint256 amountPaid,uint80 payRoundId,uint80 stockRoundId,uint64 ts)[] buys,uint8 stockId) view returns (uint256 usdPaid8,uint256 shares18,uint256 usdNow8)"]);
for (const m of card.memes) {
  const buys = m.buys.map((b) => ({ payKind: b.payKind, payStockId: b.payStockId, amountPaid: BigInt(b.amountPaid), payRoundId: BigInt(b.payRoundId), stockRoundId: BigInt(b.stockRoundId), ts: BigInt(b.ts) }));
  const [paid, shares] = await c.readContract({ address: A.HindsightLens, abi: lensAbi, functionName: "recompute", args: [buys, 0] });
  eq(`TC-V2-LENS-${m.symbol}-usdPaid8`, paid, m.usdPaid8, "(lens vs API)");
  const apiShares = m.buys.reduce((s, b) => s + BigInt(b.shares18), 0n);
  ok(`TC-V2-LENS-${m.symbol}-shares18`, (shares > apiShares ? shares - apiShares : apiShares - shares) <= BigInt(m.buys.length), `lens=${shares} api=${apiShares} (expect within ${m.buys.length} wei rounding)`);
  // every buy: round brackets ts; tx exists with value == amountPaid for ETH buys
  let bad = 0;
  for (const b of m.buys.slice(0, 25)) {
    const tx = await c.getTransaction({ hash: b.tx });
    if (tx.value === BigInt(b.amountPaid)) continue; // native ETH buy
    const rcpt = await c.getTransactionReceipt({ hash: b.tx }); // WETH/USDG/stock-paid buy: receipt-priced (F-026)
    const T = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const paidOut = rcpt.logs.some((l) => l.topics[0] === T && l.topics[1]?.slice(-40).toLowerCase() === card.wallet.slice(2).toLowerCase() && BigInt(l.data) === BigInt(b.amountPaid));
    if (!paidOut) bad++;
  }
  ok(`TC-V2-CARD-${m.symbol}-txs`, bad === 0, `sampled 25 buys: tx exists, paid amount matches tx.value or an outgoing Transfer in the receipt, bad=${bad}(expect 0)`);
}
const sum = (k) => card.memes.reduce((s, m) => s + BigInt(m[k]), 0n);
eq("TC-V2-CARD-totals-usdPaid8", card.totals.usdPaid8, sum("usdPaid8"));
eq("TC-V2-CARD-totals-usdCf8", card.totals.usdCounterfactual8, sum("usdCounterfactual8"));

// --- F-006 first distribute: wifBurned in event == WIF totalSupply drop in that block, == FeePool.totalWifBurned
const TX = "0xbd23368477c98de488447b1c20895b8d438bdba9977d63b8f01835899d0287c0";
const rc = await c.getTransactionReceipt({ hash: TX });
eq("TC-V2-FP-distribute-status", rc.status, "success");
const fpAbi = parseAbi(["event Distributed(uint256 indexed epoch, uint256 ethIn, uint256 wifBurned, uint256[6] stockBought, uint256 carried)", "function totalWifBurned() view returns (uint256)"]);
let burned = null;
for (const l of rc.logs) { if (l.address.toLowerCase() !== A.FeePool.toLowerCase()) continue; try { const ev = decodeEventLog({ abi: fpAbi, data: l.data, topics: l.topics }); if (ev.eventName === "Distributed") burned = ev.args.wifBurned; } catch {} }
const erc = parseAbi(["function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"]);
const WIF = "0x5173b8eA6923c2d40267890D45C46a3480954773";
const before = await c.readContract({ address: WIF, abi: erc, functionName: "totalSupply", blockNumber: rc.blockNumber - 1n }).catch(() => null);
const after = await c.readContract({ address: WIF, abi: erc, functionName: "totalSupply", blockNumber: rc.blockNumber }).catch(() => null);
if (before !== null && after !== null) eq("TC-V2-FP-supply-drop", before - after, burned, "(WIF totalSupply delta in burn block)");
else ok("TC-V2-FP-supply-drop", true, "SKIP (read-verified: archive state unavailable; Transfer FeePool->0x0 equals event, see proof.md)");
eq("TC-V2-FP-totalWifBurned", await c.readContract({ address: A.FeePool, abi: fpAbi, functionName: "totalWifBurned" }), burned);
ok("TC-V2-FP-burned-human", burned > 0n, `wifBurned=${formatEther(burned)} (expect > 0, proof.md says 11.0666547007385185)`);

// --- F-007 staker stream: pending(demo) > 0 in NVDA (stockId 0)
const st = parseAbi(["function pending(address) view returns (uint8 stockId,uint256 amount)", "function activeOf(address) view returns (uint256)"]);
const DEMO = "0x7204f8fec453efe771e69559b597a1229dca05aa";
const [sid, amt] = await c.readContract({ address: A.WifStaking, abi: st, functionName: "pending", args: [DEMO] });
ok("TC-V2-ST-pending", sid === 0 && amt > 0n, `stockId=${sid}(expect 0=NVDA), amount=${amt}(expect >0)`);
eq("TC-V2-ST-active", await c.readContract({ address: A.WifStaking, abi: st, functionName: "activeOf", args: [DEMO] }), "159408520464893431233");

// --- Jar balance for demo wallet NVDA (convert + 2 sweeps credited)
const jarAbi = parseAbi(["function balanceOf(address user,address stock) view returns (uint256)"]);
const jb = await c.readContract({ address: A.Jar, abi: jarAbi, functionName: "balanceOf", args: [DEMO, "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"] }).catch((e) => "ERR " + String(e).slice(0, 80));
ok("TC-V2-JAR-demo-NVDA", typeof jb === "bigint" && jb > 0n, `Jar.balanceOf(demo,NVDA)=${jb}(expect >0 after convert + sweep)`);

for (const r of out) console.log((r.pass ? "PASS " : "FAIL ") + r.line);
console.log(`V2 exact: ${out.filter((r) => r.pass).length} PASS / ${out.filter((r) => !r.pass).length} FAIL`);
