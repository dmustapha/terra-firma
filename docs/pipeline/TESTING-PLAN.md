# Testing Plan: Terra Firma (livetest, one pass V1 + V2 + V3)
**Source files read:** 22 (web/app/api/*/route.ts, web/lib/{hindsight,rpc,ui-chain,config}.ts, web/components/{proof-view,trade-terminal,geo-gate}.tsx, contracts/src/*.sol) | **sourceHash:** 7b2eec5de6b8
**Tests:** V1=56 | V2=23 | V3=30 | fork UI signing=7 | cold-stranger=1
**Critical review:** complete (see findings below)

## Service Map
| Service | Method | Logic type | Notes |
|---|---|---|---|
| HindsightLens | recompute(buys, stockId) | formulaic | usdPaid8 = sum(amountPaid x payRound/1e18 or 1e6); shares18 = sum(paid8 x 1e18 / stockRound); rounds must bracket ts |
| TerraRouter | buy / sell / convert / buyStock | stateful + formulaic | fee = msg.value x feeBps/1e4 (50, or 30 at 10,000 WIF active); sweep slice to Jar |
| FeePool | distribute() | stateful + conditional | once per epoch, >= 0.00001 ETH; half buys + burns WIF, half buys stock for stakers |
| WifStaking | stake / claim / pending | stateful | stake active from epoch e+2; claim credits the Jar |
| Jar | balanceOf(user, stock) / withdraw | stateful | ownerless ledger |
| /api/hindsight | GET addr | formulaic | card totals = sum of rows; receipt-priced non-ETH buys (F-026) |
| /api/quote | GET token, side, amount, sweepBps, feeBps, stock | conditional | 400 on bad input, 422 on WIF sell |
| /api/card-check | GET addr, usdPaid8, stockId | conditional | leaderboard re-derivation; inflated claim -> verified:false |
| /api/rpc | POST JSON-RPC | conditional | read-method allow list, batch <= 30, body <= 64 KB |
| /api/stream | SSE | stateful | polling fallback emits traded/swept/credited |

## V1 Foundation Plan
Every route at 1440 light, 375 mobile, 1440 dark (16 routes, 42 loads): HTTP status, no horizontal overflow, no duplicate ids, no broken images, no "undefined/NaN/[object Object]/TODO", zero first-party console errors. Every API route + OG images + icons + SSE hello.

## V2 Precision Plan (derivations from source, asserted against chain)
- TC-V2-LENS-*: for 0x3fDB…b09E, HindsightLens.recompute(API buys, NVDA) == API usdPaid8 (exact) and shares18 (within 1 wei per buy rounding).
- TC-V2-CARD-*: totals == sum of rows; each sampled buy's amountPaid == tx.value (ETH) or an outgoing Transfer in the receipt (WETH/USDG/stock, F-026).
- TC-V2-FP-*: Distributed.wifBurned == WIF totalSupply drop in the burn block == FeePool.totalWifBurned().
- TC-V2-ST-*: pending(demo) is NVDA and > 0 after the first distribute; activeOf(demo) == 159408520464893431233.
- TC-V2-JAR-*: Jar.balanceOf(demo, NVDA) > 0 after convert + sweeps.
- TC-V2-UI-recompute (NVDA, TSLA): the card's "Recompute onchain" column matches (check marks).
- TC-V2-PROOF-links: every /proof tx link is a successful receipt; every address link has code.
- TC-V2-STREAM: a new trade appears on /api/stream as traded + swept + credited within 10 s.

## V3 Adversarial Plan
ADV-01..05 against /api/hindsight, /api/quote, /api/card-check, /api/rpc, /api/geo, /card, /trade (28 cases), geo-gate dialog focus trap / Escape / focus return, duplicate ids.

## Critical Review Findings
| # | Test ID | Issue | Action Taken |
|---|---|---|---|
| 1 | TC-V2-CARD-AI-txs | First draft assumed ETH-paid buys carry tx.value; the wallet's buys are WETH-paid (payKind 0 covers ETH and WETH) | Assertion corrected to "tx.value or outgoing Transfer in receipt" (F-026 is the spec) |
| 2 | TC-V2-JAR-demo-NVDA | Draft used balanceOf(address,uint8); source is mapping(user => mapping(stock address => uint256)) | Corrected to the NVDA token address |
| 3 | FORK-F003-convert | Convert UI needs the wallet's card, which needs historical log scans; an anvil fork cannot serve pre-fork log ranges through GetBlock (1,000-block cap) | Classified tier-3 read-verified: mainnet convert made through the real UI, tx 0xc5500b3c… |
| 4 | FORK-F011-withdraw | Harness first matched the previous (claim) tx | Harness now only accepts txs with nonce >= the step's start nonce; re-run PASS |
| 5 | TC-PROOF-contracts | /proof hid FriendJar while its flag is off, but PRD F-016 and the README promise 7 contracts | Fixed in a51eeaf (row shown with "screen switched off" note) + unit test |
