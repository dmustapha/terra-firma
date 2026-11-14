# Critique Report: Terra Firma
**Hackathon:** World is Flat (Robinhood Chain mainnet 4663) · **Date:** 2026-11-11 · **Mode:** CAMPAIGN, autonomous default (Dami asleep, "no stoppages" directive) · **STAGE-1 SCOPE-REVIEW:** PASS (phases/C1-SCOPE-REVIEW.md), build authorized for SF-1.

## Competitive Positioning
**Assessment: differentiated** (blind cross-review by claude-sonnet-4-6: `differentiated`, AGREE; ledger event 9c260f30…).
Copilot unavailable this run (intel: copilot_available=false); Grid broad search for tokenized-stock savings on Robinhood Chain returned 0 products (sparse, consistent with a new chain).

### Overlap Zones
- **Stock Tokens lane (5 entries):** Lastbell (market-hours stops), Underfoot (stock floor under $WIF, burn-to-redeem), Fallpit (4PM-close prediction, 17 verified contracts), Stock Fair / WIF League (prediction/fantasy). None converts meme activity into owned stock.
- **"Stake $WIF for yield" framing** overlaps generic staking narratives (Risk R9).
- **Burn mechanics** are common (Sherwood buyback+burn, Proof of Ship burns, vote burns).

### Differentiation Strengths
- Only entry turning meme activity into **owned real stock** (Hindsight → convert → sweep), with a **per-wallet shocking number** from real chain data (0x3fDB…b09E: $15,314.80 → $2.28 vs $14,798.24 in NVDA).
- **Onchain recompute** of the card (HindsightLens), verifiability no entrant offers.
- Security legibility at the top tier's bar: 7 ownerless contracts, 62 mainnet-fork tests incl. adversarial (JIT, cross-pool drain, gas starvation, route injection), Chainlink bounds.

### Differentiation Gaps
- Top competitors already show **verified contracts + SECURITY.md listing their own flaws** (WIF Agent Arena) and **Sourcify verification + self-audit** (Proof of Ship). We plan both but they do not exist yet → E-4.
- The pitch headline does not yet carry the **hardest guarantee** (recomputable, Chainlink-bounded, never sells $WIF) → E-1.

### Multi-Track Eligibility
- Stock Tokens: **STRONG** (Jar, StockOracle, sweep/convert, rewards in real stock).
- hooks and defi: **STRONG** (UR 2.1 routing over hooked v4 pools; burn through the hooked WIF/ETH pool).
- consumer and payments: **STRONG** (Hindsight card, terminal, mobile-first).
- onboarding: **WEAK** (read-only lookup is strong; embedded-wallet Friend Jars gated by OD7), honest as "designed, gated" unless the gate passes.

## Sponsor Integration Depth
| Sponsor | Methods Planned | Total Available | Depth | Gap |
|---------|----------------|-----------------|-------|-----|
| Uniswap (UR 2.1, V4Quoter, QuoterV2, v2 Router02, PoolManager logs) | 9 (WRAP/UNWRAP, V2/V3/V4 swaps, SETTLE/SETTLE_ALL/TAKE_ALL, 3 quoters, Initialize logs) | ~20 UR commands | deep (Platinum: novel same-tx sweep router) | none material |
| Chainlink Data Feeds | 4 (latestRoundData, getRoundData history, decimals, phase/round math) on 8 feeds | 5 | deep (Gold→Platinum: historical counterfactual recomputed onchain) | none |
| Robinhood Stock Tokens | 4 (transfer/balance, uiMultiplier, 6 tokens, Jar custody) | ~6 | deep | corporate-action awareness not surfaced |
| $WIF | 4 (buy via hooked pool, burn, burnFrom card mint, stake + fee discount) | 4 | deep | none |
| GetBlock | 3 (JSON-RPC primary, WSS eth_subscribe stream, failover) | ~5 (+ Market SQL, streams) | moderate | Market SQL unused (deferred) |
| Quicknode | 1 (qn_getStockTokenBalances) | 5 (getStockTokens, getCorporateActions, getOracleHealth, getTransactionFinality) | surface | E-5 (deferred: needs token) |
| Envio HyperSync | 1 (log query) |, | moderate (optional provider) | token pending |
Grid ecosystem counts for sponsors: unavailable (Grid returned no Robinhood Chain products).

### On-Chain Proof
Mainnet 4663 (not testnet). Tx types: convert, buy/sell with sweep, distribute (burn + stock buys), claim, card mint. Explorer links in every UI number and /proof; proof.ts regenerates submission/proof.md from events. Depth: **Platinum** for the router+sweep and onchain-recompute design; volume honest at demo scale (dust, disclosed).

### Safety Architecture
4 independent layers (validation, rate limiting, circuit breakers, degradation) with tests per layer; no single external failure bricks the app (RPC failover, FeePool try/catch carry, read-only mode). Single point of concern: the third-party owned WIF/ETH hook, contained (cap + carry) and disclosed.

## Narrative Arc
**Score: compelling.** Problem is real and personal (the per-wallet regret number); the solution feels inevitable (stocks are on the same chain); demo tells a story (connect → your card → convert → trade burns $WIF → staker stream); wow moment = the long-history wallet card + onchain recompute.
Onboarding friction: 10s PASS (headline + live counters) · 30s PASS (real card via lookup, no wallet) · 60s PASS (lookup own address) / FRICTION for stock actions in restricted regions (geofence, honest).

## Drift Scan (Phase 3.5)
- CLAIM↔RUNTIME: PRD/pitch claim mainnet; web renders read-only until `deployed:true` → **acknowledged**: intentional pre-deploy state; mainnet deploy is PLAN P3 (funding pending), never claimed before it happens.
- Numeric drift: PRD §4.15 `MIN_DISTRIBUTE_ETH = 0.00005` vs code `0.00001 ether` (lowered for minimal-spend demo) → **E-3** (fixed).
- Chrome: landing counters (sourced from events; team txs disclosed), Regret Index (block-numbered real cards), leaderboards (verified mints only) → no unsourced vanity stats. chromeAcknowledged: n/a (no flags).

## Win-Legibility Axes (Phase 4.5)
| Axis | Score | Note |
|------|-------|------|
| Wedge visceralness | strong | a judge pastes any address and gets a real card in ~6s, no wallet |
| Engine-as-truth | strong | no LLM anywhere; Chainlink rounds + logs + onchain recompute |
| Advisory / law contract | strong | all value moves are deterministic contracts with oracle bounds; no AI output moves value |
| Refuse, don't degrade | strong | StaleOracle reverts, unpriced rows labelled, 503 instead of partial cards, starved distribute reverts |
| Hardest guarantee (not SDK decoration) | weak | the headline is a slogan; the hardest guarantees (recomputable numbers, never sells $WIF, bounded fills) sit deep in /proof → E-1 |
| Pitch legibility / rubric-mapping | weak | PRD maps the 3 criteria, but no judge-facing surface does → E-2 |

## Elevation Recommendations
### E-1: Lead with the hardest guarantee
Category: narrative_hook · Impact: high · Effort: quick · Risk: none · Thesis impact: compatible · **[AUTO] approved**
What: landing sub-line + /card footer: "Every number here is recomputable onchain. Terra Firma never sells or prices $WIF. Every stock fill is bounded by Chainlink." with a one-click "Recompute this card" link to /proof.
Why: criterion 3 ("works and built well") and the hardest-guarantee axis; differentiates from slogan pitches.
How: PRD §4.13 copy row; PLAN Task P2.3 (web/app/page.tsx, components/hindsight-card.tsx).

### E-2: Rubric map on /proof
Category: narrative_hook · Impact: high · Effort: quick · Risk: none · Thesis impact: compatible · **[AUTO] approved**
What: /proof opens with three cards, "A real reason to use $WIF" (burn tx + staker claim + fee discount), "A flywheel that holds up" (routed volume → burn → stream, live totals), "Works and built well" (7 verified ownerless contracts, 38 fork tests, recompute box), each linking to live evidence.
Why: pitch-legibility axis; judges have "a few minutes" (judge Vasily).
How: PRD §7.6; PLAN Task P2.3 (components/proof-view.tsx).

### E-3: Fix numeric drift
Category: competitive_gap · Impact: low · Effort: quick · Risk: none · Thesis impact: none · **[AUTO] approved**
What: PRD §4.15 MIN_DISTRIBUTE_ETH → 0.00001 ETH with the minimal-spend rationale.
Why: verify/AI judges diff docs against code.
How: PRD edit (applied).

### E-4: Own-flaws security disclosure at the top tier's bar
Category: competitive_gap · Impact: high · Effort: quick · Risk: none · Thesis impact: none · **[AUTO] approved**
What: SECURITY.md gains "Known weaknesses (our own)" listing the critical-review survivors and accepted risks (weekend SPY/QQQ staleness, uiMultiplier assumption, recompute proves pricing not provenance, frontend-only geofence, third-party hook), plus Blockscout verification status per contract; README links it above the fold.
Why: WIF Agent Arena and Proof of Ship set this bar; the security-minded judge (Ogle) rewards it.
How: PLAN Task P1.2 spec extended; INVARIANTS survivors are the source.

### E-5: Quicknode depth surface → moderate
Category: sponsor_depth · Impact: medium · Effort: medium · Risk: low · Thesis impact: none · **DEFERRED** (not quick/none; also needs Dami's Quicknode token)
What: /proof "Data sources" panel using qn_getOracleHealth (feed freshness for the 6 stocks) and qn_getStockTokens (token metadata), alongside the existing Jar cross-check.
Why: sponsor-depth on a judge's own product (Quicknode devrel judge).

## Summary
Positioning differentiated (cross-review AGREE); narrative compelling; sponsor depth deep on Uniswap/Chainlink/Stock Tokens/$WIF, moderate on GetBlock, surface on Quicknode. Win axes: 4 strong, 2 weak → E-1/E-2. 5 elevations: 4 [AUTO]-approved (quick/none) and applied to PRD + PLAN; 1 deferred (E-5). No thesis amendments.
