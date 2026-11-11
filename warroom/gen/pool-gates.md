# POOL GATES — WIF Warroom V1 (2026-11-10)
The pool is the 27 ideas from synthesis.md. Competitor evidence comes from roster.csv, gh-extra.tsv, strategy-density.md and updates.md. Every claim is file-sourced; no network calls were made.

## Gate 0 — injection-contract pre-pass
All 27 ideas carry primitive(s) adapted and a law-check. The G5 ideas carry "none — clean-room origin"; the hybrids and late entrants were backfilled in synthesis §2–3. **0 kills.** Injection lint: pass.

## Gate 1 — Kill List + [C] checks
### 1a. Kill List
| Idea | Verdict | Evidence |
|---|---|---|
| Equity Floor (G5#1) | **KILL already_built** | Underfoot is in roster.csv: "A floor of Stock Tokens under every $WIF. Burn WIF, take your slice" (37 commits) |
| Shareholders League (G5#5) | **KILL saturated** | Fantasy stock leagues are already taken by WIF League, Flat Street and Stock Fair, plus Fallpit, wifpool and kerdo in prediction. Keeping the stocks is a twist, but the lane is clone-tier (primitives F10, L6) |
| Stock Envelope (G5#6) | **KILL already_built** | WIF Gift and FLAT//RELAY already do send-as-link with gas-free claims. The idea also overlaps GhostPay payment links (C15) |
| S1 Prize Jar [SEED] | **KILL broken_dependency** | It needs a prize draw, but prevrandao is constant on RH (research-brief Tech Deep Dive) |
| S2 Family Stock Lock [SEED] | **KILL zero_alignment** | $WIF has no load-bearing role, which fails per-hackathon [C] rule 3 |
| S3 Shipshare [SEED] | **KILL already_built** | Proof of Ship already funds RH builders with $WIF (HIGH threat), and builder revenue to share is about 0 |
| H-1 Stock Backstop [HISTORY] | **KILL already_built + self-dup** | Lastbell already does stock stop/limit orders, and the shape is a self-duplicate of SolvencySwap (C15) |
| Others | pass | No saturated match. No dependency on a WIF feed, prevrandao, minting or Data Streams. Not built by any entrant |

### 1b. [C] checks (survivors of 1a)
C3 = uniqueness vs the 49-entrant scan. C5 = named real humans. C9 = significant problem + builder conviction. C13 = day-1 users today.
| Idea | C3 uniqueness | C5 named humans | C9 problem + conviction | C13 day-1 users | Verdict |
|---|---|---|---|---|---|
| Silt | No entrant routes hook value to user stock ownership; Sherwood's hook burns for a game. sparejar does round-ups to stock on GitHub but is not an entrant | WIF traders: the ~1,454 G.O.A.T. voters, plus @Allthinks2's onboarding-pain voice | "Built for stocks, memecoins took over" is RH's top narrative split; Dami trades WIF himself | Yes: ~1.2K WIF transfers/day already happen | pass |
| Ironweek | No retention or commitment entrant. SEMALAM admits "0 players" | SEMALAM's @edycutjong (0 players), @Wazir_____ (engagement quote) | Retention is the rubric's "flywheel that holds up"; conviction medium | Medium: cohort must be recruited now (G.O.A.T. voters) | pass |
| Potluck | No collective-ownership entrant. The burn-ballots (Flat Ballot, flatboard, ORBRUSH) move no assets | WIF TG/Discord groups, Dami's circle | M3 unserved; investment clubs are a real off-chain behavior | Medium: friend groups exist, but each club must be formed | pass |
| Rearview | No self-analytics entrant. The prediction cluster bets forward; this looks backward | Any RH wallet holder, e.g. the public degen wallets on CT | Meme losses are universal on RH (memecoin volume down 96%) | Yes: every RH wallet with history can run a card now | pass |
| Dividend Furnace | No dividend-to-WIF entrant. Underfoot is a redemption floor, not a yield burn | ~1.45K WIF holders as beneficiaries | A non-hype burn source is what "flywheel holds up" asks for | Yes for holders and traders via the hook; passive users | pass |
| Vouch | Inverts WIF Gift/Flat Relay (no consequence) and WIF Paymaster (gas only). Pave is social credit, not onboarding | SEMALAM 0 players; Discord "submitted… not showing" users are builders, not targets | Onboarding is the lowest-density track; conviction high | Yes: WIF holders with non-crypto friends (Dami's circle in Nigeria) | pass |
| Flat Index | No index entrant. Inverts the fantasy leagues | Fantasy-league audiences (WIF League etc.) | Medium problem: index access for non-US retail | Medium | pass |
| Ex-Date Guard | Sherwood is the only hook entrant and is a game. No stock-pool LP protection exists | RH stock LPs (unnamed individuals). Weak | Real: thin stock AMM liquidity is a documented chain constraint | Weak: few stock LPs, and Dami seeds the liquidity | pass (flag) |
| WIF Fair Mark | No entrant offers a WIF oracle. Arena's SECURITY.md admits spot-price use | WIF Agent Arena (@3amer_osama) quote #2 | Real across entrants | Yes: entrants pricing off spot | pass |
| Rescue Raft | No collective-exit entrant. Lastbell is per-user stops | Holders of dead RH memes (unnamed) | Real (scams, vanishing tokens) | Unclear | pass → Gate 2 |
| Paid in Shares | Unique | Nigerian freelancers in Dami's circle | Real, but WIF is a fee/waiver skin, failing [C] "WIF load-bearing" | Weak | **KILL (WIF not load-bearing / C9)** |
| Splitleaf | Games are HIGH density (21), but no 2D portfolio-as-game entrant | glabuz-type retail gamers | Medium | Medium | pass (density penalty) |
| Ballast | Composite of Silt, Ironweek and Vouch; unique as a composition | As components | As components | As components | pass |
| Closing Cross | Unique mechanism | No named humans: stock-token traders are not WIF voters | Real (thin liquidity) | **Fails**: the two-sided flow would be builder-sourced (G5's own U7 note) | **KILL C13** |
| H1 Keel | Unique (see Silt + Furnace) | WIF traders + holders | High | Yes | pass |
| H2 Crew | Unique | WIF TG groups + their non-crypto friends | High | Medium-yes | pass |
| H3 Rearview Raft | Unique | As Rearview + Raft | Real | Unclear | pass → Gate 2 |
| H4 Bellwether | Unique: no WIF-quoted stock pools | WIF holders wanting a direct stock rail | Medium | Weak-medium | pass |
| H5 Orchard | Unique 2D grammar | Retail gamers + WIF traders | Medium | Medium | pass |
| S4 Selfpay | No Morpho entrant | Unnamed stock holders | Medium | Weak | pass |

**Gate 1 kills: 9.** Equity Floor, Shareholders League, Stock Envelope, S1, S2, S3, H-1, Paid in Shares, Closing Cross.

## Gate 1b — ecosystem-native & load-bearing
Check #1 (native problem) is relaxed by the Tenor carve-out. Check #2 asks for a one-sentence description that does not name the primitive. Check #3 is grounded vs gimmick. Check #4 is a concrete demo with real value.
| Idea | #2 pivotal primitive (describe without it → still works?) | #3 grounded | #4 concrete demo | Verdict |
|---|---|---|---|---|
| WIF Fair Mark | "A clamped multi-pool TWAP for a thin token." It ports unchanged to any memecoin on any v4 chain, so no RH-only primitive is pivotal (fails U6) | yes | yes (refusal) | **KILL not_ecosystem_native** → Gate 8 |
| Silt / Keel / Orchard | Without Stock Tokens + ERC-8056 + Chainlink equity feeds, it becomes "a hook that skims to a stablecoin jar," a different product | yes | yes | pass |
| Dividend Furnace | Without ERC-8056 there is no dividend event to harvest | yes | conditional (needs a multiplier step) | pass |
| Ex-Date Guard / Bellwether | Without `effectiveAt`, `oraclePaused` or the tokenization window, the hook has no inputs | yes | yes | pass |
| Rearview / H3 | Without equity Chainlink historical rounds on the same chain, it is regret you can't act on | yes | yes | pass |
| Potluck / Crew | Without Stock Tokens, it is a crypto DAO treasury | yes | yes | pass |
| Vouch | Weak: "bond a referral, the newcomer gets a stablecoin" still works; the share payload is the wedge, not the mechanism | yes | yes | pass (weak) |
| Ironweek | Weak: a streak bond on any asset works; share-denominated goals (ERC-8056) and session gating carry the depth | yes | yes (epochs must elapse) | pass (weak) |
| Flat Index / Splitleaf / Ballast / Rescue Raft / S4 | Stock Tokens + Chainlink NAV, or ERC-8056 events, are pivotal | yes | yes | pass |

**Gate 1b kills: 1** (WIF Fair Mark).

## Gate 2 — Demo Test (3-min solo, earned state, U7)
| Idea | Verdict | Note |
|---|---|---|
| Rescue Raft | **KILL demo_unearnable** | Needs a real dying meme with ≥3 real depositors before Nov 12. Dami's dust plus 3 of his own wallets is a fabricated counterparty, which contradicts the core claim (fair exit for holders) |
| H3 Rearview Raft | **KILL demo_unearnable** | Inherits the raft dependency. Without the raft it collapses back into Rearview |
| Dividend Furnace | pass-with-risk | The harvest beat needs a real ERC-8056 multiplier step after deposit, between Nov 10–16. **Verify a pending `newUIMultiplier`/`effectiveAt` on a held ticker before forge.** AAPL has historically gone ex-dividend in early-to-mid November (assumption, unverified). Fallback is a fork replay, which is U7 last-resort. Swap→treasury→NAV beats are earned regardless |
| H1 Keel | pass | Hero beats (swap → jar → settle revert → burn) are earned from real swaps. The dividend harvest is a secondary beat with the same dependency as Dividend Furnace |
| Splitleaf / H5 Orchard | pass-with-risk | The split/fruit visual needs a real corporate action. Watering and seed-burn beats are earned |
| Ironweek | pass-with-risk | Forfeit demo needs a real lapsed epoch. Start the cohort Nov 10–11 with short (1-day) demo epochs |
| S4 Selfpay | pass-with-risk | Morpho borrow is earnable; "dividend repays loan" needs a dividend step |
| Others | pass | |

**Gate 2 kills: 2.**

## Gate 3 — scores (/5 raw; floor <12)
| Idea | Origin | Ship | Demo | Sponsor | Novel | Memorable | **Total** |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **H1 Keel** | Hybrid G3+G4(+G2/G5)+G3/G1 | 3 | 4 | 5 | 4 | 5 | **21** |
| **Rearview** | Merge G1/G2/G3/G4 | 4 | 5 | 3 | 4 | 5 | **21** |
| **Dividend Furnace** | Merge G2/G4/G5 | 4 | 3 | 5 | 4 | 4 | **20** |
| Silt | Merge G1/G3/G4 | 4 | 5 | 4 | 3 | 4 | **20** |
| **H2 Crew** | Hybrid G2+G3+G1 | 3 | 4 | 4 | 4 | 4 | **19** |
| Potluck | Merge G1/G2/G3/G4 | 3 | 4 | 4 | 4 | 4 | 19 |
| Vouch | Merge G1/G3/G4 | 4 | 4 | 4 | 3 | 4 | 19 |
| H5 Orchard | Hybrid G4+G3 | 3 | 4 | 4 | 4 | 4 | 19 |
| Ballast | G3#7 | 3 | 4 | 5 | 3 | 4 | 19 |
| **Ex-Date Guard** | Merge G2/G5 | 3 | 3 | 5 | 5 | 2 | **18** |
| H4 Bellwether | Hybrid G5+G2+G1 | 3 | 3 | 5 | 4 | 3 | 18 |
| Splitleaf | G4#6 | 3 | 3 | 4 | 4 | 4 | 18 |
| Flat Index | Merge G2/G3 | 3 | 3 | 4 | 4 | 3 | 17 |
| Ironweek | Merge G1/G2/G3/G4 | 4 | 3 | 3 | 3 | 3 | 16 |
| S4 Selfpay | [SEED] | 3 | 2 | 4 | 4 | 2 | 15 |

Scoring notes:
- Novel is capped at 3 where 3+ generators converged with no added mechanism (Silt, Vouch, Ironweek; L12), and also for sparejar (Silt) and the WIF Gift/Paymaster adjacency (Vouch).
- Ex-Date Guard gets Novel 5: no generator or entrant touches the corporate-action/session calendar.
- Memorable 2 means an LP-protection revert is cerebral, a high explanation cost under L14.
- Rearview gets Sponsor 3: its WIF role is burn-per-publish/convert, the thinnest flywheel among the top scorers.

**Gate 3 kills: 0** (all ≥12).

## Gate 4 — brief-utilization map
| # | Lever | Exploited by | 
|---|---|---|
| 1 | Stock Tokens (203) | Keel, Crew, Rearview, DF, all |
| 2 | ERC-8056 multiplier | Keel (yield split), DF (harvester), Ex-Date Guard (ex-date sentinel) |
| 3 | Chainlink stock feeds | all (bounded settle/NAV) |
| 4 | Chainlink 24/7 feeds | Ex-Date Guard (weekend band), Keel (weekend settle) |
| 5 | Chainlink historical rounds | Rearview |
| 6 | $WIF burn | all |
| 7 | Uniswap v4 hooks | Keel, Silt, Ex-Date Guard, Bellwether |
| 8 | Uniswap aggregator hooks (newest, L5) | Keel/Silt (communal jar credit for aggregator routes) |
| 9 | ERC-4337 sponsorship | Crew, Vouch |
| 10 | EIP-7702 | Ironweek (capped standing order) |
| 11 | Embedded wallets (Privy/ZeroDev) | Crew, Vouch |
| 12 | USDG | all |
| 13 | Morpho stock collateral | S4 Selfpay (pool, not presented) |
| 14 | Quicknode Stock Token API | DF (dividend calendar), Splitleaf/Orchard (split events) |
| 15 | GetBlock RPC/streams/Market SQL | Rearview (indexer) |
| 16 | WifVote | **no idea found**: organizer-owned contract; usable only as a mobilization tactic, not a product lever |
| 17 | RH REST prices/corp-actions API | Ex-Date Guard, DF (UI reconciliation) |
| 18 | Tokenization window / tradingCapabilities | Ex-Date Guard, Ironweek (session gate) |
| 19 | `oraclePaused()` | Ex-Date Guard, DF (harvest block) |
| 20 | Pain Q1 SEMALAM "0 players" | Crew, Ironweek, Vouch |
| 21 | Pain Q2 Arena spot-price | Ex-Date Guard, Bellwether (Fair Mark layer) |
| 22 | Pain Q3 Arena tie-breaks | **no idea found**: internal to one entrant's game design |
| 23 | Pain Q4 bridging/gas/pool friction | Crew, Vouch |
| 24 | Pain Q5 engagement/retention | Crew, Ironweek, Keel (hold bond) |
| 25 | Q6 "a few minutes to understand it" | Rearview, Keel (one causal sentence) |
| 26 | Pain Q7 review lag | **no idea found**: organizer process (handled by submit-early) |
| 27 | Pain Q8 "not showing in Projects" | **no idea found**: organizer platform bug |
| 28 | WIF thesis "developers, virtual economy, real-world finance" | Keel |
| 29 | Security judge Ogle | Ex-Date Guard, Keel (ownerless, bounded) |
| 30 | Sahil / Quicknode | DF |
| 31 | Vasily / GetBlock | Rearview |
| 32 | glabuz gaming/retail | Orchard/Splitleaf (pool), Crew |
| 33 | Niro/Zou TradFi legibility | Crew |
| 34 | One prize, multi-tag | Keel (hooks&defi + Stock Tokens + consumer) |
| 35 | Community vote seat (burn-weighted) | Rearview (share cards), Crew (voting blocs) |
| 36 | Quicknode/GetBlock perks | DF, Rearview |
| 37 | Low-density tracks (onboarding, Stock Tokens) | Crew, Vouch, Keel |
| 38 | W1 everyday ownership | Keel, Crew |
| 39 | W2 zero-crypto → first share | Crew, Vouch |
| 40 | W3 non-speculative retention | Crew, Ironweek |
| 41 | W4 v4 hook to the WIF flywheel | Keel, Silt |
| 42 | W5 security-legible primitive | Ex-Date Guard |
| 43 | M1 meme → RWA automatically | Keel, Rearview |
| 44 | M2 gift a share to a walletless friend | Vouch, Crew (invite) |
| 45 | M3 group ownership decided with WIF | Crew |
| 46 | M4 weekly return reason | Ironweek, Crew |
| 47 | P1–P3 portability gaps | Keel, Ex-Date Guard |

**Mapped 43/47. Unmapped 4 (8.5%)**, well under the 40% fail line. **Pool passes.**

## Gate 5 — anti-attractor
House shape (agent + reasoning-hash + dashboard + micropay): **0 ideas**, since no idea uses AI (C-NA1). Pass.

## Gate 6 — spike selection
- Top-3 by total: **Keel 21, Rearview 21**, then a 20-20 tie (Dividend Furnace vs Silt) broken on Novel → **Dividend Furnace**.
- Top-2 by Novel: **Ex-Date Guard (5)**, then a Novel-4 tie among the unpresented (Crew, Potluck, Orchard, Bellwether, Splitleaf, Flat Index, S4) broken on total and then on directive fit → **Crew** (19; it subsumes its parent Potluck and is multi-layer per Dami's directive).
- Top-1 by Memorable: Keel and Rearview (5) are already presented → no addition.
- **Presented = 5:** Keel · Rearview · Dividend Furnace · Ex-Date Guard · Crew.

Mobilization (mandatory line per presented idea):
| Idea | First N voters | What visibly improves between rounds | Flag |
|---|---|---|---|
| Keel | WIF traders who route swaps through the hook (seed: first 50 G.O.A.T. voters get a "first jar" settle) | "Stock owned by WIF traders" + "WIF burned by source" counters from `keel()`; first dividend harvest if one lands | — |
| Rearview | Pre-generated public cards for top G.O.A.T. voter wallets, tagged on X | Cards minted, regret converted to stock, leaderboard | — |
| Dividend Furnace | ~1.45K WIF holders as passive burn beneficiaries | Treasury NAV grows from hook volume; "next ignition" countdown | Passive beneficiaries may not mobilize (medium) |
| Ex-Date Guard | Stock LPs + infra/security judges | "Arb attempts blocked / WIF burned"; second pool added | **format_risk**: LPs are not WIF voters |
| Crew | Each crew is a 3–10-wallet WIF voting bloc; seed 3 crews (WIF core TG, RH builders, Dami's circle) | Crews live, AUM, retained vouches | — |

## Gate 7 — ceiling
Presented ideas with Novel ≥4: Keel, Rearview, Dividend Furnace, Crew (4), Ex-Date Guard (5). **ceiling_ok = true. No regen needed.**

## Gate 8 — rescue (Novel ≥4 ideas that failed exactly one fixable floor gate)
| Idea | Failed | Mutation attempt | Result |
|---|---|---|---|
| WIF Fair Mark (Novel ~4) | Gate 1b #2 (portable) | Keep the clamped multi-pool mechanism, and rewrite its consumer and economics into RH-only stock rails. It becomes the WIF-leg execution bound inside H4 Bellwether (WIF-quoted stock pools) | **RESCUED as a layer** (lives in H4, score 18, not presented) |
| Rescue Raft (Novel ~4) | Gate 2 (unearnable counterparty) | Raft any token the user already holds, and seed the first rafts with real volunteers' dead bags | **FAILED**: ≥3 real depositors before Nov 12 is not credible, and a self-seeded raft violates U7 |
| Closing Cross (Novel ~4) | Gate 1 C13 | Cross WIF sellers against stock sellers so WIF becomes the cross currency | **FAILED**: still needs two-sided organic flow, which does not exist |

## Kill table
| Name | Origin | Gate | Cause |
|---|---|---|---|
| Equity Floor | G5#1 | 1 | already_built (Underfoot) |
| Shareholders League | G5#5 | 1 | saturated (fantasy stock leagues) |
| Stock Envelope | G5#6 | 1 | already_built (WIF Gift / FLAT//RELAY) + GhostPay adjacency |
| Prize Jar | [SEED] S1 | 1 | broken_dependency (no onchain randomness) |
| Family Stock Lock | [SEED] S2 | 1 | zero_alignment (WIF not load-bearing) |
| Shipshare | [SEED] S3 | 1 | already_built (Proof of Ship) |
| Stock Backstop | [HISTORY] H-1 | 1 | already_built (Lastbell) + self_duplication (SolvencySwap) |
| Paid in Shares | G2#6 | 1 | C9 / [C] WIF not load-bearing (fee skin) |
| Closing Cross | G5#4 | 1 | C13 no day-1 users (builder-sourced two-sided flow) |
| WIF Fair Mark | G1#4 | 1b | not_ecosystem_native (#2 portable) → rescued as H4 layer |
| Rescue Raft | G1#7 | 2 | demo_unearnable (fabricated counterparty) |
| Rearview Raft | H3 (G3+G1) | 2 | demo_unearnable (inherits raft dependency) |

Kill counts: Gate 0 = 0 · Gate 1 = 9 · Gate 1b = 1 · Gate 2 = 2 · Gate 3 = 0 · total 12. Survivors = 15. Presented = 5. Rescued = 1.
