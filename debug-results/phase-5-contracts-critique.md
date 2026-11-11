# Phase 5 — Contracts Senior-Dev Critique

Scope: `contracts/src/*` (TerraRouter, Jar, FeePool, WifStaking, StockOracle, HindsightLens, FriendJar, lib/URCodec, interfaces/IExternal), `contracts/script/TerraConfig.sol`, against INVARIANTS.md + SECURITY.md. Tests skimmed: `test/TerraFirma.t.sol`, `test/HindsightLens.t.sol`, `test/URProbe.t.sol`.

**Counts: MUST-FIX 1 · SHOULD-FIX 5 · NOTE 11**

The contracts are ownerless and immutable, so anything below has to be fixed **before** the mainnet deploy. Nothing can be patched afterwards.

---

## MUST-FIX

### M-1 WifStaking: stakes in two consecutive epochs corrupt the pending buckets. Another staker's $WIF can be locked forever (fund loss, INV-5)
`contracts/src/WifStaking.sol:227-240` (`_addPending`), `:242-252` (`_removePending`), `:271-273` (`_touch`)

- Each staker records one `pending` amount and one `pendingEpoch`, but the pool keeps up to two buckets. Say a staker has unmatured pending from epoch e and stakes again in e+1. `_addPending` adds the new amount to bucket e+1 and sets `s.pendingEpoch = e+1` for the **whole** amount. The older amount is still in bucket e.
- Consequence A (stranded value): bucket e matures at e+2 and is added to `activeTotal`. The staker is only activated at e+3, so the rewards notified at e+2 go to a share that nobody owns and stay in the contract forever. `poolInfo` shows 100 active while `activeOf(alice) == 0`.
- Consequence B (another user's funds locked): `_removePending(stockId, s.pendingEpoch, s.pending)` removes the whole amount from bucket e+1, which also holds other users' stakes. If that bucket drops to 0, `_rollPool` skips it (`b.amount == 0`), so `rollAccPlusOne[id][e+1]` is never written. From then on, every other staker from epoch e+1 hits `rollAccPlusOne[...] - 1` → **0 − 1 underflow panic** in `_touch`. Because `stake`, `switchStock`, `requestUnstake` and `claim` all call `_touch` first, those stakers' $WIF is locked permanently. The view `pending()` hides the problem because it treats `r == 0` as `base = p.acc`, which is inconsistent with `_touch`.
- Exploit (deliberate griefing, costs the attacker nothing): attacker stakes X in epoch e, then 1 wei in e+1. Victims stake in e+1. The attacker calls `requestUnstake(X+1)`, which drains bucket e+1, and withdraws everything 24 h later. Every victim of e+1 is bricked. It can also happen by accident when a normal user tops up their stake an hour later.
- Also: if the same user calls `requestUnstake` (or `switchStock`) at e+2, it reverts `Insufficient` (temporary self-lock).
- **Proven** by a local non-fork test, `/private/tmp/claude-501/-Users-MAC-wif-hack/11807d88-2227-4a2c-945b-079dc7945fd8/scratchpad/stk/test/Lock.t.sol`, 2/2 PASS:
  - `test_crossEpochPendingLocksOtherStaker`: after Alice's `requestUnstake(101e18)`, Bob's `requestUnstake`, `claim` and `switchStock` all revert `stdError.arithmeticError`. Alice still withdraws her full 1000e18.
  - `test_selfOnlyTwoStakesBlocksUnstakeAtE2`: `poolInfo(0).activeTotal == 100e18` while `activeOf(alice) == 0`, and `requestUnstake(101e18)` reverts `Insufficient`.
- Fix (minimal): when a staker adds pending while older unmatured pending exists, move the older amount to the new epoch (a conservative re-date). Also make `_touch` defensive.
  ```solidity
  // _addPending, after _rollPool(stockId):
  if (s.pending > 0 && s.pendingEpoch != e) {
      _removePending(stockId, s.pendingEpoch, s.pending); // older amount re-dated to e
      amount += s.pending;
      s.pending = 0;
  }
  // _touch:
  uint256 r = rollAccPlusOne[s.stockId][s.pendingEpoch];
  uint256 base = r == 0 ? p.acc : r - 1;
  ```
- Regression test to add to the fork suite: `test_topUpNextEpochNoLock`. Run the attack sequence above, then assert Bob's `requestUnstake(100e18)` succeeds, and that after a distribute `sum(activeOf) == poolInfo.activeTotal`.

---

## SHOULD-FIX

### S-1 FeePool: anyone can switch off the $WIF burn forever with a huge `wifMinOut` (griefs the thesis burn)
`contracts/src/FeePool.sol:87-117`
- `distribute` is permissionless and passes the caller's `wifMinOut` into the swap. An absurd value makes the swap revert with a reason, the catch emits `BurnSkipped`, and **the epoch still advances**. The repo's own `test_burnFailureEmitsAndCarries` does exactly this with `distribute(type(uint128).max)`.
- Exploit: a griefer front-runs the keeper once an hour (cheap gas on L2). `totalWifBurned` never moves again: no fund loss, but the headline burn is dead and the contract can't be changed.
- Fix: a failure caused by the caller's own guard should revert, not skip. For example, `if (minOut > 0) revert BurnFailed(reason)` in the catch block, so the keeper's `distribute(0)` path still skips and carries when the hook itself fails. Or drop the parameter (the cap already bounds any loss to dust).
- Test: `test_highWifMinOutCannotSkipBurn`. Call `distribute(type(uint128).max)` and expect a revert, with `lastEpoch` unchanged.

### S-2 FeePool: `_revertIfEmpty` doesn't see out-of-gas inside the v4 hook, because v4-core wraps hook reverts
`contracts/src/FeePool.sol:112-114, 137-146`
- The WIF pool hook has flags `0x2044`, which means afterSwap and afterSwapReturnDelta are on. When the hook call fails, v4-core `Hooks.callHook` re-raises it as `WrappedError(hook, selector, reason, details)`. That is **never** an empty revert. A hook that runs out of gas would therefore be caught as a non-empty reason → `BurnSkipped` → the epoch advances (the SURVIVOR-3 defence is bypassed). Today the only real defence is the 400k gas floor. `test_distributeGasStarvationReverts` passes only because the hook happens to use little gas.
- Separate risk: a hook owner who makes the hook `revert()` with no data, outside the PoolManager wrap path (for example in an unlock callback), would make every `distribute` revert `InsufficientGas`. Fee ETH would then be locked in FeePool forever.
- Fix: detect out-of-gas by measuring gas, not by the size of the revert data. Save `uint256 g = gasleft()` before the `try`. In the catch, treat it as out-of-gas only when `gasleft() < g / 64 + margin`, and revert in that case. Skip on everything else, empty reasons included.
- Test: `test_hookStarvationDoesNotAdvanceEpoch`. Use a mock hook that loops until out of gas, and assert the epoch doesn't advance. Plus `test_emptyRevertHookSkipsNotBricks`: a mock UR that does `revert()` while plenty of gas is left should emit `BurnSkipped`.

### S-3 HindsightLens: round bracketing at a phase boundary accepts the last round of an old phase for any later `ts` (lets someone forge card pricing, INV-8)
`contracts/src/HindsightLens.sol:90-98`
- Chainlink round ids are `phaseId<<64 | n`. At the last round of a phase, `rid + 1` doesn't exist. The OCR2 aggregator `getRoundData` returns zeros instead of reverting, so `nextAt == 0` passes the check. `rid < latest` stays true across phases, so that stale round "brackets" every later timestamp. A card could then be priced with an old ETH or stock price, and `recompute` would bless it. The bug is latent until a curated feed gets a second phase (a Chainlink aggregator upgrade), which can happen while the contract is live and immutable.
- Fix: when `nextAt == 0 && rid < latest`, require `uint16(rid >> 64) < uint16(latest >> 64)`. Also require that the first round of the next phase is later than `ts`, or simply revert `BadRound`.
- Test: `test_phaseBoundaryRoundRejectedForLaterTs`. Mock a feed with phase 1 rounds {1..3} and phase 2 rounds {1..}. Calling `recompute` with rid = phase-1 round 3 and a `ts` after phase-2 round 1 must revert `BadRound`.

### S-4 TerraRouter `convert`: the meme→ETH legs have no minimum at all
`contracts/src/TerraRouter.sol:152-171, 233-245`
- Each `_sellToEth` call swaps with `minOut = 0`. The only guard is the final `minStockOut`. If a user or frontend passes `minStockOut = 0`, the oracle floor only bounds ETH→stock, so every meme leg can be sandwiched for 100% of its slippage. (`sell` is protected by `minEthOut`.)
- Fix: add a `minEthOut` (total proceeds) parameter to `convert`, or require `minStockOut > 0`. At minimum, have the UI always send a quote-derived `minStockOut`.
- Test: `test_convertSandwichedMemeLegReverts`. Push the PONS pool price before `convert(..., minStockOut = quote*0.99)` and expect `Slippage`.

### S-5 WifStaking `requestUnstake` resets `unlockAt` for everything already queued
`contracts/src/WifStaking.sol:141-142`
- A second request, even for 1 wei, pushes the unlock of the whole earlier queued amount out by another 24 h. During judging, a user who unstakes in two steps sees `Locked` again. Nobody loses funds, but it is a revert the demo can show and a griefing risk for the user's own funds.
- Fix: document it in the UI, or only extend the lock when `s.unstaking == 0` was true before the request.
- Test: `test_secondUnstakeDoesNotRelockFirst`. Call `requestUnstake(a)`, warp 23 h, call `requestUnstake(1)`, warp 1 h. `withdraw()` should succeed (with the fix).

---

## NOTE

- **N-1 FriendJar share accounting is sound.** `stockOf` can only grow through `contribute`, so there is no donation or first-depositor inflation path. Shares start at 1:1 and drift only by rounding, which favours the group. Small edge: a contribution with `stockOut * totalShares < stockOf` mints 0 shares, and that stock is gifted to the group (`FriendJar.sol:74`). Consider `if (shares == 0) revert`.
- **N-2 FriendJar invites are public.** `join` puts the plaintext code in calldata, and a short code can be brute-forced from `inviteHash`. The impact is only "an outsider can add their own ETH". Don't market invites as private.
- **N-3 `deposit` emits `Swept`** (`TerraRouter.sol:178`). Hindsight or stream indexers can't tell a deposit from a trade sweep, even though SURVIVOR-5 says sweeps are excluded from "paid". Use a separate `Deposited` event or check `source`. Also, `Traded` on `sell` reports `amountIn`, not the amount actually received (`got`), for fee-on-transfer tokens (`:148`).
- **N-4 v4 routes accept any `fee/tickSpacing/hooks`** (`TerraRouter.sol:203-204`). Only the caller's own trade is exposed, because the router holds no balance between transactions and `nonReentrant` blocks hook re-entry. Fine, but the UI must only build curated keys.
- **N-5 Fee-on-transfer tokens on v4 sells revert.** `SETTLE(currency1, got, false)` asks the UR to pay `got`, but the UR received less (`URCodec.sol:64`). The v2/v3 paths handle this through CONTRACT_BALANCE. This is a clean revert, not a loss.
- **N-6 StockOracle `block.timestamp - updatedAt` underflows** (`StockOracle.sol:62,68`) if a feed's `updatedAt` is ever ahead of the block time. In that case `isFreshFeed` would revert instead of returning false and brick `distribute`. Low likelihood. `updatedAt >= block.timestamp ||` guard is cheap.
- **N-7 SPY/QQQ use market-hours feeds as their live feed** (`TerraConfig.sol:68-75`). The community vote runs Nov 14-16, which is Sat-Mon. SPY/QQQ deposits and sweeps revert `StaleOracle` all weekend. This is an accepted risk (SURVIVOR-11), but the demo must not use SPY/QQQ, and the UI must hide them or disable them with the 409.
- **N-8 The 3% band versus pool fees.** SNDK's path is 0.05% + 1% fee plus price impact, and after-hours prices on 24/7 Stock Token pools can drift from the oracle. Large sweeps will revert `Slippage`. Keep demo sizes small. Separately, a griefer can push a thin stock pool more than 3% inside one transaction, call `distribute`, and swap back. That skips the stock leg (the ETH carries), so it is griefing, not theft.
- **N-9 `recompute`'s `usdNow8`** uses the raw `latestRoundData` answer without the >0 check or the `SCALED_THRESHOLD` normalisation (`HindsightLens.sol:63-64`). A negative answer would be cast to a huge `uint`. Route it through `historicalAnswer8` / `read`. Also, `CardMinted.stockId` is not indexed.
- **N-10 `distribute` gas need.** It needs up to 400k plus 6 × 450k ≈ 3.1M gas with all 6 pools live. The keeper must set a gas limit of at least 3.5M rather than rely on a tight estimate, or a valid run reverts `InsufficientGas`.
- **N-11 Dead or duplicated code.** `IWETH` and `IWIF.totalSupply` are unused. `read` and `isFreshFeed` duplicate the freshness logic. Router `SRC_*` duplicates `Jar.SOURCE_*` (they must stay in sync). The constructor parameter `ethUsd` shadows the function `ethUsd()` (compiler warning). No function is over 50 lines and nesting stays at 3 or less.

## Verified clean (checked, no finding)
- ETH accounting: `fee + sweep + trade == msg.value` (trade is the remainder). In `sell` and `convert` all proceeds are spent. Router ETH is measured by balance difference, so ETH sent to the router by someone else is never credited.
- Invariant 1: input-token checks on v2 `path[0]`, v3 first address plus USDG-only middle hop, and v4 `currency1`. $WIF can't be an input in any `sell`/`convert` route.
- `_revertIfEmpty` selector: `0x1c26714c` == `cast sig "InsufficientGas()"`. `revert(0x1c, 4)` is correct.
- Jar `credit` checks the depositor and that the credit is backed. `withdraw` only debits `msg.sender` and follows checks-effects-interactions. Staking `_claim` transfers to the Jar before crediting.
- Epoch math: `lastEpoch = e+1` means one distribute per epoch, and `canDistribute` agrees. FeePool and staking share `start`, which the deploy script aligns to the hour.
- `notifyReward` can't revert with `NoActiveStake` inside `distribute`: `rollAll` runs before the weights are read, so `w[i] > 0` implies `activeTotal > 0`.
- Out-of-range `stockId` reverts through `StockOracle.stock` (BadStock), and staking checks `< 6`.
- Reward rounding in `acc` always rounds down, so the contract never owes more than it holds. Even under M-1, payouts are too low, never too high.
