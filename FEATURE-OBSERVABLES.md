# FEATURE-OBSERVABLES — Terra Firma
Each observable proves a feature WORKS (not that it exists). Run against mainnet after PLAN P3 unless marked [fork].
Env: `set -a; source ~/wif-hack/.env.local; set +a; D=web/data/deployments.json; R=$(jq -r .TerraRouter $D); J=$(jq -r .Jar $D); FP=$(jq -r .FeePool $D); S=$(jq -r .WifStaking $D); L=$(jq -r .HindsightLens $D)`

| ID | Feature | Observable | Test command | Sentinel fail | Verified by |
|---|---|---|---|---|---|
| F-001 | Hindsight card | demo card has >= 3 memes, every buy tx resolves onchain with value > 0 or a priced receipt | `curl -s "$URL/api/hindsight?addr=$DEMO_ADDR" \| jq '[.memes[].buys[].tx] \| length'` then `cast tx <tx> --rpc-url $RPC_URL` | `{"error":...}` or 0 memes | livetest |
| F-002 | Recompute parity | `HindsightLens.recompute(buys,0)` == API usdPaid8/shares18 | /proof recompute box; or `cast call $L "recompute((uint8,uint8,uint256,uint80,uint80,uint64)[],uint8)(uint256,uint256,uint256)" "[...]" 0` | values differ | livetest |
| F-003 | Convert | `Converted` + `Credited(source=1)` in the same tx; Jar balance delta == stockOut | `cast logs --address $R "Converted(address,uint8,uint256,uint256,uint256)" --from-block <deploy>` | no event | seed P4.1 |
| F-004 | Buy + sweep | FeePool balance delta == msg.value*feeBps/1e4 exactly; `Swept` event | [fork] `forge test --match-test test_buyV3_sweepAndFee` + mainnet tx receipt | fee delta mismatch | fork + seed |
| F-005 | Sell + sweep | user ETH delta == proceeds − fee − sweep | [fork] `test_sellV3_sweep`, `test_sellV4_plain` | ethOut 0 | fork |
| F-006 | Buy + burn | `Distributed.wifBurned > 0` and WIF totalSupply drops by exactly wifBurned in that block | `cast call 0x5173b8eA6923c2d40267890D45C46a3480954773 "totalSupply()(uint256)" --block <n-1>` vs `--block <n>` | wifBurned 0 | keeper P4.2 |
| F-007 | Staker stream | `WifStaking.pending(demo)` > 0 after an epoch; `claim()` emits `Credited(source=3)` | `cast call $S "pending(address)(uint8,uint256)" $DEMO_ADDR --rpc-url $RPC_URL` | pending 0 after 2 epochs | P4.2 |
| F-008 | Anti-JIT | same-epoch stake earns 0 | [fork] `forge test --match-test test_jitStakeEarnsNothing` | pa > 0 | fork |
| F-009 | Never sell $WIF | sell/convert with $WIF reverts `WifNotSellable` | [fork] `test_sellWifReverts`, `test_convertWifReverts`; `curl "$URL/api/quote?token=0x5173b8eA6923c2d40267890D45C46a3480954773&side=sell&amount=1"` → 422 | 200 response or tx success | fork + livetest |
| F-010 | Chainlink bound | stale feed reverts; fill >= oracle − 3% | [fork] `test_staleOracleReverts`, `test_userMinStockEnforced` | success on stale | fork |
| F-011 | Jar withdraw | user receives exact amount; ledger delta == amount | [fork] `test_jarWithdrawOnlyOwnBalance`; mainnet withdraw tx | balances mismatch | fork + P4 |
| F-012 | Lookup + OG | `/card/<addr>` 200 with "Connect to fix yours"; OG image/png | `curl -sI "$URL/card/$DEMO_ADDR/opengraph-image" \| grep -i image/png` | non-200 | livetest |
| F-013 | Paste CA terminal | top 10 registry memes quote | `for t in $(jq -r '.memes[:10][].token' web/data/memes.json); do curl -s "$URL/api/quote?token=$t&side=buy&amount=1000000000000000" \| jq -r '.route.kind // .error'; done` | `no_route` on a tested meme | livetest |
| F-014 | Geofence | US → restricted true; stock actions disabled | `curl -s -H "x-vercel-ip-country: US" $URL/api/geo \| jq .restricted` → true | false | livetest |
| F-015 | Keeper | a run per hour, distribute or skip | `gh run list --workflow keeper.yml -L 5` | gap > 2h | P3.5 |
| F-016 | /proof | 7 contracts + 4 first-of-kind txs resolve | `curl -s $URL/proof \| grep -c blockscout` | missing links | livetest |
| F-017 | Mobile | no horizontal scroll at 390px | Chrome DevTools emulation: `document.documentElement.scrollWidth <= 390` | > 390 | P5.3 |
| F-018 | Quicknode badge | agreement true | `curl -s "$URL/api/qn-jar?addr=$J" \| jq .agreement` | false | P5.1 |
| F-019 | Card mint | `CardMinted` + WIF supply −1e18 | `cast logs --address $L "CardMinted(address,uint8,uint256,uint256,uint256)"` | no event | P5.2 |
| F-020 | Friend Jars (gated) | JarCreated/Contributed/Exited on mainnet | [fork] `test_friendJar_contributeExit`; mainnet only if OD7 passes | — | P6.2 |
| F-021 | Staker discount | 30 bps for >= 10K active stake | [fork] `test_feeDiscountForStakers` | 50 bps | fork |
| F-022 | Live stream | `traded` event within 10s of a trade | `curl -N $URL/api/stream` while sending a buy | no event in 15s | P5 gate |
| F-023 | Boards | each row links a real tx/address | `/board` rows → explorer 200 | dead link | livetest |
| F-024 | Streak | streak == consecutive UTC days with Swept/Converted | compare /jar streak with `cast logs` count by day | mismatch | livetest |
| F-025 | Weekly report | OG image 200 with 7-day numbers from events | `curl -sI "$URL/jar/report/$DEMO_ADDR/opengraph-image"` | non-200 | livetest |
| F-026 | Receipt pricing | WETH/USDG-paid buys get payKind 0/1 | `pnpm tsx scripts/test-hindsight.ts` (txs 0x9965…6ab0, 0x2ac2…28db) | unpriced | P1.4 |
