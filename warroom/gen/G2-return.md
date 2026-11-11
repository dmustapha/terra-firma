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
