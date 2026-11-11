# Build Report — Terra Firma
Executor model: orchestrator (Claude) + implementation subagents; CAMPAIGN, no conductor; Dami asleep (no-stop directive).
Note: forge pre-built and fork-tested the code (ARCHITECTURE.md is generated from the real tree), so build P0 is parity/verification.

## Summary
| Phase | Steps | Status | Notes |
|-------|-------|--------|-------|
| P0 | verify contracts + libs | DONE | 7 contracts < 24KB; 38/38 fork tests; web + scripts tsc clean |
| P1 | repo, honesty scaffold, data | DONE | DOMAIN-GUIDE, SECURITY.md (12-row matrix + Known weaknesses E-4), HONESTY.md, claims.json stub, CI, clean-room.sh, test tiers (21 offline/integration tests), seed-demo minimal-spend plan |
| P2 | UI completion + fork hero flow | DONE (DEV-001 UNTESTED wallet signing) | P2.1 fork deploy via real Deploy.s.sol (7 contracts, 8,470,710 gas = 0.00017 ETH @ 0.02 gwei); scripted fork drill PASS (evidence/drill-fork.txt); P2.3 dispatched |
| P3 | mainnet deploy | BLOCKED (DT-8) | awaiting Dami funding: deployer 0xA39258b9cac4f9c6Ea444b229210839d12953166 (0.0008 ETH), keeper 0x77ac4bD2e09eF0A7416E1a61d319ff9f4f5194BD (0.0004 ETH) |
| P4–P6 | seed, depth adds live, core-green | BLOCKED on P3 | |

## Deviations from Architecture
| ID | Component | ARCHITECTURE Said | ACTUAL | Reason | Class | Downstream Impact |
|----|-----------|-------------------|--------|--------|-------|-------------------|
| DEV-005 | DOMAIN-GUIDE / P1.1 check | identifier NVDA_SCALED_LAST_ROUND | real identifiers SCALED_THRESHOLD / historicalAnswer8 / normalize8 (scaling applies to every history feed); ARCHITECTURE N+1 + PLAN P1.1 corrected and regenerated | the constant was replaced by a value threshold during forge Phase 3.5 fixes | COSMETIC | none |
| DEV-006 | CI / test tiers | CI runs the offline subset of contract tests | CI runs guarded forge build + ABI drift; all .t.sol are fork tests (need RPC_URL) → live tier (`pnpm test:live`, scripts/fork-tests.sh) | no RPC secret in CI | DEGRADED | fork tests run locally/manually only |
| DEV-002 | C9 Frontend /proof totals | totals link to explorer | pre-deploy totals no longer link to the zero address (links appear only when deployed) | honesty: a 0x0 explorer link is misleading | COSMETIC | none |
| DEV-003 | C9 Frontend recompute box | recompute prices in NVDA | recompute box reads ?addr and ?stock and reproduces the card's own stock | the "Recompute this card" link must reproduce the same card | COSMETIC | none |
| DEV-004 | C9 Frontend rubric card 3 | "7 verified ownerless contracts" | label says "verified" only after deploy; pre-deploy it omits the word | claim must follow reality; Blockscout verification is PLAN P3.3 | DEGRADED | if P3.3 verification fails, the label must drop "verified" (known risk) |
| DEV-001 | PLAN P2.2 local hero flow in the browser | walk F1→F3→F5→F4 in Chrome with an anvil account as the wallet | contract-level hero flow driven by scripts/drill-fork.sh (cast, anvil test account) instead; browser wallet signing not exercised | Claude must not import private keys into Dami's browser wallet; Dami is asleep | UNTESTED | wallet-signing UI path first exercised by Dami on mainnet (P4.1) and by livetest; simulate-before-sign in components/hooks.ts reduces risk |

## Failed Attempts & Resolutions
| Step | Error | Attempts | Resolution |
|------|-------|----------|------------|
| forge (pre-build) | solc 0.8.26 via-IR hang compiling FeePool (`reason.length == 0` in catch) | 3 runaway compiles killed | rewrote check in Yul (`_revertIfEmpty`), compile 1s; every forge call now guarded with `perl -e 'alarm N'` |

## Verification Results
| Phase | Command | Expected | Actual | Pass? |
|-------|---------|----------|--------|-------|
| P0 | `forge build --sizes` (guarded) | all < 24,576 B | FeePool 5,538; FriendJar 2,804; HindsightLens 2,850; Jar 1,492; StockOracle 2,655; TerraRouter 11,240; WifStaking 5,336 | ✅ |
| P0 | `RPC_URL=$GETBLOCK_RPC_FRA forge test` | 38 passed | `Ran 3 test suites in 3.14s (7.06s CPU time): 38 tests passed, 0 failed, 0 skipped (38 total tests)` | ✅ |
| P0 | `cd web && npx tsc --noEmit` | exit 0 | exit 0 | ✅ |
| P0 | `npx tsc --noEmit -p tsconfig.json` (scripts) | exit 0 | exit 0 | ✅ |
| P2.1 | `forge script Deploy.s.sol --rpc-url anvil(fork of 4663)` | 7 contracts, predicted addresses match | `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`; TerraRouter 0xB4059a68…e629 (FORK); gasUsed 8,470,710 | ✅ |
| P2.3 | `npx tsc --noEmit`; `curl localhost:3123/ \| grep -c recomputable`; `/proof` rubric titles | 0 errors; 1; 3 | TSC-OK; 1 (agent run) + guarantee.tsx contains the exact line; 3 titles in proof-view.tsx | ✅ |
| P1 | `pnpm check` (orchestrator re-run) | exit 0 | `Tests 21 passed (21)`; `claims verified: 4 rows`; rc=0 | ✅ |
| P1 | `scripts/clean-room.sh --worktree` (agent) | PASS | `== clean-room: PASS` (no secrets, zero ABI drift, evidence 38==38) | ✅ |
| P1 | `pnpm test:live` (agent) | exit 0 | hindsight.live PASS (82 buys resolved onchain) + fork-tests 38/38 | ✅ |
| P2.1 | `bash scripts/drill-fork.sh` | DRILL PASS | buy+sweep, convert, WIF buy (hooked pool), stake, warp 2h, distribute burned 27,868,384,177,613,780,926 wei-WIF (27.87 WIF), staker pending 211,561,439,444,004 NVDA-wei, claim → Jar, recompute 165768649010 == expected → `FORK | DRILL PASS` | ✅ |

## Known Risks (for debug)
- Heavy wallet card latency: 0x3fDB…b09E now takes 28.7s (receipts for 95+ non-ETH txs over the public RPC); /api/hindsight maxDuration is 60s → HyperSync token + receipt batching/caching needed (debug/stress).
- No dedicated reentrancy fork test (T5 relies on OZ nonReentrant) — add in debug/interrogate.
- No root README yet (deploy-to-github owns it; SECURITY.md link above the fold).
- /proof rubric card 3 says "verified" after deploy; if Blockscout verification (P3.3) fails, that word must be removed (DEV-004).
- No visual check yet at 360/768/1280px for the new guarantee line and rubric cards (design phase + livetest).
- Public RPC is the only eth_getLogs path (GetBlock caps ~1,000 blocks); Hindsight under load may hit 429 until ENVIO_API_TOKEN is set.
- SPY/QQQ feeds stale on weekends (judging Sat–Mon): quotes 409, FeePool skips + carries.
- Third-party owned WIF/ETH hook could block swaps: burn carries (BurnSkipped).
- WifStaking accounting is original logic ([ASSUMED]) — covered by 10 staking tests incl. adversarial; interrogate should fuzz it.

## Contract Addresses
| Contract | Network | Address | Tx Hash |
|----------|---------|---------|---------|
| (pending P3 — mainnet deploy awaits funding) | 4663 | — | — |

## Environment Variables Added
| Key | Source Step | Value/Description |
|-----|-------------|-------------------|
| DEPLOYER_KEY / DEPLOYER, KEEPER_KEY / KEEPER, DEMO_KEY / DEMO_ADDR, RPC_URL | pre-P3 (forge, 2026-11-11) | generated wallets in ~/wif-hack/.env.local (never committed); DEMO unused (Dami is demo user) |
