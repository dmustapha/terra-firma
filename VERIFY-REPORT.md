# VERIFY REPORT — MILESTONE MODE

```
=======================================
HACKATHON VERIFY — MILESTONE REPORT
Project: Terra Firma (World is Flat, Robinhood Chain 4663)
Mode: milestone (gate after build P0–P2 + debug + wire)
Time to deadline: internal submit cutoff 2026-11-12 morning WAT (~18h); live-until 2026-11-16 17:30 UTC — status OK
Run date: 2026-11-11
Kill-Zone Escalation: NONE (warnings only)
=======================================
```

## Decision: PROCEED TO P3 (mainnet deploy) — WITH CONDITIONS
Every contract/API step of the demo script executes on a mainnet FORK; nothing is on mainnet yet. Conditions: (1) Dami funds deployer 0.0008 + keeper 0.0004 ETH; (2) the browser signing path is exercised for the first time at livetest; (3) the seed runs ≥ 2 epochs before recording (stake activation e+2).

## Step 0 — VF Recompute Sampling
First pass: sampled 3 / passed 1 / **failed 2** (build VF-1 "38 tests", VF-2 "8,470,710 gas"). Both were true when written; debug grew the suite to 62 and the contracts (gas now 8,545,316 on the fork redeploy). Per protocol the facts were flipped to FAILED in place (RECOMPUTE-FAILED 2026-11-11T04:15:44Z), which forced a HOLD until re-verified. Cure: VF-12/VF-13 replace them with pinned recomputes; retired lines are kept but no longer sampled. Second pass: **sampled 13 / passed 13 / failed 0 / unverifiable 0.**
Finding for the pipeline: `utils/vf-sampler.sh` ignores the `State:` field and samples file order, so a FAILED line is re-sampled forever unless its Recompute token is retired.

## Step 1 — Phase Objectives (P0–P2)
Delivered: P0.T, P1.0–P1.4, P2.1 (fork deploy), P2.3 (critique E-1/E-2). Not delivered: P2.2 browser hero run (DEV-001 UNTESTED: Claude cannot sign with Dami's wallet). **Completion 8/9 = 89%.**

## Step 2 — Architectural Drift: MINOR
Debug changed `FeePool.distribute()` (no caller min-out), stake activation (e+2), gas-based OOG detection, and added `Rolled`/`Deposited` events; wire added `LOGS_RPC`. All are reflected in regenerated ARCHITECTURE/PLAN (arch 10/10, plan 7/7). No sponsor integration was shortcut.

## Step 2.5 — PRD Feature Delta (26 claims)
| Feature | Status | Evidence / Gap |
|---|---|---|
| F-001 Hindsight card | SHIPPED | mainnet heavy wallet $15,380.80; FORK router buys $118.6341 = recompute |
| F-002 Recompute parity | SHIPPED | drill usdPaid8 165768649010 exact; card-check verified/forged |
| F-003 Convert | SHIPPED | FORK drill convert → Jar NVDA |
| F-004 Buy + sweep | SHIPPED | FORK fee exactly 0.5%, sweep credited |
| F-005 Sell + sweep | SHIPPED | fork tests test_sellV3_sweep, test_sellV4_plain |
| F-006 Distribute + burn | SHIPPED | FORK 27.93 / 204.41 / 9.83 WIF burned |
| F-007 Staker stream | SHIPPED | FORK claim → Jar |
| F-008 Anti-JIT | SHIPPED | fork invariant tests |
| F-009 WIF never sold | SHIPPED | test_sellWifReverts, test_convertWifReverts |
| F-010 Chainlink-bounded fills | SHIPPED | fork band/stale tests |
| F-011 Jar withdraw | SHIPPED | FORK full balance returned |
| F-012 Lookup + OG card | SHIPPED | /card + opengraph-image 200 |
| F-013 Paste-CA terminal | SHIPPED | /api/quote buy v2 / sell v3; /trade 200 |
| F-014 Geofence | SHIPPED | US/CU restricted, NG/DE allowed |
| F-015 Keeper | SHIPPED | FORK dry/live/skip (threshold finding below) |
| F-016 /proof | SHIPPED | 200, rubric map, distribute button |
| F-017 Mobile-first UI | PARTIAL | not yet checked at 360px (design/stress) |
| F-018 Quicknode Jar | PARTIAL | no token → badge hidden |
| F-019 Mint card (burn 1 WIF) | SHIPPED | FORK supply −1.0 WIF; no-approval reverts. No fork **test** in suite → stress |
| F-020 Friend Jars (gated) | SHIPPED | 404 when off by design; contract built |
| F-021 Staker discount | SHIPPED | fork tests |
| F-022 Live ticker | SHIPPED | FORK WS events 53 ms |
| F-023 Leaderboards | SHIPPED | /board 200 + card-check |
| F-024 Streak | SHIPPED | ui-logs tests |
| F-025 Weekly report | SHIPPED | /jar/report 200 |
| F-026 Receipt-priced buys | SHIPPED | router-buy legs exclude sweep+fee exactly |

Claims 26 · SHIPPED 24 · PARTIAL 2 (F-017, F-018) · MISSING 0 → coverage 92% (threshold 70%).

## Step 2.6 — Architecture Components
134 planned files / 134 present (tsconfig.json is a small extends file).

## Step 2.7 — confirmed_urls
N/A: no conductor state and no deployed URL yet.

## Step 3 — Demo Path (PRD §6), executed on FORK
| Scene | Status | Evidence |
|---|---|---|
| 1 Landing + connect | PARTIAL | / 200; wallet connect not driven (DEV-001) |
| 2 Card + long-history contrast + recompute + mint | WORKS (FORK/API) | card 12.2 s cold → pre-warm; mint burns 1 WIF |
| 3 Convert → Jar → withdraw | WORKS (FORK) | drill convert; withdraw exact |
| 4 Trade 0.002 ETH + Run distribute → burn | WORKS (FORK) | evidence/verify-milestone-fork.txt: 9.83 WIF burned |
| 5 Stake → claim | WORKS (FORK) | drill; needs stake ≥ 2 epochs before recording |
| 6 /proof | WORKS | 200; verified badge only from deployments.json list |
No BROKEN step. UI signing is the open PARTIAL across scenes 1–5.

## Step 4 — Kill-Zone Early Warnings
- **KZ-1:**
  - Scene 4's fee equals `MIN_DISTRIBUTE_ETH` exactly (0.00001 at 0.002 ETH, `>=`). There is zero margin, and a wallet holding ≥10,000 active WIF pays 0.2%, which would make distribute revert. **Use a 0.003 ETH demo trade.**
  - The heavy-wallet card takes 12 s cold, so pre-warm it.
  - The stake needs e+2 lead time.
- **KZ-2:** submission form on worldisflat.fun/build not drafted yet.
- **KZ-3:** chain 4663 everywhere. `web/data/deployments.json` stays `deployed:false` until P3. Fork addresses equal the predicted mainnet addresses (deployer nonce 0).
- **KZ-4:** sponsor/primitive calls are real (UR, v4 hook, Chainlink, Stock Tokens, $WIF), not imports. Quicknode and Envio have no token.
- **KZ-5:** Nigeria is not in the restricted list. The repo was created 2026-11-10, inside the window. No LICENSE file; a private repo is allowed (invite `wifonrh`), so this is advisory only.

## Feature Observables
FEATURE-OBSERVABLES.md rows are mostly mainnet-after-P3. Fork-marked and fork-equivalent rows PASS (F-002..F-011, F-014, F-015, F-019, F-021, F-022); the mainnet rows are SKIP, documented. observable_score (fork scope) 100%, FUNCTIONAL pending mainnet.

## Critique + Thesis Alignment
- Elevations: E-1..E-4 IMPLEMENTED (guarantee.tsx, RubricMap, MIN_DISTRIBUTE fix, SECURITY "Known weaknesses"). E-5 was not approved.
- P0: 7/11 BUILT-AND-TESTED. F-003/004/007/011 are BUILT-UNTESTED on the UI signing path (contract path PASS on the fork). p0_score 64 → PROCEED-WITH-CONDITIONS.
- Blind cross-review (verify-observables): AGREE (FAIL at the 80% bar). Exit gate OK.
- Thesis re-gate: THESIS-1..5 PASS against the current docs (no demotion of the hero flow).

## Downstream Items
- DH-5 and DH-7 → done.
- DH-1, DH-3, DH-4, DH-6 → reassigned to livetest (mainnet), partially proven on the fork.
- DH-2 → build P3.
- Slip: wire left DH-1..DH-5 open; they are dispositioned here.
- Open for stress_test: DH-8..DH-11, plus a new mintCard fork-test gap.

## Winning Patterns (advisory)
WP-1 landing PASS (content without connect) · WP-2 test ratio 0.40 WARN · WP-3 multi-track N/A (single track) · WP-4/5 SKIPPED (milestone).
