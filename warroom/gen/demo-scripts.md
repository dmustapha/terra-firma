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
