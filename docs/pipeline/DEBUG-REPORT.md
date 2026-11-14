# DEBUG-REPORT: Terra Firma
Mode: full · Run: 2026-11-11 ~09:45–12:30 WAT · Against: mainnet FORK (anvil, block 111155803) + local web · Mainnet deploy pending funding.

## Executive Summary
Confidence **85/100** (threshold 75, demo live). All tests green: 62 fork tests (from 38), 133 web unit/integration tests (from 21), live tier PASS, fork drill PASS, clean-room PASS, pnpm check green. Debug found and fixed **one fund-locking contract bug** (WifStaking pending buckets, independently found twice), **a demo-breaking card bug** (router buys never appeared on the Hindsight card), **a burn-griefing hole** (caller-chosen wifMinOut), **a liveness hole** (empty hook revert could brick distribute), **a forged-round path** (Chainlink phase boundary), plus 11 backend/frontend MUST-FIX items. 0 CRITICAL / 0 HIGH security findings remain.

## Baseline Snapshot (Phase 1)
- `pnpm check` rc 0 · 21 tests · claims 4 rows · forge build OK · web build OK · /api/health + 7 pages 200.
- Fork suite 38/38 · live tier PASS (heavy wallet card 32.0s) · gas snapshot contracts/.gas-snapshot.
- Test:source ratio 8:81 (0.10) → FAIL at baseline (no API-route/UI-lib tests).

## Known Risks Disposition (Phase 2)
| Risk | Class | Disposition | Evidence |
|---|---|---|---|
| Heavy-wallet Hindsight latency | TESTABLE | HARDENED | 29.0s → 16–20s public RPC (5.8s GetBlock); byte-identical totals; scripts/debug-p2-hindsight-latency.live.ts |
| No reentrancy fork test | TESTABLE | CLEARED | contracts/test/debug-p2-reentrancy.t.sol 10/10 |
| WifStaking [ASSUMED] accounting | TESTABLE | HARDENED (found B-1) | debug-p2-staking-invariant.t.sol 4/4 (245 fuzz sequences × 5 seeds) |
| Weekend SPY/QQQ staleness | TESTABLE | CLEARED (accepted product limit) | debug-p2-weekend-staleness.t.sol 2/2 |
| README / DEV-004 label / visual check / third-party hook | STRUCTURAL/EXTERNAL | ACCEPTED | routed downstream (Phase 3) |

## Delegation Manifest (Phase 3)
Ownership: connections/credentials → **wire**; demo path once with teeth → **verify_milestone**; exhaustive journeys/edges/attacks → **stress_test**. 11 owner-routed rows DH-1…DH-11 appended to PULSE `## Downstream Items` and mirrored in `.debug-state.json.delegationHandoff`. Smoke: /api/health 200 (fork-free, pre-deploy `feePoolWei: null`).

## Security Audit Results (Phase 4, structural)
0 CRITICAL · 1 HIGH (H-01 /api/stream socket leak + no cap) → **FIXED** in Phase 6 · 9 MEDIUM: M-01 rate limiting (PARTIAL: global concurrency caps + card cache; no per-IP limiter), M-02 error echo (FIXED), M-03 rollAll event (FIXED: `Rolled`), M-04 mintCard provenance (MITIGATED: /board re-verifies via /api/card-check; documented), M-05 FriendJar invite brute force (OPEN, gated feature), M-06 burn-leg sandwich (ACCEPTED: per-epoch cap 0.01 ETH), M-07 transitive npm advisories (OPEN, not reachable), M-08 CSP/X-Frame headers (OPEN), M-09 env drift (FIXED). Secrets: clean (tree, history, client bundle). Mock-leak: none.

## Senior Dev Critique (Phase 5)
- contracts: 1 MUST-FIX (pending-bucket lock = B-1, fixed in P2) · 5 SHOULD (S-1..S-5) · 11 NOTE.
- backend: 5 MUST-FIX (M1 router buys missing from card, M2 RPC errors as data, M3 fabricated $0 today, M4 DoS caches, M5 stream lifecycle) · 12 SHOULD · 8 NOTE.
- frontend: 2 MUST-FIX (stake timing copy, fabricated price defaults) · 14 SHOULD · 10 NOTE.
Raw: debug-results/phase-5-{contracts,backend,frontend}-critique.md.

## Fix Round Results (Phase 6)
| Finding | Fix | Test |
|---|---|---|
| B-1 WifStaking pending-bucket lock (fund lock) | older unmatured pending moves into the current bucket; base guard | debug-p2-staking-invariant, debug-p6-crossepoch-lock (2) |
| S-1 distribute burn griefing | `distribute()` takes no caller min-out | test_highWifMinOutCannotSkipBurn |
| S-2 empty-revert bricks distribute | 63/64 gas-rule OOG detector replaces empty-reason check | 4 debug-p6-feepool tests + gas-starvation test |
| S-3 Chainlink phase-boundary forged round | `nextAt == 0` ⇒ BadRound | test_phaseBoundaryRoundRejectedForLaterTs |
| M-03 / NOTE | `Rolled`, `Deposited` events | drill shows Rolled log |
| Backend M1–M5, H-01, M-02, M-09 | purchaseSources(), unwrap(), nullable today + partial, card cache + concurrency, stream cleanup, error codes, quicknodeUrl() | 7 new web test files (rpc, hindsight, card-cache, api-*) |
| Frontend M1, M2, S1–S13 | e+2 copy, null-safe prices, chain switch, fresh quote at signing, lookup everywhere, honest badges, explorer links | 4 new ui-lib test files |

## Final Snapshot
- Fork tests **62/62** (evidence/forge-test.txt) · web tests **133/133** · live tier PASS (hindsight.live 83 buys; latency 19.8s < 20s) · pnpm check: web tsc + tests + claims OK (forge leg guarded) · fork drill: DRILL PASS (burned 27.83 WIF, claim → Jar, recompute exact).
- Contract sizes: FeePool 5,777 · TerraRouter 11,240 · WifStaking 5,457 (all < 24,576).
- Test:source ratio now ~0.40 (35 test files / ~88 sources).

## Unresolved Items
- M-05 FriendJar invite brute-force (gated feature; fix before enabling Friend Jars).
- M-08 CSP / X-Frame headers (deploy-phase config).
- M-01 per-IP rate limiting (global caps only).
- DEV-001 UNTESTED browser wallet signing; DEV-002 (backend) UNTESTED router-buy card path on a real tx (synthetic receipt only) → wire/verify on mainnet.
- Heavy-wallet card latency at 18.6–19.8s on the public RPC (near the 20s test bound; GetBlock path 5.8s; HyperSync pending token).

## Confidence Score Justification
100 − 4×3 (remaining SECURITY-MEDIUM: M-01 partial, M-05, M-07, M-08) = 88; −3 judgment: the two UNTESTED paths (wallet signing, router-buy card) can only be proven on mainnet. **85.**
