---
event_class: open_buildathon
event_class_source: inferred
pack_version: 2
pack_date: 2026-09-28
gap_map: present
sponsor_vintage: present
---

# Working Primitives Sheet — World is Flat (Robinhood Chain mainnet 4663)

Assembled at warroom Step 0C.1 from `hackathon-warroom/injection/` (pack v2, 2026-09-28) after
`warroom/gap-map.md`. Lens: `open_buildathon` (inferred) — judges are ecosystem/BD + a security
whitehat + infra DevRel (Quicknode, GetBlock) + the WIF team, so the lens reads as "bootstrap-chain
class": growth/retention that is security-legible beats exotic primitives. Because a community vote
(Nov 14–16) also runs, `community_vote` legibility applies as an ordering tiebreaker: instant demo
legibility + a shareable one-liner outrank engineering depth a voter can't see.

Hard constraint on every family: $WIF must move onchain inside a flywheel. Honest chain limits
(chain-dna.md): no WIF price feed (v4 spot is manipulable — never price WIF off spot for anything
safety-critical), no onchain randomness, thin stock AMM liquidity (RFQ-first), stock tokens geo-
restricted for US/UK/CA/CH.

Collision map (auto clone-tier, from gap-map "Occupied" + organizer suggestion lists): prediction /
up-down pools, fantasy stock leagues, burn-to-vote ballots, pay-to-argue AI vaults, agent
marketplaces / x402 pay-per-call, 3D world games, tipping/gifting bots, gas-in-WIF paymaster.

---

### F01 — Round-up meme-to-stock savings (Acorns port) [lane: whitespace]
**Mechanism:** Library F33 (consumer payment port of a proven off-chain business). Port Acorns'
round-up/auto-invest habit: every $WIF trade or receipt sweeps a user-set slice into a chosen
Stock Token (or basket) on a schedule; a small fixed $WIF fee per sweep is burned. The habit, not
the trade, is the product. Targets **W1** (stock tokens as everyday ownership) and **M1** (meme ->
real-asset exposure automatically), secondarily **W3** (non-speculative retention).
**Receipts:** Zoneless (Solana Frontier Public Good, $10K — Stripe Connect port); Quay + Talise
(Sui Overflow DeFi & Payments winners) — solana-frontier__SYNTHESIS.md, sui-overflow__SYNTHESIS.md.
**Adaptation axes:** reference business (Acorns round-ups vs Stash auto-invest vs payroll split);
trigger (every WIF swap via a v4 hook afterSwap vs a weekly keeper sweep); destination (single Stock
Token, ERC-8056-aware basket that tracks dividend multipliers — P2); settlement leg (WIF -> USDG ->
stock via RFQ since stock AMM liquidity is thin); onboarding (Privy/ZeroDev embedded wallet + 4337
sponsored gas so the sweep runs gasless); WIF sink (burn-per-sweep, priced in USDG not WIF spot).
**Saturation:** fresh — no roster entry turns WIF into stock ownership; existing stock entries are
trading tools or betting (gap-map W1).
**Loss-twin:** RefiRail (Sui Overflow, unplaced) — power-user DeFi tooling at a consumer-weighted
event; the round-up must read as a consumer habit, not a DCA bot (sui-overflow__refirail-BASELINE.md).

### F02 — WIF investment club: a group-owned stock basket [lane: whitespace]
**Mechanism:** Run-local derivative of library F11 (capital-backed accountability) + F33 (investment-
club business port). A group pools USDG/WIF into a shared vault that holds real Stock Tokens;
members' $WIF stake (locked, not burned) sets allocation weight and each rebalance proposal costs a
small $WIF fee that is burned. Targets **M3** (communities owning something real together, deciding
with $WIF) and **W1**. Deliberately NOT a burn-to-vote ballot: the vote has a real-asset
consequence and stake is returned, not consumed.
**Receipts:** ReineiraOS (Arbitrum London Agentic 3rd — commitments backed by capital) and Arcane
(Agora 2nd — slashable bond kit) — arb-london__SYNTHESIS.md, agora__SYNTHESIS.md; off-chain
reference: NAIC-style investment clubs (legacy catalog shape, not a corpus winner).
**Adaptation axes:** vault holdings (Stock Tokens, Chainlink-priced NAV — never WIF spot); decision
rule (stake-weighted, quorum + timelock, Chainlink-checked slippage bound on execution); WIF role
(lock-to-weight + burn-per-proposal); membership (embedded-wallet invites for zero-crypto members);
dividend handling (ERC-8056 multiplier reinvested into the basket, P2); collateral leg (optional
Morpho borrow against the basket, capped LTV).
**Saturation:** fresh — collective ownership of real assets is unserved (gap-map M3); sits adjacent
to the crowded burn-to-vote cluster, so the demo must lead with the basket, not the vote.
**Loss-twin:** AlphaAttest (Arbitrum London, unplaced) — "the record is the stake, and the layer
never touches it"; a club whose vote does not move real assets collapses into a ballot (arb-london__SYNTHESIS.md).

### F03 — Streak-bonded savings goal (commitment vault) [lane: whitespace]
**Mechanism:** Library F11 with the subject flipped to the user's own habit. A user commits to a
weekly Stock Token deposit toward a named goal and bonds $WIF; keeping the streak returns the bond
plus a share of others' forfeits, breaking the streak burns part of the forfeited WIF. Social
obligation (an accountability buddy) is optional. Targets **W3** (non-speculative retention) and
**M4** (a reason to return weekly), with **W1** as the asset.
**Receipts:** ReineiraOS + Precall (capital-backed commitments) — arb-london__SYNTHESIS.md,
agora__SYNTHESIS.md; off-chain reference: StickK / Beeminder commitment contracts.
**Adaptation axes:** committed behavior (weekly deposit, hold-without-selling for N weeks, round-up
count from F01); bond asset ($WIF, burned on default = flywheel sink); resolution (deterministic
onchain deposit check — no oracle, no randomness needed); reward pool (forfeits redistributed in
USDG/stock, not WIF spot); onboarding (embedded wallet + sponsored gas); retention API exposed to
other RH builders (M4 as infra).
**Saturation:** fresh — entrants admit zero returning players; no roster entry targets retention
(gap-map W3, M4).
**Loss-twin:** EdgeLedger (Delphi, DNF) — right thesis, zero activity; a streak product with no
seeded users in the demo window reads as empty (delphi__edgeledger-BASELINE.md).

### F04 — Aggregator-hook flywheel router [lane: sponsor-newest]
**Anchored on:** Uniswap aggregator hooks on RH Chain (shipped 2026-10, theblock.co 2026-10-22)
**Mechanism:** Library F07 (meta-layer over existing volume) re-anchored onto the newest sponsor
primitive. Do not build a new venue: a v4 hook (and aggregator-hook route) sits on volume that
already exists — hooks carry 74.5% of RH v4 trades — and routes a sliver of every swap through a
deterministic $WIF buy-and-burn or into the F01 stock sweep. Targets **W4** (a properly built hook
routing value to the WIF flywheel) and **W5** (security-legible).
**Receipts:** TruthBounty (Seedify 2nd, self-sourced), Cobot, CRE Risk Router (Chainlink
Convergence) — micro-events__SYNTHESIS.md §1.
**Adaptation axes:** hook point (afterSwap fee skim vs beforeSwap dynamic fee); which pools (WIF
pairs, USDG/stock pairs, any aggregator route); flywheel destination (burn, stock-backed treasury,
user round-up); safety (Chainlink-bounded execution, no WIF-spot pricing, TWAP-free design, ownerless
+ verified for the whitehat judge); Quicknode Stock Token API for discovery of new tickers (+8 stock
tokens 2026-10-28).
**Saturation:** warm — only Sherwood occupies v4 hooks on the roster; hook demos are legible to the
WIF team but must be correctly built to clear the security judge.
**Loss-twin:** AlphaAttest (Arbitrum London) — a layer over a market that did not exist yet; a hook
on pools with no volume is the same failure (arb-london__SYNTHESIS.md).

### F05 — "Your memes vs. the market" self-analytics [lane: cross-pollination]
**Mechanism:** Library F04 (behavioral self-analytics on transparent ledgers). The ledger is
public, so analyze THE USER, not the market: replay a wallet's RH memecoin history against the
counterfactual "if each buy had gone into NVDA/TSLA Stock Tokens" (Chainlink historical rounds), then
offer a one-tap $WIF-fee'd conversion into that counterfactual. Feeds **M1** and the RH frustration
"built for stocks, memecoins took over".
**Receipts:** Undertow (Pacifica Track 2 winner) — pacifica__FIELD.md, pacifica__SYNTHESIS.md finding 3.
**Adaptation axes:** FORCED AXIS-SHIFT = subject (market -> self). Counterfactual benchmark (single
Stock Token, ETF token, basket); data source (Quicknode/GetBlock RPC traces, Blockscout is
CF-gated); conversion leg (embedded wallet + USDG RFQ into stock); WIF role (burn per conversion,
shareable "meme report card" as the community-vote one-liner); NOT a prediction product — no
forward-looking bets.
**Saturation:** fresh — no roster entry analyzes holders' own behavior; the subject shift is
uncrowded.
**Loss-twin:** AXON (Pacifica, not finalist) — the same insight demoted to a feature on a clone
terminal chassis (pacifica__axon-BASELINE.md).

### F06 — Holder-to-allocator delegation with capped session keys [lane: cross-pollination]
**Mechanism:** Library F06 (trader-to-operator delegation) fused with F12 enforcement. The user's
role shifts from memecoin trader to allocator: they sign one ERC-7702/4337 session key with an
onchain spend cap, ticker allow-list and expiry; a deterministic rebalancer moves WIF gains into
Stock Tokens within those bounds, and an over-cap attempt visibly reverts.
**Receipts:** ClashX (Pacifica Grand Prize) and Sup Wallet (Sui Overflow Agentic winner) —
pacifica__SYNTHESIS.md finding 4, sui-overflow__SYNTHESIS.md; Consilium (MetaMask 1st, reverted
overcap tx as proof) — metamask__consilium.md.
**Adaptation axes:** FORCED AXIS-SHIFT = role (trader -> allocator/operator). Enforcement locus
(ZeroDev/Alchemy session-key policy module vs custom 7702 delegate); what is delegated (take-profit
WIF -> stock, dividend reinvest, F03 streak deposits); oracle guard (Chainlink 24/7 feeds for
TSLA/NVDA/GOOGL); WIF role (delegation fee burned per executed rebalance); adversarial demo (the
whitehat-legible revert). Not an agent marketplace — one user, one bounded executor.
**Saturation:** warm — delegation is spreading across agentic tracks; enforcement-grade scoping on
RH Stock Tokens is unoccupied.
**Loss-twin:** x9 Protocol (Solana Frontier, unplaced) — the enforcement primitive buried as one
bullet of nine (solana-frontier__x9-BASELINE.md).

### F07 — Live-bound reserve attestation for WIF-backed stock vaults [lane: core]
**Mechanism:** Library F29. Any vault on this sheet (F01/F02/F03) publishes a continuously
recomputable proof that its Stock Token holdings x Chainlink price >= liabilities, bound to live
balances, with adversarial insolvency-rejection tests. Domain: DeFi/RWA. Targets **W5**.
**Receipts:** zkProofofReserve (Stellar ZK 4th) and Tukar (Stellar ZK 5th) — stellar__SYNTHESIS.md.
**Adaptation axes:** attested fact (reserves, collateral ratio of a Morpho stock-token position);
live binding (balanceOf + Chainlink latestRoundData read in the same call, staleness check);
consumer (users, Morpho, the WIF team's dashboard); guest-verifiable page for judges (pairs with
library F23); WIF role (attestation unlocks fee tier; still requires a host flywheel from F01–F04).
**Saturation:** warm — proof-of-reserve is a known category; the live-binding variant is the edge.
**Loss-twin:** Lacuna (Stellar ZK, unplaced) — verifies the proof, then moves an unconstrained
amount (stellar__lacuna.md).

### F08 — Zero-to-first-share stack spectacle [lane: core]
**Mechanism:** Library F26 (multi-primitive stack spectacle). One causal hero path where every RH
primitive is judge-visible: email login (Privy embedded wallet) -> sponsored 4337 gas -> receive
first $WIF -> v4 hook skims a burn -> remainder becomes a fractional Stock Token priced by Chainlink
-> ERC-8056 multiplier shown. Domain: consumer/payments. Targets **W2** (zero-crypto -> first WIF +
first stock in one flow).
**Receipts:** BlitzMine (Solana Blitz 1st) and Consilium (MetaMask 1st) — solana-blitz__SYNTHESIS.md
finding 3, metamask__consilium.md.
**Adaptation axes:** which primitives stack (embedded wallet, AA paymaster, v4 hook, Chainlink,
Stock Token, USDG); visible surface per primitive (a step ticker the voter sees); entry trigger (a
claim link from a friend — kept away from the tipping cluster by making the payload a stock share,
not WIF); derivative-but-legible is acceptable (SWEEP L14).
**Saturation:** warm — the Gas-in-WIF paymaster solves gas only; one-flow onboarding to stock is
open, but stacking is the expected podium shape.
**Loss-twin:** TradeTable (Blitz, unplaced) — deepest honesty, thinnest stack (solana-blitz__tradetable-BASELINE.md).

### F09 — Farming-sim grammar over real stock ownership [lane: core]
**Mechanism:** Library F32 (familiar game grammar over a financial venue). Plots are real Stock
Token positions; "watering" is a recurring deposit, "harvest" is the ERC-8056 dividend multiplier,
and $WIF is the seed/fertilizer that is burned to unlock plots. The game state IS the portfolio.
Domain: games/consumer. Supports **W3** and **W1**.
**Receipts:** Clash of Perps (Pacifica Track 3 winner) and Bazaar X (OKX S2 best economy loop) —
pacifica__FIELD.md, okx-buildx__SYNTHESIS.md.
**Adaptation axes:** game grammar (farming sim, tamagotchi, collection book — never a 3D world or
dungeon, those are occupied); venue (Stock Tokens + USDG); distribution (WIF community, X share
cards); WIF role (burn-to-plant); randomness (none needed — deterministic growth, since prevrandao is
constant on RH).
**Saturation:** warm — "gamified trading" is crowding and the roster has many games; the 2D
grammar-over-real-ownership variant is still thin.
**Loss-twin:** none recorded in the corpus; nearest local risk is the roster's 3D world games with
zero players.

### F10 — WIF up/down price pools (collision-map control) [lane: core]
**Mechanism:** Library F36 / organizer-suggested prediction pools: users stake $WIF on a Stock Token
or WIF moving up or down; the losing side's stake is partly burned. Kept ONLY as the collision-map
control so generators can measure distance from it; not a candidate to build.
**Receipts:** Delphi organizer-listed meta-markets (seed, not a winner) — delphi__SYNTHESIS.md
finding 4; local roster: Fallpit, wifpool, kerdo, Flat Street, Stock Fair, WIF League.
**Adaptation axes:** any axis shift lands on F05 (subject: self) or F03 (activity: saving instead
of betting); resolution via Chainlink rounds; no onchain randomness; WIF has no price feed, so WIF
up/down markets are spot-manipulable — a whitehat-judge kill.
**Saturation:** clone-tier — justified: retained as the negative reference for Gate 1b distance
checks; 6+ roster entries occupy it and it matches the organizer suggestion list (L6). Do not seed.
**Loss-twin:** EdgeLedger (Delphi, DNF) — even the sharpest thesis in this shape produced zero
trades (delphi__edgeledger-BASELINE.md).
