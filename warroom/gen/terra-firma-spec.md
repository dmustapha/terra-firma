# Terra Firma — deliberated finalist spec (merge of Rearview × Keel, + friend jars from Crew)
**Tagline:** The world is flat. Stand on solid ground.
**10-second line:** Paste your wallet. See what your memes cost you in NVDA. Fix it in one tap. From then on, every $WIF trade sweeps a slice into real stock you own.
**Origin:** user_override redirect at pool_checkpoint (Dami 2026-11-10): merge Rearview + Keel; D1 router-on-existing-pool, D2 savings-sweep + burn + bond, D3 medium social (friend jars), D4 name "Terra Firma". Ex-Date Guard killed; its Chainlink oracle-band settle folded in.

## Load-bearing mechanisms
1. **Hindsight card (front door).** Indexes a wallet's RH Chain meme buys from swap logs (GetBlock/Quicknode RPC); prices what was paid using the ETH/USD (or USDG) Chainlink round at that block, and the counterfactual stock (NVDA/SPY…) from the historical stock-feed round at that time → now. Pricing is recomputable onchain from (amountUSD, timestamp, roundIds); wording: "receipts-backed, priced onchain". Shareable X card.
2. **One-tap convert.** Sell chosen meme tokens → USDG/WETH → a feed-backed Stock Token via existing deep Uniswap pools (NVDA/USDG v3 $1.95M), min-out bounded by Chainlink (staleness + 24/7 feed preference; ~37 feed-backed tokens only). Lands in the user's **Jar** (a per-user vault only they control; withdraw anytime — the stock is theirs).
3. **Terra Router (the sweep).** Users trade $WIF through Terra Firma's router on the EXISTING WIF/ETH Uniswap v4 pool (no new liquidity needed). A user-set sweep % of each trade (taken in ETH after the swap — never pricing WIF) is swept into their Jar as stock. The sweep is the user's own savings, not a fee.
4. **$WIF burn + bond.** A small protocol fee on converts/sweeps buys $WIF in per-block-capped chunks and burns it (`burn()`); $WIF bonders (lock WIF) pay zero fee and get a matched sweep funded by the fee pool. No WIF spot price is ever used for value; caps bound manipulation to dust.
5. **Friend Jars (social, D3 medium).** Invite a friend by link into a shared Jar: email login via embedded wallet (Privy/ZeroDev) + sponsored gas (ERC-4337) so a zero-crypto friend's first action is free; both contribute; ownership pro-rata onchain; exit anytime with their share of real stock.
6. **Weekly report + streak.** Jar growth in shares (ERC-8056 multiplier-aware, Quicknode Stock Token API), refreshed Hindsight card, saving streak; live dividend bonus beats on COST (Nov 13) and AAPL (Nov 16) during judging.
7. **Safety + compliance.** Ownerless/minimal-admin verified contracts; Chainlink staleness + paused-feed checks; FCFS-aware; geofence for restricted jurisdictions on the stock leg (rule 14); no Robinhood name/logo (rule 11).

## Flywheel (form answers)
- What someone does: pastes a wallet, sees their meme regret in real stock, converts, then trades $WIF through Terra Firma.
- What happens to $WIF: every convert/sweep fee buys and burns $WIF; bonders lock $WIF for fee-free, matched sweeps.
- Why they (and others) come back: their Jar of real stock grows with every trade and every dividend; weekly report + streak; Hindsight cards and friend-jar invites pull in new people.

## Known honest caveats
- Hindsight "proof" = receipts-backed pricing, not onchain tx-history reads.
- Dividends are small (~+0.02%/step); a bonus, not the headline.
- Fee→burn amounts start small; the mechanism is the point.

## AMEND-1 | 2026-11-10 | source: [USER] Dami approved D5 after cross-exam (Crew A1 KILLING BLOW "net seller of $WIF" landed)
- **10-second line (new):** "Every meme you trade builds you real stock. Every trade burns $WIF." Hindsight card stays the front door.
- **Router scope:** the Terra Router works for ANY Robinhood Chain memecoin on Uniswap (WIF/ETH v4 pool verified; launchpad meme pools incl. Pons-hooked pools), not only $WIF. Every trade sweeps the user's chosen slice (taken in ETH/USDG after the swap) into their real-stock Jar.
- **$WIF flow (net-positive):** a protocol fee on every routed trade/convert buys $WIF (per-block capped, never priced for value) and burns it. $WIF is NEVER a convert target and the product never sells users' $WIF. Hindsight cards analyse all memes but convert only non-WIF memes.
- **Bond:** lock $WIF → fee DISCOUNT (not zero; burn never goes to zero) + boosted matched sweep from the fee pool. Locked WIF leaves circulating supply while locked.
- **Friend Jars:** onboarding layer (email login, sponsored gas, co-owned stock); NO time-locked vouch (Crew's Dec-3 failure mode).
- **Third-party hook disclosure:** WIF/ETH pool hook 0xe5e7…e044 (afterSwapReturnDelta, owned) — router enforces user min-out; documented in SECURITY.md.
- **Data:** normalize early NVDA rounds (18dp-scaled pre-Aug); Hindsight history from 2026-06-22.

## AMEND-2 | 2026-11-10 | source: [USER] Dami approved D6 after challenge (R1 CRITICAL "$WIF fails delete test", R3 CRITICAL scope)
- **$WIF = the axis: "Stake $WIF, earn real stocks."** Every routed meme trade/convert pays a small protocol fee; the fee pool splits 50/50: (a) buy $WIF (per-block capped) and `burn()` it; (b) buy real Stock Tokens (Chainlink-bounded) streamed pro-rata to $WIF stakers' Jars. $WIF is the claim on protocol revenue, paid in real stocks. Delete $WIF → no stock stream → product collapses to a plain savings app (delete-test PASS). Distinct from Underfoot (burn-to-redeem floor): ours is stake-for-revenue-stream.
- **Hindsight excludes $WIF** (never shows WIF losses; CTA "Stake $WIF, earn stock").
- **Core = 4 load-bearing mechanisms:** (1) Hindsight card (receipts-backed, Chainlink-priced counterfactual) → one-tap convert of non-WIF memes into a feed-backed Stock Token Jar; (2) Terra Router: any-meme Uniswap routing + user sweep into their Jar (ETH/USDG side, min-out enforced); (3) $WIF staking: fee pool → 50% buy&burn WIF, 50% real-stock stream to stakers; (4) Safety layer: Chainlink staleness/paused checks + min-out bands, ownerless verified contracts, never price WIF for value, geofence, SECURITY.md incl. third-party hook disclosure.
- **Stretch (only after core is green on mainnet):** Friend Jars (email login + sponsored gas + co-owned stock, no time-locked vouch); weekly report + streak.
- **Dividends removed from the pitch** (fact correction: COST step already applied 2026-11-02 15:45 UTC; AAPL none pending; API dates are pay dates) — stock in Jars simply carries its real ERC-8056 multiplier; no live dividend beat claimed.

## AMEND-3 | 2026-11-10 | source: [USER] Dami: "shouldnt it be connect wallet?"
- Entry: **Connect wallet** is the hero action (your Hindsight card → convert → Jar → stake; all signed). Secondary small link **"or look up any wallet"** = read-only card for anyone (judges, friends, CT); every looked-up card ends with "Connect to fix yours."

## AMEND-4 | 2026-11-10 | source: [USER] Dami — primary user + "how" ratification
- **Primary user (ratified):** non-US Robinhood Chain memecoin trader; already has a wallet with ETH on RH (MetaMask/Rabby/Coinbase/Robinhood Wallet via WalletConnect); buys memes by pasting CAs from X/Telegram; probably down on memes; never bought a stock token. **Web AND mobile both first-class** (responsive from day one; judges on desktop, voters on phones). Plain-language $ + share amounts; minimal signatures (Permit2 + 1 tx); CT-native roast-y cards.
- **Trade + routing (ratified):** meme terminal — paste CA → buy/sell; Terra Router over Uniswap Universal Router (v2/v3/v4 incl. hooked launchpad pools), onchain min-outs; any meme with a Uniswap pool to WETH. No off-chain aggregator in the money path.
- **Staking reward (ratified): staker picks** a reward stock from the curated 6 (NVDA, TSLA, GOOGL, SNDK, SPY, QQQ); one reward sub-pool per stock (separate accRewardPerShare); hourly distribute() splits the stock half by stake-weight per chosen stock (≤6 Chainlink-bounded buys/epoch).
- **Tech defaults (ratified):** (a) Jar = one ownerless contract with per-user ledger; (b) Hindsight indexing = GetBlock RPC logs + Envio HyperSync fallback; (c) sweep buys stock in the same tx as each trade (not batched).
- **Hindsight method:** meme buy = meme token received in a tx where the wallet paid ETH/WETH/USDG (airdrops/free transfers excluded; stock tokens, WIF, stables excluded); paid USD via ETH/USD (or USDG/USD) Chainlink round at that block; counterfactual via the chosen stock's historical round → now (multiplier-adjusted feed, normalize pre-Aug NVDA 18dp rounds); current meme value via Uniswap quote; public recompute() view; OG-image card for X.
