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

