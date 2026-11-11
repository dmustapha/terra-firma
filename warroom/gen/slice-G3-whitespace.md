## Competitor Landscape
**BOTTOM LINE:** ~49 entrants (31 approved + 18 GitHub-only); the top tier is genuinely strong (mainnet, verified, audited, keepers), and the crowding is in prediction/betting, agent marketplaces and 3D games.
**EVIDENCE:** /build/api/projects [A1]; GitHub API + commit counts [A1]; gallery updates [A2]; X [C3].
**CONFIDENCE:** Medium-High — counts exact, functional depth inferred (details hidden until close).
**SO WHAT:** Polish alone won't separate us; we need a whitespace lane + mainnet proof + security-legible build.

### Competitor Registry
| Project | Track | Threat | Tech | Source | Confidence |
|---|---|:-:|---|---|:-:|
| Proof of Ship | tools/defi | HIGH | ownerless contract, Sourcify, viem+WalletConnect vendored, 41 commits, real bounties | updates.md, maturity.txt | High |
| Fallpit | games/stock/defi | HIGH | 17 verified contracts, WIF vault, daily markets | updates.md | High |
| WIF Paymaster | onboarding/tools | HIGH (onboarding) | ERC-4337 paymaster, gas in WIF, 27 commits | GitHub | Med |
| Robin Town | games/consumer | MED-HIGH | Three.js 3D, WS rooms, staking/burn, 67 commits | updates.md | High |
| WIF Agent Arena | games/agents | MED-HIGH | V3 ownerless, keeper bot, SECURITY.md | updates.md | High |
| Sherwood (predict FWA) | games/hooks | MED-HIGH | Uniswap v4 hook, buyback+burn | updates.md | High |
| SEMALAM | games/agents | MED | sealed AI orders, replay verifier, demo video, 0 players | updates.md | High |
| hirewif | agents | MED | agent marketplace, 76 commits/3 days | GitHub | Med |
| Pave | defi/social | MED | social credit, friends lock WIF, 27 commits | GitHub | Med |
| Lastbell | stock tokens | MED | market-hours-aware stops, WIF-bonded keepers, 37 commits | GitHub | Med |
| Underfoot | stock/defi/tools | MED | stock-token floor under WIF | GitHub | Med |
| c0lony | games | MED | drand sealed raids, 71 commits | GitHub | Med |
| Zeron | games | MED | pixel dungeon, gas in WIF, X coverage | X | Med |
| WIF League / Flat Street / Stock Fair / wifpool / kerdo | prediction/fantasy | LOW-MED | Chainlink-scored fantasy/pools | API/GitHub | Med |
| Flat Relay / WIF Gift / wif-tipbot / CreatorLoop | onboarding/social | LOW-MED | gift links, Telegram tips | API/GitHub | Med |
| molt-world / Flat Fee / wifgate / rariflat / flat-desk | agents/infra | LOW-MED | x402, MCP | API/GitHub | Med |
| Convince the Flat Earther / The Gatekeeper | games/agents | LOW | pay-to-argue AI | API | Med |
| Stardust / Echo | agents | LOW | generic AI, thin WIF link | API | Med |
(Full detail: research/roster-audit/strategy-density.md)

### Competition Density Map
| Track | Est. Teams | Activity | Density |
|---|:-:|---|:-:|
| games | 21 | High | HIGH |
| agents and ai | 16 | High | HIGH |
| tools and infra | 11 | High | HIGH |
| hooks and defi | 8 | Med | MED |
| consumer and payments | 8 | Med | MED |
| social and creators | 8 | Med | MED |
| Stock Tokens | 5 | Med | LOW-MED |
| onboarding | 5 | Low | LOW |

---

## Kill List
### 1. Saturated
- Up/down & price-prediction pools, fantasy stock leagues (Fallpit, WIF League, Flat Street, Stock Fair, wifpool, kerdo)
- Burn-to-vote ballots / brackets (Flat Ballot, eri, flatboard, ORBRUSH Community Choice)
- "Pay $WIF to argue with an AI" vaults (Convince the Flat Earther, The Gatekeeper, Agent Arena)
- Agent marketplaces / x402 pay-per-call in $WIF (hirewif, rariflat, molt-world, wifgate, Flat Fee)
- 3D world / empire games (Wif Worlds, Robin Town, flat-war)
- (organizer-suggested) category exemplars on rules page: "uniswap v4 hooks, vaults, pools", "onchain agents and ai tools that run on $wif", "tipping, paying, sending", "bots, dashboards, sdks"
### 2. Broken Dependencies
- Anything needing a $WIF Chainlink feed (none) or testnet $WIF (none)
- Onchain randomness via prevrandao (constant on RH)
- Chainlink Data Streams (gated access) as a core dependency
- Minting Stock Tokens (AP/KYB only)
### 3. Already Built
- Pay gas in $WIF (WIF Paymaster) · builder bounties (Proof of Ship) · social credit (Pave) · stock stop-losses (Lastbell) · stock-token floor under WIF (Underfoot) · gift/send-as-link (WIF Gift, Flat Relay) · Telegram tipbot (wif-tipbot)
### 4. Zero Alignment
- Generic AI chat/models with $WIF bolted on (Stardust, Echo pattern)
- US-targeted stock-token apps (rule 14 + RH restrictions)
- Testnet-only builds (fail rule 3)


# Strategy Density — WIF Hackathon roster (2026-11-10)

Sources: /build/api/projects (31 approved) [A1] · gallery update logs (updates.md) [A2] · GitHub search API (gh-extra.tsv, github-repos.json) [B2] · commit counts (maturity.txt) [A1] · X (social-intel.md) [C3].
Visibility caveat: "what it does / demo / live" fields stay hidden until 12 Nov 17:30 UTC — threat reads come from one-liners, updates, READMEs, commits.

## Competitor Registry (threat = polish × overlap with the likely open lanes)

| Project | Lane | Evidence of maturity | Threat |
|---|---|---|---|
| Proof of Ship (@heyresearch) | builder bounties, tools/defi | 41 commits; 2 real $WIF bounties (one paid, 100 WIF burned); self-audit; Sourcify-verified, ownerless; mobile wallet UX; 4 updates | HIGH |
| Fallpit (@fallpitxyz) | stock 4PM-close prediction | mainnet, 17 contracts Blockscout-verified, WIF vault | HIGH (prediction lane) |
| WIF Agent Arena | AI agent betting game | mainnet V3 ownerless + keeper bot; SECURITY.md of own flaws | MED-HIGH |
| Sherwood / predict FWA (@pfwafun) | v4 hook arena game | buyback+burn txs on mainnet; won Proof-of-Ship bounty | MED-HIGH (only real v4 hook) |
| SEMALAM (@edycutjong) | sealed-order AI night market | mainnet burn tx; deterministic replay verifier; demo video; **0 players** | MED |
| Robin Town | 3D negotiation board game | 67 commits, v1.6, 9-viewport UI polish, mainnet stake/burn | MED-HIGH (polish) |
| WIF Paymaster (Daveboycyber) | pay gas in $WIF (4337) | 27 commits, active to Nov 9, zero-ETH demo frontend | HIGH for onboarding lane |
| Pave (tomcode1000) | social credit: friends lock $WIF behind you | 27 commits in 6 days | MED |
| Lastbell | market-hours-aware stops for Stock Tokens | 37 commits | MED (stock lane) |
| Underfoot | Stock-Token floor under $WIF, burn-to-redeem | 37 commits (1 day) | MED (stock lane) |
| hirewif / rariflat / molt-world / Flat Fee / wifgate | agent marketplaces / x402 pay-per-call in $WIF | hirewif 76 commits in 3 days | MED (crowded lane) |
| c0lony | ant-colony strategy game | 71 commits, drand randomness | MED |
| Zeron (@bamio_xZ) | pixel dungeon, 10 WIF entry, gas in WIF | X coverage (HoodlineHQ) | MED |
| WIF League / Flat Street / Stock Fair / wifpool / kerdo | stock/crypto prediction & fantasy | 5–15 commits | LOW-MED (saturated) |
| Convince the Flat Earther / The Gatekeeper | pay-to-argue AI vault | low commits | LOW |
| WIF Gift / Flat Relay / wif-tipbot / CreatorLoop | gifting / tipping / send-as-link | flat-relay 25, others ≤4 | LOW-MED (onboarding/social lane — **weakly held**) |
| Stardust / Echo | generic AI models, thin WIF tie | — | LOW (zero alignment) |
| ORBRUSH / Wif Worlds / flat-war / FlatWorld | 3D/launchpad/war games | varied | LOW-MED |

Serial-builder signal: hey-research-lab also ships `robinhood-chain-starter` (Foundry+viem) — experienced RH team. predict FWA is both a winner of a Proof-of-Ship bounty and an entrant (Sherwood) → cross-entrant collaboration is already happening.

Pre-existing-code timing: repos all created ≥ Oct 23 (build start Oct 21) except none flagged; rules allow existing work anyway (rule 6).

## Competition Density Map
| Track | Gallery count (API) | + GitHub-only | Density |
|---|:-:|:-:|:-:|
| games | 16 | +5 (zeron, c0lony, flat-war, flatworld, eri) | HIGH |
| agents and ai | 12 | +4 (hirewif, rariflat, wif-desk, wifgate) | HIGH |
| tools and infra | 8 | +3 (Paymaster, flatboard, wifwheel) | HIGH |
| hooks and defi | 7 | +1 (pave) | MED |
| consumer and payments | 6 | +2 (tipbot, CreatorLoop) | MED |
| social and creators | 6 | +2 (flat-ballot, flatcall) | MED |
| Stock Tokens | 5 | +0 | LOW-MED |
| onboarding | 4 | +1 (Paymaster) | LOW |

Theme clusters (cross-category): prediction/up-down/fantasy ≈10 · burn-to-vote/ballots ≈5 · AI-pot "convince the AI" 3 · agent marketplaces/x402 ≈6 · 3D worlds 4 · gifting/tipping 4 · stock-token utility 4 (Lastbell, Underfoot, WIF League, Stock Fair).

## WHITESPACE / GAP MAP (primary input to warroom Phase 0C)
1. **Stock Tokens × $WIF as everyday ownership** (organizer-signalled via Quicknode QT + "memes × real-world finance" thesis). Existing stock entries are trading tools (stops, floors) or betting (fantasy/prediction). Nobody does *saving/owning* stock tokens with $WIF as the loop (round-ups, recurring buys, baskets, "own a slice of NVDA from WIF tips"). Note: `sparejar` (round-up into stock tokens) exists on GitHub but is NOT a WIF entrant [B2].
2. **Onboarding with zero crypto** — only 4–5 entries; Paymaster solves gas, nobody owns the full "never-held-crypto → first $WIF + first stock token" path with embedded wallets (Privy/Alchemy/ZeroDev all live on 4663).
3. **Real retention, not burns** — judges ask for "a flywheel that holds up"; most entries' flywheel = burn %. Entrants admit no users (SEMALAM 0 players). A product with a *non-speculative* reason to return (habit, social obligation, savings goal) is rare.
4. **Uniswap v4 hook done properly** — only Sherwood. Hooks are 74.5% of RH v4 trades; a hook that routes value to $WIF holders/flywheel is under-built, but 2-day audit risk is real (judge Ogle = security).
5. **Security-legible build** — Ogle (whitehat) on the panel; entrants publishing SECURITY.md (Arena) and audits (Proof of Ship) set the bar. A clean, ownerless, verified, tested contract set is a differentiator with judges.

## Crowded / avoid
Prediction & up/down pools, fantasy stock leagues, burn-to-vote ballots, "pay to argue with AI" vaults, generic agent marketplaces/x402 gateways, 3D world games, tip bots (weak but many).
