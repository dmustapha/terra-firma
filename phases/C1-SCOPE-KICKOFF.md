# C1 SCOPE-KICKOFF — SF-1 Core money path (Terra Firma)

### 1. goal
Ship the Thesis hero flow on Robinhood Chain mainnet 4663 with real transactions: a connected wallet sees its Hindsight card priced from Chainlink rounds, converts non-$WIF memes into a real Stock Token in its Jar in one transaction, trades a meme through TerraRouter with a same-transaction sweep into stock, and $WIF stakers receive a real-stock stream while fees buy and burn $WIF, all from ownerless verified contracts.

### 2. done-criterion
Every observable in FEATURE-OBSERVABLES.md for F-001 through F-017 passes against mainnet (not a fork) before 2026-11-11 23:59 WAT, the 32-test fork suite in evidence/forge-test.txt is green, and PLAN.md phase gates P0–P4 are fully ticked; machine check: `pnpm tsx scripts/verify-claims.ts` exits 0 with no PENDING rows for deployed facts (criteria SF1-DC-1..SF1-DC-3 = F-001..F-017 observables, forge suite, verify-claims).

### 3. components
C1 TerraRouter, C2 Jar, C3 FeePool, C4 WifStaking, C5 StockOracle, C6 HindsightLens (contracts, ARCHITECTURE.md Sections 3–10), C7 Hindsight Indexer and C8 Route Builder (web/lib + API routes), C9 frontend routes /, /app, /card/[addr], /trade, /jar, /stake, /proof, C10 keeper, C11 data scripts (registry, round tables, restricted list, sync, seed, proof, claims).

### 4. interfaces
TerraRouter.buy/sell/convert/deposit with the typed Route struct (PRD §4 C1); Jar.credit/withdraw; FeePool.distribute(wifMinOut)/canDistribute; WifStaking.stake/switchStock/requestUnstake/withdraw/claim/pending/activeOf; HindsightLens.recompute(Buy[],stockId); HTTP: GET /api/hindsight, /api/quote, /api/geo, /api/health (PRD §5 schemas); Universal Router 2.1 command layouts in contracts/src/lib/URCodec.sol.

### 5. data/policy model
State lives onchain: Jar ledger (user→stock→amount, backed by totalHeld), WifStaking pools (activeTotal, pendingTotal, pendingEpoch, acc) and stakers, FeePool totals; committed data: web/data/memes.json (registry), web/data/rounds/*.json (Chainlink tables, NVDA n<=24 normalized), restricted.json, deployments.json. Policy: fee 50 bps (30 bps at >= 10,000 $WIF active stake), sweep 0–1000 bps, band 300 bps, MAX_AGE 25h, epoch 1h, unstake 24h, WIF buy cap 0.01 ETH per distribute; $WIF never an input and never priced (INVARIANTS.md 1–2).

### 6. test plan
Happy: test_buyV3_sweepAndFee, test_buyV4_plain, test_sellV3_sweep, test_convert_multi, test_distribute_burnAndStream, test_recomputeOneEthBuy (contracts/test/*.t.sol). Edge: test_noStakersCarriesStockHalf, test_distributeOncePerEpoch, test_scaledEarlyRoundNormalized, weekend stale SPY skip (DT-14). Failure: test_staleOracleReverts, test_userMinStockEnforced, test_unstakeDelay. Adversarial: test_jitStakeEarnsNothing, test_sellWifReverts, test_convertWifReverts, test_routeTokenMismatchReverts, test_badKindReverts, test_badMidHopReverts, test_jarCreditGuards, test_noOwnerFunctions, test_wrongRoundReverts. Scripted drill: PLAN.md Phase P4 (seed-demo.ts → keeper distribute → claim → proof.ts → verify-claims.ts) run on mainnet.

### 7. security/threat notes
- funds surface — threat: a caller drains router- or Jar-held stock/ETH by injecting Universal Router commands, crediting an unbacked Jar balance, or withdrawing another user's balance; mitigation: TerraRouter encodes every command from a typed Route and rejects mismatched endpoints (BadRoute), Jar.credit accepts only the two immutable depositors and only balance-backed amounts (NotDepositor, Unbacked), Jar.withdraw debits only msg.sender (Insufficient), nonReentrant on every external state change, no owner/pause/upgrade (test_noOwnerFunctions).
- funds surface ($WIF) — threat: the product sells or converts users' $WIF; mitigation: every sell/convert route input is checked against $WIF and reverts WifNotSellable before any transfer (test_sellWifReverts, test_convertWifReverts).
- oracle surface — threat: a stale, paused or manipulated price lets a stock fill execute far below fair value; mitigation: StockOracle requires answer > 0 and updatedAt within 25h (StaleOracle) and every fill enforces max(user min, Chainlink price − 3%) (Slippage); FeePool skips a stale sub-pool and carries its ETH; $WIF is never priced, its buy size is a fixed ETH cap.
- external-call surface — threat: the third-party owned hook on the WIF/ETH pool reverts or skims more; mitigation: capped buy size, try/catch carry in FeePool, disclosure in SECURITY.md.
- staking surface — threat: just-in-time stake captures an epoch's stream; mitigation: next-epoch activation + 24h unstake delay (test_jitStakeEarnsNothing).
- Not defended: wrong-but-fresh Chainlink answers, hook owner fee changes within its rules, determined geofence bypass (frontend + attestation only).

### 8. doc-traceability
Thesis (warroom/WINNER-BRIEF.md ## Thesis + AMEND-1) → PRD.md §1–§7.7 (F-001..F-017) → INVARIANTS.md NON-NEGOTIABLES 1–7 → ARCHITECTURE.md Sections 3–10 (code) → PLAN.md P0–P4 tasks + DT-1..DT-18 → FEATURE-OBSERVABLES.md commands → CLAIMS.md rows re-derived by scripts/verify-claims.ts.

### 9. risks
- [high] R1 dust volume makes the burn and stream look hollow — DT-1.
- [high] R3 security finding after mainnet deploy forces a redeploy — DT-3.
- [high] R5 Hindsight slow or rate-limited on the live URL — DT-5.
- [high] R7 Universal Router encoding fails on an untested pool kind — DT-7.
- [critical] R8 wallet funding delay blocks every mainnet transaction — DT-8.
- [high] R17 a meme's pool or quoter is unavailable — DT-17.
- [high] R18 Chainlink outage pauses stock legs — DT-18.

### 10. out-of-scope
- Friend Jars UI — deferred to SF-3 because OD7 (Dami-ratified) only allows it after SF-1 is green on mainnet by 2026-11-11 23:59 WAT, and Thesis tripwire 3 forbids building the social layer first.
- Depth adds F-018..F-026 — deferred to SF-2 because they extend a working core and must not compete with the hero flow for the critical path.
- Design polish, README, video and submission — deferred to SF-4 because their owning skills need a live, green build to work on.
- Dividend-driven features — excluded because no dividend step is guaranteed during judging (Thesis tripwire 2).
- New hook pool, custom AMM, off-chain aggregators — excluded because a new pool starts empty and an aggregator adds an off-chain trust hop in the money path (ADR-002).
- AI agents — excluded because nothing in the loop needs one (C-NA1, no garnish).
- Selling or pricing $WIF — excluded permanently by Thesis INVARIANTS 1–2.
