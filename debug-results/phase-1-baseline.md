# Debug Phase 1 — Baseline (Terra Firma)
Date 2026-11-11 · HEAD 5578422 · contracts NOT on mainnet (fork results labelled FORK) · every forge call via scripts/forge.sh

## 1.0 Test : source ratio
Sources counted: contracts/src/**/*.sol (9), web/lib/*.ts excl. tests (18), web/app/**/*.tsx + route.ts (29), web/components/*.tsx|ts (24), scripts/*.ts (8) = **81**
Test files at baseline: **8** (3 `.t.sol`, 2 `.test.ts`, 2 `.integration.ts`, 1 `.live.ts`) → ratio **8 : 81 ≈ 0.10**
After Phase 2: **12 : 81 ≈ 0.15** (+3 `debug-p2-*.t.sol`, +1 `debug-p2-*.live.ts`)

Sources with a direct test (imported by a test file): TerraRouter, Jar, WifStaking, FeePool, StockOracle, HindsightLens, interfaces/IExternal (TerraFirma.t.sol, HindsightLens.t.sol); web/lib/quote, rounds, config, registry (vitest); web/lib/hindsight + rpc (hindsight.live.ts).

Sources with NO test:
- contracts: FriendJar.sol (only `test_friendJar_contributeExit`, indirect), lib/URCodec.sol (indirect via router tests)
- web/lib: abi, hypersync (UNVERIFIED pattern, no token to test), ui-chain, ui-errors, ui-format, ui-logs, ui-report, wagmi
- web/app/api: card-check, geo, health, hindsight (route wrapper), qn-jar, quote, stream — no route tests
- web/app pages + all 24 web/components — no component tests
- scripts: build-registry, build-restricted, build-rounds, keeper, proof, seed-demo, verify-claims, test-hindsight

## 1.3 Verification commands (baseline, before any change)
| Command | Result |
|---|---|
| `pnpm check` | rc=0 · `Test Files 4 passed (4)` · `Tests 21 passed (21)` · `OK fork-tests: claimed 38, derived 38` · `claims verified: 4 rows` (6.2 s) |
| `pnpm test` | 21/21 vitest pass |
| `pnpm test:live` | rc=0 · `card for 0x3fDB…b09E in 32.0s: 1 memes, 97 unpriced` · `PASS hindsight.live: 82 buys resolved onchain` · `fork-tests: this run: 38 tests passed, 0 failed \| evidence: 38 tests passed, 0 failed` (54 s) |
| `scripts/fork-tests.sh` (FORK, block 111155803) | 38 passed, 0 failed |

## 1.5 Compile
- `scripts/forge.sh build` (inside pnpm check): `Compiler run successful with warnings` (forge-lint notes only), no stray solc.
- `cd web && pnpm build`: rc=0, 12.2 s; all routes built.

## 1.6 Web smoke (`PORT=3000 pnpm start`, killed after; port freed)
```
/api/health  HTTP 200  {"rpc":"ok","block":111388201,"deployed":false,...,"feePoolWei":"5028308142349328558"}
/ 200 (30,504 B) · /proof 200 · /stake 200 · /board 200 · /jar 200 · /trade 200 · /app 200
```
→ `feePoolWei` was the ZERO ADDRESS balance (TF.FeePool = 0x0 pre-deploy). Bug fixed in Phase 2 (B-3).

## 1.7 Gas snapshot
- `contracts/.gas-snapshot` — current code, all 54 tests (`forge snapshot`, guarded, RPC_URL set): `54 tests passed, 0 failed`.
- `debug-results/phase-1-gas-snapshot-prefix.txt` — pre-fix baseline (build's 38 tests, WifStaking as built).
- Fix delta (`forge snapshot --diff`): `Overall gas change: 1685 (0.009%)`; +156 gas per `stake()` (e.g. test_jitStakeEarnsNothing +312, test_crossPoolAccruedNoDrain +468); every other test 0.

## Exit
100 % of build's tests pass at baseline (21 vitest, 38 fork, hindsight.live). EXIT MET.
