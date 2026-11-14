# Architecture Decision Records: Terra Firma

## ADR-001: Deploy on Robinhood Chain mainnet 4663
- Context: the brief assumed testnet 46630; rule 3 requires $WIF onchain and $WIF exists only on 4663.
- Decision: mainnet-only contracts, minimal spend (~0.003 ETH gas measured).
- Rejected: testnet 46630, because $WIF has no code there and a testnet build fails rule 3.
- Consequence: real money in demos (tiny, recoverable); fork tests replace a testnet.
- Where: contracts/script/Deploy.s.sol (`require(block.chainid == 4663)`).

## ADR-002: Route over the existing Uniswap pools via Universal Router 2.1
- Context: memes trade on v2/v3/v4 pools, many v4 pools have third-party hooks and dynamic fees.
- Decision: TerraRouter encodes UR commands itself from a typed Route (v2, v3 1–2 hops via USDG, v4 native-ETH single hop).
- Rejected: a new Terra Firma hook pool (starts empty, sweeps would be dust) and an off-chain aggregator (adds a trust hop in the money path).
- Consequence: works for 18/20 top memes on day one; must track UR 2.1 input layout.
- Where: contracts/src/TerraRouter.sol, contracts/src/lib/URCodec.sol.

## ADR-003: UR 2.1 V2/V3 inputs carry `uint256[] maxHopSlippage`
- Context: the spike saw `SliceOutOfBounds()` on explicit amounts.
- Decision: always append an empty array; pay legs with CONTRACT_BALANCE after an exact WRAP/push.
- Rejected: the spike-era workaround "CONTRACT_BALANCE only" with the 5-field layout, because it relied on decoder luck.
- Consequence: deterministic encoding; proven by contracts/test/URProbe.t.sol.
- Where: URCodec.v2/v3.

## ADR-004: 0.5% fee, 50/50 burn/stream, 2% default sweep
- Context: OD2 ratified by Dami.
- Decision: FEE_BPS 50, split half/half in FeePool, sweep 0–10% chosen per trade.
- Rejected: 0.3% (burn invisible at demo size) and 1% (routing uncompetitive vs direct Uniswap).
- Consequence: visible per-trade burn; honest dust at demo volumes.
- Where: TerraRouter.FEE_BPS, FeePool.distribute.

## ADR-005: 0.3% fee for >= 10,000 $WIF active stake
- Context: Dami asked for maximal $WIF utility (Phase 1.5).
- Decision: TerraRouter.feeBps reads WifStaking.activeOf(user).
- Rejected: zero fee for stakers, because the burn must never reach zero.
- Consequence: second direct use for $WIF; no price read.
- Where: TerraRouter.feeBps, WifStaking.activeOf.

## ADR-006: Hourly epochs, next-epoch activation, 24h unstake
- Context: OD3; JIT staking is the obvious attack on a stream.
- Decision: per-pool pending batch keyed by epoch, activated at the next epoch boundary; requestUnstake stops earning immediately.
- Rejected: per-block streaming (JIT-able) and daily epochs (invisible in a demo).
- Consequence: test_jitStakeEarnsNothing passes; a staker waits up to 1h to earn.
- Where: WifStaking._addPending/_rollPool/_touch.

## ADR-007: Staker picks the reward stock (6 sub-pools)
- Context: AMEND-4.
- Decision: one accRewardPerShare per stock; FeePool splits the stock half by active stake per pool.
- Rejected: one fixed reward stock (less personal) and all ~37 feed-backed stocks (thin liquidity, more stale feeds).
- Consequence: up to 6 buys per distribute (~1.6M gas worst case).
- Where: WifStaking.pools, FeePool._streamToStakers.

## ADR-008: One ownerless Jar ledger
- Context: AMEND-4 tech default.
- Decision: a single contract with balanceOf[user][stock], credited only by immutable depositors with balance backing.
- Rejected: per-user vault clones (gas per user) and sending stock straight to wallets (loses source accounting and the Jar story).
- Consequence: one place to audit; FriendJar composes by being a Jar user.
- Where: contracts/src/Jar.sol.

## ADR-009: Chainlink bounds every stock fill; $WIF never priced
- Context: Thesis invariants 1 and 4.
- Decision: minOut = max(user, Chainlink − 3%), MAX_AGE 25h; WIF buy size = min(half, 0.01 ETH) only.
- Rejected: TWAP/spot pricing of $WIF for a "fair" burn (would violate the invariant and add manipulation surface).
- Consequence: stale weekend feeds pause SPY/QQQ buys (carried).
- Where: StockOracle.minStockOut, FeePool._buyAndBurn.

## ADR-010: Hindsight from per-token log scans + Chainlink round tables
- Context: spike-indexing measured a wallet-wide scan at ~14 min.
- Decision: curated registry, per-token getLogs (10M spans, batched), tx.value for ETH buys, receipts for WETH/USDG/stock-paid buys, committed round tables.
- Rejected: wallet-wide scan (too slow), own indexer (infra to keep alive), HyperSync as primary (needs a token from Dami's account).
- Consequence: memes outside the registry are not on the card; ~3–12s per card.
- Where: web/lib/hindsight.ts, scripts/build-registry.ts, scripts/build-rounds.ts.

## ADR-011: Price WETH/USDG/stock-paid buys via receipts (D-15)
- Context: Dami chose completeness at Phase 1.5.
- Decision: when tx.value == 0, read the wallet's outgoing Transfer in the receipt and price it with the matching Chainlink round.
- Rejected: labelling them all unpriced.
- Consequence: more RPC calls per card; unsupported pay tokens remain "unpriced", never estimated.
- Where: web/lib/hindsight.ts `payments`.

## ADR-012: Stateless hosting + GitHub Actions keeper
- Context: must stay live until 2026-11-16 17:30 UTC.
- Decision: Vercel serverless (state onchain + committed JSON), hourly cron keeper, permissionless distribute button.
- Rejected: an always-on VM or free-tier server that sleeps.
- Consequence: $0/month; keeper delays never block users.
- Where: durability-tier.json, .github/workflows/keeper.yml.

## ADR-013: Live stream via server-side SSE over GetBlock WSS
- Context: depth add F-022; the GetBlock endpoint is a shared secret.
- Decision: /api/stream subscribes server-side and re-emits Server-Sent Events, polling fallback.
- Rejected: browser WebSocket to GetBlock (leaks the endpoint).
- Consequence: 55s connections with automatic reconnect.
- Where: web/app/api/stream/route.ts.

## ADR-014: Friend Jars built but gated
- Context: OD7 gate (core green by 2026-11-11 23:59 WAT) and Thesis tripwire 3.
- Decision: FriendJar contract deployed with the core (tested), UI behind NEXT_PUBLIC_FRIEND_JARS.
- Rejected: building the UI first (tripwire) or dropping it (Dami wants maximal depth).
- Consequence: zero risk to the core; can be switched on without a redeploy.
- Where: contracts/src/FriendJar.sol, web/app/friends.
