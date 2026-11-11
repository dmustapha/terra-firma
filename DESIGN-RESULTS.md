# DESIGN-RESULTS.md

status: complete

## What Just Happened
The design phase replaced the default dark-and-green look with a deliberate direction, "Almanac". It chose it over two other fully drawn proposals (Survey Sheet, Core Sample) with a scored rubric, autonomously, because Dami is asleep under a no-stops directive. The app now reads like a printed broadsheet on cream newsprint:
- The landing leads with a real wallet's Hindsight card drawn to scale as "Fig. 1", where the meme layer has eroded and the NVDA bedrock holds. Every number cites its source.
- The 12-second card load is an honest "going to press" state.
- Staking explains the one-epoch wait with an epoch ruler.
- Developer jargon is gone from what users see.

This serves the thesis directly: Terra Firma's claim is "measured, not estimated", and the design now makes that claim visible in the first viewport. design_forge formalizes it next (DESIGN_SYSTEM.md, brand.json, logo).

## Honest Gaps
- The direction was picked autonomously; Dami has not seen it. The three proposals are kept in proposals/ so he can overrule.
- No measured-reference parity pass was run (the Claude-in-Chrome MEASURE step against real winner showcases is Dami-run), so no .design-measured-ref.json exists.
- Every screenshot shows the pre-deploy state: edition figures, Dispatches and staking numbers read "not live yet" until contracts are on mainnet. Their live layouts with real data are unseen.
- Two small layout nits remain: /card repeats "Hindsight card" as both page title and card heading, and the /trade empty state repeats its subtitle.
- Wallet-connected screens (convert sheet, signing, tx status) were restyled only through shared primitives; none were rendered with a connected wallet.
