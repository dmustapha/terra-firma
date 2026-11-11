# WINNER-BRIEF — World is Flat Hackathon
**Idea:** Terra Firma | **Track:** Stock Tokens (+ hooks and defi, consumer and payments, onboarding) | **Warroom Version:** V1 | **Date:** 2026-11-10
**Tagline:** The world is flat. Stand on solid ground.

---

## Chosen Idea
Terra Firma turns memecoin activity on Robinhood Chain into real stock ownership, with $WIF as the token that captures the value. A **Hindsight card** prices your past meme buys against NVDA/SPY using historical Chainlink rounds, then converts your non-WIF memes into a real Stock Token **Jar** you own in one tap. From then on, every meme you trade through the **Terra Router** sweeps a slice into that Jar. A small protocol fee on every routed trade is split 50/50 between **buying and burning $WIF** and **buying real stock streamed to $WIF stakers**: stake $WIF, earn real stocks.

## Problem Statement
Robinhood Chain was built for tokenized stocks, but memecoins took it over: ~15K tokens launch daily and ~84% never trade again (Bitquery, via research brief), memecoin volume fell ~96% from its September peak, and only 5 tokens hold >$10M market cap. Memecoin holders bleed value with no habit or path into the 203 real assets sitting on the same chain. **The one shocking number:** the Hindsight card shows it per wallet, e.g. "$340 in memes is $41 today; in NVDA it would be $512."

## Why It Won
| Criterion | Weight | Score (R1 re-score, 4 scorers) | Rationale |
|-----------|:------:|:-----:|-----------|
| Real reason to use $WIF | 34% | 5.4/10 | $WIF is the claim on protocol revenue paid in real stocks + the burn sink; delete-test passes (weakly while volume is low) |
| Flywheel that holds up | 33% | 4.6/10 | jar growth gives a personal, non-speculative reason to route trades; weakest dimension (router volume starts ≈0) |
| Works & built well | 33% | 6.1/10 | every load-bearing fact live-verified on mainnet; Chainlink-bounded fills, never prices $WIF |
R1 criteria-weighted total: **5.37** (Crew 4.46). Round-0 ancestors: Keel 5.93, Rearview 4.83 (high-divergence, strongest demo).

## Key Deliberation Arguments (Why This Won)
1. Cross-exam: Crew's killing blow ("Terra Firma is a net seller of $WIF") landed and was FIXED by redesign (D5: $WIF is never a convert target; fees buy & burn it), while Terra Firma's killing blow on Crew ("vouch resolves Dec 3 — retention can't be earned before judging") is structural.
2. Challenge: "$WIF fails the delete test" (CRITICAL) → fixed by D6 "Stake $WIF, earn real stocks": remove $WIF and the stock stream disappears.
3. Fact-check (distinct model, LAW#12 PASS): NVDA/USDG QuoterV2 fill +0.16% vs Chainlink; NVDA Chainlink history back to 2026-06-22; WIF/ETH v4 pool quotable (0.01 ETH → 15,561 WIF); Privy + ZeroDev sponsor gas on 4663.

## Whitespace Occupied
W1 (Stock Tokens as everyday ownership) + M1 (meme → real-asset conversion habit) + P1 (memecoins + tokenized equities + Chainlink stock feeds coexist only on RH Chain). No WIF entrant converts meme activity into owned stock (Underfoot = burn-to-redeem floor; Lastbell = stops; WIF League/Fallpit = prediction).
**Event Class:** open_buildathon (inferred; community_vote overlay)
**Selection Path:** user_override (Dami's pool-checkpoint redirect + D5/D6) — validated by an independent unanimous R1 re-score.

## Thesis
WINNING ARGUMENT: Terra Firma is the only entry that turns Robinhood Chain's memecoin activity into real stock ownership and makes $WIF the token that earns from it, so it embodies the chain's RWA thesis and the WIF team's "developers, the virtual economy, and real-world finance" in one loop a judge sees in under a minute.
EVIDENCE:
1. Live mainnet proof: stock fills within 0.16% of Chainlink, Chainlink history back to 2026-06-22, router path quotable, nothing faked (fact-check TF1–TF4, LAW#12 PASS) | 2. $WIF passes the delete test: staking $WIF = claim on fee revenue paid in real stock + buy-and-burn | 3. Uncontested lane: 0 of 49 entrants convert meme activity into owned stock; organizer seeded "stock tokens" first.
DEMO OBLIGATION: In under 3 minutes the judge must witness, on mainnet with real tokens: (a) a real wallet's Hindsight card priced from Chainlink rounds, (b) a one-tap convert that lands a real Stock Token in the user's Jar (Blockscout link), (c) a meme trade through the Terra Router that sweeps a slice into the Jar AND emits a $WIF burn, (d) a $WIF staker's Jar receiving its real-stock stream.
HERO FLOW: paste wallet → Hindsight card → convert memes to NVDA in one tap → trade a meme via Terra Router → watch the Jar grow and $WIF burn.
INVARIANTS:
- Never price $WIF for value (no spot reads in value logic; per-block capped buys only).
- Never sell or convert users' $WIF; $WIF is only ever bought, burned, or staked.
- Demo state is never fabricated: every number on screen comes from mainnet state or Chainlink rounds.
- Stock fills are always bounded by a fresh Chainlink price (staleness + paused checks).
DRIFT TRIPWIRES:
- if "stake $WIF, earn real stocks" yield numbers become the headline instead of the memes→real-stock conversion loop, that is drift
- if dividends become a claimed demo beat, that is drift (no step is guaranteed during judging)
- if the friend-jar social layer is built before the 4-mechanism core is green on mainnet, that is drift
- if the product converts or sells $WIF anywhere, that is drift (and a thesis violation)

AMEND-1 | 2026-11-10 | source: [USER] Dami "shouldnt it be connect wallet?" | HERO FLOW | paste wallet → Hindsight card → … | connect wallet → your Hindsight card → convert memes to NVDA in one tap → trade a meme via Terra Router → watch the Jar grow and $WIF burn (secondary read-only 'look up any wallet' link) | signing actions require a connected wallet; lookup kept for virality + judges

## Load-Bearing Mechanisms
1. Hindsight card: indexes a wallet's RH meme buys from swap logs, prices what was paid via the ETH/USD (or USDG) Chainlink round at that block and the counterfactual stock via the historical stock-feed round → now, recomputable onchain (receipts-backed), with a shareable X card; without it there is no front door, no conversion volume, and no viral loop.
2. One-tap convert into a user-owned Stock Token Jar: sells non-WIF memes to USDG/WETH and buys a feed-backed Stock Token through existing deep Uniswap pools with a Chainlink-bounded min-out, depositing into a per-user vault only the user controls; without it the card is just a chart.
3. Terra Router + sweep: routes any RH memecoin trade through Uniswap (incl. the hooked WIF/ETH v4 pool) and sweeps the user's chosen slice, taken on the ETH/USDG side after the swap, into their Jar; without it there is no recurring inflow and no fee base.
4. $WIF staking stream + burn: the protocol fee pool splits 50/50 into per-block-capped WIF buy-and-burn and Chainlink-bounded stock purchases streamed per epoch to $WIF stakers' Jars (unstake delay against just-in-time staking); without it $WIF is a toll and the "real reason to use $wif" criterion fails.
5. Safety & compliance layer: Chainlink staleness/paused checks and min-out bands on every fill, ownerless verified contracts, restricted-jurisdiction geofence on the stock leg, SECURITY.md disclosing the third-party owned hook on the WIF/ETH pool; without it the security judge breaks the money path and rule 14 is violated.

## Open Decisions
1. Router volume source (the #1 weakness all 4 re-scorers named): options (a) Hindsight converts as the primary volume engine + router sweeps, (b) make Terra Firma the place you buy memes (a meme-trading front end where the sweep is the reason to use it), (c) a Telegram trade bot over the same router; recommended disposition (a)+(b), with (c) as stretch, because the reason to route is the user's own Jar, not a fee.
2. Fee and split parameters: options fee 0.3% / 0.5% / 1.0% of routed notional, split 50/50 vs 60/40 burn/stock, default sweep 1% / 2% / 5%; recommended 0.5% fee, 50/50 split, 2% default sweep (user-adjustable 0–10%), because it keeps the burn visible on dust-sized demo trades without making routing uncompetitive.
3. Staking reward mechanics: options per-block streaming vs hourly epochs vs daily epochs, unstake delay 0h / 1h / 24h; recommended hourly epochs with a 24h unstake delay (anti just-in-time staking per FORGE) and a 1h epoch so judges see a stream within the demo window.
4. Stock menu + geofence: options all ~37 feed-backed tokens vs a curated 6 (NVDA, TSLA, GOOGL, SNDK 24/7 + SPY, QQQ), geofence via IP check + self-attestation vs attestation only; recommended curated 6 with the 24/7 four as defaults, IP + attestation geofence on the stock leg only (Hindsight cards stay open to all).
5. Hindsight data source + verifiability: options GetBlock/Quicknode RPC logs indexed client-side vs a small indexer service, and onchain recompute as a view function vs a stored-verdict NFT; recommended RPC logs via GetBlock (judge resonance) with a public `recompute()` view and an optional mint-the-card action that burns a tiny $WIF.
6. Mainnet wallet + spend: options a fresh deployer wallet funded by Dami vs Dami's existing wallet; recommended a fresh deployer + a separate demo user wallet, funded once with ~0.005 ETH + ~5,000 $WIF (≈$18 total), hosting on Vercel + an always-on keeper for epochs/settles until 2026-11-16 17:30 UTC.
7. Friend Jars (stretch): options build now vs only if the core is green on mainnet by 2026-11-11 23:59 WAT vs drop; recommended the gated stretch, because the challenge pass rated scope CRITICAL and Dami's directive wants extensive but finished.
8. Community-vote campaign: options no campaign vs generic shill posts vs a ship thread in Dami's personal-tweeter voice built on real Hindsight cards tagging @WIFonRH; recommended the personal-tweeter ship thread with every post approved by Dami, because the community holds one judge seat and ~1.45K active $WIF voters are exactly the product's users.

**STAGE-0 ratification (2026-11-10, Dami):** "Ratify all 8 as recommended".

## Top Risks + Mitigations
| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Router volume ≈0 → staker stream and burn are dust; flywheel reads hollow | HIGH | OD1: Hindsight converts drive volume; router is the buy-memes front end; show real per-trade burn + stream txs honestly |
| 2 | Scope: 5 mechanisms + router + frontend solo in ~30h | HIGH | 4-core first, friend jars gated; reuse Uniswap Universal Router/QuoterV2 rather than custom AMM math |
| 3 | Security judge finds a hole (JIT staking, farmable match, third-party owned hook, self-typed card amounts) | HIGH | epoch streaming + unstake delay; no match program in core; min-out on every hop; card amounts derived from logs not typed; SECURITY.md |
| 4 | "Stake $WIF, earn stocks" reads as generic staking / near Underfoot | MED | Hindsight card leads the demo and the X post; staking framed as "your $WIF earns a slice of every meme trade, paid in real stock" |
| 5 | US judges geofenced out of the stock steps | MED | geofence only the stock purchase; demo video shows full flow from an eligible region; Hindsight works everywhere |

## Non-Negotiables (Must Be In Build)
- Deployed and verified on Robinhood Chain mainnet 4663 with real $WIF tx hashes for convert, sweep, burn and staking stream (rule 3/5).
- Never price or sell $WIF; Chainlink-bounded stock fills with staleness/paused checks.
- Live and working until 2026-11-16 17:30 UTC (durable hosting + keeper).
- No Robinhood name/logo; restricted-jurisdiction geofence on the stock leg.

## Explicit Out-of-Scope
- Dividend-driven burns or any claimed dividend demo beat (no step guaranteed during judging).
- A new Uniswap v4 hook pool (empty-liquidity problem) and any custom AMM.
- Time-locked vouch/referral bonds (unearnable before judging).
- AI agents (C-NA1: no garnish).

## Minority Dissent (Unresolved Concerns)
DISSENT (WILD, Round 0): "Rearview is superior as a viral hook; Keel's climax can't happen before Nov 12." — absorbed: Rearview became Terra Firma's front door and dividends were dropped; residual: staking framing may read generic (Risk 4).
DISSENT (LOOP, Round 0): "Crew is the only idea where people come back for a social reason." — partially absorbed as gated friend jars; unresolved: Terra Firma's retention is personal (jar growth), not social.
