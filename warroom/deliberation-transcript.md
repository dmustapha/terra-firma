# Deliberation Transcript — WIF Warroom V1

## Phase 0/0B/0C
- Event class: open_buildathon (inferred; reclass from community_vote; Dami approved roles + class at 0B).
- Toggles: RELAX Gate1b#1 (Tenor carve-out), showcase-value rescue, mobilization note (overlay).
- Artifacts: WARROOM-V1-BRIEF.md, agent-roles.md, gap-map.md, concerns-snapshot-V1.md, research/chain-dna.md.
- primitives-sheet.md: 10 families, injection-lint pass (re-verified main context).

## Stage 1 — generation_parallel (34 raw: G1 7, G2 7, G3 7, G4 7, G5 6; all template-conforming)

### G1 return
# G1 — PAIN generator return (RELAX native-problem) — 7 ideas

Global notes: no AI in any idea (C-NA1). No idea prices value off WIF v4 spot; stock legs use Chainlink
min-out bounds. Spend plan per idea: about $1–3 of stock-token buys plus a few hundred txs at ~$0.004, inside the ~$18 budget.
Leash (agent spend-wall), the Binance bStocks agent and GhostPay/RefiRail shapes were checked for overlap and avoided.

### 1. StockBack — every $WIF trade earns you a slice of a real stock
- mechanism: A WIF swap router plus a Uniswap v4 hooked WIF/USDG pool. Each trade pays a 50 bps skim, and the skim becomes fractional stock-token "cashback" owed to the trader. (1) **Skim layer**: a v4 `afterSwap` hook on our WIF/USDG pool, plus a router wrapper for the existing Pons WIF pools, takes 50 bps in the input token. (2) **Chainlink-bounded conversion keeper**: anyone can call it permissionlessly. It batches the skim, sends WIF→USDG→stock token (NVDA/TSLA/GOOGL basket), and enforces min-out from Chainlink stock feeds, so no trade is priced off WIF spot. (3) **Cashback ledger**: per-trader stock-share claims. It is ERC-8056-multiplier-aware, so dividends and splits accrue to the claim. (4) **Retention vesting**: cashback vests over 28 days. A wallet that exits early forfeits it to wallets that stayed, which is a reason to stay. (5) **WIF sink**: 20% of every skim buys and burns WIF. The burn total is shown live.
- why-this-chain (U6 depth claim): it needs tokenized equities as ERC-20 (to deliver cashback in stock), Chainlink 24/7 stock feeds (for safe conversion), USDG as the settlement leg, ERC-8056 multipliers and v4 hooks. That full set exists together only on RH 4663 (P1, P2). $WIF exists only here (P3).
- 3-min demo shape: the judge swaps 5 WIF on mainnet. The ticker shows the 50 bps skim, then the keeper converts it, then "you now own 0.00004 NVDA" at a Chainlink-verified price. The burn counter ticks. Wow moment: the trader's profile shows a growing real-stock portfolio built only from meme trading, with a Blockscout link for each conversion.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1, C-NA1
- primitive(s) adapted: F04 (aggregator-hook flywheel router), re-aimed so the skim goes to the trader's own stock ownership instead of a pure burn. Fused with F01 (round-up): the trigger is the swap itself, not a schedule.
- law-check: L2: an early exiter personally forfeits vesting cashback, and the keeper cannot exceed the Chainlink min-out because the bound is in the contract. L3: the whole pitch is "trade memes, accrue stock." L11: the strongest axis, "real reason to use WIF" (34%), sits on the top weight. L12: "StockBack" is an unlikely rival name, and the roster has no cashback-in-equity entry.
- pain quoted: "Robinhood Chain was built for tokenized stocks — but memecoins took over" (Chain DNA top frustration #1). Also "no durable reason to stay" / memecoin volume -96% (frustration #2).
- first voters / mobilization: the ~1.45K active WIF voter wallets (G.O.A.T. event) are the traders who earn cashback. Seed them with a "your first share is on us" claim for the first 50 traders. Visible change between vote rounds: the cumulative "stock owned by WIF traders" counter and the burn total both rise.

### 2. Squad Shares — a group chat that owns real stocks together, steered by $WIF
- mechanism: A Telegram-native investment club. Friends pool USDG into a shared vault that holds real stock tokens and decide allocations with locked $WIF. (1) **Club vault**: an ERC-4626-style share vault holding stock tokens. NAV comes only from Chainlink feeds. (2) **Lock-to-weight**: members lock WIF to get allocation weight, and the lock is returned on exit, never consumed. Weight decays if the member doesn't deposit, so a free-rider loses influence. (3) **Proposal market**: each rebalance proposal ("rotate 20% TSLA→NVDA") burns a fixed WIF fee. A quorum plus a 1-hour timelock follows, then execution under Chainlink slippage bounds. Losing proposers eat the burned fee. (4) **Embedded-wallet invites**: a zero-crypto friend joins from a Telegram link (Privy plus 4337 sponsored gas) and owns club shares in under a minute. (5) **Dividend reinvest**: ERC-8056 multiplier deltas are auto-credited to the club NAV.
- why-this-chain (U6 depth claim): a pooled vault of real equities needs stock ERC-20s, Chainlink NAV and USDG, which only RH has (P1). WIF as the steering asset exists only here (P3). On other chains this is a crypto index club, not a stock club.
- 3-min demo shape: a live Telegram group of 4. The judge taps the invite and has a wallet and club shares in seconds. A member proposes "add GOOGL", WIF burns, the timelock ends, the vault swaps on mainnet, and the NAV card updates from Chainlink. Wow moment: a friend with no crypto history ends up co-owning NVDA and GOOGL through a chat.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1, C-NA1
- primitive(s) adapted: F02 (investment club). Remixed with F08 (zero-to-first-share stack) as the invite path and F03's decay-if-idle obligation mechanic.
- law-check: L2: a bad proposer loses the burned fee, and execution outside the Chainlink bound reverts in code. L3: the basket is the product and the vote is only its steering wheel (dodges the burn-to-vote cluster). L11: the top-weight axes are "real reason for WIF" plus "flywheel" (lock and burn). L12: no roster name collides, and "Squad Shares" is not modal.
- pain quoted: "Most platforms focus on getting users to notice them, but keeping people engaged and giving them meaningful reasons to participate is a completely different challenge." (@Wazir_____ on X). Also gap M3.
- first voters / mobilization: WIF Telegram and CT friend groups. Each club is a voting bloc of 4–10 wallets that already hold WIF. Seed clubs = Dami's circle plus the RH builder accounts (@RWIrobinhood). Between rounds the "clubs live / club NAV" leaderboard grows.

### 3. Hold the Line — WIF-bonded savings streaks that pay the people who keep going
- mechanism: A user commits to a recurring stock-token deposit (daily or weekly cadence) toward a named goal ("1 NVDA by June") and posts a WIF bond. (1) **Commitment vault**: a WIF bond plus a goal and cadence. The deposit check is a deterministic onchain balance and transfer check, with no oracle and no randomness. (2) **Forfeit engine**: a missed epoch forfeits a bond slice. 50% is burned and 50% is streamed to active streakers, in proportion to streak length. (3) **Buddy pods**: 2–5 people co-sign. A member's lapse cuts the pod's multiplier, which creates real social obligation. (4) **Goal progress priced by Chainlink**: "62% of 1 NVDA" is computed live, and a completed goal unlocks the bond plus the earned pot. (5) **Streak API for other RH builders**: other entrants' games can read `isStreaking(addr)` to gate perks. This is M4 as infra, with a live consumer.
- why-this-chain (U6 depth claim): the saved asset is a real equity (stock ERC-20) priced 24/7 by Chainlink (P1). The bond and sink are WIF (P3). ~$0.004 txs make daily micro-deposits viable, and embedded wallets plus sponsored gas make them painless. Saving equities inside a meme community is RH-only.
- 3-min demo shape: real streak wallets that started Nov 11 on mainnet, so the state is earned. The judge creates a goal and bonds 50 WIF. A pod member who missed yesterday shows a forfeit transaction that burns WIF and pays the streakers. Wow moment: the forfeit splits live, with burn on one side and the user's streak payout on the other.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1, C-NA1
- primitive(s) adapted: F03 (streak-bonded savings), remixed with F01 (the deposit leg can be the StockBack/round-up sweep) and with group pods from F02.
- law-check: L2: the quitter eats their own WIF bond, and the check is a pure onchain deposit test with no admin path. L3: one sentence, "bond WIF, save a stock, quitters pay you." L11: flywheel (33%) plus real WIF reason both rank top. L12: "Hold the Line" is not a likely rival name.
- pain quoted: "Honest numbers: every night so far is house-only (30 published house agents, 0 players), so season 1 has no crown." (SEMALAM gallery update, @edycutjong). Also the @Wazir_____ engagement quote, and W3/M4.
- first voters / mobilization: WIF holders who already HODL want a yield on discipline. Recruit 50 day-one streakers from the G.O.A.T. voters. A live "longest streak / WIF burned by quitters" board changes daily between vote rounds.

### 4. WIF Fair Mark — the first manipulation-resistant $WIF price, with a live consumer
- mechanism: A permissionless onchain WIF/USD reference that one big swap can't move, plus a showcase consumer that needs it. (1) **Multi-pool sampler**: a ring-buffer contract. Anyone can poke it each block, and it reads `sqrtPriceX96` from every major WIF v4 pool (Pons, USDG, WETH) via StateView. (2) **Clamped geometric mean**: each sample's move is clamped to ±X% per block, with a median across pools and outlier rejection. Moving the mark needs sustained, multi-pool, multi-block capital, and the cost is published. (3) **USD leg** via the Chainlink ETH/USD and USDG feeds. (4) **WIF-bonded keepers**: pokers bond WIF and earn a tiny WIF stipend from consumer fees. A provably stale or skipped duty slashes the bond, and slashed WIF is burned. (5) **Live consumer, WIF→stock fair-swap**: a converter that only fills when spot is within Y% of Fair Mark, which protects users from momentary pumps and dumps. Consumer fees are paid in WIF and partly burned.
- why-this-chain (U6 depth claim): $WIF trades only on RH 4663 v4 pools and has no Chainlink feed (honest constraint). This fills that exact chain gap. Its consumer converts into RH stock tokens. ~100ms blocks make per-block sampling cheap and dense.
- 3-min demo shape: a split screen shows WIF spot next to Fair Mark. The judge executes a deliberately lopsided swap and spot jumps 8% while Fair Mark moves 0.3%. The fair-swap converter refuses to fill at the manipulated price (a revert is shown on Blockscout), then fills once spot reconverges. Wow moment: the refusal.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-IN1, C-NA1
- primitive(s) adapted: F07's live-binding idea (attested fact read in-call against live state) applied to price instead of reserves, plus F04's ride-existing-volume, with no new venue.
- law-check: L2: keepers risk their own WIF bond, and the clamp makes single-tx manipulation impossible in code. L3: the oracle is the product, and the consumer only proves it. L11 risk: the strongest axis is "built well" (33%), but the WIF reason (the only fair WIF price, keeper bond) is also top-weight. The tie is acceptable, but it is the weakest consumer appeal of the seven. L12: "Fair Mark" is not modal, though "oracle" names might be.
- pain quoted: "Spot price: scores read the pool's current price, which one large swap in a single tx can move." (WIF Agent Arena SECURITY.md update). Also the chain constraint "no WIF price feed (v4 spot manipulable)".
- first voters / mobilization: the other 49 entrants, many of whom price WIF off spot (Arena, pools, games). Each one that integrates Fair Mark is a builder-voter. Pitch it to them directly on Discord and X. Between rounds the "integrated by N projects" counter goes up.

### 5. Starter Share — a drop-in onboarding kit that turns any entrant's visitor into a stock-owning WIF user
- mechanism: A widget plus contracts that any RH app embeds. A visitor goes from email to wallet to first WIF to first fractional stock in one flow, paid for by the app's WIF acquisition budget. (1) **Embedded wallet plus 4337 sponsored gas** (Privy/ZeroDev), with no ETH and no bridge. (2) **WIF acquisition escrow**: each integrating project deposits WIF, and each verified activation burns a fixed slice and funds the user's starter pack. This is "CAC paid in burned WIF." (3) **Starter pack conversion**: the escrow funds USDG→fractional stock token under a Chainlink-bounded min-out, sitting in a 7-day cliff. An anti-sybil clawback returns it to the escrow if the wallet dumps the pack or never returns. (4) **Activation attestation**: the host app calls `activate(user, actionId)` only after a real in-app action, and per-project caps plus device and email rate-limits apply. (5) **Public activation board**: verified real users per project, with an onchain count.
- why-this-chain (U6 depth claim): it combines AA and embedded wallets live on 4663, stock ERC-20s with Chainlink pricing for the welcome gift, and WIF only here. "Your first share of a real stock" as an onboarding hook is impossible on chains without tokenized equities. The WIF Paymaster solves gas only.
- 3-min demo shape: the judge scans a QR on their phone and enters an email. About 20 seconds later they hold 10 WIF plus 0.001 TSLA in a wallet they've never seen before, while the host project's escrow shows a WIF burn. Wow moment: zero crypto to stock owner in under 30 seconds, live on mainnet, from inside another entrant's game.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-IN1, C-CS1, C-NA1
- primitive(s) adapted: F08 (zero-to-first-share stack), turned from a one-off spectacle into reusable infra whose payer is the project, not the user. Remixed with F03's vesting cliff as the anti-sybil mechanism.
- law-check: L2: farmers lose the clawed-back pack, a project's escrow pays only for activations it attests, and caps are enforced in the contract. L3: the one sentence is "first share in 30 seconds, paid in burned WIF." L11: the top-weight axes are "real reason for WIF" plus "flywheel" (projects must buy and burn WIF to acquire users). L12: not a modal name. It is distinct from the Paymaster (gas only) and from tipping (the payer is the project, and the payload is gated on activation).
- pain quoted: "Buying a token on another chain usually means bridging funds, waiting for confirmation, arranging gas, and finding the right pool." (@Allthinks2 on X). Also dextools: users "can't do anything" without the gas token, and SEMALAM's "0 players".
- first voters / mobilization: entrants with zero players (SEMALAM, Zeron, the game entrants) integrate it to get players, and those activated users become voters too. Between rounds the board of activations per project, and the WIF burned, grow.

### 6. Regret Ledger — an onchain-proven "what if it had been NVDA" report card, with one-tap conversion
- mechanism: Paste any RH wallet. The app replays the wallet's memecoin buys against the counterfactual "same USDG into NVDA/TSLA at that minute." The counterfactual is recomputed onchain, then a one-tap conversion follows. (1) **History indexer**: GetBlock/Quicknode RPC traces of the wallet's RH swaps (Blockscout is CF-gated). (2) **Onchain counterfactual verifier**: a contract takes (buy tx, Chainlink roundId) pairs and checks that each round brackets the buy timestamp. It recomputes the counterfactual from Chainlink historical rounds, so anyone can re-verify a card's number, and the card is never a picture of a claim. (3) **Regret-to-equity router**: it sweeps meme dust to WIF to USDG to the counterfactual stock, with Chainlink min-out on the stock leg and per-hop slippage caps. (4) **WIF burn plus soulbound card**: each conversion burns a WIF fee and mints a non-transferable card holding the verified numbers, shareable to X. (5) **Monthly re-score**: the card updates as both portfolios drift, which brings the user back.
- why-this-chain (U6 depth claim): the counterfactual needs historical Chainlink rounds for tokenized equities on the same chain as the meme trades, and the fix needs buyable stock ERC-20s. Both exist only on RH (P1). Elsewhere you can compute regret but can't act on it.
- 3-min demo shape: the judge pastes their own wallet (or a public whale's). The animation reads "Your 41 meme buys: -88%. Same dollars in NVDA: +23%." The judge taps "Verify" and the contract recomputes on Blockscout, then taps "Convert" and the dust becomes stock while WIF burns. Wow moment: a verified number about the judge's own wallet.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1, C-NA1
- primitive(s) adapted: F05 (self-analytics, market→self axis shift), hardened with F07's recompute-not-display proof surface (L15) and given F01's conversion leg.
- law-check: L2: the cheat (inflating regret) is unrepresentable because the verifier rejects a mismatched roundId or timestamp in code, and the converter can't fill outside the Chainlink bound. L3: the card plus conversion is the product. L11: the top-weight axis is "real reason for WIF" (burn per conversion) plus legibility for the vote. L12: "Regret Ledger" is not modal.
- pain quoted: "Robinhood Chain was built for tokenized stocks — but memecoins took over" (Chain DNA top frustration #1). Also memecoin volume -96% and "scams/vanishing tokens".
- first voters / mobilization: CT degens love a self-roast card. The share card on X is the mobilization engine, aimed at the ~1.45K WIF voter wallets (pre-generate public cards for the top G.O.A.T. voters and tag them). Between rounds the counts of cards minted and dust converted to stock grow.

### 7. Rescue Raft — a coordinated, FCFS-fair exit from dying memes into stocks
- mechanism: When a RH memecoin's liquidity starts draining, FCFS sequencing turns the exit into a race the first seller wins. Rescue Raft replaces the race with a pooled, sliced exit that lands in stock tokens. (1) **Raft vault per token**: holders deposit the dying meme and receive pro-rata receipts. (2) **Sliced batch exit**: each block the vault sells a fixed slice into the remaining pools under a per-slice slippage cap, so all depositors get the same average price. Front-running depositors is impossible because exits happen only through the vault schedule. (3) **Stock landing**: proceeds go to USDG and then to a chosen stock token under Chainlink min-out, and each depositor claims stock pro-rata. (4) **WIF launch bond**: opening a raft requires a WIF bond (anti-grief). It is returned if the raft reaches a minimum deposit count, burned otherwise, and every raft fee is partly burned. (5) **Drain sentinel**: a public liquidity-drop detector lists raft candidates live.
- why-this-chain (U6 depth claim): FCFS sequencing with ~100ms blocks is exactly what makes the exit race on RH. The ~30 RH launchpads produce the dying tokens, and only RH lets the rescued value land in real equities (P1). WIF bonding is RH-only (P3).
- 3-min demo shape: a real near-dead RH meme (dust bought on mainnet). Three wallets board the raft, the slicer exits over about 20 blocks on a live chart, and each wallet claims identical-price TSLA fractions. Wow moment: a token heading to zero converted into a real stock with everyone treated equally.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, C-CS1, C-NA1
- primitive(s) adapted: F01's conversion leg applied to a new domain (exit coordination), plus F02's pooled vault, re-purposed from investing together to leaving together.
- law-check: L2: the raft opener's WIF bond is at risk, and per-depositor priority is unrepresentable because only the vault sells. L3: "the fair exit" is the whole product. L11: "real reason for WIF" (bond plus burn) is top-weight. L12: not modal. Distance check: this is not a stop-loss (Lastbell), since it is collective and triggered by deposit, not a per-user price trigger.
- pain quoted: "scams/vanishing tokens + memecoin volume -96% (no durable reason to stay)" (Chain DNA top frustration #2). Also the dextools warning on users who "can't do anything".
- first voters / mobilization: holders of RH dead memes (a large, angry, reachable group on launchpad X accounts). Between rounds the "value rescued into stock" and "rafts completed" counters grow. U7 risk: the demo needs a real dying token, so it must be scheduled on a live candidate, not a fabricated one.

### G2 return
# G2 — CAPABILITY generator return (RELAX native-problem)
Lens: every idea leans on primitives that co-exist ONLY on Robinhood Chain 4663 — ERC-8056 scheduled
multipliers (`newUIMultiplier`/`effectiveAt`/`UIMultiplierUpdated`), per-asset Chainlink stock feeds
(4 names 24/7) incl. historical `getRoundData`, the Mon 02:00–Sat 02:00 CET tokenization window +
per-asset `tradingCapabilities`, USDG, Uniswap v4 hooks on RH pools, 4337/7702 sponsored accounts,
and $WIF (burnable, RH-only). Safety rule applied everywhere: $WIF is never priced off v4 spot for
anything safety-critical — WIF amounts are either fixed counts, or bought with a USDG amount priced by
the Chainlink USDG/USD feed and executed with a capped size + minOut.
Spend fit: every demo runs on $1–5 positions of one or two stock tokens + <1K $WIF + <0.002 ETH gas.

---

### 1. Ex-Date Guard — the stock-pool hook that cannot be picked off
- mechanism: A Uniswap v4 hook for Stock-Token/USDG pools that fixes the two reasons RH stock AMM
  liquidity is thin: LPs get arbitraged (a) at corporate-action steps, when the Chainlink price jumps
  by the new multiplier but the pool price does not, and (b) across the weekend/overnight gap when
  RFQ/mint-burn is closed and the pool is the only stale venue. Load-bearing mechanisms:
  (1) ERC-8056 ex-date sentinel — `beforeSwap` reads `newUIMultiplier()`/`effectiveAt()`; inside a
  window around `effectiveAt` it reprices the band by the pending ratio and blocks swaps that would
  trade at the pre-action price (the revert is the demo climax);
  (2) Chainlink oracle band — swaps whose execution price leaves ±X% of `latestRoundData` (with
  staleness check) revert; on the 4 24/7-feed names the band stays tight all weekend, on the rest it
  widens and fee rises;
  (3) session-aware dynamic fee — fee tier is a pure function of (tokenization window open?, asset
  `tradingCapabilities` session flags relayed by a permissionless poster, feed staleness);
  (4) $WIF LP bond — LPs who lock a fixed WIF count in the hook earn a rebate of the hook fee; the
  non-rebated hook fee accrues in USDG and a permissionless `burnRound()` buys WIF on the v4 WIF pool
  (size-capped, minOut from USDG feed) and burns it;
  (5) ownerless + verified + Foundry fork tests replaying a real UIMultiplierUpdated.
- why-this-chain (U6 depth claim): ERC-8056 pending-multiplier views exist only on RH Stock Tokens;
  per-stock Chainlink feeds with a 24/7 subset and a defined tokenization window are RH-only; the
  hook only has meaning on RH v4 stock pools (hooks = 74.5% of RH v4 trades). Ported to any other
  chain, mechanisms 1–3 have no inputs.
- 3-min demo shape: Split screen: left an unguarded pool, right the Ex-Date Guard pool with the same
  $3 of liquidity. A countdown shows a real pending `effectiveAt` (or a fork replay of the last real
  multiplier step). Bot attempts the "stale-price" arb on both: left fills and the LP loses; right
  reverts with `ExDateBand()`. Then a weekend-mode swap on a non-24/7 name shows the fee step-up.
  Wow: the revert, then `burnRound()` burning WIF out of the fees, tx hashes on Blockscout.
- TASTE lines satisfied: U1, U2, U3, U5, U6, U7, C-DF1, W4, W5.
- primitive(s) adapted: F04 (aggregator-hook flywheel) re-aimed from "skim volume" to "make stock
  liquidity safe to provide"; F07 live-binding (balance+feed in one call) moved into `beforeSwap`.
- law-check: L2 LPs bond their own WIF and the cheat (trading at pre-action price) is unrepresentable
  — swap reverts; L3 the guard IS the product; L11 strongest axis = built-well/security (33%) and
  flywheel (33%), not the low-weight axis; L12 "Ex-Date Guard" — no rival would pick it (Sherwood is
  the only hook entrant).
- first voters / mobilization: RH stock LPs and Rialto/Uniswap RH LP community, the 4 judges who
  are infra/security; WIF holders see "every stock swap burns WIF". Between rounds: publish a live
  "arb attempts blocked / WIF burned" counter and add a second stock pool.

### 2. Dividend Furnace — real-stock dividends that burn $WIF
- mechanism: A WIF-holder vault that turns real corporate actions into WIF scarcity. Users lock $WIF
  (returnable) to earn shares of a vault that holds a small Stock-Token basket (seeded by the
  protocol fee and by users who deposit USDG). Load-bearing mechanisms:
  (1) ERC-8056 delta harvester — `harvest()` is permissionless; it compares stored vs current
  `uiMultiplier()` per constituent and computes the exact extra underlying shares created by a
  reinvested dividend (raw balance unchanged, so the delta is pure dividend);
  (2) Chainlink valuation — delta shares × feed price (feed already includes multiplier, so the
  harvester divides it back out — the subtle bit most apps get wrong) gives the USD dividend;
  (3) dividend skim — that USD slice of stock is sold to USDG (Rialto/v4, minOut from feed), then
  half buys + burns WIF on v4 (capped) and half streams to WIF lockers as USDG;
  (4) WIF time-lock weighting — locker share = WIF × lock-weeks; early exit forfeits accrued USDG to
  the burn round;
  (5) pending-dividend countdown — `newUIMultiplier`/`effectiveAt` drive a public "next furnace
  ignition" clock, the retention hook.
- why-this-chain (U6 depth claim): dividends are delivered as multiplier steps only on RH ERC-8056
  Stock Tokens; Chainlink feeds that embed the multiplier exist per asset only here; WIF only here.
  Elsewhere there is no onchain dividend event to harvest.
- 3-min demo shape: Lock 500 WIF from an embedded wallet (sponsored gas). Dashboard shows basket
  holdings in raw tokens vs underlying shares (`balanceOfUI`). Run `harvest()` against a constituent
  whose multiplier has stepped since deposit (or fork replay of the real step): judge sees "+0.0004
  AAPL shares = $0.09 dividend → 0.045 USDG to lockers, N WIF burned", every leg a mainnet tx. Wow:
  "Apple paid a dividend and WIF supply went down."
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, C-NA1, W1, M1, P2.
- primitive(s) adapted: F01 (meme→stock) inverted — stock income flows BACK into WIF; F07 live
  binding for the harvester; F02 basket holdings without the vote.
- law-check: L2 lockers forfeit to the burn on early exit, harvester math can't be fed a fake delta
  (it reads the token contract, no input); L3 "dividends burn WIF" is the whole pitch; L11 strongest
  axes = real reason for WIF + flywheel (67%); L12 no rival names.
- first voters / mobilization: existing WIF holders (~1.45K voter wallets) — it is yield for them;
  dividend-investor CT. Between rounds: show cumulative "WIF burned by dividends" and the next
  `effectiveAt` countdown hitting during round two.

### 3. Standing Order — a 7702 account that buys you one real share, one week at a time
- mechanism: A savings-goal product where the user's own EOA (via EIP-7702 delegation) carries an
  onchain standing order toward a goal denominated in underlying SHARES ("1.00 NVDA by March").
  Load-bearing mechanisms:
  (1) 7702 delegate with hard policy — weekly cap in USDG, ticker allow-list, expiry; anyone may
  trigger the weekly buy, nobody can exceed the cap (over-cap trigger visibly reverts);
  (2) share-denominated goal via ERC-8056 — progress = `balanceOfUI`, so dividends/splits advance the
  goal correctly;
  (3) session-aware execution — buy executes only when the asset's session is tradable and the
  Chainlink feed is fresh; 24/7 names buy on weekends, others queue to Monday 02:00 CET;
  (4) $WIF streak bond — user bonds a fixed WIF count; each kept week returns pro-rata, a missed week
  (insufficient USDG at trigger) burns a slice and routes a slice to streak-keepers' pool;
  (5) sponsored onboarding — Privy/ZeroDev embedded wallet + 4337 sponsorship so a zero-crypto user
  starts with an email.
- why-this-chain (U6 depth claim): share-denominated goals need ERC-8056 UI views; session gating
  needs RH's tokenization window + `tradingCapabilities` + 24/7 feed subset; 7702/4337 live on 4663
  with RH bundlers; WIF bond only here.
- 3-min demo shape: Email login → set "1 NVDA share" goal → bond 200 WIF → first $1 buy lands as
  0.005 NVDA (progress ring in shares). Judge presses "trigger again" → revert `WeeklyCapReached`.
  A second account with empty USDG gets triggered → streak broken → WIF burn tx. Wow: the revert and
  the burn, both from a user who never saw a seed phrase.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-CS1, C-DF1, W1, W2, W3, M4.
- primitive(s) adapted: F03 (streak bond) fused with F06 (capped delegation, revert as proof) and
  F08 onboarding; goal unit switched from dollars to ERC-8056 shares.
- law-check: L2 user's own WIF bond is at stake and over-cap spend is unrepresentable in the delegate;
  L3 the standing order IS the product; L11 strongest = real WIF reason + flywheel; L12 distinct from
  leash (not agent spend control — the policy guards the user's own savings habit; no agent).
- first voters / mobilization: non-US retail in eligible regions (Nigeria/LatAm/SEA CT) who want "one
  real share"; WIF holders as bond-posters. Between rounds: public streak leaderboard (weeks kept,
  WIF burned by breakers) grows visibly.

### 4. Should've Bought NVDA — an onchain-recomputed meme report card
- mechanism: Self-analytics on the user, not the market. Load-bearing mechanisms:
  (1) history ingest — the wallet's RH memecoin buys pulled via Quicknode/GetBlock RPC (Blockscout is
  CF-gated);
  (2) historical Chainlink replay — for each buy, the contract resolves the Chainlink round in effect
  at that tx's timestamp (`getRoundData` with a round-ID proof the caller supplies; contract checks
  `updatedAt` bracketing) and computes "that USDG into NVDA/TSLA/SPY would be worth X now";
  (3) onchain verifier — `publish(card)` recomputes every line from round IDs and the buy tx's logged
  amounts; a forged line reverts — so the shared card is a verifiable artifact, not a screenshot;
  (4) $WIF publish burn — publishing burns a fixed WIF count, and the card mints a soulbound record;
  (5) one-tap "convert the regret" — embedded-wallet flow swaps a chosen % of current memes into the
  counterfactual Stock Token with a Chainlink-bounded minOut; a fixed WIF fee burns per conversion.
- why-this-chain (U6 depth claim): the counterfactual needs per-stock Chainlink historical rounds on
  the same chain as the memecoin history (RH is where memecoins and tokenized equities coexist, P1);
  the conversion lands in a real Stock Token; WIF burn only here.
- 3-min demo shape: Paste a real RH wallet (Dami's or a volunteer's) → timeline of meme buys beside
  "same dollars in NVDA" line → card: "-62% in memes / +18% if NVDA". Judge edits one line to cheat →
  `publish` reverts `RoundMismatch`. Honest publish burns WIF; "convert 10%" leaves the wallet holding
  real NVDA. Wow: verifiable regret, then fixing it in one tap.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-CS1, C-DF1, M1, frustration #1 ("built for stocks,
  memecoins took over").
- primitive(s) adapted: F05 (self-analytics) + F07/L15 proof surface (recompute-not-display) pushed
  into a verifier contract; F01 conversion as the exit.
- law-check: L2 publisher burns own WIF and a fabricated card is unrepresentable (verifier reverts);
  L3 the card is the product; L11 strongest = spectacle/legibility feeding real-WIF-reason; weakest
  risk = flywheel depth, held by burn-per-publish + burn-per-convert; L12 low collision (no
  self-analytics entrant; avoid the word "Mirror" — Dami project collision).
- first voters / mobilization: every RH memecoin trader with a bag — share cards are the
  mobilization engine on CT; WIF holders burn to publish. Between rounds: leaderboard of "most regret
  converted to stock", count of cards published.

### 5. Attention Index — $WIF locks decide the weights of a real stock index
- mechanism: An open, in-kind index vault whose constituent weights are set by where the WIF
  community locks WIF — memecoin attention mechanically becomes real-asset allocation. Load-bearing
  mechanisms:
  (1) in-kind mint/redeem at Chainlink NAV — deposit any constituent Stock Token (or USDG), receive
  index shares at feed NAV; redeem in-kind pro-rata, so no thin-AMM dependency;
  (2) ERC-8056-correct NAV — feed prices (multiplier-inclusive) × raw balances; harvested multiplier
  deltas stay in the index (dividends reinvested);
  (3) session-aware mint gate — mints/redeems priced only on fresh feeds; on weekends only the 4 24/7
  names are mint-eligible (others queue), reverting stale-priced mints;
  (4) WIF weight locks — WIF locked per ticker (returnable after epoch) sets target weights; changing
  your lock mid-epoch burns a fixed fee; deposits that move the index TOWARD targets earn a WIF-funded
  rebate, deposits away pay a fee that buys+burns WIF;
  (5) public NAV attestation view (holdings × feed in one call, staleness-checked) for the whitehat.
- why-this-chain (U6 depth claim): per-stock Chainlink feeds + 24/7 subset + ERC-8056 + Stock Tokens
  as ERC-20 coexist only on RH; WIF only here. Without them there is no index to price or hold.
- 3-min demo shape: Map of tickers sized by WIF locked ("the WIF crowd wants 40% NVDA, 30% TSLA…").
  Lock 300 WIF on GOOGL → target weights shift live. Deposit $2 TSLA → mint index shares at NAV; a
  weekend mint of a non-24/7 name reverts `StaleSession`. Redeem in-kind → wallet gets slices of real
  stocks. Wow: meme attention literally owning stocks.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, W1, W5, M1, M3.
- primitive(s) adapted: F02 (group basket) opened from a club to an index; F07 attestation as a view;
  rebate/fee curve borrowed from rebalancing-incentive designs.
- law-check: L2 weight-setters lock own WIF and pay burn on churn, stale-priced mints unrepresentable;
  L3 attention→weights is the pitch; L11 strongest = real WIF reason; L12 "Attention Index" low
  collision (not a ballot: locks are returned and steer real holdings, no per-vote burn).
- first voters / mobilization: WIF holders (locks are free/returnable — zero-cost participation),
  ticker tribes (TSLA/NVDA CT). Between rounds: weights visibly shift as voters lock; index AUM chart.

### 6. Paid in Shares — USDG invoices that settle partly into US stock (non-US freelancers)
- mechanism: Real-world problem (RELAX): non-US freelancers/creators paid in stablecoins want US-equity
  exposure their local brokers can't give. An invoice contract settles client USDG and splits it per
  the payee's policy. Load-bearing mechanisms:
  (1) invoice escrow contract — client pays one USDG invoice; on settle, a payee-set % routes into a
  chosen Stock Token with Chainlink-bounded minOut, the rest to the payee in USDG;
  (2) jurisdiction + session gate — payee attests eligible-region at onboarding (rule 14 geofence in
  UI + onchain flag); the stock leg executes only in a tradable session, else stays USDG and is
  swept by anyone once the session opens;
  (3) ERC-8056 payslip — receipts show underlying shares received (`TransferWithScaledUI` uiValue),
  building a running "equity earned from work" ledger;
  (4) $WIF settlement fee — protocol fee is a fixed USDG amount converted (capped, minOut via USDG
  feed) into WIF and burned; payees who lock WIF get the fee waived (the reason to hold WIF);
  (5) zero-crypto client path — client pays via sponsored 4337 embedded wallet link.
- why-this-chain (U6 depth claim): USDG native + Stock Tokens + per-stock feeds + session windows +
  ERC-8056 receipts coexist only on RH; WIF only here. On another chain there is no stock leg.
- 3-min demo shape: Dami issues a $3 invoice; a "client" pays from an email-login wallet; settle tx
  shows $2.10 USDG to payee, $0.90 → 0.005 NVDA, and a WIF burn from the fee. Payslip page shows
  "underlying shares earned this month". Wow: an invoice that pays you in a real stock.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, W1, W2, M1-adjacent, concern #5 (named humans).
- primitive(s) adapted: F01 (auto-sweep) moved from trade-triggered to income-triggered; F08 stack
  spectacle on the client side.
- law-check: L2 fee burn is the payer-side consequence; minOut bound makes sandwich-to-zero
  unrepresentable; L3 invoice→shares is the product; L11 risk = WIF role is a fee/waiver (weaker
  "real reason") — reshape lever: WIF lock tier; L12 distinct from tipping/gift cluster (invoices,
  not tips).
- first voters / mobilization: Nigerian/African freelancer + web3-dev circles Dami reaches, WIF
  holders who lock for fee waiver. Between rounds: count of real invoices settled, total shares paid.

### 7. Cap Table — a crew that owns real stocks together, decided by locked $WIF
- mechanism: Group-owned stock basket (M3) where every decision has a real-asset consequence.
  Load-bearing mechanisms:
  (1) crew vault — members deposit USDG/Stock Tokens; ownership recorded in a cap table at Chainlink
  NAV at deposit time (staleness-checked);
  (2) WIF-lock weighted proposals — proposals ("rotate 20% TSLA→NVDA") pass by locked-WIF weight with
  quorum + timelock; each proposal burns a fixed WIF fee; locks are returned (not a burn-to-vote
  ballot);
  (3) bounded execution — passed trades execute only within a Chainlink band and a tradable session;
  out-of-band or stale-session execution reverts;
  (4) ERC-8056 dividend accounting — multiplier deltas credited pro-rata on the cap table so every
  member sees dividends as shares;
  (5) ragequit in-kind — any member exits pro-rata in real Stock Tokens at any time, so the majority
  cannot trap a minority (the whitehat line);
  (6) invite onboarding — email-login embedded wallets with sponsored gas for non-crypto friends.
- why-this-chain (U6 depth claim): Stock Tokens + per-asset feeds + session windows + ERC-8056 +
  USDG + WIF only coexist on RH; ragequit in-kind is only meaningful with ERC-20 equities.
- 3-min demo shape: Create crew, invite 2 email friends, each deposits $1. Proposal "buy NVDA" passes
  on locked WIF, executes in band; a second proposal with a stale/out-of-band route reverts. One
  friend ragequits and walks away holding real NVDA + TSLA slices. Wow: ragequit-in-kind into real
  stock.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-CS1, C-DF1, W1, M3, W5.
- primitive(s) adapted: F02 (investment club) + F07 bounded-execution; Moloch-style ragequit remixed
  to in-kind Stock Tokens.
- law-check: L2 proposers burn own WIF, majority-theft unrepresentable via ragequit; L3 "own stocks
  together, leave with your shares" is the product; L11 strongest = real WIF reason + flywheel; L12
  medium collision risk ("club"/"syndicate" names) — keep "Cap Table", lead with basket not vote.
- first voters / mobilization: WIF Telegram/X sub-communities forming crews (each crew = 3–10 voters),
  hackathon builders forming a "builders crew". Between rounds: number of live crews and AUM; crew
  leaderboard by return.

### G3 return
# G3 — WHITESPACE / INVERSION return (WIF Warroom V1, 2026-11-10)
Toggle: RELAX native-problem. Every idea targets a named W#/M# or inverts a named entrant. All on mainnet 4663; $WIF load-bearing; spend sized to ~$18 (0.005 ETH + 5K WIF, tiny USDG/stock buys of $0.25–$1).
Self-dup screen: no session-key/agent spend-cap shapes (leash), no stock-trading agent (Binance bStocks in-flight), no attestation-dashboard shape (AlphaAttest/Veil).

### 1. Silt — the hook that turns meme volume into stock you own
- mechanism: A Uniswap v4 hook on a WIF/ETH (and WIF/USDG) pool skims a small slice of every swap's output and settles it as sediment: real Stock Token ownership for the trader, not a burn. (1) **afterSwap returnDelta skim** — hook takes 0.3–1% of the unspecified currency; recipient is read from `hookData` (our router/front end) so credit never relies on `tx.origin`; swaps arriving via aggregator routes without hookData credit a communal jar instead. (2) **Per-user jar ledger (ERC-4626-style shares)** pointing at a user-chosen Stock Token (NVDA/TSLA/GOOGL). (3) **Batch settle with Chainlink bound** — a permissionless `settle()` converts pooled skim to USDG and then to the Stock Token; the stock leg reverts if fill < Chainlink `latestRoundData` × (1 − 1%) with a staleness check. The WIF leg has no feed, so the batch is capped per block and uses a caller-supplied minOut, and the contract never values WIF at spot. (4) **WIF burn on every settle** — a fixed fraction of each batch's WIF skim is burned before conversion, so the burn is volume-proportional and needs no WIF price. (5) **ERC-8056 multiplier-aware accounting**, so a jar's NVDA share includes the dividend/split multiplier. (6) **Live reserve check** — `jarReserves()` returns balanceOf × Chainlink price ≥ sum of claims in one call, guest-callable.
- why-this-chain (U6 depth claim): It needs v4 hooks (74.5% of RH v4 trades), Stock Token ERC-20s, ERC-8056 multipliers, 24/7 Chainlink equity feeds, USDG and $WIF on one ledger. Only RH Chain mainnet has all six. Elsewhere there is no stock destination, so the product does not exist.
- 3-min demo shape: The judge swaps 50 WIF on the Silt pool from a phone. The tx ticker shows the swap, the skim to their jar, and the burn line on Blockscout. Anyone presses `settle()`: the jar fills with 0.0004 NVDA, and a live Chainlink-priced balance shows "$0.31 of NVDA, from memes." **Wow moment:** a deliberately bad settle (minOut below the Chainlink band) reverts on screen.
- TASTE lines satisfied: U1 (real swaps, real stock), U2 (one swap → stock appears), U3, U6, U7 (state comes from actual swaps), C-DF1, W5-legible for Ogle (ownerless, oracle-bounded, verified).
- primitive(s) adapted: F04 (aggregator-hook router), with the destination flipped from burn to per-user ownership and the trigger moved into afterSwap. F01 round-up habit, made automatic instead of opt-in. F07 live reserve check folded in as a view function, not a dashboard.
- law-check: L2 the cheat (settling below the oracle band / draining the jar) is made unrepresentable by the Chainlink-bounded revert, and the ownerless hook has no admin skim path · L3 one primitive = the hook IS the product ("every swap leaves sediment") · L11 strongest axis = "real reason to use $WIF" + flywheel (top two weights) · L12 "Silt" unlikely to collide; the generic "WIF hook" name would, so the name stays specific.
- whitespace targeted / project inverted: W4 + M1. **Inverts Sherwood** (the only v4 hook entrant), whose hook burns for a game. Silt turns the same volume into the trader's own real-asset position. No entrant routes hook value into stock ownership; Underfoot puts stock *under* WIF, while Silt puts WIF flow *into* stock for the user.
- first voters / mobilization: The ~1.45K active WIF voter wallets are already traders. Pitch: "trade WIF like you already do and stack NVDA by accident." Share card: "My memes bought $X of NVDA." Seed with WIF TG/Discord degens. The leaderboard of jar sizes is the CT hook.

### 2. Potluck — group-owned stock baskets, decided with locked $WIF
- mechanism: A friend group, Discord or creator community spins up a club vault that holds real Stock Tokens. (1) **Club vault factory** (minimal-proxy clones, ownerless): members deposit USDG and receive club shares; NAV comes from Chainlink feeds per holding and never from spot. (2) **Lock-to-weight**: members lock WIF (returned on unlock after a cooldown) to set proposal weight. Locked capital is at risk, not consumed, which is what separates this from a burn ballot. (3) **Burn-per-proposal**: every rebalance proposal ("rotate 20% TSLA → NVDA") burns a fixed WIF fee, which kills proposal spam and is the flywheel sink. (4) **Timelocked, Chainlink-bounded execution**: a passed proposal executes after a timelock, and the trade reverts outside the oracle band. A member who disagrees can rage-quit pro-rata in kind (receive the actual stock tokens) before execution. (5) **Embedded-wallet invite links** (Privy + sponsored 4337 gas), so zero-crypto friends join a club by email. (6) **ERC-8056-aware NAV**, so dividends compound into the basket.
- why-this-chain (U6 depth claim): A club needs a real-asset basket, 24/7 equity feeds for NAV, a native stable for deposits and a community token for governance weight, on one chain. Tokenized stocks with Chainlink 24/7 feeds plus $WIF exist only on 4663. On another chain it collapses into a crypto-only DAO treasury.
- 3-min demo shape: The judge opens an invite link, logs in with email and deposits $1 USDG into "WIF Degens Club". Another member proposes "add 10% GOOGL" and burns 10 WIF. The judge locks WIF and votes. After a short demo timelock it executes, the basket pie chart updates from Chainlink, and GOOGL appears in the vault on Blockscout. **Wow moment:** the dissenting member rage-quits mid-timelock and walks away holding actual NVDA/TSLA tokens, not a claim.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, C-CS1 (invite → owning a basket with no docs).
- primitive(s) adapted: F02 (investment club), remixed with rage-quit-in-kind (a Moloch exit), so stake is consequence rather than ballot. F08 embedded-wallet entry restricted to the invite path only.
- law-check: L2 members risk their own locked WIF and capital, and a majority cannot steal from dissenters because the in-kind rage-quit is structurally guaranteed before any execution · L3 the "club owns real stock" vault is the product · L11 strongest axis = real reason for $WIF (weight + proposal sink) at the 34% weight · L12 "WIF Club" would collide, "Potluck" does not.
- whitespace targeted / project inverted: M3 + W1. **Inverts Flat Ballot / eri / flatboard** (burn-to-vote): there the WIF is destroyed to express an opinion that moves nothing, while in Potluck it is locked to steer real assets and comes back. No entrant offers collective ownership.
- first voters / mobilization: Each club is a mobilization unit, since every club creator recruits members, and members are WIF voters by construction. Seed 3 clubs (WIF core community, an RH builder group, a CT group chat) before Nov 14.

### 3. Ironweek — streak-bonded stock savings + a retention oracle other builders consume
- mechanism: (1) **Commitment vault**: a user commits to a weekly Stock Token deposit (≥ $1 USDG-equivalent, Chainlink-valued) for N weeks and bonds WIF. (2) **Deterministic streak check**: the contract verifies each week's deposit onchain (an epoch counter), with no oracle and no randomness, so prevrandao does not matter. (3) **Forfeit redistribution**: a broken streak forfeits the bond, 50% is burned and 50% goes to the cohort still on streak. Keepers earn from others' lapses, so a streak run by a non-speculative motive still pays. (4) **Hold-streak variant**: "don't sell your NVDA for 8 weeks". Early withdrawal is allowed but forfeits the bond (the inverse of a stop-loss). (5) **Retention oracle**: `streakOf(address)` / `isCommitted(address,minWeeks)` is a public view that other RH entrants can gate perks on. We ship one live consumer (a perk contract: committed users get a fee discount in Silt or Potluck, or a badge mint), which satisfies C-IN1. (6) **Embedded wallet + sponsored gas**, so the weekly deposit is one tap with no ETH.
- why-this-chain (U6 depth claim): The committed asset is a tokenized US equity valued by a 24/7 Chainlink feed, the deposit rail is USDG, and the bond is $WIF. All three are RH-native. Without stock tokens it is just a crypto streak toy, and the "save in real stocks" job disappears.
- 3-min demo shape: The judge commits to "$1/week into TSLA, 4 weeks" and bonds 100 WIF in one flow. The cohort board shows real wallets on streak. A pre-existing participant lapses (real, earned, from the week before), their bond splits into a burn tx and payouts, and live wallets' balances tick up. **Wow moment:** a second contract the judge did not touch reads `isCommitted` and unlocks a perk instantly, showing retention as composable infra.
- TASTE lines satisfied: U1, U2, U3, U6, U7 (streak history earned over the Nov 10–16 window, so start the cohort now), C-DF1, C-IN1 (live consumer).
- primitive(s) adapted: F03 (streak bond), with the subject extended from deposit streaks to *hold* streaks (inverting stops). Its M4 retention API is made real by a shipped consumer contract instead of an "SDK exists" claim.
- law-check: L2 the user bonds their own WIF, and faking a deposit is unrepresentable because the streak is a pure function of onchain deposit epochs · L3 "your streak is an onchain asset other apps trust" is the one-liner · L11 strongest = flywheel that holds up (non-speculative return reason) at the 33% weight · L12 "StreakVault" might collide, "Ironweek" does not.
- whitespace targeted / project inverted: W3 + M4. **Inverts Lastbell** (an automated exit from stock positions): Ironweek bonds you *not* to exit. It also answers SEMALAM's "0 players" by making retention the product. No entrant targets weekly return.
- first voters / mobilization: The cohort itself is the mobilization: each committed wallet is financially motivated to vote and to recruit, because forfeits flow to stayers. Offer other WIF entrants `isCommitted` gating, so their users become ours.

### 4. Vouch — WIF holders bond to onboard a zero-crypto friend into their first real share
- mechanism: (1) **Sponsor bond**: an existing WIF holder creates a Vouch by locking WIF plus a small USDG amount (e.g. $1). (2) **Claim-to-own**: the invitee opens the link, signs in by email (Privy embedded wallet, sponsored 4337 gas, zero ETH), and the USDG converts into a fractional Stock Token *they* own (Chainlink-bounded), plus a starter amount of WIF. (3) **Retention-conditioned bond**: if the newcomer is still active after 4 weeks (holds the share, makes ≥1 deposit, or joins an Ironweek/Potluck), the sponsor's WIF comes back with a bonus from a pool of failed vouches. If the newcomer bounces, part of the sponsor's WIF is burned, so sponsors are paid for real users, not sybil invites. (4) **Sybil friction**: one claim per embedded-wallet identity, claim windows, and a per-sponsor cap with bond escalation. (5) **Sponsor leaderboard**: a public onchain record of retained vouches, a reputation that costs capital to fake.
- why-this-chain (U6 depth claim): The payload is a real US-equity token on a chain with native AA and embedded-wallet support, and the bond is $WIF. The "first thing a normie owns is a share, not a memecoin" story is only possible where stock tokens and WIF share a ledger.
- 3-min demo shape: The presenter's wallet creates a Vouch on screen (WIF locked, tx). The judge scans a QR on their phone, logs in by email, and 10 seconds later sees "You own 0.002 NVDA + 25 WIF" with no ETH and no seed phrase. Back on the sponsor view, the bond countdown shows. **Wow moment:** a past vouch that bounced shows its burn tx, and a retained one shows the sponsor's bond returned plus a bonus, proving the incentive is enforced.
- TASTE lines satisfied: U1, U2, U3, U6, U7, C-DF1, C-CS1 (first-session wow from nothing).
- primitive(s) adapted: F08 (zero-to-first-share stack), with the entry trigger kept as a friend link but the payload a stock share. Recombined with F03 bond mechanics so the *sponsor* holds the risk: the actor-risk is flipped onto the recruiter.
- law-check: L2 the sponsor eats the burn if their recruit is fake or churns, and a self-vouch for bonus is blocked by the identity-bound single claim plus escalating bonds · L3 "you only get your WIF back if your friend stays" is the product · L11 strongest = real reason for $WIF (recruiter bond) + flywheel (new holders) at the top weights · L12 "WIF Gift" names collide, "Vouch" is distinct.
- whitespace targeted / project inverted: W2. **Inverts WIF Paymaster** (solves gas only) and **WIF Gift / Flat Relay** (send-and-forget links with no consequence). Vouch's payload is ownership and its economics are retention, not a transfer. Distinct from Pave, which is social *credit* for borrowing. Vouch is an onboarding bond tied to the newcomer's retention.
- first voters / mobilization: Every Vouch produces a new wallet that holds WIF, and that newcomer can vote with it (1 WIF = 1 vote), so the product literally manufactures voters. Seed: 20 vouches from WIF-community members to their non-crypto friends.

### 5. Rearview — an onchain, recomputable "your memes vs. the market" verdict, then convert
- mechanism: (1) **Onchain counterfactual engine**: for a wallet's RH memecoin buys (indexed via Quicknode/GetBlock RPC, not CF-gated Blockscout), the contract recomputes "had this USDG gone into NVDA at that time" using Chainlink `getRoundData` for the historical round nearest each buy's timestamp. The result is a contract output, not a frontend number. (2) **Verdict SBT**: the wallet mints a non-transferable report card storing its inputs, and anyone can call `recompute(tokenId)` to verify it (the L15 proof surface). Minting costs a small WIF burn. (3) **One-tap conversion**: "move X% of your meme bags into your counterfactual", via swap → USDG → Stock Token with a Chainlink band, and a WIF burn per conversion. (4) **Rearview Pledge**: the user stakes WIF on a forward commitment ("hold this NVDA 30 days"). Breaking it burns part of the stake, which ties in Ironweek-style retention so it is more than a one-shot toy. (5) **Share card + OG render** for CT.
- why-this-chain (U6 depth claim): It needs Chainlink historical rounds for US equities 24/7 and onchain stock tokens to convert into, on the same chain where the user's memecoin history lives. The RH-specific frustration "built for stocks, memecoins took over" is the literal subject.
- 3-min demo shape: The judge pastes their wallet (or uses a famous public degen wallet). In about 5 seconds: "Your 41 meme buys: −62%. Same USDG in NVDA: +18%." The card mints with a WIF burn tx. **Wow moment:** the judge hits `recompute` on someone else's card and the contract returns the identical number from Chainlink rounds, so the claim cannot be faked. Then one tap converts 10% of bags into NVDA.
- TASTE lines satisfied: U1, U2 (instant, personal), U3, U6, U7, C-CS1, C-NA1 (no AI).
- primitive(s) adapted: F05 (self-analytics), with the computation pushed onchain so the verdict is recomputable rather than displayed (the F07 live-binding idea applied to a historical claim). An F03 pledge is added for retention.
- law-check: L2 a pledger stakes their own WIF, and a forged verdict is unrepresentable because the SBT stores the inputs and `recompute` reads the immutable Chainlink rounds · L3 the "provable counterfactual" is the product · L11 strongest = spectacle/legibility, which feeds "works & built well" (33%) and the community vote; the flywheel (conversion + pledge burns) carries the other two, so the risk is flagged and mitigated by the pledge · L12 "Meme Report Card" names could collide, "Rearview" is distinct.
- whitespace targeted / project inverted: M1. **Inverts the prediction-pool cluster** (Fallpit, wifpool, kerdo, Flat Street): those bet *forward* on price. Rearview proves *backward* what your choices cost you and converts the regret into ownership. No entrant analyzes the holder's own history.
- first voters / mobilization: The viral loop is the share card ("my memes vs NVDA"), and degens love public self-roasts. Each card mint and conversion happens in a WIF wallet that can vote. Quote-tweet campaigns go after RH CT personalities' public wallets.

### 6. Flat Index — a community-curated stock-token index whose curators put WIF at risk
- mechanism: (1) **ERC-4626 index vault** holding a basket of Stock Tokens. Mint/redeem is in USDG or in kind, and NAV is pure Chainlink (multi-feed, staleness and deviation checks). (2) **Curator staking**: curators lock WIF behind a proposed constituent weight vector. The live index weights are the stake-weighted median, which is manipulation-resistant against a single whale. (3) **Performance-slashed curation**: each epoch, curators whose vector underperformed the realized index (computed onchain from Chainlink rounds) lose a slice of stake. Half is burned and half goes to outperforming curators, so curation is skin-in-the-game, not a poll. (4) **Mint fee in WIF burned** (fixed, small, denominated in WIF units, so no WIF pricing). (5) **Rebalance with an in-kind path**: because stock AMM liquidity is thin, rebalances happen at mint/redeem time (contributors bring the under-weight token, an "arbitrage-mint"), and no forced AMM dump is needed. (6) **Reserve view**: `nav()` and `reserves()` are guest-verifiable.
- why-this-chain (U6 depth claim): A basket of tokenized US equities with 24/7 Chainlink NAV and a native stable exists only on 4663. It also routes around the chain's honest constraint (thin stock AMMs) with in-kind rebalancing designed for this chain's liquidity reality.
- 3-min demo shape: The judge mints $1 of FLAT10 with USDG and sees exactly which stock tokens back it. Two curator vectors are shown, and the epoch closes: the losing curator's slash tx shows half burned and half paid to the winner. **Wow moment:** the judge calls `nav()` and gets the same number the UI shows, then attempts a mint during a stale-feed condition (demo via a short staleness threshold) and watches it revert.
- TASTE lines satisfied: U1, U3, U6, U7, C-DF1, W5 security-legible.
- primitive(s) adapted: F02's basket, made public and permissionless rather than club-private. F07 reserve live-binding. A new curator-slashing remix ("stake-weighted median + performance slash") so the WIF role is the judgement layer.
- law-check: L2 curators risk their own WIF, losing calls are slashed, and a whale cannot set weights alone because of the median · L3 "the index whose curators can lose" is the product · L11 strongest = reason for $WIF + "built well" · L12 "WIF Index" could collide (none on roster); rename candidate "Flat Index".
- whitespace targeted / project inverted: W1 + W5. **Inverts Underfoot** (stock tokens as a floor under WIF price, i.e. stocks serving the meme): in Flat Index, WIF holders' judgement serves a real-asset product. Also inverts fantasy leagues (WIF League, Stock Fair): the same "pick stocks" instinct, but the picks run real money and the score is real NAV.
- first voters / mobilization: The fantasy-league crowd (5+ entrants' audiences) is the natural curator base, and curator rank is the bragging loop. Curators are WIF holders, so they are voters. Flat Index pairs naturally with Potluck (clubs can hold FLAT10).

### 7. Ballast — the Silt + Ironweek + Vouch stack as one RH "meme-to-ownership" loop (extensive build option)
- mechanism: This is the extensive composition the builder directive asks for, as one product with one spine ("meme flow becomes ownership that stays"), not nine features. (1) **Silt hook** captures value from WIF volume into user jars (idea 1). (2) **Ironweek bond** turns jars into committed weekly holdings with forfeit/burn (idea 3). (3) **Vouch** onboarding brings zero-crypto users whose first share lands in a jar (idea 4). (4) **Shared retention oracle** across all three: a committed status cuts the Silt skim fee and raises the Vouch sponsor bonus, so each mechanism's output is another's input. (5) **Single burn ledger**: every WIF sink (settle burn, forfeit burn, failed-vouch burn) routes to one ownerless BurnRouter with an onchain per-source tally, so the flywheel is auditable from one call.
- why-this-chain (U6 depth claim): It combines all three RH-only primitives (stock tokens + 24/7 Chainlink + v4 hooks) with AA onboarding and $WIF. Porting means rebuilding every layer.
- 3-min demo shape: Phone 1 is a newcomer claiming a Vouch, who lands with NVDA in a jar. Phone 2 is a degen swapping WIF, with the skim feeding their jar. Then commit to 4 weeks, see the fee drop live, and finish on the BurnRouter tally across all three sources. **Wow moment:** one `flywheel()` view showing WIF burned by source and stock accrued to users, all from real txs this week.
- TASTE lines satisfied: U1, U2 (two-phone story), U3, U6, U7, C-DF1, C-CS1.
- primitive(s) adapted: F04 + F03 + F08, joined through a shared retention oracle (the remix), with F07 reserve views.
- law-check: L2 each actor risks their own WIF (trader skim, committer bond, sponsor bond), and the oracle cannot be gamed because status is derived only from onchain deposit epochs · L3 RISK: breadth can bury the wedge (GhostFund/x9 loss), mitigated by naming the spine "Silt" with the other modules as its retention and inflow organs, and by cutting to idea 1 alone if the critique flags dilution · L11 strongest = flywheel (33%) + reason for WIF (34%) · L12 distinct.
- whitespace targeted / project inverted: W4 + W1 + W2 + W3 + M1 + M4 together. It inverts Sherwood (hook → ownership), Lastbell (exit → commitment) and WIF Paymaster (gas → first share) in one loop. No entrant composes ownership, retention and onboarding.
- first voters / mobilization: All three funnels at once: traders (Silt), committed cohort (Ironweek, financially motivated to vote), and newly onboarded wallets holding WIF (Vouch manufactures voters).

### G4 return
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

### G5 return
# G5 RETURN — CLEAN-ROOM (unprimed outsider)
Inputs read: base-stack.md, IDEA-LAWS.md, slice-G5-cleanroom.md, raw/docs/*.txt only. No competitor/strategy research.
Toggle: RELAX native-problem. All ideas: mainnet 4663, $WIF 0x5173…4773 load-bearing, stock-token legs geofenced (US/UK/CA/CH + RHJ list), no "Robinhood" in name/logo, spend ≈ $5–15 of real stock tokens/USDG/WIF.
Doc-native primitives used across the batch (from official docs, not precedent): ERC-8056 `uiMultiplier()` / `newUIMultiplier()` / `effectiveAt()` / `UIMultiplierUpdated` / `balanceOfUI`; token `oraclePaused()`; per-asset Chainlink stock feeds (24/5, multiplier-adjusted = total return); L2 Sequencer Uptime Feed; tokenization window (Mon 02:00 – Sat 02:00 CET); `/rhj/assets` tradingCapabilities + `/prices` isTradingHalt; FCFS sequencing (no priority auctions); ERC-4337 v0.7/0.8 + EIP-7702 + Alchemy/ZeroDev paymasters; Permit2 at 0x…22D473 (WIF has no permit); USDG; Uniswap v4 hooks; AMM/propAMM (Rialto) liquidity.
Lane tags per L4: CEILING = novel primitive finalist bid; FLOOR = load-bearing integration.

---

### 1. Equity Floor — a memecoin whose floor is made of stocks
- mechanism:
  1. **Burn-to-redeem reserve (oracle-free floor):** an ownerless `FloorReserve` holds stock tokens; anyone may burn X $WIF (via `burnFrom` after Permit2/approve) and receive X / totalSupply() of every reserve asset. No WIF price is ever read — the floor is denominated in shares (e.g. "1M WIF = 0.0004 NVDA"), killing the manipulable-spot-oracle problem by construction.
  2. **Fee-capture v4 hook:** a new WIF/USDG Uniswap v4 pool whose `afterSwap` hook skims a fixed bps of every swap into the reserve's USDG inbox — trading volume structurally grows the floor.
  3. **Session-gated allocator:** a permissionless `allocate()` converts USDG inbox into a fixed stock basket via AMM/propAMM, with min-out computed from the Chainlink stock feed and reverts when the feed is stale, `oraclePaused()` is true, the sequencer-uptime feed is down/in grace, or outside fresh-round windows.
  4. **Total-return compounding via ERC-8056:** reserve holds total-return tokens, so reinvested dividends raise `uiMultiplier` and the floor grows with zero action; dashboard shows backing per WIF in `balanceOfUI` share units + USD (Chainlink).
  5. **Arb-burn flywheel loop:** whenever WIF spot < floor, arbitrage = buy WIF on the pool (pays hook fee → floor up) and redeem (burns supply → floor/WIF up for everyone). A public "floor vs spot" gauge + one-click arb route.
- why-this-chain (U6 depth claim): the floor is only meaningful because the reserve asset is a 24/5-oracle-priced, self-custodied, dividend-compounding equity ERC-20 with an onchain pause flag — ERC-8056 + per-asset Chainlink + `oraclePaused` + USDG exist together only here. On another chain the reserve would be a stablecoin and the product collapses into a generic treasury.
- 3-min demo shape: judge swaps $1 USDG→WIF on the hook pool (sponsored gas, phone) → reserve inbox ticks up live → judge taps `allocate()` → real NVDA/SPY fraction lands in reserve (Blockscout) → "backing per 1M WIF" number rises → WOW: judge burns 100K WIF and receives a real fraction of NVDA in their wallet, priced by Chainlink, with the supply counter dropping. Climax refusal: allocator reverts on-camera when `oraclePaused`/stale-feed guard trips (or show the revert test on a forked call).
- TASTE lines satisfied: U1 (real stock tokens, real burns), U2 (burn→receive shares is one tap), U3 (memecoin with equity floor not seen), U6 (ERC-8056/feeds/pause flag load-bearing), U7 (state produced by real swaps), C-DF1, C-CS1, C-NA1 (no AI).
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ✓ redeemer can only take exact pro-rata (cheat "drain reserve"/"admin rug" unrepresentable: no owner, no withdraw fn, immutable basket); L3 ✓ the burn-to-redeem floor IS the product ("burn WIF, get stocks"); L11 ✓ strongest axis = flywheel (33%) + real reason to use WIF (34%) — top-weighted; L12 ✓ "Equity Floor" unlikely triplicated (risk: generic "backed memecoin" names). Lane: CEILING.
- first voters / mobilization: every one of the ~1.45K active WIF voter wallets is a direct beneficiary (their bag gains a share-denominated floor) — the pitch to voters is "vote for the thing that backs your WIF with stocks"; seed with WIF community TG + pool LPs.

### 2. Multiplier Mill — get your stock dividends paid in $WIF
- mechanism:
  1. **Share-constant skim vault:** users deposit a stock token; vault records each depositor's position in underlying-share terms. When `UIMultiplierUpdated` moves m0→m1, the vault skims raw tokens fraction (1 − m0/m1) so each depositor still holds exactly the same share count — the skim *is* the dividend, isolated onchain for the first time.
  2. **Scheduled-action keeper path:** reads `newUIMultiplier()`/`effectiveAt()` to pre-announce the next harvest; `harvest()` is permissionless after `effectiveAt`, blocked while `oraclePaused()` is true (corporate-action window) and until the feed's post-action round is fresh; corp-action type reconciled against `/rhj/corporate-actions` for the UI.
  3. **Dividend→WIF route:** skimmed stock → USDG (AMM/propAMM, Chainlink-derived min-out) → ETH → WIF (v4 pool), with per-hop slippage caps; executed in one batched call.
  4. **WIF distribution + burn split:** harvested WIF is streamed pro-rata to depositors (pull-claims, Merkle-free since accounting is onchain), with a fixed % burned — every dividend event is a WIF buy + burn.
  5. **Gasless onboarding:** 7702 delegation + paymaster so a WIF holder deposits stock tokens and claims WIF without holding ETH; Permit2 for one-signature flows.
- why-this-chain (U6 depth claim): the whole product is a reading of ERC-8056 — a multiplier-encoded reinvested dividend with pending-schedule and pause-flag views. Nowhere else does a corporate action surface as an onchain event you can split from principal. Port it and there is nothing to harvest.
- 3-min demo shape: judge sees their deposited fractional token with "shares: 0.0213, next multiplier 1.0042 effective in 2d 3h" (live `newUIMultiplier`) → a real past/landed multiplier update → tap Harvest → Blockscout shows skim → swap → WIF arriving + burn event. WOW: "your SPY dividend just bought and burned WIF." Refusal climax: Harvest reverts while `oraclePaused()`.
- TASTE lines satisfied: U1, U3, U6 (deepest ERC-8056 use possible), C-DF1, C-NA1, U5 (pure Solidity + viem). U7 RISK: demo needs a real multiplier change on an available token inside the window — must verify via `/corporate-actions` + `pendingMultiplier` before picking; fallback = depositing a token whose multiplier already landed and harvesting the accrued delta since a pre-deposit baseline is NOT valid (skim is only from post-deposit growth) → if no update lands Nov 10–16, demote.
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ~ depositor capital at risk only to swap slippage; cheat "vault skims more than the dividend" unrepresentable (skim formula fixed to m0/m1, no admin param); L3 ✓ the skim is the product; L11 ✓ real reason to use WIF (dividends denominated in it) top-weighted, but flywheel strength is moderate (WIF buy pressure scales with deposits, which are tiny) — moderate risk; L12 ✓ "Multiplier Mill" distinctive. Lane: CEILING.
- first voters / mobilization: WIF holders who already hold stock tokens (overlap set) + dividend-ETF holders; message "make your SPY pay you in WIF"; WIF burn per harvest is a shareable onchain receipt.

### 3. Bellhook — WIF-quoted stock pools that know when the market is closed
- mechanism:
  1. **WIF as quote asset:** Uniswap v4 pools pairing stock tokens directly with $WIF (NVDA/WIF, SPY/WIF, TSLA/WIF) — every stock trade through them requires WIF; pool ratio × Chainlink stock price gives a novel stock-anchored WIF/USD readout (display only, never used for value).
  2. **Market-session dynamic fee (`beforeSwap`):** fee scales with Chainlink feed age vs heartbeat, outside the 24/5 feed schedule (weekends, except the four 24/7 tickers), and outside the tokenization window — LPs are paid for the gap risk retail ignores.
  3. **Corporate-action circuit breaker:** hook reads `oraclePaused()`, `newUIMultiplier()`/`effectiveAt()` and the sequencer-uptime feed; swaps revert in the pause window and within a guard band around `effectiveAt` — stops split/dividend stale-price arb against LPs.
  4. **Oracle-deviation guard:** swap reverts if the post-swap pool-implied stock price (in WIF × stock-anchored WIF index from the same pool's TWAP) deviates beyond a band from Chainlink — limits manipulation without trusting WIF spot for value.
  5. **Fee → burn + LP split:** the session surcharge portion is taken in WIF and burned; base fee to LPs. Volume of stock trading becomes WIF burn.
  6. **Sponsored-gas swap UI** with geofence + tradingCapabilities/isTradingHalt banner from `/rhj/assets` and `/prices`.
- why-this-chain (U6 depth claim): the hook's logic is the chain's calendar — tokenization window, 24/5 vs 24/7 feeds, onchain corporate-action pause flag, multiplier schedule. Those signals only exist on stock tokens issued here; elsewhere the hook has nothing to read.
- 3-min demo shape: judge swaps 50 WIF→NVDA during market hours (base fee) → same swap quoted on a ticker whose feed is stale/weekend: fee visibly higher → WOW/refusal: swap reverts with `CorporateActionPause` (live `oraclePaused` or around a scheduled `effectiveAt`) — then burn counter rises from surcharges.
- TASTE lines satisfied: U1, U2 (fee-vs-clock is visible), U6 (deepest hook-on-native-signal), C-DF1, C-NA1, U5 (v4 hooks in builder sheet).
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ~ protects LPs (Dami seeds own capital); cheat "trade a split at stale price" unrepresentable (hook reverts); L3 ✓ session-aware hook is the product; L11 ✓ works & built well + WIF necessity — though "flywheel" relies on stock-vs-WIF volume, which is thin → moderate; L12 ~ "hook" names collide easily — use "Bellhook". Lane: FLOOR→CEILING border.
- first voters / mobilization: WIF holders get a direct WIF→stock rail (frustration #1: memecoin users not reaching RWA); LPs in WIF pools; hooks/defi tag judges.

### 4. Closing Cross — a Chainlink-priced call auction for stock tokens
- mechanism:
  1. **Epoch intent book:** buyers commit USDG (or WIF, auto-routed) and sellers commit stock tokens for a ticker during an epoch; orders are blind to the clearing price.
  2. **Post-commit oracle clearing:** an epoch clears only at the first Chainlink round with `updatedAt > epochEnd` — no one can trade against a price they've already seen, so stale-feed latency arbitrage is structurally impossible; gated by sequencer-uptime, `oraclePaused`, staleness.
  3. **Pro-rata peer crossing:** matched volume crosses at the oracle price with zero slippage (fixes thin AMM liquidity for small retail); FCFS sequencing gives no ordering edge inside an epoch, documented as a property.
  4. **Residual router:** unmatched remainder routes to AMM/propAMM with Chainlink-derived min-out, or refunds.
  5. **WIF access tier:** crossing fee paid in WIF and burned; staking WIF lowers fee and raises per-epoch order cap — demand for WIF scales with crossed volume.
  6. **One-signature UX:** Permit2 + 7702 batched approve+commit, sponsored gas.
- why-this-chain (U6 depth claim): requires per-asset onchain equity prices with round timestamps, an onchain corporate-action pause, thin-AMM equities (the problem), and FCFS ordering (the fairness argument) — the full stack is Robinhood-Chain-specific.
- 3-min demo shape: two wallets (judge's phone + demo wallet) commit buy/sell NVDA in a 2-minute epoch → epoch closes → next Chainlink round lands → `clear()` → both fill at exactly the feed price (show Blockscout + feed round id) → residual hits AMM → WIF fee burn. WOW: "zero slippage on a token with $X liquidity." Refusal: `clear()` reverts when called with a pre-epoch round.
- TASTE lines satisfied: U1, U6, C-DF1, C-NA1, U3 (exchange closing-auction mechanic onchain for tokenized equities).
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ✓ cheat "trade on a known price" made unrepresentable (round-after-epoch rule in code); L3 ✓ the post-commit cross is the product; L11 RISK: strongest axis is "built well/security" (33%), WIF reason is a fee/stake tier — weaker on the 34% axis → reshape candidate unless WIF becomes the cross currency; L12 ✓. Lane: CEILING. U7 risk: two-sided demo flow is builder-sourced liquidity.
- first voters / mobilization: weaker — stock-token traders not WIF voters; mobilize via fee burn narrative only.

### 5. Shareholders League — fantasy stocks where you keep the stocks
- mechanism:
  1. **Real-position entry:** each player's entry buys a real stock-token portfolio (3 picks, ≥$1) into a per-player escrow inside the league vault — principal is never at risk to other players; returned (as stocks) at season end.
  2. **WIF stake pot:** each player also stakes a fixed WIF entry; winner takes most, a fixed % burned every season — the only thing you can lose is WIF.
  3. **Commit-reveal picks:** picks hashed then revealed before lock so FCFS arrival can't be used to copy leaders; reveal enforced onchain.
  4. **Oracle settlement on total return:** start/end snapshots from Chainlink (multiplier-adjusted = dividends included) with staleness, `oraclePaused`, sequencer guards; ranking computed onchain, ownerless; seasons aligned to the 24/5 feed calendar (or 24/7 tickers TSLA/NVDA/GOOGL/SNDK for weekend sprints).
  5. **Gasless onboarding:** 7702/4337 sponsored join, Permit2 for WIF; geofence on stock legs.
- why-this-chain (U6 depth claim): real-equity escrow + per-asset onchain total-return pricing + 24/7 feeds on four tickers make a no-principal-loss stock league possible; on other chains it would be synthetic prices and simulated portfolios.
- 3-min demo shape: judge joins a 1-hour sprint on their phone (sponsored gas), picks TSLA/NVDA/SNDK, sees the live leaderboard move with real feed rounds → season settles onchain → winner's WIF pot paid + burn event → WOW: everyone (losers included) receives their actual stock tokens back.
- TASTE lines satisfied: U1, U2, C-CS1 (first-session wow), C-DF1, U7 (real season), C-NA1.
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ✓ player risks own WIF; cheat "change picks after seeing prices" unrepresentable (commit-reveal + lock); L3 ✓ "keep-your-stocks league" is the product; L11 ✓ fun/works is strong, WIF reason (stake currency) mid; L12 RISK: games cluster among entrants is dense and "fantasy stocks/league" names collide → density penalty. Lane: FLOOR.
- first voters / mobilization: WIF community seasons (TG-run leagues), each player a likely voter; strongest consumer spectacle.

### 6. Stock Envelope — send a fraction of a real stock as a link
- mechanism:
  1. **Claim-by-link escrow:** sender locks a stock token (or basket) in an envelope keyed to an ephemeral signer; the link carries the key; recipient claims by signature to any address; expiry refunds sender.
  2. **Zero-ETH recipient:** claim creates a 4337 smart account (EntryPoint v0.7) with paymaster-sponsored gas — the recipient needs no ETH, no bridge, no pool hunting (frustration #3).
  3. **Living value:** envelope page shows the gift's growth since sending in USD (Chainlink) and shares (`balanceOfUI`, multiplier) — dividends accrue while unclaimed.
  4. **WIF postage + viral stamp:** each send burns a WIF postage stamp; part of postage funds a "reply stamp" pool so every claimer receives enough WIF to send their own envelope — referral loop paid in WIF.
  5. **Compliance & market gating:** geofence at claim UI, tradingCapabilities/isTradingHalt banners, Permit2 single-sig send.
- why-this-chain (U6 depth claim): gifts a self-custodied, total-return equity ERC-20 with live onchain pricing to someone with no gas — stock tokens + sponsored AA on 4663 are the whole product.
- 3-min demo shape: Dami sends $2 of NVDA as a link → judge opens on phone, claims with no ETH → token in judge's new smart account → judge receives a reply stamp and sends a $1 envelope onward → burn counter ticks.
- TASTE lines satisfied: U1, U2, C-CS1, C-DF1, C-NA1, U7.
- primitive(s) adapted: none — clean-room origin
- law-check: L2 ~ sender risks own gift only; cheat "double-claim / sender reclaim after claim" unrepresentable (single-use key, state machine); L3 ✓ link-gift is the product; L11 RISK: strongest axis is UX/onboarding, WIF postage can read as a forced fee (34% axis weak) → reshape needed unless stamp economics are genuinely viral; L12 RISK: "gift link / red packet" shapes are common. Lane: FLOOR. Check vs GhostPay (concerns #15) for payment-link overlap.
- first voters / mobilization: every claimer becomes a WIF holder + potential voter; diaspora/remittance gifting audiences outside restricted regions.

---
Batch note (outsider ranking by law fit): 1 > 3 > 2 > 5 > 4 > 6. Idea 1 is the only one where $WIF's role is unavoidable AND the flywheel is self-closing without any WIF price oracle; 2 and 3 are natural additional inflows into 1 (dividend skim and session surcharges can feed the Floor reserve) if forge wants a ≥4-layer single product rather than siblings.

## Synthesis + Pool Gates (decision artifacts)
- See gen/synthesis.md, gen/pool-gates.md, research/ideas.md. Presented: Keel 21, Rearview 21, Dividend Furnace 20, Crew 19, Ex-Date Guard 18. Kills: 12 (table in pool-gates.md). Main-context audit: kills upheld; dividend beat SOFT-FAIL (COST 11-13, AAPL 11-16 process dates; 0 pending pre-deadline).

## Round 0
# Round Scorecard — World is Flat (round_0)
| Rank | Idea | Weighted | Uniqueness (pool Novel /5) | A $WIF reason | B Flywheel | C Built well | TOKEN | LOOP | FORGE | WILD | Divergence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Keel | **5.93** | 4 | 7.00 | 6.00 | 4.75 | 6.3 | 6.3 | 5.3 | 5.7 | 1.0 |
| 2 | Crew | **5.75** | 4 | 6.25 | 6.50 | 4.50 | 6.0 | 6.7 | 4.7 | 5.7 | 2.0 |
| 3 | Dividend Furnace | **5.09** | 4 | 5.50 | 4.75 | 5.00 | 5.7 | 5.0 | 4.3 | 5.3 | 1.3 |
| 4 | Rearview | **4.83** | 4 | 4.00 | 4.00 | 6.50 | 4.0 | 4.7 | 4.3 | 6.3 | 2.3 ⚠HIGH |
| 5 | Ex-Date Guard | **4.65** | 5 | 3.25 | 3.50 | 7.25 | 4.7 | 4.7 | 4.7 | 4.7 | 0.0 |

Top picks: TOKEN→Keel · LOOP→Crew · FORGE→Keel (conditional) · WILD→Rearview (dissent).
Cross-cutting finding: every idea scores ≤4.75 on C (built well) except Rearview/Ex-Date Guard — the stock-token money path (thin AMM fills, new hook pool liquidity, WIF spot reads) is the shared risk → fact_check targets it.

### TOKEN — Silent Assessment
| Idea | A | B | C | Avg | Notes (2-3 sentences, evidence-cited) |
|---|---|---|---|---|---|
| Keel | 7 | 7 | 5 | 6.3 | Most demand sources of the set: WIF is the swap asset on the hook pool, plus a settle burn, a dividend-to-burn split, and a hold bond whose lower skim gives a real, non-speculative reason to lock. Delete test: if you swap WIF for USDG, layers 1 and 4 still work, so WIF is the venue rather than strictly required; the bond is what saves A. C is held back by five layers in about 30h, a new WIF/USDG hook pool with no existing volume, and a harvest beat that has to be a fork replay (no multiplier step before 11-12). |
| Crew | 7 | 7 | 4 | 6.0 | The vouch bond is the strongest single WIF sink in the pool. WIF is put at risk on a social obligation (invitee retention), and the forfeit is a burn backed by real behaviour. Weight = locked WIF × streak is somewhat arbitrary: why not club shares? C is the weakest: Privy + 4337 + timelock + ragequit + cap table solo, and a 4-week vouch can't resolve live in the demo. |
| Dividend Furnace | 6 | 6 | 5 | 5.7 | The yield source is genuine and non-speculative (ERC-8056 multiplier → buy-and-burn), but WIF is only a burn target plus passive lockers. That is the "burn X% and call it utility" pattern with a better inflow. Adjacent to Underfoot (stock-backed WIF). The hero beat can't be earned before submission (next dividends are COST 11-13 and AAPL 11-16). |
| Ex-Date Guard | 3 | 4 | 7 | 4.7 | Fails the delete test outright: the guard protects stock LPs identically with no WIF, and the WIF LP bond is bolted on. Stock LPs are not WIF holders, so no WIF demand is created. Best engineering and security fit for Ogle and Sahil, but it is a C-only idea under a 34% A weight. |
| Rearview | 3 | 3 | 6 | 4.0 | WIF is an entry fee per publish or convert, the textbook skin. The pool itself flags it as the "thinnest flywheel". getRoundData bracket verification is buildable and legible, but the product works identically with USDG fees, and the flow pushes value *out* of memes and into NVDA. |

**Rationale (TOKEN).** Top pick: **Keel**. I traced each WIF from acquisition to use to exit. Keel is the only idea where WIF is bought to trade (skim inflow), locked to save (bond → lower fee, the forfeit burned or paid to keepers) and burned from an exogenous, non-speculative source (equity yield). That gives three demand sources, two of which aren't hype. My condition: the hold bond must survive forge. Without it, Keel degrades to Acorns with a WIF pool, and the delete test fails. The dividend beat must be labelled as a fork replay, because there is no real multiplier step before 11-12.
Objections. **Crew:** the vouch bond is excellent economics, but locked-WIF voting weight is arbitrary next to share-weighted voting, and the build surface is the largest in the pool for one person in 30h. **Dividend Furnace:** WIF is purely the burn target, so holders are passive, and passive holders neither create demand nor vote. It is essentially Keel's layer 3 shipped alone. **Ex-Date Guard:** remove WIF and nothing breaks. It is a security product with a token sticker, and the LP audience doesn't hold WIF. **Rearview:** the burn-per-action fee is a skin. Its strongest beat (convert memes to NVDA) is an exit from the meme economy, not demand for WIF.

### LOOP — Silent Assessment
| Idea | A | B | C | Avg | Notes (2-3 sentences, evidence-cited) |
|---|---|---|---|---|---|
| Crew | 7 | 8 | 5 | 6.7 | The only idea with a human return trigger that needs no hype: group-chat obligation, a weekly deposit streak (F03), and a vouch bond that recruits a friend and only pays out if that friend stays 4 weeks. This hits gap-map W3 directly, where entrants admit 0 players (SEMALAM). WIF is steering plus vouch collateral, so it is load-bearing but reads partly as governance. Six mechanisms plus Privy/4337 in ~30h, geofenced invitees and thin stock AMM liquidity make C the real risk. Pave ("friends lock $WIF behind you") is MED adjacency. |
| Keel | 8 | 6 | 5 | 6.3 | "Trade WIF, end up owning NVDA" is the clearest retail-legible reason to touch $WIF (W1, the organizer's memes×RWA thesis). The loop breaks at 10 users: the hook needs a new WIF/USDG pool, but WIF liquidity sits in the ~$100K WIF/ETH pool and the budget is $18, and a skim fee pushes rational traders onto the unhooked pool. Aggregator flow lands in an anonymous communal jar, and the dividend beat is a labeled fork replay (no multiplier step before Nov 12). |
| Dividend Furnace | 6 | 4 | 5 | 5.0 | A real-world-cash-flow burn is a credible WIF demand story, but there is no user loop: about 1.45K holders benefit passively, and nobody has a Tuesday action. It is "burn = flywheel" with a nicer source. The headline harvest is a fork replay (COST Nov 13 / AAPL Nov 16, after the video), and the stock-floor framing sits next to Underfoot. |
| Rearview | 4 | 4 | 6 | 4.7 | It has the best shareability and day-1 mobilization (pre-generated cards for G.O.A.T. voter wallets), but it is one-shot novelty: you look at your regret once. WIF is a per-publish burn, the thinnest flywheel in the set, and the standing-rule poke is an afterthought rather than a habit. The verifiable historical-round check is a buildable, honest C. |
| Ex-Date Guard | 4 | 3 | 7 | 4.7 | The best engineering story for Ogle/infra judges (ERC-8056 + oraclePaused in beforeSwap is very native), but it has no retail human. Stock LPs on a $3 pool are not WIF voters, and the WIF bond is a garnish rebate. The demo is cerebral (L14), and it has nothing for the community vote. |

**Rationale (LOOP).** My top pick is **Crew**. It is the only idea where I can name the human and their Tuesday: Ade adds this week's $20 to the crew basket because his streak, his voting weight and his friend's vouch bond depend on it. The return reason is social obligation, not price, so the loop survives at 0 hype. The vouch mechanic is also the only built-in referral engine in the pool, and each crew arrives as a ready-made 3–10 wallet voting bloc for the community vote. My condition is to cut it to vault + vouch + streak-weight + ragequit and drop proposal-burn theatrics if C slips.
**Objections:** *Keel* has the best A, but it has no day-1 liquidity: a skim hook on an empty new pool loses to the existing WIF/ETH pool, so the "every trade" premise has no trades. It would rank first if it attached to existing flow. *Dividend Furnace* has passive beneficiaries and no action, and its hero beat is a replay. *Rearview* gets a share and a laugh, then the user never returns, and its WIF role is a toll. *Ex-Date Guard* is real infra with no user and no voter. It belongs to FORGE, not to the room's winner.

### FORGE — Silent Assessment
| Idea | A | B | C | Avg | Notes (2-3 sentences, evidence-cited, incl. the top exploit/failure per idea) |
|---|---|---|---|---|---|
| Keel | 6 | 5 | 5 | 5.3 | WIF is the trade that buys real stock, and the burn happens on each settle; the strongest causal A+B sentence in the pool. The top failure is that a hook only attaches to a NEW pool (it cannot attach to the existing ~$100K v4 WIF/ETH pool), so inflow is only Keel's own frontend on an ~$18-seeded WIF/USDG pool. A 50-WIF swap is about $0.07, and dust settles may find no Chainlink-banded fill on thin stock AMMs, while RFQ needs offchain signed quotes. Exploit: if the "fixed WIF burn" is bought on v4 spot, permissionless `settle()` can be sandwiched atomically, so the skim should be taken in WIF and burned raw with no spot read. `hookData` attribution is spoofable but harmless. |
| Crew | 5 | 5 | 4 | 4.7 | It has a real social retention motive, and the Moloch-style ragequit before execution is the best security pattern in the pool. The top exploit is that the vouch bonus is sybil-farmable: Privy email accounts cost nothing, so an inviter vouches for themselves and makes 4 dust weekly deposits to drain the bonus pool unless there is a minimum deposit. The 4-week resolution cannot happen honestly before Nov 16, so the "returned vouch" beat would be fabricated state. The scope (vault, NAV, timelock, band, 4337, governance, ragequit, dividends) does not fit ~30 solo hours, and email-onboarded invitees break the restricted-jurisdiction rule (rule 14) unless geofenced. |
| Ex-Date Guard | 3 | 3 | 8 | 4.7 | This is the most real security problem in the pool. Raw-denominated AMM pools go stale when the ERC-8056 multiplier steps (Chainlink already includes the multiplier), and Ogle and Sahil would recognise it instantly. The stale-arb revert can be earned honestly by pushing the pool off the Chainlink band, with no multiplier step needed. But WIF is bolted on (LP bond and `burnRound`), stock LPs are not WIF voters, the fees on a $3 pool are near zero, `burnRound` buys WIF on manipulable spot, and a staleness revert bricks non-24/7 names every weekend. |
| Rearview | 3 | 4 | 6 | 4.3 | The `getRoundData` bracketing check is real, but the meme buys themselves (amount and timestamp) are caller-asserted because contracts cannot read tx history. "Proven onchain" overclaims, and a whitehat would forge a flattering card in one line. Burn-per-publish is the thinnest WIF role, and the regret card is single-use. The convert leg is safe, since the user's own funds are Chainlink-bounded. |
| Dividend Furnace | 4 | 3 | 6 | 4.3 | The ownerless no-withdraw treasury is security-legible and the smallest build. "Without creating a new venue" is false (same new-pool problem as Keel). There is no multiplier step before Nov 12 (COST Nov 13, AAPL Nov 16), so the hero beat is a fork replay. Dividend yield of ~0.3%/qtr on an ~$18 basket burns dust. Permissionless `harvest()` buys WIF on spot and can be sandwiched; capped chunks bound the loss but don't remove it. |

**Rationale.** Top pick: **Keel**, conditionally. It is the only idea where using WIF causes a real-asset outcome and the burn is mechanically tied to that use, so it carries the panel's A and B weights. From my lens it is buildable if it is cut to layers 1-3 plus the `keel()` view. The conditions: skim in WIF and burn raw WIF so no WIF price is ever read; `settle()` takes a caller-supplied route with a contract-enforced Chainlink min-out and staleness check; geofence the frontend; label the dividend beat a fork replay; and verify a dust NVDA/USDG fill exists on mainnet before forge. If that fill doesn't exist, Keel drops below Ex-Date Guard. Objections to the others: **Crew** needs sybil-resistant vouches and a timeline it cannot honestly show before Nov 16, at roughly 2x Keel's scope. **Ex-Date Guard** is the best-engineered idea and has the weakest reason to use WIF, which is the RefiRail weight-inversion (strongest on the lowest-weighted axis). **Rearview** sells "proven onchain" while its key inputs are self-asserted, and Ogle will find that in minutes. **Dividend Furnace** is Keel's layer 3 alone, with no live harvest, dust yield and a passive mobilization base.

### WILD — Silent Assessment
| Idea | A | B | C | Avg | Notes (2-3 sentences, evidence-cited) |
|---|---|---|---|---|---|
| Dividend Furnace | 6 | 6 | 4 | 5.3 | "Dividends burn WIF" is a strong line, but Underfoot (37 commits, a Stock-Token floor under $WIF) already holds the "stock treasury behind WIF" story, so a judge reads it as a twin. The verified note says no multiplier step lands before Nov 12, so the hero `harvest()` beat is a fork replay. Holders benefit passively, and passive holders don't burn WIF to vote. |
| Keel | 7 | 6 | 4 | 5.7 | This will be the consensus favourite: it has the most layers and the deepest RH-native stack. It also has the most ways to break. It needs a new WIF/USDG v4 pool, but the real liquidity is about $100K in WIF/ETH, and a ~$18 budget can't seed a venue. Its dividend-burns-WIF climax has the same fork-replay problem, and five layers in ~30h runs against U2 and L3. `sparejar` already exists, so the round-up wedge isn't novel. |
| Ex-Date Guard | 3 | 4 | 7 | 4.7 | It's the best-engineered idea for Ogle and the security judges, and the side-by-side "arb fills here, reverts there" is crisp. But this is X13 (cerebral wedge): the "oh" only lands if the judge already knows ERC-8056 ex-date pickoff. $WIF is a bolt-on LP bond, and stock LPs aren't WIF voters, so it has no vote engine (X12). |
| Crew | 6 | 6 | 5 | 5.7 | A group chat owning NVDA is a CT-native image, and every crew is a ready-made voting bloc. That's the best mobilization mechanic in the pool. Pave ("friends lock $WIF behind you") already sits on the vouch wedge, and the 4-weekly-deposit vouch can't resolve before Nov 16, so the flywheel beat is unearned (U7). It's also a governance build (timelock, band, ragequit, AA email login) that costs a lot to ship clean. |
| Rearview | 6 | 5 | 8 | 6.3 | "Your memes vs NVDA, proven onchain" is the only hook here that explains itself in one line and turns into a screenshot CT will share. It's personal, a little humiliating, and taggable. It matches RH's own "built for stocks, memecoins took over" line and the organizer's memes × RWA thesis (Nov 8). Every beat is live today, with no dividend or venue dependency, and `recompute()` plus the `RoundMismatch` revert is a security-legible trick nobody in the 49 has. Its weakness is B: a per-card burn sits close to the "burn %" flywheel the gap map warns about, so the standing-rule `poke()` and the hold pledge have to be built, not cut. |

**Rationale.** Top pick: **Rearview.** In a field where the X ship-post lane is empty (about 0 organic entrant posts) and community votes count as a judge seat, the winner needs an artifact that travels. Pre-minted verdict cards tagged to the ~1.45K G.O.A.T. voter wallets give us a mobilization engine no stock entrant has. Nobody in the field can copy a Chainlink-historical-round counterfactual verifier by Nov 12. The prediction, fantasy and stop-loss stock entries all look forward. Rearview looks back and proves it. It's the only idea whose whole demo is EARNED (U7) today. Strongest objections to the others: **Keel** is the consensus pick, but it's a five-layer cathedral whose climax doesn't happen in the window and whose pool has no liquidity. That's the most fragile idea dressed as the strongest. **Dividend Furnace** collides with Underfoot and has the same fake harvest beat. **Crew** is the runner-up for mobilization, but its vouch loop resolves after judging and Pave shadows it. **Ex-Date Guard** is the best engineering aimed at the wrong game, because the judges need a primer and LPs don't vote. Condition on Rearview: B must ship the standing conversion rule (`poke()`) and the WIF hold pledge as load-bearing parts, or it reads as a burn-tax toy.
- Liquidity probe (pre-fact-check): stock tokens deep on Uniswap (NVDA/USDG $1.95M, SPY/USDG v4 $2.78M); WIF→ETH→stock route fillable; new hook pools start empty.

## Demo Scripts
# Demo Scripts — World is Flat (hollow-product detector)

**Constraints applied to every script:**
- The video is under 3:00, recorded before submission close (2026-11-12 17:30 UTC), and runs on Robinhood Chain mainnet 4663.
- The budget is about $18: 0.005 ETH plus ~5K $WIF (50 WIF is about $0.07). Gas is about $0.004/tx, so tx count is not the limit; liquidity is.
- **No ERC-8056 multiplier step happens before Nov 12.** COST processes its dividend on Nov 13 and AAPL on Nov 16, both during judging.
- **Shared design fixes from R0:**
  - FORGE: never read WIF spot. Burns are raw WIF taken from user input, and every stock leg carries a contract-enforced Chainlink min-out plus a staleness check.
  - LOOP/WILD: a hook pool is new and empty. Any "every trade" claim is honestly "every trade on *our* pool". Our pool is seeded by us with dollars, and the script must say so.
- **Gating unknown for four of the five scripts (all except Rearview's reveal):** does a dust (~$0.05–$1) USDG→NVDA/GOOGL/COST fill exist on mainnet inside a ±1% Chainlink band? If it doesn't, every "you now own stock" beat reverts or is fabricated. Verify this with one real tx before forge.
- **Historical-replay unknown:** has a `UIMultiplierUpdated` *ever* fired on 4663? If not, every "fork replay" below is really a `vm.mockCall`. That is fabricated state, and it is forbidden by U7 wherever it contradicts the core claim.

---

## DEMO SCRIPT — Keel (3:00)
*Design fixes baked in:* the hook skims the swap's **own USDG output** into the jar, so no price read is needed. The fixed burn is **raw WIF from the swap input**, burned with no spot read. `settle()` takes a caller route with a Chainlink min-out. The default jar asset is **COST**, so a real dividend lands in the jars during judging.

### Scene 1: [Screen: phone, Keel swap screen, WIF→USDG, "Jar: COST · 0.000 sh"] — 0:00-0:20
Judge sees: the title card "Every $WIF trade leaves you real stock". Beneath it, one line: "Our pool, our seed liquidity ($6) — real mainnet."
Judge does: watches a swap of 500 WIF typed in.
Proves: the product is a swap screen, not a dashboard.

### Scene 2: [Screen: swap confirmed → jar tile ticks "+$0.0071 USDG" · "🔥 5 WIF burned" · Blockscout tx in split view] — 0:20-0:55
Judge sees: the `afterSwap` event in Blockscout. The jar credit and the raw WIF `Transfer` to 0xdead happen in the same tx.
Proves: the skim and the burn are in the swap itself, not a separate admin step.

### Scene 3: [Screen: "Settle jar → COST" button → Blockscout shows COST token Transfer to user, 0.00000X sh] — 0:55-1:25
Judge sees: the settle tx, and the Chainlink COST price shown next to the realized fill price, with "band ±1% ✓".
Proves: WIF trading ended in a real Stock Token in the user's wallet. **(Hinges on the dust-fill check.)**

### Scene 4: [Screen: terminal/cast, settle with a route min-out 3% under Chainlink → revert `BelowBand()`] — 1:25-1:45
Judge sees: a sandwich-style bad fill rejected by the contract.
Proves: nobody, including the permissionless caller, can settle users into a bad price.

### Scene 5: [Screen: "Commit 2 weeks" → lock 1,000 WIF → swap again, skim shown dropping 0.50%→0.25%] — 1:45-2:15
Judge sees: the bond tx, then a second swap with a visibly lower skim.
Proves: there is a non-speculative reason to *hold* WIF. This is the TOKEN condition that saves the delete test.
Stretch: break the bond in a second wallet. The forfeit burns 50%, earned live.

### Scene 6: [Screen: `keel()` view — "Holdings × Chainlink $0.031 ≥ claims $0.031 · WIF burned: swap 15 · bond 250 · dividend: 0 — next: COST ex-div Nov 13, `harvest()` is permissionless"] — 2:15-2:45
Judge sees: the live solvency proof, with the dividend counter honestly at zero and a countdown.
Proves: the dividend leg is wired to a real, dated event, not a mock.

### Scene 7: [Screen: labeled "FORK REPLAY — historical multiplier step" (only if one exists on 4663) → `harvest()` burns WIF; closing card "Live on Nov 13: watch keel() tick"] — 2:45-3:00
Judge sees: the yield→burn math on real historical state, clearly labeled.
Proves: the second half of the tagline is the same code path that fires during judging.

**WOW lands here:** 0:55–1:25. A meme-token swap on a phone ends as a real COST share on Blockscout 20 seconds later. A judge retells it as "trade the memecoin, own Costco".

**Earned-state check (U7):**
| State | Earnable before Nov 12? |
|---|---|
| Seeded WIF/USDG hook pool + swaps | yes (our own $6, disclosed) |
| Jar credit + raw WIF burn per swap | yes |
| Settle → real COST/NVDA in wallet | yes **only if** a dust banded fill exists (unverified) |
| `BelowBand` revert | yes |
| Bond lock + skim drop; broken-bond forfeit burn | yes |
| Kept-bond payout to keepers | no (needs N weeks); omit |
| `keel()` solvency tally | yes (tiny numbers) |
| Dividend→burn | only via fork replay (if a historical step exists), else **only live Nov 13 (COST)** during judging |

**script_verdict: thin (strong-leaning).** Five of the seven beats are earned on mainnet today, and the WOW is real and retellable. Two things hold it back:
- The tagline's second clause, "every dividend burns WIF", is exactly the beat the video cannot show live.
- "Every $WIF trade" really means "every trade on a $6 pool we seeded".

It escapes hollow because the dividend beat is a **dated, permissionless, onchain event during judging**. A judge who opens `keel()` on Nov 13–16 sees a real COST dividend burn WIF without the submission being edited. To make that hold, default the jars to COST and run a keeper. If the dust-fill check fails, Scene 3 dies and the verdict drops to hollow.

---

## DEMO SCRIPT — Crew (3:00)
*As pitched:* email invite → club shares → propose +10% GOOGL → vote → execute in band → hostile proposal reverts → ragequit → vouch returned/bounced.

### Scene 1: [Screen: phone, invite link opens → "Ade invited you to The Lagos Crew · 3 members · $4.10 in NVDA/TSLA/GOOGL"] — 0:00-0:20
Judge sees: the crew card, and an email login (Privy).
Proves: zero-crypto onboarding. **(Requires Privy and a 4337 paymaster on chain 4663; unverified. Needs a geofence for rule 14.)**

### Scene 2: [Screen: logged in → "$1 deposit → 0.24 crew shares", cap table updates] — 0:20-0:50
Judge sees: a sponsored-gas deposit and the share mint on Blockscout.
Proves: the invitee owns real stock via the crew.

### Scene 3: [Screen: member proposes "+10% GOOGL" → "🔥 10 WIF burned" → 3 votes → timelock 60s → execute, GOOGL fill in band] — 0:50-1:40
Judge sees: the proposal, the vote and the execute tx.
Honest note: the "3 members voting" are **the builder's three wallets**. The timelock is set to 60s for the demo.
Proves: the governance plumbing works. It does **not** prove a group chat.

### Scene 4: [Screen: hostile "100% → junk token" proposal → revert `NotAllowlisted()`] — 1:40-1:55
Proves: a majority can't steer the vault into junk.

### Scene 5: [Screen: dissenter ragequits → wallet shows 0.000X NVDA + 0.000X TSLA] — 1:55-2:20
Proves: Moloch-style exit with the actual stock tokens. This is the best security beat in the script.

### Scene 6: [Screen: "Vouches: Tolu — bond returned +12% · Kemi — bounced, 40 WIF burned"] — 2:20-2:45
Judge sees: the retention flywheel resolved.
Honest note: **this needs 4 weekly deposits, so it cannot exist before Dec 3.** Showing it means shrinking "weekly" to "every 30s" or seeding the state. Either one fabricates the retention claim itself.

### Scene 7: [Screen: "Dividends: credited pro-rata" → 0] — 2:45-3:00
There is no multiplier step before Nov 12, so this shows nothing.

**WOW lands here:** intended at 0:00–0:50, where an email login means you co-own NVDA with your friends. It is undercut on rewatch, because the "crew" is one person with three wallets.

**Earned-state check (U7):**
| State | Earnable before Nov 12? |
|---|---|
| Privy email + 4337 sponsored deposit on 4663 | unknown (infra availability); yes if supported |
| Crew of real distinct humans | only if real people are recruited (not in the script) |
| Proposal burn, vote, timelocked execute in band | yes (with a short demo timelock; dust-fill dependent) |
| Allow-list revert, ragequit with real stock | yes |
| Vouch **returned** | **no**: resolves ≥ Dec 3, not even during judging |
| Vouch **bounced** | no as specified (also time-based) |
| Streak-weighted voting | no (needs weeks of deposits) |
| Pro-rata dividend credit | only live Nov 13/16 if the crew holds COST/AAPL |

**script_verdict: hollow.** The idea's core claim is *social retention*: a vouch that pays only if your friend stays, and a streak that weights your voice. Every beat that proves that claim (vouch return, bounce, streak weight) is time-locked past judging. The beats that are earnable are generic vault governance run by one person's wallets. A judge who watches Scenes 3 and 6 carefully sees either sybil theater or a 30-second "week". U7 forbids that, because it contradicts the core claim.

**Mutation (same mechanism, new demo shape): "a real crew, mid-flight".**
- Before Nov 12, recruit **three real people** (Dami's circle), each depositing ~$1 from their own wallet. The cap table then shows distinct, Blockscout-verifiable depositors.
- Redefine the bounce trigger as *"invitee ragequits or misses deposit #2"*. One cooperating invitee ragequits early, so the **bounce burn is earned live**.
- The returned-vouch beat becomes an honest onchain countdown: "Tolu's bond: 1/4 deposits · resolves Dec 3".
- Cut the Privy/4337 beat if the infra isn't on 4663. A wallet-based join is fine.
- Cut streak-weight from the demo.

**Re-verdict: thin.** It becomes honest, and ragequit plus the bounce burn are real. But the flywheel's *positive* resolution, the part that makes the friend stay, is still only a countdown, and the build surface is still the largest in the pool.

---

## DEMO SCRIPT — Dividend Furnace (3:00)
*As pitched:* swap → treasury tile ticks → NAV live → `harvest()` burns WIF → principal-withdraw attempt reverts.

### Scene 1: [Screen: reserve page — "Treasury: 0.004 COST · 0.0001 NVDA · NAV $3.91 (Chainlink, live)"] — 0:00-0:25
Judge sees: an ownerless treasury, with no-owner and no-withdraw shown on Blockscout's verified source.
Proves: real stock, recomputed live.

### Scene 2: [Screen: swap 500 WIF on the hook pool → treasury inflow "+$0.007 USDG"] — 0:25-0:55
Honest note: the pool is ours and seeded with ~$6. There is no organic flow.
Proves: the inflow mechanism works.

### Scene 3: [Screen: `harvest()` → revert `NoYield()` (live, Nov 11)] — 0:55-1:15
This is the honest live result: there is no multiplier step before Nov 12, so the hero action does nothing.

### Scene 4: [Screen: "FORK REPLAY" → historical step → `harvest()` sells yield in capped chunks → "🔥 0.6 WIF burned"] — 1:15-2:00
Earnable only if a historical `UIMultiplierUpdated` exists on 4663. Otherwise it is a mock.
Even when it is earned, the scale is the problem: ~0.3%/qtr on a $4 basket is **about $0.01 of WIF**.

### Scene 5: [Screen: attempt `withdraw()` → no such selector / revert] — 2:00-2:20
Proves: no rug path. The weakness is that "a function that doesn't exist" is a non-event on screen.

### Scene 6: [Screen: countdown "COST ex-div: Nov 13 · AAPL: Nov 16 — harvest is permissionless"] — 2:20-3:00
Judge sees: the promise of the beat, not the beat.

**WOW lands here:** nowhere live. The intended WOW ("Costco's dividend just burned $WIF") happens after the video is submitted.

**Earned-state check (U7):**
| State | Earnable before Nov 12? |
|---|---|
| Treasury holding stock tokens | yes (dust-fill dependent) |
| Live NAV × Chainlink | yes |
| Hook inflow | yes (our seeded pool) |
| `harvest()` yield → WIF burn | **only via fork replay** (if a historical step exists) **or live Nov 13 (COST)** |
| Lock-weighted share to WIF lockers | no meaningful state (no yield to share) |
| No-withdraw | yes (by absence) |

**script_verdict: hollow.** The entire pitch is the one sentence "real-company dividends burn $WIF", and that is the one thing the video cannot show happening. Everything earnable is a treasury tile, an inflow and a missing function. Even the replayed burn is about a cent, which visually refutes the "furnace" framing. Holders are passive, so there is no human action to film.

**Mutation (same mechanism, new demo shape): "Ignition — the demo is the Nov 13 event."**
- Load the treasury with **COST only**.
- The video's spine becomes the setup and the trap: live NAV, the inflow, the `NoYield` revert today, then the labeled fork replay of the math. It closes on a block-number countdown to COST's step.
- A permissionless keeper fires `harvest()` the moment the multiplier steps on Nov 13. The reserve page (and the README's live link) shows the **real burn tx** to every judge evaluating Nov 13–16, with no submission edit needed.
- Add a social hook: anyone who calls `harvest()` first gets a soulbound "lit the furnace" badge. That gives the 1.45K holders an action, and a reason to be watching on Nov 13.

**Re-verdict: thin.** The climax becomes a real event that judges can witness live onchain. It is still dust-scale, still unproven in the video itself, and still a twin of Underfoot. **Verify that the multiplier step actually lands onchain on the ex-date itself, not days later**, or the ignition fizzles in front of the judges.

---

## DEMO SCRIPT — Rearview (3:00)
*Design fix baked in (FORGE objection):* the contract **cannot read tx history**, so "proven onchain" is false as pitched. The honest split:
- The card stores each buy as a **tx hash plus its claimed (amount, timestamp)**.
- The contract enforces the **price side**: a Chainlink `getRoundData` round must bracket the timestamp, or the call reverts with `RoundMismatch`.
- The **input side** (tx hash → actual amount) is checked by an open `recompute` page that anyone can run from public RPC.

The headline becomes **"priced onchain, checkable by anyone"**. Cards can be published about **any** public wallet, as a roast card paid in WIF.

### Scene 1: [Screen: paste a public G.O.A.T. voter wallet → loading over GetBlock RPC] — 0:00-0:20
Judge sees: "41 meme buys found on Robinhood Chain."
Proves: real history from a real stranger's wallet, nothing seeded.

### Scene 2: [Screen: verdict reveal — "Your memes: −62% · same $ in NVDA: +18% · you'd have $1,240 more"; per-buy rows with Chainlink round IDs] — 0:20-0:55
Judge sees: each row's NVDA price, round ID and timestamp bracket.
Proves: the counterfactual uses real historical oracle rounds.

### Scene 3: [Screen: builder edits one row's timestamp to a cheaper NVDA moment → `publish` → revert `RoundMismatch()`] — 0:55-1:20
Proves: you can't cherry-pick the oracle price, because the contract rejects it.

### Scene 4: [Screen: edits a buy *amount* → publish succeeds onchain → `recompute` page flags the row red: "tx 0xab… shows 120 MEME, card claims 900"] — 1:20-1:45
Proves: the honest boundary. The contract guards prices, and anyone can catch forged inputs from the stored tx hash. This turns Ogle's objection into a beat.

### Scene 5: [Screen: honest publish → "🔥 20 WIF burned" → soulbound card minted → X share preview] — 1:45-2:10
Proves: a real burn and a shareable artifact. Pre-minted cards for top voter wallets show the mobilization angle.

### Scene 6: [Screen: "Convert 10% → NVDA" on the builder's own wallet → Chainlink-bounded leg → NVDA lands in wallet + fixed WIF burn] — 2:10-2:40
Proves: regret becomes a position. **(Dust-fill dependent.)**

### Scene 7: [Screen: "Standing rule: convert 25% of future meme gains" saved + WIF hold pledge locked; `poke()` today → `NoGain()` revert shown] — 2:40-3:00
Proves: the B-axis parts (the rule and the pledge) are built, not slideware. A `poke()` that triggers is only earnable if a meme gains, so the script shows the honest no-op.

**WOW lands here:** 0:20–0:55. A stranger's real wallet is judged against NVDA with oracle-round receipts. It's personal, funny and screenshot-native, and it needs zero explanation.

**Earned-state check (U7):**
| State | Earnable before Nov 12? |
|---|---|
| Wallet meme-buy history | yes (public chain data) |
| Chainlink historical rounds for NVDA covering buy dates | yes, **if** NVDA feed history on 4663 predates the buys (verify feed start date) |
| `RoundMismatch` revert | yes |
| Input-forgery caught by recompute page | yes (offchain check, labeled as such) |
| Publish + WIF burn + soulbound card | yes (builder pays WIF) |
| Convert → NVDA | yes **if** the dust banded fill exists |
| Standing rule + pledge saved | yes; `poke()` **firing** needs a real meme gain (uncertain) |

**script_verdict: strong.** It is the only script where every hero beat runs live on mainnet today, with no dividend dependency and no reliance on our own seeded pool. The WOW lands in the first minute, which fits "a judge has a few minutes".
- **Condition:** it must drop "proven onchain" for "priced onchain, checkable by anyone". As pitched, the verifiability claim is false, and a forged-amount card would make the demo hollow under U7.
- **Weakness:** the demo is strong but the product is a one-shot. A (the WIF role) is a per-card toll, and Scene 7 is the only flywheel evidence. This verdict covers the demo, not the A/B score.

---

## DEMO SCRIPT — Ex-Date Guard (3:00)
*Design fixes baked in:*
- Session-closed fee step-up uses **nightly market close**, not the weekend. Nov 14–15 is after submission.
- Fees are taken in USDG, and `burnRound()` buys WIF with a capped chunk and a caller min-out. With no WIF oracle, that is bounded but still spot-exposed.

### Scene 1: [Screen: primer card — "When a stock splits or pays a dividend onchain, AMM pools keep the old price. Arbs take LPs' money."] — 0:00-0:25
The 25-second primer is unavoidable (L14). The judge has to learn ERC-8056 before anything lands.

### Scene 2: [Screen: two pools side by side, NVDA/USDG, $1.50 each — "Unguarded" vs "Guarded"; Chainlink NVDA price centered] — 0:25-0:50
Judge sees: identical pools, both seeded by us.

### Scene 3: [Screen: builder pushes both pools 4% off Chainlink → arb bot swaps → left fills (Blockscout), right reverts `OracleBand()`] — 0:50-1:30
Proves: the band guard works on real mainnet pools. It is earned without any multiplier step.

### Scene 4: [Screen: fork, labeled — real historical `UIMultiplierUpdated` (if one exists) → pre-action-price swap reverts `ExDateBand()`] — 1:30-2:05
This is the namesake beat. It is only earnable via fork replay, or live on Nov 13 if a guarded COST pool is deployed.

### Scene 5: [Screen: recorded at 22:00 UTC — non-24/7 name, `tradingCapabilities` closed → fee 0.3%→1.0% shown on quote] — 2:05-2:30
Proves: session-aware pricing, earned on any weeknight.

### Scene 6: [Screen: LP bonds 500 WIF → rebate shown; `burnRound()` → "🔥 0.4 WIF burned"] — 2:30-3:00
Judge sees: the WIF beat. Fees on a $3 pool make it a fraction of a cent.
Proves: almost nothing. Delete WIF and Scenes 1–5 are unchanged.

**WOW lands here:** 0:50–1:30. The same arb fills on the left and reverts on the right. It's crisp for Ogle and the infra judges, and opaque to the community-vote seat without Scene 1.

**Earned-state check (U7):**
| State | Earnable before Nov 12? |
|---|---|
| Two seeded stock pools | yes ($3 total; dust-fill irrelevant, we provide liquidity, but we need ~$1.50 of NVDA via one real fill) |
| Oracle-band arb fill vs revert | yes |
| Ex-date sentinel revert | only via fork replay (if a historical step exists) **or live Nov 13 COST pool** |
| Session-closed fee step-up | yes (nightly close; weekend version only live Nov 14–15) |
| WIF LP bond + rebate | yes |
| `burnRound()` WIF burn | yes, but dust and spot-exposed |
| A live consumer of the infra (C-IN1) | **no**: only our own bot and our own LP |

**script_verdict: thin.** The engineering beats are fully earned and are the most security-legible in the pool. But the namesake ex-date beat is a replay, and C-IN1 fails because nobody but the builder uses the hook. The WIF beat is the hollow part of the product: it demonstrates nothing that the judges' highest-weighted axis (a real reason to use $wif) rewards. The demo proves a good hook. It doesn't prove a WIF project.

---

## Cross-script findings
1. **The dust banded stock fill is the single point of failure for Keel, Crew, Furnace and Rearview's convert beat.** Run one real USDG→COST and one USDG→NVDA ~$0.50 swap with a Chainlink min-out before forge. That one tx decides two verdicts.
2. **Find a historical `UIMultiplierUpdated` on 4663**, or every "fork replay" label is really a mock. If none exists, the dividend/ex-date beats can only be "live during judging Nov 13/16".
3. **The judging window is a demo asset.** COST on Nov 13 lets Keel, Furnace and Ex-Date Guard put real, unfakeable state in front of judges after submission, with no edit required, provided a permissionless keeper is running and the live page links it.
4. Ranking by demo honesty: **Rearview (strong) > Keel (thin, strong-leaning) > Ex-Date Guard (thin) > Furnace (hollow → thin via Ignition) > Crew (hollow → thin via real crew)**. By the time it reaches the screen, the scorecard's #2 (Crew) is the least earnable demo.

## Pool Checkpoint (Dami)
- Asked why scores low + merge in full → explained (harsh calibrated scale; C≈4.5 from empty-hook-pool/no-WIF-feed/solo-mainnet; thin WIF flow; dust dividends; Rearview A=4).
- Decision: Merge Rearview×Keel (→ Terra Firma) + Crew + Dividend Furnace to fact-check; Ex-Date Guard killed.
- Dami: 'we need to deliberate. lets fix all the intangibles and tangibles' → T1-T7 / I1-I7 fixes; D1 Router on existing pool, D2 sweep+burn+bond, D3 medium (friend jars), D4 'Terra Firma'. Spec: gen/terra-firma-spec.md

## Fact-check
# Fact-check: Terra Firma finalist (Robinhood Chain mainnet 4663) — run 2026-11-10
Reviewer: claude-sonnet-5-5. Read-only (cast call / eth_getLogs / curl). RPC https://rpc.mainnet.chain.robinhood.com, head block ~111,115,592.

## TF1 — Historical Chainlink rounds readable — VERIFIED
Feeds: NVDA/USD 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 (desc "RHNVDA / USD", 8dp), NVDA 24/7 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F, ETH/USD 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9.
`cast call <feed> getRoundData(uint80) <latest-k>` (single phase, roundId = 2^64 + n):
- NVDA/USD: latest round 18446744073709553327 (2026-11-10T18:33:06Z); k=500 -> 2026-10-13 ans 22409243119 ($224.09); k=1000 -> 2026-08-10; k=1710 (roundId 18446744073709551617 = round 1) -> OLDEST 2026-06-22T00:00:43Z; round 0 returns 0/0 and below reverts. Whole history (1711 rounds) reachable.
- ETH/USD: latest 18446744073709554873 (2026-11-10T18:33:02Z); k=100 -> 2026-11-05; k=500 -> 2026-10-16 ans 241156159723; k=3000 -> 2026-06-10T..(ts 1781119448); k=3500 reverts. Oldest reachable >= 2026-06-10.
- Heartbeat: consecutive rounds ~40 min apart (NVDA 17:53:35 -> 18:33:06; ETH 17:53:02 -> 18:33:02), i.e. ~36 rounds/day, 100 rounds ≈ 1.5 days. NVDA/USD (market-hours) and 24/7 feed both updating now.
- Caveats: early NVDA/USD rounds (<= ~Jun 22) carry 18-dp-scaled answers (e.g. 2083949999900000000) despite decimals()=8; Aug+ rounds are 8dp. Oct 2026+ is clean. Binary-search by updatedAt needed (no timestamp lookup).

## TF2 — WIF/ETH v4 pool tradable via custom router — VERIFIED (hooked pool)
Initialize log (eth_getLogs topics[sig 0xdd466e67..., id], block 0x1be4ee8 = 29,05x,xxx; tx 0x4e6a69906a77044d149298da72e6e850c8ef14a3abfe67dc17a84f581b99c3b2).
Pool key: currency0 = 0x0000000000000000000000000000000000000000 (native ETH), currency1 = 0x5173b8eA6923c2d40267890D45C46a3480954773 (WIF), fee 0, tickSpacing 200, hooks 0xe5e702641ea86f4ae6cc3cdaed2b886f976be044. `cast keccak(abi.encode(key))` = 0x71ef4106...8c79 (matches the pool id).
HOOK: nonzero. Code size 15,167 bytes. Permission bits in address (low 14 bits 0x2044): beforeInitialize, afterSwap, afterSwapReturnDelta (hook can skim swap output). Hook.poolManager() = 0x8366a39C...e40951 (reads back), hook.owner() = 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd. Not identified as a known public launchpad hook (no verified source seen; blockscout API 403 to curl) — treat as launchpad-style fee hook, owner-controlled.
Uniswap deployments (docs.uniswap.org Robinhood Chain 4663 table): V4Quoter 0x8dc178efb8111bb0973dd9d722ebeff267c98f94, StateView 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b, UniversalRouter 0x8876789976decbfcbbbe364623c63652db8c0904 (UR 2.1.2 0x204FAca1764B154221e35c0d20aBb3c525710498), PositionManager 0x58daec31...a04fa7, Permit2 0x000000000022D473030F116dDEE9F6B43aC78BA3. Code present on StateView and Quoter.
StateView.getSlot0(id): sqrtPriceX96 99352877002566182844560769406759, tick 142689, protocolFee 0, lpFee 0. getLiquidity = 29277002188455995403037 (2.93e22). Spot ≈ 1,572,540 WIF per ETH.
V4Quoter.quoteExactInputSingle (zeroForOne=true, hookData 0x) via eth_call:
- 0.01 ETH -> 15,561.48 WIF (gas est 79,675) vs spot 15,725 => -1.04% (hook fee + impact)
- 1 ETH -> 1,492,871.17 WIF => -5.07% vs spot (thin liquidity)
- reverse 15,000 WIF -> 0.009439 ETH (gas 68,059)
Workaround/notes: the router must send native ETH (currency0 = address(0)) and tolerate afterSwap delta; Universal Router V4_SWAP handles hooked pools. Size small.

## TF3 — Stock leg fills near oracle — VERIFIED (+0.16%)
NVDA/USDG v3 pair (dexscreener top USDG pair) 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3: token0 USDG, token1 NVDA, fee 500, factory 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA, liquidity 337267139278662492. QuoterV2 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 (docs.uniswap Robinhood v3 deployments).
- 1 USDG -> 0.005929919166697072 NVDA => 168.629 USDG/NVDA
- 10 USDG -> 0.059299070156973397 NVDA => 168.633
- 1000 USDG -> 5.928570709670336400 NVDA => 168.67
Oracle: NVDA/USD 16835700239 => $168.357 (ts 1794335586); NVDA 24/7 $168.360. Deviation (1 and 10 USDG): +0.16% (pays more than oracle; includes 0.05% fee); 1000 USDG: +0.19%. US market open at probe (Tue 13:33 ET). Off-hours the /USD feed may be stale; use 24/7 feed.

## TF4 — Embedded wallet + sponsored gas for 4663 — VERIFIED (alchemy demo-key probe inconclusive)
- viem: chain def exists but named `robinhood` (NOT robinhoodMainnet): raw.githubusercontent .../src/chains/definitions/robinhood.ts HTTP 200, id 4663, default rpc rpc.mainnet.chain.robinhood.com, multicall3 0xca11bde05977b3631167028862be2a173976ca11. (robinhoodMainnet.ts = HTTP 404.)
- Privy: docs.privy.io/wallets/gas-and-asset-management/gas/overview.md HTTP 200, lists "Robinhood Chain" in sponsored-gas mainnet list (and Robinhood Testnet); Privy recipe "Build a robo-advisor ... Robinhood chain" HTTP 200 shows eth_sendTransaction chain_id 4663 from a Privy wallet.
- ZeroDev: docs.zerodev.app/sdk/faqs/chains HTTP 200 Supported Networks table: "Robinhood 4663", "Robinhood Testnet 46630".
- Alchemy: POST robinhood-mainnet.g.alchemy.com/v2/demo eth_chainId -> HTTP 429 (host resolves, demo key rate-limited; needs real key; no sponsored-gas evidence from it).
- Caveat: Privy sponsorship needs dashboard setup/policy; not exercised (no tx sent).

## CR3 — Contracts can hold stock tokens — VERIFIED
`cast call NVDA balanceOf(0xd4EB...14a3)` = 10117088511976658032393 (10,117.09 NVDA) held by the v3 pool contract. Contracts can receive/hold. (Transfer-from-contract not tested; no tx.)

## FU1 — ERC-8056 multiplier step onchain — VERIFIED
`cast receipt 0xa64c81aa...c2d9`: status 1, block 98815287 (ts 2026-10-27T00:01:01Z), to/log address 0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA (ASML, symbol "ASML", 18dp). Log topic0 0x2205df45...b055 = keccak("UIMultiplierUpdated(uint256,uint256,uint256)").
Data: old = 0x0de112dacfcc82a9 = 1.0001013232514178; new = 0x0de3d53b05111fae = 1.0008779916711772; activationTime 0x6adfebfb = 2026-10-27T00:10:35Z.
Step = new/old = 1.00077659 (+0.07766%). $1,000 ASML => +$0.7766 (≈ $0.78). Current `uiMultiplier()` = 1000877991671177134 (= new value; no later step). Note: the step is a tiny ~0.078% (a dividend/rebase-style adjustment), not a material yield.

LAW#12 gate re-run (main): PASS EXIT=0

## Cross-exam
# Cross-exam: Terra Firma (advocate) attacks Crew. One round.
Craft: argumentation.md (tiers, evidence-mandated, dropped-argument rules). Date 2026-11-10. Submission closes 2026-11-12 17:30 UTC.

## Target: Crew's weakest load-bearing claim
Crew's headline is "bring a friend in by betting $WIF they'll stay" (ideas.md #5). That vouch bond carries all three judging axes at once:
- **A, the $WIF reason.** R0-TOKEN: "The vouch bond is the strongest single WIF sink in the pool."
- **B, the flywheel.** R0-LOOP: it is "the only built-in referral engine in the pool."
- **The retention story.** It is what keeps a member coming back.

Remove the vouch and Crew is, in its own words, "generic vault governance" (demo-scripts.md, Crew verdict). The attacks below go after that one claim.

---

### ATTACK 1 — KILLING BLOW: the core claim cannot be shown, honestly, to any judge before the scores are set
- **Claim.** The vouch resolves only after "4 weekly deposits" (ideas.md #5, mechanism 2). Submission closes Nov 12 and community voting runs Nov 14–16.
- **Evidence.**
  - demo-scripts.md, Crew Scene 6: "**this needs 4 weekly deposits, so it cannot exist before Dec 3.** Showing it means shrinking 'weekly' to 'every 30s' or seeding the state. Either one fabricates the retention claim itself."
  - Earned-state table: "Vouch **returned** | **no**: resolves ≥ Dec 3, not even during judging" and "Vouch **bounced** | no as specified."
  - R0-FORGE: "The 4-week resolution cannot happen honestly before Nov 16, so the 'returned vouch' beat would be fabricated state."
- **Why it is fatal, not just hard.** TASTE U7: "Fabricated/seeded state is forbidden outright when it contradicts the product's core claim." Crew's core claim is that a friend stays. This is a time constraint, so no amount of build hours fixes it. Every honest version of the climax is a countdown that reads "resolves Dec 3".
- **The mutation does not save it.** Crew's own rescue is "a real crew, mid-flight". The same script grades the result: "the flywheel's *positive* resolution, the part that makes the friend stay, is still only a countdown." Its only earnable beat is the *bounce* burn, and that requires a cooperating friend to ragequit on cue. That shows the friend *leaving*, which is the opposite of the claim.
- **Defense required.** Crew must show an earned, before-Nov-12 onchain artifact of a vouch *paying out*. None exists in any file.

### ATTACK 2 — HEAVY HIT: with dust deposits the vouch is self-farmable, so the "strongest WIF sink" becomes a faucet
- **Evidence.** R0-FORGE: "the vouch bonus is sybil-farmable: Privy email accounts cost nothing, so an inviter vouches for themselves and makes 4 dust weekly deposits to drain the bonus pool unless there is a minimum deposit."
- **Panel exposure.** The security whitehat (Ogle) is on the panel, and concerns-snapshot-V1 says: "Security-legible … (judge Ogle)."
- **The trap.** A minimum deposit kills the "$1 deposit → 0.24 crew shares" onboarding beat (demo Scene 2). Without one, the bonus pool drains. Crew needs both properties and can only have one.
- **Crew's own demo makes it worse.** Scene 3's honest note: "the '3 members voting' are **the builder's three wallets**." A judge watching the demo sees the sybil pattern being performed.
- **Criteria hit.** A (WIF reason) and C (built well).

### ATTACK 3 — HEAVY HIT: a wedge an entrant already ships, and the largest build surface in the pool
- **The wedge is taken.** strategy-density.md lists "Pave (tomcode1000) | social credit: friends lock $WIF behind you | 27 commits in 6 days | MED." R0-WILD: "Pave … already sits on the vouch wedge." Crew's most novel part is a live competitor's whole product, and Pave has six days of commits on it.
- **Crew is the worst-scored idea on build quality.**
  - round-scorecard: Crew scores C = **4.50**, the lowest in the pool, and FORGE gives it 4.7.
  - R0-FORGE: "The scope (vault, NAV, timelock, band, 4337, governance, ragequit, dividends) does not fit ~30 solo hours."
  - R0-TOKEN: "the build surface is the largest in the pool for one person in 30h."
- **Criteria hit.** C, "something that works and is built well", and Novel.

### ATTACK 4 — FLESH WOUND: the dividend beat is empty
Crew Scene 7: "There is no multiplier step before Nov 12, so this shows nothing." The live COST/AAPL steps (Nov 13/16) exist only "if the crew holds COST/AAPL." Mitigable: hold COST.

### ATTACK 5 — FLESH WOUND: rule-14 exposure from email onboarding
R0-FORGE: "email-onboarded invitees break the restricted-jurisdiction rule (rule 14) unless geofenced." This can be fixed, but it adds yet another item to the largest scope in the pool.

**Concession, for credibility.** Crew's ragequit is real and earned, and "the best security pattern in the pool" (R0-FORGE). It is also generic Moloch plumbing, not a reason to hold $WIF.

---

## Pre-empt: Crew's strongest attack on Terra Firma (100 words)
**Expected attack.** "Terra Firma's headline converts memes into NVDA. It is an exit from $WIF (R0-TOKEN on Rearview: 'an exit from the meme economy, not demand for WIF'), and it borrowed our friend jars."

**Answer.**
- **The sweep needs a $WIF trade to exist.** The Terra Router trades on the existing WIF/ETH v4 pool, and the fact-check quotes a real fill through it (TF2: 0.01 ETH → 15,561 WIF). The convert beat is the front door; the WIF router is the recurring engine.
- **Every convert or sweep burns $WIF**, in per-block-capped buys. Bonders must lock WIF to get fee-free, matched sweeps.
- **Friend jars use pro-rata exit, with no vouch timer.** Every beat is earnable today (U7).
# Cross-exam: Crew (advocate) attacks Terra Firma — one round
Craft: argumentation.md tiers. Every claim cites a file + quote or a verified fact.

**Target, the load-bearing claim:** TF's answer to axis A ("a real reason to use $wif") and axis B ("a flywheel that holds up") is *"every convert/sweep fee buys and burns $WIF; bonders lock $WIF for fee-free, matched sweeps"* (terra-firma-spec.md, Flywheel). Take that sentence away and TF is Rearview plus a savings router with no WIF in it. Every attack below hits that sentence or what it stands on.

---

## A1 — KILLING BLOW: TF's money path is a net seller of $WIF, and the WIF team is on the panel
**Claim.** On every path TF ships, value leaves $WIF for stock. The burn only recovers a fraction of what leaves, so net WIF flow is negative by arithmetic. It can never be positive, at any scale.

**Evidence.**
- Front door: "Paste your wallet. See what your memes cost you in NVDA. Fix it in one tap" (spec, 10-second line). Convert is "Sell chosen meme tokens → USDG/WETH → a feed-backed Stock Token" (spec §2). $WIF is a meme token on RH Chain. Pointed at a WIF holder (the ~1.45K voter wallets, concerns-snapshot "Mobilization line"), the card's job is to tell them to sell WIF.
- Sweep: "A user-set sweep % of each trade (taken in ETH...) is swept into their Jar as stock" (spec §3). On a WIF buy, that ETH would have bought WIF and now buys NVDA instead. On a sell it moves ETH out. The sweep never adds a WIF bid.
- Burn: "A small protocol fee... buys $WIF in per-block-capped chunks and burns it" (spec §4). "Fee→burn amounts start small" (spec, caveats).
- Arithmetic: a user sells X WIF, and fee *f* buys back at most *f·X*. Net sell pressure is **X(1−f) > 0 for every f < 100%**.
- Independent R0 confirmation: "Its strongest beat (convert memes to NVDA) is an exit from the meme economy, not demand for WIF" (R0-TOKEN, Rearview). And: "the flow pushes value *out* of memes and into NVDA" (R0-TOKEN, Rearview A=3).

**Why it is fatal and not just hard.** Axis A asks for a reason to *use* $wif, and the WIF team sits on the panel. TF's headline mechanism is a better-designed exit from $wif, and its only WIF-positive term is a fraction of that same exit. No parameter fixes this except f ≥ 1, which kills the product. To survive, TF must exclude WIF from Hindsight/convert, which removes its front door from the audience it mobilizes, *or* show a WIF demand source that is bigger than the outflow it creates.

## A2 — HEAVY HIT (killing-blow attempt on B): the bond switches off the burn it is meant to feed
**Claim.** TF's two WIF mechanisms cancel each other out. Each user who takes up the bond removes their fee from the burn and draws from the same pool.

**Evidence.** "$WIF bonders (lock WIF) pay zero fee and get a matched sweep funded by the fee pool" (spec §4). The same fee pool also "buys $WIF... and burns it" (spec §4).
- Let *b* be the share of volume that is bonded. Fee income scales with (1−*b*). The match and the burn both draw on that one pool.
- At *b* → 1, which is the outcome the bond is designed to produce, fee income goes to 0, so burn goes to 0 and the match goes to 0. Bonders then hold locked WIF for a zero-fee discount on a fee that no longer funds anything.
- Each dollar spent on the match is a dollar not burned, so the two promises compete for the same funds.

**Scenario.** Ogle or a TOKEN-lens advisor asks "what happens when it works?" The honest answer is that the burn dies. That is exactly the "burn = flywheel" pattern the field is warned about: "judges ask for 'a flywheel that holds up'; most entries' flywheel = burn %" (strategy-density.md, gap 3). TF's burn is smaller than most, because it shrinks as adoption grows.

**Also note what TF dropped.** Keel scored A=8 under TOKEN because it had "three demand sources, two of which aren't hype", including the exogenous dividend→burn (R0-TOKEN rationale). TF moved dividends into the user's jar: "a bonus, not the headline" (spec §6, caveats). It cut the one non-speculative WIF burn source and kept the speculative one.

**Why HEAVY and not KILLING:** a redesign could fix it, for example a burn floor taken before the match, or a bond that discounts rather than zeroes the fee. That is a redesign of the WIF layer at the pick stage, not a tweak.

## A3 — HEAVY HIT (axis C / security judge): "minimal-admin" stands on an unverified, owner-controlled hook that can skim swap output
**Evidence.** The router runs "on the EXISTING WIF/ETH Uniswap v4 pool" (spec §3). Fact-check TF2 on that pool found:
- "HOOK: nonzero. Code size 15,167 bytes. Permission bits... afterSwapReturnDelta (hook can skim swap output)."
- "hook.owner() = 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd. Not identified as a known public launchpad hook (no verified source seen)... treat as launchpad-style fee hook, owner-controlled."
- Measured cost: "0.01 ETH → ... −1.04% (hook fee + impact)."

TF's safety claim is "Ownerless/minimal-admin verified contracts" (spec §7). The whitehat judge will look at the venue, not just the router. Every sweep sits downstream of a third-party hook whose code is unverified, whose owner is unknown, and which has permission to change swap output. TF cannot prove the owner can't raise that delta tomorrow. "The router must... tolerate afterSwap delta" (TF2) means min-out is the only thing protecting users, and a sweep % set against a moving hook take is not a guarantee. This is the RefiRail-style trap of "verified contracts, unverified trust root".

## A4 — HEAVY HIT (U2 / Vasily legibility): three products in a ten-second line
**Evidence.** The 10-second line has three sentences and three products: a regret card, a convert, and a savings router (spec). The spec adds friend jars with AA (§5) and a weekly report and streak (§6), for 7 numbered mechanisms. The judge rule is "a judge has a few minutes to understand it" (concerns-snapshot, Vasily). U2 says "The judge must SEE it work in ~3 minutes without explanation" (TASTE.md).
- R0-WILD faulted Keel alone for "five layers in ~30h runs against U2 and L3". TF is Keel's router and bond plus Rearview's indexer and verifier plus Crew's AA onboarding.
- The WOW also moves. Rearview's WOW is 0:20–0:55 (demo-scripts), and the router/burn beats that carry A and B now sit behind it. The judge remembers the regret card, which is the A=3 part (R0-TOKEN).

## A5 — HEAVY HIT (A, delete test on the social layer): Friend Jars took Crew's onboarding and left out the WIF
**Evidence.** Spec §5: "Invite a friend... email login via embedded wallet (Privy/ZeroDev) + sponsored gas... both contribute; ownership pro-rata onchain; exit anytime." No WIF term appears in the mechanism. Delete WIF and §5 is unchanged.
- TF's "D3 medium social" therefore adds build surface (4337, Privy policy setup: "Privy sponsorship needs dashboard setup/policy; not exercised", fact-check TF4) without adding anything on axis A.
- In Crew, the same invite is *the WIF mechanism*: "The inviter locks WIF... comes back with a bonus if the invitee has 4 weekly deposits; if not, part of it is burned" (ideas.md Crew §2). TF copied the cost of that layer and dropped its point.

## A6 — FLESH WOUND: Hindsight pricing has a broken first month and a hard floor at Jun 22
**Evidence.** "early NVDA/USD rounds (<= ~Jun 22) carry 18-dp-scaled answers (e.g. 2083949999900000000) despite decimals()=8" (fact-check TF1). Read naively, that is NVDA at $20.8B, so the counterfactual for June buys shows about zero shares, and the card is wrong in exactly the "you'd have more" direction. NVDA history is "OLDEST 2026-06-22", so earlier buys can't be priced at all. On top of that, "amountUSD" is still caller-asserted ("receipts-backed pricing, not onchain tx-history reads", spec caveats), which is the same input-side gap R0-FORGE raised: "a whitehat would forge a flattering card in one line".
- Mitigable: normalize by magnitude, refuse buys before Jun 22, and label the input side. Not fatal.

## A7 — FLESH WOUND: the "live dividend bonus beats" are about one cent, and on the wrong ticker
**Evidence.** "≈$0.78 per $1,000 per step" (fact-check FU1). The budget is "~$18" (concerns-snapshot). The jar default is the counterfactual NVDA (spec §1–2), but the live steps are "COST (Nov 13) and AAPL (Nov 16)" (spec §6). A NVDA jar shows nothing, and a COST jar of a few dollars shows about $0.002. The spec admits it ("a bonus, not the headline"), so this is not debated further.

---

## Dropped-argument stakes
- **A1 is a KILLING BLOW.** If TF does not show WIF demand larger than its own outflow, or exclude WIF from convert (and lose its front door), the idea fails axis A in front of the WIF team.
- **A2, A3, A4 and A5 are HEAVY.** Any of them left unanswered is a conceded deduction on B, C, U2 and A respectively.

---

## Pre-empt: TF's strongest attack on Crew (100 words)
**Expected attack:** "Crew's demo is hollow. The vouch resolves at 4 weekly deposits (about Dec 3), after judging, and the '3 members' are one builder's wallets" (demo-scripts, Crew verdict).

**Answer from existing material:** demo-scripts already gives the mutation "a real crew, mid-flight". Three real people deposit from their own wallets, so distinct depositors are visible on Blockscout. The bounce trigger is redefined as "ragequits or misses deposit #2", so the burn is earned live. The returned vouch becomes an honest onchain countdown. The blocker in Scene 1 is gone: Privy and ZeroDev both support 4663 (fact-check TF4). The sybil-farm exploit (R0-FORGE) is closed by a minimum deposit. Crew's WIF is a bid (the vouch lock), not an exit.

### Adjudication
Both KILLING BLOWs landed. Crew's (vouch-timing) is structural; TF's (net WIF seller) fixed by D5/AMEND-1 (Dami-approved). No flip. Unresolved → challenge: third-party hook, burn magnitude, scope, legibility.

## Challenge pass
# CHALLENGE — Terra Firma (post-AMEND-1) | challenger, fresh context, adversarial | 2026-11-10
Every claim below cites a file and section, or is marked UNSUPPORTED.

## 1. STRONGEST CASE AGAINST

**After AMEND-1, $WIF fails the delete test. The product's own story is "leave memes for stocks", and it is being pitched to the WIF team.**

1. **AMEND-1 fixed the sign of the WIF flow but not WIF's role.**
   - Post-amend, $WIF does two things: it is the target of a fee-funded buyback-burn on routed trades, and it is a discount bond (spec AMEND-1, "$WIF flow" and "Bond").
   - Delete $WIF and nothing breaks. Hindsight, convert, the any-meme router, the Jar and Friend Jars all still work. The fee could go to the treasury or back to users instead.
   - That is the structure R0-TOKEN scored **A=3** on Rearview: "WIF is an entry fee per publish or convert, the textbook skin... works identically with USDG fees" (R0-TOKEN, Rearview row). Strategy-density gap 3 names the field's failure pattern exactly: "most entries' flywheel = burn %". TF's A/B answer is that pattern with a router in front of it.
   - TOKEN's Keel condition was explicit: "Without [the hold bond as a real reason to lock], Keel degrades to Acorns with a WIF pool" (R0-TOKEN rationale). The amended bond is a fee discount, and its value scales with fees that are close to zero (next point).
2. **The burn is too small to show up.**
   - The WIF economy is "~1.2K transfers/day, ~$1.4M FDV" (research/chain-dna.md, constraints).
   - The router has no volume of its own on day 1. FORGE and LOOP both found that a fee venue loses to the fee-free path: "a skim fee pushes rational traders onto the unhooked pool" (R0-LOOP, Keel row).
   - TF makes this worse. A routed trade pays the third-party hook's −1.04% (fact-check TF2), plus TF's fee, plus the sweep. The burn a judge sees will be the builder's own dust, funded from about $18 (concerns-snapshot [I]2).
3. **The front door argues against the panel's token.**
   - Hindsight "analyses all memes" (AMEND-1), and $WIF is a meme. Any WIF holder who bought since June and is down gets a shareable X card that reads "$WIF cost you $N in NVDA".
   - These cards would circulate during a community vote in which ~1.45K WIF wallets burn WIF to vote (concerns-snapshot, Mobilization). Organizer approval is also a gate (brief, Mechanism).
   - The 10-second line still contrasts memes with "solid ground" (spec tagline). That is RH's "memecoins took over" framing, pointed at the meme team. UNSUPPORTED: how the WIF team would react. Treat it as a high-variance bet, not a known loss.

**Net:** TF is the best *product* in the room (Rearview's C=6.5 and WILD's 8; Keel's legibility). On the 34%-weighted axis it scores roughly where Rearview did, about 3–4, now with 7 mechanisms of build risk added.

## 2. PREMORTEM — "It is 2026-11-17. We submitted Terra Firma and LOST. Why?"

**P1 "Nice Acorns, where's the WIF?"**
- **What happened:** The WIF-team and TOKEN-lens judges ran the delete test in a minute. The router, Jar and Hindsight never touch WIF, and the burn counter read "🔥 312 WIF ($0.28)". A scored low and B read as "burn %". A WIF-native entry with WIF as a bid won instead: Proof of Ship (real WIF bounties, burned), Pave (friends lock $WIF), or Underfoot.
- **Evidence:** R0-TOKEN Rearview A=3; strategy-density gap 3 and the registry.
- **Prevention:** Before forge, give WIF a job that cannot be removed. For example, WIF is the bond that *unlocks* the sweep or match (no lock, no Jar), or the friend-invite vouch is posted in WIF (Crew §2, which TF dropped; xexam A5). Then run the delete test again in writing.

**P2 The regret card became anti-WIF advertising.**
- **What happened:** The pre-minted cards for top voter wallets mostly showed "$WIF −70% vs NVDA +X%". CT quote-tweeted them as "even the WIF hackathon says sell WIF". The organizer either delayed approval or the voters stayed home.
- **Evidence:** AMEND-1 "Hindsight cards analyse all memes"; Rearview mobilization plan "pre-generated public cards for the top G.O.A.T. voter wallets, tagged on X" (ideas.md Rearview).
- **Prevention:** Exclude $WIF from Hindsight entirely, or render WIF rows in a separate, neutral "held" lane. Never pre-mint or tag cards on WIF voters' wallets.

**P3 The cathedral didn't finish (scope fantasy).**
- **What happened:** The build planned an indexer across v2/v3/v4/launchpad pools, Hindsight pricing with 18dp normalization, convert, an any-meme router with hooked-pool handling, Jar custody, burn and bond, Friend Jars with Privy, 4337 and a paymaster policy, a weekly report and streak, and a geofence. The builder had ~30h against a Nov 12 morning-WAT internal cutoff (concerns-snapshot [I]).
- **Result:** The router and Friend Jars shipped half-tested. The video showed Hindsight plus one convert, which is Rearview, the round-0 #4 (round-scorecard, 4.83).
- **Evidence:** xexam A4 counted 7 mechanisms; R0-FORGE said cut Keel to layers 1–3; R0-WILD called Keel alone a "five-layer cathedral". AMEND-1 widened the router to "ANY Robinhood Chain memecoin ... incl. Pons-hooked pools", but fact-check verified only the WIF/ETH pool (TF2). Launchpad pools and sells to USDG are unverified.
- **Prevention:** Hard scope of 4 mechanisms: Hindsight, convert, router on 2 verified pools, burn and bond. Cut Friend Jars and the weekly report to "next" slides. Verify one launchpad-meme sell before writing any router code.

**P4 Ogle found the hole.**
- **What happened:** (a) The WIF/ETH venue's hook is unverified and owner-controlled, with afterSwapReturnDelta permission (TF2), and "minimal-admin" was claimed on top of it. (b) The matched sweep from the fee pool could be farmed: wash-trade through the router while bonded, and if the match exceeds the discounted fee, the pool drains. (c) The amountUSD input to Hindsight is caller-asserted (xexam A6, R0-FORGE). One public tweet, "drained the match pool for $2 gas", ended it.
- **Prevention:** Cap the match at ≤ the fee the user paid and take the burn floor *before* the match (xexam A2 remedy). Put the hook trust root first in SECURITY.md. Store tx hashes on cards and keep a recompute page (demo-scripts, Rearview design fix). Use the wording "priced onchain, checkable by anyone".

**P5 The judges were geofenced out of the demo.**
- **What happened:** Several panelists or voters are US-based, and Stock Tokens are restricted for US/UK/CA/CH (chain-dna.md; rule 14). Their live try hit a geofence wall on convert, sweep and Jar, so only the read-only card worked for them. "Something that works" became "something that works for someone else". UNSUPPORTED: where each judge is located.
- **Prevention:** Make Hindsight and the burn counter fully usable without the stock leg. Show the geofence in the video as a compliance feature. Make the video carry every stock beat with Blockscout links.

## 3. RISK REGISTER

| risk | severity | likelihood | impact | mitigation |
|---|---|---|---|---|
| R1 WIF fails the delete test post-AMEND-1 (burn-target plus discount bond only) | CRITICAL | HIGH | Axis A (34%) about 3–4 in front of the WIF team; B reads as "burn %" | Give WIF a role nothing else can fill: a WIF bond *gates* the sweep or match, or the invite vouch is posted in WIF. Re-run the delete test in writing before forge |
| R2 Hindsight cards show WIF losses to WIF voters and the organizer | HIGH | MED-HIGH | Community seat lost, approval friction, negative CT artifact | Exclude WIF from analysis and cards; no pre-minting on voter wallets |
| R3 Scope: 7 mechanisms plus an any-meme router in ~30h solo | CRITICAL | HIGH | Half-built layers, a demo that collapses to Rearview, broken live app Nov 12–16 | Freeze at 4 mechanisms; move Friend Jars and weekly report to roadmap; set an internal cutoff with a scope-cut trigger at T−12h |
| R4 Router has no organic volume (hook −1.04% + fee + sweep vs the plain Uniswap UI) | HIGH | HIGH | The flywheel never turns, and the burn counter is builder dust | Make the per-user sweep the product (savings), not the burn. Show honest numbers. Don't claim volume |
| R5 Third-party owner-controlled hook on the WIF/ETH venue | HIGH | MED | Whitehat judge flags "unverified trust root"; users exposed to a changing delta | User min-out enforced in the router; SECURITY.md disclosure; quote-check that reverts if the hook take exceeds a bound |
| R6 Matched-sweep / fee-pool farming and the bond-vs-burn conflict (xexam A2 residual) | HIGH | MED | Pool drained publicly, or the burn shrinks as adoption grows | Burn floor taken first; match ≤ the user's own fee paid; per-epoch cap; Foundry invariant tests |
| R7 Unverified launchpad / Pons-hooked meme pools for the router and convert | MED | MED | Convert or sweep reverts on real users' memes | Verify one real meme→USDG→NVDA path on mainnet before building; whitelist verified pools only |
| R8 Hindsight data integrity (18dp early rounds, no history before Jun 22, asserted amountUSD) | MED | MED | Wrong or forgeable cards found by a judge | Magnitude normalization, refuse buys before Jun 22, tx hash plus recompute page |
| R9 Geofence blocks US-based judges or voters from the stock leg | MED | MED (UNSUPPORTED) | A live try fails for the judges | Read-only path fully works; the video carries the stock beats |
| R10 Mainnet budget ~$18 across convert, sweep, burn and bond demos, plus gas sponsorship | LOW | MED | Beats get cut or look dusty | Budget each beat; no sponsored-gas policy unless Friend Jars survive the scope cut |
| R11 Dividend beats about $0.002 on the wrong ticker (xexam A7) | LOW | HIGH | Wasted demo seconds | Drop from the video; at most a footnote |

## 4. VETO CHECK
**No.**
- **Mitigable:** No finding is both CRITICAL and unmitigable. R1 and R3 are CRITICAL but can be fixed.
  - **R1** has known fixes from the pool itself: a WIF vouch (Crew §2), a WIF bond that gates the sweep (TOKEN's Keel condition), and a burn floor before the match (xexam A2).
  - **R3** is fixed by cutting scope to 4 mechanisms.
- **The real constraint is timing:** R1's fix is a redesign of the WIF layer at pick stage, not a tweak (xexam A2, "Why HEAVY"). It must be decided before forge.
  - If the fix is skipped, TF should not beat Keel or Crew on A, the axis the room weighted highest.
  - If both R1 and R3 are left unresolved, treat it as a soft veto.

## 5. DELIBERATION FAILURE MODES DETECTED
- **Sycophancy (HIGH).**
  - TF was created by a user_override redirect (spec, Origin). It was never scored in Round-0 as a merged idea.
  - Its standing is inherited: Keel's A (7.0) and Rearview's C (6.5), as if a merge keeps the best of each parent.
  - No pass re-scored TF on A after AMEND-1. The amended WIF role (fee-burn plus discount bond) is the structure R0-TOKEN scored A=3.
  - Position shifted without new evidence. That is deference to the builder's redirect.
- **Scope fantasy (HIGH).** The demo obligations (7 mechanisms, any-meme router) were never walked against the ~30h capability sheet. Concerns-snapshot [C]1 ("time NOT a constraint") is the driver. The hard deadline still applies.
- **Eloquence over evidence (MED).**
  - The flywheel sentences "Jar grows with every trade and every dividend" and "cards and invites pull in new people" (spec, Flywheel) have no citation for router volume, meme-wallet counts, or invite conversion.
  - The dividend claim contradicts FU1 (+0.078%/step).
- **Research neglect (MED).**
  - AMEND-1's widened router scope (Pons-hooked and launchpad pools) and the meme→USDG sell leg were not fact-checked.
  - No research was done on how many RH wallets have meme buys after Jun 22, which is Hindsight's actual audience.
  - chain-dna's "$WIF economy thin (~1.2K transfers/day)" was not used in sizing the burn.
- **Premature convergence (LOW, partially present).** The gauntlet did draw blood: xexam A1 landed and forced AMEND-1. The amend was then accepted in the same pass with no second cross-exam, so A2, A4 and A5 stand partly unanswered:
  - A2: the match still competes with the burn.
  - A4: legibility got worse (the router is now any-meme).
  - A5: Friend Jars still have no WIF term, since AMEND-1 removed the vouch.
- **Not detected:**
  - Echo chamber: Round-0 diverged, with Rearview spread 2.3 and WILD dissenting.
  - Conformity: the Crew cross-exam attempted and landed a killing blow.
# Challenge: Crew (adversarial, fresh context). Date 2026-11-10. Closes 2026-11-12 17:30 UTC.
Inputs: research/ideas.md #5, gen/demo-scripts.md (Crew + cross-script), round-scorecard.md, gen/R0-{TOKEN,LOOP,FORGE,WILD}.md, gen/fact-check.md, gen/xexam-TF-attacks-Crew.md, concerns-snapshot-V1.md, research/roster-audit/strategy-density.md, TASTE.md, deliberation-health.md.

## 1. STRONGEST CASE AGAINST

**The thing that makes Crew a $WIF project can't be shown before it's scored. The parts that can be shown are generic vault governance run from one person's wallets.**

1. **The core claim isn't earnable (U7).** The vouch, which pays out only "if the invitee has 4 weekly deposits" (ideas.md #5 §2), "cannot exist before Dec 3" (demo-scripts Crew Scene 6). Streak-weighted voting is also "no (needs weeks of deposits)" (earned-state table). The voting closes Nov 16. The demo script itself rates Crew **hollow**, and even after mutation only **thin**. It calls Crew "the least earnable demo" of the finalists, even though it is #2 on the scorecard (cross-script finding 4). The vouch carries A, B and retention all at once (xexam Attack 1). Take it out and what remains is ragequit, allow-list and timelock. Those are Moloch plumbing, and FORGE's concession is that they are "not a reason to hold $WIF".
2. **The demo shows the sybil attack it claims to stop.** "The '3 members voting' are the builder's three wallets" (Scene 3). FORGE adds: "Privy email accounts cost nothing … 4 dust weekly deposits to drain the bonus pool unless there is a minimum deposit." A minimum deposit breaks the "$1 → 0.24 shares" onboarding beat (xexam Attack 2). A whitehat judge (Ogle) watching Scene 3 sees the attack being performed.
3. **It is the worst-scored idea on "built well", with the largest scope.** C = 4.50, the lowest of the 5 finalists (round-scorecard). FORGE says vault, NAV, timelock, band, 4337, governance, ragequit and dividends "do not fit ~30 solo hours", and TOKEN calls it "the largest build surface in the pool". Concerns-snapshot C1 ("time NOT a constraint") is a preference stated by the builder. It is not evidence about capacity, and ~40 wall-clock hours remain.
4. **The novel part is a live competitor's whole product.** strategy-density lists "Pave (tomcode1000): social credit, friends lock $WIF behind you, 27 commits in 6 days". R0-WILD says "Pave … already sits on the vouch wedge." The judges will see two "friends lock $WIF" entries, and Pave's has 6 more days of work on that one wedge.
5. **There is a $WIF problem inside the governance layer.** Voting weight = locked WIF × streak. That means outside WIF buys a say over your friends' stock savings. TOKEN calls the weighting "somewhat arbitrary: why not club shares?". The WIF team is on the panel and will ask why WIF, rather than ownership, steers the basket.
6. **New attack (not raised before): a stale-NAV weekend arb.** Shares mint at Chainlink NAV, and the market-hours feed "may be stale" off-hours (fact-check TF3). Someone who deposits at a stale Friday NAV and ragequits in kind after Monday's reprice takes value from the other members. The judging window includes the weekend of Nov 14–15. This is mitigable with the 24/7 feed plus a deposit-to-ragequit cooldown, which adds yet more scope.
7. **Several dependencies are unverified for Crew specifically.** The fact-check targeted Terra Firma. Only the NVDA/USDG fill was verified (+0.16%, TF3). Liquidity for the TSLA and GOOGL legs, a "band" fill for GOOGL, and Chainlink feeds for every basket asset were never probed for Crew. Privy sponsorship is "not exercised" (TF4). The dividend step is about 0.078% (FU1), and Scene 7 "shows nothing".

## 2. PREMORTEM: "It is 2026-11-17. We submitted Crew and LOST. Why?"

1. **The Dec-3 countdown killed axis A.** The judge watched an onchain "Tolu's bond: 1/4 · resolves Dec 3" and an earned *bounce* in which a friend leaves. The one positive flywheel moment was a promise. A and B were scored as "unproven", and Keel- or TF-style entries with an earned WIF burn on every action outscored us.
   *Action:* make the vouch cadence resolvable within the window (for example, a daily or market-day streak with N=3 from Nov 11, so it resolves Nov 14). Do this as an honest product parameter, stated in the README, and not as a 30-second "week".
2. **Ogle found the self-vouch farm in 4 minutes.** A free email account, self-invite, dust deposits, collect the bonus. The bonus pool also funded the 12% return, so it was a faucet. C fell from "built well" to "exploitable", and the whitehat seat became a negative vote.
   *Action:* fund the bonus only from forfeited bonds and proposal burns, never from treasury. Cap the bonus at ≤ the bond, add a minimum deposit for the vouch to count (separate from the $1 join), and tie vouch eligibility to inviter ≠ invitee funding source.
3. **We shipped half of six mechanisms.** By Nov 12 morning, Privy/4337, the timelock band and the cap table were working, but streak weighting and dividends were stubbed and the GOOGL leg reverted with no fill in band. A judge clicking the live site hit a broken proposal. The internal Nov 12 WAT cutoff was missed, approval lag ate the buffer, and the live site broke during Nov 13–16.
   *Action:* hard cut to vault + vouch + ragequit + allow-list. Use only basket assets with a verified dust fill. Drop streak weight and dividends from the demo.
4. **We were seen as "Pave plus a vault".** Judges remember one vouch-for-a-friend entry, and Pave got there first with more polish. Our mobilization claim (3 crews of 3–10 wallets) produced fewer than 20 votes, against about 1.45K active voter wallets.
   *Action:* lead with "your group chat owns NVDA" (the stock-ownership wedge, gap-map W1, which is empty). Make the vouch the *invite* mechanic, not the headline. Recruit real crews before Nov 12.
5. **The 3-minute legibility failure.** Six mechanisms plus AA login in under 3 minutes left the GetBlock judge ("a few minutes to understand it") unable to say what WIF does. The pitch's L14-style risk (cerebral and costly to explain) applied.
   *Action:* use one sentence: "Lock WIF to bring a friend into your stock crew; it comes back if they stay, burns if they don't."

## 3. RISK REGISTER

| risk | severity | likelihood | impact | mitigation |
|---|---|---|---|---|
| R1 Vouch return and streak can't resolve before judging (U7, core claim) | CRITICAL | Certain as specified | A and B unproven; demo hollow | Make the cadence an honest product parameter that resolves within Nov 11–16 (daily, N=3). Publish it. Run real invites from Nov 11. Leave a live keeper so the payout happens during judging |
| R2 Self-vouch sybil farm drains the bonus pool | HIGH | High (Ogle will look) | C collapses and the security judge turns negative | Bonus funded only from forfeits and burns, capped ≤ bond. Minimum vouch-qualifying deposit. Distinct funding-source check. State the attack in SECURITY.md |
| R3 Scope exceeds ~40h solo (6 mechanisms + Privy/4337 + geofence) | HIGH | High | Stubbed features and a broken live site, against "works and is built well" | Ship vault + vouch + ragequit + allow-list. Cut streak weight, dividends and proposal-burn theatrics (LOOP's own condition) |
| R4 Pave occupies the vouch wedge | HIGH | Medium-High | Novelty and memorability discounted; "seen it" | Reposition: the stock-crew is the product, the vouch is the invite. Name the difference from Pave explicitly in the README |
| R5 Demo crew = one builder's wallets | HIGH | High unless recruited | Sybil theater on camera; WOW "undercut on rewatch" | Have 3+ real humans deposit from their own wallets before recording, verifiable on Blockscout |
| R6 Basket legs (TSLA/GOOGL) lack a dust fill in band, or feeds | MED-HIGH | Unknown (unverified) | Execute or ragequit beat reverts live | Probe each asset as fact-check TF3 did, before forge. Restrict the allow-list to verified pools (NVDA confirmed) |
| R7 Stale-NAV mint then in-kind ragequit arb (weekends) | MED | Medium (weekend in window) | Member value extracted; whitehat finding | Use the 24/7 feed, add a staleness revert on deposit and a deposit→ragequit cooldown |
| R8 Locked-WIF voting = plutocracy over friends' savings | MED | Medium (WIF team and advisors ask) | Axis A reads as arbitrary | Use share-weighted votes with WIF as the vouch and proposal bond only, or WIF as a boost capped at x% |
| R9 Rule 14 / collective-investment optics of pooled equities via email onboarding | MED | Medium | Compliance flag from TradFi advisors | Geofence, keep the no-custody framing (in-kind ragequit), no "Robinhood" in branding (rule 11) |
| R10 Privy sponsored gas on 4663 not exercised; $18 budget | MED | Low-Medium | The onboarding WOW beat fails | Send one sponsored tx before forge. Fallback is a wallet join (mutation allows it) |
| R11 Mobilization overstated (3 crews ≈ <30 wallets vs ~1.45K) | LOW-MED | High | The community seat is lost to entrants that mobilize more | Treat crews as proof of use, not as a vote bloc. Mobilize with a separate tactic |

## 4. VETO CHECK

**Veto: NO, conditional.** R1 is CRITICAL. *As specified* (4 weekly deposits), it can't be mitigated: no amount of build effort moves the calendar, and faking time contradicts the core claim (U7). The cadence, though, is a design parameter, not a law. A published, honest short cadence (a daily or market-day streak started Nov 11) lets a real vouch pay out *during judging* through a live keeper, and that is earned state. The veto is turned into a **kill-trigger**: drop Crew if, by Nov 11 23:59 WAT, both of these are missing:
- (a) 3+ real, distinct depositors with live vouches on the short cadence;
- (b) a verified dust fill in band for every basket asset.

If both are missing, Crew is generic vault governance with a time-shifted promise, and it loses to any finalist whose WIF beat is earned today.

## 5. DELIBERATION FAILURE MODES DETECTED

- **Scope Fantasy (detected).** The demo needs Privy/4337 + vault + NAV + timelock/band + governance + ragequit + vouch + streak + dividends in about 40h solo. Unbuildable scenes: Scene 6 (vouch resolution) and the streak weight are time-impossible, and Scene 7 (dividends) has nothing to show. The minimum version that still meets the demo obligation is real crew + vault + short-cadence vouch + ragequit + allow-list revert.
- **Eloquence Over Evidence (detected).** LOOP's top-pick case ("Ade adds this week's $20 … his Tuesday") is a vivid persona with no user evidence. No crew, user or group chat exists in any research file. Crew's B = 6.50 (round-scorecard) rests on that narrative, while the demo script grades the same beats hollow.
- **Sycophancy risk (watch).** Concerns-snapshot C1 ("Time NOT a constraint … do not kill for complexity") is a stated preference, and it is being used to override three independent scope findings (FORGE, TOKEN, xexam Attack 3). Any rise in Crew's support after this point has to trace to new evidence, such as a verified fill, recruited humans or a cadence redesign, and not to "be extensive".
- **Research Neglect (partial).** The fact-check was aimed at Terra Firma (TF1–TF4, CR3, FU1). None of Crew's specific dependencies were probed: the TSLA/GOOGL fills, the basket feeds, a sponsored tx, and a vouch-period design. Cross-script finding 1 asked for a dust-fill tx for Crew, and it hasn't been run for Crew's legs.
- **Not detected:**
  - Echo Chamber: R0 divergence is 2.0, and the 4 scorers raised distinct objections.
  - Premature Convergence: the gauntlet did wound Crew (hollow verdict, killing-blow attack).
  - Conformity: WILD attacked with Pave and U7.
# CHALLENGE — Dividend Furnace (adversarial, fresh context) — 2026-11-10

## 0. NEW EVIDENCE (onchain, this pass — overturns a "verified" input)
Read-only probes against https://rpc.mainnet.chain.robinhood.com at head 111,125,159 (2026-11-10 19:26 UTC):

| Probe | Result |
|---|---|
| COST token `0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2`, `UIMultiplierUpdated` logs, last 20M blocks | **One step already landed: block 104,325,986 = 2026-11-02 15:35 UTC.** old 1.000612 → new 1.001622, step **+0.1009%**, activation 2026-11-02 15:45 UTC. `uiMultiplier()` = 1.001622 = post-step. No pending step (`pendingMultiplier: ""` in rhj-assets-now.json). |
| AAPL `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | No step in the last 20M blocks (~24 days). `newUIMultiplier()` = current; `effectiveAt()` = 1786720366 (Aug 2026, past). **Nothing is pending.** |
| research/raw/rhj-corp-actions.json | The "COST 11-13 / AAPL 11-16" dates are **`processDate`** (≈ pay date), not ex-date or step date. ASML: step 2026-10-27, processDate 11-04 (lag 8 d). COST: step 11-02, processDate 11-13 (lag 11 d). |

**Consequence:** the brief's "next real dividends COST 2026-11-13" is a misread of the RH API. COST's step for this quarter **already happened**, so the "Ignition" mutation's climax (a COST step on Nov 13 that the keeper burns live in front of judges) **will not occur**. AAPL's step timing is unknown: it is operator-driven, lands 8–11 days before processDate and at irregular hours (COST stepped at 15:35 UTC, not midnight), so it may already be overdue or land anywhere Nov 10–16. The step is not schedulable. That breaks the premise of the demo-scripts "Ignition" re-verdict, which (warned in demo-scripts.md:170) depended on the step landing on the ex-date.

## 1. STRONGEST CASE AGAINST
1. **The only event the pitch sells cannot be witnessed on schedule.** The script is "hollow" as pitched (demo-scripts.md:162), and its only rescue, Ignition, is anchored to a COST step that onchain data shows landed Nov 2 (§0). The remaining candidate (AAPL) has no pending multiplier and an unpredictable operator-set step time. The video's WOW lands "nowhere live" (demo-scripts.md:160), and now the after-submission WOW is also unscheduled. U2 and U7 (TASTE.md) both fail on the hero beat.
2. **It is a pipe, not a flywheel.** The inflow is a hook skim on a new pool that we seed with ~$6 and that has no organic flow (demo-scripts Scene 2; FORGE: "without creating a new venue is false"). Rational traders route to the existing ~$100K hooked WIF/ETH pool (fact-check TF2). Burning WIF does not raise the treasury's inflow, so no loop closes. That is criterion B, the panel's own words "a flywheel that holds up". LOOP scored B 4, FORGE scored B 3.
3. **Scale refutes the name.** The real COST step of +0.1009% on a ~$5 COST basket is about **$0.005**. At ~1.57M WIF/ETH spot (TF2), that burns single-digit WIF. Even ASML's real step yields $0.78 per $1,000 (fact-check FU1). Judges see a "furnace" that burns less than one swap's hook fee.
4. **Dominated inside our own pool.** Two of four R0 scorers call it "Keel's layer 3 shipped alone" (FORGE, TOKEN). Every Furnace beat is a strict subset of Keel's, and Furnace adds none of Keel's demand sources. TOKEN: "WIF is purely the burn target ... burn X% and call it utility with a better inflow."
5. **Passive WIF role and passive voters.** WIF holders are beneficiaries with no Tuesday action (LOOP), and "passive holders don't burn WIF to vote" (WILD). With the community vote worth one judge seat and ~1.45K voter wallets (concerns snapshot), it has no mobilization engine.
6. **Twin risk.** Underfoot (37 commits, "a floor of Stock Tokens under every $WIF", roster.csv:12) already owns "stock treasury behind WIF" in judges' heads (WILD, LOOP, TOKEN, and demo-scripts' "still a twin of Underfoot"). Pool-gates distinguishes redemption from yield-burn, but a judge with "a few minutes" (Vasily) will not.
7. **Security surface for the whitehat.** `harvest()` is permissionless and buys WIF on v4 spot, so it can be sandwiched (FORGE). The Ignition "first caller gets a soulbound badge" also races our own keeper: if the keeper fires at the step, no human ever wins the badge, and if it doesn't, the burn may not happen during judging. The badge mechanic is internally contradictory.

## 2. PREMORTEM — "It is 2026-11-17. We submitted Dividend Furnace and LOST. Why?"
1. **The furnace never lit.** We timed the demo and README to "COST ex-div Nov 13". COST had stepped Nov 2, so Nov 13 came and went with `harvest()` reverting `NoYield()` on the live page every judge opened. AAPL stepped at an unannounced hour (or not before 11-16 17:30 UTC). The whitehat judge saw a countdown that pointed at nothing, and read it as the team not understanding ERC-8056. *Actionable:* a team that read processDate vs logs would have known on Nov 10 (this file).
2. **"Where's the flywheel?"** The GetBlock/Quicknode judges scored B low. A $6-seeded hook pool with zero third-party swaps (all inflow txs from the deployer wallet) plus a $0.005 burn reads as a burn-% toy. Proof of Ship, with real paid bounties and 100 WIF burned, and Sherwood, with real buyback txs, beat it on "real reason to use $wif" (strategy-density HIGH / MED-HIGH).
3. **Lost the vote and the lane.** Furnace had no action for holders, so it pulled almost no community votes. Underfoot (same stock-under-WIF lane) took the stock-token mindshare, and judges merged the two in memory.
4. **The fork replay was called fabricated state.** To show any burn in the video we replayed ASML's Oct 27 step on a fork and labelled it. The judges' takeaway was "the only working burn is a simulation" (U7 last-resort became the plan).
5. **A thin build for a "be extensive" ruling.** Furnace is the smallest build (FORGE). Against the Dami ruling of ≥4 load-bearing mechanisms (concerns snapshot [C]), locker-weighting had no yield to distribute (demo-scripts earned-state table: "no meaningful state"), so in practice only 3 mechanisms were live.

## 3. RISK REGISTER
| risk | severity | likelihood | impact | mitigation |
|---|---|---|---|---|
| No multiplier step on any held ticker during Nov 10–16. COST already stepped Nov 2, AAPL has nothing pending (§0). | CRITICAL | HIGH | The hero beat and Ignition both void, and U7 fails | Hold a **multi-ticker basket** chosen from rhj-corp-actions entries whose processDate is Nov 18–27 (SIMO 11-19, FIX 11-23, GEV 11-24, HWM/CTSH 11-25, CCL 11-27), so their steps likely fall around Nov 8–16 given the observed 8–11 d lag. Each still needs a dust fill and a pool. Run a log-watcher keeper on all of them. Still probabilistic. |
| The flywheel does not close: own seeded pool, no organic inflow, burn doesn't feed inflow | HIGH | HIGH | Criterion B scored low | Reframe as a pipe plus per-$1M math, or merge into Keel's demand layers. No full fix within an $18 budget. |
| Dust scale (≈$0.005 per step) makes "furnace" visually absurd | HIGH | CERTAIN | Pitch credibility | Show per-$ unit economics ("$1M treasury → X WIF/yr") on a recomputed view and never show the raw dollar burn as the headline. That is cosmetic, not a cure. |
| Dominated by Keel (subset) | HIGH | HIGH | Warroom picks it only by mistake | Fold it into Keel as layer 3. |
| Underfoot twin perception | MED | MED-HIGH | Novelty and memorability | A one-line differentiator ("yield, not redemption"). Weak in a 3-minute window. |
| Passive holders mean no vote mobilization | MED | HIGH | Community seat lost | Badge race, but that conflicts with the keeper (below) |
| Badge vs keeper contradiction | MED | CERTAIN if both ship | Design incoherence that a judge would spot | Keeper delay window (for example, humans get the first N minutes), which adds its own griefing surface |
| `harvest()` spot buy is sandwichable | MED | MED (low value at dust) | Whitehat finds it in minutes | Burn yield-sold USDG via a Chainlink-banded min-out, or burn a WIF skim raw (FORGE's Keel condition) |
| Stock dust fill for COST/basket names fails on thin pools | MED | MED (NVDA verified at +0.16% in TF3, COST and others unverified) | The treasury cannot be built at all | One real ~$0.50 fill per ticker before forge (demo-scripts:266) |
| Geofence (rule 14) on a stock-treasury frontend | LOW | MED | Rule compliance | Frontend geofence |

## 4. VETO CHECK
**Veto: NO, but only narrowly. Furnace should be demoted or merged, not picked standalone.**
The CRITICAL risk (no step in the window) is real and just got worse with §0, but it is partially mitigable: a basket of names with late-Nov processDates gives a probabilistic step in Nov 10–16, and the ASML Oct 27 fork replay keeps the math demonstrable. What is **unmitigable within budget** is structural: dust scale plus a non-closing inflow loop means criterion B (a flywheel that holds up) cannot be earned. That is a severe weakness, not a hard rule violation, so it is not a veto. Hard kill-trigger: if no held ticker shows a pending `newUIMultiplier` or a fresh `UIMultiplierUpdated` by the internal cutoff (Nov 12 morning WAT), drop the "live ignition" claim entirely.

## 5. DELIBERATION FAILURE MODES DETECTED
- **Research Neglect.** "Next real dividends COST 2026-11-13, AAPL 2026-11-16" was carried as *verified* into the brief and into the Ignition mutation. Nobody cross-checked processDate semantics against the onchain `UIMultiplierUpdated` logs, which were reachable in one `cast logs` call. The raw file that disproves it (rhj-corp-actions.json, ASML's 8-day lag) was already in research/raw.
- **Premature Convergence (partial).** Pool-gates passed Furnace "pass-with-risk" on an explicitly *unverified* AAPL ex-date assumption (pool-gates.md:68), and the fact-check verified ASML's step history without verifying the *forward* step for any held ticker. The gauntlet drew blood on scale but missed the timing fault that kills the climax.
- **Eloquence Over Evidence.** The case for Furnace rests on one sentence ("real-company dividends burn $WIF", L3). Its supporting evidence is a single past ASML step worth $0.78/$1k, and the mutation re-verdict upgraded it to "thin" on a future event that no source actually established.
- **Not detected:** Sycophancy (R0 spread 1.3, scores stable), Echo Chamber (Furnace is #3, not unanimous), Conformity (WILD ranked it last-but-one with a twin attack), Scope Fantasy (smallest build; scope is not its problem).

### Adjudication
No vetoes. TF R1/R3 CRITICAL fixed via D6 (AMEND-2, Dami). FACT CORRECTION: dividend live beats were wrong (COST already stepped Nov 2; AAPL none pending). Anti-sycophancy: TF re-score ordered.

## Re-score R1 (anti-sycophancy)
# R1-TOKEN: independent re-score, written to resist sycophancy (TOKEN, $WIF Utility Economist), 2026-11-10

| Idea | A: Real reason to use $WIF (34%) | B: Flywheel holds up (33%) | C: Works & built well (33%) | Weighted avg |
|---|---|---|---|---|
| X: Terra Firma (base + AMEND-1 + AMEND-2) | 5.0 | 5.0 | 6.5 | **5.50** |
| Y: Crew | 4.5 | 4.0 | 4.0 | **4.17** |

**Delete-test, run explicitly**
- **X:** If you delete $WIF, Hindsight, the convert, the router and the Jar all still work for users. The only thing that disappears is the staker class, and the fee could be rebated to users instead. So AMEND-2's claim that the product "collapses" is overstated. It passes only as a revenue-share claim, which is a coherent role but not one only $WIF can fill.
- **Y:** If you delete $WIF, the vouch bond can be posted in USDG, voting can be weighted by shares, and proposal burns are just fees. Crew passes the delete-test more weakly than X does.

## Rationale (TOKEN lens)

I traced each WIF from where it is bought to where it leaves:
- **X** has two demand sources that are not speculative: a capped buy-and-burn, and staking to earn real stock. This is better than the burn-plus-discount version I would have scored 3. Holding WIF to get a share of real equities is a sentence the WIF team can repeat.
- **X's weakness:** the stream's yield comes from router volume, and that volume starts at about zero. Each routed trade pays the hook's 1.04%, plus the protocol fee, plus the sweep. So stakers earn stock from fees that are dust, and the loop holds only if the savings sweep brings in real users. Its legal optics (stake a token, get paid equities) need the geofence and plain wording.
- **X on C:** its parts are fact-checked (the hooked pool, the NVDA fill, Chainlink history) and its scope is now 4 mechanisms, so it is buildable.
- **Y:** its $WIF role is a bond that could be in any token, plus voting where locked WIF decides, so outside money can steer friends' savings. Its retention loop can't resolve before Dec 3, it has a sybil faucet, Pave already holds the vouch wedge, and it has the largest scope.

Neither idea makes $WIF irreplaceable. X comes closer and is the one that can actually ship.

**Pick: X (Terra Firma). Condition:** cap the staker stream at 50% of the fee pool, take the burn first, and show real routed-fee numbers rather than projections.

# R1-LOOP — independent re-score (Retention & Flywheel lens) | 2026-11-10
Scored on merits; operator reshaping (AMEND-1/2) earns no credit unless it changes the human loop.

| Idea | A Real reason for $WIF (34%) | B Flywheel holds up (33%) | C Works & built well (33%) | Weighted avg |
|---|---|---|---|---|
| X Terra Firma (base + AMEND-1 + AMEND-2) | 5.5 | 4.5 | 6.0 | **5.33** |
| Y Crew | 6.0 | 5.5 | 4.0 | **5.18** |

## Rationale
**Terra Firma.** AMEND-2 fixes the delete test on paper: "stake $WIF, earn real stocks" makes WIF a revenue claim. But the revenue is a fee on router volume. The user who would pay that fee is Kemi, who already trades memes on the plain Uniswap UI, and that UI is cheaper (hook −1.04% plus our fee plus the sweep). Run the loop with 10 users and zero hype: the fee pool is dust and stakers earn dust stock, so A is real in structure but nominal in practice. The Hindsight card is a strong acquisition hook and is shareable, but it is one-shot. With Friend Jars and the streak cut to stretch, nothing pulls Kemi back next Tuesday except her own sweep. The engineering is the cleanest in the room: 4 mechanisms, with the WIF/ETH and NVDA pools verified.

**Crew.** Crew has the only true "bring someone" loop: lock WIF behind a friend. That gives WIF a social job and a human reason to hold it. However, the payoff (the vouch resolving) cannot happen before judging, there is no real crew in evidence, Pave already owns the vouch wedge, and C is the weakest of the finalists.

**Pick: X, narrowly.** This holds only if staker payouts are shown honestly and the router is pitched as savings, not as a volume engine.

# R1 — FORGE re-score (independent, anti-sycophancy) | 2026-11-10

| Idea | A Real reason $WIF (34%) | B Flywheel holds (33%) | C Works & built well (33%) | Weighted |
|---|---|---|---|---|
| X Terra Firma (base + AMEND-1 + AMEND-2) | 5.5 | 4.5 | 6.0 | **5.34** |
| Y Crew | 5.0 | 4.0 | 4.0 | **4.34** |

**Pick: X (Terra Firma), with the conditions below.**

## Rationale
I am not handing X this score because it was reshaped. AMEND-2 earns real points: $WIF passes the delete test (no stake, no stock stream), and the scope is down to 4 mechanisms. It still caps at A 5.5 and B 4.5. Stake-for-revenue is a familiar pattern, and the revenue is router fees on a venue anyone can bypass. The direct Uniswap path is cheaper, because the third-party hook already takes 1.04%. Only users who want the sweep will route through X, so the stock stream to stakers is dust at launch. Staking does not create volume, so the loop is open.

C is 6. Every value read is Chainlink-bounded, and the fills are verified (NVDA +0.16%). Residual risks:
- an owned `afterSwapReturnDelta` hook sits on the WIF venue;
- WIF buys cannot be min-out priced, so they need a per-block cap plus an anyone-callable keeper;
- the `/USD` feed goes stale on weekends, so use the 24/7 feed.

Crew's vouch can't resolve before judging. Its demo also shows the sybil farm it claims to stop, and it has the largest build surface.

**Top exploit (X):** just-in-time staking. Stake WIF immediately before `distribute()`, take the pro-rata stock, and unstake. **Fix:** Synthetix-style `rewardPerToken` streaming over each epoch, plus a 1-epoch unstake delay. Add a Foundry invariant: total claims ≤ stock held.

# R1 — WILD re-score (Spectacle & Crowd Contrarian) | 2026-11-10
Independent re-score. Terra Firma judged as CURRENT design (base + AMEND-1 + AMEND-2), not on inherited parent scores.

| Idea | A Real reason for $WIF (34%) | B Flywheel holds up (33%) | C Works & built well (33%) | Weighted avg |
|---|:-:|:-:|:-:|:-:|
| X Terra Firma (AMEND-2) | 5.5 | 4.5 | 6.0 | **5.34** |
| Y Crew | 5.0 | 4.0 | 3.5 | **4.17** |

**Pick: Terra Firma** — conditional on the Hindsight card staying the headline and the WIF stake being proven with earned onchain state, not slides.

## Rationale
The room's consensus is that AMEND-2 "fixed A". I only half agree. "Stake $WIF, earn real stocks" passes the delete test on paper. On CT, though, it reads as the median real-yield staking pitch, and it sits one tile away from Underfoot ("burn WIF for a stock floor"). In the gallery, a judge sees two "WIF → stocks" entries. The stream to stakers is also funded by router fees with no organic volume (the hook takes −1.04%, plus our fee). So B is still "burn % with a stock garnish" until real stock shows up in a staker's Jar on Blockscout.

What the field cannot copy by Nov 12 is the Hindsight card, "what your memes cost you in NVDA". It is legible in one line, a screenshot, and native to CT. Lead with it, with WIF excluded.

Crew's line, "your group chat owns NVDA", has the higher ceiling on spectacle. But its WIF beat (the vouch) can't resolve before Dec 3, Pave already holds that wedge, and the demo crew is the builder's own wallets, which is sybil theater in front of a whitehat judge. Crew is high-novelty and hollow; Terra Firma is legible and buildable.

### Selection: Terra Firma (user_override + unanimous R1 re-score 5.37 vs Crew 4.46). YC PQ 4/6.
- [SKILL] standalone run: wrote warroom.boundary=0 (ledger did not exist at warroom dispatch; the single event is this run's winner-feasibility review).
- STAGE-0 open_decisions ratified by Dami (all 8) → answer-checkpoint recorded.
- AMEND-3 (connect wallet) + AMEND-4 (primary user, how-ratification) recorded in gen/terra-firma-spec.md; WINNER-BRIEF Thesis AMEND-1 (hero flow).
