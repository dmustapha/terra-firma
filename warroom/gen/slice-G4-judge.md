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

## Prizes
| Track | 1st | 2nd/3rd | Notes |
|---|---|---|---|
| All 8 categories (one pool) | 10,000 USDG | none | winner-takes-all to team lead wallet [A1] |
Builder perks (dashboard): Quicknode Build plan free month; GetBlock RH RPC + EVM data streams + Market SQL [B2 — @WIFonRH/@getblockio X posts]

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

