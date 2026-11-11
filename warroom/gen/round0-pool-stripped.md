# Idea pool (random order, unscored)

### Dividend Furnace — Real-company dividends burn $WIF.

**Mechanism:**
1. **Hook inflow.** A v4 hook skims a fixed amount of each WIF/USDG swap in USDG. This feeds the treasury without creating a new venue.
2. **Ownerless treasury.** The treasury holds an immutable basket of Stock Tokens, bought with Chainlink-bounded purchases. It has no withdraw path.
3. **Harvester.** Anyone can call `harvest()`. It computes the new shares created by the ERC-8056 multiplier as raw × (m1−m0), and it is blocked while `oraclePaused()` is set.
4. **Burn.** The yield is sold in capped chunks per block and per epoch, then used to buy and burn WIF. WIF lockers, weighted by lock time, take a share.
5. **Reserve page.** It shows a live balance × Chainlink figure and a dividend countdown from the Quicknode Stock Token API.

**Why this chain (U6):** on RH, a dividend shows up onchain only as an ERC-8056 multiplier step, and the equity feeds include that multiplier. $WIF exists only here. Anywhere else there is no dividend event to harvest.

**3-min demo shape:** swap → treasury tile ticks → NAV recomputed live → `harvest()` burns WIF → a principal-withdraw attempt reverts. **Risk:** the harvest beat needs a real multiplier step Nov 10–16. Verify a pending `newUIMultiplier` before forge; otherwise the beat is a fork replay.

**TASTE lines satisfied:** U1, U2, U3, U6, U7 (conditional), C-DF1, C-NA1.

**Primitive(s) adapted:** F04 + F07 + P2.

**Law-check:**
- L2: draining principal is impossible because there is no withdraw function and no admin.
- L3: "dividends burn WIF" is the whole pitch.
- L11: the strongest axis is B.
- L12: distinct from Underfoot.


**Mobilization:** about 1.45K WIF holders benefit from the burns, but passively. Between rounds the treasury NAV grows and the ignition countdown runs. The risk is that passive beneficiaries may not show up to vote (medium).

### Keel — Every $WIF trade leaves you real stock, and every dividend that stock pays burns $WIF.

**Mechanism:** one hero loop with five load-bearing layers:
1. **Skim hook.** A Uniswap v4 `afterSwap` hook on a WIF/USDG pool skims a fixed amount of each swap into the trader's jar. The trader is identified from `hookData`. Swaps that arrive through an aggregator route go to a communal jar.
2. **Settle.** Anyone can call `settle()`, which converts the jar into the trader's chosen Stock Token. The fill must be at least the Chainlink price × (1−1%) and pass a staleness check. Each settle burns a fixed amount of WIF.
3. **Dividend split.** Each jar's principal (its underlying shares) belongs to the user permanently. Dividends arrive as ERC-8056 multiplier growth, and only that growth counts as yield. A fixed slice of the yield is sold in capped chunks to buy and burn WIF. The rest compounds in the jar.
4. **Hold bond.** A user who locks WIF and commits to N weeks gets a lower skim. If they break the commitment, the forfeit is split: 50% is burned and 50% goes to users who kept theirs.
5. **Proof view.** The contracts are ownerless and verified. A public `keel()` view shows holdings × Chainlink ≥ claims, plus WIF burned by source.

**Why this chain (U6):** it needs v4 hooks (74.5% of RH v4 trades), Stock Token ERC-20s, ERC-8056 dividend multipliers, Chainlink equity feeds (24/7 for four names), USDG and $WIF on one ledger. Only RH 4663 has all of them (P1–P3). Porting it would mean rebuilding every layer.

**3-min demo shape:** the judge swaps 50 WIF on a phone. The jar ticks, and a settle lands as 0.0004 NVDA on Blockscout. A deliberately bad settle (min-out below the band) reverts. Next comes `harvest()`: the multiplier delta since deposit burns WIF ("Nvidia just burned N WIF"); if no real multiplier step happens in the window, this beat is a fork replay and is labeled as one. Then commit to 2 weeks and watch the skim fee drop. It ends on the `keel()` tally.

**TASTE lines satisfied:** U1, U2, U3, U5, U6, U7 (hero beats earned from real swaps), C-DF1, C-CS1, C-NA1.

**Primitive(s) adapted:** F04 + F01 + F03 + F07, plus P2.

**Law-check:**
- L2: principal drain and below-band settles cannot be expressed in the contracts; users risk their own vesting and bond.
- L3 risk: there are five layers, but the pitch is one causal sentence, and layers 4–5 can be cut.
- L11: the strongest axes are A and B.
- L12: "Keel" does not collide with other names. It is distinct from Underfoot, because it has no burn-to-redeem floor.


**Mobilization:** first voters are WIF traders routed through the hook; the first 50 G.O.A.T. voters get a "first jar" settle. Between rounds, the "stock owned by WIF traders" and "WIF burned by source" counters rise.

### Ex-Date Guard — The stock-pool hook that can't be picked off at splits, dividends or weekends.

**Mechanism:**
1. **Ex-date sentinel.** In `beforeSwap`, the hook reads `newUIMultiplier()` and `effectiveAt()`. In a window around `effectiveAt`, swaps at the pre-action price revert with `ExDateBand()`.
2. **Oracle band.** Swaps that land outside a band around Chainlink `latestRoundData` revert (staleness is checked). The band stays tight on the four 24/7 names.
3. **Session fee.** The fee is set by whether the tokenization window is open, by `tradingCapabilities`, by feed age and by `oraclePaused`.
4. **WIF LP bond.** LPs who bond WIF get a fee rebate. The non-rebated fee goes to `burnRound()`, which buys WIF and burns it.
5. **Ownership and tests.** The hook is ownerless, verified, and fork-tested against a real `UIMultiplierUpdated`.

**Why this chain (U6):** ERC-8056 pending-multiplier views, a per-stock 24/7 feed subset, the tokenization window and `oraclePaused` exist only on RH stock tokens. On any other chain, layers 1–3 have no inputs.

**3-min demo shape:** two pools side by side with the same $3 of liquidity. The stale-price arb fills on the unguarded pool and reverts on the guarded one. On a weekend (Nov 14–15), a non-24/7 name shows the fee step-up. `burnRound()` then burns WIF.

**TASTE lines satisfied:** U1, U3, U5, U6, U7, C-DF1, W4, W5.

**Primitive(s) adapted:** F04 + F07 moved into `beforeSwap`.

**Law-check:**
- L2: LPs bond their own WIF, and trading at the pre-action price cannot be expressed.
- L3: the guard is the product.
- L11 risk: the strongest axis is C (built well).
- L14 risk: the idea is cerebral and costly to explain.


**Mobilization:** stock LPs plus the infra and security judges. Between rounds, the "arb attempts blocked / WIF burned" counter rises. **format_risk:** LPs are not WIF voters.

### Crew — Own real stocks with your group chat; bring a friend in by betting $WIF they'll stay.

**Mechanism:**
1. **Club vault.** NAV comes from Chainlink. An allow-list limits holdings, and trades execute after a timelock, inside a band.
2. **Vouch invite.** The inviter locks WIF. The zero-crypto invitee joins by email (Privy, gas sponsored via 4337) and gets first club shares. The inviter's WIF comes back with a bonus if the invitee has 4 weekly deposits; if not, part of it is burned.
3. **Weight.** Voting weight is locked WIF × a deposit-streak factor, so idle members lose influence.
4. **Proposals.** Each proposal burns a fixed amount of WIF.
5. **Ragequit.** A member can ragequit before any execution and leave with their share of the actual stock tokens.
6. **Dividends.** ERC-8056 dividends are credited pro-rata on the cap table.

**Why this chain (U6):** collective ownership of real equities needs Stock Token ERC-20s, Chainlink NAV, USDG, live AA and embedded wallets, and $WIF as the steering token. Without Stock Tokens it becomes a crypto DAO treasury.

**3-min demo shape:** the judge opens an invite on a phone, logs in by email and owns club shares. A member proposes "+10% GOOGL" (WIF burns), the vote passes and executes in band. A hostile 100%-to-junk proposal reverts. A dissenter ragequits holding real NVDA and TSLA. A past vouch shows its bond returned, and a bounced one shows its burn.

**TASTE lines satisfied:** U1, U2, U3, U6, U7, C-DF1, C-CS1, C-NA1.

**Primitive(s) adapted:** F02 + F08 + F03.

**Law-check:**
- L2: a majority can't steal because of ragequit; a sybil invite costs the inviter; proposers burn their own WIF.
- L3: the basket is the product.
- L11: A + B.
- L12: avoid the name "Club".


**Mobilization:** each crew is a voting bloc of 3–10 WIF wallets. Seed 3 crews: WIF core TG, RH builders and Dami's circle. Between rounds, crews live, AUM and retained vouches rise.

### Rearview — Your memes vs NVDA, proven onchain, then fixed in one tap.

**Mechanism:**
1. **Wallet history.** The wallet's RH meme buys are pulled from GetBlock/Quicknode RPC and Market SQL. Blockscout is not used because it sits behind Cloudflare.
2. **Onchain counterfactual.** For each buy, the contract recomputes what the same money would be worth in NVDA, using historical Chainlink `getRoundData`. The round must bracket the buy's timestamp, or the call reverts with `RoundMismatch`.
3. **Verdict card.** Publishing burns WIF and mints a soulbound verdict that stores its inputs. Anyone can call `recompute(tokenId)` to check it.
4. **Convert.** One tap converts memes → USDG → the counterfactual Stock Token, with a Chainlink-bounded leg and a fixed WIF burn.
5. **Standing rule.** An optional rule converts X% of future gains, triggered by a permissionless `poke()` that pays the caller a tip. A 30-day hold pledge with a WIF stake can be added.

**Why this chain (U6):** equity Chainlink historical rounds and buyable Stock Tokens live on the same chain as the user's meme history. That is RH's own split: "built for stocks, memecoins took over."

**3-min demo shape:** the judge pastes a wallet and sees "41 meme buys: −62% / same $ in NVDA: +18%". Editing one line to cheat makes `publish` revert. An honest publish burns WIF. The judge recomputes someone else's card and gets a match, then converts 10% into NVDA.

**TASTE lines satisfied:** U1, U2, U3, U6, U7, C-DF1, C-CS1, C-NA1.

**Primitive(s) adapted:** F05 (market→self) + F07/L15 recompute-not-display + F01 conversion.

**Law-check:**
- L2: a forged card cannot be published, because the verifier reverts.
- L3: the card is the product.
- L11 risk: WIF's role is a burn per publish or conversion, which is the thinnest flywheel in the presented set. The standing rule and the pledge mitigate it.
- L12: avoid the name "Mirror" (Dami collision).


**Mobilization:** pre-generated public cards for the top G.O.A.T. voter wallets, tagged on X. Between rounds, cards minted and regret converted rise.

NOTE (verified fact, applies to any idea with a dividend/multiplier-harvest beat): live RH corporate-actions API shows no stock-token multiplier step pending before 2026-11-12; the next real cash dividends process on COST (2026-11-13) and AAPL (2026-11-16) — i.e. during judging, after the demo video is recorded.
