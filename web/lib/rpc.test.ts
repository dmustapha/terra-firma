import { describe, expect, it } from "vitest";
import { RpcError, TOO_MANY_LOGS, createTokenBucket, quicknodeUrl, unwrap } from "./rpc";

describe("unwrap (M2: batch errors are never data)", () => {
  it("returns a real result unchanged, including falsy-but-valid values", () => {
    expect(unwrap<string>("0x01")).toBe("0x01");
    expect(unwrap<unknown[]>([])).toEqual([]);
    expect(unwrap<number>(0)).toBe(0);
  });

  it("throws the per-call RpcError instead of returning it", () => {
    const e = new RpcError(-32005, "limit exceeded");
    expect(() => unwrap(e)).toThrow(e);
  });

  it("throws on a null or missing result (pruned block, unknown tx)", () => {
    expect(() => unwrap(null, "block 7")).toThrow(/block 7: null result/);
    expect(() => unwrap(undefined)).toThrow(RpcError);
  });
});

describe("createTokenBucket (S2: process-wide public RPC budget)", () => {
  it("lets a burst through, then makes the caller wait rate-proportionally", () => {
    let t = 0;
    const b = createTokenBucket(4, 8, () => t);
    expect(b.reserve(8)).toBe(0); // burst
    expect(b.reserve(4)).toBe(1000); // 4 calls at 4/s
    t = 1000;
    expect(b.reserve(0)).toBe(0); // the debt has been repaid by now
  });

  it("refills over time but never above the burst", () => {
    let t = 0;
    const b = createTokenBucket(4, 8, () => t);
    t = 60_000;
    expect(b.reserve(8)).toBe(0);
    expect(b.reserve(1)).toBe(250);
  });
});

describe("quicknodeUrl (M-09: .env.local names)", () => {
  it("prefers QUICKNODE_RPC when set", () => {
    expect(quicknodeUrl({ QUICKNODE_RPC: "https://x/abc/", QUICKNODE_BASE: "https://y", QUICKNODE_TOKEN: "t" })).toBe("https://x/abc/");
  });

  it("composes base + token with exactly one slash between and a trailing slash", () => {
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro/", QUICKNODE_TOKEN: "/tok123/" })).toBe("https://spring.quiknode.pro/tok123/");
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro", QUICKNODE_TOKEN: "tok123" })).toBe("https://spring.quiknode.pro/tok123/");
  });

  it("is null when neither form is configured", () => {
    expect(quicknodeUrl({})).toBeNull();
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro" })).toBeNull();
  });
});

describe("TOO_MANY_LOGS", () => {
  it("recognises the 10k-log error only on RpcError", () => {
    expect(TOO_MANY_LOGS(new RpcError(-32005, "query returned more than 10000 results"))).toBe(true);
    expect(TOO_MANY_LOGS(new RpcError(-32005, "rate limited"))).toBe(false);
    expect(TOO_MANY_LOGS(new Error("query returned more than 10000 results"))).toBe(false);
  });
});
