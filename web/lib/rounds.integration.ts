// Integration tier: runs against the committed Chainlink round tables in web/data/rounds (built from mainnet 4663).
import { describe, expect, it } from "vitest";
import { loadTable, normalize8, NVDA_HISTORY_FEED, PHASE_BASE, roundAt } from "./rounds";

describe("committed NVDA/USD history table", () => {
  it("is ordered and roundAt brackets a mid-table timestamp", async () => {
    const t = await loadTable(NVDA_HISTORY_FEED);
    expect(t.rounds.length).toBeGreaterThan(100);
    for (let i = 1; i < t.rounds.length; i++) expect(t.rounds[i][2]).toBeGreaterThanOrEqual(t.rounds[i - 1][2]);
    const mid = t.rounds[Math.floor(t.rounds.length / 2)];
    const r = roundAt(t, mid[2] + 1);
    const idx = t.rounds.findIndex((x) => PHASE_BASE + BigInt(x[0]) === r.roundId);
    expect(r.updatedAt).toBeLessThanOrEqual(mid[2] + 1);
    if (idx + 1 < t.rounds.length) expect(t.rounds[idx + 1][2]).toBeGreaterThan(mid[2] + 1);
  });

  it("stores early scaled rounds already normalized (round 24 == SOURCE LOCK raw / 1e8)", async () => {
    const t = await loadTable(NVDA_HISTORY_FEED);
    const r24 = t.rounds.find((x) => x[0] === 24);
    expect(r24?.[1]).toBe((2030652000000000000n / 10n ** 8n).toString());
    for (const [n, a] of t.rounds) expect(normalize8(t.feed, n, BigInt(a))).toBe(BigInt(a));
  });

  it("rejects a feed with no committed table", async () => {
    await expect(loadTable("0x000000000000000000000000000000000000dEaD")).rejects.toThrow(/ENOENT/);
  });
});
