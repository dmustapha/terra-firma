# Terra Firma spike: Robinhood Chain mainnet (4663) coverage + quotes

Run date 2026-11-10 (chain head block ~111,144,9xx). Read-only: `cast call`, `eth_getLogs`, curl. RPC `https://rpc.mainnet.chain.robinhood.com`. Tag legend: VERIFIED = real command output seen this run; NOT FOUND = could not obtain.

## 0. Infra facts

| Item | Value | Tag |
|---|---|---|
| Chain id | `cast chain-id` -> 4663 | VERIFIED |
| Uniswap v2 factory (RH) | `0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f` (docs: developers.uniswap.org/docs/protocols/v2/deployments). `cast call $F 'allPairsLength()(uint256)'` -> 147840; `getPair(PONS,WETH)` -> `0x8018Ee3ad3c0321bE0e69536733CD28e29564dD4` | VERIFIED |
| Uniswap v2 Router02 | `0x89e5db8b5aa49aa85ac63f691524311aeb649eba`; `factory()` returns the factory above | VERIFIED |
| Universal Router | `0x8876789976decbfcbbbe364623c63652db8c0904` (codesize 24546) and "Universal Router 2.1.2" `0x204FAca1764B154221e35c0d20aBb3c525710498` (codesize 24380); both `poolManager()` = `0x8366a39C...0951`. Source: docs.uniswap.org/contracts/v4/deployments, Robinhood Chain section | VERIFIED |
| v4 PositionManager / Permit2 / ReservesLens | `0x58daec3116aae6d93017baaea7749052e8a04fa7` / `0x000000000022D473030F116dDEE9F6B43aC78BA3` / `0x0000001b173C3bbF3984D417d8614E3eed34865B` (docs page only, not called) | VERIFIED (docs) |
| RPC limits | `eth_getLogs` with a single topic1 value: max **10,000,000 blocks** per call. With an OR-array of topic values the cap drops to **100,000 blocks** ("narrow the block range, or send one value per position"). Public RPC returns 403 without a User-Agent header (Python urllib default) and **429 Too Many Requests** under ~16 parallel threads; `cast` retries internally then fails. | VERIFIED |
| Blockscout | not used (Cloudflare) | n/a |

## 1. COVERAGE

### Method
1. DexScreener `latest/dex/search?q=<many terms>` (robinhood chain only) gave 392 unique pairs, `token-profiles/latest/v1`, `token-boosts/top/v1` gave extra tokens, then `token-pairs/v1/robinhood/<addr>` per candidate (note: returns max 30 pools per token; PONS, AI, BONER, ORBIO hit that cap, so their pool lists/liquidity are lower bounds).
2. Ranked by summed liquidity across all of the token's pools. Excluded: stock tokens (NVDA, TSLA, SPY, AMC, GME, HIMS, DJT, SPCX, GLD, META, PLTR, MU, AAPL, RCAT, CRCL), stables, WETH, plus fake "USDG" clones (many scam tokens with symbol USDG and nine-figure fake liquidity; real USDG is `0x5fc5...d168` only), plus protocol/DeFi tokens ORBIO (orbio.so) and XBOW (Crossbow finance), plus a zero-volume duplicate "musebook" `0xcd68c7F6...1102f`. NOT a true "meme" classification, just my judgement.
3. v4 PoolKeys: `eth_getLogs` on PoolManager `0x8366...0951`, topic0 `0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438` (= `cast keccak "Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)"`), topic1 = pool id, 10M-block windows walked back from head. **219/219 v4 pool ids resolved** (file with all keys: see `spike-pool-keys.json` next to this file). Hook flags = `uint160(hook) & 0x3fff`.
4. v3 fee via `cast call <pool> 'fee()(uint24)'`; decimals via `decimals()`.
5. Caveat: DexScreener discovery is search based, not an exhaustive pool index. Memes with only tiny liquidity may be missing. Ranking is by DexScreener liquidity (not re-verified on-chain), but every pool id/fee/hook below was read from chain.

Columns: "Best ETH/WETH pool" = largest **Uniswap** pool with native ETH or WETH as other side. "Best USDG pool" = largest Uniswap pool vs USDG. "Stock-pair liq" = summed Uniswap liquidity in pools against stock tokens (NVDA, SPY, ...). "Hooked v4" = hooked / total Uniswap v4 pools seen for that token.

| # | Sym | Token address | Dec | Total liq (all DEXs) | 24h vol | Best ETH/WETH pool | Best USDG pool | Stock-pair liq | Hooked v4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | PONS | `0x39dBED3a2bd333467115dE45665cC57F813C4571` | 18 | $5,008,784 | $6,917,315 | v3 `0x10CC6BD38112cAc182db90B6a71d8Bb5939526bA` fee 1% $1,591,513 | v4 `0x486435a1f76cd58193f854c6e6213cd05fd58d637865d02065ff558b387fa6ea` fee dyn hook `0x08e52564bad99e05a694b4809f397edca417a080` flags `0x2080` $478,665 | $3,785 | 2/12 |
| 2 | AI | `0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18` | 18 | $2,700,201 | $2,616,570 | v3 `0xc4a21f9d6485FC5893DD4A491B320a83DAF4Da1D` fee 1% $158,009 | v4 `0x592e3fb7ea947506b36481025abc15baada8e1839a50fded46ecf08b3182fa96` fee dyn hook `0x08e52564bad99e05a694b4809f397edca417a080` flags `0x2080` $148,391 | $1,847,634 | 3/15 |
| 3 | WALLET | `0x0339f5459FC690aC85F1782e15782A151b4A9E1b` | 18 | $1,476,202 | $343,472 | v3 `0x9501A20Bedb8beA0798FE5D4c411f5e270965D49` fee 1% $1,434,777 | v4 `0x89f2e48df227a2cbd85f599b2dcfb6a6d21404b9b44a8a52b9abf01a1c9b3331` fee 2.389% no hook $29,069 | $11,187 | 3/10 |
| 4 | MEME | `0x385F4f8ae47651ce5F58F5265395a669f8281e18` | 18 | $1,081,650 | $106,312 | v3 `0xE2c12a7379706A291CadAaEc1d22458be2f7239D` fee 0.3% $22,658 | v4 `0x46525dc119850396470f132c4a989d7192cb692139db891b5a4cdcd684c11b17` fee 0.2969% no hook $159,678 | $814,244 | 2/20 |
| 5 | BONER | `0x98096d17e191B3dA1d5f99a6D7b3584351b11E18` | 18 | $784,233 | $747,615 | v3 `0xBd5cd6515ca6285941FbC177381dC8ED4844e6b8` fee 1% $91,282 | v4 `0xcf0bd6587434f9f6b6e7745230f137a4a0e3910e42b60448e151e09d9361394e` fee dyn hook `0x08e52564bad99e05a694b4809f397edca417a080` flags `0x2080` $29,276 | $625,255 | 6/16 |
| 6 | SCHIFFY | `0x42aFA2124ca5a2B83898E46B2dA9a190995b1E18` | 18 | $434,173 | $55,141 | v3 `0x417e0A3A9d03ddEe6749f21Aa02498338A652786` fee 1% $19,655 | v4 `0xf66ccb1c5e6b579f94311131724a8daf0d96b0ebdbe53ab9fa27b98a8abaeb8b` fee 4.5% no hook $38,921 | $375,163 | 1/7 |
| 7 | musebook | `0x91A2DAe9699f0B82540B5886b0d8759C22820bA3` | 18 | $377,959 | $95,261 | v3 `0xe972Dfc9032D148f4B1618fb914FBbD2fC41D6dC` fee 1% $7,313 | v4 `0x65fc4c6a0344e9ea3a962b686d5b858a6c9c74a351b9514ffe612a9ca9a94079` fee 3% no hook $12,688 | $355,796 | 9/16 |
| 8 | microduck | `0xD5f1afEA47b1A9eab414D2ee740cF1d6d039E725` | 18 | $336,339 | $204,492 | v3 `0xb87C3c63b53d19984f3b4A927e26B667e32087E8` fee 1% $5,231 | v4 `0x2c2a754cf5416edf5a815d489927b3b815f4c5a7fc78d4765003fcb696549b75` fee 3.85% no hook $75,698 | $135,374 | 1/8 |
| 9 | BOW | `0x451b42A15100C340CA12F7c66DE06fac5EA2D751` | 18 | $306,064 | $76,714 | v3 `0xDaF8038E8Eab4A56bD1C0485D414241622384FEF` fee 1% $50,939 | v4 `0xd80658c99853f6543c6e3e0a3456a5bedf47ff5a3e9c85b95fe561d4f7798eae` fee 2.8% no hook $73,622 | $131,376 | 1/5 |
| 10 | MOO | `0xD9dB30BB0D2b8d2eae3826A1372117E058791e18` | 18 | $238,161 | $55,929 | v3 `0x9036A9406DAC1c252C364D037f489E5F0A752F54` fee 1% $11,939 | v4 `0x6b187fad6ca2dcb913f2451c5d5e24d3d77b9d09ce272c2c99f64dac672bc485` fee dyn hook `0x08e52564bad99e05a694b4809f397edca417a080` flags `0x2080` $8,729 | $208,281 | 3/13 |
| 11 | INU | `0x63Ee32Ac3077d1fbd8a77eBBA2a6ed4b8e9c1e18` | 18 | $222,042 | $33,849 | v3 `0xa95D3882FB3fF32b6D8CC411f88cf7a2413f1a1c` fee 1% $8,990 | v4 `0x924b2abc3220422607415eff5492700df38e6ce0c54e5e051357a8c240b4b7a0` fee 6% no hook $4,761 | $207,415 | 2/7 |
| 12 | MONITOR | `0x1a911bb954dAA9CB38513423075bE74450351e18` | 18 | $187,645 | $11,467 | v3 `0x7C2FAB87f7368Bf6602D4476B47C6D2746EC000B` fee 1% $401 | v4 `0x8aa76172b7ecb36d9fe6535734a2aca7d60905c5e85ff9100f38628dc7d70aae` fee 1% no hook $59 | $187,185 | 1/2 |
| 13 | PENNY | `0x4124277673E3ecaaF4AaDc5C6169cf1D7812d647` | 18 | $179,209 | $6,255 | none | none | $179,209 | 4/4 |
| 14 | WORM | `0x3bA500F1AbabbCF0F0247D06D1c56Fd7E6C4c09D` | 18 | $157,705 | $150,262 | v4 `0x32324930c0610cf1a3320b1a9c8b3f5ba1ddb2116cbef14010d5e97db52e4260` fee 1.9% no hook $902 | v4 `0x5ea36826ed6dc26945496eb19aa9e6f2d5d6b0b31c9924a98c71aee1217f55af` fee 2% no hook $31,369 | $103,535 | 2/11 |
| 15 | SPACEHOOD | `0xFe7E19CbCe2f896C6C528BC355bAF5a768291E18` | 18 | $156,116 | $21,217 | v3 `0x85d9067A2877474163fBf92583771001c2412571` fee 1% $2,249 | v4 `0x8c2619ffd578a8b78db3fcd6e3d7370296be705e4334c07fd56014e46f6ece89` fee 4.92% no hook $1,039 | $152,768 | 1/3 |
| 16 | EARN | `0xA3b6AEe90017b72c0812dC1e013De70eB2917ba3` | 18 | $139,216 | $29,131 | v4 `0xd1e2ef82e5cb7ba552036390f96d67ff0add936bd5d8fa91a914a3135343a6fc` fee 9.88% no hook $33 | v4 `0xbb90be5000017cb62c8e07ade58cc11f0d2a2af41d193f46727f666694e72e1d` fee 2.1% no hook $6,657 | $128,949 | 3/10 |
| 17 | OPTIMUS | `0x0fF9072a1EAD154d92C2d2Fef16AFba6028Ce2B2` | 18 | $135,102 | $15,423 | v4 `0x3bfa15b0e20efb6a1bd59795fd19cbd4dbff407ade06e7b40ff1a37d46249527` fee 0.9% no hook $21,519 | v4 `0xcfdc71cc2c5c622d4748ac8b17f65bd65beac025eca966a93272a49e52419565` fee 4.87% no hook $211 | $110,809 | 1/3 |
| 18 | WIF | `0x5173b8eA6923c2d40267890D45C46a3480954773` | 18 | $130,846 | $105,870 | v4 `0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79` fee 0% hook `0xe5e702641ea86f4ae6cc3cdaed2b886f976be044` flags `0x2044` $95,321 | none | $0 | 1/1 |
| 19 | ASTEROID | `0xFd82D8DB539b6AcE0D50815845133767e24F1E18` | 18 | $118,569 | $6,042 | v3 `0xd7291Ee5956d53A0318cefCfb0E64d792B106992` fee 1% $376 | none | $118,154 | 1/1 |
| 20 | DARK | `0xDc45b71d7203c2e8baafC43A19BcA0Eb993bB54E` | 18 | $113,528 | $185,081 | none | v4 `0xae17aa38abc597b67c964e03df4d98f22a0606e93eb02a70ca994dc9c3f5f0da` fee 3% no hook $20,512 | $71,668 | 1/7 |
| 21 (extra) | ROBINHOOD | `0x008Df4b3E857D06c4603Aeb11F267ccD32ce2005` | 18 | $89,380 | $61,278 | v4 `0x7f8271c1a7a6a434f33b0babc15bf2980a0dcb4196848b4f7e789a7fd73a5350` fee 0% hook `0xe5e702641ea86f4ae6cc3cdaed2b886f976be044` flags `0x2044` $89,380 | none | $0 | 1/1 |
| 22 (extra) | OAK | `0x6511c233790Ec10f7d673c64DC82C3F941D57828` | 18 | $86,485 | $156,742 | v4 `0xdb324dde34ef01debe23f8f8ab4bb6053154b5dea8646dec9d8ea65e414fad59` fee 0% hook `0xe5e702641ea86f4ae6cc3cdaed2b886f976be044` flags `0x2044` $60,768 | v4 `0x81ce49bb1bc7d2fb9f2d508de813ce30a58eb99cfaf3f12278571f2d37bc5e99` fee 10% no hook $7,942 | $480 | 1/11 |

All rows VERIFIED for address, decimals (`cast call <tok> 'decimals()(uint8)'` -> 18 for all 22), pool ids, fees, hooks (chain); liquidity and volume are DexScreener numbers (VERIFIED as API output, not chain-verified). Native ETH in v4 = currency0 `0x0000000000000000000000000000000000000000`.

### Share reachable to ETH
Top 20 (rows 1-20), Uniswap pools only:

| Test | Count | Share |
|---|---|---|
| Any direct pool vs WETH or native ETH | 18/20 (not: PENNY, DARK) | 90% |
| Direct ETH/WETH pool with >= $5k liquidity | 13/20 | 65% |
| Direct ETH/WETH pool with >= $10k liquidity | 10/20 | 50% |
| Reachable with 2 hops meme -> USDG (v4) -> WETH (v3 WETH/USDG pools exist at 0.05/0.3/1%) | 19/20 (PENNY only has stock-token pairs: DJT, RCAT, BULL, QUBT) | 95% |
| Has a Uniswap USDG pool | 17/20 (none: PENNY, WIF, ASTEROID) | 85% |

Key structural finding: the big memes split into two worlds.
- "Pons world" (PONS, WIF, OAK, BOW, ROBINHOOD, DARK, OPTIMUS, microduck, WORM): launched with a **hooked native-ETH v4 pool** (hook `0xe5e7...e044`) or stock-paired pool; liquidity lives in v4.
- "Vanity-1E18 world" (AI, BONER, MEME, SCHIFFY, musebook, MOO, INU, MONITOR, SPACEHOOD, ASTEROID, EARN): token addresses end in `...1E18` (CREATE2 vanity), tokens are EIP-1167 clones, and **the bulk (50-99%) of liquidity is a hooked v4 pool against a stock token** (hook `0x4e34...a544`, dynamic fee, tickSpacing 8 or 200). The WETH side is a thin v3 1% pool ($0.4k-$158k). Example: MEME has $812k vs AMC and only $22k vs WETH; AI has $1.48M vs NVDA but $158k vs WETH.
- Implication: for these, the best "meme -> NVDA" route is a **direct meme/NVDA hooked v4 pool** (AI/NVDA quoted below), not meme -> ETH -> NVDA.

### Hooks (v4 pools of the top-20 memes, 170 unique Uniswap v4 pools)
Hook table (VERIFIED from Initialize logs; permission names from the low 14 bits):

| Hook address | Pools | Liq in pools | Memes | Low-14 flags | Identity |
|---|---|---|---|---|---|
| `0x0000...0000` (no hook) | 122 | $2.09M | 17 memes | 0x0 | plain v4 pool (typical: meme/USDG with fee 0.3-10% custom, or meme/ETH) |
| `0x4e3468951d49f2eea976ed0d6e75ffcb44a9a544` | 20 | **$4.58M** | AI, ASTEROID, BONER, EARN, INU, MEME, MONITOR, MOO, SCHIFFY, SPACEHOOD, musebook | 0x2544 = BEFORE_INITIALIZE, AFTER_ADD_LIQ, AFTER_REMOVE_LIQ, AFTER_SWAP, AFTER_SWAP_RETURNS_DELTA | NOT FOUND (launchpad name). codesize 25,533; `poolManager()` = PoolManager; no `owner()`/`name()`. Pools are all meme vs stock token with dynamic fee flag (0x800000). |
| `0x08e52564bad99e05a694b4809f397edca417a080` | 7 | $683k | AI, BONER, EARN, MEME, MOO, PONS, WALLET (+XBOW, ORBIO) | 0x2080 = BEFORE_INITIALIZE, BEFORE_SWAP | NOT FOUND. Used on meme/USDG pools incl. PONS/USDG $479k. dynamic fee. |
| `0xe5e702641ea86f4ae6cc3cdaed2b886f976be044` | 6 (11 incl. extras) | $632k | BOW, DARK, OPTIMUS, WIF, WORM, microduck (+OAK, ROBINHOOD, AGESIC, ORBIO) | 0x2044 = BEFORE_INITIALIZE, AFTER_SWAP, AFTER_SWAP_RETURNS_DELTA | **Pons launchpad hook** (inference, strong): WIF's own pool (given in brief) uses it; ponsfamily.com lists World is Flat, Longbow, Oak, which all use it. `owner()` = `0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd`, codesize 15,167. Fee 0 on pool, tickSpacing 200. |
| `0x16d1560630ce74af4478d9b8ad46548a092a2000` | 4 | $179k | PENNY (4 pools vs DJT/RCAT/BULL/QUBT) | 0x2000 = BEFORE_INITIALIZE | NOT FOUND, codesize 3,012 |
| `0x594e8e6281edf2d363a0293a50004cf868e7a080` | 3 | $105k | AI, INU, PONS | 0x2080 | NOT FOUND (same flags as 0x08e5; PONS/ETH $68k hooked pool `0xb5900141...e674` uses it) |
| 7 singletons (`0xc52fc526...`, `0x49a446e0...`, `0xf667c59c...` (flags 0x3fff = ALL 14 flags set, WALLET/WALLY pool $7.7k), `0x49d8e239...`, `0x557c0ec5...`, `0x376aa4c2...`, `0x5afd41ec...`) | 8 | < $10k each | BONER, EARN, WALLET, WORM, MOO | various | custom/one-off hooks, mostly dust pools |

Summary: **12 distinct non-zero hooks** among top-20 memes' Uniswap v4 pools; 48 of 170 pools (28%) are hooked but they hold **75% of v4 liquidity**. Over all 219 pools resolved (incl. extras/stock-token-adjacent tokens): 18 distinct hook addresses (VERIFIED, `init.json`). Only 6 hooks hold more than 1 pool; 3 families matter (0x4e34, 0x08e5/0x594e, 0xe5e7).

Launchpad mapping: Pons (ponsfamily.com, "Pons Labs, LLC", `PLP`) = hook `0xe5e7...e044` (inferred). `0x4e34...` and `0x08e5...` launchpad/operator NOT FOUND (no Blockscout access; no on-chain name). Pons' own token PONS is 100% paired through non-Pons hooks (v3 1%/0.3%, v4 hook 0x08e5/0x594e), PONS/ETH v4 pools: `0x12d36a5c...5859` fee 1.0128% no hook ($228k), `0xb5900141...e674` dyn fee hook 0x594e ($68k).

## 2. QUOTES

Prices: Chainlink NVDA 24/7 `0x321A...3D1F` `latestRoundData()` answerInRound... answer 16647894772 (8dp) = **$166.4789**, updatedAt 1794340979, `description()` = "Robinhood NVDA (24/7)" (132 s old at query time, VERIFIED). Chainlink ETH/USD `0x78F3...d3A9`: answer 203683180081 = **$2036.83**, updatedAt 1794335570 (~92 min old at query time; feed is stale-ish vs heartbeat, DexScreener implies ~$2041, so treat oracle as approximate). NVDA is 18 decimals, USDG 6.

### 2a. Sell ~$5 of meme -> ETH/WETH (VERIFIED, on-chain quoter)
Amount-in set from DexScreener priceUsd so notional is about $5. ETH leg valued at the Chainlink ETH/USD above. "Dev vs notional" = quoted ETH value / $5-notional - 1, which is roughly the pool fee + price impact.

| Meme | Pool | Amount in | Notional | Quoted out | ETH value | Dev vs notional | Quoter gas est |
|---|---|---|---|---|---|---|---|
| PONS | v3 1% `0x10CC6B...26bA` (QuoterV2) | 34.7 PONS | $5.00 | 0.002427556 WETH | $4.945 | -1.11% | 86,971 |
| PONS | v3 0.3% `0xEd50bD...22ff` | 34.7 | $5.04 | 0.002461955 WETH | $5.015 | -0.47% | 95,606 |
| PONS | v4 native-ETH, no hook, fee 1.0128% `0x12d36a5c...5859` (V4Quoter) | 34.7 | $4.99 | 0.002424211 ETH | $4.938 | -1.11% | 42,733 |
| PONS | v4 native-ETH, hook 0x594e (dyn fee) `0xb5900141...e674` | 34.7 | $5.05 | 0.002461006 ETH | $5.013 | -0.65% | 52,385 |
| WALLET | v3 1% `0x9501A2...9D49` | 407 WALLET | $5.00 | 0.002432803 WETH | $4.955 | -0.86% | 87,112 |
| AI | v3 1% `0xc4a21f...Da1D` | 183 AI | $5.00 | 0.002419529 WETH | $4.928 | -1.39% | 89,935 |
| WIF | v4 native-ETH, hook 0xe5e7, fee 0 `0x71ef4106...8c79` | 3,855 WIF | $5.00 | 0.002424127 ETH | $4.938 | -1.25% | 69,008 |
| AI -> NVDA (direct) | v4 AI/NVDA hook 0x4e34 dyn fee ts 8 `0xcbdfea90...ce27` | 183 AI | $5.00 | 0.029558144 NVDA | $4.921 @ oracle NVDA | -1.54% | 279,613 |

Top 3 by liquidity on a WETH/ETH pair: PONS ($1.59M v3), WALLET ($1.43M v3), then AI by total liquidity ($158k WETH pool; its mega-pool is vs NVDA). Quoter never reverted in any test.
All quotes returned in one `eth_call`; v4 quoter gas estimates are much lower than v3 for these pools.

### 2b. ETH/USDG -> NVDA vs Chainlink (VERIFIED)
NVDA/WETH v3 pools (factory `getPool(NVDA,WETH,fee)`): fee 100 `0x057A53e4...00c6`, fee **500 `0x62AB521f71431f78ac374CdbadC6cda3c8916b6C` ($1.08M liq, DexScreener)**, fee 3000 `0xC0Be1cb0f674D9737C72B2A63fC542361185b807` ($477k), fee 10000 `0x8b6a6416...E123e`. (The "~$1.36M" is 500+3000 combined ~ $1.56M; the fee-500 pool is the deep one.) WETH/USDG v3 pools exist at all four fees (100 `0x52e65B17...71Ca`, 500 `0x69BfaF19...8d9a`, 3000 `0xa9188730...0334`, 10000 `0x5f009E07...680D`). v2 NVDA pools: not queried.

Oracle-implied output: 0.002 ETH x $2036.83 / $166.479 = 0.024470 NVDA; $5 / $166.479 = 0.030034 NVDA.

| Route | In | Out (NVDA) | Dev vs Chainlink | Implied NVDA price | Gas est |
|---|---|---|---|---|---|
| WETH -> NVDA, v3 fee 500 | 0.002 WETH | 0.024287387 | **-0.74%** | $167.73 | 111,090 |
| WETH -> NVDA, v3 fee 3000 | 0.002 WETH | 0.024290653 | **-0.73%** | $167.71 | 110,373 |
| WETH ->(500) USDG ->(500) NVDA multihop `quoteExactInput(bytes,uint256)` | 0.002 WETH | 0.024264255 | -0.84% | | 208,796 |
| WETH ->(3000) USDG ->(500) NVDA | 0.002 WETH | 0.024172357 | -1.21% | | 210,047 |
| WETH ->(10000) USDG ->(500) NVDA | 0.002 WETH | 0.023830209 | -2.61% | | 209,999 |
| USDG -> NVDA, v3 fee 500 `0xd4EB...14a3` | 5 USDG | 0.029725832 | **-1.03%** | $168.20 | 109,129 |

Reading: pool NVDA price is ~0.7-1.0% above the Chainlink 24/7 feed (the feed was 132 s old; fee tier 0.05% is included in the deviation). Direct WETH->NVDA (fee 500) beats the 2-hop via USDG, which costs about +100k gas and 0.1-1.9 points more. Best path found: **WETH->NVDA direct at 0.05%**. For meme -> NVDA the best found route is **meme->NVDA directly for the 1E18-family** (AI shown) or meme->WETH (best v3/v4 pool above) then WETH->NVDA.

Full pipeline estimate for $5 of PONS (v3 0.3% 0.002461955 WETH then WETH->NVDA fee 500): ~$4.9-5.0 of NVDA, i.e. about -1.3% after two hops (not separately quoted; arithmetic from the above, tagged as ESTIMATE, not VERIFIED).

## 3. GOTCHAS

1. **Liquidity is in stock-token pairs, not WETH, for 11 of the top 20 memes** (AI, MEME, BONER, SCHIFFY, musebook, MOO, INU, MONITOR, SPACEHOOD, ASTEROID, EARN). WETH pools are thin ($376 to $158k). A naive "meme -> WETH" router will give terrible prices on those; route via the hooked stock pair or sell into NVDA directly. VERIFIED (table above).
2. **Hooked pools with return-delta flags**: 0x4e34 (AFTER_SWAP_RETURNS_DELTA bit set, plus AFTER_SWAP/AFTER_ADD_LIQ/AFTER_REMOVE_LIQ/BEFORE_INITIALIZE) and 0xe5e7/Pons (BEFORE_INITIALIZE, AFTER_SWAP, AFTER_SWAP_RETURNS_DELTA) can **take a cut of the swap output in `afterSwap`**, so on-chain output is lower than the pool's pure AMM price (the WIF fee-0 pool still quoted -1.25% vs notional, consistent with a ~1% hook fee). 0x08e5/0x594e use BEFORE_SWAP + BEFORE_INITIALIZE (dynamic-fee override). V4Quoter handled all four hook families in this run (AI/NVDA via 0x4e34, PONS via 0x594e, WIF via 0xe5e7; 0x08e5 pools not quoted) with no revert, and its numbers include the hook's delta. VERIFIED. BEFORE_INITIALIZE on these hooks likely restricts pool creation to the launchpad (inference, not verified) (no permissionless duplicate pools for those hooks).
3. **Dynamic-fee pools**: LP fee field = `8388608` (0x800000) for 38/219 pools (all of the 0x4e34 pool family and the 0x08e5/0x594e family). PoolKey must carry `fee = 8388608`, not the effective fee. Wrong fee value => different pool id => quoter returns "pool not initialized". VERIFIED from Initialize logs.
4. **Native ETH vs WETH**: v4 pools of Pons memes use currency0 = `0x0` (native ETH), v3 pools use WETH `0x0Bd7...AD73`. Universal Router needs `value` (or WRAP_ETH/UNWRAP_WETH) and the correct currency ordering. For PoolKey sorting: native ETH (0x0) is always currency0; for meme/NVDA the lower address is currency0 (AI 0x2E8c < NVDA 0xd060 => AI is currency0, zeroForOne = true).
5. **Tick spacing varies wildly** (53 pools use 200, 22 use 10, 14 use 60, 12 use 90, plus 60+ odd values like 488, 984, 12239); fee tiers too (e.g. 10128, 2969, 98800). No standard fee/spacing grid; always read PoolKey from Initialize logs, never guess. VERIFIED.
6. **EIP-1167 minimal-proxy tokens**: AI, BONER, MEME, musebook, MOO (and the whole `...1E18` vanity family) have 44-byte runtime code `0x3d3d3d3d363d3d37363d73 3be8b97fd0e713b5abe0649fa830223b6b4bc599 ...` (implementation `0x3be8b97f...c599`, 13,927 bytes; has `owner()`, `burn(uint256)`, `permit(...)`, no `taxRate/buyTax/sellTax/blacklist/mint` selectors in its bytecode). Slightly higher transfer gas (delegatecall); has an `owner()` (AI owner `0xeb7C0347...0862`) so owner-callable functions beyond ERC20 cannot be ruled out. Fee-on-transfer: **no tax selectors found in bytecode and every quote matched spot price within fee**, but a true on-chain fee-on-transfer check needs a state-override transfer simulation; NOT DONE (status: not detected, not proven).
7. **PONS has `maxTxAmount()` = 22,000,000e18 (2.2% of supply)** and WALLET `maxTxAmount()` = 1e27 (=100% supply, not binding). Not a problem for ~$5 trades (34.7 PONS). Larger sells could revert at >22M PONS. WIF and OAK bytecode have `burn(uint256)`. PENNY/WORM/others not scanned for hidden controls.
8. **Spam/scam tokens**: DexScreener shows ~20 fake "USDG" tokens (symbol USDG, different addresses, fake liquidity $300k-$1B) and many fake PENNY clones (`0x4124...d647` is only one of 5+ PENNY tokens). Always whitelist by address. Real USDG = `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals); every other token incl. NVDA and all memes is 18 decimals (VERIFIED for NVDA and 22 memes).
9. **Duplicate/zero-volume token twin**: `musebook` has two tokens (`0x91A2...0bA3` real, $378k, vs `0xcd68...102f`, $409k all in one v4 native-ETH pool with $0.56 24h volume: probable honeypot or fake liquidity).
10. **RPC**: 403 without User-Agent for non-curl clients, 429 at moderate parallelism, getLogs windows 10M blocks (single topic value) or 100k (OR topic arrays). The app should keep its own pool-key cache; pool keys do not change.
11. **Oracle staleness**: ETH/USD feed was ~92 minutes old at query time (updatedAt 1794335570 vs now ~1794341111), NVDA 24/7 was 132 s old. Check `updatedAt` before using oracle deviation as a safety gate; stock pool prices run +0.7-1.0% above the Chainlink 24/7 value (premium, or feed vs market-hours lag).
12. DexScreener `token-pairs` returns max 30 pools per token (PONS, AI, BONER, ORBIO capped), so liquidity sums for those are lower bounds.
13. **Cannot be derived from DexScreener**: which launchpad owns hooks 0x4e34, 0x08e5, 0x594e, 0x16d1 (NOT FOUND). Pons identification for 0xe5e7 is inferred (pool membership + site listing), not from a registry.

## Appendix A: raw command log (VERIFIED outputs)

Setup: `export PATH=$PATH:~/.foundry/bin; R=https://rpc.mainnet.chain.robinhood.com`

Factory getPool lookups (F=0x1f7d...2EfA, N=NVDA, W=WETH, U=USDG): order printed = NVDA/WETH fees 100,500,3000,10000, then WETH/USDG fees 100,500,3000,10000.
```
$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 100 --rpc-url $R
0x057A53e4b1b9a2fEBAE171A798E97c27300400c6

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 500 --rpc-url $R
0x62AB521f71431f78ac374CdbadC6cda3c8916b6C

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 3000 --rpc-url $R
0xC0Be1cb0f674D9737C72B2A63fC542361185b807

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 10000 --rpc-url $R
0x8b6a6416A5d1040EfCfa6234dA6AA1265DfE123e

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 100 --rpc-url $R
0x52e65B17fB6E5BA00Ed806f37Afcd2DaA50271Ca

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 500 --rpc-url $R
0x69BfaF19C9f377BB306a89aEd9F6B07e2c1a8d9a

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 3000 --rpc-url $R
0xa9188730Fe85Be88ad499D7d52B099e800fB0334

$ cast call 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA 'getPool(address,address,uint24)(address)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 10000 --rpc-url $R
0x5f009E071F07e92B6C624e83F52F17bBDa34680D
```

Quotes (V4Quoter 0x8dc178efb8111bb0973dd9d722ebeff267c98f94, QuoterV2 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7). Output tuple per call: (amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate) for v3; (amountOut, gasEstimate) for v4.
```
$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x39dBED3a2bd333467115dE45665cC57F813C4571,0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,34700000000000004096,10000,0)' --rpc-url $R
2427556144716903 [2.427e15]
9424922516921479701070701486002 [9.424e30]
1
86971 [8.697e4]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x39dBED3a2bd333467115dE45665cC57F813C4571,0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,34700000000000004096,3000,0)' --rpc-url $R
2461954984370560 [2.461e15]
9391937189059185112675956463189 [9.391e30]
1
95606 [9.56e4]

$ cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 'quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)' '((0x0000000000000000000000000000000000000000,0x39dBED3a2bd333467115dE45665cC57F813C4571,10128,202,0x0000000000000000000000000000000000000000),false,34700000000000004096,0x)' --rpc-url $R
2424211311640791 [2.424e15]
42733 [4.273e4]

$ cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 'quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)' '((0x0000000000000000000000000000000000000000,0x39dBED3a2bd333467115dE45665cC57F813C4571,8388608,60,0x594e8e6281edf2d363a0293a50004cf868e7a080),false,34700000000000004096,0x)' --rpc-url $R
2461005515266384 [2.461e15]
52385 [5.238e4]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x0339f5459FC690aC85F1782e15782A151b4A9E1b,0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,407000000000000000000,10000,0)' --rpc-url $R
2432803302130024 [2.432e15]
194677475972840074263553322 [1.946e26]
1
87112 [8.711e4]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18,0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,183000000000000000000,10000,0)' --rpc-url $R
2419529151106320 [2.419e15]
21680123330890444629114556775959 [2.168e31]
1
89935 [8.993e4]

$ cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 'quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)' '((0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18,0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC,8388608,8,0x4e3468951d49f2eea976ed0d6e75ffcb44a9a544),true,183000000000000000000,0x)' --rpc-url $R
29558143789381624 [2.955e16]
279613 [2.796e5]

$ cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 'quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)' '((0x0000000000000000000000000000000000000000,0x5173b8eA6923c2d40267890D45C46a3480954773,0,200,0xe5e702641ea86f4ae6cc3cdaed2b886f976be044),false,3855000000000000000000,0x)' --rpc-url $R
2424126705728966 [2.424e15]
69008 [6.9e4]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC,2000000000000000,500,0)' --rpc-url $R
24287386730827138 [2.428e16]
276161697968536540868328845155 [2.761e29]
1
111090 [1.11e5]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73,0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC,2000000000000000,3000,0)' --rpc-url $R
24290652883443833 [2.429e16]
276526285309063174049140053897 [2.765e29]
1
110373 [1.103e5]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)' '(0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168,0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC,5000000,500,0)' --rpc-url $R
29725831881955609 [2.972e16]
6110404365668650310452093231771096 [6.11e33]
1
109129 [1.091e5]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInput(bytes,uint256)(uint256,uint160[],uint32[],uint256)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD730001f45fc5360D0400a0Fd4f2af552ADD042D716F1d1680001f4d0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 2000000000000000 --rpc-url $R
24264254726471090 [2.426e16]
[3580383304141519844865794 [3.58e24], 6109633641196283782933932224189994 [6.109e33]]
[1, 1]
208796 [2.087e5]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInput(bytes,uint256)(uint256,uint160[],uint32[],uint256)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73000bb85fc5360D0400a0Fd4f2af552ADD042D716F1d1680001f4d0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 2000000000000000 --rpc-url $R
24172356737716225 [2.417e16]
[3578797759571937326805245 [3.578e24], 6108394900051438834437293312101746 [6.108e33]]
[1, 0]
210047 [2.1e5]

$ cast call 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 'quoteExactInput(bytes,uint256)(uint256,uint160[],uint32[],uint256)' 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD730027105fc5360D0400a0Fd4f2af552ADD042D716F1d1680001f4d0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC 2000000000000000 --rpc-url $R
23830208600514310 [2.383e16]
[3566033712356053545450415 [3.566e24], 6108145277425502403262356442884770 [6.108e33]]
[0, 0]
209999 [2.099e5]
```

Oracle reads:
```
$ cast call 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F 'latestRoundData()(uint80,int256,uint256,uint256,uint80)'
18446744073709551748 | 16647894772 | 1794340979 | 1794340991 | 18446744073709551748
$ cast call 0x321A...3D1F 'description()(string)'   -> "Robinhood NVDA (24/7)"
$ cast call 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9 'latestRoundData()(uint80,int256,uint256,uint256,uint80)'
18446744073709554873 | 203683180081 | 1794335570 | 1794335582 | 18446744073709554873
$ cast call 0x78F3...d3A9 'description()(string)' -> "ETH / USD"
```

Initialize-log request (PoolManager), the limit error that was hit:
```
$ curl -s $R -d '{"method":"eth_getLogs","params":[{"fromBlock":"0x0","toBlock":"latest","address":"0x8366...0951","topics":["0xdd466e67...6438","0x71ef4106...8c79"]}]}'
{"error":{"code":-32602,"message":"query spans 111144754 blocks (0 to 111144753), but only 10000000 are allowed for this request; narrow the block range"}}
(OR-array of topic1 values) -> "only 100000 are allowed ... or send one value per position"
```
Hook flag legend (low 14 bits of hook address, Uniswap v4 Hooks.sol): 13 BEFORE_INITIALIZE, 12 AFTER_INITIALIZE, 11 BEFORE_ADD_LIQ, 10 AFTER_ADD_LIQ, 9 BEFORE_REMOVE_LIQ, 8 AFTER_REMOVE_LIQ, 7 BEFORE_SWAP, 6 AFTER_SWAP, 5 BEFORE_DONATE, 4 AFTER_DONATE, 3 BEFORE_SWAP_RETURNS_DELTA, 2 AFTER_SWAP_RETURNS_DELTA, 1 AFTER_ADD_LIQ_RETURNS_DELTA, 0 AFTER_REMOVE_LIQ_RETURNS_DELTA.
