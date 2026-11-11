## Depth Enrichment
Enrichments this plan builds BEYOND a single-pass / field-floor MVP (CAMPAIGN floor >= 4):
1. **Onchain verifiability of the front door:** HindsightLens recompute + /proof side-by-side check (a judge can verify any card against Chainlink rounds onchain). Phase P0/P4.
2. **Real mainnet-fork test suite (38 tests) including adversarial cases** (JIT staking, $WIF sale, route injection, stale oracle, unbacked credit, no-owner surface). Phase P0.
3. **Receipt-priced Hindsight (F-026)** covering WETH/USDG/stock-paid buys, not just ETH. Phase P1/P2.
4. **Staker fee discount (F-021):** a second direct $WIF utility without pricing $WIF. Phase P0 (contract) / P5 (UI).
5. **Live protocol stream over GetBlock WSS (F-022)** with SSE proxy and polling fallback. Phase P5.
6. **Card mint burning $WIF + leaderboards (F-019, F-023)** for the community-vote seat. Phase P5.
7. **Saving streak + weekly Jar report card (F-024, F-025)** for retention. Phase P5.
8. **Quicknode Stock Token API cross-check (F-018)** as sponsor depth. Phase P5.
9. **Friend Jars (gated, F-020)** built and tested, switchable without redeploy. Phase P6.
Count: 9 (>= 4 CAMPAIGN floor). None of these is a post-freeze change-order; all were ratified at Phase 1.5.

## Skill-Ownership Map
| Deliverable | Owner skill | Phase | Plan task |
|---|---|---|---|
| contracts, web code, scripts, tests, domain guide, seed/proof scripts, CLAIMS | hackathon-build | build | P0–P6 (owner: hackathon-build @ build) |
| live_deploy (Vercel + mainnet contracts) | deploy-to-github | deploy | P3.4 (owner: deploy-to-github @ deploy; build runs the contract deploy script, deploy-to-github owns the hosted surface) |
| readme, screenshots | deploy-to-github | deploy | P7.2 (owner: deploy-to-github @ deploy) |
| logo set, DESIGN_SYSTEM.md, brand.json | design-forge | design_forge | P7.1 (owner: design-forge @ design_forge) |
| UI polish / redesign | ui-revamp | design_forge | P7.1 (owner: ui-revamp @ design_forge) |
| demo_video | hackathon-demo | demo | P7.3 (owner: hackathon-demo @ demo) |
| submission_bundle | hackathon-package | package | P7.2–P7.3 (owner: hackathon-package @ package) |
| ship thread posts | personal-tweeter | post-submit | P7.3 (Dami approves every post) |
Stubs: none of the owned deliverables is produced by build; build's P3.4 deploys only to make the live URL exist for livetest (stub_for_build: true), deploy-to-github owns the final hosted surface and README.

## Forge→Build Step Mapping
| PLAN step | What | Architecture/PRD reference | Build upgrade |
|---|---|---|---|
| P1.1 | Domain knowledge file | Section N+1 | #18 |
| P1.4 + P4.1 | Seed demo script (real txs) | PRD 7.5, §6 seed table | #19 |
| P0 (per component) | Tests alongside source | Section N+7 | #20 |
| P4.3 | Proof script, tx hashes | PRD 7.6 | #21 |
| P2 files (web/app/proof) | /proof page | PRD 7.6 | #22 |
| P0 | Test directory structure | Section N+7 | #23 |

## Franchise Skeleton (scaffolded at C0 = Phase P1)
| Surface | File | Task |
|---|---|---|
| Claims ledger | CLAIMS.md | P1.2 |
| Independent recompute verifier | scripts/verify-claims.ts (re-derives each claim from its source; refuses read-back) | P1.2 |
| Security doc | SECURITY.md (spec in ARCHITECTURE "Security spec") | P1.2 |
| Honesty ledger | HONESTY.md (MUST NOT CLAIM list → where it is enforced) | P1.2 |
