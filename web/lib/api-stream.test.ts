// /api/stream lifecycle (H-01 / M5). The RPC transport is replaced (no network); stream logic runs for real.
import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn(async (method: string) => (method === "eth_blockNumber" ? "0x100" : [])));
vi.mock("@/lib/rpc", async (orig) => ({ ...(await orig<typeof import("./rpc")>()), rpc: rpcMock }));
delete process.env.GETBLOCK_WSS_FRA; // polling path

const { GET: stream } = await import("@/app/api/stream/route");
const { streamSlots } = await import("./concurrency");

const open = () => {
  const ac = new AbortController();
  return { ac, res: stream(new Request("http://localhost/api/stream", { signal: ac.signal })) };
};
const firstFrame = async (res: Response) => new TextDecoder().decode((await res.body!.getReader().read()).value);
const tick = () => new Promise((r) => setTimeout(r, 20));

afterEach(() => rpcMock.mockClear());

describe("/api/stream", () => {
  it("sends hello, and a client abort releases the slot and stops polling", async () => {
    const { ac, res } = open();
    const r = await res;
    expect(r.headers.get("content-type")).toBe("text/event-stream");
    expect(await firstFrame(r)).toMatch(/^data: \{"type":"hello"/);
    expect(streamSlots.active).toBe(1);
    ac.abort();
    await tick();
    expect(streamSlots.active).toBe(0);
  });

  it("an RPC failure while polling emits an error event instead of killing the stream or rejecting", async () => {
    rpcMock.mockRejectedValueOnce(new Error("HTTP 429 https://secret"));
    const { ac, res } = open();
    const reader = (await res).body!.getReader();
    const dec = new TextDecoder();
    let text = "";
    while (!text.includes("error")) text += dec.decode((await reader.read()).value);
    expect(text).toContain('"type":"error","error":"rpc_unavailable"');
    expect(text).not.toContain("secret");
    ac.abort();
    await tick();
    expect(streamSlots.active).toBe(0);
  });

  it("caps concurrent streams at 20 with 503 + Retry-After, and frees slots on abort", async () => {
    const live = await Promise.all(Array.from({ length: 20 }, () => open()).map(async (s) => ({ ...s, r: await s.res })));
    expect(live.every((s) => s.r.status === 200)).toBe(true);
    const over = await open().res;
    expect(over.status).toBe(503);
    expect(over.headers.get("retry-after")).toBe("10");
    expect(await over.json()).toEqual({ error: "busy", retryAfter: 10 });
    live.forEach((s) => s.ac.abort());
    await tick();
    expect(streamSlots.active).toBe(0);
    expect((await open().res).status).toBe(200);
  });
});
