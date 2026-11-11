// SPDX-License-Identifier: MIT
// File: contracts/src/FeePool.sol
// [VERIFIED] WIF buy through the owned-hook v4 pool + burn from a contract (spike-fork.md test_buyAndBurnWif);
// [VERIFIED] WETH->stock v3 leg with Chainlink min-out (spike-fork.md test_sweepToNvda).
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniversalRouter, IWIF, PoolKey} from "./interfaces/IExternal.sol";
import {URCodec} from "./lib/URCodec.sol";
import {StockOracle} from "./StockOracle.sol";

interface IWifStakingPool {
    function rollAll() external;
    function activeStake(uint8 stockId) external view returns (uint256);
    function notifyReward(uint8 stockId, uint256 amount) external;
}

/// @title FeePool
/// @notice Collects Terra Firma's protocol fees in ETH. Once per hourly epoch anyone may call distribute():
///         50% buys $WIF through the WIF/ETH v4 pool and burns all of it; 50% buys real Stock Tokens for
///         $WIF stakers, split by active stake per reward sub-pool (each leg capped at MAX_WIF_BUY_ETH per epoch),
///         each fill bounded by a fresh Chainlink price. Anything that cannot be spent safely carries over.
///         $WIF is never priced for value: the buy size depends only on ETH and a fixed cap.
contract FeePool is ReentrancyGuard {
    uint256 public constant EPOCH = 1 hours;
    uint256 public constant MAX_WIF_BUY_ETH = 0.01 ether;
    uint256 public constant MIN_DISTRIBUTE_ETH = 0.00001 ether; // one ~0.002 ETH trade funds a real burn (minimal-spend demo)
    /// @dev Gas floors so a caller cannot starve a swap into an out-of-gas "skip" while the epoch still advances.
    uint256 public constant MIN_GAS_BURN_LEG = 400_000;
    uint256 public constant MIN_GAS_STOCK_LEG = 450_000;

    IUniversalRouter public immutable ur;
    IWIF public immutable wif;
    StockOracle public immutable oracle;
    IWifStakingPool public immutable staking;
    uint256 public immutable start;
    PoolKey public wifPoolKey; // set once in constructor, never mutated

    uint256 public lastEpoch; // last epoch distributed (+1 so epoch 0 is distributable)
    uint256 public totalWifBurned;
    uint256 public totalEthToStock;

    event Distributed(
        uint256 indexed epoch, uint256 ethIn, uint256 wifBurned, uint256[6] stockBought, uint256 carried
    );
    event Received(address indexed from, uint256 amount);
    /// @notice The $WIF buy-and-burn swap failed (e.g. the third-party hook blocked it); the ETH carries to the next epoch.
    event BurnSkipped(uint256 indexed epoch, uint256 ethAmount, bytes reason);
    /// @notice A sub-pool stock buy failed (pool or band); the ETH carries to the next epoch.
    event StockBuySkipped(uint256 indexed epoch, uint8 indexed stockId, uint256 ethAmount, bytes reason);

    error EpochNotElapsed();
    error BelowThreshold();
    error OnlySelf();
    error InsufficientGas();

    constructor(
        IUniversalRouter ur_,
        IWIF wif_,
        StockOracle oracle_,
        IWifStakingPool staking_,
        PoolKey memory wifKey,
        uint256 start_
    ) {
        ur = ur_;
        wif = wif_;
        oracle = oracle_;
        staking = staking_;
        wifPoolKey = wifKey;
        start = start_;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function epoch() public view returns (uint256) {
        return (block.timestamp - start) / EPOCH;
    }

    function canDistribute() external view returns (bool) {
        return epoch() + 1 > lastEpoch && address(this).balance >= MIN_DISTRIBUTE_ETH;
    }

    /// @param wifMinOut optional slippage guard for the $WIF buy (protection only; the cap bounds any loss to dust).
    function distribute(uint256 wifMinOut) external nonReentrant {
        uint256 e = epoch();
        if (e + 1 <= lastEpoch) revert EpochNotElapsed();
        uint256 ethIn = address(this).balance;
        if (ethIn < MIN_DISTRIBUTE_ETH) revert BelowThreshold();
        lastEpoch = e + 1;

        // 50/50 split, each leg capped at MAX_WIF_BUY_ETH per epoch; anything above the caps carries forward.
        uint256 half = ethIn / 2;
        uint256 leg = half > MAX_WIF_BUY_ETH ? MAX_WIF_BUY_ETH : half;
        uint256 burned = _buyAndBurn(leg, wifMinOut);
        uint256[6] memory bought = _streamToStakers(leg);
        emit Distributed(e, ethIn, burned, bought, address(this).balance);
    }

    // ------------------------------------------------------------------ internals

    function _buyAndBurn(uint256 ethAmount, uint256 minOut) internal returns (uint256 burned) {
        if (ethAmount == 0) return 0;
        bytes memory input = URCodec.v4EthIn(wifPoolKey, ethAmount, minOut);
        if (gasleft() < MIN_GAS_BURN_LEG) revert InsufficientGas();
        try ur.execute{value: ethAmount}(URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(input), block.timestamp) {
            burned = wif.balanceOf(address(this));
            wif.burn(burned);
            totalWifBurned += burned;
        } catch (bytes memory reason) {
            _revertIfEmpty(reason); // out-of-gas looks like an empty revert: never skip on it
            burned = 0; // third-party hook or pool failure: ETH stays here and carries to the next epoch
            emit BurnSkipped(epoch(), ethAmount, reason);
        }
    }

    function _streamToStakers(uint256 ethBudget) internal returns (uint256[6] memory bought) {
        staking.rollAll();
        uint256[6] memory w;
        uint256 total;
        for (uint8 i; i < 6; ++i) {
            if (!oracle.isFresh(i)) continue; // stale feed (e.g. SPY/QQQ at weekends): skip and carry
            w[i] = staking.activeStake(i);
            total += w[i];
        }
        if (total == 0) return bought;
        for (uint8 i; i < 6; ++i) {
            if (w[i] == 0) continue;
            uint256 eth = ethBudget * w[i] / total;
            if (eth == 0) continue;
            bought[i] = _buyStockFor(i, eth);
        }
    }

    /// @dev Assembly form: the high-level `reason.length == 0` check inside a catch block sends solc 0.8.26 via-IR's
    ///      optimizer into a near-endless loop (measured: > 10 min vs 1 s), so the same check is written in Yul.
    function _revertIfEmpty(bytes memory reason) private pure {
        assembly {
            if iszero(mload(reason)) {
                mstore(0x00, 0x1c26714c) // InsufficientGas()
                revert(0x1c, 0x04)
            }
        }
    }

    function _buyStockFor(uint8 id, uint256 eth) internal returns (uint256 got) {
        address token = oracle.token(id);
        uint256 minOut = oracle.minStockOut(id, eth);
        uint256 before = IERC20(token).balanceOf(address(staking));
        bytes memory leg = URCodec.v3(address(staking), minOut, oracle.path(id));
        if (gasleft() < MIN_GAS_STOCK_LEG) revert InsufficientGas();
        try ur.execute{value: eth}(
            URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN),
            URCodec.inputs2(URCodec.wrap(eth), leg),
            block.timestamp
        ) {
            got = IERC20(token).balanceOf(address(staking)) - before;
            staking.notifyReward(id, got);
            totalEthToStock += eth;
        } catch (bytes memory reason) {
            _revertIfEmpty(reason);
            got = 0;
            emit StockBuySkipped(epoch(), id, eth, reason);
        }
    }
}
