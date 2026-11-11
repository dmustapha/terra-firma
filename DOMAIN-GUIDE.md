# Domain Guide — Terra Firma

Generated from ARCHITECTURE.md "Section N+1: Domain Knowledge File". Every code identifier below exists in
`contracts/src`, `contracts/script` or `web/lib` (checked with `grep -rw <id> contracts web/lib`).

Network: Robinhood Chain mainnet, chain id 4663. Explorer: https://robinhoodchain.blockscout.com

## Concepts

| Concept | Definition | Code identifier | Source |
|---|---|---|---|
| Stock Token | ERC-20 on Robinhood Chain representing one share × `uiMultiplier()` (ERC-8056); 18 decimals | `STOCKS[i].token` (web/lib/config.ts), `Stock.token` (StockOracle.sol) | research-brief; rhj assets |
| uiMultiplier | factor turning a raw token balance into shares (splits, dividend steps) | `erc20Abi` entry `uiMultiplier` (web/lib/abi.ts) | fact-check FU1 |
| Jar | one ownerless ledger contract holding every user's Stock Tokens; withdraw any time | `Jar.balanceOf`, `Jar.credit`, `Jar.withdraw` | AMEND-4 |
| Sweep | a slice (bps of the ETH notional) of a trade converted to stock for the user, in the same tx | `sweepBps`, event `Swept` (TerraRouter.sol) | OD2 |
| Fee | 50 bps of ETH notional (30 bps for >= 10K active $WIF stake) sent to the FeePool | `FEE_BPS`, `STAKER_FEE_BPS`, `DISCOUNT_STAKE`, `feeBps()` | OD2, Phase 1.5 |
| Epoch | 1 hour since `start` (UTC-hour aligned) | `EPOCH`, `currentEpoch()` (WifStaking.sol), `epoch()` (FeePool.sol) | OD3 |
| Activation | a stake earns from two epochs after the epoch it was placed in (boundary-JIT safe) | `pendingEpoch`, `_matured`, `_rollPool` (WifStaking.sol) | OD3, SURVIVOR-2 |
| Sub-pool | stakers who chose the same reward stock | `pools[stockId]` (WifStaking.sol) | AMEND-4 |
| Chainlink round | roundId = (phase << 64) \| n; phase 1 for every feed used | `PHASE_BASE` (web/lib/rounds.ts) | spike-indexing §4 |
| Early-round scaling | NVDA/USD rounds n <= 24 (and early rounds of the other stock history feeds) report 1e16-scaled values; any answer above 1e15 is divided by 1e8 to get 8 decimals | `SCALED_THRESHOLD`, `historicalAnswer8` (StockOracle.sol), `normalize8` (web/lib/rounds.ts) | spike-indexing §4 |
| Heartbeat | Chainlink directory heartbeat is 86,400 s; we accept answers up to 25 h old | `MAX_AGE` (StockOracle.sol) | cl-feeds-rh.json |
| Band | every stock fill must be >= the Chainlink-implied amount − 3% | `BAND_BPS`, `minStockOut` (StockOracle.sol) | PRD 4.15 |
| UR 2.1 layout | V2/V3 swap inputs end with `uint256[] maxHopSlippage` (6 fields, not 5) | `URCodec.v2`, `URCodec.v3` | URProbe.t.sol |
| CONTRACT_BALANCE | `1 << 255`: swap whatever the Universal Router holds | `URCodec.CONTRACT_BALANCE` | UR ActionConstants |
| ADDRESS_THIS | `address(2)`: deliver output to the Universal Router itself | `URCodec.ADDRESS_THIS` | UR ActionConstants |
| Hook (v4) | contract attached to a v4 pool; the WIF/ETH hook takes ~1% of output (afterSwapReturnDelta) | `WIF_HOOK` (contracts/script/TerraConfig.sol), `ADDR.wifHook` (web/lib/config.ts) | fact-check TF2 |
| Dynamic fee | v4 fee value 8388608 means "hook-set fee"; kept verbatim in the PoolKey | `PoolEntry` `key.fee` (web/lib/registry.ts) | spike-coverage |
| Hindsight buy | a meme received from a pool/router/PoolManager in a tx the wallet itself sent and paid for | `scanBuys`, `payments` (web/lib/hindsight.ts) | spike-indexing §1 |
| Unpriced | a buy paid in a token we cannot price from Chainlink; shown, excluded from totals | `Card.unpriced` (web/lib/hindsight.ts) | INVARIANT 7 |

## Rules the code enforces

| Rule | Enforcement | Error / effect |
|---|---|---|
| $WIF is never an input token | `TerraRouter._validate` checks every sell/convert route's input token | `WifNotSellable` |
| $WIF is never priced for value | FeePool buys $WIF with a fixed ETH amount capped by `MAX_WIF_BUY_ETH`; no WIF price is read | excess ETH carries |
| Every stock fill is Chainlink-bounded | `StockOracle.minStockOut` (fresh within `MAX_AGE`, minus `BAND_BPS`) enforced as `max(userMin, oracleMin)` | `StaleOracle`, `Slippage` |
| No owner, pause or upgrade | no such functions in any contract (`test_noOwnerFunctions`) | n/a |
| Jar credits are backed by received tokens | `Jar.credit` only from router/staking and only up to the observed balance | `NotDepositor`, `Unbacked` |
| Just-in-time stakes earn nothing | activation two epochs later; `UNSTAKE_DELAY` = 24 h | no reward accrues |
| No fabricated numbers | every number comes from chain state, events or Chainlink rounds (INVARIANTS.md 1–8) | unpriced rows are labelled, never estimated |

## Glossary

- **ETH notional**: the ETH value of the trade (`msg.value` for buys, ETH received for sells) that fee and sweep bps apply to.
- **Route**: typed swap description (`kind` 1 = v2, 2 = v3, 3 = v4 native-ETH single hop) — the router encodes the Universal Router commands itself from it; callers never pass raw commands.
- **Carry**: ETH left in the FeePool when a leg is skipped (stale feed, hook revert, above cap); it is spent in a later epoch.
- **Distribute**: the permissionless, once-per-epoch FeePool call that buys and burns $WIF with half and buys staker stock with the other half.
- **Recompute**: `HindsightLens.recompute(buys, stockId)` — an `eth_call` that re-derives a card's USD paid and counterfactual shares from the same Chainlink rounds; it proves pricing, not provenance (the tx hashes prove the buys).
- **Registry**: `web/data/memes.json`, the curated list of memes, their pools and the purchase sources Hindsight scans.
- **Round table**: `web/data/rounds/<feed>.json`, committed Chainlink history `[n, answer8, updatedAt]`; newer rounds are read live (`roundAtLive`).

## Source mapping

| Area | Files |
|---|---|
| Contracts | `contracts/src/{TerraRouter,Jar,FeePool,WifStaking,StockOracle,HindsightLens,FriendJar}.sol`, `contracts/src/lib/URCodec.sol`, `contracts/src/interfaces/IExternal.sol` |
| Mainnet constants + deploy | `contracts/script/TerraConfig.sol`, `contracts/script/Deploy.s.sol` |
| Fork tests (live tier) | `contracts/test/{TerraFirma,HindsightLens,URProbe}.t.sol` → `evidence/forge-test.txt` |
| Web config / ABIs | `web/lib/config.ts`, `web/lib/abi.ts` (generated by `scripts/export-abis.mjs`) |
| Hindsight | `web/lib/hindsight.ts`, `web/lib/rounds.ts`, `web/lib/registry.ts`, `web/lib/hypersync.ts` |
| Quotes / routes | `web/lib/quote.ts` |
| Scripts | `scripts/*.ts` (registry, rounds, restricted, keeper, seed, proof, verify-claims) |
