# Phase 5 Backend Critique (Next.js API routes + server libs)

Scope read in full: web/lib/{rpc,rounds,registry,quote,hindsight,hypersync,config}.ts, web/app/api/{hindsight,quote,geo,health,stream,qn-jar,card-check}/route.ts, INVARIANTS.md. Also checked: web/app/card/[addr]/{page,opengraph-image}.tsx, contracts/src/TerraRouter.sol (fee/sweep math), StockOracle.minStockOut, scripts/build-registry.ts, web/data/{memes,deployments}.json, round tables.

Counts: MUST-FIX 5, SHOULD-FIX 12, NOTE 8.

Verified clean: no GETBLOCK / QUICKNODE / ENVIO value appears in any response body or client import (lib/rpc, hypersync, quote, rounds all `import "server-only"`; the 8 client files import only `import type { Card }` from lib/hindsight, which is erased; no NEXT_PUBLIC_ secret). Fee/sweep/trade math in quote.ts:29-31 and :39-41 matches TerraRouter.sol:108-110 and :138-140 exactly. normalize8 threshold matches StockOracle (1e15). roundAtLive binary search (rounds.ts:113-120) has no off-by-one: ceil mid, invariant lo = last round with updatedAt <= ts, hi = latestN-1 valid because latest.updatedAt > ts is established first. No Number(BigInt) on 1e18 values (only usd8 values, < 2^53 up to about $90M). bigint JSON serialization handled in quote/stream; hindsight Card is all strings.

---

## MUST-FIX

### M1. hindsight.ts:64,103 (+ scripts/build-registry.ts:219) - TerraRouter is not a registered purchase source, so every buy made through Terra Firma's own router is dropped from Hindsight
`sources` = UR, UR2.1.2, PoolManager + pools (memes.json: 114 entries; TerraRouter check printed `false`; deployments.json is still all-zero). TerraRouter receives the meme from the UR (`ADDRESS_THIS`) and then `safeTransfer`s it to the user (TerraRouter.sol:216), so the Transfer(to=wallet) log has `from = TerraRouter`. The filter at hindsight.ts:69/103 (`sources.has(topicAddr(topics[1]))`) discards it. Consequences: the headline demo ("buy a meme in the terminal, see it on the card") shows nothing, and `routerMemeLeg` (fee + sweep exclusion, SURVIVOR-5) is dead code that has never executed against a real router tx.
Test: after Deploy, buy any registry meme via `TerraRouter.buy`; `curl /api/hindsight?addr=<buyer>` -> `memes: []` and no `unpriced` row. Static: `node -e` that `REGISTRY.sources` includes `TF.TerraRouter` -> false.
Fix: in scanBuys build `sources = new Set([...REGISTRY.sources, TF.TerraRouter].map(lc))` (skip when TerraRouter is zero address), and add TF.TerraRouter in build-registry.ts:219. Add a fork/recorded-receipt unit test for routerMemeLeg (value - fee - sweep == trade).

### M2. hindsight.ts:129-132,150,170-177 - per-call RPC errors inside chunked batches are treated as data (wrong numbers, silently)
`rpcChunked/rpcBatch` return `RpcError` objects in-place (rpc.ts:58) but callers cast them to the success type:
- `blockTimes` (:171): `res[i].timestamp` on an RpcError is `undefined` -> `Number(undefined)` = NaN. `roundAtLive(table, NaN)` then falls through to the live branch where every comparison with NaN is false, so it returns the LAST TABLE ROUND (a wrong price from the wrong day), with `ts: NaN` (serialised as null) in the buy. A null block (pruned/not found) instead throws TypeError. Wrong USD for a real buy with a green 200 response; also breaks invariant 8 (recompute would revert BadRound).
- receipts (:132,:150): an RpcError receipt makes `receiptByHash.get(h)?.logs ?? []` empty, so a real buy is relabelled "not a buy (nothing paid in this tx...)" or "router tx without a Traded event". A transient 429 inside a batch silently removes a purchase from the card.
- `balances` (:177): RpcError -> 0n. First call (:186) silently drops a held meme from the card; second call (:252) sets `holding: "0"`.
- txs (:131): RpcError element -> `t.from.toLowerCase()` TypeError (fails loudly, but as an opaque 503).
Test: stub `rpcBatch` to return `new RpcError(-32005,"limit")` for the `eth_getBlockByNumber` item; `buildCard` currently resolves with `ts: NaN` and last-table-round prices; expected: throws. Same for `eth_call balanceOf` -> expect throw, not 0n.
Fix: one helper `unwrap<T>(r): T` that throws on `RpcError` or `null`, used by all four sites; guard `Number.isFinite(ts)`.

### M3. hindsight.ts:256-259 - failed/absent sell quote becomes "$0 today", which then renders as a -100% loss and feeds `worst`
`q = held>0 ? await bestQuote(...) : null; usdToday8 = q ? ... : "0"`. `bestQuote` returns null when every pool quote errors (rate-limit RpcError per item, quote.ts:172) or no pool is liquid. The card then reports usdToday8 "0", totals understated, and `worst.pct = -100%` (:267) for a meme that is merely unquotable. Invariant 7 says unpriced is labelled, never estimated; this is a fabricated zero. A 429 burst during the demo produces a convincing but false "you lost everything on X".
Test: stub `bestQuote` -> null for a held meme; response contains `usdToday8:"0"` and `worst.pct = -100`; expected: meme flagged `todayUnpriced: true`, excluded from totals/worst, with a reason.
Fix: make `usdToday8: string | null` (+ `todayReason`), exclude nulls in `sum` and `worst`, and have `bestQuote` distinguish "no pool" from "all calls errored" (throw on the latter).

### M4. card-check/route.ts:11,21-23 + hindsight/route.ts:10,18-20 + card/[addr]/page.tsx + opengraph-image.tsx - trivially abusable expensive endpoints (easy DoS of the shared public RPC)
- card-check cache key includes the attacker-controlled `claimed` (any 1-40 digit string): `?addr=<whale>&usdPaid8=1`, `=2`, `=3`... each misses the cache and runs a full `buildCard` (up to ~158 getLogs + hundreds of receipt/tx calls) AND grows the `Map` without bound (no eviction, expired entries never deleted).
- hindsight cache: unbounded Map keyed by arbitrary (addr, 6 stocks); no in-flight de-duplication, so N simultaneous requests for one wallet start N builds (a page load that fires card + proof + OG concurrently does this by itself).
- `/card/[addr]` (force-dynamic) and its OG image call `buildCard` directly, bypassing every cache; each social-crawler hit is a full build (two per share: page + OG, OG `revalidate=600` only helps per URL).
- Because scanBuys (:81-88) runs on the single public RPC (~4-5 calls/s), a handful of requests starve every other user and the demo.
Test: `for i in $(seq 1 50); do curl -s "/api/card-check?addr=<held-wallet>&usdPaid8=$i" & done` -> 50 buildCard executions, public RPC 429s, other /api/hindsight calls return 503. Memory: Map size == 50.
Fix: one shared module `cardCache.ts`: key `addr:stock` only, `Map<string, {at, card} | Promise<Card>>` (store the in-flight promise), max ~200 entries with oldest-first eviction + TTL sweep; card-check compares `claimed` against the cached card after the fact; page.tsx/OG use the same getter; add a global concurrency cap (e.g. 2 buildCard at once, else 429 + `Retry-After`).

### M5. stream/route.ts:46-63 - SSE route leaks the WebSocket and throws after client disconnect; fallback path can crash the invocation
- `req.signal.addEventListener("abort", close)` closes the controller only. The WebSocket (`ws`) and the 55 s `setTimeout` are never cleaned up on abort. Every browser tab that closes/reconnects leaves a GetBlock socket open for up to 55 s (shared endpoint, connection cap), and EventSource reconnects every 55 s so this is continuous.
- After abort, `ws.onmessage` still runs `send()` -> `controller.enqueue` on a closed controller -> `TypeError: Invalid state: Controller is already closed` thrown inside a WebSocket event handler (uncaught). `JSON.parse(String(m.data))` (:54) can also throw (uncaught) on a non-JSON frame.
- `ws.onerror = () => poll()` (:58): `poll` is async, un-awaited and has no try/catch; any `rpc()` rejection (429 after backoff, :68/:72) is an unhandled promise rejection. The socket is never closed in that path, and if ws also closes, nothing falls back (no `onclose` handler), so the client sees `hello` and then silence while believing it is live.
- In the non-WS path an `rpc()` throw inside `poll` rejects `start()` and kills the stream with no error event.
Test: set GETBLOCK_WSS_FRA, `curl -N /api/stream` then Ctrl-C; confirm the upstream WS stays ESTABLISHED for ~55 s (`lsof -i`), then emit a router event and observe the uncaught TypeError in the server log. Second test: point `PUBLIC_RPC`/GETBLOCK at a 429 server with no WSS set: process logs `unhandledRejection` / stream ends abnormally.
Fix: keep `ws` and the timer in the outer scope; one `cleanup()` doing `clearTimeout`, `ws.close()`, `closed = true` bound to `abort`, `ws.onclose`, and the deadline; wrap `send` in `if (closed) return` + try/catch; wrap `onmessage` body in try/catch; wrap `poll()` in try/catch that emits `{type:"error"}` and retries on the next tick instead of ending the stream; skip logs with `removed: true`.

---

## SHOULD-FIX

### S1. rpc.ts:41 - no fetch timeout; worst case exceeds maxDuration 60
No `AbortSignal.timeout`. A hung socket blocks until Vercel kills the function (HTML 504, not the JSON `rpc_unavailable` the UI expects). Retry budget on 429s alone: 5 x (0.8+1.6+3.2+6.4+12.8)=~25 s per provider, x2 providers (public listed twice for getLogs) = ~50 s, before any real work. Non-JSON 4xx (e.g. 403 HTML) throws in `res.json()` and is retried 5 times with backoff (:52,:60). A buildCard with many held memes plus a couple of 429s will cross 60 s.
Test: point PUBLIC_RPC at `nc -l` that never answers -> request hangs to 60 s.
Fix: `signal: AbortSignal.timeout(8000)`, treat 4xx other than 429 as non-retryable, and thread a deadline (`Date.now() < start+50_000`) through rpcBatch so routes can fail fast with the JSON 503.

### S2. rpc.ts:76-89 + hindsight.ts:81-88 - no real rate limiting against the ~4-5 call/s public RPC
`rpcChunked(size 4, parallel 1)` has no inter-batch delay, so pacing is just response latency (~100-200 ms per POST = 20-40 calls/s, 5-8x over the limit when each call counts); it survives only by hitting 429 and backing off (up to 25 s). Nothing is shared across concurrent requests, so two cards in parallel double the rate. Also `balances()` sends all 21 registry memes in one POST (fine today, but it is under the ~36 batch cap only because the registry is small).
Fix: a process-wide token bucket in rpc.ts for PUBLIC_RPC calls (count each call in a batch, ~4/s), used by every path, instead of per-call sleep-on-429.

### S3. hindsight.ts:206-222 + rounds.ts:97-123 - serial per-buy live-round lookups, uncached latest price
For each tx the loop awaits `roundAtLive` twice (parallel pair) and each call starts with `latestPrice8` (an extra RPC, never memoised per feed) plus a sequential binary search. Tables were last built 2026-11-10 22:30 (ETH/USD) and 00:49-01:17 (stocks), so every recent buy, which is exactly the freshly seeded demo wallet, takes the live path, and the search range grows every hour. A wallet with 30 recent buys does 30 x (2 x (1 + ~log2 n)) strictly sequential eth_calls.
Fix: memoise `latestPrice8` per feed per buildCard; run the buy loop with bounded parallelism; rebuild tables right before submission.

### S4. quote/route.ts:15,23,37-44 - `side` is not validated
`side` is cast, never checked: `?side=xyz` falls through the buy branch into the sell branch and returns a sell quote with 200. Fix: `if (!["buy","sell","convert"].includes(side)) return 400`.
Test: `curl "/api/quote?token=<meme>&amount=1000&side=xyz"` -> 200 today, expect 400.

### S5. quote/route.ts:16-22 + quote.ts:126-146 - amount/sweep bounds missing; overflow becomes 503 + detail
Regex allows 78 digits (> 2^256 is possible), and the v4 quoter takes `uint128`; viem throws on encode -> caught as 503 `quote_failed` with `detail` (wrong status class; body echoes internals). Also unknown/`sweepBps` fine (<=1000 matches MAX_SWEEP_BPS).
Test: `amount=340282366920938463463374607431768211457` (2^128+1) -> expect 400, get 503.
Fix: reject `amount > 2n**128n - 1n` (or a sane cap such as 1e24) with 400.

### S6. quote/route.ts:46, health/route.ts:24 - raw `String(e)` returned to the client
Upstream error text (viem revert data, fetch failure causes, JSON-RPC messages) is returned in `detail` / `error`. No secret reaches it today (RpcError messages are `HTTP <status>` or the node's message, URLs are not included), but this is one config change (Next `logging.fetches.fullUrl`, a provider echoing the path) from a GetBlock token leak. Return a fixed code; log the detail server-side only.

### S7. quote/route.ts:33-35,42-44 - quote does not warn when the pool output is outside the 3% oracle band
`minStockOut` is the oracle floor; `stockOut` is the pool quote. If the pool is >3% worse than Chainlink (thin SNDK path via the 1% fee tier, or a stale-but-fresh-enough feed), the UI is handed `stockOut < minStockOut` and the resulting tx reverts on-chain. Failure is demo-visible and the API had the data to prevent it.
Test: quote with `stock=SNDK` and a large sweep; assert `BigInt(stockOut) >= BigInt(minStockOut)` else return 409 `outside_oracle_band` (or `bandOk:false`).

### S8. quote.ts:171-180 + quote/route.ts:32,38 - all-quotes-failed is reported as `no_route` (404)
`bestQuote` skips RpcError items and returns null; a 429/5xx burst therefore tells the user "no route" instead of "try again". Make it throw when every call errored and only return null for a genuinely empty/zero-liquidity registry entry; the route maps the throw to 503.

### S9. card-check/route.ts:17-18,33-35 - stock id parse and swallowed errors
`Number("1.5")` passes `sid >= 0 && sid < 6`; `STOCKS[1.5]` is undefined, `buildCard` throws TypeError, caught as 503 `rpc_unavailable` (wrong status, uncached, retriable by an attacker). Use `/^[0-5]$/`. The `catch {}` logs nothing (hindsight route logs; this one does not). Also semantic: `derived` only counts memes still held, so a legit minted card whose owner has since sold everything yields `derived == 0` -> `verified:false`; the board will then un-rank a genuine card.

### S10. hindsight.ts:80-103, hypersync.ts:26 - silent truncation returns a partial card as if complete
After 6 split rounds any remaining `queue` entries are dropped without error (a wallet with >10k transfers in one narrow window, e.g. a bot, loses logs). HyperSync stops after 50 pages with no flag. Both violate "never treat an error as empty". Throw when `queue.length > 0` after the loop / when the page cap is hit.

### S11. stream/route.ts:65-82 - polling path load and replay semantics
Each connected client runs its own `eth_blockNumber` + `eth_getLogs` every 5 s on the single public RPC (getLogs always goes to PUBLIC_RPC, rpc.ts:25): 20 viewers = 4 calls/s = the entire rate budget, starving /api/hindsight and /api/quote. Every 55 s reconnect restarts at `head - 20` (replays recent events, duplicate rows in the live feed) while the WS path replays nothing (gap). No keep-alive comment frames, so idle proxies may cut the stream. Fix: one shared poller per instance fanning out to subscribers, `id:`/`Last-Event-ID`, `: ping` every 15 s.

### S12. qn-jar/route.ts:25,35,45 - uncached paid call per hit; decimal balances read as disagreement
No timeout, no cache: each page view spends a QuickNode credit plus a multicall. `r.rawBalance ?? r.balance`: if the API returns a decimal-formatted `balance` ("1.5"), `BigInt(q)` throws and `match:false` -> UI shows a false "Quicknode disagrees" badge. Response field names are [UNVERIFIED] per the header; unparseable should yield `enabled:false`, not a mismatch. Add `s-maxage=30` and `AbortSignal.timeout`.

### S13. hindsight.ts:196,256-259 - "today" freshness and basis not disclosed
`nowStock` reads `stock.historyFeed` (the market-hours feed), not `liveFeed`, so on weekends/after hours the counterfactual is days old, and the Card carries no `updatedAt` for it (INVARIANT 7: freshness defined honestly). Also `usdToday8` values the entire balance (including airdropped/transferred-in tokens) while counterfactual uses only bought amounts, so rows can compare unlike bases. Add `asOf` timestamps for ETH and stock prices; label holding basis.

---

## NOTE

N1. rounds.ts:101,111,122: `nOf` strips the phase and rebuilds ids with `PHASE_BASE`; fine while every feed is phase 1 (documented), wrong roundId (BadRound in recompute) on a phase-2 aggregator. Assert `latest.roundId >> 64n === 1n`.
N2. rounds.ts:110,121: the "no newer round" return paths use `BigInt(last[1])` without `normalize8`, unlike case 1 and the live path. Harmless with current tables (last rows are 8dp) but inconsistent; call `normalize8` in all returns.
N3. hindsight.ts:154,231-236: only the FIRST outgoing payable transfer is counted per tx and `tx.from !== wallet` (EIP-7702 relayer/sponsored) is "unpriced"; ETH `tx.value` on a direct UR call includes any refunded ETH (overcount). Documented spike behaviour; conservative, no double count.
N4. Response shapes are inconsistent: hindsight returns the bare Card, errors `{error, retryAfter}` (no `Retry-After` header); quote errors `{error, detail}`; health `{rpc, error}`; card-check success includes an internal `at`; geo returns `list: fetchedAt` (misnamed). Standardise `{error:{code}}` and send real `Retry-After` on 503.
N5. geo/route.ts:11: trust in `x-vercel-ip-country` is correct only behind Vercel (it overwrites the header); off Vercel it is spoofable. No `Cache-Control: private, no-store` set; add one so an intermediary cannot serve one visitor's country to another.
N6. quote/route.ts:19-20: `feeBps` is caller-supplied (30 or 50). A non-staker can request the 0.3% display. Execution uses `TerraRouter.feeBps(msg.sender)`, so no fund risk, but the quote can understate the fee; read `feeBps(user)` server-side when an `addr` param is given.
N7. health/route.ts: 8 individual POSTs per hit, uncached; a polling monitor consumes GetBlock quota. Add a 10-15 s in-memory cache. The "fresh" window of 25 h makes SPY/QQQ read stale every weekend (consistent with SURVIVOR-11).
N8. hindsight route/OG/page share no helper for the 503 shape; page.tsx returns a friendly string, API returns JSON. Fine, but unify when fixing M4.

## What is good
- Input validation is mostly right: strict checksum `isAddress`, digit-only regex before `BigInt`, explicit WIF-not-sellable guard, taxed-token refusal, `quote` oracle staleness returns 409 instead of fabricating.
- Fee/sweep/trade and band math mirrors the contract line for line; BigInt used throughout, no precision loss.
- Secrets discipline is clean: `server-only` on every lib that touches provider URLs, SSE proxy design (D-19) keeps the WSS URL server-side, client imports of lib/hindsight are type-only.
- Hindsight honesty design (one payment per tx, multi-meme payments unpriced, router fee/sweep excluded, "before Chainlink history" unpriced, TOO_MANY_LOGS split rather than treat as empty) is sound; M1-M3 are about the plumbing around it, not the algorithm.
