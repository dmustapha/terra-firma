// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-crossepoch-lock.t.sol
// hackathon-debug Phase 6 (critique M-1 regression). Port of the Phase-5 critique repro (scratchpad stk/test/Lock.t.sol),
// inverted to assert the FIXED behaviour of WifStaking._addPending: a top-up one epoch after an unmatured stake re-dates
// the older pending into the new bucket, so (1) another staker of that epoch is never locked by the first staker's
// unstake, and (2) no matured bucket is left without an owner (no stranded rewards, sum(activeOf) == activeTotal).
// Local (non-fork) test: a mintable $WIF stand-in, a real Jar and a one-function oracle stand-in for claim().
// Run: scripts/forge.sh test --match-path test/debug-p6-crossepoch-lock.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";

contract MintableToken is ERC20 {
    constructor(string memory s) ERC20(s, s) {}

    function mint(address a, uint256 x) external {
        _mint(a, x);
    }
}

/// Only WifStaking._claim's `oracle.token(id)` is reached in these tests.
contract TokenOracle {
    address public stockToken;

    constructor(address t) {
        stockToken = t;
    }

    function token(uint8) external view returns (address) {
        return stockToken;
    }
}

contract DebugP6CrossEpochLock is Test {
    MintableToken wif;
    MintableToken nvda;
    WifStaking st;
    Jar jar;
    address alice = address(0xA);
    address bob = address(0xB);

    function setUp() public {
        vm.warp(1_000_000 * 3600);
        wif = new MintableToken("W");
        nvda = new MintableToken("N");
        TokenOracle o = new TokenOracle(address(nvda));
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        jar = new Jar(address(0xdead), pStaking);
        st = new WifStaking(IERC20(address(wif)), StockOracle(address(o)), jar, address(this), block.timestamp);
        require(address(st) == pStaking, "predict");
        wif.mint(alice, 1000e18);
        wif.mint(bob, 1000e18);
        vm.prank(alice);
        wif.approve(address(st), type(uint256).max);
        vm.prank(bob);
        wif.approve(address(st), type(uint256).max);
    }

    /// FeePool semantics: roll, send the stock to staking, notify.
    function _notify(uint256 reward) internal {
        st.rollAll();
        nvda.mint(address(st), reward);
        st.notifyReward(0, reward);
    }

    function test_crossEpochPendingDoesNotLockOtherStaker() public {
        vm.prank(alice);
        st.stake(100e18, 0); // epoch e
        vm.warp(block.timestamp + 1 hours); // e+1
        vm.prank(alice);
        st.stake(1e18, 0); // older 100 re-dated into bucket e+1 with the top-up
        vm.prank(bob);
        st.stake(100e18, 0); // bucket e+1 = 201
        vm.prank(alice);
        st.requestUnstake(101e18); // removes only alice's 101
        vm.warp(block.timestamp + 3 hours); // e+4: bob's batch matured
        _notify(1e18);
        (uint256 act,,) = st.poolInfo(0);
        assertEq(act, 100e18, "only bob is active");
        assertEq(st.activeOf(bob), act, "sum(activeOf) == activeTotal");
        (, uint256 pb) = st.pending(bob);
        assertApproxEqAbs(pb, 1e18, 1, "bob owns the whole reward: nothing stranded");
        vm.startPrank(bob);
        assertApproxEqAbs(st.claim(), 1e18, 1, "claim works");
        st.switchStock(1); // no underflow lock
        st.requestUnstake(100e18); // no underflow lock
        vm.stopPrank();
        assertApproxEqAbs(jar.balanceOf(bob, address(nvda)), 1e18, 1, "reward in Jar");
        vm.warp(block.timestamp + 24 hours);
        vm.prank(alice);
        st.withdraw();
        vm.prank(bob);
        st.withdraw();
        assertEq(wif.balanceOf(alice), 1000e18, "alice exits whole");
        assertEq(wif.balanceOf(bob), 1000e18, "bob exits whole");
    }

    function test_selfTwoStakesNoPhantomActiveAtE2() public {
        vm.prank(alice);
        st.stake(100e18, 0);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(alice);
        st.stake(1e18, 0);
        vm.warp(block.timestamp + 1 hours); // e+2: the re-dated 101 activates at e+3, never a bucket nobody owns
        st.rollAll();
        (uint256 act, uint256 waiting,) = st.poolInfo(0);
        assertEq(act, 0, "no phantom active stake");
        assertEq(waiting, 101e18, "all of alice's stake waits together");
        assertEq(st.activeOf(alice), act);
        vm.prank(alice);
        st.requestUnstake(101e18); // no Insufficient self-lock
        vm.warp(block.timestamp + 1 hours); // e+3
        vm.prank(bob);
        st.stake(10e18, 0);
        vm.warp(block.timestamp + 2 hours);
        _notify(5e17);
        (act,,) = st.poolInfo(0);
        assertEq(act, st.activeOf(alice) + st.activeOf(bob), "sum(activeOf) == activeTotal");
        (, uint256 pb) = st.pending(bob);
        assertApproxEqAbs(pb, 5e17, 1, "no stranded reward");
    }
}
