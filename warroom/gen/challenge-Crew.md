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
