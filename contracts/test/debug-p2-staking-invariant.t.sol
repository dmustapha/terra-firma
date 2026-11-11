// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-staking-invariant.t.sol
// hackathon-debug Phase 2 (known risk: WifStaking accounting is original [ASSUMED] logic). FORK tests on Robinhood
// Chain mainnet 4663 with the real $WIF and real Stock Tokens. The staking contract is deployed with this test as its
// FeePool so rewards can be notified exactly the way FeePool does (rollAll, weigh by activeStake, send, notify).
//   1. test_topUpAcrossEpochs_*: deterministic repros of a top-up placed one epoch after an earlier, still-pending stake.
//   2. testFuzz_stakingAccounting: seeded random stake / top-up / switch / unstake / claim / withdraw sequences over
//      3 users and many epochs with distributes in between. Checks after every step:
//        - no inflation: per pool, claimed + pending over all users <= total reward notified to that pool
//        - solvency: the contract holds every user's pending reward and every staked/unstaking $WIF
//        - no early earning: a user whose whole live stake was placed in epoch >= E-1 earns nothing from epoch E's notify
//        - no lock: claim / requestUnstake / withdraw never revert for a user acting within their balance
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-staking-invariant.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";

contract DebugP2StakingInvariant is Test, TerraConfig {
    WifStaking st;
    Jar jar;
    StockOracle oracle;
    address[3] users = [address(0xA11CE), address(0xB0B), address(0xCA7)];
    uint8 constant POOLS = 2; // NVDA, TSLA: enough to exercise switching without six-way bookkeeping

    uint256[POOLS] notified; // total reward notified per pool
    mapping(address => uint256) liveSince; // epoch of the first stake since the user's live stake was last zero
    mapping(address => uint256) staked; // test-side mirror of active + pending
    mapping(address => uint256) unstaking;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        uint256 start = block.timestamp - (block.timestamp % 1 hours);
        oracle = new StockOracle(ETH_USD, USDG_USD, stocks());
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        jar = new Jar(address(0xdead), pStaking);
        st = new WifStaking(IERC20(WIF), oracle, jar, address(this), start);
        require(address(st) == pStaking, "predict");
        for (uint256 i; i < 3; ++i) {
            deal(WIF, users[i], 1_000_000e18);
            vm.prank(users[i]);
            IERC20(WIF).approve(address(st), type(uint256).max);
        }
    }

    // ------------------------------------------------------------------ helpers

    function _epoch() internal view returns (uint256) {
        return st.currentEpoch();
    }

    function _nextEpoch() internal {
        vm.warp(block.timestamp + 1 hours);
    }

    function _stake(address u, uint256 amt, uint8 pool) internal {
        if (staked[u] == 0) liveSince[u] = _epoch();
        vm.prank(u);
        st.stake(amt, pool);
        staked[u] += amt;
    }

    /// FeePool._streamToStakers semantics: roll, weigh by activeStake, send the stock, notify (only pools with stake).
    function _distribute(uint256 reward) internal {
        st.rollAll();
        for (uint8 i; i < POOLS; ++i) {
            if (st.activeStake(i) == 0) continue;
            address tok = oracle.token(i);
            deal(tok, address(st), IERC20(tok).balanceOf(address(st)) + reward);
            st.notifyReward(i, reward);
            notified[i] += reward;
        }
    }

    function _pending(address u) internal view returns (uint8 sid, uint256 amt) {
        (sid, amt) = st.pending(u);
    }

    // ------------------------------------------------------------------ 1. deterministic repros

    /// Stake A in epoch e, top up B in e+1, unstake B in e+1. Bucket e+1 is now empty, so it is never rolled and
    /// rollAccPlusOne[pool][e+1] stays 0; every later _touch computes 0 - 1 and panics: the user's A $WIF is locked.
    function test_topUpAcrossEpochs_thenUnstakeTopUp_doesNotLock() public {
        address a = users[0];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        vm.prank(a);
        st.requestUnstake(50e18);
        vm.warp(block.timestamp + 3 hours);
        vm.prank(a);
        st.claim(); // must not revert
        vm.prank(a);
        st.requestUnstake(100e18); // the remaining stake must still be withdrawable
        vm.warp(block.timestamp + 24 hours);
        vm.prank(a);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(a), 1_000_000e18, "all $WIF returned");
    }

    /// Stake A in epoch e, top up B in e+1. In e+2 the pool activates A (bucket e matured), but the staker's pending
    /// epoch was overwritten to e+1, so the staker does not earn on A: a reward notified in e+2 is stranded forever.
    function test_topUpAcrossEpochs_rewardNotStranded() public {
        address a = users[0];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        _nextEpoch(); // e+2
        _distribute(1e18);
        vm.warp(block.timestamp + 2 hours);
        _distribute(1e18);
        (, uint256 p) = _pending(a);
        assertApproxEqAbs(p, notified[0], 1e6, "sole staker earns every notified reward");
    }

    /// A top-up must not let another user's pending bucket be drained: bob's stake must activate and stay unlockable.
    function test_topUpAcrossEpochs_switchDoesNotLockOthers() public {
        address a = users[0];
        address b = users[1];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        _stake(b, 150e18, 0);
        vm.prank(a);
        st.switchStock(1);
        vm.warp(block.timestamp + 3 hours);
        vm.prank(b);
        st.claim(); // must not revert
        assertEq(st.activeOf(b), 150e18, "bob's stake is active");
        vm.prank(b);
        st.requestUnstake(150e18);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(b);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(b), 1_000_000e18, "bob's $WIF returned");
    }

    // ------------------------------------------------------------------ 2. seeded sequence fuzz

    /// forge-config: default.fuzz.runs = 48
    function testFuzz_stakingAccounting(uint256 seed) public {
        for (uint256 step; step < 36; ++step) {
            uint256 r = uint256(keccak256(abi.encode(seed, step)));
            address u = users[r % 3];
            uint256 op = (r >> 8) % 7;
            if (op == 0 || op == 1) _opStake(u, r);
            else if (op == 2) _opSwitch(u, r);
            else if (op == 3) _opUnstake(u, r);
            else if (op == 4) _opClaim(u);
            else if (op == 5) _opWithdraw(u);
            else _opDistribute(r);
            if ((r >> 40) % 3 == 0) _nextEpoch();
            _checkNoInflation();
        }
        _drainAll();
    }

    function _opStake(address u, uint256 r) internal {
        uint256 amt = 1e18 + (r >> 16) % 50_000e18;
        uint8 pool = staked[u] > 0 ? _poolOf(u) : uint8((r >> 80) % POOLS);
        _stake(u, amt, pool);
    }

    function _opSwitch(address u, uint256 r) internal {
        if (staked[u] == 0) return;
        uint8 to = uint8((r >> 80) % POOLS);
        vm.prank(u);
        st.switchStock(to); // must not revert for a user with live stake
        liveSince[u] = _epoch(); // a switch restarts activation in the new pool
    }

    function _opUnstake(address u, uint256 r) internal {
        if (staked[u] == 0) return;
        uint256 amt = 1 + (r >> 16) % staked[u];
        vm.prank(u);
        st.requestUnstake(amt); // must not revert within the user's balance
        staked[u] -= amt;
        unstaking[u] += amt;
    }

    function _opClaim(address u) internal {
        (uint8 sid, uint256 want) = _pending(u);
        uint256 jar0 = jar.balanceOf(u, oracle.token(sid));
        vm.prank(u);
        uint256 got = st.claim(); // must never revert
        assertEq(got, want, "claim pays exactly pending()");
        assertEq(jar.balanceOf(u, oracle.token(sid)) - jar0, got, "claim credited to the Jar");
    }

    function _opWithdraw(address u) internal {
        if (unstaking[u] == 0) return;
        vm.warp(block.timestamp + 24 hours);
        uint256 bal0 = IERC20(WIF).balanceOf(u);
        vm.prank(u);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(u) - bal0, unstaking[u], "withdraw returns every unstaked $WIF");
        unstaking[u] = 0;
    }

    function _opDistribute(uint256 r) internal {
        uint256 reward = 1e12 + (r >> 120) % 1e18;
        uint256 e = _epoch();
        uint256[3] memory before;
        for (uint256 i; i < 3; ++i) (, before[i]) = _pending(users[i]);
        _distribute(reward);
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            if (staked[u] == 0 || liveSince[u] + 2 <= e) continue;
            (, uint256 nowP) = _pending(u);
            assertEq(nowP, before[i], "stake placed in epoch >= E-1 earned from epoch E's distribute");
        }
    }

    function _poolOf(address u) internal view returns (uint8 sid) {
        (sid,,,,,,,) = st.stakers(u);
    }

    function _checkNoInflation() internal view {
        uint256 wifOwed;
        uint256[POOLS] memory owed;
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            (uint8 sid, uint256 p) = _pending(u);
            owed[sid] += p;
            wifOwed += staked[u] + unstaking[u];
        }
        for (uint8 k; k < POOLS; ++k) {
            address tok = oracle.token(k);
            uint256 claimed;
            for (uint256 i; i < 3; ++i) claimed += jar.balanceOf(users[i], tok);
            assertLe(claimed + owed[k], notified[k], "rewards claimed + pending exceed rewards notified");
            assertGe(IERC20(tok).balanceOf(address(st)), owed[k], "staking cannot pay pending rewards");
        }
        assertEq(IERC20(WIF).balanceOf(address(st)), wifOwed, "staked + unstaking $WIF == contract balance");
    }

    /// Everyone exits: claims and full withdrawals must all succeed and leave no $WIF behind.
    function _drainAll() internal {
        vm.warp(block.timestamp + 3 hours);
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            _opClaim(u);
            if (staked[u] > 0) {
                vm.prank(u);
                st.requestUnstake(staked[u]);
                unstaking[u] += staked[u];
                staked[u] = 0;
            }
        }
        vm.warp(block.timestamp + 24 hours);
        for (uint256 i; i < 3; ++i) _opWithdraw(users[i]);
        assertEq(IERC20(WIF).balanceOf(address(st)), 0, "no $WIF left locked in staking");
    }
}
