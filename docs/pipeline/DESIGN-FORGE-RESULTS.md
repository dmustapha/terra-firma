# DESIGN-FORGE-RESULTS.md

status: complete

## What Just Happened
Design-forge turned the Almanac direction into contracts the rest of the pipeline can rely on:
- **DESIGN_SYSTEM.md:** the shipped tokens copied verbatim, the contrast table, the status legend (moss = confirmed, ochre = not active yet or sources disagree, brick = the read failed), number formats, and the share-image spec.
- **brand.json:** used by demo, deploy and package, carrying the invariant phrase "Measured, not estimated."
- **Six design tests:** they keep code and documentation from drifting apart.

The design was then hardened against four independent critiques: a design critic, a technical/accessibility reviewer, a first-time user who checked feature coverage, and a zero-context viewer. One fix round followed:
- A visitor without a wallet now sees a real card instead of being bounced home.
- The Fig. 1 plate shows its key fact ("$15,488.16 lost") in plain words.
- Inner pages no longer share one template.
- Duplicate element ids and the per-second re-render are gone.

The logo is Fig. 1 in miniature: a dashed paid line, an eroded column and a moss bedrock column. It reads at 16px and is exported as SVG, a 512px PNG and a multi-size favicon.

This matters to the thesis because a judge sees the product's honesty claim in the first viewport. Deploy, demo and package now have one brand source to read from.

## Honest Gaps
- The logo is hand-drawn SVG, not a generator output. fal rejected its API key (HTTP 401), and the paid stablestudio route was skipped under Dami's minimal-spend rule. A judged project shipping the SVG fallback has to be surfaced, and this one was.
- Dami has not seen the direction, the logo, or the primary-button colour question (DH-13, moss vs ink buttons).
- Only one persona fix iteration ran. Remaining, logged:
  - the duplicated buy and sell forms in trade-terminal.tsx were not refactored (risky this late in the trade flow);
  - `abi as unknown as Abi` casts drop compile-time checking of contract calls;
  - mobile Lighthouse performance is 80 under simulated throttling (the observed LCP is 186 ms).
- Two shared pipeline tools had real bugs, fixed here and left uncommitted in ~/.claude/skills for Dami's review:
  - **craft-lint.sh:** `pipefail` plus `grep -q` made the CF-4/CF-6 checks fail by mistake, and BSD awk silently disabled CF-7;
  - **design-applied-gate.sh:** a SIGPIPE plus the last file's exit status made present tokens read as absent.
  Each fix was planted-red verified, and their test suites match the pre-fix results.
- Every screen was reviewed in the pre-deploy state. Live figures, dispatches, leaderboards and wallet-connected screens with real data have not been seen.
