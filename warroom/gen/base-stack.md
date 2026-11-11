# BASE STACK (items ①-⑤; ⑥ gap map and ⑦ primitives sheet are separate files)
## ① TASTE (Universal Laws + selected blocks C-DF1, C-CS1, C-NA1; C-AI1 applies only if an idea is AI-centered)
# TASTE — Dami's standing quality contract for hackathon ideas
# Universal laws apply to EVERY project. Conditional blocks are included
# only when Step 0 matches them to the hackathon/track/idea type.

## Universal Laws
U1. Integral, real, works. No simulated data, no "would integrate",
    no hash-of-a-thing-nobody-verifies. (Arbitrum V6 mandate)
U2. The judge must SEE it work in ~3 minutes without explanation.
    (ReasonTrace rejection)
U3. Exciting beats safe. Target "I haven't seen this before," not
    "competently assembled." (InitQuest rejection)
U4. No reskins of past project shapes. The agent+reasoning-hash+
    dashboard+micropay shape is banned as a default; it must re-earn
    its place on event-specific evidence. (cross-run attractor)
U5. Grounded in builder capability — Dami can build it fast and defend
    every layer in Q&A. (Initia V3 rejection)
U6. INTEGRATION DEPTH IS THE STRATEGY. The project must be integral to
    the host ecosystem: built on the chain/sponsor's NATIVE primitives
    so deeply that porting it elsewhere would mean rebuilding it.
    Surface-level SDK calls lose; native-primitive depth wins.
    (Chainlink win; Dami 2026-06-12)
U7. Demo state is EARNED. The demo must be producible by the product
    actually running. Fabricated/seeded state is forbidden outright
    when it contradicts the product's core claim (verifiability,
    immutability, autonomy); elsewhere it is a last-resort fallback,
    never the plan. (AlphaAttest precache lesson)

## Conditional Blocks
WHEN the value proposition is AI/agents:
  C-AI1. AI must be the product, not a wrapper. If the demo works with
         the AI removed, fail. (Arbitrum V4 rejection)
WHEN the project is NOT AI-centered:
  C-NA1. Do NOT bolt AI on for judge appeal. AI garnish on a non-AI
         product reads as checkbox-chasing. Only include AI where it
         is load-bearing.
WHEN DeFi / trading / payments:
  C-DF1. Real value flows on-chain in the demo — real tokens moving,
         no simulated liquidity or fills.
WHEN infra / tooling / protocol:
  C-IN1. The demo must include a live CONSUMER of the infra — something
         visibly using it — not the infra merely existing.
WHEN consumer / social / gaming:
  C-CS1. First-session wow without reading docs.


## ② FACTS CARD
## HACKATHON FACTS
- World is Flat Hackathon (@WIFonRH), site worldisflat.fun/build. Build start 2026-10-21 17:30 UTC. **Submissions close 2026-11-12 17:30 UTC.** Round one closes 14 Nov 17:30 UTC; final closes 16 Nov 17:30 UTC.
- Prize: 10,000 USDG, one winner, no 2nd place.
- Categories (tags, one prize): hooks and defi · agents and ai · Stock Tokens · games · consumer and payments · onboarding · social and creators · tools and infra.
- Rules: solo/≤4; use $WIF onchain on Robinhood Chain; live until final close; repo + demo (<3 min, "show it working") + real transactions; existing work OK if $WIF used for real; flywheel required; no Robinhood name/logo; Stock Tokens obey restricted-country list.
- Judges: ogle @cryptogle (security whitehat, Glue co-founder, WLFI advisor) · niro @cryptoape (MultiChain Advisors) · daniel zou @blueshirt666 (ex Binance/McKinsey) · glabuz @glabuz (Ava Labs gaming/retail BD, ex Polygon) · sahil sen @sensahil (Quicknode DevRel) · vasily rudomanov @getvasily (GetBlock CEO) · world is flat team.


## JUDGING CRITERIA
Verbatim: "judges look for a real reason to use $wif, a flywheel that holds up, and something that works and is built well." Weights unpublished → derived: A Real reason to use $WIF 34% · B Flywheel that holds up 33% · C Works & built well 33%. Plus YC Problem Quality (0-6).
Mechanism: organizer approval → judges vote + community ($WIF burned, 1 WIF=1 vote, amount-weighted) counts as ONE judge → top 10 → second vote → most votes wins.


## ③ CHAIN DNA
## Chain DNA: Robinhood Chain (mainnet 4663)
**Unique capabilities:** 203 tokenized US stocks/ETFs as ERC-20 (ERC-8056 dividend/split multiplier) + per-asset Chainlink feeds (24/7 for TSLA/NVDA/GOOGL/SNDK) + USDG native stable + Morpho stock-token collateral + Uniswap v4 (hooks, aggregator hooks) + ERC-4337/7702 with Alchemy/ZeroDev/Privy embedded wallets + ~100ms blocks, ~$0.004 txs, FCFS sequencing (no MEV auctions) + RH REST stock price API. $WIF (memecoin, burnable) and WifVote exist only here.
**Founding thesis:** "Finance, onchain" — the first public chain built for real-world assets, bringing Robinhood-grade retail access to tokenized equities (non-US).
**Community builds:** memecoin launchpads (Pons ~70%, ~30 launchpads), DEX trading, prediction/betting, stock-token trading tools; WIF hackathon entrants: games, agents, prediction pools, burn-to-vote.
**Path of least resistance:** ERC-20 composition with stock tokens (no SDK), Chainlink latestRoundData, Uniswap swaps, viem/Foundry, sponsored-gas smart accounts.
**Honest constraints:** stock tokens restricted for US/UK/CA/CH; can't mint stock tokens; thin AMM liquidity for stocks (RFQ-first); no onchain randomness (prevrandao constant); no WIF price feed (v4 spot manipulable); $WIF economy thin (~1.2K transfers/day, ~$1.4M FDV); Blockscout API CF-gated; forge TLS quirk vs RH RPC.
**Top community frustrations:** (1) "Robinhood Chain was built for tokenized stocks — but memecoins took over" (the RWA thesis isn't reaching memecoin users); (2) scams/vanishing tokens + memecoin volume -96% (no durable reason to stay); (3) onboarding friction: need ETH gas, bridging, finding pools; entrants have no users.

## ④ BUILDER CAPABILITY SHEET (constraints on what is buildable — NOT past project shapes)
Solo builder + Claude Code, ~30 build hours to submission, mainnet budget ~$18 (0.005 ETH + 5K $WIF). Fast stacks: Solidity/Foundry, TypeScript/Next.js/Tailwind, viem/wagmi, Uniswap v4 integration, Chainlink feeds, ERC-4337/AA smart accounts + sponsored gas (Alchemy/ZeroDev/Privy), Telegram bots, Claude tool-use agents, Vercel/Render deploys. Comfortable with RH Chain deploy + Blockscout verification.
## ⑤ CONCERNS KILL-LIST (self-filter: an idea violating any [C] is DOA)
# Concerns Snapshot — WIF Warroom V1 (2026-11-10)
## Critical [C]
1. Time NOT a constraint (Claude Code speed) — do not kill for complexity. [Dami 2026-11-10: "best possible build, as extensive as possible, not basic/one-layer"]
3. Uniqueness — zero competitors in the exact niche among ~49 WIF entrants (strategy-density.md).
5. Real humans helped — named humans + problem.
8. Cumulative corrections carry forward.
9. Significant real problem + builder conviction ("would build without prize").
13. Day-1 users exist TODAY (reachable).
15. No self-duplication of shipped/in-flight projects (built-projects.md: AgentMesh, GhostFund, SolvencySwap, Agent Auditor, CRE Compliance Gate, GhostPay, x9, AlphaAttest, Veil, triage-0/Aegis, AgentTreasury, DLAD, ShadowDesk+, Omnispect-X, RefiRail, 0g-sentinel, Backstop, SomniaFlow, VaraCore, Verdikt, solv-001, Mirror, 9ncore, Axon, DeepRock; + leash agent-spend-wall on RH testnet). In-flight: NEAR, Hermes, UGREEN, Binance bStocks agent, Switch, Vultr builds.
## Important [I]
2. ~~Everything testnet~~ — USER/ORGANIZER OVERRIDE: mainnet 4663 REQUIRED (rule 3 + organizer Discord "Yes some tests needed also in mainet"). Spend minimal (~$18 budget: 0.005 ETH + 5K WIF). Mocks allowed only for non-core display; core $WIF flows must be real.
6. Use ALL research. 7. Be extensive. 10. Focused product, broad problem. 11. Win + impact align. 14. Demo feels like real product.
## Advisory [A]
4. Fresh ideas allowed. 12. Reframing on the table.
## Contextual (derived [AUTO], CAMPAIGN interactive but Dami said "no preferred track, let warroom decide")
- [A] AI/agents considered when appropriate (agents category exists; not primary weight) — AI only if load-bearing (C-NA1/C-AI1).
- [I] Mobile-native UX — retail/consumer judges + CT voters on phones; demo must work on mobile.
- [A] Sponsor stacking — Quicknode Stock Token API (judge Sahil) + GetBlock (judge Vasily) perks; use where load-bearing.
- (n/a) hardware, cross-chain, privacy.
## Per-hackathon [derived from brief §11/§12 + rules + Dami 2026-11-10]
- [C] Must use $WIF onchain on RH mainnet in a load-bearing way (rule 3) + a flywheel that holds up (rule 7).
- [C] Must stay live & working until 2026-11-16 17:30 UTC (rule 4) — durable hosting, no free-tier sleep (DL-learn dl-1).
- [C] Multi-layer/extensive build (Dami ruling) — ≥4 load-bearing mechanisms (CAMPAIGN floor).
- [I] Stock Tokens → geofence restricted jurisdictions (rule 14); no "Robinhood" in name/logo (rule 11).
- [I] Submit early — approval lag ≥24h; internal cutoff Nov 12 morning WAT.
- [I] Security-legible: ownerless/minimal-admin, verified, tested contracts; no spot-price oracle for value (judge Ogle).
- [I] Instant legibility — "a judge has a few minutes to understand it" (judge Vasily).
- [I] Mobilization line per idea (community = 1 judge seat; ~1.45K active $WIF voter wallets).

