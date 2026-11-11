## Section N+1: Domain Knowledge File (spec for build → `DOMAIN-GUIDE.md`)
Build generates `DOMAIN-GUIDE.md` from this spec (non-agent project).

| Concept | Definition | Code identifier | Source |
|---|---|---|---|
| Stock Token | ERC-20 on RH representing one share × `uiMultiplier()` (ERC-8056); 18dp | `STOCKS[i].token`, `Stock.token` | research-brief; rhj assets |
| uiMultiplier | factor turning raw balance into shares (splits, dividend steps) | `erc20Abi.uiMultiplier` | fact-check FU1 |
| Jar | ownerless ledger of a user's stock | `Jar.balanceOf` | AMEND-4 |
| Sweep | slice (bps of ETH notional) of a trade converted to stock for the user | `sweepBps`, `Swept` | OD2 |
| Fee | 50 bps (30 for >= 10K active $WIF stake) of ETH notional to FeePool | `FEE_BPS`, `feeBps()` | OD2, Phase 1.5 |
| Epoch | 1 hour since `start` (UTC-hour aligned) | `EPOCH`, `currentEpoch()` | OD3 |
| Activation | stake earns from the epoch after it was placed | `pendingEpoch`, `_rollPool` | OD3 |
| Sub-pool | stakers who chose the same reward stock | `pools[stockId]` | AMEND-4 |
| Chainlink round | (phase << 64) \| n; phase 1 for all used feeds | `PHASE_BASE` | spike-indexing §4 |
| Early-round scaling | early rounds of every stock history feed report 1e16-scaled values; an answer > 1e15 is divided by 1e8 | `SCALED_THRESHOLD`, `historicalAnswer8`, `normalize8` | spike-indexing §4, build-rounds.ts |
| Heartbeat | Chainlink directory heartbeat 86400s; we allow 25h | `MAX_AGE` | cl-feeds-rh.json |
| Band | stock fills must be >= Chainlink price − 3% | `BAND_BPS` | PRD 4.15 |
| UR 2.1 layout | V2/V3 inputs end with `uint256[] maxHopSlippage` | `URCodec.v2/v3` | URProbe.t.sol |
| CONTRACT_BALANCE | `1 << 255`: swap whatever the UR holds | `URCodec.CONTRACT_BALANCE` | UR ActionConstants |
| ADDRESS_THIS | `address(2)`: deliver to the UR itself | `URCodec.ADDRESS_THIS` | UR ActionConstants |
| Hook (v4) | contract attached to a pool; WIF/ETH hook takes ~1% of output (afterSwapReturnDelta) | `WIF_HOOK` | fact-check TF2 |
| Dynamic fee | v4 fee value 8388608 = hook-set fee; keep verbatim in PoolKey | `PoolEntry.key.fee` | spike-coverage |
| Hindsight buy | meme received from a pool/router/PoolManager in a tx the wallet sent and paid for | `scanBuys`, `payments` | spike-indexing §1 |
| Unpriced | buy paid in an unsupported token, shown but excluded from totals | `Card.unpriced` | INVARIANT 7 |

**Rules the code must enforce:** $WIF never an input (`WifNotSellable`); no $WIF price in value logic; every stock fill Chainlink-bounded; no owner/pause/upgrade; Jar credits backed by received tokens; JIT stakes earn nothing in their epoch; no fabricated numbers (INVARIANTS.md 1–7).

## Section N+2: Submission Directory Plan
[VERIFIED] — directory plan (not code)
```
submission/
├── screenshots/            # demo phase (hackathon-demo): landing, card, convert-success, trade-sweep, stake-claim, proof (desktop + mobile)
├── video/links.md          # demo phase: YouTube/X video URL (< 3 min)
├── proof.md                # scripts/proof.ts (post-deploy, regenerated before submit)
├── links.md                # package phase: live URL, repo, contracts, explorer
└── sponsor-tracks.md       # package phase: track → evidence (Stock Tokens, hooks/defi, consumer, onboarding; GetBlock, Quicknode, Chainlink, Uniswap)
```
Owners: proof.md = hackathon-build (script) @ build; screenshots/video = hackathon-demo @ demo; links.md + sponsor-tracks.md = hackathon-package @ package.

## Section N+3: Multi-Track Architecture
| Track | Component serving it | Distinct integration point | Proof for judges |
|---|---|---|---|
| Stock Tokens (primary) | Jar, StockOracle, TerraRouter sweep/convert, WifStaking rewards | real Stock Tokens bought via Uniswap with Chainlink bounds, held per user | Jar credits + Blockscout token transfers |
| hooks and defi | TerraRouter over UR 2.1 incl. hooked v4 pools; FeePool burn through the hooked WIF/ETH pool | typed Route → UR command encoding (v2/v3/v4, dynamic fees, hooks) | fork tests per route kind; distribute tx |
| consumer and payments | Hindsight card, meme terminal, Jar, mobile-first UI | per-wallet card with receipts; one-tap convert | live URL, OG cards |
| onboarding | Hindsight lookup (no wallet), FriendJar (gated) with embedded wallet + sponsored gas | read-only card; shared Jar | /card/[addr], FriendJar txs (if gate passes) |
Sponsor integrations: GetBlock (primary RPC + WSS live stream: `web/lib/rpc.ts`, `app/api/stream`), Quicknode (Stock Token API cross-check: `app/api/qn-jar`), Chainlink (StockOracle, HindsightLens, round tables), Uniswap (UR 2.1, V4Quoter, QuoterV2).

## Section N+4: Safety Architecture
[VERIFIED] — layer summary, each layer mapped to tests below (not code)
```
Layer 1: Input Validation    — TerraRouter._validate (route kind, path endpoints == token/WETH, 2-hop mid == USDG, v4 currency0 == ETH),
                               WifNotSellable, SweepTooHigh, LengthMismatch; API: isAddress, bad_stock, taxed_token, wif_not_sellable
Layer 2: Rate Limiting       — FeePool: once per epoch + MIN_DISTRIBUTE_ETH; MAX_WIF_BUY_ETH per call; RPC client: <=36/batch, <=3 in flight, backoff
Layer 3: Circuit Breakers    — StockOracle staleness (MAX_AGE 25h) → revert (router) or skip-and-carry (FeePool); try/catch around every FeePool swap
                               → carry; 10K-log RPC errors split, never swallowed
Layer 4: Graceful Degradation— RPC failover FRA → NYC → public; SSE stream falls back to polling; Quicknode badge hides on error; deployed:false → read-only UI;
                               /proof "Run distribute" if keeper is down
```
| Layer | Implemented in | Prevents | Tested by |
|---|---|---|---|
| 1 | TerraRouter._validate | command injection, wrong-token routes, $WIF sale | test_routeTokenMismatchReverts, test_badKindReverts, test_badMidHopReverts, test_sellWifReverts, test_convertWifReverts |
| 2 | FeePool | repeated distribute, burn-buy manipulation | test_distributeOncePerEpoch, test_noStakersCarriesStockHalf |
| 3 | StockOracle, FeePool try/catch | stale fills, stuck epochs | test_staleOracleReverts, test_userMinStockEnforced |
| 4 | rpc.ts, stream route, UI | outage-induced blank pages | livetest (wire/livetest skills) |

## Section N+6: Configuration Reference
| Variable | Used by | Example / source | Secret |
|---|---|---|---|
| GETBLOCK_RPC_FRA / GETBLOCK_RPC_NYC | web/lib/rpc.ts, scripts | worldisflat.fun/build/me GetBlock box | yes (shared; never commit/post) |
| GETBLOCK_WSS_FRA | app/api/stream | same | yes |
| QUICKNODE_RPC | app/api/qn-jar | `QUICKNODE_BASE` + `/` + token from Quicknode dashboard (endpoint spring-multi-lake) | yes |
| ENVIO_API_TOKEN | web/lib/hypersync.ts (first log provider for Hindsight; public RPC fallback) | envio.dev account → HyperSync API token (Dami) | yes |
| NEXT_PUBLIC_DEMO_ADDR | landing "See a real card" | demo wallet address | no |
| NEXT_PUBLIC_WC_PROJECT_ID | wagmi WalletConnect | cloud.reown.com | no |
| NEXT_PUBLIC_REPO_URL | footer SECURITY.md link | GitHub repo URL | no |
| NEXT_PUBLIC_FRIEND_JARS | /friends gate | "1" only if OD7 gate passes | no |
| RPC_URL | forge tests/deploy, scripts, keeper | = GETBLOCK_RPC_FRA | yes |
| FORK_BLOCK | forge tests | 111155803 | no |
| DEPLOYER_KEY | Deploy.s.sol | `cast wallet new` | yes |
| KEEPER_KEY | keeper.ts (GitHub secret) | DISTINCT `cast wallet new` key, capped at ~0.001 ETH; never the deployer key (it can only call permissionless distribute) | yes |
| DEMO_KEY | seed-demo.ts | `cast wallet new` | yes |

### Credentials Needed
| Variable | Used By | Where to Obtain | Required Before |
|---|---|---|---|
| GETBLOCK_RPC_FRA, GETBLOCK_RPC_NYC, GETBLOCK_WSS_FRA | web, scripts, tests | worldisflat.fun/build/me (DONE, in ~/wif-hack/.env.local) | build |
| QUICKNODE_RPC | /api/qn-jar | Quicknode dashboard → endpoint → Auth token (Dami to paste) | deploy (optional) |
| DEPLOYER_KEY (+ ~0.002 ETH) | Deploy.s.sol, keeper | `cast wallet new`; Dami funds | deploy |
| DEMO_KEY (+ ~0.004 ETH, WIF bought via router) | seed-demo.ts | `cast wallet new`; Dami funds | demo |
| NEXT_PUBLIC_WC_PROJECT_ID | wagmi | cloud.reown.com (Dami) | deploy (optional; injected wallets work without) |
| Vercel login, GitHub repo + Actions secrets | hosting, keeper | Dami accounts (`vercel login`, `gh`) | deploy |

## Section N+7: Testing Strategy
| Layer | Files | Command | Count (evidence) |
|---|---|---|---|
| Contract fork tests | contracts/test/TerraFirma.t.sol, HindsightLens.t.sol, URProbe.t.sol | `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test -vv` | 38 PASS (evidence/forge-test.txt) |
| Gas snapshot | — | `forge test --gas-report` | build phase |
| Hindsight payment detection | scripts/test-hindsight.ts | `pnpm tsx scripts/test-hindsight.ts` | 2 real WETH/USDG-paid txs |
| Claims re-derivation | scripts/verify-claims.ts + CLAIMS.md | `pnpm tsx scripts/verify-claims.ts` | all rows |
| Web typecheck/build | web | `cd web && npx tsc --noEmit && pnpm build` | clean |
| Live checks | /api/health, livetest skill | `curl $URL/api/health` | post-deploy |
Critical tests: `test_buyV3_sweepAndFee` (exact fee, Jar backing), `test_distribute_burnAndStream` (supply drop == burned, staker reward → Jar), `test_jitStakeEarnsNothing`, `test_sellWifReverts`, `test_staleOracleReverts`, `test_recomputeOneEthBuy` (real rounds).

## Section N+8: Component Build Order
1. **Shared infra** (URCodec, IExternal, TerraConfig) — everything encodes through these. ✅ written + tested.
2. **StockOracle → Jar → WifStaking → FeePool → TerraRouter** (sequential: each constructor needs the previous or a predicted address; deployAll() predicts Jar/WifStaking/FeePool/TerraRouter). ✅ 29 fork tests.
3. **HindsightLens** (needs StockOracle). ✅ 3 real-round tests.
4. Parallel group A (off-chain data): `build-registry.ts`, `build-rounds.ts`, `build-restricted.ts` — independent of each other.
5. Parallel group B: `web/lib/*` + API routes (needs data files' shapes, not contents) ‖ UI pages (needs API contracts) ‖ keeper/seed/proof scripts (need ABIs + deployments shape).
6. **Mainnet deploy** (needs DEPLOYER_KEY funding) → `sync-deployments.mjs` → Vercel deploy → keeper secrets → `seed-demo.ts` → keeper first distribute → `proof.ts`.
7. FriendJar UI only if the OD7 gate passes (contract is deployed with the core; UI flag off by default).
P0 deliverability check: P0 features F-001..F-011 need only steps 1–6; P1 adds UI pages already in group B; nothing P0 depends on FriendJar, Quicknode, or the stream route.

## Section N+9: Deployment Sequence
| # | Service | Command | Health check | Depends on | Env |
|---|---|---|---|---|---|
| 1 | Contracts (7) | `cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --slow` | `cast code $(jq -r .TerraRouter deployments/4663.json) --rpc-url $RPC_URL` non-empty | funded deployer | RPC_URL, DEPLOYER_KEY |
| 2 | Verify | `forge verify-contract <addr> <Name> --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/ --watch` (per contract; constructor args via `cast abi-encode`) | Blockscout page shows source | 1 | — |
| 3 | Web data | `node scripts/sync-deployments.mjs && pnpm tsx scripts/build-rounds.ts --update` | `jq .deployed web/data/deployments.json` = true | 1 | RPC_URL |
| 4 | Web (Vercel) | `cd web && vercel deploy --prod` | `curl -s $URL/api/health \| jq .rpc` = "ok" and `.deployed` = true | 3 | GETBLOCK_*, QUICKNODE_RPC, NEXT_PUBLIC_* |
| 5 | Keeper | push repo; `gh secret set RPC_URL`, `gh secret set KEEPER_KEY`; `gh workflow run keeper.yml` | workflow log prints "skip" or a tx hash | 1 | RPC_URL, KEEPER_KEY |
| 6 | Seed | `pnpm tsx scripts/seed-demo.ts` | `/api/hindsight?addr=$DEMO` has >= 3 memes; Jar balance > 0 | 1, 3 | RPC_URL, DEMO_KEY |
| 7 | First distribute | wait for next epoch; `gh workflow run keeper.yml` (or /proof button) | `Distributed` event with wifBurned > 0 | 5, 6 | — |
| 8 | Proof | `pnpm tsx scripts/proof.ts` | submission/proof.md lists 7 contracts + first-of-kind txs | 7 | RPC_URL |

## Section N+10: Addresses & External References
| Item | Address / URL | Network | Source |
|---|---|---|---|
| Universal Router 2.1 | 0x8876789976dEcBfCbBbe364623C63652db8C0904 | 4663 | Uniswap docs + URProbe.t.sol |
| v4 PoolManager / V4Quoter / StateView | 0x8366a39cc670b4001a1121b8f6a443a643e40951 / 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 / 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b | 4663 | Uniswap docs |
| v3 Factory / QuoterV2 | 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA / 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 | 4663 | Uniswap docs |
| v2 Factory / Router02 | 0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f / 0x89e5db8b5aa49aa85ac63f691524311aeb649eba | 4663 | spike-coverage |
| WETH / USDG / $WIF | 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 / 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 / 0x5173b8eA6923c2d40267890D45C46a3480954773 | 4663 | RH docs / intel |
| WIF/ETH v4 pool key | (0x0, WIF, fee 0, tickSpacing 200, hooks 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044) id 0x71ef4106…8c79 | 4663 | fact-check TF2 |
| Stock tokens | NVDA 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC · TSLA 0x322F0929c4625eD5bAd873c95208D54E1c003b2d · GOOGL 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3 · SNDK 0xB90A19fF0Af67f7779afF50A882A9CfF42446400 · SPY 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C · QQQ 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68 | 4663 | rhj-assets-now.json |
| Stock fill pools | NVDA/WETH 0.05% 0x62AB521f71431f78ac374CdbadC6cda3c8916b6C · TSLA/WETH 0.3% 0xA953CA88ff430e9487c60cA34d757414f4efdA07 · WETH/USDG 0.05% → GOOGL/USDG 0.05% 0x34D0dC122CF9A8Eb296fC5e0D3A233625D7d19b7 · WETH/USDG 0.05% → SNDK/USDG 1% 0xA1e1C9519cD5ae47e9A935645E1A7b935b944559 · SPY/WETH 0.05% 0xDDCBBa3666f578E3F09516f21Ff85BFee859AB5e · QQQ/WETH 0.3% 0xA40D00a55d43bA2d188039DCF88bD68f4F133E78 | 4663 | forge Phase 2 probe |
| Chainlink live feeds | ETH/USD 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9 · USDG/USD 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2 · NVDA 24/7 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F · TSLA 24/7 0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37 · GOOGL 24/7 0x53e040D2C8c9278cBc4b702328aC652068a0E063 · SNDK 24/7 0x7FA2c251b345b8492C039a59a42b38603a05Ed9b · SPY 0x319724394D3A0e3669269846abE664Cd621f9f6A · QQQ 0x80901d846d5D7B030F26B480776EE3b29374C2ae | 4663 | cl-feeds-rh.json |
| Chainlink history feeds | NVDA/USD 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 · TSLA/USD 0x4A1166a659A55625345e9515b32adECea5547C38 · GOOGL/USD 0xF6f373a037c30F0e5010d854385cA89185AE638b · SNDK/USD 0xfb133Fa4B7b385802B693a293606682Df47109A3 (SPY, QQQ = live feeds) | 4663 | cl-feeds-rh.json |
| Multicall3 | 0xca11bde05977b3631167028862be2a173976ca11 | 4663 | viem chain def |
| Terra Firma contracts | DEPLOY_AND_RECORD_ADDRESS_HERE → contracts/deployments/4663.json | 4663 | Deploy.s.sol |
| Explorer | https://robinhoodchain.blockscout.com | — | — |

## Section N+11: Integration Map
| From | To | Protocol | Credential (env) | Health Check | Priority |
|---|---|---|---|---|---|
| web/lib/rpc.ts | GetBlock FRA | HTTPS JSON-RPC | GETBLOCK_RPC_FRA | `curl -s -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' $GETBLOCK_RPC_FRA` → `0x1237` | P0 |
| web/lib/rpc.ts | GetBlock NYC | HTTPS JSON-RPC | GETBLOCK_RPC_NYC | same → `0x1237` | P1 |
| web/lib/rpc.ts | public RPC | HTTPS JSON-RPC | none (User-Agent) | same against https://rpc.mainnet.chain.robinhood.com | P1 |
| web/lib/hypersync.ts | Envio HyperSync | HTTPS JSON query, bearer | ENVIO_API_TOKEN | `curl -s https://robinhood.hypersync.xyz/height` → {"height":…} | P1 |
| app/api/stream | GetBlock WSS | WebSocket eth_subscribe | GETBLOCK_WSS_FRA | `curl -N $URL/api/stream` emits `hello` within 2s | P2 |
| app/api/qn-jar | Quicknode | HTTPS JSON-RPC qn_getStockTokenBalances | QUICKNODE_RPC | `curl -s $URL/api/qn-jar?addr=<Jar>` | P2 |
| TerraRouter | Universal Router 2.1 | EVM call | — | fork `test_buyV3_sweepAndFee` | P0 |
| StockOracle / HindsightLens / rounds.ts | Chainlink feeds | EVM call | — | `curl $URL/api/health` → `.feeds.NVDA == true` | P0 |
| FeePool | WIF/ETH v4 pool (third-party hook) | EVM call via UR | — | `Distributed.wifBurned > 0` | P0 |
| quote.ts | V4Quoter / QuoterV2 / Router02 | eth_call | — | `curl "$URL/api/quote?token=0x39dBED3a2bd333467115dE45665cC57F813C4571&side=buy&amount=1000000000000000"` | P0 |
| app/api/geo | Vercel edge geo header | HTTP header | — | `curl $URL/api/geo` | P1 |
| scripts/build-registry.ts | DexScreener API | HTTPS | none | `curl -s https://api.dexscreener.com/token-pairs/v1/robinhood/0x39dBED3a2bd333467115dE45665cC57F813C4571 \| jq length` | P2 |
| keeper workflow | FeePool | EVM tx | KEEPER_KEY | Actions log | P1 |

## Security spec (for build's SECURITY.md)
build scaffolds `SECURITY.md` with exactly this shape and fills the rows from PRD §4.12:
[VERIFIED] — SECURITY.md template shape (filled by build)
```
# Security
## Scope            (contracts in contracts/src, web API routes, keeper)
## Threat matrix
| Threat | Enforcement | File |
|---|---|---|
| (one row per PRD §4.12 T1–T12, Enforcement names the check + error, File names the path:function) |
## Third-party dependencies (disclosure)
- WIF/ETH Uniswap v4 pool hook 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044: third-party, owned by 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd, unverified source, afterSwapReturnDelta (takes ~1% of output). Terra Firma only buys $WIF through it with a capped size and try/catch carry.
- Chainlink feeds (trusted for freshness and correctness), Uniswap Universal Router 2.1, Stock Token contracts.
## Not defended against
- wrong-but-fresh Chainlink answers; hook owner changing fees within its rules; determined geofence bypass (frontend + attestation only);
  MEV on meme legs beyond the user's min-out; Stock Token issuer actions (pauses, multiplier changes).
## Reporting
```
