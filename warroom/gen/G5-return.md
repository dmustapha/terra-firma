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
