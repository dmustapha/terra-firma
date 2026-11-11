import { describe, expect, it } from "vitest";
import { SAVING_EVENTS, chunkRanges, mapLimit, mergeTicker, parseFrame, savingEventsOf, streakDays, toTickerEvents, type TickerEvent } from "./ui-logs";

const U = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const DAY = 86400;

describe("chunkRanges", () => {
  it("splits inclusive ranges", () => {
    expect(chunkRanges(0n, 250n, 100n)).toEqual([[0n, 99n], [100n, 199n], [200n, 250n]]);
    expect(chunkRanges(5n, 5n, 100n)).toEqual([[5n, 5n]]);
  });
  it("is empty when from > to", () => {
    expect(chunkRanges(10n, 9n, 100n)).toEqual([]);
  });
  it("rejects a non-positive chunk", () => {
    expect(() => chunkRanges(0n, 1n, 0n)).toThrow();
  });
});

describe("savingEventsOf", () => {
  const logs = [
    { eventName: "Swept", args: { user: U } },
    { eventName: "Deposited", args: { user: U.toLowerCase() } },
    { eventName: "Converted", args: { user: U } },
    { eventName: "Traded", args: { user: U } },
    { eventName: "Swept", args: { user: "0x0000000000000000000000000000000000000001" } },
  ];
  it("treats Deposited as a Jar source alongside Swept and Converted", () => {
    expect(SAVING_EVENTS.has("Deposited")).toBe(true);
    expect(savingEventsOf(logs, U).map((l) => l.eventName)).toEqual(["Swept", "Deposited", "Converted"]);
  });
  it("is case-insensitive on the address and excludes other users", () => {
    expect(savingEventsOf(logs, U.toUpperCase().replace("0X", "0x"))).toHaveLength(3);
  });
  it("tolerates logs without a user arg", () => {
    expect(savingEventsOf([{ eventName: "Swept", args: {} }], U)).toEqual([]);
  });
});

describe("streakDays", () => {
  const now = 20_000 * DAY * 1000 + 3_600_000; // 01:00 UTC on day 20000
  it("counts consecutive days ending today", () => {
    expect(streakDays([20_000 * DAY + 10, 19_999 * DAY, 19_998 * DAY + 5], now)).toBe(3);
  });
  it("allows the streak to end yesterday", () => {
    expect(streakDays([19_999 * DAY, 19_998 * DAY], now)).toBe(2);
  });
  it("is zero with a gap or no events", () => {
    expect(streakDays([19_997 * DAY], now)).toBe(0);
    expect(streakDays([], now)).toBe(0);
  });
});

describe("mapLimit", () => {
  it("keeps order and caps concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const res = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return x * 10;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(res.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });
  it("handles an empty list", async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
  it("records rejections without throwing", async () => {
    const res = await mapLimit([1, 2], 2, async (x) => {
      if (x === 2) throw new Error("bad");
      return x;
    });
    expect(res[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(res[1].status).toBe("rejected");
  });
});

describe("ticker helpers", () => {
  const ev = (tx: string, block: number, type: TickerEvent["type"] = "traded"): TickerEvent => ({ tx, block, type, args: {} });
  it("converts decoded logs, stringifying bigints and dropping unknown events", () => {
    const out = toTickerEvents([
      { eventName: "Deposited", args: { user: U, stockId: 0, ethIn: 5n, stockOut: 7n }, transactionHash: "0xa", blockNumber: 10n },
      { eventName: "BurnSkipped", args: {}, transactionHash: "0xb", blockNumber: 11n },
    ]);
    expect(out).toEqual([{ type: "deposited", tx: "0xa", block: 10, args: { user: U, stockId: 0, ethIn: "5", stockOut: "7" } }]);
  });
  it("merges, de-duplicates by tx+type and sorts newest first", () => {
    const m = mergeTicker([ev("0x1", 5), ev("0x2", 9)], [ev("0x1", 5), ev("0x1", 5, "swept"), ev("0x3", 7)], 3);
    expect(m.map((e) => `${e.tx}:${e.type}`)).toEqual(["0x2:traded", "0x3:traded", "0x1:traded"]);
  });
  it("parses frames safely", () => {
    expect(parseFrame(JSON.stringify({ type: "hello", at: 1 }))).toBeNull();
    expect(parseFrame("{not json")).toBeNull();
    expect(parseFrame(JSON.stringify({ type: "weird", tx: "0x1" }))).toBeNull();
    expect(parseFrame(JSON.stringify({ type: "swept", tx: "0x1", block: 3, args: { user: U } }))).toEqual({ type: "swept", tx: "0x1", block: 3, args: { user: U } });
  });
});
