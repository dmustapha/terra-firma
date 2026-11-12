// Shared fork harness: Chromium with an injected EIP-1193 wallet that forwards every request to a local anvil fork
// (anvil signs eth_sendTransaction for its unlocked test account). Never touches mainnet.
import { chromium } from "playwright-core";

export const ANVIL = "http://127.0.0.1:8547";
export const BASE = "http://localhost:3412";
export const ACCT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // anvil test account 0 (public test key)

export async function open(width = 1440) {
  const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.exposeFunction("__anvil", async (body) => {
    const r = await fetch(ANVIL, { method: "POST", headers: { "content-type": "application/json" }, body });
    return await r.text();
  });
  await ctx.addInitScript(({ acct }) => {
    let id = 0;
    const listeners = {};
    const provider = {
      isMetaMask: true,
      on: (e, f) => ((listeners[e] ??= []).push(f), provider),
      removeListener: (e, f) => ((listeners[e] = (listeners[e] ?? []).filter((x) => x !== f)), provider),
      async request({ method, params }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [acct];
        if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
        if (method === "wallet_requestPermissions" || method === "wallet_getPermissions") return [{ parentCapability: "eth_accounts" }];
        const res = JSON.parse(await window.__anvil(JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params: params ?? [] })));
        if (res.error) { const e = new Error(res.error.message); e.code = res.error.code; e.data = res.error.data; throw e; }
        return res.result;
      },
    };
    window.ethereum = provider;
    const info = { uuid: "00000000-0000-4000-8000-000000000001", name: "Test Wallet", icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>", rdns: "test.wallet" };
    const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
    window.addEventListener("eip6963:requestProvider", announce);
    announce();
    try { localStorage.setItem("tf.attest.v1", "1"); } catch {}
  }, { acct: ACCT });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error" && !/walletconnect|reown|coinbase|cca-lite|Download the React/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  return { browser, ctx, page, errs };
}

export async function rpc(method, params = []) {
  const r = await fetch(ANVIL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
