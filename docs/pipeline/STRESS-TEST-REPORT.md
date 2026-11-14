# Stress Test Report: Terra Firma
> hackathon-stress | 2026-11-12 06:45–07:20Z | plan: STRESS-TEST-PLAN.md | evidence: evidence/stress/

## Summary
- **Confidence: 88 / 100 (Solid)**: 100 − 3 (INFRA: cold-card capacity bound by public-RPC 429) − 5 (5 wallet-signing
  journeys not executable headless, OUT_OF_SLICE) − 4 (visual viewports 320/768/1024/1920 deferred to livetest on the
  pending redesign).
- Executed: **171 stress checks**: 87 contract fork tests (62 base + 25 new, 3 fuzz suites x 48 runs), 37 API checks,
  1 twenty-wallet concurrency re-vector, 41 UI checks on the live site (run 1) + 4 local-only error-path checks (run 2),
  1 keeper dry run. Web unit suite 133 -> 138 (5 new regression tests), all green.
- **Real bugs found: 1 class (2 surfaces), fixed and re-proven.** ST-DH9: under 20 concurrent cold wallets, 6 Hindsight
  requests died as platform **504** at the 60 s function limit. Fixed in `8fc6f57` (API) and `b001e51` (card page + OG).
- Spine (money/authority) held **CLOSED** on every adversarial path; no contract vulnerability found.
- No mainnet transaction was sent. After the coordinator's ~07:05Z directive, all further traffic was local (anvil fork
  via GetBlock + local `next start`), with the public RPC and the live site blocked in the browser.

## Coverage Declaration
- **P0 (F-001..F-011): 11/11 exhaustive** at contract level (base 62 + boundary/zero/max/wrong-state/access/fuzz set)
  and API level (every input class). UI wallet-signing journeys (buy/sell/convert/stake/claim/withdraw clicks) are
  OUT_OF_SLICE in headless (no wallet); the same calls were signed on mainnet from Dami's wallet (12 txs, nonce 12) and
  are livetest's DH-1.
- **P1 (F-012..F-019, F-021..F-023, F-026): 12 features x >= 3 sampled cases**, classes picked for risk: malicious
  input, provenance (card-check vs fabricated claim), concurrency (DH-9), header spoofing (geo), network faults, gated
  route behaviour.
- **P2: F-020 Friend Jars** got the full attack set (it holds funds: DH-11); **F-024/F-025 smoke-only** (route renders
  at 375 and 1440, no page errors). Skipped classes for F-024/F-025: concurrency, slow network, boundary inputs.

## Phase Results

### Phase 2: Frontend User Journey
Run 1 (live site, read-only): 12 routes x 375/1440 px: 22/24 PASS, status < 400, **0 page errors, 0 horizontal
overflow, 0 console errors** on every real route; `/friends` 404 x2 = gated by design (test expectation corrected, re-proven
in run 2). Not-found, malformed and XSS-shaped `/card/*` and `/trade/*` params: handled, **no dialog executed**.
Amount box with 11 boundary strings (empty, -1, 1e308, NaN, Infinity, 21-dp dust, `<script>`, emoji, 80 digits): no crash.
Paste-CA junk/XSS/unknown: no crash.
Primary error paths (run 2, local only, `evidence/stress/p2-ui-errors-run2-local.txt`): **4/4 PASS**:
two forced `503 busy` then a valid card -> card shown, no error left (3 calls); every call 503 -> plain "chain is busy"
alert after 4 client retries; quote 503 -> "Couldn't get a quote" notice; `/friends` clean 404.

### Phase 2.5: End-to-End Integration
A-1 Hindsight card: cold 4.6-6.9 s, warm 0.7 s on prod; A-2 SSE `/api/stream`: `hello` in 540 ms; A-3 keeper:
`--dry` against mainnet read `epoch 22, balance 1 wei, canDistribute false -> skip (epoch already distributed)`,
i.e. the first mainnet distribute had landed and the keeper correctly declined a second. No ASYNC-TIMEOUT,
MISSING-EVENTS or NO-FINAL-STATE.

### Phase 3: Visual + A11y
Functional only (redesign pending): overflow-x 0 at 375 and 1440 on all 11 live routes; slow-3G landing visible in
4.7 s. Contrast/a11y and the 320/768/1024/1920 sweep are deferred to livetest on the new design (the old design's a11y
evidence is in DESIGN-FORGE-RESULTS.md and would not carry over).

### Phase 4: Backend API
`evidence/stress/p4-api-stress.txt`: 36/37 PASS on first run. Every route rejects bad, XSS, 10k-char, negative, decimal
and 78-80 digit inputs with 400; wrong methods 405; WIF sell 422; unknown token 404; card-check verifies the true
claim and **refuses a 100x fabricated one**; a spoofed `x-vercel-ip-country` does not change the derived country.
**DH9-CONC-01 FAIL -> ST-DH9** (6 x 504 of 20). Earlier 17-wallet run: 17/17 200 in 27.5 s.

### Phase 5: Contract
`contracts/test/stress-p5.t.sol`, 25/25 PASS on the mainnet fork (`evidence/stress/p5-contract-stress.txt`); base suite
62/62 (`baseline-fork-tests.txt`). DH-12 mintCard: burns exactly 1e18 (supply and balance), approval consumed, emits
the recompute values, reverts without approval or WIF, **no burn on a fabricated round**, bad payKind reverts.
DH-11: a 2 ETH WIF pump before distribute leaves spend <= 2 x 0.01 ETH, the burn still runs, the rest carries;
sub-threshold and second-in-epoch distribute revert; FriendJar wrong invite / non-member / double exit revert, and an
invite replayed from public calldata cannot touch another member's shares. Fuzz: fee exactly 0.5% and Jar fully
backed for any value x sweep; sweep > 1000 always reverts; no random string joins a group.
**No-op ablation:** with the FeePool burn no-oped on a scratch copy, **12 tests went red**
(`ablation-feepool-burn-noop.txt`): the suite is not hollow.

### Phase 5.5: AI-Agent Failure Modes
SKIPPED: no AI-agent components detected (no LLM calls, agent loop or tool definitions).

### Phase 6: State & Data
Corrupted `tf.*` and `wagmi.*` localStorage (broken JSON, control chars) across 4 routes: 0 page errors. Hindsight
200 with a wrong schema: page keeps rendering (no white screen). Weekend staleness (DH-8): `/api/quote` returns
409 `oracle_stale` with plain copy; FeePool skips a stale SPY leg and carries (fork-proven, warp).

### Phase 7: Network & Timing
Slow 3G (400 kbps, 400 ms): landing visible in 4.7 s. `/api/stream` connection reset: 0 page errors. Every other
`/api` call 503: 0 page errors. Client retry: 3 attempts with 2/4/8 s backoff verified in run 2.

### Phase 8: Recovery
Double refresh during card load -> card renders; back/back/forward lands on the right route; 8 overlapping
navigations -> 0 page errors.

## Fixes Applied
| ID | File | Fix | Verified |
|----|------|-----|----------|
| ST-DH9 | web/lib/concurrency.ts, web/lib/card-cache.ts, web/app/api/hindsight/route.ts, web/app/api/card-check/route.ts | queued card builds leave the queue after 20 s (Busy -> 503 + Retry-After); routes answer busy at a 50 s deadline while the build continues into the cache | 5 new unit tests; local 20-wallet re-vector: 0 x 504, every non-200 a 503 with Retry-After, slowest 50.0 s (`dh9-revector-local.txt`) |
| ST-DH9b | web/app/card/[addr]/page.tsx, opengraph-image.tsx | same 50 s deadline on the server-rendered card page and OG image | typecheck + 138/138; shared `getCardWithin` covered by unit tests |

Not deployed by this phase (owner pushes/deploys). Commits: `8fc6f57`, `b001e51`.

## Unresolved Issues
- **ST-INFRA-429 (H, INFRA):** raw cold-card capacity is bounded by the public RPC `eth_getLogs` rate limit. Locally
  (one instance) only 3/20 cold wallets got a card inside the client's retry window; on prod (many instances) 14/20
  did inside 60 s before the fix. The fix makes saturation a clean, retryable 503, not a cure. Cure: HyperSync (PLAN
  P5.0) with Dami's Envio token, or a log provider with a higher limit.
- ST-L1 FriendJar invite replay (documented, UI gated), ST-L2 self-reported mintCard inputs (mitigated by card-check),
  ST-M1 keeper 0.0002 ETH threshold vs 0.00001 contract floor (by design).

## Critique Checkpoint
`.critique-state.json` elevations are product-level (lane, narrative, Regret Index, Friend Jars gate); the code-level
ones (HindsightLens recompute, receipt-priced buys, staker discount, leaderboard provenance) were exercised above and
work. No missed cheap elevation found in stress scope.
