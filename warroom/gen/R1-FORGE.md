# R1 — FORGE re-score (independent, anti-sycophancy) | 2026-11-10

| Idea | A Real reason $WIF (34%) | B Flywheel holds (33%) | C Works & built well (33%) | Weighted |
|---|---|---|---|---|
| X Terra Firma (base + AMEND-1 + AMEND-2) | 5.5 | 4.5 | 6.0 | **5.34** |
| Y Crew | 5.0 | 4.0 | 4.0 | **4.34** |

**Pick: X (Terra Firma), with the conditions below.**

## Rationale
I am not handing X this score because it was reshaped. AMEND-2 earns real points: $WIF passes the delete test (no stake, no stock stream), and the scope is down to 4 mechanisms. It still caps at A 5.5 and B 4.5. Stake-for-revenue is a familiar pattern, and the revenue is router fees on a venue anyone can bypass. The direct Uniswap path is cheaper, because the third-party hook already takes 1.04%. Only users who want the sweep will route through X, so the stock stream to stakers is dust at launch. Staking does not create volume, so the loop is open.

C is 6. Every value read is Chainlink-bounded, and the fills are verified (NVDA +0.16%). Residual risks:
- an owned `afterSwapReturnDelta` hook sits on the WIF venue;
- WIF buys cannot be min-out priced, so they need a per-block cap plus an anyone-callable keeper;
- the `/USD` feed goes stale on weekends, so use the 24/7 feed.

Crew's vouch can't resolve before judging. Its demo also shows the sybil farm it claims to stop, and it has the largest build surface.

**Top exploit (X):** just-in-time staking. Stake WIF immediately before `distribute()`, take the pro-rata stock, and unstake. **Fix:** Synthetix-style `rewardPerToken` streaming over each epoch, plus a 1-epoch unstake delay. Add a Foundry invariant: total claims ≤ stock held.
