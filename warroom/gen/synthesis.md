# Stage 2 — SYNTHESIS (WIF Warroom V1, 2026-11-10)
Inputs: G1–G5 returns (34 raw ideas: G1 7 · G2 7 · G3 7 · G4 7 · G5 6), gap-map, primitives-sheet, roster (49 entrants), research-brief, built-projects, winner corpora. One pass, file-only (no network).

## 1. Merge map (duplicate = problem AND mechanism substantially match)
| Merged name (kept) | Members (origin) | Why this one is kept / strongest why-this-chain claim kept | Folded-in parts |
|---|---|---|---|
| **Silt** — swap→personal stock jar hook | StockBack (G1#1), Silt (G3#1), Sweepstock (G4#2) | Silt's credit model is safest: recipient from `hookData`, not `tx.origin`; aggregator-route swaps without hookData go to a communal jar; guest-callable `jarReserves()`. U6 claim: v4 hooks + Stock Token ERC-20 + ERC-8056 + 24/7 Chainlink + USDG + $WIF on one ledger exist only on 4663 | StockBack's 28-day vesting-forfeit (retention); Sweepstock's opt-in round-up mode, fixed-unit 1-WIF sweep burn, and the "statement" view |
| **Ironweek** — WIF-bonded stock savings streak + retention oracle | Hold the Line (G1#3), Ironweek (G3#3), Holdfast (G4#4), Standing Order (G2#3) | Ironweek ships a live consumer contract for `isCommitted()` (C-IN1) and a hold-streak variant. U6 claim: Standing Order's goal is counted in ERC-8056 underlying shares (`balanceOfUI`) and is session-gated (tokenization window / 24/7 subset), which is the deepest claim in the cluster | Buddy pods (G1/G4); 7702 weekly cap where an over-cap attempt reverts (G2). This caps only the user's own savings, so it is not an agent spend-wall and does not duplicate leash |
| **Potluck** — group-owned stock basket | Squad Shares (G1#2), Potluck (G3#2), Ticker Club (G4#3), Cap Table (G2#7) | Ragequit in-kind before execution (G2/G3) is the whitehat line and the thing that separates it from a burn-ballot. U6 claim: an equity club needs stock ERC-20s + Chainlink NAV + USDG + WIF | Telegram-native invite path (G1); hostile-proposal revert (G4); decay-if-idle weight (G1) |
| **Rearview** — onchain-recomputed "memes vs NVDA" verdict + convert | Regret Ledger (G1#6), Should've Bought NVDA (G2#4), Rearview (G3#5), Counterfactual (G4#5) | G2's `publish()` verifier reverts on a forged line (`RoundMismatch`), which gives the strongest proof surface (L15). U6 claim: Chainlink historical rounds for equities sit on the same chain as the meme history, and the regret is actionable in the same place | Rearview's `recompute(tokenId)` on someone else's card; G4 GetBlock Market SQL indexer; G4 standing "convert-X%-of-gains" `poke()` rule; G3 30-day hold pledge |
| **Dividend Furnace** — stock dividends burn $WIF | Dividend Furnace (G2#2), Dividend Furnace (G4#1), Multiplier Mill (G5#2) | G4 funds the treasury with a hook skim, so the furnace has an inflow other than the builder, and principal can never leave. G2/G5 contribute the correct harvester math: delta shares = raw × (m1−m0); the feed already includes the multiplier, so it is divided back out; skim fraction is 1−m0/m1. U6 claim: a dividend exists as an onchain multiplier step only on RH ERC-8056 | G2 time-lock-weighted WIF lockers; G5 `oraclePaused()` harvest block; G4 Quicknode dividend calendar |
| **Vouch** — WIF-bonded onboarding into a first share | Vouch (G3#4), Godparent (G4#7), Starter Share (G1#5) | Vouch puts the risk on the recruiter (L2): the sponsor's WIF comes back only if the newcomer stays. U6 claim: the first thing a zero-crypto user owns is a real equity, with AA/embedded wallets live on 4663 | Godparent's 4-weekly-deposit release condition; Starter Share's "project pays CAC in burned WIF" escrow is kept as a B2B mode |
| **Flat Index** — WIF-curated stock-token index | Attention Index (G2#5), Flat Index (G3#6) | Stake-weighted median plus performance slashing (G3) means a curator has something to lose, so it is more than a poll. U6 claim: in-kind mint/redeem at Chainlink NAV works around thin stock AMMs | G2 session-aware mint gate (`StaleSession` revert); G2 toward-target rebate |
| **Ex-Date Guard** — corporate-action/session-aware stock-pool hook | Ex-Date Guard (G2#1), Bellhook (G5#3) | Deepest native-signal use in the pool: `newUIMultiplier`/`effectiveAt`, `oraclePaused`, tokenization window, 24/7 feed subset. Ported elsewhere, mechanisms 1–3 have no inputs | Bellhook's WIF-as-quote-asset pools go to hybrid H4; WIF LP bond (G2) |

Unmerged singles (9): WIF Fair Mark (G1#4), Rescue Raft (G1#7), Paid in Shares (G2#6), Splitleaf (G4#6), Ballast (G3#7, composite), Equity Floor (G5#1), Closing Cross (G5#4), Shareholders League (G5#5), Stock Envelope (G5#6).

**Totals:** 34 raw → 25 absorbed into 8 merged ideas, plus 9 singles = **17 unique**.
**Convergence signal:** 4 of 5 generators independently produced the jar, streak, basket and counterfactual clusters, and 3 produced the dividend-burn cluster. Agreement across generators does show where the whitespace is (W1/M1/M3). Under L12, though, it also warns that rivals can reach these ideas easily, so the Novel scores of these clusters are held at ≤4 unless a hybrid adds a mechanism no generator produced.

## 2. Hybrids (cross-generator: the strongest mechanism from one generator plus the strongest wedge from another)
### H1 — Keel ★multi-layer — "Every $WIF trade leaves you real stock, and every dividend that stock pays burns $WIF."
- **Parents:** mechanism = Silt hook + jar (G3#1). Wedge = Dividend Furnace "real-company dividends burn WIF" (G4#1, harvester math from G2#2/G5#2). Retention layer = Ironweek hold-commitment (G3#3/G1#3).
- **One hero loop, five load-bearing layers:**
  1. A v4 `afterSwap` skim on a WIF/USDG pool credits the trader's jar via `hookData`; aggregator routes credit a communal jar.
  2. A permissionless `settle()` converts to the chosen Stock Token, with a Chainlink-bounded min-out and a staleness check, and a fixed WIF burn on each settle.
  3. ERC-8056 yield split: jar principal (underlying shares) stays the user's forever. Only multiplier growth since the last harvest is yield, and a fixed slice of it is sold (capped chunks) to buy and burn WIF. The rest compounds in the jar.
  4. Hold-commitment bond: a user who locks WIF and commits "don't withdraw for N weeks" pays a lower skim and earns forfeits from people who break. Half of each forfeit is burned.
  5. Ownerless, verified, with a guest-callable `keel()` view: holdings × Chainlink ≥ claims, plus WIF burned by source.
- Each layer feeds the next. Trading fills jars (L1→L2), jars produce dividend burns (L3), and commitment keeps jars and volume in place (L4).
- **Primitive(s) adapted:** F04 (aggregator-hook router), F01 (round-up), F03 (streak bond), F07 (live reserve binding), P2.
- **Law-check:** L2: the trader risks their own vesting/bond; principal drain and below-band settle are unrepresentable (no withdraw-principal path, Chainlink revert). L3 risk: 5 layers. Mitigation: the one-liner is a single causal sentence, and layers 4–5 can be cut without breaking it. L11: top-weighted axes are A (real reason) and B (flywheel). L12: "Keel" is non-modal. Distinct from Underfoot, which is burn-WIF-to-redeem a floor; Keel gives the user stock and makes the stock's yield burn WIF, with no redemption against a reserve.

### H2 — Crew ★multi-layer — "Own real stocks with your group chat. Bring a friend in by betting $WIF they'll stay."
- **Parents:** mechanism = Cap Table vault + ragequit in-kind (G2#7). Wedge = Vouch retention-conditioned sponsor bond (G3#4). Weight rule = Hold the Line deposit-streak decay (G1#3).
- **Layers:**
  1. Club vault with Chainlink NAV, an allow-list, and timelocked, band-bounded execution.
  2. Invite = Vouch. The inviter locks WIF, and the zero-crypto invitee joins by email (Privy + 4337) and receives their first club shares. The inviter's WIF returns with a bonus if the invitee is still depositing after 4 weeks, and is partly burned if not.
  3. Voting weight = locked WIF × deposit-streak factor, so free-riders decay.
  4. A fixed WIF burn on each proposal.
  5. Ragequit in-kind at any time before execution.
  6. ERC-8056 dividends credited pro-rata.
- **Primitive(s) adapted:** F02, F08, F03.
- **Law-check:** L2: a majority cannot steal (ragequit), a sybil invite costs the inviter, and the proposer burns their own WIF. L3: the club basket is the product; vouching is its growth organ. L11: A + B. L12: "Crew" is low-collision; avoid "Club".

### H3 — Rearview Raft — "Prove what your dead memes cost you, then exit them fairly into the stock you should have bought."
- **Parents:** wedge = Rearview verdict (G3#5). Mechanism = Rescue Raft pooled FCFS-fair sliced exit (G1#7).
- **Layers:** verified counterfactual card → board a raft for that token → sliced batch exit → Chainlink-bounded stock landing → WIF raft bond and burn.
- **Primitive(s) adapted:** F05, F01, F02.
- **Law-check:** L2: the raft opener bonds WIF; per-depositor priority is unrepresentable. L3: the card is the product and the raft is its consequence. L12 ok.

### H4 — Bellwether — "Buy NVDA with $WIF directly: a stock pool hook that can't be picked off at splits, weekends or pumps."
- **Parents:** WIF-as-quote-asset stock pools (G5#3 Bellhook) + Ex-Date Guard band/session/ex-date guard (G2#1) + WIF Fair Mark clamped multi-pool WIF mark (G1#4), used as the execution bound on the WIF leg. This is the Gate-8 rescue home for Fair Mark.
- **Layers:**
  1. NVDA/WIF and TSLA/WIF v4 pools.
  2. Chainlink-band plus Fair-Mark-band execution guard.
  3. `effectiveAt` and `oraclePaused` circuit breaker.
  4. Session surcharge charged in WIF and burned.
  5. WIF-bonded Fair Mark pokers.
- **Primitive(s) adapted:** F04, F07.
- **Law-check:** L2: the arb against the LP is unrepresentable; pokers bond WIF. L3: "the WIF→stock rail that can't be gamed". L11: C + A. L12 ok.

### H5 — Orchard — "Your $WIF trades water a garden of real stocks."
- **Parents:** game grammar = Splitleaf (G4#6). Mechanism = Silt jar (G3#1).
- **Mechanics:** each plot is an ERC-721 wrapping a real jar position. Swaps through the hook "water" plots. Splits and dividends from ERC-8056 render as stems and fruit. A WIF seed burn unlocks a ticker. Missing a week wilts the plot, with deterministic growth and no randomness.
- **Primitive(s) adapted:** F09, F04, F01.
- **Law-check:** L2: the plot NFT is the only key and there is no seize path. L3: the garden is the portfolio. L11 caution: spectacle is the strongest axis, but WIF is the only seed. L12 ok. A 2D grammar stays outside the 3D/dungeon cluster.

## 3. Late entrants (labeled, no protection)
| Tag | Name | Source pattern | Chain DNA × community problem | Law-check (real) |
|---|---|---|---|---|
| [SEED] S1 | Prize Jar — no-loss prize-linked stock savings | Savera / Piggy Wallet savings winners (NON-AGENT corpus) + the PoolTogether pattern | Stock Tokens × "no reason to return" | L2 ok. Breaks on randomness: prevrandao is constant on RH, and drand needs an offchain relay → **broken dependency** |
| [SEED] S2 | Family Stock Lock — a time-locked equity goal for a child | Piggy Wallet (ETHGlobal, youth savings in high-inflation economies) | Stock Tokens × non-US retail | L3 ok. WIF has no load-bearing role (a fee at most) → L11/[C] WIF fail |
| [SEED] S3 | Shipshare — tokenized revenue share of an RH builder, paid in WIF | attn.markets (Cypherpunk, revenue tokenization) | $WIF × builder economy | L2 ok. Builder bounties are already occupied (Proof of Ship), and entrants have ~0 revenue (C13) |
| [SEED] S4 | Selfpay — a Morpho stock-collateral credit line whose dividends repay it | Hobba (Cypherpunk DeFi, self-repaying loans) + Morpho stock collateral (shipped 2026-10-22, L5) | Morpho NVDA/SPY collateral × ERC-8056 × USDG | L2: borrower's own collateral; the repay path is fixed to the multiplier delta. L3 ok. L11 risk: WIF is only a repay-fee burn |
| [HISTORY] H-1 | Stock Backstop — Chainlink-triggered deleverage of a Morpho stock position before liquidation | SolvencySwap/Backstop (Chainlink forced swap on health drop) | Morpho × Chainlink 24/7 | Self-duplication (C15, SolvencySwap) and occupied by Lastbell (stock stops) |

## 4. Contract backfill
Every pool idea carries primitive(s) adapted + law-check: G1–G4 ideas carry them in their returns, G5 ideas = "none — clean-room origin", hybrids and late entrants are above. Gate 0 is a full pass (see pool-gates.md).

## 5. Final pool list entering gates (27)
- Unique (17): Silt · Ironweek · Potluck · Rearview · Dividend Furnace · Vouch · Flat Index · Ex-Date Guard · WIF Fair Mark · Rescue Raft · Paid in Shares · Splitleaf · Ballast · Equity Floor · Closing Cross · Shareholders League · Stock Envelope
- Hybrids (5): H1 Keel · H2 Crew · H3 Rearview Raft · H4 Bellwether · H5 Orchard
- Late (5): S1 Prize Jar · S2 Family Stock Lock · S3 Shipshare · S4 Selfpay · H-1 Stock Backstop
