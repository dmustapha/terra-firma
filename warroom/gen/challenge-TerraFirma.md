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
