// File: web/app/api/stream/route.ts
// [UNVERIFIED] GetBlock WSS eth_subscribe("logs") on RH 4663 - endpoint answers JSON-RPC (chainId 0x1237 verified);
// subscription behaviour is tested by livetest. Falls back to eth_getLogs polling if the socket fails.
// The shared GetBlock URL never leaves the server: browsers receive Server-Sent Events only.
import { decodeEventLog, type Hex } from "viem";
import { TF } from "@/lib/config";
import { feePoolAbi, hindsightLensAbi, jarAbi, terraRouterAbi } from "@/lib/abi";
import { hex, rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Log = { address: Hex; topics: Hex[]; data: Hex; transactionHash: Hex; blockNumber: Hex };
const ABIS = [terraRouterAbi, feePoolAbi, jarAbi, hindsightLensAbi] as const;
const WATCH = [TF.TerraRouter, TF.FeePool, TF.Jar, TF.HindsightLens];
const KINDS: Record<string, string> = { Traded: "traded", Swept: "swept", Converted: "converted", Distributed: "distributed", Credited: "credited", CardMinted: "cardMinted" };

function toEvent(l: Log) {
  for (const abi of ABIS) {
    try {
      const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      const type = KINDS[ev.eventName];
      if (!type) return null;
      const args = JSON.parse(JSON.stringify(ev.args, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      return { type, tx: l.transactionHash, block: Number(l.blockNumber), args };
    } catch {
      /* not this ABI */
    }
  }
  return null;
}

export async function GET(req: Request) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      const stopAt = Date.now() + 55_000;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      req.signal.addEventListener("abort", close);
      send({ type: "hello", at: Date.now() });

      const wss = process.env.GETBLOCK_WSS_FRA;
      if (wss && typeof WebSocket !== "undefined") {
        const ws = new WebSocket(wss);
        ws.onopen = () => ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: WATCH }] }));
        ws.onmessage = (m) => {
          const msg = JSON.parse(String(m.data));
          const ev = msg.params?.result ? toEvent(msg.params.result as Log) : null;
          if (ev) send(ev);
        };
        ws.onerror = () => poll();
        setTimeout(() => {
          ws.close();
          close();
        }, stopAt - Date.now());
        return;
      }
      await poll();

      async function poll() {
        let from = Number(await rpc<Hex>("eth_blockNumber", [])) - 20;
        while (!closed && Date.now() < stopAt) {
          const head = Number(await rpc<Hex>("eth_blockNumber", []));
          if (head >= from) {
            const logs = await rpc<Log[]>("eth_getLogs", [{ address: WATCH, fromBlock: hex(from), toBlock: hex(head) }]);
            for (const l of logs) {
              const ev = toEvent(l);
              if (ev) send(ev);
            }
            from = head + 1;
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
        close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
