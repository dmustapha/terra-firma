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
