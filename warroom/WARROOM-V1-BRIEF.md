# WAR ROOM V1 — WORLD IS FLAT HACKATHON DELIBERATION BRIEF
**Date:** 2026-11-10 | **Objective:** Pick THE ONE idea that is BOTH the most winnable AND solves a significant real problem.
**Dami directive (2026-11-10):** "we need the best possible build. as extensive as possible. i dont just want a basic or a one layer idea… we go in with no preferred track, let the warroom decide." Minimal spend: "i dont want to spend if i dont have to."

## NON-NEGOTIABLE RULES (from the builder)
See warroom/concerns-snapshot-V1.md (verbatim, authoritative). Summary:
- [C] Time not a constraint; multi-layer build (≥4 load-bearing mechanisms). [C] Uniqueness vs ~49 entrants. [C] Real named humans. [C] Significant problem + conviction. [C] Day-1 users today. [C] No self-duplication (incl. leash agent-spend-wall). [C] $WIF load-bearing onchain on RH mainnet + flywheel. [C] Live until 2026-11-16 17:30 UTC.
- [I] Mainnet required (override of "everything testnet"); budget ~$18. [I] Stock Tokens → geofence restricted jurisdictions; no Robinhood name/logo. [I] Submit early (≥24h approval lag). [I] Security-legible (no spot-price oracle for value). [I] Legible in "a few minutes". [I] Mobile. [I] Mobilization line per idea.

## TASTE CONTRACT
U1 integral/real/works · U2 judge SEES it work in ~3 min without explanation · U3 exciting beats safe · U4 no reskins; agent+reasoning-hash+dashboard+micropay shape banned by default · U5 grounded in builder capability · U6 integration depth IS the strategy (native primitives so deep porting = rebuild) · U7 demo state EARNED.
Selected conditional blocks: C-DF1 (real value flows onchain in demo — real tokens, no simulated fills) · C-CS1 (first-session wow without docs) · C-NA1 (no AI garnish unless load-bearing) · C-AI1 applies IF an idea is AI-centered (AI must be the product).

## HACKATHON FACTS
- World is Flat Hackathon (@WIFonRH), site worldisflat.fun/build. Build start 2026-10-21 17:30 UTC. **Submissions close 2026-11-12 17:30 UTC.** Round one closes 14 Nov 17:30 UTC; final closes 16 Nov 17:30 UTC.
- Prize: 10,000 USDG, one winner, no 2nd place.
- Categories (tags, one prize): hooks and defi · agents and ai · Stock Tokens · games · consumer and payments · onboarding · social and creators · tools and infra.
- Rules: solo/≤4; use $WIF onchain on Robinhood Chain; live until final close; repo + demo (<3 min, "show it working") + real transactions; existing work OK if $WIF used for real; flywheel required; no Robinhood name/logo; Stock Tokens obey restricted-country list.
- Judges: ogle @cryptogle (security whitehat, Glue co-founder, WLFI advisor) · niro @cryptoape (MultiChain Advisors) · daniel zou @blueshirt666 (ex Binance/McKinsey) · glabuz @glabuz (Ava Labs gaming/retail BD, ex Polygon) · sahil sen @sensahil (Quicknode DevRel) · vasily rudomanov @getvasily (GetBlock CEO) · world is flat team.

## JUDGING CRITERIA
Verbatim: "judges look for a real reason to use $wif, a flywheel that holds up, and something that works and is built well." Weights unpublished → derived: A Real reason to use $WIF 34% · B Flywheel that holds up 33% · C Works & built well 33%. Plus YC Problem Quality (0-6).
Mechanism: organizer approval → judges vote + community ($WIF burned, 1 WIF=1 vote, amount-weighted) counts as ONE judge → top 10 → second vote → most votes wins.

## CONFIRMED JUDGES
(see facts) Judge quote: @GetVasily — "a judge has a few minutes to understand it."

## EVENT CLASS + LENS
**Class:** open_buildathon (inferred — intel declared community_vote; reclassified because ~6 of 7 seats are a judge panel scoring "works and is built well"; Dami approved at Phase 0B) — with a community_vote OVERLAY.
**Judge reading:** Ecosystem/BD + infra + security panel on a young chain, plus the token team. They reward: a real $WIF demand source, a durable non-hype loop, mainnet-working + security-literate engineering, infra-native use (Quicknode/GetBlock), retail legibility. WIF team thesis: "unites developers, the virtual economy, and real-world finance."
**Sponsor vintage (L5):**
| Sponsor | Primitive | Shipped | Age at deadline |
|---|---|---|---|
| Uniswap | aggregator hooks on RH Chain | 2026-10-22 | 21d |
| Morpho | Stock Tokens as collateral | 2026-10-22 | 21d |
| Robinhood | +8 Stock Tokens (203 active) | 2026-10-28 | 15d |
| Quicknode | Stock Token API promoted to WIF builders | 2026-10-30 | 13d |
| Robinhood | delayed backup sequencer feed | 2026-09-22 | 51d |
| WIF | WifVote contract | 2026-11 | <12d |
| WIF | verified on Coinbase Wallet / Ledger / Tangem | 2026-10/11 | <30d |
**Gate conditionals this lens toggles:** RELAX Gate 1b check #1 (Tenor carve-out) — real-world-finance problems (e.g. stock ownership) are acceptable WHEN the RH-chain primitive (Stock Tokens/Chainlink/$WIF) is load-bearing for the product's economics. ADD showcase-value rescue (legible high-spectacle survivor may survive a novelty zero-out). ADD (overlay from community_vote) mandatory mobilization note per survivor: first N voters, what visibly improves between rounds.

## THE BUILDER
Dami (solo + Claude Code): Solidity/Foundry, TypeScript/Next.js/Tailwind, viem/wagmi, Uniswap integrations, Chainlink feeds, ERC-4337/AA, agents (Claude tool-use), Telegram bots, Vercel/Render deploys. Has deployed and Blockscout-verified contracts on RH Chain (testnet) before; knows RH RPC quirks (forge TLS relay). Constraint: ~30 build hours to submission; mainnet budget ~$18.

## ROBINHOOD CHAIN CAPABILITIES
See research/chain-dna.md and research/research-brief.md § Capability Map. Key: $WIF (burnable, no permit, no feed, v4 WIF/ETH pool ~$100K liq); 203 Stock Tokens (ERC-20 + ERC-8056); 62 Chainlink feeds (~37 stock, 4 24/7); USDG 6dp; Uniswap v2/v3/v4 + hooks; Morpho; ERC-4337 EP 0.6/0.7/0.8 + 7702; Alchemy/ZeroDev/Privy/Dynamic; RH REST prices API; WifVote; no onchain randomness; FCFS sequencer.

## KNOWN COMPETITORS / CATEGORY CROWDING
See research/roster-audit/strategy-density.md (49 entrants with threat levels). HIGH: Proof of Ship, Fallpit, WIF Paymaster; MED-HIGH: Robin Town, WIF Agent Arena, Sherwood. Density HIGH: games (21), agents (16), tools (11); LOW: onboarding (5), Stock Tokens (5).

## ECOSYSTEM DATA (Copilot + Grid)
Unavailable (copilot_available=false). Bounded by corpus, not proof of absence. RH-wide: ~30 launchpads (high), lending = Morpho (low), stock-token consumer/savings apps (low).

## WHITESPACE / GAP MAP
See warroom/gap-map.md — Whitespace W1–W5, Missing outcomes M1–M4, Portability P1–P3. Roster-validated.

## SCORING CRITERIA
1-10 per criterion: A Real reason to use $WIF (34%) · B Flywheel that holds up (33%) · C Works & built well (33%).
YC Problem Quality (0-6): How big, urgent, and underserved is the problem?
