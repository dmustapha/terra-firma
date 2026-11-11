# G4 — JUDGE generator return (WIF Warroom V1, 2026-11-10)
Lens: build what the rubric literally asks for — (A) a real reason to use $WIF, (B) a flywheel that holds up without hype, (C) works and is built well (live on 4663, verified, ownerless, Chainlink-priced, legible in minutes). Event-class toggle: RELAX native-problem. No AI anywhere (C-NA1). No session-key/agent spend caps (leash, Binance bStocks agent excluded). All stock-token surfaces geofence US/UK/CA/CH (rule 14); no "Robinhood" in any name.

Global safety rule for every idea (Ogle): $WIF is never priced off v4 spot for anything value-bearing. WIF amounts are fixed-unit (burn N WIF), and stock/USDG legs are bounded by Chainlink `latestRoundData` with staleness checks.

---

### 1. Dividend Furnace
- mechanism:
  1. **Uniswap v4 hook on WIF/USDG (and opt-in aggregator-hook routes)** takes a fixed afterSwap skim (e.g. 0.3%) in USDG, so every existing WIF trade feeds the furnace. It adds no new venue.
  2. **Ownerless stock-token treasury.** The skim buys a fixed basket (SPY/NVDA/TSLA Stock Tokens) in small chunks. Each buy is bounded by Chainlink 24/7 feeds (max slippage vs oracle, staleness revert). There is no admin key and the basket weights are immutable at deploy.
  3. **ERC-8056 multiplier harvest.** The treasury separates principal from yield by tracking the dividend/split multiplier delta per stock. Only the multiplier growth (the "dividend") counts as burnable yield, and principal can never leave. Quicknode Stock Token API supplies the dividend calendar for the UI countdown.
  4. **Real-yield WIF burn.** Harvested yield is swapped to WIF through capped, rate-limited chunks (per-block and per-epoch caps, so a spot manipulation can only move a bounded sliver) and sent to the dead address. A public `harvest()` lets anyone trigger it for a small fixed tip.
  5. **Live reserve attestation page.** `balanceOf × Chainlink price` is recomputed on every page load from chain state (GetBlock RPC). It shows "WIF burned by Apple/Nvidia dividends to date", and an insolvency/principal-drain test suite ships in the repo.
- why-this-chain (U6 depth claim): it needs tokenized equities with ERC-8056 dividend multipliers, Chainlink 24/7 equity feeds, USDG, a v4 hook economy carrying about 75% of volume, and $WIF. These five coexist only on Robinhood Chain mainnet 4663. Porting means having no stocks, no dividends and no WIF, so it is a rebuild.
- 3-min demo shape: the judge swaps 50 WIF on a phone. The hook-skim tx appears and the treasury tile ticks up ("+$0.012 into SPY"). Next comes the treasury page: real stock holdings with oracle NAV recomputed live. The wow is pressing `harvest()`: the multiplier delta since the last dividend converts to WIF and burns on screen, captioned "Nvidia just burned 1,204 WIF." Then a forked-mainnet test shows a principal-withdraw attempt reverting.
- TASTE lines satisfied: U1 (real swaps, real stock buys, real burns), U2 (one screen: swap → treasury → burn), U3 ("dividends of real companies burn a memecoin" is unseen), U6 (5 RH-only primitives), U7 (treasury state comes from real hook volume), C-DF1 (real tokens move), C-NA1 (no AI).
- primitive(s) adapted: F04 remixed. The hook's destination is a stock treasury whose yield, not principal, drives the burn. F07 is used as the live proof surface. P2 (ERC-8056) is the load-bearing accounting, where most apps ignore it.
- law-check: L2 pass (principal-drain is unrepresentable: no withdraw path, no admin, immutable weights; the revert is a demo beat). L3 pass (the one primitive is "real-world dividends burn WIF", which is the name and the pitch). L11 pass (strongest axis is flywheel, which is ⅓ weight and tied for top). L12 pass (no rival plausibly names "Dividend Furnace"; distinct from Underfoot because there is no floor/redemption).
- judge appeal: Ogle gets ownerless, oracle-bounded, rate-limited burn with no spot pricing. Sahil gets the Quicknode dividend calendar used for real. Vasily gets "trades buy stocks, dividends burn WIF" in one sentence. The WIF team gets their thesis: memecoin culture united with real-world finance.
  - what does someone do: trades WIF as usual through the hooked pool, or calls `harvest()` after a dividend.
  - what happens to $wif: every trade grows a stock treasury that is never sold. Each dividend from those stocks buys WIF and burns it permanently.
  - why does that bring them or others back: the burn is driven by real-company dividends, not hype. It keeps going in a bear market, and every new trade compounds the treasury that funds all future burns, so holders and traders route volume to the hooked pool.
- first voters / mobilization: all ~1.45K active WIF voter wallets are direct beneficiaries of burns. A "dividend day" burn post on X, and a public harvest-tip leaderboard that turns wallets into callers.

### 2. Sweepstock
- mechanism:
  1. **Opt-in round-up v4 hook.** Registered wallets swapping WIF have a user-set slice (a round-up to the next $1, or a % of output) diverted afterSwap into their personal savings account. Non-registered swaps are untouched.
  2. **Per-user stock savings vault.** Swept USDG batches into the user's chosen Stock Token or basket, bounded by Chainlink. Shares are accounted with the ERC-8056 multiplier, so dividends compound visibly in the position.
  3. **Fixed-unit WIF sweep fee, burned.** Each batch sweep costs a flat 1 WIF burn (no WIF pricing needed). Users who keep weekly sweeps alive get a lower fee tier.
  4. **Embedded wallet + 4337 sponsored gas.** Email login (Privy/ZeroDev), so a non-crypto friend's sweeps run gasless.
  5. **Monthly "statement" view.** An Acorns-style statement built from GetBlock EVM data streams: "your 41 WIF trades became 0.084 NVDA." It is shareable as an image.
- why-this-chain (U6 depth claim): the habit converts memecoin activity into fractional real equities in-block. That needs $WIF pools with v4 hooks plus tokenized stocks with dividend multipliers plus Chainlink equity feeds, which exist together only on 4663 (P1, P2, P3).
- 3-min demo shape: the judge logs in with email and turns on "round up to NVDA". Three small WIF swaps follow, each showing "+$0.31 saved". Then the sweep fires: 1 WIF burns and 0.0019 NVDA lands. The wow is the statement screen, "your memecoin trading bought you real Nvidia," with dividend growth since deposit shown from the multiplier.
- TASTE lines satisfied: U1, U2, U3, U6, U7 (statements come from real swaps), C-DF1, C-CS1 (email login, no docs), C-NA1.
- primitive(s) adapted: F01 + F04 fused. The trigger axis is shifted to an inline afterSwap hook instead of a keeper. Sweeps are batched to fit RFQ-thin stock liquidity. P2 multiplier display is used.
- law-check: L2 pass (the hook can only move the registered user's own opted-in slice to their own vault, so diverting to a third party is unrepresentable; an over-slice attempt reverts). L3 pass (the round-up hook is the product). L11 pass (strongest axis is "real reason to use WIF", ⅓ weight). L12 caution (avoid "Roundup"; "Sweepstock" is non-modal).
- judge appeal: glabuz (retail habit, Acorns legibility), Sahil (Stock Token positions in shares and dividends), Vasily (data streams power statements, one-sentence pitch), WIF team (seed list's "stock tokens" first).
  - what does someone do: turns on round-ups once, then just trades WIF.
  - what happens to $wif: every batch sweep burns 1 WIF, and round-up users route their WIF volume through the hooked pool.
  - why does that bring them or others back: the savings balance grows only when you trade or hold WIF, and the monthly statement plus visible dividends are a reason to return that isn't price speculation.
- first voters / mobilization: WIF traders already swapping daily. Share-the-statement cards on X ("my memes bought me 0.08 NVDA"), and an onboarding link for non-crypto friends.

### 3. Ticker Club
- mechanism:
  1. **Group-owned stock basket vault.** A club contract per group holds real Stock Tokens, with NAV from Chainlink and never from WIF spot. Members deposit USDG for pro-rata club shares.
  2. **WIF lock-to-weight governance.** Members lock WIF (returned on exit after a cooldown, not burned) to weight allocation votes. Each rebalance proposal burns a fixed 25 WIF, so the burn tracks real decisions.
  3. **Timelocked, oracle-bounded execution.** A passed rebalance waits out a timelock (members can exit before it), then executes with Chainlink slippage bounds. There is no manager key, so a malicious proposal cannot exceed bounds or touch member principal.
  4. **ERC-8056 dividend auto-compound** into the basket, with per-member attribution.
  5. **Embedded-wallet invite links** let zero-crypto members join with email. Plus a live proof-of-reserve page per club.
- why-this-chain (U6 depth claim): collective ownership of real equities, decided in a chain-native memecoin, priced by 24/7 equity oracles and settled in USDG, is only expressible on 4663. Elsewhere there are either no stocks or no WIF.
- 3-min demo shape: the judge sees a real club (Dami plus friends) holding SPY/NVDA. One member proposes "+10% TSLA" (25 WIF burns), lock-weighted votes come in, the timelock elapses on a short demo club, and execution lands with an oracle bound shown. The wow is an attacker proposal for 100% to a junk token, which reverts in the contract (allow-list plus bounds).
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1 (invite link), C-NA1.
- primitive(s) adapted: F02. The demo leads with the basket and not the vote, and it adds F07 reserve attestation and the hostile-proposal revert as the climax.
- law-check: L2 pass (no manager can rug: allow-list plus Chainlink bounds plus timelock-exit make the cheat unrepresentable; members' locked WIF is their own skin). L3 pass (the club vault is the product). L11 pass (strongest axis is flywheel/social obligation, ⅓). L12 pass ("Ticker Club" is unlikely to collide; it is distinct from burn-to-vote because the vote moves real assets and the stake is returned).
- judge appeal: Niro/Daniel Zou (investment-club structure, TradFi-legible), Ogle (no-manager safety), glabuz (group retail), WIF team (unites community and real-world finance).
  - what does someone do: starts or joins a club with friends, deposits, and proposes or votes on what the club owns.
  - what happens to $wif: members lock WIF for weight (supply leaves circulation), and every proposal burns WIF.
  - why does that bring them or others back: social obligation, since your friends' money is in it and votes recur. Each new member needs WIF to have a voice, so clubs recruit holders.
- first voters / mobilization: WIF Telegram/Discord sub-communities each spin up a club. Club leaderboards by NAV growth give every club a reason to mobilize votes.

### 4. Holdfast
- mechanism:
  1. **Streak commitment vault.** A user commits to a weekly Stock Token deposit (≥ $X USDG into their own position) toward a named goal and bonds WIF.
  2. **Deterministic epoch resolution.** The contract checks the user's own deposit in each 7-day epoch onchain, with no oracle and no randomness (prevrandao is constant on RH).
  3. **Forfeit split.** A missed week forfeits part of the bond: 50% burned, 50% to the survivor pool (paid in WIF to completers pro-rata). Keepers return the bond plus the survivor share at goal completion.
  4. **Accountability buddy.** An optional co-signed pair, where both bonds are slashed if either misses. This turns social obligation into code.
  5. **Retention read-API for RH builders.** `isOnStreak(addr)` / `streakWeeks(addr)` is a public view other WIF entrants can gate perks on (M4 as infrastructure). Telegram bot reminders run off GetBlock streams.
- why-this-chain (U6 depth claim): the committed behavior is buying real fractional equities in a chain-native stable, with dividends accruing through ERC-8056. The bond is WIF. Without RH Stock Tokens it is just a savings app, and without WIF there is no bond.
- 3-min demo shape: Dami's live 3-week streak (bond 500 WIF) runs on mainnet. The judge watches this week's NVDA deposit check off. The wow is a buddy pair that missed: the slash tx shows 50% burned and 50% flowing to completers. Then a third-party contract reading `isOnStreak` unlocks a badge.
- TASTE lines satisfied: U1, U2, U3, U6, U7 (streak state is real elapsed epochs), C-DF1, C-CS1, C-NA1; C-IN1 for the read-API (a live consumer contract).
- primitive(s) adapted: F03, with a buddy-pair slashing remix. It is exposed as retention infrastructure (M4) so other entrants become consumers.
- law-check: L2 pass (the user's own WIF is at risk, resolution is deterministic, and there is no admin path to excuse a miss). L3 pass (the bonded streak is the product). L11 pass (strongest axis is flywheel retention, ⅓). L12 pass (not a modal name).
- judge appeal: WIF team (a flywheel that holds without hype, plus retention for the ecosystem), glabuz (habit loops from gaming/retail), Ogle (deterministic and ownerless).
  - what does someone do: bonds WIF and commits to a weekly real-stock deposit.
  - what happens to $wif: it is locked as bonds, half of each forfeit is burned, and the rest is redistributed to people who keep their streaks.
  - why does that bring them or others back: missing a week costs you WIF, so every week brings a return visit. Survivors earn from quitters, and buddies pull each other back.
- first voters / mobilization: buddy invites spread it by design. Other WIF entrants integrating `isOnStreak` gives them a shared stake in mobilizing.
- risk note: demo needs real elapsed epochs, so start streaks on day 1 of the build.

### 5. Counterfactual
- mechanism:
  1. **Wallet replay indexer.** GetBlock EVM data streams / Market SQL reconstruct a wallet's RH memecoin buys (timestamp and USDG/ETH size).
  2. **Chainlink historical-round replay.** Each buy is re-priced as "if it had gone into NVDA/SPY" using historical `getRoundData` rounds (recomputed, not displayed). ERC-8056 multiplier history is included so dividends count.
  3. **One-tap conversion router.** WIF or other memecoin → USDG → the counterfactual stock, with a Chainlink-bounded leg and a fixed WIF burn per conversion.
  4. **Onchain report-card attestation.** The conversion mints a soulbound card storing the replay inputs hash and the conversion tx. Anyone can re-run the replay from chain data to verify the card (proof surface).
  5. **Standing "convert-X%-of-gains" rule.** An onchain rule executed by a public `poke()`, where any caller earns a fixed tip, gated to the user's own funds only.
- why-this-chain (U6 depth claim): the replay benchmark is tokenized equities with onchain historical Chainlink rounds on the same chain as the memecoin history. The conversion lands into a real stock token in one tx. Only 4663 has the memecoin ledger, the equity feeds and the stock tokens together (P1).
- 3-min demo shape: paste any RH wallet (the judge's own if they have one) and get a report card, for example "your 212 meme buys: −61%. Same dollars in NVDA: +18%." One tap converts 30% of the WIF into NVDA, 5 WIF burns, and a soulbound card mints. The wow is the "Verify" button re-running the replay in the browser from chain data and matching the card.
- TASTE lines satisfied: U1 (real history, real conversion), U2, U3, U6, U7 (cards come from real wallets), C-DF1, C-CS1, C-NA1.
- primitive(s) adapted: F05 (axis-shift subject: market → self). It remixes Chainlink historical rounds and the ERC-8056 history into a recompute-not-display proof surface (L15).
- law-check: L2 pass (the card's numbers can't be faked because the contract stores inputs and anyone recomputes; the rule can only move the owner's funds). L3 pass (the counterfactual replay is the product, and conversion is its consequence). L11 caution (strongest axis is legibility/virality; mitigated because the WIF burn is per conversion and the standing rule adds a flywheel). L12 pass.
- judge appeal: Vasily (GetBlock Market SQL load-bearing, instantly legible), Sahil (Chainlink plus stock token data), WIF team (directly answers "built for stocks, memes took over").
  - what does someone do: runs their wallet's report card and converts part of their memes into the stock they "should have" bought.
  - what happens to $wif: every conversion burns WIF, and the standing rule keeps burning on each future conversion.
  - why does that bring them or others back: the card is shareable and verifiable, so friends run theirs. The standing rule keeps converting every time gains appear.
- first voters / mobilization: report cards are built to be screenshotted for X, and every WIF voter wallet already has RH history to replay.

### 6. Splitleaf
- mechanism:
  1. **Plot NFTs wrapping real Stock Token positions.** Each plot is an ERC-721 vault holding an actual stock position (deposit USDG → Chainlink-bounded buy). Burning the NFT returns the stock.
  2. **WIF seed burn.** Planting a new plot or unlocking a new ticker burns a fixed WIF amount. Fertilizer (a cosmetic growth stage) burns more. It is the only way to expand the garden.
  3. **Deterministic growth from real data.** Plant growth renders from the position's Chainlink value and ERC-8056 multiplier. A dividend shows as fruit, with no randomness needed.
  4. **Corporate-action events as gameplay.** When the Quicknode Stock Token API or the multiplier reports a split, the plant literally splits into two stems. Dividends ripen fruit that can be harvested (reinvested) with a tap.
  5. **Weekly watering = recurring deposit,** with wilting after missed weeks. Garden visits are shareable via an X card.
- why-this-chain (U6 depth claim): game state IS a real equity portfolio. Splits and dividends come from ERC-8056 corporate-action accounting that exists only on RH Stock Tokens, and the seed currency is WIF. Removing either kills the game.
- 3-min demo shape: email login and plant an NVDA seed (WIF burns, a real NVDA fraction lands in the plot). The garden shows Dami's real plots, and an SPY tree has fruit from a real dividend. The judge taps harvest and the multiplier yield reinvests. The wow is a stock that split, rendered as a split plant, with the onchain multiplier change linked.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, C-CS1 (first-session wow, game grammar), C-NA1.
- primitive(s) adapted: F09 (a farming grammar, deliberately 2D and not a 3D world/dungeon). The remix makes corporate actions (P2) the gameplay events and the plot an ERC-721 vault so ownership is real.
- law-check: L2 pass (the plot NFT is the only key to its stock, with no admin seize path). L3 pass (the "real portfolio as a garden" primitive is the product). L11 caution (strongest axis is spectacle; mitigated because WIF is the only seed currency, so A is load-bearing). L12 pass.
- judge appeal: glabuz (gaming/retail BD), Sahil (Quicknode splits and dividends data directly drive gameplay), WIF team.
  - what does someone do: plants and waters stock "plants" weekly and harvests dividends.
  - what happens to $wif: WIF is burned to plant, unlock tickers and fertilize, so it is the garden's only expansion currency.
  - why does that bring them or others back: plants wilt without weekly watering, real dividends and splits create return moments, and shared gardens bring friends in.
- first voters / mobilization: garden share-cards on X, and a "community garden" plot co-planted by voters.

### 7. Godparent
- mechanism:
  1. **Sponsor bond.** An existing WIF holder bonds WIF to sponsor N newcomers via claim links. The bond funds nothing directly; it is collateral on the newcomer's behavior.
  2. **Zero-crypto onboarding.** Email login (Privy embedded wallet) plus 4337 sponsored gas, and the newcomer's first $1 of a Stock Token is bought from a sponsor-funded USDG budget (Chainlink-bounded).
  3. **Conditional bond release.** If the newcomer completes 4 weekly self-funded deposits (deterministic onchain check), the sponsor's bond returns plus a fixed reward from the protocol pool. If the newcomer never deposits (sybil/farm), part of the bond is burned.
  4. **Anti-sybil economics.** Because the sponsor eats the burn for fake referrals, farming is unprofitable by construction. This is the cheat closed in code.
  5. **Sponsor tree page.** Each godparent's onboarded humans with real stock positions are shown from chain data, with no PII.
- why-this-chain (U6 depth claim): onboarding lands newcomers straight into tokenized equities (not memes) with sponsored gas on 4663 AA infrastructure, and accountability is denominated in WIF. It answers the chain's top frustration (onboarding friction, entrants with no users) with RH-only assets.
- 3-min demo shape: a godparent bonds 500 WIF and generates a link. The judge opens it on a phone with no wallet, logs in with email and receives a first fractional SPY with no gas. The wow is the godparent page with real onboarded humans plus a sybil link that never deposited, whose slash tx shows WIF burned.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, C-CS1, C-NA1.
- primitive(s) adapted: F08 (zero-to-first-share), remixed so the entry payload is a stock share funded under a WIF bond (not a WIF tip, which avoids the tipping cluster), plus F03 deterministic streak resolution as the release condition.
- law-check: L2 pass (the sponsor risks their own WIF on the newcomer being real, and a fake referral costs the farmer). L3 pass (the bonded sponsorship is the product). L11 pass (strongest axis is "real reason to use WIF" as accountability collateral, ⅓). L12 pass. Distance check: not a gas-in-WIF paymaster (gas is sponsored, and WIF is a bond, not the gas token), and not gifting (WIF isn't the gift, and the bond returns).
- judge appeal: glabuz/Daniel Zou (retail onboarding funnel), WIF team (new users for the ecosystem), Ogle (anti-sybil by economics).
  - what does someone do: a holder bonds WIF to bring friends in; a newcomer gets a first stock share and builds a weekly habit.
  - what happens to $wif: it is locked as sponsor bonds and burned on fake or dead referrals.
  - why does that bring them or others back: godparents earn rewards only when their newcomers keep coming back, so they nudge them. Newcomers return weekly to complete the streak.
- first voters / mobilization: every godparent is incentivized to recruit, and onboarded newcomers become WIF-curious voters.

---

## Generator notes
- Strongest judge-literal fit: **#1 Dividend Furnace** (scores A, B and C at once; security-legible; one-sentence pitch) and **#2 Sweepstock** (retail habit plus hook). #1 and #2 share hook plumbing and could be one product (personal round-ups plus protocol furnace), but they are kept separate per L3.
- Shared build spine across #1–#4: a Chainlink-bounded USDG→Stock Token buy module plus an ERC-8056 multiplier accounting library. Build once.
- Spend fit (~$18): hook plus vault deploys and a few dozen demo txs at ~$0.004 each. Stock buys are $1–$5 fractions, and WIF burns are fixed small units from the 5K WIF budget.
- Thin-liquidity risk (all): stock AMM depth is thin, so use small chunked buys with an oracle bound and revert rather than fill badly. The demo should show the bound.
