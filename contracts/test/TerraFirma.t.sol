// SPDX-License-Identifier: MIT
// File: contracts/test/TerraFirma.t.sol
// [VERIFIED] fork suite against Robinhood Chain mainnet 4663. Run:
//   RPC_URL=$GETBLOCK_RPC_FRA FORK_BLOCK=111155803 forge test -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {FeePool} from "../src/FeePool.sol";
import {PoolKey, IWIF, IUniversalRouter} from "../src/interfaces/IExternal.sol";

contract TerraFirmaTest is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    Deployment d;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    // ------------------------------------------------------------------ route helpers

    function v3Buy(address token, uint24 fee) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, fee, token);
    }

    function v3Sell(address token, uint24 fee) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(token, fee, WETH);
    }

    function v2(address a, address b) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 1;
        r.v2Path = new address[](2);
        r.v2Path[0] = a;
        r.v2Path[1] = b;
    }

    function v4(PoolKey memory key) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 3;
        r.key = key;
    }

    function ponsV4() internal pure returns (PoolKey memory) {
        return PoolKey(address(0), PONS, 10128, 202, address(0));
    }

    function buyPons(address who, uint256 eth, uint16 sweep) internal returns (uint256 got) {
        vm.prank(who);
        (got,) = d.router.buy{value: eth}(v3Buy(PONS, 3000), PONS, sweep, 0, 1, 0);
    }

    function stakeWif(address who, uint256 eth) internal returns (uint256 amount) {
        vm.startPrank(who);
        (amount,) = d.router.buy{value: eth}(v4(wifKey()), WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ F-004 buy with sweep

    function test_buyV3_sweepAndFee() public {
        uint256 fp0 = address(d.feePool).balance;
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: 0.01 ether}(v3Buy(PONS, 3000), PONS, 200, 0, 1, 0);
        assertGt(memeOut, 0, "meme");
        assertGt(stockOut, 0, "stock");
        assertEq(address(d.feePool).balance - fp0, 0.00005 ether, "fee exactly 0.5%");
        assertEq(d.jar.balanceOf(alice, NVDA), stockOut, "jar credit == received");
        assertEq(IERC20(NVDA).balanceOf(address(d.jar)), d.jar.totalHeld(NVDA), "backed");
        assertEq(IERC20(PONS).balanceOf(alice), memeOut, "meme to user");
        assertEq(address(d.router).balance, 0, "no ETH left in router");
    }

    function test_buyV2() public {
        vm.prank(alice);
        (uint256 memeOut,) = d.router.buy{value: 0.002 ether}(v2(WETH, PONS), PONS, 0, 0, 1, 0);
        assertGt(memeOut, 0);
    }

    function test_buyV4_plain() public {
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: 0.002 ether}(v4(ponsV4()), PONS, 200, 0, 1, 0);
        assertGt(memeOut, 0);
        assertGt(stockOut, 0);
        assertEq(IERC20(PONS).balanceOf(address(d.router)), 0, "forwarded");
    }

    function test_buyWif_hookedPool() public {
        vm.prank(alice);
        (uint256 wifOut,) = d.router.buy{value: 0.001 ether}(v4(wifKey()), WIF, 0, 0, 1, 0);
        assertGt(wifOut, 1000e18, "~1.5K WIF per 0.001 ETH");
    }

    // ------------------------------------------------------------------ F-005 sell with sweep

    function test_sellV3_sweep() public {
        uint256 bal = buyPons(alice, 0.005 ether, 0);
        uint256 eth0 = alice.balance;
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), bal);
        (uint256 ethOut, uint256 stockOut) = d.router.sell(v3Sell(PONS, 3000), PONS, bal, 200, 0, 1, 0);
        vm.stopPrank();
        assertEq(alice.balance - eth0, ethOut, "eth to user");
        assertGt(stockOut, 0, "sweep");
        assertEq(IERC20(PONS).balanceOf(address(d.router)), 0);
    }

    function test_sellV4_plain() public {
        uint256 bal = buyPons(alice, 0.003 ether, 0);
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), bal);
        (uint256 ethOut,) = d.router.sell(v4(ponsV4()), PONS, bal, 0, 0, 1, 0);
        vm.stopPrank();
        assertGt(ethOut, 0.002 ether, "v4 token->ETH leg works");
    }

    // ------------------------------------------------------------------ F-003 convert

    function test_convert_multi() public {
        uint256 a = buyPons(alice, 0.004 ether, 0);
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](2);
        address[] memory toks = new address[](2);
        uint256[] memory amts = new uint256[](2);
        rs[0] = v3Sell(PONS, 3000);
        rs[1] = v2(PONS, WETH);
        toks[0] = PONS;
        toks[1] = PONS;
        amts[0] = a / 2;
        amts[1] = a - a / 2;
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), a);
        uint256 out = d.router.convert(rs, toks, amts, 0, 0);
        vm.stopPrank();
        assertGt(out, 0);
        assertEq(d.jar.balanceOf(alice, NVDA), out);
    }

    function test_deposit_tsla() public {
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.002 ether}(1, 0);
        assertGt(out, 0);
        assertEq(d.jar.balanceOf(alice, TSLA), out);
    }

    // ------------------------------------------------------------------ INVARIANTS 1, 3, 5, 6

    function test_sellWifReverts() public {
        vm.startPrank(alice);
        (uint256 w,) = d.router.buy{value: 0.001 ether}(v4(wifKey()), WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.router), w);
        vm.expectRevert(TerraRouter.WifNotSellable.selector);
        d.router.sell(v4(wifKey()), WIF, w, 0, 0, 0, 0);
        vm.stopPrank();
    }

    function test_convertWifReverts() public {
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
        address[] memory toks = new address[](1);
        uint256[] memory amts = new uint256[](1);
        rs[0] = v4(wifKey());
        toks[0] = WIF;
        amts[0] = 1;
        vm.expectRevert(TerraRouter.WifNotSellable.selector);
        d.router.convert(rs, toks, amts, 0, 0);
    }

    function test_routeTokenMismatchReverts() public {
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(v3Buy(NVDA, 500), PONS, 0, 0, 0, 0);
    }

    function test_badKindReverts() public {
        TerraRouter.Route memory r;
        r.kind = 9;
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(r, PONS, 0, 0, 0, 0);
    }

    function test_badMidHopReverts() public {
        TerraRouter.Route memory r;
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, uint24(500), NVDA, uint24(500), PONS); // mid must be USDG
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(r, PONS, 0, 0, 0, 0);
    }

    function test_sweepTooHighReverts() public {
        vm.prank(alice);
        vm.expectRevert(TerraRouter.SweepTooHigh.selector);
        d.router.buy{value: 0.001 ether}(v3Buy(PONS, 3000), PONS, 1001, 0, 0, 0);
    }

    function test_staleOracleReverts() public {
        vm.warp(vm.getBlockTimestamp() + 26 hours);
        vm.prank(alice);
        vm.expectRevert(); // StaleOracle(feed)
        d.router.deposit{value: 0.001 ether}(0, 0);
    }

    function test_userMinStockEnforced() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.deposit{value: 0.001 ether}(0, 1 ether); // 1 NVDA for 0.001 ETH is impossible
    }

    function test_jarCreditGuards() public {
        vm.expectRevert(Jar.NotDepositor.selector);
        d.jar.credit(alice, NVDA, 1, 2);
        vm.prank(address(d.router));
        vm.expectRevert(Jar.Unbacked.selector);
        d.jar.credit(alice, NVDA, 1e18, 2);
    }

    function test_jarWithdrawOnlyOwnBalance() public {
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.002 ether}(0, 0);
        vm.prank(bob);
        vm.expectRevert(Jar.Insufficient.selector);
        d.jar.withdraw(NVDA, out);
        vm.prank(alice);
        d.jar.withdraw(NVDA, out);
        assertEq(IERC20(NVDA).balanceOf(alice), out);
        assertEq(d.jar.balanceOf(alice, NVDA), 0);
    }

    function test_noOwnerFunctions() public {
        address[6] memory cs = [
            address(d.router), address(d.jar), address(d.feePool), address(d.staking), address(d.oracle), address(d.lens)
        ];
        for (uint256 i; i < cs.length; ++i) {
            (bool ok,) = cs[i].call(abi.encodeWithSignature("owner()"));
            assertFalse(ok, "no owner()");
            (ok,) = cs[i].call(abi.encodeWithSignature("transferOwnership(address)", alice));
            assertFalse(ok, "no transferOwnership");
            (ok,) = cs[i].call(abi.encodeWithSignature("pause()"));
            assertFalse(ok, "no pause");
        }
    }

    // ------------------------------------------------------------------ F-006/F-007/F-008 fee pool + staking

    function test_distribute_burnAndStream() public {
        uint256 staked = stakeWif(bob, 0.01 ether);
        assertGt(staked, 10_000e18);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // a stake placed in epoch e is active from e+2
        for (uint256 i; i < 3; ++i) buyPons(alice, 0.05 ether, 200);
        uint256 supply0 = IWIF(WIF).totalSupply();
        vm.recordLogs();
        d.feePool.distribute();
        uint256 burned = d.feePool.totalWifBurned();
        assertGt(burned, 0, "burned");
        assertEq(supply0 - IWIF(WIF).totalSupply(), burned, "supply drop == burned");
        (uint8 sid, uint256 p) = d.staking.pending(bob);
        assertEq(sid, 0);
        assertGt(p, 0, "stream to staker");
        vm.prank(bob);
        uint256 claimed = d.staking.claim();
        assertEq(claimed, p);
        assertEq(d.jar.balanceOf(bob, NVDA), claimed, "reward in Jar");
    }

    function test_jitStakeEarnsNothing() public {
        stakeWif(bob, 0.005 ether); // honest staker, active from e+2
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        for (uint256 i; i < 2; ++i) buyPons(alice, 0.05 ether, 0);
        stakeWif(alice, 0.02 ether); // JIT: staked in the same epoch as the distribute
        d.feePool.distribute();
        (, uint256 pa) = d.staking.pending(alice);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pa, 0, "JIT stake earns nothing this epoch");
        assertGt(pb, 0, "honest staker earns");
        // next epoch: still not active (placed in e, active from e+2)
        vm.warp(vm.getBlockTimestamp() + 1 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, pa) = d.staking.pending(alice);
        assertEq(pa, 0, "not active one epoch later");
        // epoch e+2: active and earns
        vm.warp(vm.getBlockTimestamp() + 1 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, pa) = d.staking.pending(alice);
        assertGt(pa, 0, "earns after activation");
    }

    function test_distributeOncePerEpoch() public {
        buyPons(alice, 0.05 ether, 0);
        d.feePool.distribute();
        buyPons(alice, 0.05 ether, 0);
        vm.expectRevert(FeePool.EpochNotElapsed.selector);
        d.feePool.distribute();
    }

    function test_noStakersCarriesStockHalf() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 bal = address(d.feePool).balance;
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0);
        assertEq(address(d.feePool).balance, bal - bal / 2, "stock half carried");
    }

    function test_burnFailureEmitsAndCarries() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 bal = address(d.feePool).balance;
        // force the WIF swap to fail (a third-party hook/pool revert with a reason) inside try/catch
        vm.mockCallRevert(UR, IUniversalRouter.execute.selector, abi.encodeWithSignature("Error(string)", "hook"));
        vm.expectEmit(true, false, false, false, address(d.feePool));
        emit FeePool.BurnSkipped(d.feePool.epoch(), 0, "");
        d.feePool.distribute();
        assertEq(d.feePool.totalWifBurned(), 0, "nothing burned");
        assertEq(address(d.feePool).balance, bal, "all ETH carried (no stakers, burn failed)");
    }

    /// Reviewer attack: stake in the last second of epoch e, warp 1s, call distribute immediately.
    function test_boundaryStakeEarnsNothing() public {
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // bob is an established staker
        uint256 st = d.feePool.start();
        uint256 e = d.feePool.epoch();
        vm.warp(st + (e + 1) * 1 hours - 1); // last second of the current epoch
        stakeWif(alice, 0.02 ether);
        vm.warp(st + (e + 1) * 1 hours + 1); // first second of the next epoch
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, uint256 pa) = d.staking.pending(alice);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pa, 0, "boundary stake captures nothing");
        assertGt(pb, 0, "established staker earns");
    }

    /// Reviewer attack: fully unstake from NVDA with accrued rewards, re-stake into TSLA, claim.
    function test_crossPoolAccruedNoDrain() public {
        uint256 s = stakeWif(alice, 0.005 ether);
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, uint256 acc) = d.staking.pending(alice);
        assertGt(acc, 0);
        vm.startPrank(alice);
        d.staking.requestUnstake(s);
        vm.warp(vm.getBlockTimestamp() + 24 hours);
        d.staking.withdraw();
        IERC20(WIF).approve(address(d.staking), s);
        d.staking.stake(s, 1); // TSLA: must first settle NVDA rewards in NVDA
        vm.stopPrank();
        assertEq(d.jar.balanceOf(alice, NVDA), acc, "old rewards paid in old stock");
        assertEq(d.jar.balanceOf(alice, TSLA), 0, "nothing paid in the new stock");
    }

    /// Reviewer attack: starve distribute of gas so swaps fail out-of-gas while the epoch advances.
    function test_distributeGasStarvationReverts() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 last = d.feePool.lastEpoch();
        for (uint256 g = 120_000; g <= 900_000; g += 60_000) {
            try d.feePool.distribute{gas: g}() {
                assertGt(d.feePool.totalWifBurned(), 0, "a successful distribute must burn");
                return;
            } catch {
                assertEq(d.feePool.lastEpoch(), last, "a starved call never advances the epoch");
            }
        }
    }

    /// Both legs get the same ETH, each capped at MAX_WIF_BUY_ETH; the rest carries.
    function test_splitCappedEqually() public {
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        vm.deal(address(d.feePool), 1 ether);
        vm.recordLogs();
        d.feePool.distribute();
        assertEq(address(d.feePool).balance, 1 ether - 2 * d.feePool.MAX_WIF_BUY_ETH(), "two equal capped legs");
        assertEq(d.feePool.totalEthToStock(), d.feePool.MAX_WIF_BUY_ETH(), "stock leg == burn leg");
    }

    function test_curatedMultipliersNearOne() public view {
        address[6] memory t = [NVDA, TSLA, GOOGL, SNDK, SPY, QQQ];
        for (uint256 i; i < 6; ++i) {
            (bool ok, bytes memory r) = t[i].staticcall(abi.encodeWithSignature("uiMultiplier()"));
            if (!ok) continue;
            uint256 m = abi.decode(r, (uint256));
            assertApproxEqRel(m, 1e18, 0.02e18, "multiplier within 2% of 1 (inside the 3% band)");
        }
    }

    function test_unstakeDelay() public {
        uint256 s = stakeWif(bob, 0.003 ether);
        vm.startPrank(bob);
        d.staking.requestUnstake(s);
        vm.expectRevert(WifStaking.Locked.selector);
        d.staking.withdraw();
        vm.warp(vm.getBlockTimestamp() + 24 hours);
        d.staking.withdraw();
        vm.stopPrank();
        assertEq(IERC20(WIF).balanceOf(bob), s);
    }

    function test_feeDiscountForStakers() public {
        stakeWif(alice, 0.01 ether); // > 10K WIF
        assertEq(d.router.feeBps(alice), 50, "pending stake: no discount yet");
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        assertEq(d.router.feeBps(alice), 30, "active stake: 0.3%");
        uint256 fp0 = address(d.feePool).balance;
        buyPons(alice, 0.01 ether, 0);
        assertEq(address(d.feePool).balance - fp0, 0.00003 ether, "fee exactly 0.3%");
    }

    // ------------------------------------------------------------------ FriendJar (gated)

    function test_friendJar_contributeExit() public {
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("flat"));
        vm.prank(bob);
        d.friendJar.join(id, "flat");
        vm.prank(alice);
        uint256 a = d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.prank(bob);
        d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.prank(alice);
        uint256 out = d.friendJar.exit(id);
        assertApproxEqRel(out, a, 0.02e18);
        assertEq(IERC20(NVDA).balanceOf(alice), out);
    }
}
