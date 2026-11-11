# Phase 4 - Structural Security Audit (Terra Firma)

Date: 2026-11-11. Read-only audit; no code edited. No secret values printed or recorded.

## Counts

| Severity | Count |
|---|---|
| SECURITY-CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 9 |
| GAS-WARNING | 0 (no .gas-snapshot present, see 4.3) |
| LOW / informational | 5 |

## 4.1 Secrets scan - PASS

- `git ls-files`: no `.env*` tracked. `.gitignore` (repo root) and `web/.gitignore` both ignore `.env*` (root keeps `!.env.example`). `git check-ignore` confirms `.env.local` ignored.
- `~/wif-hack/.env.local` is outside the repo (repo root is `~/wif-hack/terra-firma`; parent is not a git repo), mode 0600.
- 0x+64-hex scan of tracked tree (excluding contracts/lib, lockfiles, spike-pool-keys.json): only pool ids / topic hashes. No private-key assignments. Documented anvil keys were not even found outside docs.
- Pattern scan (sk-, pk_live/test, AKIA, ghp_, getblock.io/<hex>, quiknode.pro/<hex>, PEM headers, password/secret/api_key literals): zero hits in tracked tree.
- Value-based leak test: every `.env.local` value >=12 chars was searched (git grep + web/.next). Only matches: `PUBLIC_RPC` (public Robinhood RPC, intended public, in web/lib/config.ts) and `DEPLOYER`/`KEEPER` (public addresses, in `.forge-state.json`/docs). No secret value (GETBLOCK_*, DEPLOYER_KEY, DEMO_KEY, KEEPER_KEY, QUICKNODE_*) appears in tracked files or in web/.next.
- Client bundle (`web/.next/static`): 0 hex tokens after getblock.io/quiknode.pro; "getblock" hits are viem `getBlock*` API names; no ENVIO_API/DEPLOYER_KEY/KEEPER_KEY/DEMO_KEY strings; no sourcemaps shipped in static.
- `NEXT_PUBLIC_*` in use: DEMO_ADDR, FRIEND_JARS, REPO_URL, SITE_URL, WC_PROJECT_ID - all public by nature. `web/lib/rpc.ts` and `quote.ts` import `server-only`.
- Git history: 4 commits; no getblock.io/<hex> token ever added.
- CI: `.github/workflows/keeper.yml` passes RPC_URL/KEEPER_KEY via `secrets.*` only.

## HIGH

### [H-01] /api/stream: unauthenticated, uncapped upstream WebSocket per request; socket not closed on client abort; enqueue-after-close
- Location: `web/app/api/stream/route.ts:46-66`
- Description: every GET opens a new upstream `WebSocket(GETBLOCK_WSS_FRA)` (or a 5 s polling loop) for 55 s. No rate limit, no concurrency cap, no auth. `req.signal` abort only calls `close()` (closes the controller); the upstream `ws` is never closed until the 55 s timer, and `ws.onmessage` still calls `send()` -> `controller.enqueue` on a closed controller, which throws inside an event handler (uncaught in the server process; crash behaviour [UNVERIFIED], livetest should confirm).
- Attack vector: `for i in $(seq 500); do curl -sN https://<site>/api/stream >/dev/null & sleep 0.1; kill %% ; done` - each request pins a shared GetBlock WSS slot for 55 s even after the client disconnects, exhausting the shared hackathon connection quota (breaking the live stream and the hackathon-shared key for everyone) and burning Vercel function time (maxDuration 60).
- Remediation: (1) on `req.signal` abort also `ws.close()` and clear the timer; (2) guard `send` with `if (closed) return` and wrap onmessage in try/catch; (3) share ONE upstream subscription per instance and fan out to SSE clients; (4) add per-IP limit (Vercel WAF/Upstash ratelimit) and a global concurrent-connection cap.

## MEDIUM

### [M-01] No rate limiting on expensive routes; unbounded in-memory caches
- Location: `web/app/api/hindsight/route.ts:10,19-21` (cache Map), `web/app/api/card-check/route.ts:11,24` (cache keyed by attacker-chosen `usdPaid8`, up to 40 digits x any addr x stockId), `web/app/api/quote/route.ts` (no cache, 3+ RPC batches per call), `web/app/api/qn-jar/route.ts` (one Quicknode call per request, `revalidate=0`), `web/app/api/stream`. No middleware.ts/proxy.ts exists.
- Attack: loop over random valid addresses -> each triggers `buildCard` (multi-chunk eth_getLogs scan on public RPC, up to 60 s) and adds a permanent Map entry (memory growth, never evicted); /api/quote hammers the shared GetBlock key; /api/qn-jar burns the Quicknode quota.
- Remediation: per-IP rate limit (middleware + Upstash/Vercel WAF); bound caches (LRU max ~500 entries, evict on insert); card-check cache key should use the derived card, not the claimed value; add `s-maxage` Cache-Control on hindsight/qn-jar so the CDN absorbs repeats.

### [M-02] Error detail echoed to clients
- Location: `web/app/api/quote/route.ts:46` (`detail: String(e)`), `web/app/api/health/route.ts:24` (`error: String(e)`).
- Impact: upstream RPC error text / internal messages returned to anonymous callers (no secret URL observed in current error paths - fetch errors do not embed the URL - but it is a one-viem-upgrade away from leaking a provider URL).
- Fix: return a fixed code; log `String(e)` server-side only (as hindsight route already does).

### [M-03] WifStaking.rollAll() mutates state with no event
- Location: `contracts/src/WifStaking.sol:165-169` -> `_rollPool` (lines 254-264) changes `p.activeTotal`, `rollAccPlusOne`, bucket amounts silently. Permissionless.
- Impact: indexers/stream/UI cannot observe active-stake changes; breaks 4.4 completeness. Fix: `emit PoolRolled(uint8 indexed stockId, uint256 epoch, uint256 activated, uint256 activeTotal)` inside `_rollPool` when a bucket activates.

### [M-04] HindsightLens.mintCard accepts self-asserted Buy[]; SECURITY.md T10 overstated
- Location: `contracts/src/HindsightLens.sol:68-72` (`recompute` validates only round brackets for caller-chosen `ts`/`amountPaid`/`payKind`), contrasted with SECURITY.md T10 "Forged Hindsight card ... card numbers derived from logs".
- Attack: any wallet with 1 $WIF mints an on-chain `CardMinted` with fabricated buys (arbitrary `amountPaid` and a `ts` of its choosing). Only the off-chain `/api/card-check` (within 1%) detects it.
- Fix: reword T10 to "pricing arithmetic is verified on-chain; provenance only off-chain via /api/card-check"; UI must show the verified badge, never the raw event.

### [M-05] FriendJar invite is brute-forceable and revealed in plaintext on join
- Location: `contracts/src/FriendJar.sol:55-68`. `inviteHash` is public at creation; low-entropy invites can be cracked offline; `join(id, invite)` puts the plaintext invite in public calldata/mempool so anyone can front-run or reuse it.
- Fix: require high-entropy invite (>=128 bit) or EIP-712 signed invite binding `msg.sender`+`id`; document. (Funds are per-share accounted, so impact is group privacy / spam membership, not theft.)

### [M-06] FeePool.distribute(wifMinOut) is permissionless with caller-chosen slippage
- Location: `contracts/src/FeePool.sol:87-100`. Anyone can call `distribute(0)` once per epoch (before the keeper) and sandwich the burn leg, extracting value from up to `MAX_WIF_BUY_ETH` (0.01 ETH) per hour. Bounded and disclosed (T7), but the keeper's -3% guard is bypassable.
- Fix (optional): enforce an in-contract floor for wifMinOut or restrict the first call per epoch to the keeper for a short window.

### [M-07] Dependency advisories (pnpm audit --prod: 5 high, 5 moderate, all transitive)
- postcss <=8.5.17 (via next; build-time, needs attacker-controlled CSS - not reachable), ws <8.21.0 and decode-uri-component <=0.5.0 (via wagmi > walletconnect > reown; client-side only), zod <4.6.6 (via viem>abitype), uuid <11.1.1.
- Fix: add `pnpm.overrides` for postcss>=8.5.23, ws>=8.21, zod>=4.6.6, decode-uri-component>=0.5.1, uuid>=11.1.1 and re-run; none is demonstrably exploitable in this app's server paths.

### [M-08] No security headers / CSP
- Location: `web/next.config.ts` (no `headers()`). No X-Frame-Options/frame-ancestors, CSP, Referrer-Policy, nosniff. App holds wallet-signing UI -> clickjacking of trade/stake buttons is plausible.
- Fix: add `headers()` with `Content-Security-Policy` (frame-ancestors 'none'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. CORS: no ACAO headers set anywhere (same-origin default) - OK.

### [M-09] Config drift between .env.local, .env.example and code
- Code reads `QUICKNODE_RPC` and `ENVIO_API_TOKEN`; `.env.local` has `QUICKNODE_BASE`/`QUICKNODE_TOKEN` and no `ENVIO_API_TOKEN`, so `/api/qn-jar` silently returns `enabled:false` and Hypersync is off. Code also reads `PUBLIC_RPC`, `DEMO_ADDR` (documented in .env.local, missing from `~/wif-hack/.env.example`); `.env.example` lists `NEXT_PUBLIC_DEMO_ADDR` etc. that match.
- Fix: align names (build `QUICKNODE_RPC` from BASE+TOKEN or change code) and add PUBLIC_RPC/DEMO_ADDR/GETBLOCK_WSS_NYC to .env.example.

## 4.2 Config audit notes
- Routes in web/app/api: hindsight, card-check, quote, stream, qn-jar, health, geo. No debug/admin/test routes found. All read-only, none sign txs.
- `dangerouslySetInnerHTML` only in `web/app/layout.tsx:30` with a static theme string - safe. All external `href` use constant bases + target=_blank rel=noopener noreferrer.
- Input validation: addr via `isAddress`, numerics via `/^\d{1,78}$/` / `\d{1,40}`, feeBps/sweepBps bounded - good.
- Env vars referenced in code: all present in `~/wif-hack/.env.example` except `PUBLIC_RPC`, `DEMO_ADDR` (see M-09).

## 4.3 Gas
`contracts/.gas-snapshot` absent at audit time (checked twice) - skipped. Structural note: `FeePool.distribute` requires >=400k/450k gas per leg by design (MIN_GAS_* floors) and router swaps legitimately exceed 200k; not flagged. `TerraRouter.convert` and `HindsightLens.recompute` loop over caller-supplied arrays (self-DoS only, no shared state).

## 4.4 Event completeness
All state-changing externals emit: TerraRouter (buy/sell/convert/deposit), FeePool (distribute, receive), Jar (credit, withdraw), FriendJar (create, join, contribute, exit), WifStaking (stake, switchStock, requestUnstake, withdraw, claim, notifyReward), HindsightLens.mintCard. Gap: `WifStaking.rollAll` (M-03). StockOracle is view-only.

## 4.5 Reentrancy structural scan
- `nonReentrant` on: Router buy/sell/convert/deposit; FeePool.distribute; Jar.withdraw; FriendJar.contribute/exit; WifStaking stake/switchStock/requestUnstake/withdraw/claim.
- CEI verified: Jar.withdraw, WifStaking.withdraw/_claim (state zeroed before transfer), FriendJar.exit (shares zeroed before jar.withdraw), FeePool.distribute (`lastEpoch` set before external calls). Router holds no persistent state; all ETH sends target immutable FeePool or msg.sender last (`sell`).
- Unguarded but safe: Jar.credit (auth + Unbacked check), WifStaking.rollAll/notifyReward (no external calls; notifyReward auth'd), FriendJar.create/join, HindsightLens.mintCard (view compute then `burnFrom`, no state).
- LOW (info): cross-contract path WifStaking.claim/stake -> issuer-controlled stock-token callback -> FeePool.distribute -> staking.rollAll() is not covered by the staking guard (rollAll lacks nonReentrant). `_claim` zeroes `accrued` first so no double-claim found; consider `nonReentrant` on rollAll/notifyReward for defence in depth.
- LOW: SECURITY.md T5 says nonReentrant is on "every state-changing external"; credit/create/join/mintCard/rollAll/notifyReward are not (harmless, but reword).
- LOW: `TerraRouter.receive()` accepts stray ETH with no sweep (funds stuck, not stealable: `sell` measures balance delta).

## SECURITY-CRITICAL / HIGH summary
- SECURITY-CRITICAL: none.
- HIGH: H-01 /api/stream (`web/app/api/stream/route.ts:46-66`).
