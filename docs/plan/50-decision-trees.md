## Decision Trees (one per PRD CRITICAL/HIGH risk, plus every MEDIUM risk)

#### DT-1: Router volume ≈ 0 makes the flywheel look hollow (R1, HIGH)
Run: `pnpm tsx scripts/proof.ts && grep -E "Routed|WIF burned" submission/proof.md`
Expected: routed ETH > 0 and WIF burned > 0 with tx hashes.
✅ **If it works:** keep the demo framing "real mechanism at real size"; continue.
🔀 **If WIF burned == 0 after seed:** 1. confirm FeePool balance >= 0.00005 ETH (`cast balance $FEEPOOL --rpc-url $RPC_URL`); 2. wait for the next epoch; 3. `gh workflow run keeper.yml` or press "Run distribute" on /proof; 4. re-run proof.ts.
⛔ **If nothing works:** show the fork-test burn (`test_distribute_burnAndStream`) in the video as "verified on a mainnet fork" and the live FeePool balance as pending; never claim a mainnet burn that did not happen. Continue from P5.

#### DT-2: Scope overrun (R2, HIGH)
Run: at each phase gate compare wall clock to the Phase Overview window.
Expected: within window ± 1h.
✅ **If on time:** continue.
🔀 **If > 1h late:** cut in this order: F-025 weekly report → F-024 streak → F-023 boards → F-022 stream (polling stays) → F-018 Quicknode badge. Never cut F-001..F-011 or any INVARIANT.
⛔ **If > 4h late at P6:** FriendJar UI stays off (gate fails), go straight to P7 with the core.

#### DT-3: Security finding during interrogate/review (R3, HIGH)
Run: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test -vv` after adding a test that reproduces the finding.
Expected: new test fails before the fix, passes after.
✅ **If fixed pre-deploy:** redeploy is free (P3 not reached); continue.
🔀 **If found after mainnet deploy:** prefer disabling the affected UI action and documenting it in SECURITY.md; redeploy all 7 only for a funds-at-risk finding AND only if >= 6h remain before the 08:00 WAT submit (re-seed + 2 epochs + re-verify needed), recording old addresses as deprecated.
⛔ **If the fix needs > 2h:** disable the affected UI action, document it in SECURITY.md "Not defended against" with the reason, and continue.

#### DT-4: Third-party WIF/ETH hook misbehaves (R4, MEDIUM)
Run: `cast logs --from-block $DEPLOY_BLOCK --address $FEEPOOL --rpc-url $RPC_URL "Distributed(uint256,uint256,uint256,uint256[6],uint256)"`
Expected: wifBurned > 0.
✅ **If it works:** continue.
🔀 **If wifBurned == 0 and carried grows:** quote the pool: `cast call 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 "quoteExactInputSingle(((address,address,uint24,int24,address),bool,uint128,bytes))(uint256,uint256)" "((0x0000000000000000000000000000000000000000,0x5173b8eA6923c2d40267890D45C46a3480954773,0,200,0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044),true,1000000000000000,0x)" --rpc-url $RPC_URL`; if it reverts, the hook blocks swaps.
⛔ **If the hook blocks swaps:** document in SECURITY.md; the ETH safely carries (try/catch) and the stock stream continues; disclose on /proof.

#### DT-5: Hindsight slow or rate-limited (R5, HIGH)
Run: `time curl -s "http://localhost:3000/api/hindsight?addr=$DEMO_ADDR" | jq '.memes | length'`
Expected: < 12s, >= 3 memes.
✅ **If it works:** continue.
🔀 **If > 12s or 503:** 1. check `/api/health`; 2. lower rpcChunked parallel from 3 to 2; 3. confirm GETBLOCK_* env set on Vercel (`vercel env ls`); 4. re-run.
⛔ **If still failing:** ask Dami for an Envio API token and add HyperSync as provider 0 (`https://robinhood.hypersync.xyz/query`), or shrink the registry to the top 12 memes; never return partial totals.

#### DT-6: Wrong Hindsight numbers (R6, MEDIUM)
Run: `/proof` recompute box for DEMO_ADDR (API vs HindsightLens.recompute).
Expected: identical usdPaid8 and shares18.
✅ **If equal:** continue.
🔀 **If different:** 1. check the round table is current (`pnpm tsx scripts/build-rounds.ts --update`); 2. re-run; 3. if a buy's ts is newer than the table, the table refresh fixes BadRound.
⛔ **If still different:** hide the affected buy rows behind "verifying" and file the mismatch in SUBMISSION_STATUS.md; never show unverified totals.

#### DT-7: Universal Router encoding failure on a route kind (R7, HIGH)
Run: `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-test "test_buy|test_sell|test_convert" -vv`
Expected: all PASS.
✅ **If it works:** continue.
🔀 **If `SliceOutOfBounds` (0x3b99b53d):** check the input carries the trailing `uint256[] maxHopSlippage` (URCodec.v2/v3) and the amount is CONTRACT_BALANCE after an exact WRAP/push.
⛔ **If a specific pool kind keeps failing on mainnet:** mark those pools `tested:false` in memes.json (registry rebuild) so the quoter skips them; the route builder falls back to the next best pool.

#### DT-8: Funding/deploy delay (R8, HIGH)
Run: `cast balance $DEPLOYER --rpc-url $RPC_URL`
Expected: >= 0.002 ETH.
✅ **If funded:** run P3.
🔀 **If unfunded at 09:30 WAT:** keep building against the local fork deployment (P2), run livetest/interrogate/design on the fork build and write P7 docs/README; never claim fork txs as mainnet; ping Dami.
⛔ **If unfunded at 18:00 WAT:** escalate to Dami as BLOCKER: rule 3 needs mainnet $WIF txs; no workaround is acceptable (never claim fork txs as mainnet).

#### DT-9: Staking reads as generic (R9, MEDIUM)
Run: livetest first-contact check: landing headline and /card are first.
Expected: Hindsight leads; staking appears after convert and trade.
✅ continue. 🔀 If staking/yield is the first thing seen: reorder landing (Thesis tripwire 1). ⛔ If judges still read it as generic: lead the ship thread with real Hindsight cards (OD8).

#### DT-10: Geofence blocks a judge (R10, MEDIUM)
Run: `curl -s -H "x-vercel-ip-country: US" $URL/api/geo`
Expected: `restricted: true` (if US is listed) and the UI disables only stock actions.
✅ continue. 🔀 If restricted.json is empty: run `pnpm tsx scripts/build-restricted.ts` (fails loudly if unparseable). ⛔ If the list cannot be sourced: keep attestation mandatory for everyone and document.

#### DT-11: Approval lag / deadline (R11, HIGH)
Run: at 09:00 WAT Nov 12 check `submission/` completeness (`ls submission`).
Expected: video link, proof.md, links.md, sponsor-tracks.md.
✅ submit at 08:00 WAT. 🔀 If the video is missing: submit with a working live URL and a 60s screen capture, update the video later in the gallery. ⛔ Never pass 17:30 UTC: submit whatever is live by 15:30 UTC (16:30 WAT).

#### DT-12: Host or keeper dies before Nov 16 (R12, MEDIUM)
Run: `curl -s $URL/api/health | jq .rpc` and the latest keeper workflow run (`gh run list --workflow keeper.yml -L 3`).
Expected: "ok" and a successful run within the last 2 hours.
✅ continue. 🔀 If the keeper fails: re-run manually; check secrets. ⛔ If GitHub Actions is down: anyone can call distribute from /proof; post that instruction in the README.

#### DT-13: Taxed or weird memes (R13, MEDIUM)
Run: `pnpm tsx scripts/build-registry.ts` (marks `tested`).
✅ continue. 🔀 If a top meme fails its quote test: exclude it from the trending list. ⛔ If users paste an untested meme: the terminal warns "untested route" and caps the trade at 0.005 ETH in the UI.

#### DT-14: Weekend stale SPY/QQQ (R14, MEDIUM)
Run: `curl -s $URL/api/health | jq .feeds`
✅ continue. 🔀 If SPY/QQQ false: UI labels those sub-pools "pays on market days"; FeePool skips and carries automatically. ⛔ none needed.

#### DT-15: Mobile wallet UX (R15, MEDIUM)
Run: Chrome DevTools device emulation (iPhone 14) on the hero flow + a real phone with MetaMask mobile browser.
✅ continue. 🔀 If WalletConnect fails: set NEXT_PUBLIC_WC_PROJECT_ID; if absent, keep injected (mobile wallet in-app browsers) as the mobile path. ⛔ Document "use your wallet's in-app browser" on the connect sheet.

#### DT-16: Quicknode unavailable (R16, LOW)
Run: `curl -s "$URL/api/qn-jar?addr=$JAR"`
✅ badge shows. 🔀 If method not found: check the endpoint add-on; ⛔ hide the badge (code already does).

#### DT-17: Uniswap pool/quoter unavailable for a meme (R17, HIGH)
Run: `curl -s "$URL/api/quote?token=<meme>&side=buy&amount=1000000000000000"`
Expected: a route.
✅ continue. 🔀 If `no_route`: rebuild registry; check pools' liquidity. ⛔ The meme is shown as "no route" and is unselectable for convert.

#### DT-18: Chainlink outage or paused feed (R18, HIGH)
Run: `curl -s $URL/api/health | jq .feeds`
Expected: all true (SPY/QQQ may be false on weekends).
✅ continue. 🔀 If NVDA is stale: the default stock switches to the first fresh 24/7 stock in the UI. ⛔ If ETH/USD is stale: all stock actions pause with the PRD copy; Hindsight still renders from the round tables.
