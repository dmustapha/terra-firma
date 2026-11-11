# Security

Terra Firma is unaudited hackathon software on Robinhood Chain mainnet (chain id 4663). This file states what the
code defends against, where, what it does not defend against, and the weaknesses we know about in our own design.

## Scope

- Contracts in `contracts/src`: TerraRouter, Jar, FeePool, WifStaking, StockOracle, HindsightLens, FriendJar
  (plus `lib/URCodec.sol`, `interfaces/IExternal.sol`). All are ownerless: no owner, no pause, no upgrade, no admin withdraw.
- Web API routes in `web/app/api` (`hindsight`, `quote`, `card-check`, `geo`, `health`, `qn-jar`, `stream`): read-only;
  they never hold keys or sign transactions.
- Keeper (`scripts/keeper.ts`, `.github/workflows/keeper.yml`): calls the permissionless `FeePool.distribute` from a
  dedicated low-balance key; it cannot move user funds.

## Threat matrix

| Threat | Enforcement | File |
|---|---|---|
| T1 Caller injects arbitrary Universal Router commands to drain router-held funds | Router never accepts raw commands; it encodes every command byte itself from a typed `Route` with `kind` in {1,2,3} and validated path endpoints; anything else reverts `BadRoute` (tests: `test_badKindReverts`, `test_routeTokenMismatchReverts`, `test_badMidHopReverts`) | `contracts/src/TerraRouter.sol:_validate` |
| T2 Sandwich on the stock leg | In-contract Chainlink-bounded minimum `oracle.minStockOut(stockId, ethIn)` (price − `BAND_BPS` 3%), enforced as `max(userMin, oracleMin)`; short fill reverts `Slippage` (test: `test_userMinStockEnforced`) | `contracts/src/TerraRouter.sol:_ethToJar`, `contracts/src/StockOracle.sol:minStockOut` |
| T3 Stale or paused oracle fill | `answer > 0` else `BadAnswer`; `updatedAt` within `MAX_AGE` (25 h) else `StaleOracle` (router reverts); FeePool checks `isFresh` and skips + carries (test: `test_staleOracleReverts`) | `contracts/src/StockOracle.sol:read`, `contracts/src/FeePool.sol:_streamToStakers` |
| T4 Just-in-time staking to capture an epoch | stake placed in epoch e matures only when `placedEpoch + 1 < currentEpoch()` (earns from e+2); `requestUnstake` stops earning at once, funds unlock after `UNSTAKE_DELAY` 24 h; no reward accrues (tests: `test_jitStakeEarnsNothing`, `test_boundaryStakeEarnsNothing`, `test_unstakeDelay`) | `contracts/src/WifStaking.sol:_matured`, `contracts/src/WifStaking.sol:requestUnstake` |
| T5 Reentrancy via token callbacks or hooks | OpenZeppelin `nonReentrant` on every state-changing external (`buy`, `sell`, `convert`, `deposit`, `withdraw`, `stake`, `claim`, `distribute`, ...); checks-effects-interactions; reverts `ReentrancyGuardReentrantCall` | `contracts/src/TerraRouter.sol:buy`, `contracts/src/Jar.sol:withdraw`, `contracts/src/FeePool.sol:distribute`, `contracts/src/WifStaking.sol:claim` |
| T6 Selling users' $WIF (thesis violation) | input-token check on every sell/convert route: `token == wif` reverts `WifNotSellable` before any transfer (tests: `test_sellWifReverts`, `test_convertWifReverts`) | `contracts/src/TerraRouter.sol:_validate` |
| T7 $WIF price manipulation to extract from the burn buy | no $WIF price in value logic; the burn buy spends a fixed ETH leg capped at `MAX_WIF_BUY_ETH` per epoch; caller `wifMinOut` only adds protection; excess ETH carried (test: `test_splitCappedEqually`) | `contracts/src/FeePool.sol:distribute`, `contracts/src/FeePool.sol:_buyAndBurn` |
| T8 Unauthorized Jar credit (inflate a balance) | `credit()` only from the immutable router/staking addresses else `NotDepositor`; only up to the token balance actually received else `Unbacked`; `withdraw` debits `msg.sender` only (tests: `test_jarCreditGuards`, `test_jarWithdrawOnlyOwnBalance`) | `contracts/src/Jar.sol:credit` |
| T9 Third-party hook changes behaviour (owned, unverified) | min-out on the WIF buy; `try/catch` around the swap: a revert emits `BurnSkipped` and the ETH carries (an empty revert, i.e. out-of-gas, reverts `InsufficientGas` instead of skipping) (test: `test_burnFailureEmitsAndCarries`); disclosed below | `contracts/src/FeePool.sol:_buyAndBurn` |
| T10 Forged Hindsight card | card numbers derived from logs + Chainlink rounds; `recompute()` re-derives pricing and reverts `BadRound` when a round does not bracket the buy timestamp; `/api/card-check` re-derives minted cards before ranking (tests: `test_recomputeOneEthBuy`, `test_wrongRoundReverts`) | `contracts/src/HindsightLens.sol:_priceAt`, `web/lib/hindsight.ts:buildCard` |
| T11 Dust/approval griefing (unlimited approvals) | exact-amount ERC-20 approvals, skipped when the allowance already covers the amount; never `maxUint256` | `web/components/hooks.ts:useApproveStep` |
| T12 Admin key compromise | no owner, no upgradeability, no pause; every address and constant is immutable from the constructor (test: `test_noOwnerFunctions`) | `contracts/script/TerraConfig.sol:deployAll` |

## Third-party dependencies (disclosure)

- WIF/ETH Uniswap v4 pool hook `0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044`: third-party, owned by
  `0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd`, unverified source, `afterSwapReturnDelta` (takes ~1% of output).
  It is not ours, not audited and not verified by us. Terra Firma only buys $WIF through it with a capped size
  (`MAX_WIF_BUY_ETH`) and a `try/catch` that carries the ETH on failure.
- Chainlink feeds (trusted for freshness and correctness), Uniswap Universal Router 2.1
  (`0x8876789976dEcBfCbBbe364623C63652db8C0904`), and the Stock Token contracts (issuer-controlled ERC-20s).

## Not defended against

- Wrong-but-fresh Chainlink answers (the band trusts the feed).
- The hook owner changing fees within its own rules.
- Determined geofence bypass: the restriction is a frontend control plus attestation only; contracts cannot geofence without identity.
- MEV on the meme leg beyond the user's chosen min-out.
- Stock Token issuer actions (pauses, transfer restrictions, multiplier changes).

<!-- [CRITIQUE E-4] -->
## Known weaknesses (our own)

Critical-review survivors (INVARIANTS.md, forge Phase 3.5) and accepted risks, stated plainly:

| # | Weakness / finding | Status in code |
|---|---|---|
| SURVIVOR-1 | Cross-pool accrued drain: switching pools could pay old accrued rewards in the new stock | fixed — old accrued paid in the old stock first (`test_crossPoolAccruedNoDrain`) |
| SURVIVOR-2 | Boundary JIT: stake one block before an epoch boundary, then distribute | fixed — activation at e+2 (`test_boundaryStakeEarnsNothing`) |
| SURVIVOR-3 | Distribute gas starvation: a starved call could skip legs and still advance the epoch | fixed — gas floors + empty-reason revert (`test_distributeGasStarvationReverts`) |
| SURVIVOR-4 | 50/50 split skew when one leg is capped | fixed — equal capped legs, excess carries (`test_splitCappedEqually`) |
| SURVIVOR-5 | Hindsight double-count of one payment across several memes | fixed — one payment per tx; multi-meme payments shown unpriced; router fee + sweep excluded from "paid" |
| SURVIVOR-6 | Stale committed round tables would make recompute revert `BadRound` for recent buys | fixed — rounds after the table are read live (`web/lib/rounds.ts:roundAtLive`) |
| SURVIVOR-7 | Recompute proves pricing, not provenance | accepted — the tx hashes prove the buys; `/board` ranks minted cards only after `/api/card-check` re-derives them |
| SURVIVOR-8 | "Fresh" was ambiguous | defined — heartbeat 24 h + 1 h (`MAX_AGE`); max deviation per fill = 3% band (`BAND_BPS`) |
| SURVIVOR-9 | Card could read as P&L | defined — gross buys of memes still held, not P&L; team demo txs disclosed |
| SURVIVOR-10 | Deploy-day leaks (keys, fork deploy file) | mitigated — `.gitignore`, `scripts/clean-room.sh` secret scan, fork deployments file separated |
| SURVIVOR-11 | SPY/QQQ weekend staleness (24/5 feeds) | accepted risk — quotes return 409 and stock fills revert `StaleOracle`; FeePool skips those pools and carries |
| SURVIVOR-12 | `uiMultiplier` is not part of the oracle bound | accepted risk — curated multipliers asserted within 2% of 1 (`test_curatedMultipliersNearOne`), inside the 3% band; an issuer multiplier change outside that would break the assumption |
| Accepted | Frontend-only geofence | interface-level (IP + attestation) only; never claimed as onchain enforcement |
| Accepted | Third-party WIF/ETH hook in the burn path | owned and unverified; capped size + `try/catch` carry contain it |
| Accepted | solc 0.8.26 via-IR optimizer hang | the `reason.length == 0` check in `FeePool._revertIfEmpty` is written in Yul because the high-level form sent via-IR into a >10 min loop; every forge call in our scripts runs under a 600 s timeout |
| Gap | No dedicated reentrancy fork test | T5 relies on OpenZeppelin `ReentrancyGuard`; no malicious-token reentrancy test exists yet |
| Gap | Pooled custody | the Jar holds all users' Stock Tokens in one ownerless contract; each user can withdraw their own ledger balance at any time, nobody else can |

## Verification status

| Contract | Address | Blockscout source verification |
|---|---|---|
| TerraRouter | pending deploy | pending deploy |
| Jar | pending deploy | pending deploy |
| FeePool | pending deploy | pending deploy |
| WifStaking | pending deploy | pending deploy |
| StockOracle | pending deploy | pending deploy |
| HindsightLens | pending deploy | pending deploy |
| FriendJar | pending deploy | pending deploy |

Addresses come from `contracts/deployments/4663.json` after deploy; each row links to
`https://robinhoodchain.blockscout.com/address/{addr}` once verified. Fork tests: 38 passing on a mainnet fork
(block 111155803) — `evidence/forge-test.txt`; that is a fork result, not a mainnet event.

## Reporting

Open a GitHub issue titled "security" without exploit details and ask for a private channel, or use GitHub's
private vulnerability reporting on this repository. There is no bug bounty. Because the contracts are ownerless
and immutable, a confirmed issue cannot be patched in place: the fix is a disclosure here, a frontend warning, and a
redeploy that users opt into by withdrawing from the old Jar.
