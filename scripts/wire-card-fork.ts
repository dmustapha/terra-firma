// File: scripts/wire-card-fork.ts — FORK-ONLY wire probe: builds the Hindsight card for anvil test account 1 against a local
// fork (LOGS_RPC/GETBLOCK_RPC_* = http://127.0.0.1:8545) to exercise the TerraRouter-buy branch on real fork receipts.
// Registry firstBlock is moved to the fork block because pre-fork history is served by the upstream RPC, not the fork.

const of = globalThis.fetch;
globalThis.fetch = (async (u: any, init: any) => {
  const r = await of(u, init); const b = init?.body ? String(init.body) : "";
  if (b.includes("eth_getLogs")) { const t = await r.clone().text(); console.log("getLogs ->", String(u).slice(0, 22), t.slice(0, 160)); }
  return r;
}) as typeof fetch;
process.chdir(new URL("../web", import.meta.url).pathname);
const { TF } = await import("../web/lib/config");
const fork = JSON.parse((await import("node:fs")).readFileSync(new URL("../contracts/deployments/4663.fork.json", import.meta.url), "utf8"));
Object.assign(TF as object, fork, { deployed: true }); // fork addresses: routerMemeLeg must recognise the fork TerraRouter
const { REGISTRY } = await import("../web/lib/registry");
for (const m of REGISTRY.memes) (m as any).firstBlock = Number(process.env.FORK_BLOCK ?? 111420416); // fork block: pre-fork history lives upstream
const { buildCard } = await import("../web/lib/hindsight");
const c = await buildCard("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 0);
console.log(JSON.stringify(c.memes[0]?.buys));
console.log(JSON.stringify(c.memes.map((m:any)=>({s:m.symbol,paid:m.usdPaid8,today:m.usdToday8,cf:m.usdCounterfactual8,buys:m.buys.length,src:m.buys.map((b:any)=>b.source??b.kind)}))));
console.log(JSON.stringify({ memes: c.memes.length, gaps: c.scanGaps, unpriced: c.unpriced }));
