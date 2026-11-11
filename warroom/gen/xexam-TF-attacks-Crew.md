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
