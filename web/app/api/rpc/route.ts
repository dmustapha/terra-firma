// File: web/app/api/rpc/route.ts
// Read-only JSON-RPC proxy for the browser. The public Robinhood Chain RPC rate-limits per IP (~4-5 req/s), so a busy
// network or a shared office IP turned into "HTTP request failed" in the UI. Browser reads now go through here to the
// private GetBlock node (server-side secret, never sent to the client), with the public RPC as the fallback.
// Only read methods are forwarded; transactions are signed and sent by the user's wallet, never through this route.
import { PUBLIC_RPC } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_METHODS = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionCount",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getLogs",
  "net_version",
]);
const MAX_BATCH = 30;
const MAX_BODY = 64_000;

type Req = { jsonrpc?: string; id?: number | string | null; method?: unknown; params?: unknown };

const err = (id: Req["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return Response.json(err(null, -32600, "request too large"), { status: 413 });
  let body: Req | Req[];
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json(err(null, -32700, "parse error"), { status: 400 });
  }
  const list = Array.isArray(body) ? body : [body];
  if (list.length === 0 || list.length > MAX_BATCH) return Response.json(err(null, -32600, "batch size"), { status: 400 });

  const allowed = list.filter((r) => typeof r.method === "string" && READ_METHODS.has(r.method));
  const byId = new Map<unknown, unknown>();
  if (allowed.length) {
    const upstream = await forward(allowed);
    if (!upstream) {
      const out = list.map((r) => err(r.id, -32603, "upstream unavailable"));
      return Response.json(Array.isArray(body) ? out : out[0], { status: 503, headers: { "retry-after": "2" } });
    }
    for (const r of upstream) byId.set((r as Req).id, r);
  }
  const out = list.map((r) =>
    typeof r.method === "string" && READ_METHODS.has(r.method)
      ? (byId.get(r.id ?? null) ?? err(r.id, -32603, "missing response"))
      : err(r.id, -32601, "method not allowed"),
  );
  return Response.json(Array.isArray(body) ? out : out[0]);
}

/** GetBlock (private, server-only) first; the public RPC is the fallback. eth_getLogs goes public-first because
 *  GetBlock caps log ranges at ~1,000 blocks. Raw upstream JSON is returned so revert data reaches the wallet UI. */
function upstreams(calls: Req[]): string[] {
  const priv = [process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC].filter((u): u is string => !!u);
  return calls.some((c) => c.method === "eth_getLogs") ? [PUBLIC_RPC, ...priv] : [...priv, PUBLIC_RPC];
}

async function forward(calls: Req[]): Promise<unknown[] | null> {
  const payload = JSON.stringify(calls.map((c) => ({ jsonrpc: "2.0", id: c.id ?? null, method: c.method, params: Array.isArray(c.params) ? c.params : [] })));
  for (const url of upstreams(calls)) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "terra-firma/1.0" },
        body: payload,
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json()) as unknown;
      return Array.isArray(json) ? json : [json];
    } catch {
      /* try the next upstream */
    }
  }
  return null;
}
