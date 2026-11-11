# Phase 5 Frontend Critique (Next.js 15 + wagmi/viem)

Scope: web/app/**/page.tsx, layout, opengraph-image, web/components/*.tsx, web/lib/{wagmi,ui-chain,ui-format,ui-errors,ui-logs,ui-report}.ts, plus the api/stream, api/quote, api/card-check, api/geo routes where the UI depends on them. Read against INVARIANTS.md, PRD 4.13, 4.17 and Section 6 (Scenes 1-6). Static read only: nothing was run in a browser, and `web/data/deployments.json` still has `deployed:false`, so every tx flow was traced, not exercised.

Counts: MUST-FIX 2, SHOULD-FIX 14 (S1-S14), NOTE 10 (N1-N10).

Checked and clean: hook ordering (no hooks after early returns in any component), EventSource/interval/timeout/keydown cleanups, list keys, no render-time setState, no `dangerouslySetInnerHTML` on user data (only the static theme script), approvals are exact-amount (convert, sell, stake, mint 1 WIF), approvals are simulated and mined strictly before the dependent call, `$WIF` is excluded from convert candidates and the Sell tab, `parseAmount` rejects exponent/negative input, uint16 `feeBps` compares correctly as number, public RPC answers CORS `*`, the `grep mock|fake|dummy|placeholder` over web/app and web/lib is empty.

---

## MUST-FIX

### M1. Stake timing copy is false: a stake earns from epoch e+2, not "the next epoch"
- Files: web/components/stake-view.tsx:148, :176, :190, :201
- Copy: "Staked. You start earning NVDA from the next epoch (in 23 min)", "Activating next epoch", "New stake starts earning at the next epoch", "Switched. You earn X from the next epoch."
- Contract truth: WifStaking.sol:16 and `_matured` (`placedEpoch + 1 < currentEpoch()`): a bucket placed in epoch e becomes active at the START of e+2. `test_jitStakeEarnsNothing` asserts `pa == 0` ("not active one epoch later") after the e+1 distribute and `pa > 0` only after the e+2 distribute. INVARIANTS.md #4 / SURVIVOR-2 say the same.
- Scenario: Scene 5, presenter stakes. UI promises earnings in about 23 minutes. First reward is actually 60-120+ minutes away (23 min + 1 full epoch + the keeper run). A judge who reads the contract or the invariants sees the UI contradicting them. The PRD 4.13 copy ("in 23 min") and the Scene 5 voiceover ("New stakes start next epoch") carry the same error, so the UI copied the spec, but the contract is the authority.
- Related seed-state risk: Seed table says "active >= 1 epoch before recording". It must be >= 2 epochs or the demo wallet shows 0 pending reward.
- Falsifiable test: with a fresh stake in epoch e, read `WifStaking.activeOf(user)` at e+1 (expect 0) and at e+2 (expect the stake). The UI string must then say the stake activates at the start of epoch e+2 and give minutes = `(nextAt - now)/60 + 60`.
- Fix: pass `epoch`/`start` into `Staker` (it is computed in `usePools` but not forwarded). Use `activeAt = nextAt + 3600`. Copy: "Staked. It activates at the start of epoch {e+2} (about {mins+60} min) and earns from the first distribute after that." Fig label: "Activating (earns from epoch e+2)". Also update PRD 4.13 and the Scene 5 voiceover.

### M2. `stockQuotes()` silently fabricates values when a read fails (invariant 7)
- File: web/lib/ui-report.ts:31-32 (consumed by useStockQuotes in jar-view, stake-view, convert-panel, trade-terminal, board-view, friends-view)
- Code: `multiplier: ... : 10n ** 18n` and `price8: round ? round[1] : 0n` with `allowFailure: true`.
- Scenario: any one `uiMultiplier()` revert or `latestRoundData` failure (a feed hiccup, a token that does not implement `uiMultiplier`, an RPC partial failure inside the multicall) becomes a multiplier of exactly 1 or a price of $0 with no flag. The Jar then shows "$0.00" or shares computed with multiplier 1, convert/sell previews show wrong "≈ N NVDA", and Board "Biggest Jars" ranks on it. INVARIANTS.md #7: "NEVER substitute a mock, cached result... Every number on screen comes from mainnet state". `StockQuote` has no way to signal "unknown".
- Falsifiable test: in a unit test, mock `publicClient.multicall` to return `{status:"failure"}` for NVDA `uiMultiplier`; assert the UI shows "—"/"price unavailable" and not a share count or $0.00. Today it shows numbers.
- Fix: make `multiplier`/`price8` nullable (or throw so react-query surfaces `isError`), and have `sharesOf`/`usdOf` callers render "—" when null. Stale-but-real is acceptable (react-query keeps last good data); invented defaults are not.

---

## SHOULD-FIX

### S1. Wrong-chain wallet gets a cryptic error on every tx button
- Files: web/components/hooks.ts:119-122 (`useTx.run`), web/components/providers.tsx (ChainGuard asks once per address)
- Scenario: user rejects the one-time switch prompt, or switches networks later. Header shows "Switch to Robinhood Chain" (hidden in the hamburger menu on mobile), but Buy/Convert/Stake/Claim stay enabled. `simulateContract` passes (it uses the config's public client), then `writeContract` with `chainId: 4663` throws `ConnectorChainMismatchError`; `plainError` falls through to the viem `shortMessage` ("The current chain of the connector... does not match").
- Test: connect MetaMask on chain 1, dismiss the switch prompt, click Convert; the message is not plain language.
- Fix: in `useTx.run`, before the loop: `if (getAccount(config).chainId !== CHAIN_ID) await switchChain(config, { chainId: CHAIN_ID })` (wagmi/actions), and add `ConnectorChainMismatchError` -> "Switch your wallet to Robinhood Chain (4663)." to `plainError`.

### S2. Quote is not refreshed before signing; long wallet pauses reuse a stale `minOut`
- Files: web/components/trade-terminal.tsx:204-215 (`send`), :288-297; convert-panel.tsx:92-105
- `staleTime` is 15-20 s but `refetchOnWindowFocus:false` and no refetch on submit, so a quote displayed for minutes is signed with its original `minTokenOut/minStockOut`. Result is an avoidable `Slippage` revert mid-demo.
- Test: wait 2 minutes after the preview appears, click Buy; the tx uses a 2-minute-old route and minOut.
- Fix: at the top of `send`/`submit`, `const fresh = await qc.fetchQuery({queryKey, queryFn, staleTime: 0})` and use `fresh`; or `refetchInterval: 15_000` while the form is open.

### S3. Convert/Stake/Claim: `gate.gate()` silently does nothing while geo is "loading"
- File: web/components/geo-gate.tsx:52-57; Stake buttons (stake-view.tsx:187, :196) are not disabled for `gate.status === "loading"`; Convert is.
- Scenario: first click on "Approve and stake" or "Claim to Jar" during the 0-3 s geo fetch (QueryClient retry 2 means up to ~3 s on failure) does nothing, no feedback. On a recording that reads as a dead button.
- Fix: add `|| gate.status === "loading"` to the Stake/Claim/Switch disabled conditions, or have `gate` queue `fn` when loading.

### S4. Closing the convert sheet mid-transaction loses all status
- File: web/components/app-home.tsx:72-75, :96-98 (`{open && children}`)
- ESC or the X unmounts `ConvertPanel`, destroying `useTx` state while approvals/convert are in flight. The txs still land, but the user sees nothing and no hash link. Scene 3 depends on that success view.
- Test: start a convert, press Escape while "confirming…"; the success state never appears.
- Fix: block close while busy (`onCancel={(e) => busy && e.preventDefault()}` and disable the X), or lift `useTx` above the sheet.

### S5. Landing counters skeleton forever on RPC error (Scene 1)
- File: web/components/landing-live.tsx:26-30, 37-38
- `val(!!logs.data, ...)` never checks `logs.error`; when the browser's public-RPC log scan fails (429 at ~4-5 req/s, shared with every other query on the page), "Routed trades" and "Jars" shimmer indefinitely. Proof page handles this correctly (`failed`). Counters sits on the first screen of the demo.
- Fix: mirror proof-view's `ev()`: if `logs.error`, show "RPC unavailable" in `text-danger`.

### S6. Pre-deploy counters link to the zero address
- File: web/components/landing-live.tsx:39-42
- `href={addrUrl(TF.FeePool)}` is unguarded; with `deployed:false` it links to `.../address/0x0000...0000` under a "Not live yet" value. Stake, Jar and Proof guard this with `DEPLOYED ? ... : undefined`.
- Fix: `href={DEPLOYED ? addrUrl(...) : undefined}` on all four Stats.

### S7. Scene 2 "real long-history wallet" has no path in the UI
- Files: web/app/page.tsx:25-27, web/components/app-home.tsx
- PRD Scene 2 and F2: after connecting, open `/card/0x3fDB...b09E` as a 10 s contrast shot. The lookup input exists only on the landing page, which the connect flow leaves (`router.push("/app")`). `DEMO_ADDR` is the demo wallet, not the 0x3fDB wallet, and nothing in the code references 0x3fDB outside a comment. The presenter has to retype 42 characters on camera or hand-edit the URL.
- Fix: add a "See a wallet with real history" secondary link (constant from PRD, or `NEXT_PUBLIC_HISTORY_ADDR`) on `/app` next to Share, and put `AddressLookup` on `/app` and `/card/[addr]`.

### S8. Header address pill disconnects on a single click
- File: web/components/connect-button.tsx:27
- The connected pill is a button whose only action is `disconnect()`. A presenter pointing at the address while narrating drops the session mid-demo (and `useRequireWallet` then redirects `/app` to `/`).
- Fix: open a small menu (Copy address / Explorer / Disconnect) or require a confirm; at minimum make it `AddrLink` plus a separate Disconnect button.

### S9. Staker "Activating" figure double-counts after maturity
- File: web/components/stake-view.tsx:175-176
- `st.pending` is not rolled into `st.active` until the staker next interacts, so after activation `Active` (from `activeOf`, which includes matured pending) and "Activating next epoch" (raw `pendingStake`) show the same tokens twice. A judge sees 500 active and 500 activating.
- Test: stake, wait for e+2, load /stake with no further tx: both figures read 500.
- Fix: `const waiting = pendingStake - ((activeOf ?? 0n) - active)` and show `waiting`.

### S10. Board fires up to 25 heavy card re-derivations in parallel
- File: web/components/board-view.tsx:108-118 with app/api/card-check/route.ts
- `regretCandidates` slices to 25 and each becomes a `/api/card-check` call that runs a full `buildCard` (3-12 s of RPC per PRD). 25 at once against a rate-limited RPC (429 at about 16 parallel) throttles the whole app, and "Biggest regret" shows skeletons until all settle. Server cache is per-instance in-memory.
- Fix: slice to 10 before verifying, set `retry:false`, check `r.ok`, and cap concurrency (sequential `useQuery` over the first N). Handle `{error}` bodies (currently `j.verified === true` quietly marks them unverified, which is honest but looks like "no cards").

### S11. Ticker loses events across SSE reconnects
- File: web/app/api/stream/route.ts:35-95, web/components/landing-live.tsx:68-80
- Stream closes every 55 s; EventSource reconnects after about 3 s. The WSS path has no replay, and the poll path restarts at `head - 20` (blockTime is 100 ms, so about 2 s of history). Events that land in the gap are never shown, and the badge flips "Streaming" to "Reconnecting" every minute on camera. Scene 4 shows the trade appearing live.
- Fix: emit `id: <block>` per event and honor `Last-Event-ID` (start poll from that block), or start from `head - 100`; send a `retry: 1000` field; dedupe already exists client-side.

### S12. "Verified" and "ownerless" are asserted without a check
- File: web/components/proof-view.tsx:98, :119-121
- When `DEPLOYED`, the rubric says "7 ownerless contracts, verified" and every contract gets an "ownerless" badge unconditionally. Nothing reads Blockscout verification state, and `CONTRACTS` includes FriendJar even though that feature is env-gated. Scene 6 voiceover also says "verified".
- Fix: add `verified: true` per contract to deployments.json after `forge verify-contract` succeeds, render the badge from that, and drop FriendJar from the count unless `NEXT_PUBLIC_FRIEND_JARS==="1"`.

### S13. Invariant "every onchain number links to the explorer" has gaps
- Files: web/components/stake-view.tsx:172-177 (Wallet/Active/Activating/Reward Figs), web/components/jar-view.tsx (per-row share counts and total only link via price/Stat), web/components/hindsight-card.tsx:77-92 (totals Figures), board-view, friends-view.
- Totals on the card are backed by receipt links one click down, and Jar value links to the Jar contract, so this is partial. The stake page figures have no link at all.
- Fix: make `Fig` accept `href` (WifStaking / WIF token holder page `addrUrl(WIF)?tab=...`) as `Stat` already does.

### S14 (counted with S13 family) WalletConnect is silently absent without an env var
- File: web/lib/wagmi.ts:10-19. `NEXT_PUBLIC_WC_PROJECT_ID` is not in the repo (no .env* in web/). Without it only injected and Coinbase connectors exist, but PRD 4.17 requires WalletConnect v2 (Robinhood Wallet, mobile MetaMask) and Scene 4 has a mobile cut-in. The dialog just lists fewer wallets with no hint.
- Fix: verify the var is set on the Vercel project; log a build-time warning; same for `NEXT_PUBLIC_DEMO_ADDR`, `NEXT_PUBLIC_REPO_URL`, `NEXT_PUBLIC_SITE_URL` (the hero's "See a real card", the SECURITY.md footer link and OG metadata all disappear if unset).

---

## NOTE

- N1. web/components/hooks.ts:17-23: `useNow` initializes from `Date.now()` in `useState`; SSR/client values differ, but every current consumer renders it only after wallet/chain data arrives, so no mismatch today. Initialize to 0 and set in the effect to keep it safe.
- N2. web/components/stake-view.tsx:64: "Next epoch in" shows "now" for up to 30 s after the boundary until `currentEpoch` refetches; unlock countdowns use client clock, not block time.
- N3. web/components/trade-terminal.tsx: after a successful buy, `useBalance` is not refetched (SellForm does refetch its balance), so the displayed ETH balance and the `over` check are stale for a second trade (mobile cut-in).
- N4. web/components/trade-terminal.tsx:162-170 `useTradeResult`: the "NVDA went to your Jar" line is silently omitted if `stockQuotes` has not loaded; the sweep happened but the success box does not say so.
- N5. web/lib/ui-errors.ts: `InsufficientGas` and `OnlySelf` (both in the ABI) have no PLAIN entry, so a starved `distribute` on /proof shows the raw viem message. Add "The transaction ran out of gas budget. Increase the gas limit and retry."
- N6. web/components/hindsight-card.tsx:48,51: `aria-label` on a plain `<span>` is ignored by most screen readers (prohibited on generic); the "value today: 41 dollars" requirement of PRD 4.17 is not delivered there. Use `<span class="sr-only">` text or put the label on a `role="text"` wrapper. The `dd aria-label` in `Figure` is fine.
- N7. web/components/hindsight-card.tsx:95: "None of the 21 memes" is hard-coded; use `REGISTRY.memes.length` as CardSkeleton does.
- N8. web/components/tx-status.tsx:12: the live region is mounted at the same time as its content, so some screen readers will not announce it. Render the `role="status"` wrapper always and fill it.
- N9. web/components/landing-live.tsx:76-80 and api/stream/route.ts:51: `JSON.parse` on socket/SSE messages is unguarded; one bad frame throws inside the handler (and in the route can stop forwarding).
- N10. Large-scale: web/lib/ui-logs.ts keeps every log in a module-level array and `scanLogs` re-decodes all of it every 30 s; `blockTimes` issues one `getBlock` per unique block for the Jar streak. Fine for a hackathon week; a heavy user's streak will fan out hundreds of calls. Also card/[addr]/opengraph-image.tsx runs a full `buildCard` per unfurl bot hit with no rate limit.

Smaller observations folded here: "Most fees into the burn" (board-view.tsx:134) is all Traded.fee, but half goes to stakers, not the burn; the stake `pick` default of NVDA leaves "Switch to NVDA" enabled for a user staked elsewhere; tap targets on inline `TxLink`s (text-xs) are below 44 px (inline links, acceptable on desktop, tight on the 360 px cut-in).

---

## Scene walk (3-minute recording)

| Scene | Verdict |
|---|---|
| 1 Landing + connect | Works once deployed. Counters can shimmer forever on RPC error (S5); zero-address links pre-deploy (S6). Mobile: Connect button is in the hamburger menu except for the hero CTA, so the wrong-chain "Switch" button is hidden on phone (S1). |
| 2 Card + long-history wallet | Own card path is solid. Long-history contrast has no UI path (S7). Mint button hides silently if wallet has < 1 $WIF (no explanation). |
| 3 Convert | Attestation then convert is as scripted. Do not close the sheet while pending (S4). 2 memes = 3 wallet prompts (2 exact approvals + convert), disclosed by the button label and footnote. Stale-quote Slippage risk (S2). |
| 4 Trade + distribute | Buy flow and success box correct. Distribute button gated on `canDistribute`; keeper window caveat is a PRD concern. Ticker may miss the event at a reconnect boundary (S11). |
| 5 Stake + claim | False activation timing copy (M1); duplicate Active/Activating (S9); seed stake must be >= 2 epochs old. |
| 6 Proof | Honest pre-deploy states are good. "verified" assertion needs a backing check (S12). Recompute box and prefill link work as designed. |

## What's good
- `useTx` simulates before the wallet opens, so custom errors decode to plain words, and every step shows a pending state with an explorer link; the approve-then-act ordering is correct for multi-meme convert.
- Honest empty/pre-deploy states almost everywhere (`DEPLOYED` gating, "Not priced" section, Recompute side-by-side with tolerance, "never fabricate" respected by `rangeLogs` refusing to treat errors as empty).
- Accessibility basics are strong: native `<dialog>` with showModal, radio-group stock picker, labelled inputs, 44 px controls, reduced-motion handling, skip link.
