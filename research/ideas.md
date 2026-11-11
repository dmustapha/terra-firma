# World is Flat Hackathon — Ideas
## Selected: [AWAITING WARROOM DELIBERATION]

## Pool Stats
- **Raw ideas by generator:** G1 7 · G2 7 · G3 7 · G4 7 · G5 6 = 34. After merging duplicates, 17 unique.
- **Hybrids:** 5 (Keel, Crew, Rearview Raft, Bellwether, Orchard).
- **Late entrants:** 4 [SEED] + 1 [HISTORY].
- **Pool entering the gates:** 27.
- **Kills per gate:** Gate 0 = 0 · Gate 1 = 9 · Gate 1b = 1 · Gate 2 = 2 · Gate 3 = 0 · Gate 5 = 0 (12 total). 15 ideas survive.
- **Levers mapped:** 43/47 (8.5% unmapped).
- **Process:** regen rounds 0 · rescued 1 (Fair Mark, now a layer inside Bellwether) · presented 5 · ceiling_ok true.
- **Injection:** lint pass · quota 3/1/2/10.

## Presented Pool

### #1: Keel — Every $WIF trade leaves you real stock, and every dividend that stock pays burns $WIF.
**Score:** 21/25 — Ship [3] | Demo [4] | Sponsor [5] | Novel [4] | Memorable [5]

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

**Origin:** hybrid H1. Its parts come from Silt (G3), Dividend Furnace (G4, with harvester math from G2 and G5) and Ironweek/Hold the Line (G3/G1).

**Mobilization:** first voters are WIF traders routed through the hook; the first 50 G.O.A.T. voters get a "first jar" settle. Between rounds, the "stock owned by WIF traders" and "WIF burned by source" counters rise.

### #2: Rearview — Your memes vs NVDA, proven onchain, then fixed in one tap.
**Score:** 21/25 — Ship [4] | Demo [5] | Sponsor [3] | Novel [4] | Memorable [5]

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

**Origin:** merge of Regret Ledger (G1), Should've Bought NVDA (G2), Rearview (G3) and Counterfactual (G4).

**Mobilization:** pre-generated public cards for the top G.O.A.T. voter wallets, tagged on X. Between rounds, cards minted and regret converted rise.

### #3: Dividend Furnace — Real-company dividends burn $WIF.
**Score:** 20/25 — Ship [4] | Demo [3] | Sponsor [5] | Novel [4] | Memorable [4]

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

**Origin:** merge of Dividend Furnace (G2), Dividend Furnace (G4) and Multiplier Mill (G5).

**Mobilization:** about 1.45K WIF holders benefit from the burns, but passively. Between rounds the treasury NAV grows and the ignition countdown runs. The risk is that passive beneficiaries may not show up to vote (medium).

### #4: Ex-Date Guard — The stock-pool hook that can't be picked off at splits, dividends or weekends.
**Score:** 18/25 — Ship [3] | Demo [3] | Sponsor [5] | Novel [5] | Memorable [2]

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

**Origin:** merge of Ex-Date Guard (G2) and Bellhook (G5).

**Mobilization:** stock LPs plus the infra and security judges. Between rounds, the "arb attempts blocked / WIF burned" counter rises. **format_risk:** LPs are not WIF voters.

### #5: Crew — Own real stocks with your group chat; bring a friend in by betting $WIF they'll stay.
**Score:** 19/25 — Ship [3] | Demo [4] | Sponsor [4] | Novel [4] | Memorable [4]

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

**Origin:** hybrid H2, combining Cap Table (G2), Vouch (G3) and Hold the Line (G1). It subsumes Potluck, Squad Shares and Ticker Club.

**Mobilization:** each crew is a voting bloc of 3–10 WIF wallets. Seed 3 crews: WIF core TG, RH builders and Dami's circle. Between rounds, crews live, AUM and retained vouches rise.

## Brief-Utilization Map
| Lever group | Levers | Mapped | Unmapped (reason) |
|---|---|:-:|---|
| Native primitives | Stock Tokens, ERC-8056, Chainlink feeds/24-7/historical, $WIF burn, v4 hooks, aggregator hooks, 4337, 7702, embedded wallets, USDG, Morpho, Quicknode API, GetBlock, WifVote, RH REST API, tokenization window, `oraclePaused` (19) | 18 | WifVote (organizer-owned; mobilization tactic only) |
| Pain quotes | Q1–Q8 (8) | 5 | Q3 Arena tie-breaks (entrant-internal), Q7 review lag (process), Q8 listing bug (platform) |
| Judge appetites | Vasily legibility, WIF thesis, Ogle security, Sahil/Quicknode, Vasily/GetBlock, glabuz retail, Niro/Zou TradFi (7) | 7 | — |
| Prize levers | one-prize multi-tag, community seat, perks, low-density tracks (4) | 4 | — |
| Whitespace / missing / portability | W1–W5, M1–M4, P1–P3 (9) | 9 | — |
| **Total** | 47 | 43 | **4 (8.5%)** |
(The per-lever mapping is in warroom/gen/pool-gates.md, Gate 4.)

## Killed Ideas
| Name | Origin | Gate | Cause |
|---|---|---|---|
| Equity Floor | G5#1 | 1 | already_built (Underfoot) |
| Shareholders League | G5#5 | 1 | saturated (fantasy stock leagues) |
| Stock Envelope | G5#6 | 1 | already_built (WIF Gift / FLAT//RELAY) + GhostPay adjacency |
| Prize Jar | [SEED] | 1 | broken_dependency (no onchain randomness) |
| Family Stock Lock | [SEED] | 1 | zero_alignment |
| Shipshare | [SEED] | 1 | already_built (Proof of Ship) |
| Stock Backstop | [HISTORY] | 1 | already_built (Lastbell) + self-dup (SolvencySwap) |
| Paid in Shares | G2#6 | 1 | C9 / WIF not load-bearing |
| Closing Cross | G5#4 | 1 | C13 (no organic two-sided flow) |
| WIF Fair Mark | G1#4 | 1b | not_ecosystem_native → rescued as a layer in Bellwether |
| Rescue Raft | G1#7 | 2 | demo_unearnable |
| Rearview Raft | H3 | 2 | demo_unearnable |

The following ideas survived but were not presented, and are available to the deliberation: Silt 20, Potluck 19, Vouch 19, Orchard 19, Ballast 19, Bellwether 18, Splitleaf 18, Flat Index 17, Ironweek 16, Selfpay 15.
