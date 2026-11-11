# INVARIANTS — Build-Agent Law (Terra Firma)
> The build agent reads this as non-negotiable law. Violating any NON-NEGOTIABLE fails the hackathon gate.
> Source of identity: `warroom/WINNER-BRIEF.md ## Thesis` (base + AMEND-1). This file operationalizes Thesis fields 5 (INVARIANTS) and 6 (DRIFT TRIPWIRES); it never modifies them.

## NON-NEGOTIABLES
1. **$WIF is never sold or converted.** No code path swaps $WIF as an input token. — Test: fork test `test_sellWifReverts` and `test_convertWifReverts` call `sell`/`convert` with a $WIF route and expect revert. — Judge-attack: craft a `Route` whose input is $WIF, or a 2-hop path that starts with $WIF, and call `sell()`/`convert()` directly. -> Defense: TerraRouter checks the decoded input token of every Route (v2 path[0], v3 first 20 bytes, v4 input currency) against WIF and reverts `WifNotSellable` before any transfer.
2. **$WIF is never priced for value.** No spot price, quote, TWAP or reserve of $WIF is read in contract value logic. — Test: `grep -rn "WIF" contracts/src` shows WIF only in burn, stake, cap and route-guard code; FeePool unit test proves the WIF buy amount depends only on ETH balance and `MAX_WIF_BUY_ETH`. — Judge-attack: pump the WIF/ETH pool before `distribute()` to make the protocol overpay, or argue the burn is valued off spot. -> Defense: FeePool buys with a fixed ETH amount capped per epoch and takes NO caller min-out (a caller-chosen min could force-skip every burn); excess ETH carries; manipulation can only reduce WIF bought for a dust-capped ETH amount, never extract funds (no token amount is computed from a WIF price).
3. **Every stock fill is bounded by a fresh Chainlink price** (fresh = within the feed heartbeat 24h + 1h; max deviation per fill = 3% band). — Test: `test_staleOracleReverts` (vm.warp beyond MAX_AGE) and `test_bandEnforced` (mocked pool output below band). — Judge-attack: call `convert()` with `minStockOut = 0` while sandwiching the NVDA pool, or wait for a weekend stale SPY feed. -> Defense: TerraRouter and FeePool compute `oracleMin = StockOracle.minStockOut(stockId, ethIn, 300)` and enforce `max(userMin, oracleMin)`; a stale or non-positive answer reverts `StaleOracle` (router) or skips and carries (FeePool).
4. **No just-in-time capture of the staker stream.** — Test: `test_jitStakeEarnsNothing`: stake in epoch e, distribute epoch e, assert pending == 0; then distribute epoch e+1, assert pending > 0. — Judge-attack: stake a large $WIF amount one block before `distribute()`, claim, and unstake. -> Defense: a stake placed in epoch e activates only at e+2 (two pending buckets per pool, rolled before `notifyReward` credits), so a boundary stake + immediate distribute earns 0 (`test_boundaryStakeEarnsNothing`); `requestUnstake` stops earning immediately and funds unlock only after `UNSTAKE_DELAY = 24 hours`; `claim` returns only accrued rewards on active stake.
5. **Users' funds cannot be taken by anyone, including the deployer.** Jar, TerraRouter, FeePool, WifStaking have no owner, no pause, no upgrade, no admin withdraw. — Test: `test_noOwnerFunctions` (no selector named owner/transferOwnership/upgradeTo/pause), `test_jarOnlyUserWithdraws`, `test_creditUnbackedReverts`. — Judge-attack: call `Jar.credit()` from an EOA to inflate a balance, or `withdraw()` another user's stock. -> Defense: `credit` only from the immutable depositor set and only up to the observed balance delta (`NotDepositor`, `Unbacked`); `withdraw` debits `msg.sender`'s own ledger only.
6. **Router never executes caller-supplied Universal Router commands.** — Test: `test_badRouteKindReverts`, `test_routeTokenMismatchReverts`. — Judge-attack: pass a Route whose v3 path ends in a token other than the declared one, or encode a SWEEP/TRANSFER command to pull router-held tokens. -> Defense: TerraRouter encodes every command byte itself from `Route.kind` in {1,2,3}; it validates path endpoints against the declared token and WETH/native ETH; unknown kind reverts `BadRoute`.
7. **Demo and UI state are never fabricated.** Every number on screen comes from mainnet state, events or Chainlink rounds. — Test: `grep -rniE "mock|fake|dummy|placeholder" web/app web/lib` returns no production-path hits; `/api/hindsight` for the demo wallet returns tx hashes that resolve onchain; seed-demo.ts only sends real transactions. — Judge-attack: open `/card/<random active wallet>` and check one row's tx hash and roundId on the explorer, or ask "is the demo seeded with fake numbers?". -> Defense: card rows carry `tx`, `ethRoundId`, `stockRoundId`; `/proof` recompute box runs `HindsightLens.recompute` on the same inputs; unpriced rows are labelled `paid in tokens, not priced`, never estimated.
8. **Every Hindsight number's PRICING is recomputable onchain from the card's own inputs, and every buy links to a real tx** (recompute proves arithmetic, the tx hashes prove the buys; minted cards are re-verified before ranking). — Test: F-002 parity (API `usdPaid8`/`shares18` == `HindsightLens.recompute(buys)`), `test_recomputeOneEthBuy`, `test_wrongRoundReverts`. — Judge-attack: claim the card is a marketing number, or feed a wrong round id to inflate it. -> Defense: /proof runs `HindsightLens.recompute` on the same buys side by side; a round that does not bracket the buy's timestamp reverts `BadRound`.

### SURVIVING CRITICAL-REVIEW FINDINGS (forge Phase 3.5, distinct-model reviewers)
- SURVIVOR-1 (ARCH): cross-pool accrued drain — stake() into a new pool pays old accrued rewards in the old stock first (test_crossPoolAccruedNoDrain).
- SURVIVOR-2 (ARCH/PRD): boundary JIT — a stake placed in epoch e activates at e+2 (test_boundaryStakeEarnsNothing).
- SURVIVOR-3 (ARCH): distribute gas starvation — gas floors + empty-reason revert (Yul) so a starved call reverts and never advances the epoch (test_distributeGasStarvationReverts).
- SURVIVOR-4 (ARCH): 50/50 split — equal capped legs, excess carries (test_splitCappedEqually).
- SURVIVOR-5 (ARCH): Hindsight double-count — one payment per tx; multi-meme payments unpriced; router fee+sweep excluded from paid.
- SURVIVOR-6 (ARCH): stale round tables — rounds after the table are read live so recompute never reverts BadRound for recent buys.
- SURVIVOR-7 (ARCH/PRD): card provenance — recompute proves pricing only; /board ranks minted cards only after /api/card-check re-derives them.
- SURVIVOR-8 (PRD): freshness defined honestly — heartbeat 24h + 1h; max deviation per fill = 3% band.
- SURVIVOR-9 (PRD): card honesty — gross buys of memes still held, not P&L; tracked-registry empty state; 'one confirmation after approvals'; team demo txs disclosed.
- SURVIVOR-10 (PLAN): deploy-day safety — .gitignore, non-interactive vercel/gh, fork deploy file separated, env vars defined, verify flags, interrogate contracts before mainnet.
- SURVIVOR-11 (ARCH, accepted risk): SPY/QQQ weekend staleness — quotes return 409 and FeePool skips + carries; documented, not hidden.
- SURVIVOR-12 (ARCH, accepted risk): uiMultiplier not in the oracle bound — curated multipliers asserted within 2% of 1 (test_curatedMultipliersNearOne), inside the 3% band.

### MUST NOT CLAIM
- Any dividend-driven burn, yield or "live dividend beat" during judging (Thesis tripwire 2).
- A projected APR or "earn X% on $WIF" headline (Thesis tripwire 1: yield must not become the headline).
- That geofencing is enforced onchain (it is a frontend control plus attestation).
- That the WIF/ETH pool hook is ours, audited or verified (it is third-party and owned; disclosed).
- That Hindsight covers buys paid in tokens other than ETH, WETH, USDG or the curated stocks (those are labelled unpriced).
- "Audited", "zero risk", "guaranteed returns".
- Any fork-only result (e.g. fork-test burns) as a mainnet event (PRD 7.6b).

## VERIFY-BEFORE-CLAIMING
Every headline number, address and hash in README, demo, submission and posts must be recomputable from a committed source: contract addresses from `deployments/4663.json`; tx hashes and totals from `scripts/proof.ts` output (`submission/proof.md`, regenerated from chain); fork-test counts from `forge test` output saved to `evidence/forge-test.txt`; Hindsight figures from `/api/hindsight` + `HindsightLens.recompute`. `scripts/verify-claims.ts` re-derives each figure in CLAIMS.md and fails on mismatch. No unbacked figure ships.

## RESOLVED DECISIONS
| # | Question | Options considered | Chosen | Why not the others | Status |
|---|---|---|---|---|---|
| D-1 | Network | testnet 46630 / mainnet 4663 | mainnet 4663 | $WIF exists only on 4663; rule 3; organizer confirmed | RESOLVED |
| D-2 | Where meme trades route | new hook pool / router over existing pools / off-chain aggregator | Terra Router over Uniswap UR (v2/v3/v4, hooked) | new pool starts empty; aggregator adds an off-chain trust hop (AMEND-4) | RESOLVED |
| D-3 | Fee + split + sweep | 0.3/0.5/1.0% · 50/50 or 60/40 · 1/2/5% | 0.5% · 50/50 · 2% (0–10%) | lower fee makes the burn invisible at demo size; higher makes routing uncompetitive | RESOLVED (OD2) |
| D-4 | Staking reward timing | per-block / hourly / daily; unstake 0/1/24h | hourly epochs, next-epoch activation, 24h unstake | per-block invites JIT; daily is invisible in a demo window | RESOLVED (OD3) |
| D-5 | Reward asset | single stock / staker picks from curated 6 | staker picks (6 sub-pools) | single stock removes the personal choice; all 37 feeds dilutes liquidity | RESOLVED (AMEND-4) |
| D-6 | Jar design | per-user vault clones / one ownerless ledger / send to wallet | one ownerless ledger contract | clones cost gas per user; wallet-direct loses the Jar story and source accounting | RESOLVED (AMEND-4) |
| D-7 | Sweep timing | batched / same tx | same tx as the trade | batching needs a keeper and custody of pending sweeps | RESOLVED (AMEND-4) |
| D-8 | Hindsight data source | full-chain log scan / per-token registry scan / HyperSync / own indexer | per-token registry scan on GetBlock (HyperSync optional) | full scan = 3,705 calls (~14 min); own indexer = infra to keep alive | RESOLVED (spike) |
| D-9 | Historical stock prices | 24/7 feed / market-hours feed | NVDA/USD market-hours feed for history, 24/7 for live fills | 24/7 feed starts 2026-11-06 | RESOLVED (spike) |
| D-10 | UR V2/V3 input layout | UR 2.0 5-field / UR 2.1 6-field with `uint256[] maxHopSlippage` | 6-field (empty array) + CONTRACT_BALANCE after an exact WRAP/push | 5-field reverts SliceOutOfBounds on this UR 2.1 (root cause proven, test/URProbe.t.sol) | RESOLVED (forge Phase 2) |
| D-11 | Token pull for sells | Permit2 / plain approve to router | plain exact approve to TerraRouter; router pushes to UR | Permit2 adds a signature for no security gain here | RESOLVED (fork spike) |
| D-12 | Keeper hosting | always-on VM / Railway / GitHub Actions cron | GitHub Actions cron + permissionless distribute | VM costs money and can sleep; distribute needs no state | RESOLVED |
| D-13 | Geofence | none / IP only / IP + attestation | IP (Vercel header) + attestation on stock leg only | none violates rule 14; IP-only is trivially wrong for VPN users | RESOLVED (OD4) |
| D-14 | Friend Jars | build now / gated / drop | gated on core green by 2026-11-11 23:59 WAT | building early is Thesis tripwire 3 | RESOLVED (OD7) |
| D-15 | Stock-paid / WETH-paid meme buys in Hindsight | estimate / receipts path / exclude | price via receipts (WETH, USDG, curated stocks) with Chainlink rounds; other tokens labelled "unpriced" | estimates break invariant 7; exclusion leaves a visible coverage gap | RESOLVED (Dami 2026-11-10, Phase 1.5) |
| D-18 | Extra $WIF utility | none / staker fee discount | 0.3% fee for >= 10K active stake | reads stake amount, never a price | RESOLVED (Dami 2026-11-10) |
| D-19 | Live stream transport | browser WSS to GetBlock / server SSE proxy / polling | server SSE proxy over GetBlock WSS with polling fallback | browser WSS would leak the shared endpoint | RESOLVED |
| D-16 | Deployed contract addresses | n/a | n/a | build-discovered fact | OPEN (fact) |
| D-17 | GetBlock getLogs limits | n/a | n/a | build-discovered fact | OPEN (fact) |

## SOURCE LOCK
| External identifier | Version / commit / digest / bytes | Verify command | Expected output | Status |
|---|---|---|---|---|
| Universal Router | 0x8876789976dEcBfCbBbe364623C63652db8C0904 | `cast code 0x8876789976dEcBfCbBbe364623C63652db8C0904 --rpc-url $RPC \| wc -c` | > 2 (code present) | [VERIFIED-in-forge] (fork spike 5/5) |
| WIF/ETH hook | 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044, 15,167 bytes, flags 0x2044 | `cast codesize 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044 --rpc-url $RPC` | 15167 | [VERIFIED-in-forge] |
| $WIF burn | ERC20Burnable `burn(uint256)` | fork `test_buyAndBurnWif` | supply delta == burned | [VERIFIED-in-forge] |
| NVDA/USD early scaling | roundIds 18446744073709551617..51640 scaled ×1e8 | `cast call 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 "getRoundData(uint80)(uint80,int256,uint256,uint256,uint80)" 18446744073709551640 --rpc-url $RPC` | answer 2030652000000000000 | [VERIFIED-in-forge] |
| viem chain def | `robinhood` (id 4663) in viem >= the version containing chains/definitions/robinhood.ts | `node -e "console.log(require('viem/chains').robinhood.id)"` | 4663 | [UNVERIFIED-build-gate] |
| forge-std | lib/forge-std (installed by forge init 1.4.4) | `forge --version` | 1.4.4-stable | [VERIFIED-in-forge] |
| OpenZeppelin contracts | v5.x ReentrancyGuard, SafeERC20 | `forge install OpenZeppelin/openzeppelin-contracts@v5.1.0` | installs | [UNVERIFIED-build-gate] |

## ESCALATE, DON'T FABRICATE
On any gate/task failure: stop, record BLOCKED with the failing gate name, and NEVER substitute a mock, cached result, stored-success response, or fabricated count. Triage when over budget: cut stretch, then P1; NEVER a P0 or a security invariant. Escalate after 2 failures on the same gate. External human review, if any, is `[HUMAN_REVIEW_REQUIRED]` documentation, never a blocking build gate.
