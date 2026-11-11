// File: web/app/api/stream/route.ts
// [UNVERIFIED] GetBlock WSS eth_subscribe("logs") on RH 4663 - endpoint answers JSON-RPC (chainId 0x1237 verified);
// subscription behaviour is tested by livetest. Falls back to eth_getLogs polling if the socket fails or closes.
// The shared GetBlock URL never leaves the server: browsers receive Server-Sent Events only.
// Lifecycle (H-01/M5): one cleanup() bound to client abort, socket close/error and the 55 s deadline closes the
// socket, timers and the controller exactly once; nothing is enqueued after close; at most 20 streams per instance.
import { decodeEventLog, type Hex } from "viem";
import { TF } from "@/lib/config";
import { feePoolAbi, hindsightLensAbi, jarAbi, terraRouterAbi } from "@/lib/abi";
import { Busy, streamSlots } from "@/lib/concurrency";
import { hex, rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Log = { address: Hex; topics: Hex[]; data: Hex; transactionHash: Hex; blockNumber: Hex; removed?: boolean };
const ABIS = [terraRouterAbi, feePoolAbi, jarAbi, hindsightLensAbi] as const;
const WATCH = [TF.TerraRouter, TF.FeePool, TF.Jar, TF.HindsightLens];
const KINDS: Record<string, string> = { Traded: "traded", Swept: "swept", Deposited: "deposited", Converted: "converted", Distributed: "distributed", Credited: "credited", CardMinted: "cardMinted" };
const LIFETIME_MS = 55_000;
const POLL_MS = 5_000;
const PING_MS = 15_000;

function toEvent(l: Log) {
  if (l.removed) return null; // reorged out
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
  let release: () => void;
  try {
    release = await streamSlots.acquire();
  } catch (e) {
    const retryAfter = e instanceof Busy ? e.retryAfter : 10;
    return Response.json({ error: "busy", retryAfter }, { status: 503, headers: { "retry-after": String(retryAfter) } });
  }
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      stop = runStream(req.signal, controller, release);
    },
    cancel() {
      stop(); // consumer went away without an abort signal
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}

/** Starts the WS subscription (or polling fallback) and returns the idempotent cleanup. */
function runStream(signal: AbortSignal, controller: ReadableStreamDefaultController<Uint8Array>, release: () => void): () => void {
  const enc = new TextEncoder();
  const timers: ReturnType<typeof setTimeout>[] = [];
  let ws: WebSocket | null = null;
  let closed = false;
  let polling = false;

  const write = (chunk: string) => {
    if (closed) return;
    try {
      controller.enqueue(enc.encode(chunk));
    } catch {
      cleanup(); // controller already closed underneath us
    }
  };
  const send = (o: unknown) => write(`data: ${JSON.stringify(o)}\n\n`);
  function cleanup() {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    signal.removeEventListener("abort", cleanup);
    try {
      ws?.close();
    } catch {
      /* already closed */
    }
    try {
      controller.close();
    } catch {
      /* already closed */
    }
    release();
  }

  signal.addEventListener("abort", cleanup);
  timers.push(setTimeout(cleanup, LIFETIME_MS));
  const ping = setInterval(() => write(": ping\n\n"), PING_MS);
  timers.push(ping as unknown as ReturnType<typeof setTimeout>);
  send({ type: "hello", at: Date.now() });

  const startPolling = () => {
    if (closed || polling) return;
    polling = true;
    void poll();
  };

  async function poll() {
    let from: number | null = null;
    while (!closed) {
      try {
        const head = Number(await rpc<Hex>("eth_blockNumber", []));
        from ??= head - 20;
        if (head >= from) {
          const logs = await rpc<Log[]>("eth_getLogs", [{ address: WATCH, fromBlock: hex(from), toBlock: hex(head) }]);
          for (const l of logs) {
            const ev = toEvent(l);
            if (ev) send(ev);
          }
          from = head + 1;
        }
      } catch (e) {
        console.error(JSON.stringify({ route: "stream", poll: "error", error: String(e) }));
        send({ type: "error", error: "rpc_unavailable" }); // keep the stream; retry next tick
      }
      await new Promise<void>((r) => timers.push(setTimeout(r, POLL_MS)));
    }
  }

  const wss = process.env.GETBLOCK_WSS_FRA;
  try {
    if (wss && typeof WebSocket !== "undefined") ws = new WebSocket(wss);
  } catch {
    ws = null;
  }
  if (!ws) {
    startPolling();
    return cleanup;
  }
  ws.onopen = () => ws?.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: WATCH }] }));
  ws.onmessage = (m) => {
    try {
      const msg = JSON.parse(String(m.data)) as { params?: { result?: Log } };
      const ev = msg.params?.result ? toEvent(msg.params.result) : null;
      if (ev) send(ev);
    } catch {
      /* non-JSON or unexpected frame: ignore */
    }
  };
  ws.onerror = () => startPolling();
  ws.onclose = () => startPolling();
  return cleanup;
}
