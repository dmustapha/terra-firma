# Terra Firma — Product Requirements Document

**Hackathon:** World is Flat Hackathon (@WIFonRH), Robinhood Chain
**Track:** Stock Tokens (primary) + hooks and defi, consumer and payments, onboarding
**Network:** Robinhood Chain MAINNET, chainId 4663 (PULSE Active Fact; brief's 46630 is superseded)
**Deadline:** 2026-11-12 17:30 UTC (18:30 WAT). Internal submit target: 2026-11-12 08:00 WAT (approval lag >= 24h). Live until 2026-11-16 17:30 UTC.
**Version:** V1 (forge, 2026-11-10)
**scope_mode:** see `.forge-state.json` (canonical; this header does not re-declare it)
**Thesis:** canonical in `warroom/WINNER-BRIEF.md ## Thesis` (base + AMEND-1). This PRD references it and never restates it with modification.

---

## 1. Project Overview

### One-Liner
Connect your wallet, see what your memes would be in NVDA today, move the dead ones into real stock with one confirmation (after a one-time approval per meme), and from then on every meme you trade builds you real stock while burning $WIF.

### Thesis framing (Thesis field 1, WINNING ARGUMENT, by reference)
Terra Firma is the only entry that turns Robinhood Chain's memecoin activity into real stock ownership and makes $WIF the token that earns from it (WINNER-BRIEF ## Thesis, field 1). Every section below serves that single loop: memes in, real stock out, $WIF captures the value.

### Problem Statement
Robinhood Chain was built for tokenized stocks, but memecoins took it over. About 15,000 tokens launch daily and about 84% never trade again (Bitquery, research-brief.md). Memecoin volume fell about 96% from its September peak and only 5 tokens hold more than $10M of market cap. Meanwhile 203 real Stock Tokens sit on the same chain, with Chainlink feeds, deep Uniswap pools (NVDA/USDG v3 $1.95M liquidity) and 24/7 pricing for four of them. Meme traders have no habit and no one-tap path from the casino to the asset that is one contract call away.

**The one shocking number** is personal: the Hindsight card prices it per wallet, for example "You put $340 into memes you still hold. They are worth $41 today. In NVDA that $340 would be $512." Every number on that card is derived from onchain logs and Chainlink rounds, never typed.

### Solution
Terra Firma is a meme terminal with a savings account bolted to it.
1. **Hindsight card:** connect a wallet; we index its meme buys from onchain logs, price what was paid from the Chainlink ETH/USD round at that time, and price the counterfactual from the historical NVDA/USD round. Shareable as an X card.
2. **One-tap convert:** sell the non-$WIF memes you pick into a real NVDA (or other curated) Stock Token, with a Chainlink-bounded min-out, into your **Jar**: an ownerless contract ledger you can withdraw from any time.
3. **Terra Router:** a meme terminal (paste a contract address, buy or sell) that routes through the Uniswap Universal Router across v2/v3/v4 pools, including hooked launchpad pools. Every trade sweeps your chosen slice (default 2%) into real stock in your Jar, in the same transaction.
4. **Stake $WIF, earn real stocks:** a 0.5% protocol fee on every routed trade and convert goes to a fee pool. Each hourly epoch, half buys $WIF (per-call capped) and burns it; half buys real stock (Chainlink-bounded) streamed to $WIF stakers, each staker picking their reward stock from NVDA, TSLA, GOOGL, SNDK, SPY, QQQ.
5. **Safety layer:** Chainlink staleness and paused checks plus min-out bands on every stock fill, ownerless verified contracts, $WIF never priced for value and never sold, restricted-jurisdiction geofence on the stock leg, and a SECURITY.md that discloses the third-party owned hook on the WIF/ETH pool.

### Why This Wins
Judging criteria are verbatim from the rules: "a real reason to use $wif, a flywheel that holds up, and something that works and is built well" (no weights published; config.json derives near-equal 34/62/62).

| Judging Criterion | Weight | How We Excel |
|---|:---:|---|
| Real reason to use $WIF | 34% | $WIF is the claim on protocol revenue paid in real stocks, plus the burn sink on every trade. Delete $WIF and the stock stream disappears (delete-test PASS, AMEND-2). $WIF is only ever bought, burned, or staked. |
| Flywheel that holds up | 33% | Personal, non-speculative reason to come back: your Jar of real stock grows with every trade. More routed volume means more burn and a bigger staker stream, which makes staking $WIF more attractive, which tightens supply. The Hindsight card is the acquisition loop (every card is a shareable post). |
| Works and built well | 33% | Every load-bearing fact live-verified on mainnet (LAW#12 PASS + forge Phase 0B fork spike 5/5). Ownerless contracts, Foundry fork tests, Chainlink-bounded fills (-0.04% vs oracle measured), one-transaction trade+sweep (356k gas). |
| Community vote (1 judge seat) | n/a | ~1.45K active $WIF voter wallets are exactly the product's users. Every Hindsight card is a ship-thread post (OD8, Dami approves every post). |

### Uncontested lane
0 of about 49 entrants convert meme activity into owned stock (strategy-density.md). Nearest neighbours: Underfoot (burn-to-redeem floor), Lastbell (stops), WIF League / Fallpit (prediction). Terra Firma is a stake-for-revenue-stream design, not a redeem floor.

---

## 2. System Architecture Overview

### System Diagram
```
                         ┌──────────────────────────────── Browser (web + mobile, Next.js) ───────────────────────────────┐
                         │  /  landing  ·  /app  Hindsight + convert  ·  /trade  meme terminal  ·  /jar  ·  /stake  ·        │
                         │  /card/[addr]  read-only lookup + OG image  ·  /proof  live tx + contract proof                  │
                         └───────┬──────────────────────┬──────────────────────────┬──────────────────────────┬────────────┘
             wallet sign (wagmi) │      GET /api/hindsight│?addr        GET /api/quote│?route        GET /api/geo │ (IP country)
                                 │                       ▼                          ▼                          ▼
                                 │        ┌──────────────────────────┐  ┌───────────────────────┐   Vercel edge header
                                 │        │ Hindsight Indexer (API)  │  │ Route Builder (API)    │   x-vercel-ip-country
                                 │        │ per-token getLogs ──────►│  │ meme registry + V4Quoter│
                                 │        │ tx.value, round table    │  │ / QuoterV2 eth_calls   │
                                 │        └──────────┬───────────────┘  └──────────┬────────────┘
                                 │                   │ GetBlock RPC (FRA/NYC), public RPC fallback
                                 ▼                   ▼                             ▼
 ┌────────────────────────────────────────── Robinhood Chain mainnet 4663 ──────────────────────────────────────────────────┐
 │                                                                                                                        │
 │  TerraRouter ── execute(commands) ──► Uniswap Universal Router 0x8876…0904 ──► v2 / v3 / v4 pools (incl. hooked)       │
 │   │  buy/sell/convert                                                         │                                        │
 │   │  fee 0.5% ETH ─────────────► FeePool ── distribute() hourly, permissionless│                                        │
 │   │  sweep s% ETH → stock ──┐        │ 50% ETH → WIF (v4 hooked pool) → WIF.burn()                                       │
 │   ▼                         │        │ 50% ETH → stock per sub-pool (Chainlink-bounded) → WifStaking.notifyReward        │
 │  Jar (ownerless ledger) ◄───┘        ▼                                                                                 │
 │   ▲   withdraw anytime          WifStaking (6 reward sub-pools, staker picks, next-epoch activation, 24h unstake)      │
 │   └──────── claim() rewards ────────┘                                                                                  │
 │  StockOracle (Chainlink ETH/USD + 6 stock feeds; staleness, paused, min-out math)                                      │
 │  HindsightLens (view: recompute(card) from roundIds; optional mintCard burns tiny $WIF)                                 │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ distribute() every hour when fees >= threshold
                 ┌───────────────┴───────────────┐
                 │ Keeper (GitHub Actions cron)  │  stateless; deployer key in repo secrets; health in /proof
                 └───────────────────────────────┘
```

### Component Table
| # | Component | Type | Purpose | Key Dependencies |
|---|-----------|------|---------|-----------------|
| C1 | TerraRouter | Solidity contract | Meme buy/sell/convert via Universal Router; takes 0.5% fee; sweeps s% into stock in the Jar in the same tx; refuses $WIF as a sell input | Universal Router, Jar, FeePool, StockOracle, WETH |
| C2 | Jar | Solidity contract | Ownerless per-user ledger of Stock Token balances; deposit only by immutable depositors; user withdraw anytime | Stock Token ERC-20s |
| C3 | FeePool | Solidity contract | Holds ETH fees; hourly permissionless distribute(): 50% buy+burn $WIF (capped), 50% buy reward stocks per sub-pool weight (Chainlink-bounded) | Universal Router, $WIF, StockOracle, WifStaking |
| C4 | WifStaking | Solidity contract | Stake $WIF with a chosen reward stock (6 sub-pools); epoch-delayed activation; 24h unstake delay; claim() credits rewards to the Jar | $WIF, Jar, FeePool |
| C5 | StockOracle | Solidity library/contract | Chainlink reads: ETH/USD + stock feeds, staleness and zero/paused checks, minOut(ethIn, stock, band) | Chainlink AggregatorV3 proxies |
| C6 | HindsightLens | Solidity contract | View recompute() of a card from (usdPaid, roundIds); optional mintCard() that burns 1 $WIF and emits the card | Chainlink feeds, $WIF |
| C7 | Hindsight Indexer | Next.js API route (serverless) | Builds a wallet's card from per-token getLogs + tx.value + static Chainlink round table + live quotes | GetBlock RPC, meme registry, round table |
| C8 | Route Builder | Next.js API route + shared TS lib | Picks the best pool for a meme (registry + live quotes), returns typed Route params and quoted min-outs | V4Quoter, QuoterV2, meme registry |
| C9 | Frontend | Next.js 15 App Router + wagmi/viem | Landing, Hindsight, convert, meme terminal, Jar, staking, card lookup, proof; web + mobile first-class; geofence | wagmi, viem `robinhood` chain, C7, C8 |
| C10 | Keeper | GitHub Actions cron + TS script | Calls FeePool.distribute() hourly when fee balance >= threshold; writes a heartbeat | viem, deployer key (secret) |
| C11 | Data scripts | TS scripts | Build meme registry (pool keys from Initialize logs) and Chainlink round table JSON | GetBlock RPC |
| C12 | Friend Jars (gated, OD7) | Solidity contract + embedded-wallet UI | Shared Jar with pro-rata ownership; invite link; email login + sponsored first tx (Privy or ZeroDev on 4663, TF4 VERIFIED) | Jar, TerraRouter, Privy/ZeroDev |
| C13 | Live Stream route | Next.js route handler (SSE) | Server-side GetBlock WSS `eth_subscribe` logs for our contracts, re-emitted to browsers as Server-Sent Events | GetBlock WSS, viem |

### Data Flow
A user connects a wallet. The frontend calls `/api/hindsight?addr=`, which loads the static meme registry (token addresses + first blocks), runs batched per-token `eth_getLogs` for `Transfer(*, wallet)` in 10M-block spans, keeps transfers whose sender is a contract (pool or router), fetches the parent transactions to read `tx.value` paid to the Universal Router, prices each payment with the Chainlink ETH/USD round at that time from a static round table, prices the counterfactual with the NVDA/USD round at that time, and prices today's holdings with a live quote. The card returns with every input (tx hashes, roundIds) so the browser or HindsightLens can recompute it.
When the user converts, the Route Builder returns one Route per selected meme; the user approves each meme to TerraRouter once and signs one `convert()` transaction. TerraRouter pulls the memes, pushes them to the Universal Router, sells them to ETH, takes 0.5% to FeePool, and buys the chosen stock with a Chainlink-bounded min-out, crediting the Jar.
When the user trades in the meme terminal, `buy()` or `sell()` does the same in one transaction with the sweep slice.
Every hour the keeper (or anyone) calls `FeePool.distribute()`: half the fee ETH buys $WIF through the owned-hook v4 pool (per-call capped) and burns it; half buys each sub-pool's stock proportional to active stake and notifies WifStaking. Stakers' rewards accrue per sub-pool and `claim()` moves them into their Jar balance.

---

## 3. User Flows

Hero flow = Thesis field 4 HERO FLOW as amended by AMEND-1 (canonical in WINNER-BRIEF): connect wallet → your Hindsight card → convert memes to NVDA in one tap → trade a meme via Terra Router → watch the Jar grow and $WIF burn; secondary read-only "look up any wallet" link.

### Flow 1 (F1): Connect → Hindsight card (hero step 1)
1. User lands on `/`, reads "The world is flat. Stand on solid ground." and taps **Connect wallet** (wagmi: injected, WalletConnect, Coinbase Wallet; RH mainnet 4663).
2. If the wallet is on another chain, the app requests `wallet_switchEthereumChain` to 4663 (adds it if missing).
3. App routes to `/app` and calls `/api/hindsight?addr=<wallet>`; a skeleton card shows progress ("scanning 25 memes…").
4. Card renders: total paid (USD), value today (USD), "in NVDA it would be" (USD + shares), per-meme rows (symbol, paid, today, NVDA counterfactual), worst trade highlighted.
5. Every number has an info toggle: tx hash, block time, Chainlink roundId and answer used.
6. CTAs: **Fix it: convert to NVDA** (Flow 3) and **Share card** (Flow 2).
- Edge E1a: wallet holds none of the tracked registry memes → card says "None of the 21 memes we track are in this wallet." and offers Flow 4 (stake) and Flow 5 (terminal). The card is labelled "what you paid for memes you still hold (gross buys, not net P&L)"; sells and transfers out are not netted.
- Edge E1b: RPC 429 or timeout → retry with backoff (3 attempts), then fall back to the second GetBlock region, then public RPC; if all fail, show "Chain is busy, retry" with no partial numbers.
- Edge E1c: memes bought with WETH/USDG or curated stock tokens (no tx.value) → priced from the receipt's outgoing Transfer + the matching Chainlink round (F-026); buys paid in any other token are shown as "paid in tokens, not priced" and excluded from totals (honesty over coverage).

### Flow 2 (F2): Look up any wallet (read-only) + share
1. On `/` a small link "or look up any wallet" opens an address/ENS-free input (0x only).
2. `/card/[addr]` renders the same card read-only, ending with **Connect to fix yours**.
3. **Share** opens an X intent with the text and the `/card/[addr]` URL; the page's OG image (`/card/[addr]/opengraph-image`) renders the card server-side.
- Edge E2a: invalid address → inline error, no request.
- Edge E2b: address is a contract → card still renders (EIP-7702 EOAs carry code; never filter on code).

### Flow 3 (F3): One-tap convert into the Jar (hero step 2)
1. From the card, user selects memes to convert (defaults: all non-$WIF memes with a quoted value >= $0.50), picks the target stock (default NVDA; 24/7 four first).
2. Geofence check (Flow 8). If blocked, convert is disabled with the reason.
3. App fetches Routes from `/api/quote`, shows: you sell X, Y, Z; you receive ≈ N NVDA (≈ $V); fee 0.5%; min-out bound (Chainlink - 3%).
4. App checks allowances; for each meme lacking allowance it asks for `approve(TerraRouter, amount)` (one signature per new meme; v1 uses exact-amount approvals).
5. User signs `convert(routes, stock, minStockOut)`.
6. Success screen: "You now own 0.0243 NVDA", explorer link, Jar balance updated; card re-computes.
- Edge E3a: a meme's quote fails or its pool is illiquid → that meme is unselectable with "no route".
- Edge E3b: Chainlink stale (> heartbeat bound) or paused → contract reverts `StaleOracle`; UI pre-checks and shows "market data paused, try later".
- Edge E3c: user tries to include $WIF → not offered in UI; contract reverts `WifNotSellable` if forced.
- Edge E3d: price moves beyond min-out → revert `Slippage`; UI offers a re-quote.

### Flow 4 (F4): Stake $WIF, pick a reward stock
1. `/stake` shows: your $WIF, current epoch countdown, each of the 6 sub-pools (stock, total staked, last epoch reward), the burn counter.
2. User picks a stock (default NVDA), enters an amount, approves $WIF to WifStaking, signs `stake(amount, stockId)`.
3. UI shows "Active after one full epoch (from e+2)" (anti-JIT).
4. After each distribute, the user's pending reward grows; **Claim to Jar** signs `claim()` and the stock lands in their Jar.
5. **Unstake** signs `requestUnstake(amount)`: stops earning immediately; **Withdraw** unlocks 24h later.
- Edge E4a: user switches reward stock → `switchStock(stockId)` claims pending first, the moved stake re-activates after one full epoch (e+2).
- Edge E4b: SPY/QQQ feeds stale on weekends → that sub-pool's buy is skipped and its ETH share carries to the next epoch (no forced fill at a stale price).

### Flow 5 (F5): Meme terminal trade with sweep (hero step 3)
1. `/trade`: paste a meme contract address (or pick from trending registry list).
2. App resolves the token (symbol, decimals, logo if known) and the best Route (v2/v3/v4, hooked or not; stock-paired memes route to their stock pair only for sells into stock, see Section 4 C8).
3. Buy tab: enter ETH amount; shows meme out, sweep (2% default, slider 0–10%), fee 0.5%, "NVDA to your Jar ≈ …". Sell tab: enter meme amount; shows ETH out after fee and sweep.
4. User signs `buy(route, sweepBps, stockId, minMemeOut, minStockOut)` (ETH value) or approves + signs `sell(route, amountIn, sweepBps, stockId, minEthOut, minStockOut)`.
5. Success: meme lands in the wallet, sweep lands in the Jar, fee lands in FeePool; the UI shows all three with explorer links and the FeePool's pending burn.
- Edge E5a: token not in registry → app discovers pools on the fly (Initialize logs for v4, factory getPool for v3/v2); if none found, "no Uniswap pool".
- Edge E5b: fee-on-transfer meme → quote vs received mismatch; route marked unsupported (v1 does not route taxed tokens).
- Edge E5c: geofenced user → sweep forced to 0 and stock leg hidden; meme trade still allowed; fee still applies (fee buys $WIF and stock for stakers, not for the user).
- Edge E5d: buying $WIF through the terminal is allowed (it routes through the hooked WIF/ETH pool); selling $WIF is not offered.

### Flow 6 (F6): Jar
1. `/jar` lists the user's stock balances in the Jar: raw balance, shares (balance × `uiMultiplier()`), USD value from Chainlink, source breakdown (converts, sweeps, staking rewards) from events.
2. **Withdraw** signs `withdraw(stock, amount)` sending the real token to the wallet.
- Edge E6a: zero balance → empty state with "Your Jar is empty. Convert a meme or trade one." plus Hindsight CTA.

### Flow 7 (F7): Distribute epoch (keeper or anyone)
1. Each hour the keeper reads `FeePool.canDistribute()`; if the epoch elapsed and ETH balance >= threshold, it sends `distribute()` (gas limit 3,500,000).
2. FeePool buys $WIF (capped at `maxWifBuyEth` per call), burns all bought $WIF, buys each active sub-pool's stock, notifies WifStaking, emits `Distributed(epoch, wifBurned, stockBought[])`.
3. `/stake` and `/proof` show the new burn and stream.
- Edge E7a: epoch not elapsed → revert `EpochNotElapsed` (keeper skips).
- Edge E7b: one sub-pool's feed stale → skip that sub-pool, carry its ETH.
- Edge E7c: keeper down → anyone can call from `/proof` ("Run distribute" button).

### Flow 8 (F8): Geofence (stock leg only)
1. On first stock action the app reads `/api/geo` (country from `x-vercel-ip-country`) and shows a one-time attestation: "I am not a resident of a restricted jurisdiction (list)".
2. Restricted country or declined attestation → stock actions disabled (convert, sweep > 0, stake, claim), Hindsight and meme trades remain.
- Edge E8a: VPN/unknown country → attestation required; never silently allow.

### Flow 9 (F9): Mint the card (P2, optional $WIF burn)
1. On a card the user taps **Mint this card** (shown only when connected and holding >= 1 $WIF).
2. App approves 1 $WIF to HindsightLens (exact amount) and calls `mintCard(buys, stockId)`.
3. HindsightLens recomputes the card onchain, burns 1 $WIF from the user, emits `CardMinted`.
4. The card shows a "minted onchain" badge with the tx link; the share text includes it.
- Edge E9a: recompute fails (bad round bracketing) → revert `BadRound`, UI shows "card inputs changed, refresh".

### Flow 10 (F10): Judge verification walk (/proof)
1. Judge opens `/proof` (no wallet needed).
2. Page lists the 7 verified contracts with explorer links and "ownerless" badges (no owner functions).
3. Page lists the first-of-kind txs (convert, sweep, distribute with burn, claim) and live totals from events.
4. **Recompute a card** box: paste any address → runs `/api/hindsight` then `HindsightLens.recompute` via eth_call and shows both results side by side.
5. **Run distribute** button (connected wallet) for when the epoch has elapsed and the keeper hasn't run.
- Edge E10a: RPC degraded → page shows the last cached proof.json with its block number and a "live data unavailable" banner (never fabricates).

### Flow → demo scene map (Metric 2)
| Flow | Demo scene | What the judge sees |
|---|---|---|
| F1 Connect → Hindsight | Scenes 1–2 | Connect wallet first, then your card with receipts |
| F2 Look up any wallet | Scene 2 | secondary lookup of a real long-history wallet AFTER connecting (AMEND-1 order) |
| F3 Convert | Scene 3 | convert tx + Jar credit |
| F4 Stake + claim | Scene 5 | stake, pending reward, claim to Jar |
| F5 Terminal trade | Scene 4 | buy with sweep (desktop + mobile) |
| F6 Jar | Scene 3 | Jar view after convert, withdraw button visible |
| F7 Distribute | Scene 4 | `/proof` latest `Distributed` with burn |
| F8 Geofence | Scene 3 | one-time attestation sheet before the first stock action |
| F9 Mint card (P2) | Scene 2 | "Mint this card" button shown (minted only if P2 shipped) |
| F10 Proof walk | Scene 6 | `/proof` contracts + tx table + recompute box |

### Sequence Diagram: hero trade with sweep (F5)
```
User -> Frontend: paste CA, 0.003 ETH, sweep 2%
Frontend -> RouteBuilder: GET /api/quote?token=..&side=buy&amount=..
RouteBuilder -> V4Quoter/QuoterV2: eth_call quotes (meme leg, WETH->NVDA leg)
RouteBuilder -> Frontend: Route{version,poolKey/path}, minMemeOut, minStockOut
Frontend -> Wallet: sign TerraRouter.buy{value:0.003}(route, 200, NVDA, minMemeOut, minStockOut)
TerraRouter -> FeePool: 0.000015 ETH (0.5%)
TerraRouter -> UniversalRouter: WRAP(trade) + SWAP(meme leg) + WRAP(sweep) + V3 WETH->NVDA (to Jar)
UniversalRouter -> Pools: swaps (hook deltas applied; min-outs enforced)
TerraRouter -> Jar: credit(user, NVDA, received)
TerraRouter -> Frontend: events Traded + Swept
Frontend -> User: meme in wallet, NVDA in Jar, fee in pool (3 explorer links)
```

---

## 4. Technical Specifications

### C1 TerraRouter
- **Purpose:** the only money-path entry for users. Builds Universal Router command streams itself from typed `Route` structs (never accepts raw UR commands from callers), takes the fee, sweeps, and credits the Jar.
- **Interface:**
```solidity
struct Route { uint8 kind; address[] v2Path; bytes v3Path; PoolKey key; }
// kind: 1 = v2 ([WETH, token] or reverse), 2 = v3 packed path (1 hop, or 2 hops via USDG), 3 = v4 single hop vs native ETH
function buy(Route calldata r, address token, uint16 sweepBps, uint8 stockId, uint256 minTokenOut, uint256 minStockOut) external payable returns (uint256 tokenOut, uint256 stockOut);
function sell(Route calldata r, address token, uint256 amountIn, uint16 sweepBps, uint8 stockId, uint256 minEthOut, uint256 minStockOut) external returns (uint256 ethOut, uint256 stockOut);
function convert(Route[] calldata rs, address[] calldata tokens, uint256[] calldata amounts, uint8 stockId, uint256 minStockOut) external returns (uint256 stockOut);
function deposit(uint8 stockId, uint256 minStockOut) external payable returns (uint256 stockOut);
function feeBps(address user) external view returns (uint16);
event Traded(address indexed user, address indexed token, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 fee);
event Swept(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut);
event Converted(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut, uint256 memes);
error WifNotSellable(); error SweepTooHigh(); error Slippage(); error BadRoute(); error NothingToConvert();
```
- **Key constants:** `FEE_BPS = 50` (0.5%, OD2), `STAKER_FEE_BPS = 30` (0.3%) for wallets with `WifStaking.activeOf(user) >= DISCOUNT_STAKE` (10,000 $WIF), `MAX_SWEEP_BPS = 1000` (10%), default sweep 200 in UI. The discount reads a stake amount, never a price (INVARIANT 2 holds). Immutable addresses: UR, WETH, WIF, Jar, FeePool, StockOracle.
- **Constraints:** V2/V3 inputs use the Universal Router 2.1 layout with a trailing empty `uint256[] maxHopSlippage` (omitting it reverts `SliceOutOfBounds`; root cause proven in contracts/test/URProbe.t.sol) and pay each leg with `CONTRACT_BALANCE` after an exact WRAP or token push. Native-ETH v4 pools settle with msg.value; WETH v2/v3 pools wrap first. ReentrancyGuard on all three entry points. Any residual ETH/token dust is returned to the user at the end of the call. `stockId` must be one of the 6 curated ids. `sell()`/`convert()` revert `WifNotSellable` if any route's input token is $WIF.

### C2 Jar
- **Purpose:** the user's real-stock savings, held by one ownerless contract.
- **Interface:**
```solidity
function credit(address user, address stock, uint256 amount) external; // onlyDepositor (TerraRouter, WifStaking), set immutably at deploy
function withdraw(address stock, uint256 amount) external;            // user, anytime
function balanceOf(address user, address stock) external view returns (uint256);
event Credited(address indexed user, address indexed stock, uint256 amount, uint8 source); // 1 convert, 2 sweep, 3 reward
event Withdrawn(address indexed user, address indexed stock, uint256 amount);
```
- **Key data:** `mapping(address user => mapping(address stock => uint256))`. Credit requires the tokens to have already arrived (checked via balance delta against `totalHeld[stock]`).
- **Constraints:** no owner, no pause, no sweep-out of user funds. Stock Tokens are ERC-8056 multiplier tokens: ledger stores raw token units; shares = raw × `uiMultiplier()` / 1e18 computed in the UI.

### C3 FeePool
- **Purpose:** turn fees into $WIF burn and the staker stream.
- **Interface:**
```solidity
function distribute() external;                            // permissionless, once per epoch (no caller min-out: debug S-1)
function canDistribute() external view returns (bool);
function epoch() external view returns (uint256);         // (block.timestamp - start) / 1 hours
event Distributed(uint256 indexed epoch, uint256 ethIn, uint256 wifBurned, uint256[6] stockBought, uint256 carried);
error EpochNotElapsed(); error BelowThreshold();
```
- **Rules:** split 50/50 (OD2) with EQUAL legs: each leg = min(half the balance, `MAX_WIF_BUY_ETH` = 0.01 ETH); anything above the caps carries to the next epoch. The burn leg buys through the v4 hooked WIF/ETH pool, then `WIF.burn(all WIF held)`. Each swap requires a gas floor (400k burn / 450k per stock leg) and an out-of-gas swap (detected by the 63/64 gas rule, not by the revert data) aborts the whole call instead of skipping, so a caller cannot void an epoch by starving gas, while a hook that reverts with any data, even empty, is skipped and its ETH carried (`test_distributeGasStarvationReverts`); real swap failures emit `BurnSkipped`/`StockBuySkipped` and carry. Stock half split by WifStaking's active stake per sub-pool; each sub-pool buy uses StockOracle min-out (band 3%); stale feed → skip and carry. Sub-pools with zero active stake get no ETH (their share redistributes across active ones; if no stakers at all, the stock half carries).
- **Constraints:** the contract never reads a $WIF spot price for value (Thesis INVARIANT 1). There is no caller-supplied min-out (a caller could otherwise force-skip the burn every epoch); the per-epoch cap `MAX_WIF_BUY_ETH` bounds any sandwich of the burn leg to dust.

### C4 WifStaking
- **Purpose:** stake $WIF to earn a real-stock stream in a chosen stock.
- **Interface:**
```solidity
function stake(uint256 amount, uint8 stockId) external;   // active from epoch e+2
function switchStock(uint8 stockId) external;              // claims, re-activates at e+2
function requestUnstake(uint256 amount) external;          // stops earning now
function withdraw() external;                              // after 24h
function claim() external;                                 // rewards -> Jar.credit(user, stock, amt, 3)
function notifyReward(uint8 stockId, uint256 amount) external; // onlyFeePool
function activeStake(uint8 stockId) external view returns (uint256);
function activeOf(address user) external view returns (uint256);       // used by TerraRouter fee discount
function pending(address user) external view returns (uint8 stockId, uint256 amount);
event Staked(address indexed user, uint256 amount, uint8 stockId, uint256 activeEpoch);
event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockAt);
event Claimed(address indexed user, uint8 stockId, uint256 amount);
```
- **Key data:** per sub-pool `accRewardPerShare` (1e18 precision), `activeTotal`, `pendingTotal`, `pendingEpoch`; per user `stockId`, `active`, `pending`, `pendingEpoch`, `rewardDebt`, `unstaking`, `unlockAt`.
- **Rules:** a stake placed in epoch e becomes active at the start of epoch e+2 (two pending buckets per pool, rolled lazily and by FeePool's `rollAll()` before weighing), so it sits through one full epoch of fee accrual before it shares any distribution; a late stake followed by an immediate permissionless `distribute()` captures nothing (OD3; tests `test_jitStakeEarnsNothing`, `test_boundaryStakeEarnsNothing`). Re-staking into a different pool first pays any accrued reward in the old pool's stock (`test_crossPoolAccruedNoDrain`). `UNSTAKE_DELAY = 24 hours`.

### C5 StockOracle
- **Purpose:** single place for Chainlink reads and min-out math.
- **Interface:**
```solidity
function ethUsd() external view returns (uint256 price8);
function stockUsd(uint8 stockId) external view returns (uint256 price8);   // reverts StaleOracle / BadAnswer
function minStockOut(uint8 stockId, uint256 ethIn, uint16 bandBps) external view returns (uint256);
function isFresh(uint8 stockId) external view returns (bool);
```
- **Rules:** answer > 0, `updatedAt` within `MAX_AGE = 25 hours` for every feed (Chainlink directory heartbeat 86400s + 1h grace; a deviation-only feed can legitimately be quiet for most of a day, so a tighter bound would revert healthy fills); "fresh" in this product means within the feed's published heartbeat (24h) + 1h grace; Chainlink also updates on deviation, so a quiet feed is within its deviation threshold of the market; maximum extractable deviation per fill = the 3% band (plus any move smaller than the feed's deviation threshold since its last update); feeds are 8dp; stock tokens and WETH are 18dp. Stock ids: 0 NVDA, 1 TSLA, 2 GOOGL, 3 SNDK (24/7 feeds), 4 SPY, 5 QQQ (24/5 feeds).

### C6 HindsightLens
- **Purpose:** let anyone verify a card's PRICING onchain: `recompute()` proves the arithmetic against the Chainlink rounds in effect at each buy's timestamp; it does not prove the buys happened (that is proven off-chain by the tx hashes on the card, which anyone can open). Minted cards (`CardMinted`) appear on /board only after the server re-derives the minter's card from chain logs and it matches.
- **Interface:**
```solidity
struct Buy { uint8 payKind; uint8 payStockId; uint256 amountPaid; uint80 payRoundId; uint80 stockRoundId; uint64 ts; }
// payKind: 0 = ETH/WETH (ETH/USD feed), 1 = USDG (USDG/USD feed, 6dp), 2 = curated stock (its history feed)
function recompute(Buy[] calldata buys, uint8 stockId) external view returns (uint256 usdPaid8, uint256 shares18, uint256 usdNow8);
function mintCard(Buy[] calldata buys, uint8 stockId) external; // burns 1 $WIF from caller, emits CardMinted (P2)
event CardMinted(address indexed wallet, uint8 stockId, uint256 usdPaid8, uint256 shares18, uint256 usdNow8);
```
- **Rules:** for each buy, the chosen roundIds must bracket `ts` (round.updatedAt <= ts < nextRound.updatedAt, or latest round <= ts); early rounds of every stock history feed are 1e16-scaled, so any answer > 1e15 is divided by 1e8 (VERIFIED on NVDA n=24/25; build-rounds.ts found the same prefix on TSLA, GOOGL, SNDK, SPY, QQQ). History uses the market-hours stock feeds (NVDA/USD has history from 2026-06-22; the 24/7 feed only starts 2026-11-06).

### C7 Hindsight Indexer
- **Purpose:** compute a wallet's card in under ~12s worst case, ~3s typical.
- **Interface:** `GET /api/hindsight?addr=0x…&stock=NVDA` → `HindsightCard` (Section 5).
- **Algorithm (spike-indexing.md, VERIFIED):** (1) load registry (25 memes with first-seen blocks (top 20 by liquidity + WIF-adjacent extras, spike-coverage.md)); (2) for each meme, `eth_getLogs` address=meme, topics `[Transfer, null, pad(wallet)]`, 10M-block spans from first block, JSON-RPC batch <= 36 per POST, 2–3 POSTs in flight; (3) keep logs whose `from` is a known pool or router address (from the registry) to exclude airdrops; (4) batch `eth_getTransactionByHash` (<= 10 per POST); a buy is priced when `tx.from == wallet` and `tx.value > 0` (ETH paid); when `tx.value == 0`, fetch the receipt (batched) and take the wallet's outgoing `Transfer` logs in that tx: WETH (price via ETH/USD round), USDG (USDG/USD round, 6dp), or a curated Stock Token (its stock feed round); anything else stays "unpriced"; the paid amount is attributed to the meme received in that tx; (5) price ETH paid with the ETH/USD round in effect at the block timestamp (round table), counterfactual shares = usdPaid / stockUsd(round at ts); (6) today's value = current meme balance × live sell quote; counterfactual today = shares × latest stock price; (7) return all inputs for recompute.
- **Constraints:** never treat a 10,000-log JSON-RPC error as zero (it is an error, split the range); exclude $WIF, stables, WETH and stock tokens; never filter wallets by code (EIP-7702). Cache card JSON per (wallet, head-block/300) for 5 minutes.

### C8 Route Builder
- **Purpose:** find the best Uniswap route for a meme, quote it, and return typed Route params.
- **Interface:** `GET /api/quote?token=0x…&side=buy|sell|convert&amount=…&stock=NVDA` → `QuoteResponse` (Section 5). Shared TS lib `lib/routes.ts` is used by API and keeper.
- **Rules:** candidates = registry pools for the token against native ETH (v4) or WETH (v2/v3): v4 keys come from PoolManager `Initialize` logs (dynamic fee 8388608 kept verbatim; tickSpacing as logged; hooks as logged). Quote each candidate (V4Quoter / QuoterV2 / v2 getAmountsOut) and pick the best output. Stock-paired memes (11 found, e.g. AI/NVDA via hook 0x4e34…) are routed via their WETH pool in v1 when its liquidity >= $5k; otherwise "thin route" warning. minOut defaults = quote × (1 − 1.5%) for meme legs and StockOracle band for stock legs.

### C9 Frontend
- **Purpose:** the product surface; web and mobile first-class (AMEND-4).
- **Routes:** `/` landing, `/app` (connected Hindsight + convert), `/card/[addr]` (lookup + OG image), `/trade`, `/jar` (+ streak, Quicknode badge), `/jar/report/[addr]` (weekly report OG), `/stake`, `/board` (leaderboards), `/proof`, `/friends` (only if C12 ships). Details in ROUTE-ARCHITECTURE.md.
- **Constraints:** responsive from 360px; tap targets >= 44px; plain-language $ and share amounts; every onchain number links to the explorer; no "Robinhood" name or logo in product name or branding (rule 11; the chain is referred to as "Robinhood Chain" only as a factual network name in docs, where the rules permit factual references); no fabricated numbers anywhere (Thesis INVARIANT 3).

### C10 Keeper
- **Purpose:** hourly distribute until 2026-11-16 17:30 UTC.
- **Interface:** `scripts/keeper.ts` run by `.github/workflows/keeper.yml` (`cron: '7 * * * *'`), plus manual `workflow_dispatch`.
- **Rules:** if `canDistribute()` and fee balance >= `KEEPER_MIN_ETH` (0.0002 ETH), send `distribute()` with gas limit 3,500,000; otherwise log "skip". Writes the last run summary to the workflow log; `/proof` reads FeePool events directly, so keeper state is never trusted.

### C11 Data scripts
- `scripts/build-registry.ts` → `web/data/memes.json` (token, symbol, decimals, firstBlock, pools[] with kind/key/path/fee/liquidity) from spike-pool-keys.json + DexScreener + Initialize logs.
- `scripts/build-rounds.ts` → `web/data/rounds/{ETHUSD,NVDAUSD,TSLAUSD,…}.json` (roundId, answer normalized to 8dp, updatedAt) via Multicall3 batches; rerun by the keeper workflow daily.


### C12 Friend Jars (gated; built only if the OD7 gate passes)
- **Purpose:** onboarding layer: a zero-crypto friend joins a shared Jar with an email login and a sponsored first transaction.
- **Interface:** `FriendJar.create(stockId)`, `join(jarId)` (via invite code), `contribute(jarId)` (payable, routes through TerraRouter convert path), `exit(jarId)` (pro-rata stock to the member); events `JarCreated`, `Joined`, `Contributed`, `Exited`.
- **Constraints:** no time-locked vouch (AMEND-1); ownership pro-rata to contributions; sponsored gas via Privy or ZeroDev paymaster (dashboard policy set by Dami); if not built, PRD/README mark it "designed, gated".

### C13 Live Stream route
- **Purpose:** real-time liveness on the landing page and /proof without exposing the shared GetBlock endpoint to browsers.
- **Interface:** `GET /api/stream` → `text/event-stream`; events `{type:"traded"|"distributed"|"credited"|"cardMinted", tx, block, summary}`.
- **Constraints:** the route subscribes to GetBlock WSS `eth_subscribe("logs", {address:[TerraRouter, FeePool, Jar, HindsightLens]})` for up to 55s per connection (serverless max duration), then closes; the browser `EventSource` reconnects automatically; on WSS failure it falls back to polling `eth_getLogs` over the last 20 blocks every 5s.

### 4.12 Threat model summary (feeds SECURITY.md; full matrix in ARCHITECTURE)
| # | Threat | Where | Defense (fail-closed) | Rejection token |
|---|---|---|---|---|
| T1 | Caller injects arbitrary Universal Router commands to drain router-held funds | C1 | Router never accepts raw commands; it encodes commands itself from a typed `Route` with whitelisted `kind` and validated endpoints (input/output token must match the trade side) | `BadRoute` |
| T2 | Sandwich on the stock leg | C1, C3 | Chainlink-bounded `minStockOut` (3% band) in-contract, independent of the caller's min | `Slippage` |
| T3 | Stale or paused oracle fill | C5 | answer > 0, `updatedAt` within max age, else revert / skip-and-carry | `StaleOracle` |
| T4 | Just-in-time staking to capture an epoch | C4 | next-epoch activation + 24h unstake delay | (no reward accrues) |
| T5 | Reentrancy via token callbacks or hooks | C1, C2, C3, C4 | `nonReentrant` on all state-changing externals; checks-effects-interactions | `ReentrancyGuardReentrantCall` |
| T6 | Selling users' $WIF (thesis violation) | C1 | input-token check on every route | `WifNotSellable` |
| T7 | $WIF price manipulation to extract from the burn buy | C3 | no $WIF price in value logic; per-call cap `MAX_WIF_BUY_ETH`; caller minOut only adds protection | (excess carried) |
| T8 | Unauthorized Jar credit (inflate a balance) | C2 | `credit()` only from immutable depositors and only up to the balance delta actually received | `NotDepositor` / `Unbacked` |
| T9 | Third-party hook changes behaviour (owned, unverified) | C3 | min-out on the WIF buy; try/catch → carry ETH on revert; disclosed in SECURITY.md | (carried) |
| T10 | Forged Hindsight card | C6, C7 | numbers derived from logs + Chainlink rounds; `recompute()` verifies round bracketing | `BadRound` |
| T11 | Dust/approval griefing (unlimited approvals) | C9 | exact-amount approvals by default | n/a |
| T12 | Admin key compromise | all | no owner, no upgradeability, no pause; constants immutable | n/a |
**Not defended against:** a Chainlink feed reporting a wrong-but-fresh price; the third-party hook owner changing fees within its own rules; frontend geofence bypass by a determined restricted user (contract-level geofencing is impossible without identity); MEV on the meme leg beyond the user-chosen min-out.

### 4.13 UI copy and states (plain language, primary user)
| Surface | State | Copy |
|---|---|---|
| Landing guarantee | default | <!-- [CRITIQUE E-1] --> "Every number here is recomputable onchain. Terra Firma never sells or prices $WIF. Every stock fill is bounded by Chainlink." + link "Recompute this card" → /proof |
| Landing hero | default | "Stand on $WIF. Sweep the rest into stock." / "See what your memes would be in NVDA today, and move the dead ones into a real stock in one tap." (no shaming; $WIF is never a regret target) |
| Landing CTA | default | Primary: "Connect wallet" · Secondary link: "or look up any wallet" |
| Card | loading | "Reading your meme buys from the chain… (scanning 25 memes)" |
| Card | loaded | "You put $340 into memes you still hold. Today: $41. In NVDA: $512." |
| Card | empty | "None of the 21 memes we track are in this wallet." |
| Card | error | "The chain is busy. Try again in a few seconds." |
| Card row info | expanded | "Paid 0.05 ETH on Oct 3 (tx 0xab…). ETH was $2,401.12 (Chainlink round …001). NVDA was $190.20 (round …800)." |
| Convert sheet | ready | "Sell PONS, WALLET → get ≈ 0.024 NVDA (≈ $4.05). Fee 0.5%. Guaranteed at least 0.0233 NVDA or nothing happens." |
| Convert | success | "Done. You own 0.0243 NVDA. It's in your Jar. Withdraw any time." |
| Convert | geofenced | "Stock purchases aren't available in your region. Your card still works." |
| Oracle stale | any stock action | "Stock prices are paused right now (market data closed). Try again soon." |
| Terminal | buy preview | "Buy ≈ 40.8 PONS · 2% (0.00006 ETH) goes to your Jar as NVDA · 0.5% fee builds the $WIF burn" |
| Terminal | WIF selected (sell) | "Terra Firma never sells $WIF. Stake it to earn real stock instead." |
| Stake | stake placed | "Staked. You start earning NVDA after one full epoch (active from epoch e+2, ~1–2 h)." |
| Stake | unstake | "Unstaking stops rewards now. Your $WIF unlocks in 24h." |
| Jar | empty | "Your Jar is empty. Convert a meme or make a trade to start." |
| Proof | header | "Every number here is read from Robinhood Chain mainnet. Click anything to verify." |

### 4.14 Data files (schemas)
- `web/data/memes.json`:
  ```json
  {"version":1,"builtAt":"2026-11-11T00:00:00Z","memes":[{"token":"0x39dB…4571","symbol":"PONS","decimals":18,"firstBlock":90000000,
    "pools":[{"kind":2,"version":"v3","pool":"0xEd50…22ff","fee":3000,"quote":"WETH","liquidityUsd":1591513},
             {"kind":3,"version":"v4","id":"0x12d3…5859","key":{"currency0":"0x0000000000000000000000000000000000000000","currency1":"0x39dB…4571","fee":10128,"tickSpacing":200,"hooks":"0x0000000000000000000000000000000000000000"},"liquidityUsd":228000}],
    "tested":true,"taxed":false}],
   "routers":["0x8876789976dEcBfCbBbe364623C63652db8C0904","0x204FAca1764B154221e35c0d20aBb3c525710498"]}
  ```
  (values illustrative of shape; the build script fills real ones from chain)
- `web/data/rounds/NVDAUSD.json`: `{"feed":"0x379E…9F15","decimals":8,"phase":1,"rounds":[[n, answer8, updatedAt], …]}` with answer already normalized to 8dp (early rounds scaled per Section 5 rule).
- `web/data/restricted.json`: `{"source":"https://docs.robinhood.com/rhj/restricted-jurisdictions","fetchedAt":"…","countries":["US", …]}`.
- `web/data/stocks.json`: `[{"id":0,"symbol":"NVDA","token":"0xd060…","feed":"0x321A…3D1F","historyFeed":"0x379E…9F15","pool":{"kind":2,"path":"WETH-500-NVDA"},"hours":"24/7"}, …]` for the curated 6.


### 4.15 Protocol parameters (all immutable at deploy unless stated)
| Parameter | Value | Where | Rationale |
|---|---|---|---|
| FEE_BPS | 50 (0.5%) | TerraRouter | OD2 ratified |
| MAX_SWEEP_BPS | 1000 (10%) | TerraRouter | OD2 range 0–10% |
| STAKER_FEE_BPS / DISCOUNT_STAKE | 30 bps for >= 10,000 $WIF active stake | TerraRouter / WifStaking | Dami 2026-11-10 depth add; burn never reaches zero |
| Default sweep | 200 (2%) | UI | OD2 |
| ORACLE_BAND_BPS | 300 (3%) | StockOracle / Router / FeePool | fork-measured fill deviation −0.04% to −1.54%; 3% clears hooked meme→stock legs |
| MAX_AGE (all feeds) | 25 hours | StockOracle | directory heartbeat 86400s + 1h grace (observed cadence ~40 min); 24/5 SPY/QQQ go stale over weekends (skip + carry) |
| EPOCH | 1 hour | FeePool / WifStaking | OD3 |
| UNSTAKE_DELAY | 24 hours | WifStaking | OD3 anti-JIT |
| MAX_WIF_BUY_ETH | 0.01 ETH per distribute | FeePool | bounds any manipulation of the burn buy to dust (measured −1.04% on 0.01 ETH) |
| KEEPER_MIN_ETH | 0.0002 ETH | keeper script (config, not contract) | skip empty epochs to save gas |
| MIN_DISTRIBUTE_ETH | 0.00001 ETH | FeePool | <!-- [CRITIQUE E-3] numeric drift fixed --> one ~0.002 ETH trade funds a real burn (minimal-spend demo); the keeper still skips below 0.0002 ETH |
| CARD_MINT_BURN | 1 $WIF | HindsightLens | OD5 "tiny" |
| Curated stocks | 0 NVDA, 1 TSLA, 2 GOOGL, 3 SNDK, 4 SPY, 5 QQQ | StockOracle / WifStaking | OD4 |

### 4.16 Event index (drives /proof, /jar history, landing counters)
| Event | Contract | Used by |
|---|---|---|
| `Traded(user, token, isBuy, ethAmount, tokenAmount, fee)` | TerraRouter | /proof routed-volume total, landing "routed trades" |
| `Swept(user, stockId, ethIn, stockOut)` | TerraRouter | /jar source "sweep" |
| `Converted(user, stockId, ethIn, stockOut, memes)` | TerraRouter | /jar source "convert", landing "Jars opened" (first credit per user) |
| `Credited(user, stock, amount, source)` / `Withdrawn(user, stock, amount)` | Jar | /jar balance history |
| `Distributed(epoch, ethIn, wifBurned, stockBought[6], carried)` | FeePool | landing "WIF burned", "stock streamed"; /proof burn table |
| `Staked` / `UnstakeRequested` / `Withdrawn` / `Claimed` | WifStaking | /stake history |
| `CardMinted(wallet, stockId, usdPaid8, shares18, usdNow8)` | HindsightLens | /proof cards minted |
| $WIF `Transfer(FeePool → 0x0)` | $WIF | independent burn verification (ERC20Burnable emits Transfer to zero) |

### 4.17 Accessibility, mobile and performance requirements
- Layout works from 360px to 1440px; one-column below 768px; the hero card fits a 390×844 viewport without scrolling past the CTA.
- Tap targets >= 44×44px; text >= 16px body; contrast >= WCAG AA (4.5:1) on all copy; focus rings visible.
- Numbers use tabular figures; USD to 2 decimals, shares to 4 significant digits, ETH to 6 decimals; every number has an accessible label ("value today: 41 dollars").
- Wallet: injected (MetaMask, Rabby, Coinbase) + WalletConnect v2 (Robinhood Wallet, mobile MetaMask); auto-prompt `wallet_addEthereumChain` with chainId 4663, RPC public URL, explorer.
- Performance: landing LCP < 2.5s on 4G; card first paint (skeleton) < 300ms; card complete p50 < 5s, p95 < 12s (spike-measured floor ~3s).
- No layout shift when numbers load (fixed-width skeletons).
- All transactions show a pending state with explorer link; failures show the decoded custom error in plain words (mapping in C9).
- Reduced-motion users get no animated counters.

### 4.18 Observability
- Every API route logs `{route, wallet-hash, ms, rpcProvider, retries, error}` to Vercel logs (wallet hashed, never raw in logs).
- `/proof` shows keeper last-run time from the most recent `Distributed` event (not from keeper state).
- A `/api/health` route returns `{rpc: ok|degraded, block, feeds: {NVDA: fresh, …}, feePoolEth}` for the livetest and demo-rehearsal skills.

---

## 5. API Contracts

### External API: Robinhood Chain JSON-RPC (GetBlock primary, public fallback)
- **Base URLs:** `GETBLOCK_RPC_FRA`, `GETBLOCK_RPC_NYC` (hackathon shared endpoints, private, in `.env.local`; rotated after 2026-11-17), fallback `https://rpc.mainnet.chain.robinhood.com` (needs a `User-Agent` header; 429 at ~4–5 req/s sustained, or ~16 parallel requests in bursts).
- **Authentication:** token in URL path (GetBlock); none (public).
- **Rate limits:** public RPC 429 at ~16 parallel; getLogs caps: no address 30k blocks, single address 10M blocks, address array 100k blocks, 10,000 logs per response (JSON-RPC error, not truncation). JSON-RPC batch <= 36 getLogs per POST (72 → 429). GetBlock limits NOT FOUND in docs (test at build). [VERIFIED, spike-indexing.md]
- **Methods used:** `eth_getLogs`, `eth_getTransactionByHash`, `eth_getTransactionReceipt` (value==0 path only), `eth_call` (quoters, feeds, Multicall3 `aggregate3`), `eth_sendRawTransaction` (wallet/keeper), `eth_blockNumber`.

#### Endpoint: POST eth_getLogs (Hindsight per-token scan)
- **Request:**
  ```json
  {"jsonrpc":"2.0","id":1,"method":"eth_getLogs","params":[{"address":"<meme>","fromBlock":"0x<first>","toBlock":"0x<first+10M>","topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",null,"0x000000000000000000000000<wallet>"]}]}
  ```
- **Response (success):** `{"jsonrpc":"2.0","id":1,"result":[{"address":"0x…","topics":["0xddf2…","0x<from>","0x<to>"],"data":"0x<amount>","blockNumber":"0x…","transactionHash":"0x…","logIndex":"0x…"}]}`
- **Response (error):** `{"jsonrpc":"2.0","id":1,"error":{"code":-32005,"message":"query returned more than 10000 results"}}` → split range and retry; `HTTP 429` → backoff 500ms×2^n, then switch provider.

### External API: Quicknode Stock Token API (optional, sponsor integration)
- **Base URL:** `QUICKNODE_BASE/<token>/` (endpoint spring-multi-lake, RH mainnet; Build plan redeemed by Dami with code WIFQN).
- **Authentication:** token in URL path.
- **Rate limits:** Build plan credits (docs: quicknode.com/api-credits/robinhood).
- **Use:** `/jar` share display cross-check and `/proof` sponsor badge. Never in the money path; the Jar view works without it (direct `balanceOf` + `uiMultiplier()` reads).

#### Endpoint: POST qn_getStockTokenBalances
- **Request:** `{"jsonrpc":"2.0","id":1,"method":"qn_getStockTokenBalances","params":[{"wallet":"<Jar address>"}]}` [UNVERIFIED param shape; docs list wallet input, test at build]
- **Response (success):** `{"result":{"balances":[{"symbol":"NVDA","address":"0xd060…","balance":"<raw>","uiMultiplier":"<1e18>","balanceUi":"<shares>","priceUsd":"…","stale":false}]}}` [UNVERIFIED field names; docs summary]
- **Response (error):** `{"error":{"code":-32601,"message":"Method not found"}}` → hide the Quicknode badge, keep direct reads.

### External API: Chainlink Data Feeds (onchain, RH mainnet)
- **Base:** AggregatorV3 proxies (addresses Section 9). `latestRoundData()`, `getRoundData(uint80)`, `decimals()` (8 for all used feeds).
- **Rules:** roundId = (phaseId<<64)|n, phase 1 for all used feeds; NVDA/USD rounds n=1..24 (<= 2026-06-23T13:48:29Z) are scaled: usd8 = raw > 1e15 ? raw / 1e8 : raw [VERIFIED continuity, spike-indexing.md §4]. NVDA 24/7 feed starts 2026-11-06 (live fills only). ETH/USD history from 2026-06-05.

### External API: Uniswap on RH mainnet (onchain)
- Universal Router `0x8876789976dEcBfCbBbe364623C63652db8C0904`: `execute(bytes commands, bytes[] inputs, uint256 deadline)`; commands used: `0x00` V3_SWAP_EXACT_IN, `0x08` V2_SWAP_EXACT_IN, `0x0b` WRAP_ETH, `0x0c` UNWRAP_WETH, `0x10` V4_SWAP (actions `0x06` SWAP_EXACT_IN_SINGLE, `0x0c` SETTLE_ALL, `0x0f` TAKE_ALL). [VERIFIED fork, spike-fork.md]
- V4Quoter `0x8dc178efb8111bb0973dd9d722ebeff267c98f94` `quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))`; QuoterV2 `0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7` `quoteExactInputSingle((address,address,uint256,uint24,uint160))`, `quoteExactInput(bytes,uint256)`; v2 Router02 `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` `getAmountsOut`. [VERIFIED, spike-coverage.md]

### Internal API: GET /api/hindsight
- **Request:** `?addr=0x<40 hex>&stock=NVDA|TSLA|GOOGL|SNDK|SPY|QQQ` (default NVDA)
- **Response (success):**
  ```json
  {"wallet":"0x…","stock":"NVDA","asOfBlock":111160000,"totals":{"usdPaid":"340.12","usdToday":"41.07","usdCounterfactual":"512.30","sharesCounterfactual":"3.0413"},
   "memes":[{"token":"0x…","symbol":"PONS","usdPaid":"120.00","usdToday":"14.20","usdCounterfactual":"171.10","buys":[{"tx":"0x…","block":101234567,"ts":1790000000,"ethPaid":"0.05","ethRoundId":"18446744073709553001","ethUsd":"2400.12","stockRoundId":"18446744073709552800","stockUsd":"190.20"}],"holding":"34.7","priced":true}],
   "unpriced":[{"token":"0x…","symbol":"AI","reason":"paid in tokens"}],"worst":{"symbol":"PONS","pct":-88.2}}
  ```
  All USD values are 8-decimal integer strings (`usdPaid8`, `usdToday8`, `usdCounterfactual8`), shares are 18-decimal strings; each buy carries `payKind`, `payStockId`, `amountPaid`, `payRoundId`, `stockRoundId`, `ts`, so the client builds `HindsightLens.Buy[]` for `recompute()` directly (no pre-encoded blob).
- **Response (error):** `{"error":"bad_address"}` (400) · `{"error":"rpc_unavailable","retryAfter":5}` (503)

### Internal API: GET /api/quote
- **Request:** `?token=0x…&side=buy|sell|convert&amount=<wei>&stock=NVDA&sweepBps=200`
- **Response (success):**
  ```json
  {"token":"0x…","symbol":"PONS","route":{"kind":2,"token":"0x…","path":"0x0bd7…000bb8 39db…","key":null,"zeroForOne":false},
   "amountIn":"3000000000000000","tokenOut":"40809162956989486463","ethToStock":"60000000000000","stockOut":"729935707158229","fee":"15000000000000",
   "minTokenOut":"40197025512634644166","minStockOut":"708037","oracle":{"min":"708037","ethUsd8":"203683180081","stockUsd8":"16647900000","fresh":true}}
  ```
- **Response (error):** `{"error":"no_route"}` (404) · `{"error":"taxed_token"}` (422) · `{"error":"oracle_stale","stock":"SPY"}` (409)

### Internal API: GET /api/geo
- **Response:** `{"country":"NG","restricted":false,"list":"rhj-restricted-2026-11"}`; restricted list from docs.robinhood.com/rhj/restricted-jurisdictions, snapshotted in `web/data/restricted.json`.

### Internal API: GET /card/[addr]/opengraph-image
- **Response:** 1200×630 PNG of the Hindsight card (Next.js `ImageResponse`), cached 10 min.

---

## 6. Demo Script

**Total Duration:** 2:45 (rules: under 3 minutes, "show it working rather than slides")
**Format:** screen recording of the live mainnet app (desktop) with two mobile cut-ins; recorded from an eligible (non-restricted) region; every tx shown on the explorer.
**Demo obligation (Thesis field 3, by reference):** the judge must witness (a) a real wallet's Hindsight card priced from Chainlink rounds, (b) a one-tap convert landing a real Stock Token in the Jar, (c) a Terra Router meme trade that sweeps into the Jar AND emits a $WIF burn, (d) a $WIF staker's Jar receiving its real-stock stream. Scenes 2–6 map to (a)–(d).

### Scene 1: The flat world (0:00–0:10)
**Screen:** landing `/` hero: "Stand on $WIF. Sweep the rest into stock." and a live counter strip (WIF burned, stock streamed, Jars, from contract events).
**Voiceover:** "Robinhood Chain has 203 real stocks. Its traders buy memes instead. Terra Firma turns every meme trade into real stock, and makes $WIF the token that earns from it."
**Action:** presenter taps **Connect wallet** (primary flow, AMEND-1) with the funded demo wallet.

### Scene 2: Your Hindsight card, then a real long-history wallet (0:10–0:45) [obligation a]
**Screen:** `/app` renders the connected demo wallet's own card (its real meme buys, made through the product during seeding); then the secondary "or look up any wallet" link opens `/card/0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E` as a 10-second contrast shot of a real long-history wallet (forge measured $15,314.80 paid into AI over 81 buys → $2.28 today → $14,798.24 in NVDA; numbers re-read live at recording).
**Voiceover:** "Connect, and Terra Firma reads your meme buys from the chain, prices what you paid with the Chainlink ETH round at that block, and asks: what if that had been NVDA? Here's what that looks like on a wallet with real history: fifteen thousand dollars in, two dollars left, almost fifteen thousand in NVDA."
**Action:** open the info toggle on one row: tx hash, Chainlink roundId and answer; click **Recompute onchain** (HindsightLens view matches); **Mint this card** (F9) visible beside Share; return to the connected card.

### Scene 3: Fix it in one tap (0:45–1:15) [obligation b]
**Screen:** select memes → one-time region attestation sheet (F8) → convert sheet → sign `convert()` → success "You now own 0.0x NVDA" → Jar (withdraw button visible, F6).
**Voiceover:** "One tap. Your memes are sold through Uniswap and bought into real NVDA, bounded by Chainlink so you never fill at a bad price. It lands in your Jar. You can withdraw it any time. It is yours."
**Action:** click the explorer link: the NVDA token transfer into the Jar contract and the `Credited` event.

### Scene 4: Every meme trade builds stock and burns $WIF (1:15–1:50) [obligation c]
**Screen:** `/trade`, paste a meme CA, buy 0.002 ETH with 2% sweep; then the same flow on a phone (mobile cut-in).
**Voiceover:** "From now on, trade memes here. Every trade sweeps a slice into your Jar as real stock, in the same transaction. A half-percent fee goes to the fee pool. Every hour, half of it buys $WIF and burns it."
**Action:** explorer: the trade tx shows meme out, NVDA to Jar, fee to FeePool (this tx's `Traded.fee`); recording starts between HH:00 and HH:06 (a new epoch has begun and the keeper's :07 run has not yet distributed it), so the presenter presses **Run distribute** on `/proof` right after the trade: the next tx buys $WIF with the pool (including this trade's fee) and burns it (`Distributed.wifBurned`, `Transfer` to 0x0, totalSupply delta). The causal chain trade → fee → burn is shown in two consecutive real txs, never implied.

### Scene 5: Stake $WIF, earn real stocks (1:50–2:25) [obligation d]
**Screen:** `/stake`: pick NVDA sub-pool, stake $WIF; show a staker wallet's pending reward after a real epoch; **Claim to Jar**.
**Voiceover:** "The other half of the fee buys real stock for $WIF stakers. Pick the stock you want: NVDA, Tesla, Google, SanDisk, SPY or QQQ. Stake $WIF and your Jar fills with it every hour. New stakes wait one full epoch before they earn, so nobody can game the payout."
**Action:** claim tx → Jar shows "reward" source line growing.

### Scene 6: Built to be checked (2:25–2:45)
**Screen:** `/proof`: verified contract list, tx table, fork-test badge, SECURITY.md link (third-party hook disclosure), "never prices or sells $WIF".
**Voiceover:** "Every number on screen comes from mainnet or Chainlink. Contracts are ownerless and verified. Terra Firma never prices or sells $WIF. It only buys, burns and stakes it. Stand on solid ground."
**Action:** scroll the proof table; paste the demo wallet into the **Recompute a card** box (API result and HindsightLens result side by side); point at the **Run distribute** button; end card with URL.

### Demo Prerequisites

**Seed State Table** — earned, real mainnet state produced by `scripts/seed-demo.ts` (real transactions from the demo wallet, never fabricated; Thesis INVARIANT 3). Idempotent: each step checks onchain state first and skips if satisfied.

| Item | Value | Network / Location | Created By |
|------|-------|-------------------|------------|
| Demo user wallet | fresh EOA `DEMO_ADDR` funded by Dami (~0.004 ETH, ~1,000 $WIF) | RH mainnet 4663 | Dami (funding), seed-demo.ts (checks) |
| Meme holdings with history | >= 3 memes bought with ETH via Universal Router (e.g. PONS, WALLET, one Pons-hook meme), ~$1 each | RH mainnet | seed-demo.ts `seedMemes` (buys via TerraRouter.buy with sweep 0 the first time so the card has history) |
| Jar balance | >= 1 convert + >= 2 sweeps credited (NVDA) | Jar contract | seed-demo.ts `seedJar` |
| $WIF stake | ~150–500 $WIF staked to NVDA sub-pool, placed >= 2 epochs before recording (active from e+2) | WifStaking | seed-demo.ts `seedStake` |
| Fee pool history | >= 2 `Distributed` events with nonzero `wifBurned` and NVDA reward | FeePool | keeper / seed-demo.ts `seedDistribute` |
| Staker pending reward | > 0 NVDA claimable | WifStaking.pending(DEMO_ADDR) | produced by the above, never minted |

**Invariant:** `pnpm tsx scripts/seed-demo.ts` from project root reaches this state from scratch and is safe to re-run.

---

## 7. Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation | Decision Tree |
|---|------|----------|-----------|--------|------------|:---:|
| R1 | Router volume ≈0 → burn and staker stream are dust; flywheel reads hollow (named by 4/4 re-scorers) | HIGH | HIGH | Flywheel score | OD1: Hindsight converts are the volume engine; terminal is the buy-memes front end; `/proof` shows real per-tx burn + stream honestly at real size; ship thread drives CT traffic | PLAN DT-1 |
| R2 | Scope: 6 contracts + indexer + terminal + frontend solo in ~35h | HIGH | MEDIUM | Ships thin | Build order puts hero spine first (Router+Jar+Oracle → convert → FeePool → Staking); friend jars gated (OD7); Lens mintCard is P2 | PLAN DT-2 |
| R3 | Security: JIT staking, reentrancy, Route abuse (arbitrary UR commands), stale-oracle fills | HIGH | MEDIUM | Security judge breaks it | Router builds UR commands from typed Routes only; next-epoch activation + 24h unstake; ReentrancyGuard; StockOracle staleness; fork tests incl. adversarial | PLAN DT-3 |
| R4 | Third-party owned hook on WIF/ETH pool (afterSwapReturnDelta) changes behaviour or skims more | MEDIUM | LOW | Burn path degrades | min-out on every hop; per-call cap; FeePool can carry ETH if the WIF buy reverts (try/catch → carry); SECURITY.md disclosure | PLAN DT-4 |
| R5 | Hindsight indexing slow or rate-limited (3,705-call naive scan; 429s) | HIGH | MEDIUM | Front door fails live | per-token scan over registry (VERIFIED ~3–12s); 2 GetBlock regions + public fallback; 5-min cache; HyperSync optional if Dami adds a token | PLAN DT-5 |
| R6 | NVDA early-round scaling or round-at-timestamp bugs → wrong card | MEDIUM | HIGH if unhandled | Wrong numbers | verified rule + hard boundary roundId; unit tests on n=1, 24, 25, 1715; HindsightLens recompute parity test | PLAN DT-6 |
| R7 | Universal Router encoding quirks (explicit amountIn SliceOutOfBounds; dynamic-fee keys; native ETH vs WETH) | HIGH | MEDIUM | Trades revert | CONTRACT_BALANCE pattern; keys read from Initialize logs; fork test per route kind (v2, v3, v4 plain, v4 hooked, v4 dynamic) | PLAN DT-7 |
| R8 | Mainnet deploy/funding delay (Dami funds wallets) | HIGH | MEDIUM | No real txs for demo/proof | fork-first build; deploy script ready by funding time; minimum spend measured (~0.003 ETH gas) | PLAN DT-8 |
| R9 | "Stake $WIF earn stocks" reads as generic staking / near Underfoot (competitive) | MEDIUM | MEDIUM | Novelty score | Hindsight leads demo and posts; staking framed as "your $WIF earns a slice of every meme trade, paid in real stock"; Thesis tripwire 1 guards the headline | PLAN DT-9 |
| R10 | US/restricted judges geofenced from stock steps | MEDIUM | MEDIUM | Judge can't try convert | geofence only stock actions; Hindsight + lookup open to all; video from eligible region; `/proof` shows real txs | PLAN DT-10 |
| R11 | Approval lag >= 24h → not in round one; deadline slip | HIGH | MEDIUM | Not judged | internal submit 2026-11-12 08:00 WAT; submission form drafted during build; gallery updates after | PLAN DT-11 |
| R12 | Host/keeper dies before 2026-11-16 17:30 UTC; GetBlock endpoints rotate 11-17 | MEDIUM | LOW | Rule 4 breach | Vercel (no sleep) + GitHub Actions cron keeper; distribute is permissionless (button on /proof); RPC fallback order with public RPC | PLAN DT-12 |
| R13 | Fee-on-transfer / taxed memes or tokens with transfer hooks break routes | MEDIUM | LOW | Reverts or wrong outputs | registry marks tested tokens; quote-vs-received check in fork tests; taxed tokens unsupported in v1 | PLAN DT-13 |
| R14 | SPY/QQQ 24/5 feeds stale on weekends (judging spans Sat–Mon) | MEDIUM | HIGH | Sub-pool buys revert | stale → skip + carry; UI labels "pays weekdays"; 24/7 four are defaults | PLAN DT-14 |
| R16 | Quicknode Stock Token API unavailable or method shape differs (Build plan, optional) | LOW | MEDIUM | Sponsor badge missing | never in money path; `/jar` uses direct `balanceOf` + `uiMultiplier()`; badge hidden on error | PLAN DT-16 |
| R17 | Uniswap UR / quoters unavailable for a pool (quoter revert, pool drained, hook blocks swaps) | HIGH | LOW | Trades/convert fail for that meme | per-meme route fallback across pools; quote failure → meme unselectable; WIF buy failure → FeePool carries ETH | PLAN DT-17 |
| R18 | Chainlink feed outage or paused feed (any of ETH/USD or the 6 stocks) | HIGH | LOW | Stock legs revert | StockOracle reverts/skips-and-carries; UI pre-checks `isFresh`; sweep auto-disables per stock with copy "stock prices paused" | PLAN DT-18 |
| R15 | Wallet UX on mobile (WalletConnect deep links, chain add) | MEDIUM | MEDIUM | Voters on phones bounce | wagmi WalletConnect v2 + injected; `wallet_addEthereumChain` for 4663; tested on iOS Safari + Android Chrome via Chrome DevTools emulation and a real phone | PLAN DT-15 |

### Risk Categories Covered
- [x] Technical risks (R3, R4, R5, R6, R7, R13, R14, R16, R17, R18)
- [x] Competitive risks (R9)
- [x] Time risks (R2, R8, R11)
- [x] Demo risks (R1, R10, R15)
- [x] Judging risks (R1, R9, R10)
- [x] Scope risks (R2)

### API unavailability coverage (Metric 3)
GetBlock/public RPC → R5, R12. Quicknode Stock Token API → R16. Chainlink feeds → R18 (outage/paused), R14 (weekend stale), R6 (round bugs). Uniswap UR/quoters → R17 (unavailable), R7 (encoding). Vercel geo header → R10 (falls back to attestation).

---

## 7.4b USER-FIRST — real user model
See `USER-ONBOARDING.md` (user classes, cold-stranger genesis, real path == demo path).

## 7.4c ROUTE ARCHITECTURE
See `ROUTE-ARCHITECTURE.md` (multi-page, landing required, separate `/proof` judge route).

## 7.5 Judge Experience

- **Custody:** Terra Firma is non-custodial for users (Jar is an ownerless contract; no keys on the host). The only server-side key is the keeper's, used solely to call the permissionless `distribute()`; it holds dust ETH for gas and can move no user funds. `custodyProduct: false`; keys-off-host demo path: a cold judge completes the hero flow with their own wallet, or reads everything via `/card/[addr]` + `/proof` with no wallet.
- **First-visit state:** `/` shows live protocol counters (WIF burned, stock streamed, Jars opened, routed trades) read from contract events, with a disclosure line "includes team demo transactions" and the team wallets listed on /proof; a "See a real card" button opens the demo wallet's card at `/card/DEMO_ADDR`; a 3-step strip (Hindsight → Convert → Every trade builds stock).
- **Seed script requirements:** `scripts/seed-demo.ts` per Section 6 table: real buys, convert, sweeps, stake, distributes. No fake rows, no mock data in any production path.
- **10-second test:** headline "Your memes, in real stock." + subline "See what your memecoins cost you in NVDA. Fix it in one tap." + the live counter strip.
- **30-second test:** the demo wallet's real card visible without connecting (one click), every number with a tx/round receipt.
- **60-second test:** "Look up any wallet" with the judge's own address, or Connect and convert $1 of a meme.
- **Landing page content:** no login wall; connect is optional for reading; empty states always explain the next action.
- **Demo-Insurance Invariant Check:** the product claim is verifiability ("every number from mainnet or Chainlink"), so fabricated state is forbidden outright. Precache allowed only as a response cache of real computations (5-min TTL); seed state is real transactions made in advance (earned, not fabricated).

## 7.6 Judge Proof Artifacts

- **Proof route:** `/proof` plus README "Proof" section and `submission/proof.md`. <!-- [CRITIQUE E-2] --> /proof opens with a rubric map: three cards ("A real reason to use $WIF", "A flywheel that holds up", "Works and built well") each linking to live evidence (burn tx, staker claim, fee-discount rule; routed volume → burn → stream totals; 7 verified contracts, 38 fork tests, recompute box).
- **Required artifacts:** verified contract addresses (TerraRouter, Jar, FeePool, WifStaking, StockOracle, HindsightLens, FriendJar) linked to `https://robinhoodchain.blockscout.com/address/{addr}`; tx hashes for: first convert, first sweep trade, first `Distributed` with WIF burn, first staker `Claimed`, a HindsightLens recompute call (eth_call result shown); running totals from events; fork test count and command.
- **Proof generation:** `scripts/proof.ts` reads events from deployment block, writes `submission/proof.md` and `web/data/proof.json` (also served live by `/proof` directly from chain).
- **Explorer link pattern:** `https://robinhoodchain.blockscout.com/tx/{hash}` and `/address/{addr}` (explorer UI works in browsers; its API is Cloudflare-gated, so proof reads come from RPC).

---

## 7.6b Proof-Disclosure Standard (peer review, adopted)
- Every proof surface labels its network: "Robinhood Chain mainnet 4663" or "mainnet fork (block N, not onchain)". Fork-only results (e.g. the fork-test burn) are never shown or narrated as mainnet events.
- Cached proof (proof.json) always shows the block number it was read at; live reads say "live".
- No claim in README, video or posts without a mainnet tx/address or a CLAIMS.md row re-derived by verify-claims.ts.
- Geofencing is interface-level (IP + attestation) only; README and /proof state this, plus that Stock Token issuer/transfer restrictions must be reviewed before any production use. The Jar holding Stock Tokens for users is disclosed as pooled custody by an ownerless contract (withdraw any time; no admin path).

## 7.6c Acquisition loop emphasis (peer review, adapted)
Dead-meme-bag conversion (Hindsight → one-tap convert) is the primary acquisition and volume loop (OD1); the terminal sweep and staker stream are the retention loop. Economics never assume terminal routing volume (Section 7.8 shows dust honestly). A single block-numbered "Robinhood Chain Regret Index" snapshot (aggregate of real cards across registry holders, computed once via /api/hindsight, block stated) feeds the ship thread; no live aggregate dashboard.

## 7.7 Feature Priorities and Acceptance Criteria

P0 = load-bearing (hero flow + demo obligation). P1 = ships for judging. P2 = only after P0+P1 are green on mainnet. Friend Jars are gated by OD7 (core green by 2026-11-11 23:59 WAT) and Thesis tripwire 3.

| ID | Feature | Pri | Component | Acceptance criterion (observable) |
|---|---|:---:|---|---|
| F-001 | Hindsight card for a connected wallet | P0 | C7, C9 | For the demo wallet, `/api/hindsight` returns >= 3 priced memes; every buy carries a tx hash that exists onchain with `tx.value > 0`, and a roundId whose `updatedAt <= ts`; totals equal the sum of rows |
| F-002 | HindsightLens recompute parity | P0 | C6 | `recompute(buys)` eth_call equals the API's `usdPaid` and `sharesCounterfactual` within 1 wei-unit rounding |
| F-003 | One-tap convert to Jar | P0 | C1, C2, C5 | A `convert()` tx emits `Converted` and `Credited(source=1)`; Jar.balanceOf(user, NVDA) increases by exactly the NVDA received; stock fill within the 3% Chainlink band |
| F-004 | Meme buy with sweep | P0 | C1, C8 | A `buy()` tx emits `Traded` + `Swept`; FeePool ETH balance rises by exactly 0.5% of msg.value; Jar credit equals NVDA received |
| F-005 | Meme sell with sweep | P0 | C1 | A `sell()` tx returns ETH to user = proceeds − fee − sweep; `Swept` emitted when sweepBps > 0 |
| F-006 | FeePool distribute: buy + burn $WIF | P0 | C3 | `Distributed.wifBurned > 0` and $WIF `totalSupply()` decreases by exactly `wifBurned` in that tx |
| F-007 | Staker stream in chosen stock | P0 | C3, C4 | After an epoch with fees, `pending(staker)` > 0 in the chosen stock; `claim()` emits `Credited(source=3)` |
| F-008 | Anti-JIT epoch activation | P0 | C4 | A stake made during epoch e (incl. its last second) earns 0 from distributes in epochs e and e+1 and > 0 from e+2 (fork tests) |
| F-009 | WIF never sold | P0 | C1 | `sell`/`convert` with $WIF input reverts `WifNotSellable` (fork test) |
| F-010 | Chainlink-bounded fills | P0 | C5 | A forced stale feed (vm.warp past max age) makes convert/sweep revert `StaleOracle` (fork test) |
| F-011 | Jar withdraw | P0 | C2 | `withdraw()` transfers the exact token amount to the user and zeroes the ledger delta |
| F-012 | Look up any wallet + OG card | P1 | C9 | `/card/0x…` renders read-only with "Connect to fix yours"; OG image returns 200 image/png |
| F-013 | Meme terminal paste-CA | P1 | C8, C9 | Pasting each of the top 10 registry memes yields a quote; an unknown CA triggers on-the-fly pool discovery |
| F-014 | Geofence on stock leg | P1 | C9 | With `x-vercel-ip-country=US`, convert/stake buttons are disabled with the reason; Hindsight still works |
| F-015 | Keeper hourly distribute | P1 | C10 | GitHub Actions run log shows a `distribute` tx or "skip" each hour from deploy until 2026-11-16 17:30 UTC |
| F-016 | /proof live page | P1 | C9 | Lists 7 verified contracts (6 core + gated FriendJar) and the 5 first-of-kind tx hashes; all links resolve |
| F-017 | Mobile-first-class UI | P1 | C9 | Hero flow completes at 390×844 (iPhone 14) with no horizontal scroll and >= 44px tap targets |
| F-018 | Quicknode-verified Jar | P1 | C9 | `/jar` shows "verified by Quicknode Stock Token API" when `qn_getStockTokenBalances` agrees with direct reads |
| F-019 | Mint the card (burns 1 $WIF) | P1 | C6 | `mintCard()` burns exactly 1e18 $WIF and emits `CardMinted` |
| F-020 | Friend Jars | P2 (gated) | C12 | Only if F-001..F-017 green on mainnet by 2026-11-11 23:59 WAT (OD7): invite link → embedded wallet (email) with sponsored first tx → co-owned Jar credited pro-rata; otherwise documented as future |
| F-021 | Staker fee discount | P1 | C1, C4 | A wallet with >= 10,000 $WIF active stake pays exactly 30 bps on `buy()`/`sell()`/`convert()` (fork test asserts FeePool delta); others pay 50 bps |
| F-022 | Live ticker (GetBlock websockets) | P1 | C13, C9 | Landing and /proof show a new `Traded`/`Distributed` event within 10s of its block, streamed server-side from GetBlock WSS (endpoint never exposed to the browser) |
| F-023 | Leaderboards | P1 | C7, C9 | `/board` shows "biggest regret" (from `CardMinted` events re-verified against /api/hindsight for the minter; unverified mints hidden), "biggest Jars" (from `Credited`/`Withdrawn`), "most fees routed into the burn" (from `Traded.fee`); every row links to its tx |
| F-024 | Saving streak | P1 | C9 | `/jar` shows current streak = consecutive UTC days with >= 1 `Swept`/`Converted` event for the wallet; recomputable from events |
| F-025 | Weekly Jar report card | P1 | C9 | `/jar/report/[addr]` OG image shows 7-day Jar growth (shares + USD) from events and Chainlink, shareable to X |
| F-026 | Receipt-priced Hindsight buys | P1 | C7, C6 | Buys paid in WETH/USDG/stock tokens (tx.value == 0) are priced from the wallet's outgoing Transfer in the same tx (receipt) with the matching Chainlink round; fork-free unit test on 2 real such txs |

## 7.8 Economics (honest model)

Parameters (OD2, ratified): fee 0.5% of routed ETH notional; split 50% WIF buy+burn / 50% staker stock; default sweep 2% (0–10%).

**Worked example: one 0.01 ETH meme buy at $2,037/ETH ($20.37):**
| Leg | ETH | USD |
|---|---:|---:|
| Fee to FeePool | 0.00005 | $0.102 |
| Sweep into user's Jar (NVDA) | 0.0002 | $0.407 |
| Meme purchase | 0.00975 | $19.86 |
| Of the fee: WIF buy+burn | 0.000025 | $0.051 (≈ 39 WIF burned, using the fork-measured 1,559 WIF per 0.001 ETH) |
| Of the fee: staker stock | 0.000025 | $0.051 |

**Volume scenarios (per day):**
| Routed volume/day | Fee/day | WIF burned/day | Stock to stakers/day | Burn as % of supply/yr |
|---|---:|---:|---:|---:|
| $100 (demo week) | $0.50 | ≈ $0.25 (≈ 180 WIF) | $0.25 | ≈ 0.007% |
| $10,000 | $50 | ≈ $25 (≈ 18K WIF) | $25 | ≈ 0.66% |
| $83,000 (= today's WIF/ETH pool 24h volume, research-brief) | $415 | ≈ $207 | $207 | ≈ 5.5% |

(Burn quantities use the fork-measured fill of 1,559 WIF per 0.001 ETH and WIF supply ≈ 999.996M; this is offline analysis only, the contracts never read a $WIF price. Figures are arithmetic, not forecasts.) The demo honestly shows the mechanism at real, small size (Risk R1). The pitch states the curve, never a projected APR.

**Why routing through Terra Firma instead of Uniswap directly?** The user's own Jar grows with each trade (savings, not a toll), and the Hindsight card is the reason to arrive. Honest all-in cost: the 0.5% protocol fee is charged ON TOP of the pool's own fee (0.05%–1% tier, plus ~1% on Pons-hooked pools: fork-measured -1.04% on the WIF/ETH pool, fact-check TF2); the sweep is not a cost, it is the user's own stock. A user routing $100 pays $0.50 more than going direct and keeps $2 in their Jar at the default sweep.

## 7.9 Out of Scope (by reference to WINNER-BRIEF Explicit Out-of-Scope)
- Dividend-driven burns or any claimed dividend demo beat (Thesis tripwire 2).
- A new Uniswap v4 hook pool or custom AMM.
- Time-locked vouch/referral bonds.
- AI agents.
- Off-chain aggregators in the money path (KyberSwap etc. rejected, AMEND-4).
- Selling, converting or pricing $WIF for value anywhere (Thesis INVARIANTS 1–2, tripwire 4).
- Telegram bot (OD1 stretch, not this submission).
- Meme buys paid in tokens other than ETH, WETH, USDG or the curated stock tokens are not priced (shown as "unpriced" rows).

---

## 8. Day-by-Day Build Plan

Clock: now 2026-11-10 ~23:00 WAT. Build window ≈ 35h to the internal submit target. Hour-level because the whole build is ~1.5 days.

| Day | Date / window (WAT) | Primary Objective | Secondary Objective | Deliverable |
|:---:|------|------------------|--------------------|------------|
| 0 | Nov 10 21:00 – Nov 11 05:30 | Forge (all phases + gates; contracts, web, scripts pre-built and tested) | critique handoff | Approved docs + 33 fork tests |
| 1a | Nov 11 05:30 – 09:30 | PLAN P0–P2: verify, repo + honesty scaffold, data builds, local fork hero flow | Dami funds wallets | Hero flow on a fork deployment |
| 1b | Nov 11 09:30 – 13:30 | **PLAN P3–P4: mainnet deploy + verify + Vercel + keeper; real seed txs; first distribute with burn; proof** | — | Live URL + first-of-kind txs |
| 1c | Nov 11 13:30 – 18:30 | PLAN P5: depth adds live (stream, board, streak, report, Quicknode, HyperSync, card mint) + mobile | — | F-018..F-026 observable |
| 1d | Nov 11 18:30 – 22:00 | PLAN P6: core-green audit (F-001..F-017); OD7 Friend Jars decision by 23:59 | FriendJar UI only if green | Gate recorded |
| 2 | Nov 11 22:00 – Nov 12 08:00 | PLAN P7: livetest, design, interrogate, docs, package, video, **submit 08:00 WAT** (3h slack inside) | Regret Index snapshot, ship thread draft | Submission receipt |
| 3+ | Nov 12 – Nov 16 17:30 UTC | Keep live; keeper runs; respond to judges | Gallery updates | Live until close |

### Depth adds (Dami 2026-11-10, Phase 1.5)
F-021 fee discount (~1h, contracts window 1b), F-022 live ticker (~1.5h, frontend window 1d), F-019/F-023 card mint + leaderboards (~2h, 1d), F-018 Quicknode Jar (~1h, 1d), F-024/F-025 streak + weekly report (~2h, 1d/2a), F-026 receipt pricing (~2h, indexer in 1a). Total ≈ 9.5h, absorbed by running contract work and frontend work in parallel subagents (build skill) and by shifting design polish into 2a. Friend Jars (~6h) remain gated by OD7 and consume buffer only if core is green by 23:59 WAT Nov 11.

### Buffer Allocation
The hard deadline (18:30 WAT Nov 12) leaves ~8.5h of buffer after the internal target. The friend-jar slot (1e onward) is the first buffer consumed: if core is not green by 23:59 WAT Nov 11, that time goes to fixes, not features.

---

## 9. Dependencies & Prerequisites

### External Services
| Service | URL | Auth Required | Status |
|---------|-----|:---:|---|
| GetBlock RPC (FRA, NYC) | `.env.local` GETBLOCK_RPC_* | token in URL | live (chainId 0x1237 verified 2026-11-10) |
| Public RH RPC | https://rpc.mainnet.chain.robinhood.com | no (User-Agent) | live, rate-limited |
| Quicknode endpoint | `.env.local` QUICKNODE_BASE + token | token in URL | created 2026-11-10; token pending |
| Envio HyperSync | https://robinhood.hypersync.xyz/query | bearer token | supported, not used unless a token is added |
| DexScreener API | https://api.dexscreener.com | no | live (registry build only) |
| Vercel | vercel.com | Dami account / CLI token | untested this project |
| GitHub (repo + Actions keeper) | github.com (gh CLI account dmustapha) | gh auth | live |
| Robinhood Chain explorer | https://robinhoodchain.blockscout.com | no (UI); API Cloudflare-gated | UI live |

### Development Tools
| Tool | Version | Purpose | Install Command |
|------|---------|---------|----------------|
| Foundry (forge/cast/anvil) | 1.4.4-stable | contracts, fork tests, deploy | `foundryup` |
| solc | 0.8.26 | compiler (cancun) | via foundry.toml |
| Node.js | >= 20 | web + scripts | installed (`/opt/homebrew/bin/node`) |
| pnpm | >= 9 | package manager | installed |
| Next.js | 15.x | frontend + API routes | `pnpm create next-app` |
| wagmi / viem | 2.x | wallet + chain (`robinhood` chain def, id 4663) | `pnpm add wagmi viem @tanstack/react-query` |
| tsx | 4.x | run TS scripts | `pnpm add -D tsx` |

### Accounts & Credentials
| Account | Purpose | How to Get |
|---------|---------|-----------|
| Deployer EOA (fresh) | deploy + verify + keeper gas | `cast wallet new`; key into `.env.local` + GitHub secret; Dami funds ~0.002 ETH |
| Demo user EOA (fresh) | seed-demo real txs + recording | `cast wallet new`; Dami funds ~0.004 ETH + ~1,000 $WIF (or buy WIF via TerraRouter) |
| WalletConnect project id | mobile wallets | cloud.reown.com (Dami) or injected-only fallback |
| Vercel | hosting | Dami account (`vercel login`) |
| worldisflat.fun builder login | submission + perks | done by Dami 2026-11-10 |

### On-Chain Addresses (Robinhood Chain mainnet 4663)
| Item | Address | Source |
|------|---------|--------|
| $WIF | 0x5173b8eA6923c2d40267890D45C46a3480954773 | intel, onchain |
| WETH | 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 | RH docs |
| USDG (6dp) | 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 | RH docs |
| Universal Router | 0x8876789976dEcBfCbBbe364623C63652db8C0904 | Uniswap docs + fork spike |
| v4 PoolManager | 0x8366a39cc670b4001a1121b8f6a443a643e40951 | Uniswap docs |
| V4Quoter | 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 | Uniswap docs |
| StateView | 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b | Uniswap docs |
| v3 Factory | 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA | Uniswap docs |
| QuoterV2 | 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 | Uniswap docs |
| v2 Factory / Router02 | 0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f / 0x89e5db8b5aa49aa85ac63f691524311aeb649eba | spike-coverage |
| WIF/ETH v4 pool hook (third-party, owned) | 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044 (owner 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd) | fact-check TF2 |
| WIF/ETH v4 pool id | 0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79 (key: ETH, WIF, fee 0, ts 200, hook above) | fact-check TF2 |
| NVDA/WETH v3 pool (fee 500) | 0x62AB521f71431f78ac374CdbadC6cda3c8916b6C | spike-coverage |
| NVDA/USDG v3 pool (fee 500) | 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3 | fact-check TF3 |
| Multicall3 | 0xca11bde05977b3631167028862be2a173976ca11 | viem chain def |
| Chainlink ETH/USD | 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9 | Chainlink directory |
| Chainlink NVDA/USD (history) | 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 | Chainlink directory |
| Chainlink NVDA 24/7 (live) | 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F | Chainlink directory |
| Chainlink TSLA 24/7 | 0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37 | Chainlink directory |
| GOOGL, SNDK 24/7; SPY, QQQ feeds; TSLA/GOOGL/SNDK/SPY/QQQ tokens + pools | from research/raw/cl-feeds-rh.json and rhj-assets-now.json; resolved and fork-verified in ARCHITECTURE Section "Addresses" | Phase 2 |
| NVDA token | 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC | rhj assets |
| TSLA / SPY / QQQ tokens | 0x322F0929c4625eD5bAd873c95208D54E1c003b2d / 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C / 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68 | rhj assets |
| Terra Firma contracts | DEPLOY_AND_RECORD_ADDRESS_HERE | Plan Phase deploy |

---

## 10. Concerns Compliance

| # | Severity | Concern | How PRD Addresses It |
|---|:---:|---------|----------------------|
| 1 | C | Time not a constraint; best possible, extensive build | 6 core contracts + gated FriendJar (7 deployed) + indexer + terminal + 9 page routes + 5 API routes (incl. SSE stream); hour-level plan (Section 8); no scope cut proposed |
| 3 | C | Uniqueness in exact niche | 0/49 entrants convert meme activity into owned stock (Section 1, Uncontested lane) |
| 5 | C | Real humans helped | Primary user: non-US RH meme trader down on memes (USER-ONBOARDING.md); ~1.45K active $WIF voters are users |
| 8 | C | Cumulative corrections carry forward | Mainnet 4663, 1-seat vote, no dividends, CONTRACT_BALANCE, NVDA scaling rule all applied |
| 9 | C | Significant real problem + conviction | Section 1 problem (84% of memes never trade again; per-wallet regret number) |
| 13 | C | Day-1 users exist today | Every RH meme wallet can open its card on day 1; ~1.2K WIF transfers/day |
| 15 | C | No self-duplication | Distinct from all built-projects.md entries (leash = agent spend wall) |
| PH-1 | C | $WIF onchain on RH mainnet, load-bearing + flywheel | F-006, F-007, F-009; delete-test (Section 1) |
| PH-2 | C | Live until 2026-11-16 17:30 UTC | Vercel + GitHub Actions keeper; F-015; R12 |
| PH-3 | C | Multi-layer, >= 4 load-bearing mechanisms | Hindsight, convert+Jar, Router+sweep, stake+burn stream, safety layer (5) |
| 2 | I | Mainnet required, minimal spend; core $WIF flows real | Measured ~0.003 ETH gas; all P0 flows are real mainnet txs (Section 6 seed table) |
| 6 | I | Use all research | spike-coverage, spike-indexing, spike-fork, fact-check, strategy-density cited throughout |
| 7 | I | Be extensive | 20 features (Section 7.7), 15 risks |
| 10 | I | Focused product, broad problem | One loop (memes → stock, $WIF earns) for every RH meme trader |
| 11 | I | Win + impact align | Judging map (Section 1) = product mechanics |
| 14 | I | Demo feels like a real product | Live mainnet app, real txs, mobile cut-in (Section 6) |
| CX-1 | I | Mobile-native UX | F-017; AMEND-4 web + mobile first-class |
| PH-4 | I | Geofence + no Robinhood branding | F-014, Flow 8; C9 constraint |
| PH-5 | I | Submit early | Internal target 08:00 WAT Nov 12 (Section 8, R11) |
| PH-6 | I | Security-legible, no spot oracle for value | Section 4 C1/C3/C5 rules; F-008..F-010; SECURITY.md |
| PH-7 | I | Instant legibility | Section 7.5 10/30/60-second tests |
| PH-8 | I | Mobilization line | Hindsight card = shareable post; OD8 ship thread |
| 4 | A | Fresh ideas allowed | Merge of Rearview × Keel (warroom) |
| 12 | A | Reframing on the table | AMEND-1..4 recorded |
| CX-2 | A | AI only if load-bearing | No AI (Section 7.9) |
| CX-3 | A | Sponsor stacking | GetBlock primary RPC; Quicknode Stock Token API (P2 view); Chainlink feeds; Uniswap v4 |

---

## 11. Submission Form Answers (draft for package)
- **What someone does:** connects a wallet, sees what their memes cost them in real stock, converts in one tap, then trades memes through Terra Firma so every trade builds their Jar.
- **What happens to $WIF:** 0.5% of every routed trade goes to a fee pool; every hour half buys $WIF and burns it, half buys real stock paid to $WIF stakers in the stock they pick. $WIF is never sold or priced for value.
- **Why they come back:** their Jar of real stock grows with every trade; stakers' Jars fill every hour; Hindsight cards bring new wallets in.

---

## 12. Glossary (plain language first)
| Term | Plain meaning | Where it matters |
|---|---|---|
| Hindsight card | A receipt-backed card showing what you paid for memes, what they're worth now, and what NVDA would be worth | F1, F2, F9 |
| Jar | One shared contract that keeps a separate balance of real stock for each user; only you can withdraw yours | F3, F6 |
| Sweep | The slice of each trade (default 2%) that buys real stock for your own Jar | F5 |
| Fee pool | Where the 0.5% fee collects until the hourly split | F7 |
| Epoch | One hour; rewards are paid per epoch | F4, F7 |
| Sub-pool | The group of stakers who chose the same reward stock | F4 |
| Universal Router | Uniswap's router contract that can trade across v2, v3 and v4 pools in one call | C1 |
| Hook (v4) | Extra code attached to a v4 pool; the WIF/ETH pool's hook is third-party and takes a small cut | R4, T9 |
| Chainlink round | One recorded price update of a feed, with an id and a timestamp | C5, C6 |
| uiMultiplier | The stock token's factor that turns raw token balance into shares (accounts for splits/dividend steps) | F6 |
| Min-out | The least you accept from a trade; below it the trade cancels | every trade |
| Geofence | Blocking stock purchases for restricted regions while leaving everything else open | F8 |
| JIT staking | Staking right before a payout to grab it, then leaving; blocked by next-epoch activation | T4 |
