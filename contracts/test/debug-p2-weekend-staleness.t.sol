// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-weekend-staleness.t.sol
// hackathon-debug Phase 2 (known risk SURVIVOR-11: SPY/QQQ market-hours feeds go stale over the weekend). FORK tests on
// Robinhood Chain mainnet 4663. Time is warped past the real SPY feed's updatedAt + MAX_AGE (25h); ETH/USD and the NVDA
// live feed are kept fresh with vm.mockCall returning their own real round data at the new timestamp, so SPY is the
// only stale input. Expected: router.deposit(SPY) reverts StaleOracle(SPY feed) while deposit(NVDA) still works, and
// FeePool.distribute skips sub-pool 4 silently (no buy attempted, no StockBuySkipped, no reward) and carries its ETH.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-weekend-staleness.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {FeePool} from "../src/FeePool.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {IAggregatorV3} from "../src/interfaces/IExternal.sol";

contract DebugP2WeekendStaleness is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    uint8 constant SPY_ID = 4;
    Deployment d;
    address bob = address(0xB0B); // NVDA staker
    address carol = address(0xCA201); // SPY staker
    address alice = address(0xA11CE); // trader

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);
    }

    function _spyFeed() internal view returns (address) {
        return d.oracle.stock(SPY_ID).liveFeed;
    }

    /// Re-serve `feed`'s real latest round with updatedAt = now (the feed kept updating; only SPY did not).
    function _keepFresh(address feed) internal {
        (uint80 id, int256 answer, uint256 startedAt,, uint80 answeredIn) = IAggregatorV3(feed).latestRoundData();
        vm.mockCall(
            feed,
            abi.encodeWithSelector(IAggregatorV3.latestRoundData.selector),
            abi.encode(id, answer, startedAt, block.timestamp, answeredIn)
        );
    }

    function _warpPastSpyStaleness() internal {
        (,,, uint256 spyUpdated,) = IAggregatorV3(_spyFeed()).latestRoundData();
        vm.warp(spyUpdated + d.oracle.MAX_AGE() + 1);
        _keepFresh(ETH_USD);
        _keepFresh(d.oracle.stock(0).liveFeed);
        assertFalse(d.oracle.isFresh(SPY_ID), "SPY stale");
        assertTrue(d.oracle.isFresh(0), "NVDA fresh");
    }

    function _stake(address who, uint256 eth, uint8 stockId) internal returns (uint256 amount) {
        TerraRouter.Route memory r;
        r.kind = 3;
        r.key = wifKey();
        vm.startPrank(who);
        (amount,) = d.router.buy{value: eth}(r, WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, stockId);
        vm.stopPrank();
    }

    function test_spyDepositRevertsStaleOracle() public {
        _warpPastSpyStaleness();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StockOracle.StaleOracle.selector, _spyFeed()));
        d.router.deposit{value: 0.001 ether}(SPY_ID, 0);
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.001 ether}(0, 0); // control: NVDA still fills
        assertGt(out, 0, "fresh stock still fills");
    }

    function test_feePoolSkipsStaleSpyAndCarries() public {
        _stake(bob, 0.005 ether, 0);
        _stake(carol, 0.005 ether, SPY_ID);
        vm.warp(block.timestamp + 2 hours); // both stakes active
        for (uint256 i; i < 2; ++i) {
            TerraRouter.Route memory r;
            r.kind = 2;
            r.v3Path = abi.encodePacked(WETH, uint24(3000), PONS);
            vm.prank(alice);
            d.router.buy{value: 0.05 ether}(r, PONS, 0, 0, 1, 0);
        }
        _warpPastSpyStaleness();
        assertGt(d.staking.activeStake(SPY_ID), 0, "SPY pool has active stake");

        uint256 ethIn = address(d.feePool).balance;
        uint256 leg = ethIn / 2 > d.feePool.MAX_WIF_BUY_ETH() ? d.feePool.MAX_WIF_BUY_ETH() : ethIn / 2;
        vm.recordLogs();
        d.feePool.distribute(1);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 skipped = FeePool.StockBuySkipped.selector;
        bytes32 notified = WifStaking.RewardNotified.selector;
        bool burnSkipped;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics[0] == skipped) assertTrue(uint256(logs[i].topics[2]) != SPY_ID, "no buy attempted for stale SPY");
            if (logs[i].topics[0] == notified) assertTrue(uint256(logs[i].topics[1]) != SPY_ID, "no SPY reward");
            if (logs[i].topics[0] == FeePool.BurnSkipped.selector) burnSkipped = true;
        }
        (, uint256 pc) = d.staking.pending(carol);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pc, 0, "SPY staker earns nothing while SPY is stale");
        assertGt(pb, 0, "NVDA staker earns");
        assertEq(d.feePool.totalEthToStock(), leg, "whole stock leg went to the fresh pool (SPY weight excluded)");
        uint256 burnt = burnSkipped ? 0 : leg;
        assertEq(address(d.feePool).balance, ethIn - burnt - leg, "everything else carries to the next epoch");
    }
}
