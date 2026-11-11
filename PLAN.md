# Terra Firma — Implementation Plan

## 1. Plan Metadata
| Field | Value |
|---|---|
| Project | Terra Firma (World is Flat hackathon, Robinhood Chain mainnet 4663) |
| Architecture | `ARCHITECTURE.md` (generated from the real source tree by `scripts/gen-architecture.py`) |
| PRD | `PRD.md` · Law: `INVARIANTS.md` · Thesis: `warroom/WINNER-BRIEF.md ## Thesis` (canonical) |
| scope_mode | see `.forge-state.json` (canonical) |
| Clock | forge ends ~05:30 WAT 2026-11-11; core green on mainnet by 2026-11-11 23:59 WAT (OD7 gate); internal submit 2026-11-12 08:00 WAT; hard deadline 2026-11-12 17:30 UTC; live until 2026-11-16 17:30 UTC |
| Executor | hackathon-build (CAMPAIGN, hand-driven), Dami reviews at each phase gate |

### How to Use This Plan
1. Work phases in order; never start a phase until the previous phase gate checklist is fully ticked.
2. Every task names its ARCHITECTURE.md section; the code there is the code. If a file already exists (forge pre-built it), the task is to verify parity (`python3 scripts/gen-architecture.py` regenerates the doc from the tree) and run its test.
3. Commands are exact and run from `~/wif-hack/terra-firma` unless a `cd` is shown. Secrets come from `~/wif-hack/.env.local` (`set -a; source ../.env.local; set +a`).
4. At any risk point, follow the decision tree (DT-n) named in the task. Never fabricate: escalate per INVARIANTS.md "Escalate, don't fabricate".
5. Commit after each task with the exact message given (repo initialised in Phase 1, Task 1.0).

## 2. Phase Overview
| Phase | Purpose | Time (h) | Window (WAT) | Depends on |
|---|---|:---:|---|---|
| P0 | Forge-built foundation: verify contracts + core libs on fork (already written) | 0.5 | Nov 11 05:30–06:00 | forge |
| P1 | Repo, honesty scaffold (CLAIMS, verify-claims, SECURITY, evidence), domain guide, data builds | 1.5 | 06:00–07:30 | P0 |
| P2 | UI completion (pages already built) + local hero-flow run against a fork-deployed system | 2 | 07:30–09:30 | P1 |
| P3 | Mainnet deploy + verify + sync + Vercel + keeper | 2 | 09:30–11:30 (needs funded deployer) | P2 |
| P4 | Seed real demo state, first distribute with burn, proof | 2 | 11:30–13:30 | P3 |
| P5 | Depth adds on mainnet (stream, board, streak, report, Quicknode, HyperSync, card mint) + mobile pass | 5 | 13:30–18:30 | P4 gate |
| P6 | Core-green check (F-001..F-017), OD7 gate, FriendJar UI only if green | 3.5 | 18:30–22:00 | P5 |
| P7 | Livetest, design pass, interrogate, README/docs, package, demo video, submit (incl. 3h slack) | 10 | Nov 11 22:00 – Nov 12 08:00 | P6 |
| Total | | 26.5 | | |
### Hard cutoffs (peer review, adopted)
| Cutoff | Time (WAT) | Rule |
|---|---|---|
| Mainnet deploy | 2026-11-11 12:00 | if wallets unfunded → DT-8 escalation |
| Core green (OD7) | 2026-11-11 23:59 | depth adds only after P4 gate; DT-2 cut order applies |
| Feature freeze | 2026-11-12 04:00 | only fixes after this |
| Submit (internal) | 2026-11-12 08:00 | two hours earlier than first planned; buffer for approval lag + rehearsal |
| Absolute | 2026-11-12 16:30 (15:30 UTC) | submit whatever is live; 2h before the hard deadline |
Sleep/recovery buffer: 3h reserved inside P7 (P7 = 10h of which 3h is slack).

Build window available: Nov 11 05:30 → Nov 12 08:00 = 26.5h. Sum 26.5h ≤ 26.5h (METRIC 7 PASS; 3h slack inside P7, plus 10.5h between the 08:00 WAT internal submit and the 18:30 WAT (17:30 UTC) hard deadline).

## Phase P0: Forge-built foundation (verify)
Files in this phase were written and tested during forge Phase 2; tasks verify parity and tests.
#### Task F003: create `contracts/foundry.toml`
- Architecture: Section 3 (Shared contract infrastructure), File: contracts/foundry.toml
- Action: create the file with exactly the code block under `#### File: contracts/foundry.toml` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add foundry.toml`

#### Task F004: create `contracts/script/Deploy.s.sol`
- Architecture: Section 3 (Shared contract infrastructure), File: contracts/script/Deploy.s.sol
- Action: create the file with exactly the code block under `#### File: contracts/script/Deploy.s.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add Deploy.s.sol`

#### Task F005: create `contracts/script/TerraConfig.sol`
- Architecture: Section 3 (Shared contract infrastructure), File: contracts/script/TerraConfig.sol
- Action: create the file with exactly the code block under `#### File: contracts/script/TerraConfig.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add TerraConfig.sol`

#### Task F006: create `contracts/src/FeePool.sol`
- Architecture: Section 7 (C3 FeePool), File: contracts/src/FeePool.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/FeePool.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add FeePool.sol`

#### Task F007: create `contracts/src/FriendJar.sol`
- Architecture: Section 10 (C12 FriendJar (gated by OD7)), File: contracts/src/FriendJar.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/FriendJar.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add FriendJar.sol`

#### Task F008: create `contracts/src/HindsightLens.sol`
- Architecture: Section 9 (C6 HindsightLens), File: contracts/src/HindsightLens.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/HindsightLens.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add HindsightLens.sol`

#### Task F009: create `contracts/src/Jar.sol`
- Architecture: Section 5 (C2 Jar), File: contracts/src/Jar.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/Jar.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add Jar.sol`

#### Task F010: create `contracts/src/StockOracle.sol`
- Architecture: Section 4 (C5 StockOracle), File: contracts/src/StockOracle.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/StockOracle.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add StockOracle.sol`

#### Task F011: create `contracts/src/TerraRouter.sol`
- Architecture: Section 8 (C1 TerraRouter), File: contracts/src/TerraRouter.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/TerraRouter.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add TerraRouter.sol`

#### Task F012: create `contracts/src/WifStaking.sol`
- Architecture: Section 6 (C4 WifStaking), File: contracts/src/WifStaking.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/WifStaking.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add WifStaking.sol`

#### Task F013: create `contracts/src/interfaces/IExternal.sol`
- Architecture: Section 3 (Shared contract infrastructure), File: contracts/src/interfaces/IExternal.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/interfaces/IExternal.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add IExternal.sol`

#### Task F014: create `contracts/src/lib/URCodec.sol`
- Architecture: Section 3 (Shared contract infrastructure), File: contracts/src/lib/URCodec.sol
- Action: create the file with exactly the code block under `#### File: contracts/src/lib/URCodec.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && forge build`
- Expected: Compiler run successful
- Commit: `feat(contracts): add URCodec.sol`

#### Task F015: create `contracts/test/HindsightLens.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/HindsightLens.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/HindsightLens.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/HindsightLens.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add HindsightLens.t.sol`

#### Task F016: create `contracts/test/TerraFirma.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/TerraFirma.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/TerraFirma.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/TerraFirma.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add TerraFirma.t.sol`

#### Task F017: create `contracts/test/URProbe.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/URProbe.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/URProbe.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/URProbe.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add URProbe.t.sol`

#### Task F018: create `contracts/test/debug-p2-reentrancy.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p2-reentrancy.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p2-reentrancy.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p2-reentrancy.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p2-reentrancy.t.sol`

#### Task F019: create `contracts/test/debug-p2-staking-invariant.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p2-staking-invariant.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p2-staking-invariant.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p2-staking-invariant.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p2-staking-invariant.t.sol`

#### Task F020: create `contracts/test/debug-p2-weekend-staleness.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p2-weekend-staleness.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p2-weekend-staleness.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p2-weekend-staleness.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p2-weekend-staleness.t.sol`

#### Task F021: create `contracts/test/debug-p6-crossepoch-lock.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p6-crossepoch-lock.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p6-crossepoch-lock.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p6-crossepoch-lock.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p6-crossepoch-lock.t.sol`

#### Task F022: create `contracts/test/debug-p6-feepool.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p6-feepool.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p6-feepool.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p6-feepool.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p6-feepool.t.sol`

#### Task F023: create `contracts/test/debug-p6-hindsight-phase.t.sol`
- Architecture: Section 11 (Contract tests), File: contracts/test/debug-p6-hindsight-phase.t.sol
- Action: create the file with exactly the code block under `#### File: contracts/test/debug-p6-hindsight-phase.t.sol` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/debug-p6-hindsight-phase.t.sol`
- Expected: all tests in the file PASS
- Commit: `feat(contracts): add debug-p6-hindsight-phase.t.sol`

#### Task F031: create `scripts/export-abis.mjs`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/export-abis.mjs
- Action: create the file with exactly the code block under `#### File: scripts/export-abis.mjs` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add export-abis.mjs`

#### Task F033: create `scripts/gen-architecture.py`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/gen-architecture.py
- Action: create the file with exactly the code block under `#### File: scripts/gen-architecture.py` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 scripts/gen-architecture.py`
- Expected: prints the generated line count, exit 0
- Commit: `feat(scripts): add gen-architecture.py`

#### Task F034: create `scripts/gen-plan.py`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/gen-plan.py
- Action: create the file with exactly the code block under `#### File: scripts/gen-plan.py` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 scripts/gen-plan.py`
- Expected: prints the generated line count, exit 0
- Commit: `feat(scripts): add gen-plan.py`

#### Task F050: create `web/app/api/geo/route.ts`
- Architecture: Section 15 (C13 Live Stream + ops API), File: web/app/api/geo/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/geo/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F051: create `web/app/api/health/route.ts`
- Architecture: Section 15 (C13 Live Stream + ops API), File: web/app/api/health/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/health/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F052: create `web/app/api/hindsight/route.ts`
- Architecture: Section 13 (C7 Hindsight Indexer), File: web/app/api/hindsight/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/hindsight/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F054: create `web/app/api/quote/route.ts`
- Architecture: Section 14 (C8 Route Builder), File: web/app/api/quote/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/quote/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F108: create `web/lib/config.ts`
- Architecture: Section 12 (Shared web infrastructure), File: web/lib/config.ts
- Action: create the file with exactly the code block under `#### File: web/lib/config.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add config.ts`

#### Task F110: create `web/lib/hindsight.ts`
- Architecture: Section 13 (C7 Hindsight Indexer), File: web/lib/hindsight.ts
- Action: create the file with exactly the code block under `#### File: web/lib/hindsight.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add hindsight.ts`

#### Task F113: create `web/lib/quote.ts`
- Architecture: Section 14 (C8 Route Builder), File: web/lib/quote.ts
- Action: create the file with exactly the code block under `#### File: web/lib/quote.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add quote.ts`

#### Task F114: create `web/lib/registry.ts`
- Architecture: Section 14 (C8 Route Builder), File: web/lib/registry.ts
- Action: create the file with exactly the code block under `#### File: web/lib/registry.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add registry.ts`

#### Task F117: create `web/lib/rounds.ts`
- Architecture: Section 13 (C7 Hindsight Indexer), File: web/lib/rounds.ts
- Action: create the file with exactly the code block under `#### File: web/lib/rounds.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add rounds.ts`

#### Task F119: create `web/lib/rpc.ts`
- Architecture: Section 12 (Shared web infrastructure), File: web/lib/rpc.ts
- Action: create the file with exactly the code block under `#### File: web/lib/rpc.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add rpc.ts`

#### Task F131: create `web/next.config.ts`
- Architecture: Section 12 (Shared web infrastructure), File: web/next.config.ts
- Action: create the file with exactly the code block under `#### File: web/next.config.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add next.config.ts`

#### Task F132: create `web/package.json`
- Architecture: Section 12 (Shared web infrastructure), File: web/package.json
- Action: create the file with exactly the code block under `#### File: web/package.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add package.json`

#### Task F133: create `web/postcss.config.mjs`
- Architecture: Section 12 (Shared web infrastructure), File: web/postcss.config.mjs
- Action: create the file with exactly the code block under `#### File: web/postcss.config.mjs` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add postcss.config.mjs`

#### Task F134: create `web/tsconfig.json`
- Architecture: Section 12 (Shared web infrastructure), File: web/tsconfig.json
- Action: create the file with exactly the code block under `#### File: web/tsconfig.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add tsconfig.json`

#### Task P0.T: Run the full fork suite
- Architecture: Section "Contract tests"
- Command: `cd contracts && set -a && source ../../.env.local && set +a && set -o pipefail && RPC_URL=$GETBLOCK_RPC_FRA forge test 2>&1 | grep -E 'PASS|FAIL|Suite|Ran' | tee ../evidence/forge-test.txt | tail -3`
- Expected: `62 tests passed, 0 failed` (3 suites) and the pipeline exit code is 0
- Decision tree: DT-7
- Commit: `test(contracts): 32 mainnet-fork tests green`

### Phase P0 Gate
- [ ] `forge build --sizes` shows every contract < 24,576 bytes runtime
- [ ] 62/62 fork tests pass (evidence/forge-test.txt)
- [ ] `cd web && npx tsc --noEmit` clean
- [ ] INVARIANTS.md NON-NEGOTIABLES 1–6 each map to a passing test

## Phase P1: Repo, honesty scaffold, data
#### Task P1.0: Initialise the repo
- Architecture: Section 1 File Structure
- Command: `cd ~/wif-hack/terra-firma && test -f .gitignore && git init -b main && git add -A && git commit -m "chore: terra firma forge output"` (`terra-firma/.gitignore` is created by forge: `.env*`, `node_modules/`, `.next/`, `out/`, `cache/`, `broadcast/`, `contracts/out/`, `contracts/cache/`, `contracts/broadcast/`, `contracts/deployments/4663.fork.json`, `.vercel/`)
- Expected: `git ls-files | grep -cE '^(node_modules|web/node_modules|.*/out|.*/cache|.*broadcast)/|(^|/)\.env($|\.)'` prints 0; `git grep -nE 'getblock\.io/[0-9a-f]{20}'` empty
- Commit: `chore: terra firma forge output`
#### Task P1.1: Domain knowledge file
- Architecture: Section N+1 (Domain Knowledge)
- Command: create `DOMAIN-GUIDE.md` from the Section N+1 table (concepts, rules, glossary, source mapping)
- Expected: every code identifier in the table exists (`for id in BAND_BPS MAX_AGE SCALED_THRESHOLD normalize8 scanBuys payments; do grep -rq $id contracts/src web/lib || echo MISSING $id; done` prints nothing)
- Commit: `docs: domain guide`
#### Task P1.2: Franchise skeleton (claims ledger, recompute verifier, SECURITY.md, honesty ledger)
- Architecture: Section "Security spec (for build's SECURITY.md)"; INVARIANTS.md VERIFY-BEFORE-CLAIMING
- Command: `pnpm tsx scripts/verify-claims.ts` (CLAIMS.md + verifier come from the scripts agent); create `SECURITY.md` with the exact spec shape; create `HONESTY.md` listing every MUST NOT CLAIM item and where the UI/README avoids it
- Expected: verify-claims exits 0 (PENDING rows skipped, none faked); SECURITY.md has `## Threat matrix` with 12 rows, `## Not defended against`, and <!-- [CRITIQUE E-4] --> `## Known weaknesses (our own)` listing every INVARIANTS critical-review survivor + accepted risk, plus a per-contract Blockscout verification status table; README links SECURITY.md above the fold
- Commit: `docs: claims ledger, security, honesty ledger`
#### Task P1.3: Build data files
- Architecture: Section "Generated artifacts"; Section N+9 step 3
- Command: `pnpm tsx scripts/build-registry.ts && pnpm tsx scripts/build-rounds.ts && pnpm tsx scripts/build-restricted.ts && node scripts/export-abis.mjs`
- Expected: memes.json has >= 15 memes with `tested:true`; rounds for 7 feeds (ETH/USD, USDG/USD, NVDA, TSLA, GOOGL, SNDK history, SPY, QQQ; deduped); restricted.json countries non-empty
- Decision tree: DT-13, DT-10
- Commit: `data: registry, chainlink round tables, restricted list`
#### Task P1.4: Seed demo script dry run + Hindsight payment test
- Architecture: Section "C10/C11 Scripts + keeper"
- Command: `pnpm tsx scripts/test-hindsight.ts && DEMO_KEY=0x$(openssl rand -hex 32) pnpm tsx scripts/seed-demo.ts --dry`
- Expected: test-hindsight prints 2 real WETH/USDG-paid tx hashes with detected payKind; seed dry-run prints planned txs with live quotes
- Commit: `test(scripts): hindsight payment detection + seed dry run`
#### Task F001: create `.github/workflows/ci.yml`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: .github/workflows/ci.yml
- Action: create the file with exactly the code block under `#### File: .github/workflows/ci.yml` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/ci.yml'))"`
- Expected: no exception
- Commit: `feat(ci): add ci.yml`

#### Task F002: create `.github/workflows/keeper.yml`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: .github/workflows/keeper.yml
- Action: create the file with exactly the code block under `#### File: .github/workflows/keeper.yml` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/keeper.yml'))"`
- Expected: no exception
- Commit: `feat(ci): add keeper.yml`

#### Task F024: create `package.json`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: package.json
- Action: create the file with exactly the code block under `#### File: package.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(repo): add package.json`

#### Task F025: create `scripts/build-registry.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/build-registry.ts
- Action: create the file with exactly the code block under `#### File: scripts/build-registry.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add build-registry.ts`

#### Task F026: create `scripts/build-restricted.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/build-restricted.ts
- Action: create the file with exactly the code block under `#### File: scripts/build-restricted.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add build-restricted.ts`

#### Task F027: create `scripts/build-rounds.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/build-rounds.ts
- Action: create the file with exactly the code block under `#### File: scripts/build-rounds.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add build-rounds.ts`

#### Task F028: create `scripts/check-arch-metrics.py`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/check-arch-metrics.py
- Action: create the file with exactly the code block under `#### File: scripts/check-arch-metrics.py` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 scripts/check-arch-metrics.py`
- Expected: prints the generated line count, exit 0
- Commit: `feat(scripts): add check-arch-metrics.py`

#### Task F029: create `scripts/check-plan-metrics.py`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/check-plan-metrics.py
- Action: create the file with exactly the code block under `#### File: scripts/check-plan-metrics.py` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `python3 scripts/check-plan-metrics.py`
- Expected: prints the generated line count, exit 0
- Commit: `feat(scripts): add check-plan-metrics.py`

#### Task F030: create `scripts/debug-p2-hindsight-latency.live.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/debug-p2-hindsight-latency.live.ts
- Action: create the file with exactly the code block under `#### File: scripts/debug-p2-hindsight-latency.live.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add debug-p2-hindsight-latency.live.ts`

#### Task F032: create `scripts/fixtures/debug-p2-hindsight-baseline.json`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/fixtures/debug-p2-hindsight-baseline.json
- Action: create the file with exactly the code block under `#### File: scripts/fixtures/debug-p2-hindsight-baseline.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `test -s scripts/fixtures/debug-p2-hindsight-baseline.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add debug-p2-hindsight-baseline.json`

#### Task F035: create `scripts/hindsight.live.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/hindsight.live.ts
- Action: create the file with exactly the code block under `#### File: scripts/hindsight.live.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add hindsight.live.ts`

#### Task F036: create `scripts/keeper.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/keeper.ts
- Action: create the file with exactly the code block under `#### File: scripts/keeper.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add keeper.ts`

#### Task F037: create `scripts/lib/env.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/lib/env.ts
- Action: create the file with exactly the code block under `#### File: scripts/lib/env.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add env.ts`

#### Task F038: create `scripts/lib/files.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/lib/files.ts
- Action: create the file with exactly the code block under `#### File: scripts/lib/files.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add files.ts`

#### Task F039: create `scripts/lib/quote.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/lib/quote.ts
- Action: create the file with exactly the code block under `#### File: scripts/lib/quote.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add quote.ts`

#### Task F040: create `scripts/lib/rpc.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/lib/rpc.ts
- Action: create the file with exactly the code block under `#### File: scripts/lib/rpc.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add rpc.ts`

#### Task F041: create `scripts/proof.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/proof.ts
- Action: create the file with exactly the code block under `#### File: scripts/proof.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add proof.ts`

#### Task F042: create `scripts/seed-demo.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/seed-demo.ts
- Action: create the file with exactly the code block under `#### File: scripts/seed-demo.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add seed-demo.ts`

#### Task F043: create `scripts/sync-deployments.mjs`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/sync-deployments.mjs
- Action: create the file with exactly the code block under `#### File: scripts/sync-deployments.mjs` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add sync-deployments.mjs`

#### Task F044: create `scripts/test-hindsight.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/test-hindsight.ts
- Action: create the file with exactly the code block under `#### File: scripts/test-hindsight.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add test-hindsight.ts`

#### Task F045: create `scripts/tsconfig.json`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/tsconfig.json
- Action: create the file with exactly the code block under `#### File: scripts/tsconfig.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `test -s scripts/tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add tsconfig.json`

#### Task F046: create `scripts/verify-claims.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/verify-claims.ts
- Action: create the file with exactly the code block under `#### File: scripts/verify-claims.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add verify-claims.ts`

#### Task F047: create `scripts/wire-card-fork.ts`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: scripts/wire-card-fork.ts
- Action: create the file with exactly the code block under `#### File: scripts/wire-card-fork.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(scripts): add wire-card-fork.ts`

#### Task F048: create `tsconfig.json`
- Architecture: Section 17 (C10/C11 Scripts + keeper), File: tsconfig.json
- Action: create the file with exactly the code block under `#### File: tsconfig.json` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `npx tsc --noEmit -p tsconfig.json`
- Expected: no type errors (exit 0)
- Commit: `feat(repo): add tsconfig.json`


### Phase P1 Gate
- [ ] [C8] cumulative corrections applied: mainnet 4663, 1-seat vote, no dividend claims, UR 2.1 layout, GetBlock log cap, early-round scaling on all feeds (`grep -c "46630" PRD.md ARCHITECTURE.md` → only historical mentions)
- [ ] repo initialised, no secrets tracked: `git grep -nE 'getblock\.io/[0-9a-f]{20}|quiknode\.pro/[0-9a-f]{20}'` empty and `git grep -nE '(DEPLOYER|DEMO|KEEPER)_KEY=0x[0-9a-fA-F]{64}' -- ':!PLAN.md'` empty
- [ ] CLAIMS.md + scripts/verify-claims.ts + SECURITY.md + HONESTY.md exist (franchise skeleton at C0)
- [ ] data files built from chain; `cd web && npx tsc --noEmit` still clean

## Phase P2: UI completion + local hero flow on a fork deployment
#### Task F049: create `web/app/api/card-check/route.ts`
- Architecture: Section 16 (C9 Frontend), File: web/app/api/card-check/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/card-check/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F056: create `web/app/app/convert/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/app/convert/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/app/convert/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F057: create `web/app/app/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/app/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/app/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F059: create `web/app/card/[addr]/loading.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/card/[addr]/loading.tsx
- Action: create the file with exactly the code block under `#### File: web/app/card/[addr]/loading.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add loading.tsx`

#### Task F060: create `web/app/card/[addr]/opengraph-image.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/card/[addr]/opengraph-image.tsx
- Action: create the file with exactly the code block under `#### File: web/app/card/[addr]/opengraph-image.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add opengraph-image.tsx`

#### Task F061: create `web/app/card/[addr]/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/card/[addr]/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/card/[addr]/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F062: create `web/app/error.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/error.tsx
- Action: create the file with exactly the code block under `#### File: web/app/error.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add error.tsx`

#### Task F064: create `web/app/globals.css`
- Architecture: Section 16 (C9 Frontend), File: web/app/globals.css
- Action: create the file with exactly the code block under `#### File: web/app/globals.css` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add globals.css`

#### Task F065: create `web/app/jar/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/jar/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/jar/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F069: create `web/app/layout.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/layout.tsx
- Action: create the file with exactly the code block under `#### File: web/app/layout.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add layout.tsx`

#### Task F070: create `web/app/not-found.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/not-found.tsx
- Action: create the file with exactly the code block under `#### File: web/app/not-found.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add not-found.tsx`

#### Task F071: create `web/app/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F072: create `web/app/proof/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/proof/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/proof/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F073: create `web/app/stake/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/stake/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/stake/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F074: create `web/app/trade/[token]/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/trade/[token]/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/trade/[token]/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F075: create `web/app/trade/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/trade/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/trade/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F076: create `web/components/address-lookup.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/address-lookup.tsx
- Action: create the file with exactly the code block under `#### File: web/components/address-lookup.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add address-lookup.tsx`

#### Task F077: create `web/components/app-home.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/app-home.tsx
- Action: create the file with exactly the code block under `#### File: web/components/app-home.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add app-home.tsx`

#### Task F078: create `web/components/board-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/board-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/board-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add board-view.tsx`

#### Task F079: create `web/components/card-actions.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/card-actions.tsx
- Action: create the file with exactly the code block under `#### File: web/components/card-actions.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add card-actions.tsx`

#### Task F080: create `web/components/card-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/card-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/card-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add card-view.tsx`

#### Task F081: create `web/components/connect-button.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/connect-button.tsx
- Action: create the file with exactly the code block under `#### File: web/components/connect-button.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add connect-button.tsx`

#### Task F082: create `web/components/convert-panel.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/convert-panel.tsx
- Action: create the file with exactly the code block under `#### File: web/components/convert-panel.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add convert-panel.tsx`

#### Task F083: create `web/components/friends-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/friends-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/friends-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add friends-view.tsx`

#### Task F084: create `web/components/geo-gate.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/geo-gate.tsx
- Action: create the file with exactly the code block under `#### File: web/components/geo-gate.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add geo-gate.tsx`

#### Task F085: create `web/components/guarantee.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/guarantee.tsx
- Action: create the file with exactly the code block under `#### File: web/components/guarantee.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add guarantee.tsx`

#### Task F086: create `web/components/hindsight-card.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/hindsight-card.tsx
- Action: create the file with exactly the code block under `#### File: web/components/hindsight-card.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add hindsight-card.tsx`

#### Task F087: create `web/components/hooks.ts`
- Architecture: Section 16 (C9 Frontend), File: web/components/hooks.ts
- Action: create the file with exactly the code block under `#### File: web/components/hooks.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add hooks.ts`

#### Task F088: create `web/components/jar-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/jar-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/jar-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add jar-view.tsx`

#### Task F089: create `web/components/landing-connect.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/landing-connect.tsx
- Action: create the file with exactly the code block under `#### File: web/components/landing-connect.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add landing-connect.tsx`

#### Task F090: create `web/components/landing-live.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/landing-live.tsx
- Action: create the file with exactly the code block under `#### File: web/components/landing-live.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add landing-live.tsx`

#### Task F091: create `web/components/proof-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/proof-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/proof-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add proof-view.tsx`

#### Task F092: create `web/components/providers.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/providers.tsx
- Action: create the file with exactly the code block under `#### File: web/components/providers.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add providers.tsx`

#### Task F093: create `web/components/report-share.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/report-share.tsx
- Action: create the file with exactly the code block under `#### File: web/components/report-share.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add report-share.tsx`

#### Task F094: create `web/components/site-header.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/site-header.tsx
- Action: create the file with exactly the code block under `#### File: web/components/site-header.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add site-header.tsx`

#### Task F095: create `web/components/stake-view.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/stake-view.tsx
- Action: create the file with exactly the code block under `#### File: web/components/stake-view.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add stake-view.tsx`

#### Task F096: create `web/components/stock-select.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/stock-select.tsx
- Action: create the file with exactly the code block under `#### File: web/components/stock-select.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add stock-select.tsx`

#### Task F097: create `web/components/theme-toggle.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/theme-toggle.tsx
- Action: create the file with exactly the code block under `#### File: web/components/theme-toggle.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add theme-toggle.tsx`

#### Task F098: create `web/components/trade-terminal.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/trade-terminal.tsx
- Action: create the file with exactly the code block under `#### File: web/components/trade-terminal.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add trade-terminal.tsx`

#### Task F099: create `web/components/tx-status.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/tx-status.tsx
- Action: create the file with exactly the code block under `#### File: web/components/tx-status.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add tx-status.tsx`

#### Task F100: create `web/components/ui.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/components/ui.tsx
- Action: create the file with exactly the code block under `#### File: web/components/ui.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui.tsx`

#### Task F101: create `web/lib/api-hindsight.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/api-hindsight.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/api-hindsight.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add api-hindsight.test.ts`

#### Task F102: create `web/lib/api-quote.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/api-quote.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/api-quote.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add api-quote.test.ts`

#### Task F103: create `web/lib/api-stream.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/api-stream.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/api-stream.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add api-stream.test.ts`

#### Task F104: create `web/lib/api-validation.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/api-validation.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/api-validation.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add api-validation.test.ts`

#### Task F105: create `web/lib/card-cache.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/card-cache.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/card-cache.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add card-cache.test.ts`

#### Task F106: create `web/lib/card-cache.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/card-cache.ts
- Action: create the file with exactly the code block under `#### File: web/lib/card-cache.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add card-cache.ts`

#### Task F107: create `web/lib/concurrency.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/concurrency.ts
- Action: create the file with exactly the code block under `#### File: web/lib/concurrency.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add concurrency.ts`

#### Task F109: create `web/lib/hindsight.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/hindsight.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/hindsight.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add hindsight.test.ts`

#### Task F111: create `web/lib/hypersync.ts`
- Architecture: Section 13 (C7 Hindsight Indexer), File: web/lib/hypersync.ts
- Action: create the file with exactly the code block under `#### File: web/lib/hypersync.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add hypersync.ts`

#### Task F112: create `web/lib/quote.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/quote.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/quote.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add quote.test.ts`

#### Task F115: create `web/lib/rounds.integration.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/rounds.integration.ts
- Action: create the file with exactly the code block under `#### File: web/lib/rounds.integration.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add rounds.integration.ts`

#### Task F116: create `web/lib/rounds.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/rounds.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/rounds.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add rounds.test.ts`

#### Task F118: create `web/lib/rpc.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/rpc.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/rpc.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add rpc.test.ts`

#### Task F120: create `web/lib/stock-paths.integration.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/stock-paths.integration.ts
- Action: create the file with exactly the code block under `#### File: web/lib/stock-paths.integration.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add stock-paths.integration.ts`

#### Task F121: create `web/lib/ui-chain.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-chain.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-chain.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-chain.ts`

#### Task F122: create `web/lib/ui-errors.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-errors.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-errors.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-errors.test.ts`

#### Task F123: create `web/lib/ui-errors.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-errors.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-errors.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-errors.ts`

#### Task F124: create `web/lib/ui-format.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-format.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-format.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-format.test.ts`

#### Task F125: create `web/lib/ui-format.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-format.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-format.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-format.ts`

#### Task F126: create `web/lib/ui-logs.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-logs.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-logs.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-logs.test.ts`

#### Task F127: create `web/lib/ui-logs.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-logs.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-logs.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-logs.ts`

#### Task F128: create `web/lib/ui-report.test.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-report.test.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-report.test.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-report.test.ts`

#### Task F129: create `web/lib/ui-report.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/ui-report.ts
- Action: create the file with exactly the code block under `#### File: web/lib/ui-report.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add ui-report.ts`

#### Task F130: create `web/lib/wagmi.ts`
- Architecture: Section 16 (C9 Frontend), File: web/lib/wagmi.ts
- Action: create the file with exactly the code block under `#### File: web/lib/wagmi.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add wagmi.ts`

#### Task P2.3: Hardest-guarantee line + rubric map (critique E-1, E-2)
- Architecture: Section "C9 Frontend"; PRD §4.13 "Landing guarantee", §7.6 rubric map
- Command: add the guarantee line + "Recompute this card" link to `web/app/page.tsx` and `web/components/hindsight-card.tsx`; add the three rubric cards at the top of `web/components/proof-view.tsx`; then `cd web && npx tsc --noEmit && pnpm build`
- Expected: build clean; `curl -s localhost:3000/ | grep -c recomputable` → 1; /proof shows 3 rubric cards each with >= 1 live link
- Commit: `feat(web): hardest-guarantee line + rubric map (critique E-1/E-2)`
#### Task P2.1: Local fork deployment for UI testing
- Architecture: Section N+9 (Deployment Sequence), steps 1 and 3 against anvil
- Command: `(anvil --fork-url $GETBLOCK_RPC_FRA --chain-id 4663 --port 8545 > /tmp/anvil.log 2>&1 &) && until cast block-number --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1; do sleep 1; done && cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast && mv deployments/4663.json deployments/4663.fork.json && cd ..` (the fork file is gitignored and never synced; `test ! -f contracts/deployments/4663.json` must hold after this task) (anvil default key 0 — a public test key, never funded on mainnet; kill anvil when done: `lsof -ti:8545 | xargs kill`)
- Expected: 7 addresses printed; NOT synced into web/data (mainnet-only file)
- Commit: `git commit --allow-empty -m "chore(milestone): fork deployment for UI testing"`
#### Task P2.2: Hero flow run (local)
- Architecture: Section "C9 Frontend"
- Command: `cd web && NEXT_PUBLIC_RPC_OVERRIDE=http://127.0.0.1:8545 pnpm dev` then walk F1→F3→F5→F4 in Chrome with an anvil account (wallet RPC = localhost)
- Expected: card renders for a real mainnet wallet; convert/buy/stake succeed against the fork contracts
- Decision tree: DT-5, DT-15
- Commit: `feat(web): hero flow verified on fork`

### Phase P2 Gate
- [ ] `cd web && npx tsc --noEmit && pnpm build` clean
- [ ] every route in ROUTE-ARCHITECTURE.md renders with deployed:false (read-only) and with the fork deployment
- [ ] no client bundle contains "getblock.io" (`grep -r getblock .next/static || echo clean` → clean)
- [ ] anvil and dev server killed

## Phase P3: Mainnet deploy, verify, host, keeper
#### Task P3.1: Fund the deployer + keeper (Dami; 0.003 ETH total plan)
- Architecture: Section N+6 Credentials Needed
- Command: Dami bridges ~8 USDT from BSC to ETH on Robinhood Chain into HIS OWN wallet (Relay / LI.FI), then sends 0.0008 ETH to DEPLOYER `0xA39258b9cac4f9c6Ea444b229210839d12953166` and 0.0004 ETH to KEEPER `0x77ac4bD2e09eF0A7416E1a61d319ff9f4f5194BD`; he keeps ~0.0018 ETH to act as the demo user himself (Claude never executes trades or transfers). Keys already generated in `~/wif-hack/.env.local` (DEPLOYER_KEY/DEPLOYER, KEEPER_KEY/KEEPER, RPC_URL; DEMO_* unused)
- Expected: `set -a; source ../.env.local; set +a; cast chain-id --rpc-url $RPC_URL` → 4663; `cast balance $DEPLOYER --rpc-url $RPC_URL` >= 800000000000000; `cast balance $KEEPER --rpc-url $RPC_URL` >= 400000000000000
- Decision tree: DT-8
- Commit: `git commit --allow-empty -m "chore(milestone): deployer + keeper funded (keys in .env.local, never committed)"`
#### Task P3.2: Deploy
- Architecture: Section N+9 step 1
- Command: `cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --slow`
- Expected: deployments/4663.json with 7 addresses, each with code on the PUBLIC mainnet RPC: `for a in $(jq -r '.StockOracle,.Jar,.WifStaking,.FeePool,.TerraRouter,.HindsightLens,.FriendJar' deployments/4663.json); do [ "$(cast code $a --rpc-url https://rpc.mainnet.chain.robinhood.com)" != "0x" ] || echo FAKE $a; done` prints nothing
- Decision tree: DT-8, DT-3
- Commit: `deploy: terra firma on robinhood chain mainnet 4663`
#### Task P3.3: Verify on Blockscout
- Architecture: Section N+9 step 2
- Command: for each contract `forge verify-contract $ADDR src/<Name>.sol:<Name> --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/ --compiler-version 0.8.26 --num-of-optimizations 200 --via-ir --guess-constructor-args --watch` (constructor args are read from the creation tx; if guessing fails, pass `--constructor-args $(cast abi-encode "constructor(...)" ...)` using the values in contracts/script/TerraConfig.sol `deployAll`)
- Expected: each contract page on https://robinhoodchain.blockscout.com/address/$ADDR shows "Contract source code verified" (Blockscout's API is Cloudflare-gated for curl; check in the browser). If verification fails twice: publish the source + Standard JSON input (`forge verify-contract --show-standard-json-input`) in the repo and link it from /proof (DT-3 style disclosure)
- Commit: `chore: verify contracts on blockscout`
#### Task P3.4: Sync + host
- Architecture: Section N+9 steps 3–4
- Command: `node scripts/sync-deployments.mjs && pnpm tsx scripts/build-rounds.ts --update && cd web && vercel link --yes --project terra-firma && for V in GETBLOCK_RPC_FRA GETBLOCK_RPC_NYC GETBLOCK_WSS_FRA; do printf %s "${!V}" | vercel env add $V production; done && printf %s "$DEMO_ADDR" | vercel env add NEXT_PUBLIC_DEMO_ADDR production && vercel deploy --prod --yes` (run in bash for `${!V}`; requires a prior `vercel login` by Dami)
- Expected: `vercel env ls production | grep -c GETBLOCK` → 3; `curl -s $URL/api/health | jq '.rpc,.deployed'` → "ok", true
- Commit: `deploy(web): live on vercel`
#### Task P3.5: Keeper live
- Architecture: Section N+9 step 5; Section "C10/C11 Scripts + keeper"
- Command: `cast wallet new` (a DISTINCT keeper key; Dami funds ~0.001 ETH only) then `gh repo create terra-firma --private --source . --push && gh secret set RPC_URL --body "$RPC_URL" && gh secret set KEEPER_KEY --body "$KEEPER_KEY" && gh workflow run keeper.yml`; README states that anyone can call `FeePool.distribute()` from /proof if the keeper stops
- Expected: `gh secret list` shows RPC_URL and KEEPER_KEY; run log prints "skip" or a distribute tx; the daily rounds refresh is followed by `vercel deploy --prod` from the workflow (VERCEL_TOKEN secret) or by a manual redeploy each morning until 2026-11-16
- Decision tree: DT-12
- Commit: `ci: hourly keeper`

### Phase P3 Gate
- [ ] hackathon-interrogate (contracts scope) PASS BEFORE Task P3.2 (a post-deploy contract fix would wipe seeded state and verifications)
- [ ] 7 contracts deployed + verified; deployments synced; `/api/health` ok
- [ ] keeper workflow green
- [ ] no secret in git history (`git log -p | grep -c getblock.io/` → 0)

## Phase P4: Real demo state + proof
#### Task P4.1: Seed real demo state (Dami's own wallet, minimal spend)
- Architecture: Section N+9 step 6; PRD §6 seed table
- Command: Dami, in the live app with his own wallet: (1) buy ~0.0003 ETH of 2 registry memes in /trade with sweep 0 (gives his card history if he holds no RH memes yet); (2) one /trade buy of ~0.0003 ETH with 2% sweep; (3) /app convert one meme to NVDA; (4) buy ~150 $WIF in /trade and stake it on /stake (NVDA pool). Claude prints exact amounts and checks each tx; `scripts/seed-demo.ts --dry` prints the same plan with live quotes
- Expected: tx hashes for buys, a sweep, a convert, a stake; FeePool balance >= 0.00001 ETH (MIN_DISTRIBUTE_ETH)
- Decision tree: DT-7, DT-17
- Commit: `git commit --allow-empty -m "chore(milestone): real demo state seeded by Dami's wallet"`
#### Task P4.2: First distribute with burn, then claim
- Architecture: Section N+9 step 7
- Command: after the next epoch boundary `gh workflow run keeper.yml`; then from the demo wallet `cast send $STAKING "claim()" --private-key $DEMO_KEY --rpc-url $RPC_URL` in the epoch after the stake activated
- Expected: `Distributed.wifBurned > 0`; `Claimed` event; Jar reward credit
- Decision tree: DT-1, DT-4
- Commit: `git commit --allow-empty -m "chore(milestone): first distribute with burn + first claim on mainnet"`
#### Task P4.3: Proof + claims
- Architecture: Section N+9 step 8; INVARIANTS VERIFY-BEFORE-CLAIMING
- Command: `pnpm tsx scripts/proof.ts && pnpm tsx scripts/verify-claims.ts`
- Expected: proof.md lists 7 contracts + 4 first-of-kind txs; verify-claims exit 0 with no PENDING rows left for deployed facts
- Commit: `docs: mainnet proof + verified claims`

### Phase P4 Gate
- [ ] F-001..F-011 observable on mainnet (FEATURE-OBSERVABLES.md commands pass)
- [ ] /proof shows real first-of-kind txs; recompute box matches for DEMO_ADDR (DT-6)

## Phase P5: Depth adds live + mobile
Entry rule (peer review, adopted): no P5 task starts until the Phase P4 gate is fully ticked on mainnet.
#### Task F053: create `web/app/api/qn-jar/route.ts`
- Architecture: Section 15 (C13 Live Stream + ops API), File: web/app/api/qn-jar/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/qn-jar/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F055: create `web/app/api/stream/route.ts`
- Architecture: Section 15 (C13 Live Stream + ops API), File: web/app/api/stream/route.ts
- Action: create the file with exactly the code block under `#### File: web/app/api/stream/route.ts` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add route.ts`

#### Task F058: create `web/app/board/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/board/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/board/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F063: create `web/app/friends/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/friends/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/friends/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task F066: create `web/app/jar/report/[addr]/loading.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/jar/report/[addr]/loading.tsx
- Action: create the file with exactly the code block under `#### File: web/app/jar/report/[addr]/loading.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add loading.tsx`

#### Task F067: create `web/app/jar/report/[addr]/opengraph-image.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/jar/report/[addr]/opengraph-image.tsx
- Action: create the file with exactly the code block under `#### File: web/app/jar/report/[addr]/opengraph-image.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add opengraph-image.tsx`

#### Task F068: create `web/app/jar/report/[addr]/page.tsx`
- Architecture: Section 16 (C9 Frontend), File: web/app/jar/report/[addr]/page.tsx
- Action: create the file with exactly the code block under `#### File: web/app/jar/report/[addr]/page.tsx` (forge pre-built files: confirm parity — `python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)
- Command: `cd web && npx tsc --noEmit`
- Expected: no type errors (exit 0)
- Commit: `feat(web): add page.tsx`

#### Task P5.0: Enable HyperSync (Dami's Envio token)
- Architecture: Section "C7 Hindsight Indexer" (web/lib/hypersync.ts); Section N+6 ENVIO_API_TOKEN
- Command: `vercel env add ENVIO_API_TOKEN production && vercel deploy --prod && time curl -s "$URL/api/hindsight?addr=0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E" | jq '.memes|length'`
- Expected: same card as the public-RPC path (1 meme, AI, 81 buys) in < 3s; Vercel logs show no `hypersync: fallback`
- Decision tree: DT-5
- Commit: `feat(hindsight): envio hypersync provider`
#### Task P5.1: Quicknode badge
- Architecture: Section "C13 Live Stream + ops API" (qn-jar)
- Command: `vercel env add QUICKNODE_RPC production && vercel deploy --prod && curl -s "$URL/api/qn-jar?addr=$JAR"`
- Expected: `{"agreement":true,...}` or badge hidden with reason logged
- Decision tree: DT-16
- Commit: `feat: quicknode-verified jar badge`
#### Task P5.2: Mint a real card + board rows
- Architecture: Section "C6 HindsightLens"
- Command: from the demo wallet in the UI: Mint this card (approve 1 WIF + mintCard)
- Expected: `CardMinted` event; /board "biggest regret" lists it; WIF totalSupply − 1e18
- Commit: `git commit --allow-empty -m "chore(milestone): first card minted onchain"`
#### Task P5.3: Mobile pass
- Architecture: PRD §4.17
- Command: Chrome DevTools emulation iPhone 14 + Pixel 7 on all routes; real phone via MetaMask in-app browser
- Expected: no horizontal scroll; tap targets >= 44px; hero flow completes
- Decision tree: DT-15
- Commit: `fix(web): mobile pass`

### Phase P5 Gate
- [ ] F-018..F-026 observable on mainnet (or explicitly cut per DT-2 with SUBMISSION_STATUS.md reason)
- [ ] /api/stream emits a `traded` event within 10s of a live trade

## Phase P6: Core-green check + OD7 gate
#### Task P6.1: Core-green audit
- Architecture: PRD §7.7 F-001..F-017
- Command: run every FEATURE-OBSERVABLES.md command for F-001..F-017 against mainnet
- Expected: all pass by 2026-11-11 23:59 WAT
- Decision tree: DT-2
- Commit: `chore: core green on mainnet`
#### Task P6.2: Friend Jars (only if P6.1 green before 23:59 WAT)
- Architecture: Section "C12 FriendJar"
- Command: `vercel env add NEXT_PUBLIC_FRIEND_JARS production` (value 1) `&& vercel deploy --prod`; create a group + 2 contributions + 1 exit on mainnet
- Expected: JarCreated/Contributed/Exited events
- Commit: `feat: friend jars (gate passed)`

### Phase P6 Gate
- [ ] OD7 decision recorded in SUBMISSION_STATUS.md with timestamp (passed/failed)

## Phase P7: Quality, story, submission
#### Task P7.1: livetest + design + interrogate
- Architecture: whole document
- Command: run skills in order: hackathon-livetest → design (generate) → design-forge → hackathon-interrogate → hackathon-verify (preflight)
- Expected: each skill's gate PASS; fixes committed
- Commit: `git commit -am "fix: livetest + design + interrogate findings"` (one commit per skill run, same prefix)
#### Task P7.4: Robinhood Chain Regret Index snapshot (one-off, block-numbered)
- Architecture: Section "C7 Hindsight Indexer"
- Command: for the top 20 holders of the 5 largest registry memes (cap: must finish in < 20 min; `time` it) (from Transfer logs), call `/api/hindsight?addr=…` sequentially (5-min cache), sum `usdPaid8`/`usdToday8`/`usdCounterfactual8`, write `submission/regret-index.md` stating the block number and wallet count
- Expected: one table with totals + block number; every wallet's card reproducible via /card/[addr]
- Commit: `docs: robinhood chain regret index snapshot (block N)`
#### Task P7.2: README + docs + package
- Architecture: Section N+2 (Submission Directory)
- Command: deploy-to-github (README, screenshots) → hackathon-package (submission bundle) owner skills
- Expected: README with Proof, Core Invariants (codes from INVARIANTS.md), Documentation Suite, the Regret Index block number; then `git log -p | grep -cE 'getblock\.io/[0-9a-f]{20}'` → 0 and `gh repo edit --visibility public --accept-visibility-change-consequences` (AI judges must run the README)
- Commit: `docs: readme + submission package`
#### Task P7.3: Demo video + submit + ship thread
- Architecture: PRD §6
- Demo order (AMEND-1 primary flow first; peer diff-3 adapted): Connect the funded demo wallet → its own card → convert → trade with sweep (+ Run distribute burn) → stake/claim; the real long-history wallet `/card/0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E` appears only as a 10s secondary-lookup contrast shot after connecting (numbers re-read live; forge measured $15,314.80 → $2.28 → $14,798.24)
- Command: hackathon-demo (video < 3 min) → submit on worldisflat.fun/build (Dami signs in) → personal-tweeter ship thread (Dami approves)
- Expected: submission receipt by 2026-11-12 08:00 WAT
- Decision tree: DT-11
- Commit: `chore: submitted`

### Phase P7 Gate
- [ ] [C3] README/submission state the uncontested lane with evidence (0 of ~49 entrants convert meme activity into owned stock; research/roster-audit/strategy-density.md)
- [ ] [C5][C9] README opens with the real problem and a real card (the Regret Index snapshot + one live /card link), not a hypothetical
- [ ] [C13] day-1 users: any Robinhood Chain meme wallet can open its card without connecting (verify 3 random registry holders via /card/[addr])
- [ ] [C15] no self-duplication: README positions Terra Firma against built-projects.md (no overlap with leash or other shipped projects)
- [ ] [C1][PH-3] all 4 load-bearing mechanisms + safety layer live on mainnet (F-001..F-011 observables)
- [ ] submission receipt; video link; README links live URL + contracts
- [ ] keeper + host healthy; schedule a check each day until 2026-11-16 17:30 UTC

## Decision Trees (one per PRD CRITICAL/HIGH risk, plus every MEDIUM risk)

#### DT-1: Router volume ≈ 0 makes the flywheel look hollow (R1, HIGH)
Run: `pnpm tsx scripts/proof.ts && grep -E "Routed|WIF burned" submission/proof.md`
Expected: routed ETH > 0 and WIF burned > 0 with tx hashes.
✅ **If it works:** keep the demo framing "real mechanism at real size"; continue.
🔀 **If WIF burned == 0 after seed:** 1. confirm FeePool balance >= 0.00005 ETH (`cast balance $FEEPOOL --rpc-url $RPC_URL`); 2. wait for the next epoch; 3. `gh workflow run keeper.yml` or press "Run distribute" on /proof; 4. re-run proof.ts.
⛔ **If nothing works:** show the fork-test burn (`test_distribute_burnAndStream`) in the video as "verified on a mainnet fork" and the live FeePool balance as pending; never claim a mainnet burn that did not happen. Continue from P5.

#### DT-2: Scope overrun (R2, HIGH)
Run: at each phase gate compare wall clock to the Phase Overview window.
Expected: within window ± 1h.
✅ **If on time:** continue.
🔀 **If > 1h late:** cut in this order: F-025 weekly report → F-024 streak → F-023 boards → F-022 stream (polling stays) → F-018 Quicknode badge. Never cut F-001..F-011 or any INVARIANT.
⛔ **If > 4h late at P6:** FriendJar UI stays off (gate fails), go straight to P7 with the core.

#### DT-3: Security finding during interrogate/review (R3, HIGH)
Run: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test -vv` after adding a test that reproduces the finding.
Expected: new test fails before the fix, passes after.
✅ **If fixed pre-deploy:** redeploy is free (P3 not reached); continue.
🔀 **If found after mainnet deploy:** prefer disabling the affected UI action and documenting it in SECURITY.md; redeploy all 7 only for a funds-at-risk finding AND only if >= 6h remain before the 08:00 WAT submit (re-seed + 2 epochs + re-verify needed), recording old addresses as deprecated.
⛔ **If the fix needs > 2h:** disable the affected UI action, document it in SECURITY.md "Not defended against" with the reason, and continue.

#### DT-4: Third-party WIF/ETH hook misbehaves (R4, MEDIUM)
Run: `cast logs --from-block $DEPLOY_BLOCK --address $FEEPOOL --rpc-url $RPC_URL "Distributed(uint256,uint256,uint256,uint256[6],uint256)"`
Expected: wifBurned > 0.
✅ **If it works:** continue.
🔀 **If wifBurned == 0 and carried grows:** quote the pool: `cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 "quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)" "((0x0000000000000000000000000000000000000000,0x5173b8eA6923c2d40267890D45C46a3480954773,0,200,0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044),true,1000000000000000,0x)" --rpc-url $RPC_URL`; if it reverts, the hook blocks swaps.
⛔ **If the hook blocks swaps:** document in SECURITY.md; the ETH safely carries (try/catch) and the stock stream continues; disclose on /proof.

#### DT-5: Hindsight slow or rate-limited (R5, HIGH)
Run: `time curl -s "http://localhost:3000/api/hindsight?addr=$DEMO_ADDR" | jq '.memes | length'`
Expected: < 12s, >= 3 memes.
✅ **If it works:** continue.
🔀 **If > 12s or 503:** 1. check `/api/health`; 2. lower rpcChunked parallel from 3 to 2; 3. confirm GETBLOCK_* env set on Vercel (`vercel env ls`); 4. re-run.
⛔ **If still failing:** ask Dami for an Envio API token and add HyperSync as provider 0 (`https://robinhood.hypersync.xyz/query`), or shrink the registry to the top 12 memes; never return partial totals.

#### DT-6: Wrong Hindsight numbers (R6, MEDIUM)
Run: `/proof` recompute box for DEMO_ADDR (API vs HindsightLens.recompute).
Expected: identical usdPaid8 and shares18.
✅ **If equal:** continue.
🔀 **If different:** 1. check the round table is current (`pnpm tsx scripts/build-rounds.ts --update`); 2. re-run; 3. if a buy's ts is newer than the table, the table refresh fixes BadRound.
⛔ **If still different:** hide the affected buy rows behind "verifying" and file the mismatch in SUBMISSION_STATUS.md; never show unverified totals.

#### DT-7: Universal Router encoding failure on a route kind (R7, HIGH)
Run: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-test "test_buy|test_sell|test_convert" -vv`
Expected: all PASS.
✅ **If it works:** continue.
🔀 **If `SliceOutOfBounds` (0x3b99b53d):** check the input carries the trailing `uint256[] maxHopSlippage` (URCodec.v2/v3) and the amount is CONTRACT_BALANCE after an exact WRAP/push.
⛔ **If a specific pool kind keeps failing on mainnet:** mark those pools `tested:false` in memes.json (registry rebuild) so the quoter skips them; the route builder falls back to the next best pool.

#### DT-8: Funding/deploy delay (R8, HIGH)
Run: `cast balance $DEPLOYER --rpc-url $RPC_URL`
Expected: >= 0.002 ETH.
✅ **If funded:** run P3.
🔀 **If unfunded at 09:30 WAT:** keep building against the local fork deployment (P2), run livetest/interrogate/design on the fork build and write P7 docs/README; never claim fork txs as mainnet; ping Dami.
⛔ **If unfunded at 18:00 WAT:** escalate to Dami as BLOCKER: rule 3 needs mainnet $WIF txs; no workaround is acceptable (never claim fork txs as mainnet).

#### DT-9: Staking reads as generic (R9, MEDIUM)
Run: livetest first-contact check: landing headline and /card are first.
Expected: Hindsight leads; staking appears after convert and trade.
✅ continue. 🔀 If staking/yield is the first thing seen: reorder landing (Thesis tripwire 1). ⛔ If judges still read it as generic: lead the ship thread with real Hindsight cards (OD8).

#### DT-10: Geofence blocks a judge (R10, MEDIUM)
Run: `curl -s -H "x-vercel-ip-country: US" $URL/api/geo`
Expected: `restricted: true` (if US is listed) and the UI disables only stock actions.
✅ continue. 🔀 If restricted.json is empty: run `pnpm tsx scripts/build-restricted.ts` (fails loudly if unparseable). ⛔ If the list cannot be sourced: keep attestation mandatory for everyone and document.

#### DT-11: Approval lag / deadline (R11, HIGH)
Run: at 09:00 WAT Nov 12 check `submission/` completeness (`ls submission`).
Expected: video link, proof.md, links.md, sponsor-tracks.md.
✅ submit at 08:00 WAT. 🔀 If the video is missing: submit with a working live URL and a 60s screen capture, update the video later in the gallery. ⛔ Never pass 17:30 UTC: submit whatever is live by 15:30 UTC (16:30 WAT).

#### DT-12: Host or keeper dies before Nov 16 (R12, MEDIUM)
Run: `curl -s $URL/api/health | jq .rpc` and the latest keeper workflow run (`gh run list --workflow keeper.yml -L 3`).
Expected: "ok" and a successful run within the last 2 hours.
✅ continue. 🔀 If the keeper fails: re-run manually; check secrets. ⛔ If GitHub Actions is down: anyone can call distribute from /proof; post that instruction in the README.

#### DT-13: Taxed or weird memes (R13, MEDIUM)
Run: `pnpm tsx scripts/build-registry.ts` (marks `tested`).
✅ continue. 🔀 If a top meme fails its quote test: exclude it from the trending list. ⛔ If users paste an untested meme: the terminal warns "untested route" and caps the trade at 0.005 ETH in the UI.

#### DT-14: Weekend stale SPY/QQQ (R14, MEDIUM)
Run: `curl -s $URL/api/health | jq .feeds`
✅ continue. 🔀 If SPY/QQQ false: UI labels those sub-pools "pays on market days"; FeePool skips and carries automatically. ⛔ none needed.

#### DT-15: Mobile wallet UX (R15, MEDIUM)
Run: Chrome DevTools device emulation (iPhone 14) on the hero flow + a real phone with MetaMask mobile browser.
✅ continue. 🔀 If WalletConnect fails: set NEXT_PUBLIC_WC_PROJECT_ID; if absent, keep injected (mobile wallet in-app browsers) as the mobile path. ⛔ Document "use your wallet's in-app browser" on the connect sheet.

#### DT-16: Quicknode unavailable (R16, LOW)
Run: `curl -s "$URL/api/qn-jar?addr=$JAR"`
✅ badge shows. 🔀 If method not found: check the endpoint add-on; ⛔ hide the badge (code already does).

#### DT-17: Uniswap pool/quoter unavailable for a meme (R17, HIGH)
Run: `curl -s "$URL/api/quote?token=<meme>&side=buy&amount=1000000000000000"`
Expected: a route.
✅ continue. 🔀 If `no_route`: rebuild registry; check pools' liquidity. ⛔ The meme is shown as "no route" and is unselectable for convert.

#### DT-18: Chainlink outage or paused feed (R18, HIGH)
Run: `curl -s $URL/api/health | jq .feeds`
Expected: all true (SPY/QQQ may be false on weekends).
✅ continue. 🔀 If NVDA is stale: the default stock switches to the first fresh 24/7 stock in the UI. ⛔ If ETH/USD is stale: all stock actions pause with the PRD copy; Hindsight still renders from the round tables.

## Depth Enrichment
Enrichments this plan builds BEYOND a single-pass / field-floor MVP (CAMPAIGN floor >= 4):
1. **Onchain verifiability of the front door:** HindsightLens recompute + /proof side-by-side check (a judge can verify any card against Chainlink rounds onchain). Phase P0/P4.
2. **Real mainnet-fork test suite (62 tests) including adversarial cases** (JIT staking, $WIF sale, route injection, stale oracle, unbacked credit, no-owner surface). Phase P0.
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
