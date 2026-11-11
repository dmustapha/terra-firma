# Wire Report — Terra Firma
Run 2026-11-11 ~12:40–13:40 WAT · CAMPAIGN · Status **BLOCKED (funding only)** — every connection that can be tested before mainnet deploy passes; onchain integrations are proven on a local mainnet FORK, which is not mainnet proof.

## Project Topology
| Component | Type | Entry Point |
|-----------|------|-------------|
| contracts | 7 Solidity contracts (no owner) | contracts/src |
| web | Next.js 15.5 app + 7 API routes | web/app |
| keeper | distribute() bot (GitHub Actions) | scripts/keeper.ts |
| scripts | registry/rounds/seed/proof/drill | scripts/ |
| ci | typecheck + tests + claims | .github/workflows |

## Connection Graph / Integration Test Results
| From | To | Type | Credential | Result | Time | Notes |
|---|---|---|---|:-:|--:|---|
| web/lib/rpc.ts | GetBlock FRA | rpc | GETBLOCK_RPC_FRA | PASS | 616ms | eth_chainId 0x1237 |
| web/lib/rpc.ts | GetBlock NYC | rpc | GETBLOCK_RPC_NYC | PASS | 1180ms | 0x1237 |
| web/lib/rpc.ts | public RPC (log scans) | rpc | — | PASS | — | 5,000-block getLogs → 18 logs; GetBlock rejects the same range ("Block range is too large"), so the routing is correct |
| web/lib/hypersync.ts | Envio HyperSync | api | ENVIO_API_TOKEN | SKIPPED | — | /height OK, /query 401 without token; eth_getLogs fallback carries the card |
| app/api/stream | GetBlock WSS | websocket | GETBLOCK_WSS_FRA | PASS | 631ms | mainnet newHeads; FORK: Traded/Swept/Credited delivered 53 ms after the tx; 22 concurrent → 20×200 + 2×503 |
| app/api/qn-jar | Quicknode | rpc | QUICKNODE_TOKEN | SKIPPED | — | UNAUTHORIZED without token; route returns enabled:false, badge hidden |
| TerraRouter | Universal Router 2.1 | contract | — | PASS (FORK) | — | drill: buy+sweep, convert, hooked-pool WIF buy |
| StockOracle / HindsightLens / rounds | Chainlink feeds | contract | — | PASS | 497ms | /api/health 7/7 feeds live (mainnet); recompute exact (FORK) |
| FeePool | WIF/ETH v4 hooked pool | contract | — | PASS (FORK) | — | distribute burned 27.93 WIF (drill) and 204.41 WIF (keeper) |
| quote.ts | V4Quoter/QuoterV2/Router02 | rpc | — | PASS | ~0.5s | buy → v2, sell → v3 route (mainnet) |
| app/api/geo | Vercel geo header | api | — | PASS | — | US/CU restricted, NG/DE allowed |
| scripts/build-registry.ts | DexScreener | api | — | PASS | — | PONS 30 pairs |
| keeper | FeePool | contract | KEEPER_KEY | PASS (FORK) | — | dry run; live distribute; same-epoch re-run skips |
| app/api/hindsight | router-buy card branch (DH-2) | api | — | PASS (FORK) | 6.3s | 3 router buys priced $16.1858 = independent recompute (0.00786 ETH meme legs × $2,059.26); after a 4th buy, $118.6341 = recompute (evidence/wire/card-router-fork.txt). The card relies on the deployed TerraRouter address: with the wrong config it counts the full msg.value |
| app/api/hindsight | heavy mainnet wallet | api | — | PASS | 12.2s cold / 22ms cached | $15,380.80 paid, AI meme |
| app/api/card-check | board verification | api | — | PASS | 291ms | honest claim verified:true, forged claim verified:false |
| pages (11) | — | http | — | PASS | 0.35–6.2s | all 200 (/friends 404 by design, gated) |

## Credential Audit
| Env Var | Required By | Status | Source |
|---|---|---|---|
| GETBLOCK_RPC_FRA / _NYC / WSS_FRA | rpc.ts, stream | RESOLVED | ~/wif-hack/.env.local |
| RPC_URL | scripts, keeper | RESOLVED | .env.local |
| DEPLOYER_KEY / KEEPER_KEY | deploy, keeper | RESOLVED (format OK, unfunded on mainnet) | .env.local |
| ENVIO_API_TOKEN | hypersync.ts | **UNRESOLVED** | Dami |
| QUICKNODE_TOKEN | qn-jar | **UNRESOLVED** | Dami |
No real key or endpoint appears in any tracked file (exact-value sweep over `git ls-files`).

### Mock Mode Warnings
None. No USE_MOCK/DEMO_MODE/DRY_RUN flags in .env; `--dry` exists only as a keeper CLI flag.

## Fixes
1. **Log-scan routing (wiring):** `eth_getLogs` was hardwired to the public RPC, so fork-only router txs could not reach the card. Added optional `LOGS_RPC` (default: public RPC) in web/lib/rpc.ts; documented in .env.example.
2. **All pages 500 under webpack dev (harness):** `wagmi/connectors` pulls `@x402/evm/upto/client` via Base Account → CDP SDK. The project's dev and build both use `--turbopack`, where all pages return 200. Latent: a plain `next build` (webpack) would fail. Recorded for deploy (Vercel must run the `build` script).
3. **Secret-gate false positive:** `const TOKEN = <PONS address>` in quote.test.ts renamed to `PONS`.
4. `.env.example` merged with the server-only keys (open debug item).

## Isolation, Privacy, Async
- Cross-account (FORK): account B's `Jar.withdraw` of A's NVDA and `Jar.credit` for A both revert; A's balance unchanged → ISOLATION HOLDS.
- Privacy audit: SKIPPED, trigger absent (no FHE/ZK/encrypted storage).
- Async latency: heavy-wallet card cold 12.2 s (SLOW, demo needs a wait cue or pre-warm), OG image cold 5.5 s (MEDIUM), cached card 22 ms, stream event 53 ms.

## Deep-Integration (Phase 5.8)
Uniswap UR + v4 hooked pool, Chainlink, Stock Tokens, $WIF: load-bearing, sole provider, fail-closed and non-custodial are proven (fork tests + drills), but **CRIT-4 live-on-mainnet is unproven** (fork hashes only) and BT-5 browser network capture awaits a deployed UI with a signing wallet. GetBlock is infra with a deliberate public fallback (not claimed as a sponsor primitive). Envio and Quicknode lack tokens.

## Blockers
| # | Blocker | Type | Connection | Recovery Hint |
|---|---|---|---|---|
| 1 | Mainnet deploy pending | funding | all onchain | Dami funds deployer 0.0008 + keeper 0.0004 ETH → build P3; fork estimate says the deploy costs 0.00045 ETH at 0.04 gwei |
| 2 | ENVIO_API_TOKEN | credential | HyperSync | Envio dashboard token |
| 3 | QUICKNODE_TOKEN | credential | Quicknode | token from the spring-multi-lake endpoint URL |

## Findings for downstream
- **Keeper threshold vs demo volume:** keeper only distributes at ≥0.0002 ETH in FeePool (about 0.04 ETH of trades per epoch at 0.5%). Demo trades of 0.0003 ETH will never trigger it. The first distribute in the demo must come from the /proof button (contract min 0.00001 ETH, about 0.002 ETH of volume) or a lower keeper minimum.
- **Predicted mainnet addresses:** the deployer's nonce is 0, so a first mainnet deploy reproduces the fork addresses (TerraRouter 0xBa4d301D…56Fa), provided no other tx is sent from the deployer first.
- Client-side reads use the hardcoded mainnet RPC (fine for prod; the UI cannot be pointed at a fork).

## Summary
14/16 connections PASS (6 of them FORK-only), 2 SKIPPED for missing optional tokens, 0 FAIL, 0 sentinel hits, 0 auth gaps (no mutating API routes). Status is BLOCKED only by mainnet funding and two optional tokens.
