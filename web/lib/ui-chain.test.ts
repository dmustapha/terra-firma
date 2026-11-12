// File: web/lib/ui-chain.test.ts
// /proof must list every deployed contract (PRD F-016: 6 core + the gated FriendJar), even while Friend Jars is off.
import { describe, expect, it } from "vitest";
import { CONTRACTS, FRIEND_JARS, SHOWN_CONTRACTS } from "./ui-chain";

describe("SHOWN_CONTRACTS", () => {
  it("lists all 7 deployed contracts", () => {
    expect(SHOWN_CONTRACTS.map((c) => c.key)).toEqual(CONTRACTS.map((c) => c.key));
    expect(SHOWN_CONTRACTS).toHaveLength(7);
  });
  it("says the FriendJar screen is switched off when the flag is off", () => {
    const fj = SHOWN_CONTRACTS.find((c) => c.key === "FriendJar");
    if (!FRIEND_JARS) expect(fj?.role).toMatch(/switched off/);
    else expect(fj?.role).not.toMatch(/switched off/);
  });
});
