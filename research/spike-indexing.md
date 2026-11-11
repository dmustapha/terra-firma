# Spike: Indexing + Oracle rounds for the "Hindsight card" (Robinhood Chain mainnet 4663)

Read-only. Date 2026-11-10. Head at test time ~111.15M. RPC `https://rpc.mainnet.chain.robinhood.com` (curl needs a User-Agent header). Scratch scripts live in the Claude session scratchpad, not the repo. Tags: VERIFIED = observed with real output, NOT FOUND = looked, absent.

## TL;DR

- The wallet-wide "all tokens" log scan is NOT feasible on this RPC. Without an `address` filter the max block span is **30,000** (not 10M), so a full-history scan is 3,705 calls (~12+ min). VERIFIED.
- Works: **per-token scans** `address=<single token>` + `topics=[Transfer, null, pad(wallet)]`, 10M-block spans, and these can be sent as **JSON-RPC batches of up to 36 getLogs in one POST (~1.3s)**. This needs a meme-token registry (address list). VERIFIED.
- tx.value is enough to detect ETH-paid buys (no receipt needed). WETH/USDG-paid buys need either a receipt or a per-quote-token "Transfer FROM wallet" scan. Receipts batch fine.
- Chainlink: all three feeds are 8dp now, phase 1, tiny round counts (NVDA/USD 1,715; NVDA 24/7 134; ETH/USD 3,258). NVDA/USD rounds 1..24 are 18dp-scaled AND 100x low vs the 8dp series: **do not use answer/1e10**, use **answer/1e16 for answers > 1e15**. VERIFIED by continuity.
- HyperSync supports 4663 (token required for /query). GetBlock URL format documented; getLogs range limit NOT FOUND in docs. QuickNode Stock Token API documented (5 methods).

## 1. LOG SCAN

### 1a. The documented "10M with one topic value" claim does not hold for no-address queries (VERIFIED)

```
eth_getLogs {fromBlock:0x0, toBlock:0x98967f, topics:[T0,null,pad(wallet)]}
-> {"code":-32602,"message":"query spans 10000000 blocks (0 to 9999999), but only 30000 are allowed for this request; narrow the block range, or add an address filter"}
```
Probe matrix (head-relative windows, wallet 0xbeb4ea7d431cc411a91d5a05db599c35326947d5):

| filter | allowed span |
|---|---|
| no address; topics `[T0]` or `[null,null,w]` or `[T0,null,w]` or `[T0,null,[w]]` or `[T0,w]` | **30,000** (100k fails) |
| `address` = single string, topics any | **10,000,000** (`query spans 111155067 blocks ... only 10000000 are allowed`) |
| `address` = array of 2 | **100,000** |

Additional cap: `logs matched by query exceeds limit of 10000` (hit with topic0-only at 30k span, and on WIF dense 10M chunks; this error comes back as a JSON-RPC error, so code that does `r || []` silently undercounts. I fell into this once: an "all WIF transfers 6,799" total was wrong).

### 1b. Full-history, no-address scan (what the task asked for)

- Chunk = 30,000 blocks (the max) -> **3,705 calls** for 0..111.15M.
- Per call (48 samples spread across history, wallet 0xbeb4..., serial): p50 488 ms, p95 1,023 ms, min 291, max 1,149; 0 errors.
- Concurrency: serial 25.4 s / 48 calls (1.9 calls/s). Conc 4: 14.2 s, 429s appeared ("429 exhausted" after 4 retries). Conc 8: 9.9 s, 429s appeared. Effective ceiling ~4-5 calls/s.
- Extrapolation: 3,705 / ~4.5 per s = **~14 min** (serial: ~30 min). A real 8-concurrency full run (retry on 429) did not finish in >25 min and was killed. **NOT feasible within 10s.** The 12 x 10M no-address chunks the brief expected = 12 errors (13 calls, ~0.9 s, 0 logs).
- Chain time: block 1 = 2026-04-30T16:52:11Z, block 100M = 2026-10-28, ~10 blocks/s now (100 ms blocks), so even a "last 7 days" window = ~6M blocks = 200 calls.

### 1c. Per-token scan (works) (VERIFIED)

`eth_getLogs {address:<token>, fromBlock, toBlock(<=10M), topics:[0xddf252ad...,null,<wallet padded>]}`

- WIF 0..head for wallet 0x1424b226...: 12 calls, 2.8 s at concurrency 2, 1,023 logs, 0 errors. (Wallet is a bot; the six EOAs I found with 800-1,000 WIF receipts are all bots, so a 20-200 transfer wallet was measured via a 1M-block window, see 1e.)
- Wallet 0xbeb4...: WIF 12 calls, 783 logs (3 other meme tokens AI/MEME/BONER: 0 logs; per-token scan of 6 tokens x 12 chunks = 72 calls took 26.5 s at conc 3 with a few 429s -> do not send 72 separate calls).
- **JSON-RPC batching of getLogs works**: 6 in one POST 964 ms; 12 in 937 ms; 24 in 1,252 ms; 36 in 1,305 ms (HTTP 200, 0 errors). 72 in one POST -> HTTP 429 `Too Many Requests`. Batch of 100 `eth_getBlockByNumber` OK (642 ms); 200 -> 429. So cap batches ~36 getLogs / ~100 light calls.

### 1d. Payment detection (VERIFIED on 150 real WIF transfers, last 400k blocks)

- Real buys look like: `tx.to` = Universal Router `0x8876789976decbfcbbbe364623c63652db8c0904`, selector `0x3593564c` (execute), `tx.from == wallet == Transfer.to`, `tx.value` > 0 (e.g. valueWei 14238794602303907 for 21,338 WIF). Transfer.from = WIF pool/hook `0x8366a39c...0951`.
- Of 150 sampled transfers: 92 had `tx.from == recipient && value>0` (ETH-paid buys, **no receipt needed**); 57 had tx.from != recipient (recipient is a pool/router/contract = sells, or a relayer/smart wallet/bundler); 1 was a value==0 self-sent claim (selector 0x4e71d92d).
- Classification of 60 classified txs: sender!=recipient|contract (sells to pool 0xe5e7.../0x8366...): 32+; sender==recipient|EOA|value>0: 18; sender==recipient|**7702-delegated EOA** (code starts `0xef0100`, e.g. 0x3ac7b9e8...): 2 (tx.value still valid, but `eth_getCode` != 0x so do NOT filter "EOA" by empty code); plain ERC20 transfer-in `0xa9059cbb` (airdrop/gift, **no payment**): 1.
- **WETH/USDG-paid buy: NOT FOUND** in the 150-sample (every zero-value tx was a sell/claim/transfer). I could not observe one, so the receipt path is untested against a real WETH/USDG buy. Rule is still necessary in principle: tx.value==0 && tx.from==wallet => need the receipt (or WETH/USDG out-scan). Token addresses (VERIFIED by `symbol()`): WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` (18dp), USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6dp; project notes say many fake "USDG" clones exist, only this address is real).
- Caveat from `spike-coverage.md`: many meme tokens (vanity ...1E18 addresses: AI, MEME, BONER...) have their real liquidity vs **stock tokens** (NVDA, AMC...). A buyer there pays with a stock token, not ETH/WETH/USDG. "Paid" detection must also treat Transfer-FROM-wallet of stock tokens (or any token) in the same tx. Receipts catch this; tx.value does not.
- Receipts: `eth_getTransactionReceipt` ~265 ms single, same as `eth_getTransactionByHash` ~260 ms. Batched: 8 receipts in one POST 275 ms. Batch of 25-50 tx/receipts intermittently returned 429 under concurrent load; 10 per batch with 1.5 s back-off was reliable.

### 1e. Latency for a 20-200 transfer wallet (VERIFIED, one run each)

Wallet 0xbeb4..., WIF only, 1M-block window (108 buys, all ETH-paid):
- step1 getLogs (1 call): 4.8 s (included a 429 retry; typical 0.3-0.7 s)
- step2 108 txs, 11 batch POSTs (6 were 429 retries, batch=10, 1.5 s backoff): 7.0 s
- step3 receipts: 0 needed (all value>0)
- total 11.8 s, 13 RPC POSTs. With cleaner pacing the floor is ~0.3 s + 5 x ~0.5 s = ~3 s. **The RPC rate limit (429 around 4-5 req/s sustained or large batches) dominates, not the server latency.**

### 1f. Recommended algorithm (RPC-only)

1. Maintain a **meme token registry** (address + firstBlock), built offline (from the spike-coverage list / pool discovery). There is no usable wallet-wide discovery on this RPC (no `alchemy_getAssetTransfers`, `eth_getTransactionsByAddress`, `trace_filter`, `qn_*` wallet methods: all `-32601 does not exist`, VERIFIED; the Blockscout API `robinhoodchain.blockscout.com` (named in GetBlock docs) sits behind a Cloudflare challenge for curl).
2. Per request build jobs = for each token, spans of `[max(firstBlock,0) .. head]` in 10M chunks (most tokens 1-2 chunks if launched recently), each a single-address getLogs with `topics=[Transfer,null,pad(wallet)]`. Send in **batches of <=36 getLogs per POST**, max 2-3 POSTs in flight.
3. Keep Transfers whose `from` is a contract (pool/router/hook) to drop plain transfers/airdrops; collect unique txHashes (cap, e.g., 200).
4. `eth_getTransactionByHash` in batches of ~10-25. If `tx.from==wallet && value>0` -> paid ETH = value. If `value==0` (or tx.from!=wallet for smart-wallet/7702/relayer cases) -> `eth_getTransactionReceipt` (batched) and sum Transfers from wallet of WETH/USDG (and any stock token); alternatively one `address=WETH` and one `address=USDG` getLogs with `topics=[Transfer, pad(wallet)]` over the wallet's active range.
5. Price: ETH/USD round at block timestamp (see 4), NVDA round at the same timestamp, and NVDA latest. Fetch block timestamps by batched `eth_getBlockByNumber` (100 per POST OK) or use the logs' blockNumber -> timestamp.
6. Budget: ~2-4 getLogs POSTs + ~5-10 tx POSTs + oracle 1-3 eth_calls = ~10-15 POSTs. Feasible in <10 s only with batching and serial pacing; **for production use Envio HyperSync (one POST, §2) or a keyed provider and keep the public RPC as fallback**.

## 2. ENVIO HYPERSYNC (VERIFIED)

- Docs table `https://docs.envio.dev/docs/HyperSync/hypersync-supported-networks`: row **Robinhood | 4663 | https://robinhood.hypersync.xyz or https://4663.hypersync.xyz | HyperRPC https://robinhood.rpc.hypersync.xyz or https://4663.rpc.hypersync.xyz**.
- `curl https://4663.hypersync.xyz/height` -> `{"height":111157261}` (no token). Same for `robinhood.hypersync.xyz/height` -> `{"height":111157318}`.
- `POST https://4663.hypersync.xyz/query` and `https://robinhood.hypersync.xyz/query` with the minimal body (topics `[[0xddf2...],[],[<wallet padded>]]`, field_selection log) -> **HTTP 401** `{"error":"Your token is malformed. API Tokens can be created at https://app.envio.dev/api-tokens..."}`. So: chain is supported, **bearer API token required** (`Authorization: Bearer <token>`; docs: "Requests without one are rejected with HTTP 401" except GET /height). Free-tier token exists but is rate limited. `robinhood-mainnet.hypersync.xyz` does not resolve.
- Repo `enviodev/robinhood-new-stock-tokens` (new_tokens.py): `POST https://robinhood.hypersync.xyz/query`, header `Authorization: Bearer $ENVIO_API_TOKEN`, body `{"from_block":0,"logs":[{"address":[...tokens],"topics":[[TRANSFER]]}], field_selection..}`, paginate with `res["next_block"]`, retry with 6 s x attempt sleep on rate limit. It is a Python script; no config.yaml (404). README says it "can take several minutes on a free API token".
- Not tested (no token): query latency, free-tier rate limit values. HyperSync has no 30k/10M window limit, so a wallet-wide `topic2=wallet` query over 0..head is a single paginated request.

## 3. GETBLOCK (docs only)

- Docs `https://docs.getblock.io/api-reference/robinhood`: base URL **`https://shared.us-east-1.getblock.io/<ACCESS-TOKEN>/`** (New York); POST JSON-RPC 2.0; WSS `wss://shared.eu-central-1.getblock.io/<ACCESS-TOKEN>/` (as printed). Chain id 4663 (0x1237) mainnet. Methods: 40 across web3/net/eth/arb namespaces incl. eth_getLogs, eth_call, eth_getTransactionReceipt.
- Plans (from getblock.io/nodes/robinhood/): Free $0 shared, 50K CU/day; Shared from $49/mo (250-800 RPS); Limitless from $150/mo (25-300 RPS; archive 15-100 RPS); page also lists Webhooks, Data Streams, Market SQL products. Page states an archive node is required for historical state at past blocks.
- eth_getLogs block-range limit: **NOT FOUND** in either page. Must be tested once a key exists.

## 4. CHAINLINK ROUNDS (VERIFIED, all values from live eth_call)

| feed | proxy | description() | decimals | phaseId | aggregator | rounds |
|---|---|---|---|---|---|---|
| NVDA/USD | 0x379EC4f7...9F15 | "RHNVDA / USD" | 8 | 1 | 0xC9d16E4f2569b9E3ea0468fD85844953713DC2a2 (DualAggregator 1.0.0, aggregator decimals 8) | n=1..1715 (roundId 2^64+n), oldest valid n=1 @ 2026-06-22T00:00:43Z, latest 1715 @ 2026-11-10T20:12:08Z |
| NVDA 24/7 | 0x321A36e4...3D1F | "Robinhood NVDA (24/7)" | 8 | 1 | 0x1C28973bD1bAb2E34EFa5BFf5e94a95c6CAb72cC | n=1..134, oldest 2026-11-06T20:21:23Z, latest 2026-11-10T20:15:11Z |
| ETH/USD | 0x78F3556b...d3A9 | "ETH / USD" | 8 | 1 | 0x6091E64eb7138EEF066a80FD3A0d7427B91f2721 | n=1..3258, oldest 2026-06-05T15:02:52Z, latest 2026-11-10T20:15:34Z |

- roundId = (phaseId << 64) | n, `latestRoundData` roundId >> 64 = 1 for all three (so only phase 1; n=0 returns zeros, not a revert). Rounds are dense and tiny: **I fetched every round of all three feeds** (56 Multicall3 calls, 0 failures, updatedAt strictly monotonic). Round gaps: NVDA/USD median 1,771 s, p95 24,188 s, max 281,670 s (market-hours feed: use the last round with updatedAt <= t); ETH/USD median 1,771 s, p95 15,910 s, max 86,427 s.
- Consequence: **the NVDA 24/7 feed only starts 2026-11-06**, so it cannot price historical buys; use NVDA/USD (RHNVDA, from 2026-06-22) for history and either feed for "today". ETH/USD starts 2026-06-05, so buys before that date cannot be priced.

### 18dp boundary (VERIFIED)

NVDA/USD (0x379E...):
- **roundId 18446744073709551617..18446744073709551640 (n=1..24): answers are 18dp-style (>1e15)**, 2026-06-22T00:00:43Z .. 2026-06-23T13:48:29Z. 24 rounds.
- **roundId 18446744073709551641 .. 18446744073709553331 (n=25..1715): 8dp**, from 2026-06-23T13:52:29Z.
- Boundary: n=24 answer 2030652000000000000 (t=1782222509) -> n=25 answer 20344000000 (t=1782222749), 240 s apart.
- Raw samples: n=1 2082200000000000000 @2026-06-22T00:00:43Z; n=2 2092699999900000000; n=12 2072099999900000000 @06-23T01:48:41; n=23 2018458499900000000 @13:35:54; n=24 2030652000000000000; n=25 20344000000; n=26 20227580000; n=60 19579050000 @06-25; n=200 19206050000 @07-07; n=500 19391500000 @07-28; n=800 21736940000 @08-21; n=1100 22557472086 @09-25; n=1400 20530902389 @10-30; n=1700 16927611428 @11-10; n=1715 16815274417.
- NVDA 24/7: 0 rounds > 1e15 (all 134 are 8dp). ETH/USD: 0 rounds > 1e15 (all 3,258 are 8dp).

### Normalization rule (the naive /1e10 is WRONG)

Treating the early rounds as plain 18dp -> 8dp via `answer/1e10` gives n=24 = 203,065,200 (=$2.03) next to n=25 = $203.44 four minutes later, a 100x jump. The consistent reading is a 16-decimal scale:

```
usd = answer > 1e15 ? answer / 1e16 : answer / 1e8     // 18dp-scaled rounds are 100x smaller than the 8dp series
```
Equivalent: `answer8 = answer > 1e15 ? answer/1e8 : answer`.
Verified on 3 known rounds (each also re-read independently with `cast call proxy "getRoundData(uint80)" <id>`):
- n=1 (id ...51617): 2082200000000000000 / 1e16 = **$208.22**
- n=24 (id ...51640): 2030652000000000000 / 1e16 = **$203.0652**, then n=25 (id ...51641): 20344000000 / 1e8 = **$203.44** (continuous, +0.18% in 4 min)
- n=1715 (id ...53331): 16815274417 / 1e8 = **$168.15274417**
After this rule the whole NVDA/USD series ranges $166.32-$243.33 and the largest round-to-round move is 2.7% (no jumps). Under /1e10 the scan showed exactly one false 100x jump at n=24->25. WHY the early rounds are 100x low is **unexplained** (not a documented multiplier; NVDA token `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` `uiMultiplier()` = 1000775159164630595 = 1.000775, not 100). Hard-code the boundary (n<=24 / roundId <= 18446744073709551640) alongside the magnitude test as a guard.

### Multiplier-adjusted?

Feed descriptions carry no multiplier text ("RHNVDA / USD", "Robinhood NVDA (24/7)"). QuickNode docs state "Chainlink prices already incorporate the multiplier" (price is per raw token). NVDA token uiMultiplier is 1.000775 today (dividend reinvestment), so a feed price per raw token vs per share differs by < 0.1%; for a counterfactual ratio p_now/p_t of the SAME feed this is the right quantity for "hold the token", and the 0.08% drift is below the noise. NOT FOUND: a multiplier history for the NVDA token (not enumerated).

### Timestamp -> round cost (VERIFIED)

- Binary search with `eth_call getRoundData` (target 2026-09-01T12:00Z): NVDA/USD **13 eth_calls, 3.2 s** (+1 latestRoundData) -> n=942 @09:06:25Z answer 21764475000; ETH/USD **14 calls, 3.5 s** -> n=1927 @10:32:19Z 245993041809 (serial, ~250 ms each).
- Multicall3 `aggregate3` with 30 `getRoundData` in one eth_call: **works, 30/30 ok, 347 ms**; 100 per call: 100/100 ok, 571 ms (0xca11bde05977b3631167028862be2a173976ca11 is deployed on 4663).
- 2-step multicall search (30 evenly spaced rounds, then the ~step-sized bucket): **3 eth_calls total incl. latestRoundData, 0.98-2.2 s**, same answer as binary search (MATCHES both feeds).
- Best: since total history is only 1,715/3,258 rounds (~30-60 KB JSON), **ship a static round table** (n, answer, updatedAt) refreshed by cron via multicall (18 + 33 calls once, ~20 s) and do the lookup locally; at request time only call `latestRoundData` for "today".

## 5. QUICKNODE Stock Token API (docs only; add-on, Robinhood mainnet only, JSON-RPC)

Source: https://www.quicknode.com/docs/robinhood/stock-token-api/overview (updated Oct 26, 2026). Methods (all `qn_*`, positional params, optional trailing options object, unknown option keys -> -32602):
- `qn_getStockTokenBalances(address, {includeUsd=true, includeZero=false, symbols[], blockTag})` -> `holdings[]`: token, symbol, balanceRaw, uiMultiplier (1e18 scale + Decimal), **balanceUi = floor(raw*multiplier/1e18)**, balanceUiDecimal (show to users), pending {uiMultiplier,effectiveAt}, priceUsd (8dp, already includes multiplier), priceUpdatedAt, priceStale, valuation fields; `totalValueUsdComplete:false` when some tokens have no feed. Historical reads supported (blockTag). **The one method for the holdings view.**
- `qn_getStockTokens({symbols[], addresses[], includeInactive, blockTag})` -> address, symbol, name, decimals=18, status, uiMultiplier, pending, oraclePaused, priceFeed (Chainlink proxy), totalSupplyRaw/Ui, firstBlock, tradingCapabilities. Historical reads supported. Use for the token list + feed addresses.
- `qn_getCorporateActions(...)` cursor-paginated splits/dividends multiplier history (current only, no historical reads). Likely params: filters + `cursor`; exact param names not captured. Useful to explain multiplier changes.
- `qn_getOracleHealth(...)` feed freshness/pause/market-session (historical reads yes).
- `qn_getTransactionFinality(txHash)` soft/posted/safe/finalized (no historical reads).
- Requires a QuickNode Robinhood mainnet endpoint with the add-on enabled; no key available here, so none of these were called. Rate limits per request; batch with eth_ methods allowed.

## Open items / not verified

- WETH/USDG-paid meme buy on a real wallet: NOT FOUND in sample.
- Meme-token registry does not exist in the repo as a machine-readable list; per-token scan depends on it.
- HyperSync latency/free limits and GetBlock getLogs range: untested/NOT FOUND (no keys).
- Reason for the 100x-low early NVDA/USD answers: unexplained.
