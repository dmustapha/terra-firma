// SPDX-License-Identifier: MIT
// File: contracts/src/WifStaking.sol
// [ASSUMED] original accounting (MasterChef-style accRewardPerShare + epoch-batched activation);
// CAUTION: test immediately - covered by test/WifStaking.t.sol (JIT, multi-epoch, switch, unstake).
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {StockOracle} from "./StockOracle.sol";
import {Jar} from "./Jar.sol";

/// @title WifStaking — "Stake $WIF, earn real stocks."
/// @notice Stake $WIF into one of 6 reward sub-pools (one per curated stock). The FeePool streams real
///         Stock Tokens to each sub-pool every hourly epoch. A stake placed in epoch e becomes active at the
///         start of epoch e+2, so it must sit through one full epoch of fee accrual (e+1) before it shares any
///         distribution: a late stake plus an immediate permissionless distribute() captures nothing
///         (anti just-in-time). Unstaking stops rewards immediately and unlocks after 24h.
///         Claimed rewards are credited to the staker's Jar.
contract WifStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SOURCE_REWARD = 3;
    uint256 public constant EPOCH = 1 hours;
    uint256 public constant UNSTAKE_DELAY = 24 hours;
    uint256 private constant ACC = 1e18;

    IERC20 public immutable wif;
    StockOracle public immutable oracle;
    Jar public immutable jar;
    address public immutable feePool;
    uint256 public immutable start;

    /// @dev Stakes waiting to activate, bucketed by the epoch they were placed in. Only epochs current-1 and
    ///      current can still be pending (older buckets are rolled), so two buckets always suffice.
    struct Bucket {
        uint256 epoch;
        uint256 amount;
    }

    struct Pool {
        uint256 activeTotal;
        uint256 acc; // accumulated reward per active share, scaled by 1e18
        Bucket[2] pend;
    }

    struct Staker {
        uint8 stockId;
        uint256 active;
        uint256 pending;
        uint256 pendingEpoch;
        uint256 rewardDebt; // active * acc / 1e18 at last settle
        uint256 accrued; // settled, unclaimed reward (stock token units)
        uint256 unstaking;
        uint256 unlockAt;
    }

    Pool[6] internal pools;
    mapping(address => Staker) public stakers;
    /// @dev acc value at the moment the batch placed in `epoch` became active, per pool (+1 to mark "rolled").
    mapping(uint8 => mapping(uint256 => uint256)) public rollAccPlusOne;

    event Staked(address indexed user, uint256 amount, uint8 stockId, uint256 activeEpoch);
    event Switched(address indexed user, uint8 fromStock, uint8 toStock, uint256 amount);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockAt);
    event Withdrawn(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint8 stockId, uint256 amount);
    event RewardNotified(uint8 indexed stockId, uint256 epoch, uint256 amount, uint256 activeTotal);

    error NotFeePool();
    error ZeroAmount();
    error BadStock();
    error Locked();
    error Insufficient();
    error NoActiveStake();

    constructor(IERC20 wif_, StockOracle oracle_, Jar jar_, address feePool_, uint256 start_) {
        wif = wif_;
        oracle = oracle_;
        jar = jar_;
        feePool = feePool_;
        start = start_;
    }

    function currentEpoch() public view returns (uint256) {
        return (block.timestamp - start) / EPOCH;
    }

    // ------------------------------------------------------------------ user actions

    function stake(uint256 amount, uint8 stockId) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (stockId >= 6) revert BadStock();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        if (s.active + s.pending > 0 && s.stockId != stockId) revert BadStock(); // use switchStock
        // Rewards accrued in the old pool must be paid in the old pool's stock before the pool changes.
        if (s.stockId != stockId && s.accrued > 0) _claim(msg.sender);
        wif.safeTransferFrom(msg.sender, address(this), amount);
        s.stockId = stockId;
        _addPending(s, stockId, amount);
        emit Staked(msg.sender, amount, stockId, currentEpoch() + 1);
    }

    /// @notice Move your whole stake to another reward stock. Claims first; earns in the new pool from next epoch.
    function switchStock(uint8 stockId) external nonReentrant {
        if (stockId >= 6) revert BadStock();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        _claim(msg.sender);
        uint8 from = s.stockId;
        uint256 amount = s.active + s.pending;
        if (amount == 0) revert NoActiveStake();
        Pool storage p = pools[from];
        p.activeTotal -= s.active;
        _removePending(from, s.pendingEpoch, s.pending);
        s.active = 0;
        s.pending = 0;
        s.rewardDebt = 0;
        s.stockId = stockId;
        _addPending(s, stockId, amount);
        emit Switched(msg.sender, from, stockId, amount);
    }

    /// @notice Stop earning on `amount` now; it unlocks after UNSTAKE_DELAY. Pending stake is removed first.
    function requestUnstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        if (amount > s.active + s.pending) revert Insufficient();
        Pool storage p = pools[s.stockId];
        uint256 fromPending = amount <= s.pending ? amount : s.pending;
        s.pending -= fromPending;
        _removePending(s.stockId, s.pendingEpoch, fromPending);
        uint256 fromActive = amount - fromPending;
        if (fromActive > 0) {
            s.active -= fromActive;
            p.activeTotal -= fromActive;
            s.rewardDebt = s.active * p.acc / ACC;
        }
        s.unstaking += amount;
        s.unlockAt = block.timestamp + UNSTAKE_DELAY;
        emit UnstakeRequested(msg.sender, amount, s.unlockAt);
    }

    function withdraw() external nonReentrant {
        Staker storage s = stakers[msg.sender];
        if (block.timestamp < s.unlockAt) revert Locked();
        uint256 amount = s.unstaking;
        if (amount == 0) revert ZeroAmount();
        s.unstaking = 0;
        wif.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Credit your accrued reward stock to your Jar.
    function claim() external nonReentrant returns (uint256 amount) {
        _touch(msg.sender);
        amount = _claim(msg.sender);
    }

    // ------------------------------------------------------------------ fee pool hooks

    /// @notice Activate every pool's pending buckets placed at least two epochs ago. Called by FeePool before weighing.
    function rollAll() external {
        for (uint8 i; i < 6; ++i) {
            _rollPool(i);
        }
    }

    /// @notice FeePool already sent `amount` of the stock token here; distribute it over active stake.
    function notifyReward(uint8 stockId, uint256 amount) external {
        if (msg.sender != feePool) revert NotFeePool();
        Pool storage p = pools[stockId];
        if (p.activeTotal == 0) revert NoActiveStake();
        p.acc += amount * ACC / p.activeTotal;
        emit RewardNotified(stockId, currentEpoch(), amount, p.activeTotal);
    }

    // ------------------------------------------------------------------ views

    function activeStake(uint8 stockId) external view returns (uint256 total) {
        Pool storage p = pools[stockId];
        total = p.activeTotal;
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].amount > 0 && _matured(p.pend[k].epoch)) total += p.pend[k].amount;
        }
    }

    /// @notice Pool totals for UIs: active stake, stake still waiting to activate, accumulator.
    function poolInfo(uint8 stockId) external view returns (uint256 activeTotal, uint256 waiting, uint256 acc) {
        Pool storage p = pools[stockId];
        activeTotal = p.activeTotal;
        for (uint256 k; k < 2; ++k) {
            if (_matured(p.pend[k].epoch)) activeTotal += p.pend[k].amount;
            else waiting += p.pend[k].amount;
        }
        acc = p.acc;
    }

    /// @notice Stake that is earning (or would be after a lazy roll). Used by TerraRouter's fee discount.
    function activeOf(address user) external view returns (uint256) {
        Staker memory s = stakers[user];
        return s.active + (s.pending > 0 && _matured(s.pendingEpoch) ? s.pending : 0);
    }

    /// @notice Claimable reward (stock token units) including not-yet-settled accrual.
    function pending(address user) external view returns (uint8 stockId, uint256 amount) {
        Staker memory s = stakers[user];
        Pool storage p = pools[s.stockId];
        amount = s.accrued + s.active * p.acc / ACC - s.rewardDebt;
        if (s.pending > 0 && _matured(s.pendingEpoch)) {
            uint256 r = rollAccPlusOne[s.stockId][s.pendingEpoch];
            uint256 base = r == 0 ? p.acc : r - 1;
            amount += s.pending * (p.acc - base) / ACC;
        }
        stockId = s.stockId;
    }

    // ------------------------------------------------------------------ internals

    /// @dev A bucket placed in epoch e matures (becomes active) from epoch e+2.
    function _matured(uint256 placedEpoch) internal view returns (bool) {
        return placedEpoch + 1 < currentEpoch();
    }

    function _addPending(Staker storage s, uint8 stockId, uint256 amount) internal {
        Pool storage p = pools[stockId];
        _rollPool(stockId);
        uint256 e = currentEpoch();
        uint256 slot = 2;
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].amount > 0 && p.pend[k].epoch == e) slot = k;
        }
        if (slot == 2) slot = p.pend[0].amount == 0 ? 0 : 1; // the other bucket can only hold epoch e-1
        p.pend[slot].epoch = e;
        p.pend[slot].amount += amount;
        s.pending += amount;
        s.pendingEpoch = e;
    }

    function _removePending(uint8 stockId, uint256 placedEpoch, uint256 amount) internal {
        if (amount == 0) return;
        Pool storage p = pools[stockId];
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].epoch == placedEpoch && p.pend[k].amount >= amount) {
                p.pend[k].amount -= amount;
                return;
            }
        }
        revert Insufficient();
    }

    function _rollPool(uint8 i) internal {
        Pool storage p = pools[i];
        for (uint256 k; k < 2; ++k) {
            Bucket storage b = p.pend[k];
            if (b.amount == 0 || !_matured(b.epoch)) continue;
            rollAccPlusOne[i][b.epoch] = p.acc + 1;
            p.activeTotal += b.amount;
            b.amount = 0;
        }
    }

    /// @dev Settle active rewards, then activate this staker's pending batch if its epoch has passed.
    function _touch(address user) internal {
        Staker storage s = stakers[user];
        _rollPool(s.stockId);
        Pool storage p = pools[s.stockId];
        s.accrued += s.active * p.acc / ACC - s.rewardDebt;
        if (s.pending > 0 && _matured(s.pendingEpoch)) {
            uint256 base = rollAccPlusOne[s.stockId][s.pendingEpoch] - 1; // pool rolled above
            s.accrued += s.pending * (p.acc - base) / ACC;
            s.active += s.pending;
            s.pending = 0;
        }
        s.rewardDebt = s.active * p.acc / ACC;
    }

    function _claim(address user) internal returns (uint256 amount) {
        Staker storage s = stakers[user];
        amount = s.accrued;
        if (amount == 0) return 0;
        s.accrued = 0;
        address token = oracle.token(s.stockId);
        IERC20(token).safeTransfer(address(jar), amount);
        jar.credit(user, token, amount, SOURCE_REWARD);
        emit Claimed(user, s.stockId, amount);
    }
}
