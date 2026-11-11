# Debug Phase 2 — Known-Risks Triage (Terra Firma)
Date 2026-11-11 · all on-chain results are **FORK** (Robinhood Chain 4663, block 111155803); nothing was deployed or sent to mainnet.

## Bugs found and fixed
| ID | File:line | Severity | Root cause | Fix | Proof |
|---|---|---|---|---|---|
| B-1 | contracts/src/WifStaking.sol `_addPending` (~l.229) | **HIGH** (permanent $WIF lock, can be inflicted on other users; stranded rewards; unstake DoS) | A top-up in epoch e while an earlier stake from e-1 is still pending overwrote `s.pendingEpoch = e` for the whole `s.pending`, but the older amount stayed in bucket e-1. Staker and pool buckets desync: (a) bucket e-1 activates in the pool at e+1 while the staker does not earn on it → that epoch's reward is stranded; (b) `_removePending(e, s.pending)` reverts `Insufficient` or drains other users' bucket e; (c) if bucket e reaches 0 it is never rolled, `rollAccPlusOne[id][e]` stays 0, and every later `_touch` does `0 - 1` → panic 0x11 → stake/claim/switch/requestUnstake revert forever. | Before choosing the slot, move any still-pending older batch into the current epoch's bucket (8 lines). It activates with the top-up at e+2: never earlier (anti-JIT kept), at worst <= 1 h later than before. ABI unchanged. | Pre-fix: `[FAIL: panic: arithmetic underflow or overflow (0x11)] test_topUpAcrossEpochs_thenUnstakeTopUp_doesNotLock`, `[FAIL: sole staker earns every notified reward: 999999999999999900 !~= 2000000000000000000] test_topUpAcrossEpochs_rewardNotStranded`, `[FAIL: Insufficient(); counterexample …] testFuzz_stakingAccounting (runs: 1)`. Post-fix: all 4 PASS, fuzz 49 runs × 5 seeds = 245 sequences PASS; build's 38 still PASS. Found on its own by phase-5 contracts critique with the same fix. |
| B-2 | contracts/src/WifStaking.sol `stake()` emit; web/components/stake-view.tsx l.133/149/177/191/202 | MEDIUM (INVARIANT 7 copy honesty) | Stake activates at e+2 (`_matured`: placed+1 < current), but the `Staked.activeEpoch` field emitted e+1 and the UI said "You start earning X from the next epoch (in N min)" with N = minutes to the e+1 boundary, so earnings showed up about 60 min later than promised. | Event emits `currentEpoch() + 2`; UI minutes = next boundary + 1 epoch; copy "after one full epoch"; label "Activating". Same as phase-5 frontend M1 (do not apply twice). PRD.md l.148/280 + demo voiceover still say "next epoch": docs owner should fix. | `tsc --noEmit` OK; web build rc=0; /stake 200. |
| B-3 | web/app/api/health/route.ts l.12-23 | LOW (INVARIANT 7: a made-up-looking number) | Before deploy `TF.FeePool` is 0x0, so `feePoolWei` reported the zero address's 5.03 ETH as the FeePool balance. | Skip the balance read and return `null` while `deployed === false`. | Before `"feePoolWei":"5028308142349328558"` → after `"deployed":false,…,"feePoolWei":null`, HTTP 200. |

## Known risks
| # | Risk | Class | Disposition | Test / evidence |
|---|---|---|---|---|
| a | Heavy-wallet Hindsight latency (0x3fDB…b09E 28.7–32 s; maxDuration 60 s) | TESTABLE | **HARDENED** | `scripts/debug-p2-hindsight-latency.live.ts` (+ fixture `scripts/fixtures/debug-p2-hindsight-baseline.json`), wired into `pnpm test:live` |
| b | No reentrancy fork test | TESTABLE | **CLEARED** | `contracts/test/debug-p2-reentrancy.t.sol` 10/10 PASS (FORK) |
| c | WifStaking [ASSUMED] accounting | TESTABLE | **HARDENED** (bug B-1 found and fixed) | `contracts/test/debug-p2-staking-invariant.t.sol` 4/4 PASS (FORK) |
| d | SPY/QQQ weekend staleness | TESTABLE | **CLEARED** (behaves as documented; still an ACCEPTED product limitation) | `contracts/test/debug-p2-weekend-staleness.t.sol` 2/2 PASS (FORK) |
| – | No root README | STRUCTURAL | ACCEPTED → deploy-to-github | – |
| – | /proof "verified" label depends on Blockscout P3.3 (DEV-004) | EXTERNAL | ACCEPTED → verify after P3.3 | – |
| – | No 360/768/1280 visual check | STRUCTURAL | ACCEPTED → design/livetest | – |
| – | Public RPC the only eth_getLogs path (429 under load) | EXTERNAL | HARDENED (part of a) + ACCEPTED: set ENVIO_API_TOKEN to use HyperSync (still UNVERIFIED code) | – |
| – | Third-party WIF/ETH hook could block swaps | EXTERNAL | ACCEPTED (BurnSkipped + carry already tested: `test_burnFailureEmitsAndCarries`) | – |

### (a) Hindsight latency — profile and hardening
Profiled with a fetch wrapper that counts RPC calls (temp script, now deleted). Public RPC only, the same setup as the live tier:
```
BEFORE {"secs":29.422,"posts":109,"s429":44,"maxIn":8,"counts":{"eth_call":46,"eth_getLogs":11,"eth_getTransactionByHash":379,"eth_getBlockByNumber":518,"eth_getTransactionReceipt":188}}
```
Root causes (from the timeline):
1. `payments()` (3 POSTs in flight) and `blockTimes()` (3 more), plus the feed reads, all started at t=2.05 s. With 8 POSTs in flight, 44 of 109 POSTs got HTTP 429 and the exponential backoff ran up to 6.4 s (one gap from 15.7 s to 22.7 s).
2. Block timestamps were fetched for all 179 tx blocks, but only the 82 priced buys use them.
3. The per-buy loop ran `roundAtLive` one buy at a time. Each buy newer than a committed round table (ETH table: 4 buys, NVDA: 1) re-read `latestPrice8` and binary-searched `getRoundData`, giving 13 single-call POSTs (~2.6 s) at the end.

Changes (web/lib/hindsight.ts, web/lib/rounds.ts). Every value is still read from the chain:
- Run `payments()` first, then fetch block times only for priced buys that have no receipt.
- Take block time from the receipt's `blockTimestamp` when it is > 0. Checked against the old output: 0x6af0666b = 1794139755 = the baseline `ts`.
- Pass the already-read `nowEth`/`nowStock` into `roundAtLive(t, ts, latest)`.
- Memoize `roundData` per (feed, round). Past rounds never change; rounds with updatedAt == 0 are not cached.
- Tried and REJECTED: using `blockTimestamp` from eth_getLogs. On this RPC it returns `"0x0"`, which turned all 82 buys into "before Chainlink price history". The byte-compare caught this and the change was reverted.
- Tried, no gain: retuning batch size and parallelism (10×3, 10×1, 20×1, 10×2: 12.5–13.9 s each for the 440 tx/receipt/block calls). The public RPC throttles by load, not by batch shape.
```
AFTER  {"secs":17.474,"posts":76,"s429":28,"maxIn":3,"counts":{"eth_call":32,"eth_getLogs":11,"eth_getTransactionByHash":328,"eth_getTransactionReceipt":309}}   (0 eth_getBlockByNumber)
cmp before.json after3.json → IDENTICAL   (3 runs: 19.9 s, 18.1 s, 17.5 s; all byte-identical)
Production path (GetBlock env set): before 6.9 s / 0×429 → after 5.8 s / 0×429, IDENTICAL
Next server /api/hindsight (public RPC): HTTP 200 in 17.8 s
```
Live test, actual output:
```
new code : card for 0x3fDB…b09E in 16.6s (limit 20s) … PASS debug-p2 hindsight latency: 16576 ms < 20000; 82 buys + 97 unpriced rows identical to pre-change; usdPaid8 1536343900041, shares18 86786299456826669428
old code (stashed): card … in 29.0s (limit 20s) / FAIL debug-p2 hindsight latency: heavy-wallet card took 29022 ms (>= 20000 ms)
in pnpm test:live: 16221 ms < 20000 PASS
```
Caveat: the public RPC is noisy. In the same `test:live` run, `hindsight.live.ts` (the same function, run first) measured 24.5 s. Measured public-only range after the change: 16.2–24.5 s, against 29–32 s before. The 20 s assertion can flake when the RPC is congested; the parity assertions cannot. Production (GetBlock) is about 6 s.

### (b) Reentrancy (FORK), `forge test --match-path test/debug-p2-reentrancy.t.sol`
```
[PASS] test_sellEthSendBack_reenterBuy / _reenterSell / _reenterDeposit / _reenterConvert   (real deployment; receive() re-enters, sees ReentrancyGuardReentrantCall, proceeds intact, router ETH 0)
[PASS] test_sellHostileTokenCallbackReverts / test_convertHostileTokenCallbackReverts         (hostile meme transferFrom → router.deposit → ReentrancyGuardReentrantCall bubbles)
[PASS] test_jarWithdrawReentry          (isolated Jar + hook token: re-entry rejected, paid once, still backed)
[PASS] test_stakingWithdrawReentry      (isolated WifStaking + hook WIF: paid once)
[PASS] test_stakingStakeReentersClaim   (transferFrom hook → claim rejected; stake recorded once)
[PASS] test_feePoolDistributeReentry    (real $WIF burn leg runs, then hostile rollAll → distribute → revert; lastEpoch unchanged)
Suite result: ok. 10 passed; 0 failed
```
Structural note: the real Jar and WifStaking only ever move curated Stock Tokens and the real $WIF (credit is depositor-only and must be backed; wif is immutable), so the hostile-token cases test the guard, not a live attack path.

### (c) WifStaking accounting (FORK), real $WIF + real NVDA/TSLA, test contract acts as FeePool
Checked after every step of 36 random ops across 3 users and many epochs, with distributes in between: claimed + pending <= notified per pool; the contract holds all pending rewards; $WIF balance == staked + unstaking; no reward from epoch E for a stake placed at E-1 or later; claim/unstake/switch/withdraw never revert within the user's balance; a final full exit leaves 0 $WIF.
```
pre-fix : [FAIL: Insufficient(); counterexample …] testFuzz_stakingAccounting (runs: 1) · [FAIL: panic 0x11] …doesNotLock · [FAIL: 999999999999999900 !~= 2000000000000000000] …rewardNotStranded
post-fix: [PASS] testFuzz_stakingAccounting(uint256) (runs: 49) + seeds 7/1337/424242/99999 each runs: 49 PASS · [PASS] ×3 repros
```

### (d) Weekend staleness (FORK). Warp to the real SPY updatedAt (1794340098) + 25 h + 1; ETH and NVDA kept fresh with mockCall of their own round data
```
[PASS] test_spyDepositRevertsStaleOracle      deposit(4) → StaleOracle(0x3197…9f6A); control deposit(0) fills
[PASS] test_feePoolSkipsStaleSpyAndCarries    no StockBuySkipped/RewardNotified for 4; SPY staker pending 0; NVDA staker > 0; totalEthToStock == leg; rest carried
```

## (e) DEV-NNN → wire handoff
| DEV | Changes a connection/flow? | Wire action |
|---|---|---|
| DEV-001 browser wallet signing UNTESTED | **YES**: the whole wallet → simulate → sign → tx path in components/hooks.ts has never been exercised | wire/livetest must drive one real signing flow (stake, buy+sweep, claim) |
| DEV-002 /proof totals link only when deployed | YES (pre/post-deploy explorer links) | after P3, check that the links appear and resolve |
| DEV-003 recompute box reads ?addr&?stock | YES (card → /proof deep link) | wire: "Recompute this card" round-trip for a non-NVDA stock |
| DEV-004 "verified" label after Blockscout | YES (depends on an external verification) | after P3.3, check the label matches Blockscout |
| DEV-005 identifier rename | no (cosmetic) | – |
| DEV-006 fork tests not in CI | no flow change (test tier) | – |
| new: B-1 WifStaking bytecode changed | YES: redeploy needs the new bytecode; ABI unchanged | wire: confirm `web/lib/abi.ts` has no drift (`scripts/clean-room.sh`) and the deploy uses the current build |
| new: B-3 /api/health `feePoolWei` may be `null` | YES (response shape for livetest / demo-rehearsal) | consumers must accept `null` before deploy |

## Post-change verification (actual output)
```
pnpm check          → check-rc=0 · Tests 21 passed (21) · OK fork-tests: claimed 54, derived 54 · claims verified: 4 rows
pnpm test:live      → PASS hindsight.live: 83 buys … · PASS debug-p2 hindsight latency: 16221 ms … · fork-tests: this run: 54 tests passed, 0 failed | evidence: 54 tests passed, 0 failed · live-rc=0
forge test (FORK)   → Ran 6 test suites: 54 tests passed, 0 failed, 0 skipped (54 total tests)
web build           → rc=0 ; /api/health 200 (feePoolWei null) ; / 200 ; /stake 200 ; server killed, port 3000 freed
```
evidence/forge-test.txt was rewritten with `fork-tests.sh --write`; CLAIMS.md, SECURITY.md l.87 and SUBMISSION_STATUS.md l.5 now say 38 → 54. BUILD-REPORT, PRD and PLAN still say 38 (historical; left unchanged).

BLOCKED: none.
