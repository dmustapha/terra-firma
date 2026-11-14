# Livetest Report (one pass: V1 functional, V2 exact-value, V3 adversarial)
**URL:** https://terra-firma-henna.vercel.app (design v3.1, commit e40e0bb live) | **Chain:** Robinhood Chain mainnet 4663 | **Mode:** Hybrid (web + contract)
**Tested:** 2026-11-12T07:41Z | **Result:** 116 PASS / 0 FAIL / 1 SKIP / 1 WARN (1 P1 found and fixed in a51eeaf, not yet deployed)
**Overall: PASS** (no P0). Cold-stranger hero gate: **PASS**, 13.2 s against a 60 s budget.

## Interface Inventory
| Channel | Endpoint | Auth | Priority | Tested |
|---|---|---|---|---|
| Browser UI | 16 routes (/, /app, /app/convert, /trade, /trade/[ca], /jar, /stake, /board, /proof, /card/[addr], 404s) | none / wallet | high | yes |
| REST | /api/hindsight, /api/quote, /api/card-check, /api/geo, /api/health, /api/qn-jar | none | high | yes |
| JSON-RPC proxy | POST /api/rpc (read-only allow list) | none | high | yes |
| SSE | /api/stream | none | medium | yes |
| OG images | /opengraph-image.png, /card/[addr]/opengraph-image, /jar/report/[addr]/opengraph-image | none | medium | yes |
| Contracts | TerraRouter, Jar, FeePool, WifStaking, StockOracle, HindsightLens, FriendJar | wallet | high | yes (mainnet reads + fork writes) |

## V1 Functional
| Domain | Result | Notes |
|---|---|---|
| 1 Core user flows | PASS | Drill any wallet -> card -> recompute onchain (cold, no wallet). Wallet flows on a fork through the real UI: buy+2% sweep, $WIF buy, approve+stake, claim to Jar, Jar withdraw (all status 0x1). |
| 2 API connectivity | PASS | All 13 endpoints 200 with expected content types; SSE hello in < 1 s. |
| 3 Visual completeness | PASS | 42 loads: 0 broken images, 0 placeholder text, every h1 present. |
| 4 Forms | PASS | Bad addresses rejected with a visible state; buy amount input drives the live quote. |
| 5 Console errors | PASS | 0 first-party errors on every 200 route (404 routes log their own 404 resource, expected). |
| 6 Auth (wallet) | PASS | Injected wallet connects and signs on the fork; Connect visible on every route; geo attestation dialog gates stock actions. |
| 7 Mobile 375 | PASS | 0 horizontal overflow on all routes; compact nav scrolls with a fade (Leaderboard off-screen until scrolled, P2). |
| 8 Post-PRD additions | PASS | Convert tab, /api/rpc proxy, $WIF label, seedling seal mark all live. |
| 9 Integration proof | PASS | See cross-integration proofs. |
| 10 Budget | PASS | $0 spent (reads + fork only). |

## V2 Exact-Value Assertions (derived from source, recomputed from chain)
```
TC-V2-LENS-AI-usdPaid8: actual=1821608070013(expect 1821608070013) (HindsightLens.recompute vs API)
TC-V2-LENS-AI-shares18: lens=103449020523046887753 api=103449020523046887753 (expect within 113 wei)
TC-V2-CARD-AI-txs: 25 sampled buys, paid amount == tx.value or outgoing Transfer, bad=0(expect 0)
TC-V2-CARD-totals-usdPaid8: actual=1821608070013(expect 1821608070013)
TC-V2-CARD-totals-usdCf8: actual=1669723593820(expect 1669723593820)
TC-V2-FP-distribute-status: success(expect success)  tx 0xbd233684…87c0
TC-V2-FP-supply-drop: 11066654700738518500(expect 11066654700738518500)  WIF totalSupply delta in the burn block
TC-V2-FP-totalWifBurned: 11066654700738518500(expect 11066654700738518500)
TC-V2-ST-pending: stockId=0(expect 0=NVDA), amount=87790798490733(expect >0)
TC-V2-ST-active: 159408520464893431233(expect 159408520464893431233)
TC-V2-JAR-demo-NVDA: 3997133390327403(expect >0)
TC-V2-UI-recompute-NVDA: Paid $18,216.08 = onchain $18,216.08 check, Shares 103.4 = 103.4 check
TC-V2-UI-recompute-TSLA: Paid $18,216.08 = $18,216.08 check, Shares of TSLA 49.11 = 49.11 check (DH-4)
TC-V2-PROOF-links: 7/7 tx links status=1(expect 1); 8/8 address links have code; FriendJar code present
TC-V2-STREAM: new fork trade 0x235b05cd… on /api/stream as credited+swept+traded ~3 s after send (expect <= 10 s)
```
Multi-channel matrix, Hindsight card for 0x3fDB…b09E: Browser UI (cold) PASS, /api/hindsight PASS, HindsightLens eth_call PASS, OG image 200 PASS -> **PASS**.
Burn: /proof UI 11.07 PASS, FeePool.totalWifBurned PASS, WIF Transfer to 0x0 PASS (proof.md), totalSupply delta PASS -> **PASS**.

## V3 Adversarial
28/28 API cases behave as designed (ADV-01 uint256 max / negative / sweep 1001, ADV-02 empty / zero / WIF sell -> 422, ADV-03 600-char address / 31-call batch / 70 KB body -> 413, ADV-05 XSS / bad side / bad stock / EOA token / spoofed geo header / disallowed RPC methods / garbage JSON / GET on POST route). card-check refuses a 100x inflated claim (verified:false). Geo-gate dialog: opens modal, focus inside, Tab stays inside, Escape closes, focus returns to the trigger. Duplicate ids: 0 on all 42 loads.

## Cold-Stranger Hero Gate
Fresh Chromium context, no storage state, process launched with `env -i` (no .env). Hero (USER-ONBOARDING.md U3 / COLD-STRANGER GENESIS): a stranger pastes any wallet on the landing page, gets a receipt-backed Hindsight card and recomputes it onchain, no wallet, no login. Card in 11.9 s, onchain recompute matched at 13.2 s. **PASS.** The money leg (convert, sweep, stake) needs the visitor's own funded Robinhood Chain wallet by design; it was executed on mainnet through the real UI by the demo wallet and replayed on a fork with a fresh test key.

## Free Pre-Money Proof Surface
`/card/[addr]` and `/api/hindsight?addr=` run the real Hindsight engine for any address with zero setup; the onchain recompute confirms it is not canned. present, setupRequired none.

## Cross-Integration Proofs
| Integration | Proof |
|---|---|
| FeePool.distribute -> Uniswap v4 WIF buy + burn | 0xbd23368477c98de488447b1c20895b8d438bdba9977d63b8f01835899d0287c0 (11.07 WIF burned) |
| TerraRouter.convert -> Jar credit (mainnet, real UI) | 0xc5500b3cdd258f293c22f126f614af07c8ae541b159d27bd7ca84a85872131b5 |
| TerraRouter.buy + sweep -> Jar (mainnet, real UI) | 0x7f5b2f1fb864bce8ac6f2fb0fdfebfbf5758997ad1a3bf7ea3cd5cff89551b53 |
| WifStaking.stake (mainnet, real UI) | 0x15551573a7f3ff7cfbb2ab11ce3e2b8141c64701a5ea014984b9fcd7374bcd8f |
| HindsightLens.recompute (eth_call) | matches /api/hindsight for NVDA and TSLA |
| Chainlink rounds | card buys bracket payRound/stockRound (lens accepts every round) |

## Patch Run Summary
| Test ID | Original | Fix Applied | Re-verify |
|---|---|---|---|
| TC-PROOF-contracts (F-016) | P1: /proof listed 6 of 7 contracts (FriendJar hidden by flag); README and PRD promise 7 | a51eeaf: show all 7, FriendJar row notes its screen is off; web/lib/ui-chain.test.ts | PASS locally (rendered row + 142/142 tests); needs deploy |

## Skips (tier-cited)
- FORK-F003-convert UI on fork: SKIP (read-verified: mainnet convert via the real UI, tx 0xc5500b3c…, Converted + Credited; fork cannot serve pre-fork log ranges for the card).

## Warnings and notes
- WARN F-018: /api/qn-jar returns enabled:false (no Quicknode token); badge hidden by design. HyperSync also off (no Envio token).
- P1 demo: the demo wallet's card is EMPTY (all its memes were converted or sold; Hindsight shows memes still held). For the card scene, use 0x3fDB…b09E, or buy and keep one meme from the demo wallet before recording.
- P1 pending Dami: Claim (0.0000878 NVDA waiting) and Mint card. The demo wallet holds 0 $WIF, so Mint needs a small $WIF buy first; minting with an empty card would record a $0 card.
- P2: small tap targets are inline tx-hash links in tables (WCAG inline exemption) and visually hidden radios whose labels carry the target.
- P2: /card/0xnotanaddress renders "Nothing here" with HTTP 200 (soft 404).
