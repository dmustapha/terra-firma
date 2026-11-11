# WORLD IS FLAT HACKATHON — Research Brief
**Compiled:** 2026-11-10 (06:00–08:00 UTC)
**Intel Depth:** ID 9 (Deep Intelligence)
**Sources:** Official site + public API + site JS, RH/Chainlink/Quicknode/Paxos docs, onchain reads (cast, RH mainnet), GitHub API, X (via Dami's Chrome), World is Fair API. 22 web searches, ~45 sources. Discord read (see Social Intel).
**Status:** status: complete

---

## Overview

| Field | Value |
|-------|-------|
| Name | World is Flat Hackathon (@WIFonRH) |
| Organizer | World is Flat team (memecoin $WIF; not affiliated with Robinhood Markets) [A1] |
| Platform | worldisflat.fun/build — wallet sign-in, 6-step form at /build/me/submission [A1] |
| **Deadline** | **2026-11-12 17:30 UTC = 18:30 WAT** (site banner + API `end_at`=1794504600) [A1]. Already extended +10 days (X post) |
| Later dates | round one closes 14 Nov 17:30 UTC · final closes 16 Nov 17:30 UTC · result right after [A1] |
| Tracks | 8 categories, pick all that fit, ONE prize [A1] |
| Chain | **Robinhood Chain MAINNET, chainId 4663** (forced by rule 3 — see Network) [A1] |
| Native token | ETH (gas); $WIF required inside product; USDG prize |
| Prize | 10,000 USDG, single winner, team-lead wallet [A1] |

### Submission Requirements [A1]
- Must use $WIF onchain on Robinhood Chain (rule 3)
- Stay live & working until 16 Nov 17:30 UTC (rule 4)
- Proof: repo (public, or private + invite GitHub `wifonrh`), demo video, real transactions (rule 5)
- A flywheel: using it keeps bringing people back to $WIF (rule 7)
- Team ≤4; 18+; payout KYC-lite by email (name, country, sanctions) to winner only

---

## Demo Video Requirements

| Field | Value |
|-------|-------|
| Max length | **180s** ("keep it under 3 minutes") [A1, form.js] |
| Formats | YouTube, Loom, Vimeo or X links |
| Platform | URL in submission form |
| Content notes | "show it working rather than slides" |

---

## Submission Form Fields
(from public `form.js` — Package checklist) [A1]
- **team:** team name (60) · email (lead-only, how they reach the winner) · github profile of lead · telegram/discord handle (opt) · payout wallet (42, "double check it")
- **your project:** project name (60) · logo · one liner (80, "what it is, in one line") · categories (multi) · what it does (1500) · who it's for (500)
- **how it connects to $wif:** how does it use $wif (1000, "be specific about what $wif does inside your product") · integration type (multi; options only visible signed-in) · contract addresses (opt, own contracts on RH Chain) · ok-to-feature checkbox
- **your flywheel:** what does someone do (500) · what happens to $wif when they do it (500) · why does that bring them, or others, back (500)
- **proof of build:** github repo · demo video · live link ("where we can try it right now") · transactions (list; "real transactions on Robinhood Chain where your product uses $wif") · how it's made (1500, "your stack, and the hardest part of building it") · what's next (500, opt)
- **review:** agreed_terms → submit. Editable until close, then locked (logo excepted).

---

## Disqualifiers
- No onchain $WIF use on Robinhood Chain → testnet-only build fails rule 3 (no $WIF on 46630) [A1]
- Down / broken before 16 Nov 17:30 UTC (rule 4)
- Missing repo / demo / real tx (rule 5); no flywheel (rule 7)
- Robinhood name or logo in project name/logo/handle; must follow RH brand guidelines (rule 11)
- Stock Tokens category: must honor Robinhood restricted-jurisdiction list (US, UK, CA, CH, …) (rule 14)
- Organizer review rejects → votes void, burned WIF lost (judging §1)
- Team >4 / person on two teams; malware / IP misuse

---

## Prizes
| Track | 1st | 2nd/3rd | Notes |
|---|---|---|---|
| All 8 categories (one pool) | 10,000 USDG | none | winner-takes-all to team lead wallet [A1] |
Builder perks (dashboard): Quicknode Build plan free month; GetBlock RH RPC + EVM data streams + Market SQL [B2 — @WIFonRH/@getblockio X posts]

---

## Judging Criteria
Verbatim: *"judges look for a real reason to use $wif, a flywheel that holds up, and something that works and is built well."* [A1] — weights unpublished; derived equal.

| Criterion | Weight | What it means | How to score high |
|---|---|---|---|
| Real reason to use $wif | ~⅓ (derived) | $WIF is load-bearing, not a skin | $WIF is the unit the product cannot work without; explain in 1 line |
| Flywheel that holds up | ~⅓ | loop survives without hype/emissions | non-speculative return motive (habit/savings/social obligation); show it in real txs |
| Works & built well | ~⅓ | live, robust, secure | mainnet, verified contracts, tests, ownerless/minimal admin, SECURITY.md, polished mobile UX |

Mechanism: organizers approve → judges vote + community ($WIF burned, 1 WIF = 1 vote, amount-weighted) counts as **one judge** → top 10 → judges+community vote again → most votes wins [A1].

---

## Event Class & Judge Reading
- **Event class:** community_vote (HYBRID). Declared from judging section. Why: winner = most votes, but the community is ONE seat among ~7 judges; organizers gatekeep approval.
- **Judge reading:** Panel = Ogle (whitehat; Euler/Curve/Kyber recovery; Glue co-founder; WLFI advisor) [B2], Niro (MultiChain Advisors, CPA, consulting) [B2], Daniel Zou (ex Binance/McKinsey) [C3 — site bio only], glabuz (Ava Labs gaming/retail BD, ex Polygon) [C3 — site bio only], Sahil Sen (Quicknode DevRel, ~86 guides incl. RH Chain) [A2], Vasily Rudomanov (GetBlock CEO) [A1], WIF team. Rewards: security-literate engineering, infra-native use (Quicknode/GetBlock), retail/gaming BD sense, and $WIF demand. Vasily, verbatim: *"a judge has a few minutes to understand it."* → instant legibility.
- **Sponsor vintage (L5, last ~90 days):**

| Primitive | Shipped | Source |
|---|---|---|
| Uniswap aggregator hooks live on RH Chain | 2026-10-22 | The Block |
| Morpho accepts Stock Tokens as collateral (NVDA/SPY/SPCX) | 2026-10-22 | crypto.news / hokanews |
| 8 new Stock Tokens added (203 total active) | 2026-10-28 | enviodev repo; rhj/assets |
| Quicknode Stock Token API (shares, splits, dividends) promoted to WIF builders | 2026-10-30 | @WIFonRH QT |
| Delayed backup sequencer feed | 2026-09-22 | RH notices |
| WifVote contract (hackathon vote) | 2026-11 | /api/vote-window |
| $WIF verified on Coinbase Wallet | 2026-11-07 | @WIFonRH |

---

## Workshop Signals
No workshop schedule found. Nearest equivalents (organizer-boosted builder resources) [B2]:
| Workshop | Speaker | Topic | Strategy Signal |
|---|---|---|---|
| Quicknode QT (Oct 30) | @Quicknode / @WIFonRH | Stock Token API in shares w/ splits+dividends | **Organizer explicitly invites Stock Token builds**; judge Sahil = Quicknode |
| GetBlock perks (Nov 6) | @getblockio / @WIFonRH | RH RPC, EVM data streams, Market SQL | Infra-backed builds; judge Vasily = GetBlock |
| Judge spotlight (Nov 9) | @GetVasily | "a few minutes to understand it" | 10-second legibility of the demo |

---

## Tech Deep Dive
- Arbitrum Nitro / Orbit L2, ArbOS 61; ~100ms blocks; FCFS sequencer (no priority auctions); 96KB contract limit [A1 docs].
- Gotchas [A1]: `block.number` = L1 estimate (use ArbSys.arbBlockNumber); `prevrandao` constant → no onchain randomness; sequencer-level sanctions screening drops txs silently; fee = L2 exec + L1 calldata.
- $WIF: ERC20Burnable (`burn`, `burnFrom`), no permit, ~1B supply, no owner [A1 onchain]. Price ≈ $0.00138, FDV ≈ $1.38M; main liquidity Uniswap v4 WIF/ETH (~$100K liq, ~$83K/24h) + Up v3 WIF/WETH, WIF/USDG [B2 dexscreener]. ~300 transfers / 6h → thin economy.
- Stock Tokens: 203 active, ERC-20 18dp + ERC-8056 (`uiMultiplier`, `balanceOfUI`); addresses from `api.robinhood.com/rhj/assets`; can't mint (AP/KYB only); trade via RFQ (0x/1inch/LiFi), Uniswap AMM, Rialto propAMM, Lighter [A1].
- Prices: Chainlink 62 feeds on 4663 (~37 stock, 24/7 TSLA/NVDA/GOOGL/SNDK; ETH/USD `0x78F3…d3A9`; USDG/USD `0x61B7…9aD2`; TSLA 24/7 `0x39eD…BC37` read live = $377.17) [A1]; REST `/rhj/prices/{symbol}` raw bid/ask (not multiplier-adjusted) [A1].
- AA: EntryPoint v0.6/0.7/0.8 deployed; Alchemy bundler `robinhood-mainnet.g.alchemy.com`, ZeroDev chain 4663, Privy, Dynamic; EIP-7702 supported [A1].
- Known DX quirk (ours): forge HTTP TLS `BadRecordMac` vs RH RPC on many sequential calls → localhost relay workaround (memory rh-chain-live) [B2]. Public RPC rate-limited (~20–25 rps on free tiers) [C3].

---

## Network / Chain Infrastructure
| Field | Value |
|-------|-------|
| Chain | Robinhood Chain **mainnet** |
| Chain ID | **4663** |
| RPC | https://rpc.mainnet.chain.robinhood.com (+ Alchemy/Quicknode/GetBlock) |
| Testnet | 46630 exists but **$WIF has no code there** → cannot satisfy rule 3 [A1, cast code = 0x] |
| Faucet | none — real ETH bridged (Relay/LI.FI/Jumper) |
| Explorer | https://robinhoodchain.blockscout.com (API behind Cloudflare challenge) |
| Deploy requirement | Product must use $WIF onchain + real tx hashes → **mainnet deployment with real ETH + real $WIF (Dami decision)** |
| Key addresses | $WIF `0x5173b8eA6923c2d40267890D45C46a3480954773` · WifVote `0xd1b711917a405782da2ec650a0ee4711a76a5535` · v4 PoolManager `0x8366a39cc670b4001a1121b8f6a443a643e40951` · USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6dp) · WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` · Permit2 `0x0000…78BA3` · Multicall `0x2cAC2D899eCC914d704FeaAE33ac1bF36277DaD1` |

---

## Ecosystem Products
| Product | Purpose | Integration depth | Docs | Notes |
|---|---|---|---|---|
| Uniswap v2/v3/v4 | AMM, WIF liquidity | deep (swap / hook) | substreams, docs.uniswap.org | hooks = 74.5% of v4 trades [B2 bitquery] |
| Morpho | lending, stock collateral, USDG Earn (~7%) | medium | curator.morpho.org (4663) | Robinhood Earn runs on it |
| Pons | memecoin launchpad ($WIF launched here) | low | ponsfamily.com | ~70% launchpad share [C3] |
| Rialto / Lighter / KyberSwap / Relay / LI.FI | trading, bridging | low | — | onramp paths for users |
| Chainlink | feeds, Data Streams | medium | docs.chain.link | no WIF feed |
| Alchemy / ZeroDev / Privy / Dynamic | AA, embedded wallets | medium | docs.robinhood.com/chain/account-abstraction | gasless onboarding |
| Quicknode Stock Token API | stock data in shares | low-medium | quicknode.com/docs/robinhood | free month via dashboard |
| GetBlock | RPC, data streams, Market SQL | low | getblock.io/nodes/robinhood | perk via dashboard |
| World is Fair | WIF voting layer | n/a | worldisflat.fun/fair | 1,454 voters in G.O.A.T. |

---

## Capability Map
| Primitive | Can (proven) | Can't / not-yet | Maturity | Evidence | Load-bearing for |
|---|---|---|---|---|---|
| $WIF token | burn/burnFrom, std ERC20, ownerless | no permit; no feed; no testnet; thin economy | mainnet-live | cast calls + selector scan | MANDATORY rule-3 sink (burn/stake/pay) |
| Uniswap v4 PoolManager + WIF/ETH pool | swaps, hooks; ~$100K liq | spot manipulable; hook mining/audit risk | mainnet-live | cast code; dexscreener | in-app WIF acquisition or hook flywheel |
| Stock Tokens (203) | ERC-20 + ERC-8056 multiplier | no mint; restricted jurisdictions; thin AMM | mainnet-live | rhj/assets; docs | Stock-Tokens concepts (own/save/basket/collateral) |
| Chainlink feeds (62) | live stock + ETH/USDG prices, 24/7 for 4 names | no WIF feed; no sequencer-uptime feed; 166 tokens unfed | mainnet-live | feeds JSON; live read | price-aware settlement for stock legs |
| Chainlink Data Streams | signed sub-second reports | gated access | ⚠unverified | RH docs + verifier code | NOT load-bearing → flagged |
| USDG | stable leg, deep liquidity, feed | 6 decimals | mainnet-live | docs + cast | payments / pricing leg |
| ERC-4337 EP 0.6/0.7/0.8 + 7702 | sponsored gas via Alchemy/ZeroDev | needs provider policy/key; Paymaster entrant exists | mainnet-live | docs + cast code | zero-crypto onboarding |
| RH REST pricing API | assets/prices/corp actions, no key | raw (not multiplier-adjusted), offchain | GA | live curl | frontend/agent pricing |
| Quicknode Stock Token API | shares/dividends/oracle health | needs QN endpoint + add-on | ⚠unverified | QN docs + WIF QT | judge-resonant optional infra |
| WifVote | burn-vote per submission | organizer-owned | mainnet-live | vote-window API | vote campaign mechanics |
| Arbitrum precompiles/FCFS | arbBlockNumber, FCFS, 96KB | no prevrandao randomness | mainnet-live | docs | game/randomness design constraint |

---

## Organizer Feedback (DX seam)
| Area | Friction | Evidence |
|---|---|---|
| docs | Rules never name the network; rule 3 silently forces mainnet ($WIF absent on testnet) | cast code testnet = 0x |
| docs | RH oracle docs say check L2 Sequencer Uptime feed; none listed for 4663 | feeds-robinhood-mainnet.json |
| docs | Token Contracts table is client-rendered; real source is `api.robinhood.com/rhj/assets` | docs/contracts.txt |
| infra | Blockscout API behind Cloudflare challenge — agents/scripts blocked | curl "Just a moment…" |
| DX | forge TLS BadRecordMac vs RH RPC under many sequential calls | memory rh-chain-live |
| DX | $WIF has no EIP-2612 permit → extra approve tx in every flow | selector scan; vote.js |
| docs | Integration-type options only visible signed-in | /api/integration-types 404 |
| docs | what-it-does/demo hidden till close → can't check collisions | /api/projects/{slug} |

---

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

## Social Intel
**BOTTOM LINE:** X is quiet — almost no entrant ship-posts; the WIF team is boosting Stock-Token + infra builds; the $WIF voter base is ~1.5K wallets.
**EVIDENCE:** @WIFonRH timeline (QT of Quicknode Stock Token API, GetBlock perks, "developers, the virtual economy, and real-world finance") [B2]; 95 @WIFonRH mentions over ~5 days, ~11 original [C3]; World is Fair G.O.A.T. final_voter_count 1,454 [A1]; judge @GetVasily post [B2].
**CONFIDENCE:** Medium-High — Discord read (small, quiet); organizer confirmed mainnet + batch-approval lag.
**SO WHAT:** A strong ship-thread has an open lane; Stock Tokens is organizer-favored and under-filled; community vote is buyable but only 1 seat — don't over-invest there.
Discord (organizer Wifer, verbatim): Q "is mainnet compulosry?" → "Yes some tests needed also in mainet." Approval runs "in batches" with ≥24h lag → submit early. Pre-launch seed listed "stock tokens" first. Community tiny (#general ~10 msgs/4 days). Full notes: research/social-intel.md.

---

## Community Pain (Verbatim Quotes)
1. "Honest numbers: every night so far is house-only (30 published house agents, 0 players), so season 1 has no crown." — SEMALAM gallery update (@edycutjong) [A2]
2. "Spot price: scores read the pool's current price, which one large swap in a single tx can move." — WIF Agent Arena SECURITY.md update [A2]
3. "Tie-breaks: rounds 1-4 were all decided by the tie-break rule, not by price movement." — WIF Agent Arena update [A2]
4. "Buying a token on another chain usually means bridging funds, waiting for confirmation, arranging gas, and finding the right pool." — @Allthinks2 on X [D4, promotional]
5. "Most platforms focus on getting users to notice them, but keeping people engaged and giving them meaningful reasons to participate is a completely different challenge." — @Wazir_____ on X [D4]
6. "a judge has a few minutes to understand it." — @GetVasily (judge) on X [B2]
7. "When will review be done ? I submitted and it's going to 24hrs not added" — Benny, WIF Discord #general [C3]
8. "Built and submitted my app, but it's not showing up in Projects. What gives?" — Hemanth [MLH], WIF Discord #general [C3]

---

## Past Editions Analysis
No previous edition of the WIF hackathon (first edition; WIF's prior event = World is Fair G.O.A.T. poll, Sep 2026) [A1].
Nearest analogue — Robinhood-Chain-backed prizes (Arbitrum Open House 2026) [C3]: Zona (tokenized-stock lending/trading layer) won Buildathon 1st ($40K); Bond.Credit (RH Innovation Award, NYC); Hyperloop Finance (RH Founder-in-Residence, Singapore); StockRip (Singapore Promising Products 1st). Pattern: **stock-token credit/trading infrastructure** wins RH-aligned panels. Note: that panel was RH/Arbitrum; this panel is a memecoin team + infra/BD judges — different taste ($WIF demand + flywheel).

---

## Broader Market Context
- RH Chain mainnet live since 2026-07-01 ("The World is Flat" London event — WIF's name borrows from it) [B2].
- Narrative split: built for RWAs, captured by memecoins ("Robinhood Built a Rail, the Traders Brought a Casino"); memecoin volume down ~96% from Sept peak; only 5 tokens >$10M mcap [C3].
- Stock tokens: 203 live, ~65K holders / ~$13M per Bernstein (unverified) [C3]; Morpho stock collateral live Oct 22; USDG ~$94M added in 30 days [C3]. Non-US only.
- $WIF itself: ~$1.38M FDV, ~1.2K transfers/day — small but alive; organizers want builders to give it utility.

---

## Category Saturation (Grid Data)
Grid/Copilot helpers not available in this standalone run (copilot_available=false; no Grid credential/tool loaded) — **Wave 3 skipped with reason**. Substitute (query date 2026-11-10): RH-Chain-wide saturation from secondary sources — ~30 launchpads (HIGH), Uniswap dominant DEX (HIGH), lending = Morpho (LOW, 1 major), stock-token consumer apps (LOW). Hackathon-internal saturation: see Density Map.

| Category | Products on RH Chain | Distinct Roots | Saturation |
|---|---|---|---|
| launchpads | ~30 [C3 Bankless] | n/a | high |
| lending | Morpho (+few) | ~1-2 | low |
| stock-token consumer/savings | sparejar + few | n/a | low |

---

## Builder Project History (Copilot)
Copilot unavailable (copilot_available=false) — section omitted per spec; prior art covered under Past Editions via web.

---

## Key Links & Resources
| Resource | URL |
|---|---|
| Hackathon | https://worldisflat.fun/build · rules /build/rules · submit /build/me/submission |
| Project API | https://worldisflat.fun/build/api/projects · /api/event · /api/vote-window |
| Discord / X | https://discord.com/invite/PjXcRJ2uYY · https://x.com/WIFonRH |
| RH docs | https://docs.robinhood.com/chain/ |
| Stock token registry | https://api.robinhood.com/rhj/assets · /rhj/prices/{SYM} |
| Chainlink RH feeds | https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json |
| Explorer | https://robinhoodchain.blockscout.com |
| Quicknode Stock Token API | https://www.quicknode.com/docs/robinhood/stock-token-api/overview |
| GetBlock RH | https://getblock.io/nodes/robinhood/ |
| $WIF DEX | https://dexscreener.com/robinhood/0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79 |

---

## Track Coverage Matrix
| Track | Prize | Judging Focus | Overlap Potential | Est. Submissions |
|---|---|---|---|---|
| Stock Tokens | shared 10K | real $wif use + flywheel | onboarding, consumer, hooks&defi | LOW-MED |
| onboarding | shared | same | consumer, stock tokens, social | LOW |
| consumer and payments | shared | same | onboarding, social | MED |
| social and creators | shared | same | consumer | MED |
| hooks and defi | shared | same | stock tokens | MED |
| agents and ai | shared | same | tools | HIGH |
| games | shared | same | social | HIGH |
| tools and infra | shared | same | agents | HIGH |
**Multi-track targets:** Stock Tokens + onboarding + consumer (one product can tick all three; categories are tags, one prize).
**Low-competition:** onboarding, Stock Tokens.

---

## Domain Knowledge Sources
| Source | URL | Covers | Essential? |
|---|---|---|---|
| RH Building with Stock Tokens | docs.robinhood.com/chain/building-with-stock-tokens | ERC-8056, feeds, use cases | YES |
| RH Account Abstraction | docs.robinhood.com/chain/account-abstraction | EntryPoints, Alchemy/ZeroDev | YES (if onboarding) |
| RH Differences from Ethereum | docs.robinhood.com/chain/differences-from-ethereum | block.number, randomness, screening | YES |
| Chainlink RH tokenized equities | docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood | multiplier, pauses, off-hours | YES |
| RH Stock Token APIs | docs.robinhood.com/chain/stock-token-apis | REST prices/assets | YES |
| Uniswap v4 docs | docs.uniswap.org | swaps/hooks | YES if swap/hook |
| RH brand guidelines | docs.robinhood.com/chain/brand-guidelines | naming/logo rules (rule 11) | YES |
| RH restricted jurisdictions | docs.robinhood.com/rhj/restricted-jurisdictions | rule 14 geofence | YES if Stock Tokens |

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
