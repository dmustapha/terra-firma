// SPDX-License-Identifier: MIT
// File: contracts/test/stress-p5.t.sol
// hackathon-stress Phase 5: boundary values, access, attack vectors and fuzz not covered by the base suite.
// Covers PULSE DH-11 (burn-leg sandwich bound, distribute griefing, FriendJar invite) and DH-12 (mintCard regression).
// Run: RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path test/stress-p5.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {HindsightLens} from "../src/HindsightLens.sol";
import {FriendJar} from "../src/FriendJar.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {FeePool} from "../src/FeePool.sol";
import {IWIF} from "../src/interfaces/IExternal.sol";

contract StressP5Test is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    uint80 constant BASE = uint80(1 << 64);
    Deployment d;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address eve = address(0xE7E);

    event CardMinted(address indexed wallet, uint8 stockId, uint256 usdPaid8, uint256 shares18, uint256 usdNow8);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(eve, 10 ether);
    }

    // ------------------------------------------------------------------ helpers

    function v3Buy(address token) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, uint24(3000), token);
    }

    function wifRoute() internal pure returns (TerraRouter.Route memory r) {
        r.kind = 3;
        r.key = wifKey();
    }

    function buyWif(address who, uint256 eth) internal returns (uint256 got) {
        vm.prank(who);
        (got,) = d.router.buy{value: eth}(wifRoute(), WIF, 0, 0, 1, 0);
    }

    /// One real 1 ETH buy priced at ETH/USD n=549 and NVDA n=24 (rounds verified in HindsightLens.t.sol).
    function realBuy() internal pure returns (HindsightLens.Buy[] memory b) {
        b = new HindsightLens.Buy[](1);
        b[0] = HindsightLens.Buy({
            payKind: 0, payStockId: 0, amountPaid: 1 ether, payRoundId: BASE + 549, stockRoundId: BASE + 24, ts: 1782222600
        });
    }

    // ------------------------------------------------------------------ DH-12 mintCard regression (F-019)

    function test_mintCard_burnsExactlyOneWif_andEmitsRecompute() public {
        buyWif(alice, 0.001 ether);
        (uint256 usd8, uint256 sh18, uint256 now8) = d.lens.recompute(realBuy(), 0);
        uint256 supply0 = IWIF(WIF).totalSupply();
        uint256 bal0 = IERC20(WIF).balanceOf(alice);
        vm.startPrank(alice);
        IERC20(WIF).approve(address(d.lens), 1e18);
        vm.expectEmit(true, false, false, true, address(d.lens));
        emit CardMinted(alice, 0, usd8, sh18, now8);
        d.lens.mintCard(realBuy(), 0);
        vm.stopPrank();
        assertEq(supply0 - IWIF(WIF).totalSupply(), 1e18, "supply drops by exactly 1 WIF");
        assertEq(bal0 - IERC20(WIF).balanceOf(alice), 1e18, "caller pays exactly 1 WIF");
        assertEq(IERC20(WIF).allowance(alice, address(d.lens)), 0, "exact approval consumed");
    }

    function test_mintCard_revertsWithoutApproval() public {
        buyWif(alice, 0.001 ether);
        vm.prank(alice);
        vm.expectRevert();
        d.lens.mintCard(realBuy(), 0);
    }

    function test_mintCard_revertsWithoutWif() public {
        vm.startPrank(eve);
        IERC20(WIF).approve(address(d.lens), 1e18);
        vm.expectRevert();
        d.lens.mintCard(realBuy(), 0);
        vm.stopPrank();
    }

    function test_mintCard_badRoundRevertsBeforeBurn() public {
        buyWif(alice, 0.001 ether);
        HindsightLens.Buy[] memory b = realBuy();
        b[0].stockRoundId = BASE + 25; // starts after ts: a fabricated round must not mint
        uint256 supply0 = IWIF(WIF).totalSupply();
        vm.startPrank(alice);
        IERC20(WIF).approve(address(d.lens), 1e18);
        vm.expectRevert();
        d.lens.mintCard(b, 0);
        vm.stopPrank();
        assertEq(IWIF(WIF).totalSupply(), supply0, "no burn on a rejected card");
    }

    function test_mintCard_badPayKindReverts() public {
        buyWif(alice, 0.001 ether);
        HindsightLens.Buy[] memory b = realBuy();
        b[0].payKind = 7;
        vm.startPrank(alice);
        IERC20(WIF).approve(address(d.lens), 1e18);
        vm.expectRevert(HindsightLens.BadPayKind.selector);
        d.lens.mintCard(b, 0);
        vm.stopPrank();
    }

    /// Self-reported inputs are a known property: an empty card mints with zeros. The leaderboard re-derives every
    /// minted card server-side (/api/card-check) before ranking, so zero or fabricated cards never rank (F-023).
    function test_mintCard_emptyBuysMintsZeroCard() public {
        buyWif(alice, 0.001 ether);
        vm.startPrank(alice);
        IERC20(WIF).approve(address(d.lens), 1e18);
        vm.expectEmit(true, false, false, true, address(d.lens));
        emit CardMinted(alice, 0, 0, 0, 0);
        d.lens.mintCard(new HindsightLens.Buy[](0), 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ boundary values (router / jar / staking)

    function test_buy_zeroValueReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.buy{value: 0}(v3Buy(PONS), PONS, 0, 0, 1, 0);
    }

    function test_buy_sweepAtExactMax() public {
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: 0.01 ether}(v3Buy(PONS), PONS, 1000, 0, 1, 0);
        assertGt(memeOut, 0);
        assertGt(stockOut, 0, "10% sweep is allowed");
    }

    function test_buy_badStockIdReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.buy{value: 0.002 ether}(v3Buy(PONS), PONS, 200, 6, 1, 0);
    }

    function test_buy_minTokenOutTooHighReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.buy{value: 0.002 ether}(v3Buy(PONS), PONS, 0, 0, type(uint256).max, 0);
    }

    function test_deposit_zeroReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.deposit{value: 0}(0, 0);
    }

    function test_sell_zeroAmountReverts() public {
        TerraRouter.Route memory r;
        r.kind = 2;
        r.v3Path = abi.encodePacked(PONS, uint24(3000), WETH);
        vm.prank(alice);
        vm.expectRevert();
        d.router.sell(r, PONS, 0, 0, 0, 0, 0);
    }

    function test_convert_lengthMismatchReverts() public {
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
        address[] memory toks = new address[](2);
        uint256[] memory amts = new uint256[](1);
        vm.prank(alice);
        vm.expectRevert();
        d.router.convert(rs, toks, amts, 0, 0);
    }

    function test_staking_zeroAndOverdraw() public {
        uint256 got = buyWif(alice, 0.002 ether);
        vm.startPrank(alice);
        IERC20(WIF).approve(address(d.staking), got);
        vm.expectRevert(WifStaking.ZeroAmount.selector);
        d.staking.stake(0, 0);
        vm.expectRevert();
        d.staking.stake(got, 6); // bad stock id
        d.staking.stake(got, 0);
        vm.expectRevert();
        d.staking.requestUnstake(got + 1);
        vm.expectRevert(); // nothing requested yet
        d.staking.withdraw();
        vm.stopPrank();
    }

    function test_staking_claimNothingIsZero() public {
        vm.prank(eve);
        assertEq(d.staking.claim(), 0, "claim with no stake pays nothing");
    }

    function test_staking_notifyRewardOnlyFeePool() public {
        vm.prank(eve);
        vm.expectRevert(WifStaking.NotFeePool.selector);
        d.staking.notifyReward(0, 1);
    }

    function test_jar_withdrawMoreThanOwnReverts() public {
        vm.prank(alice);
        uint256 got = d.router.deposit{value: 0.002 ether}(0, 0);
        vm.prank(alice);
        vm.expectRevert();
        d.jar.withdraw(NVDA, got + 1);
        vm.prank(eve);
        vm.expectRevert();
        d.jar.withdraw(NVDA, 1);
    }

    // ------------------------------------------------------------------ DH-11 FeePool sandwich bound + griefing

    /// An attacker who pumps $WIF right before distribute can only distort the per-epoch capped leg: the pool never
    /// spends more than MAX_WIF_BUY_ETH on the burn, the rest carries, and the burn still happens.
    function test_sandwich_burnLegBoundedByCap() public {
        vm.deal(address(d.feePool), 1 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        buyWif(eve, 2 ether); // front-run: push the WIF price up
        uint256 supply0 = IWIF(WIF).totalSupply();
        uint256 bal0 = address(d.feePool).balance;
        vm.prank(eve);
        d.feePool.distribute();
        uint256 spent = bal0 - address(d.feePool).balance;
        assertLe(spent, 2 * d.feePool.MAX_WIF_BUY_ETH(), "at most one capped leg each");
        assertGt(supply0 - IWIF(WIF).totalSupply(), 0, "burn still executes under a pumped price");
        assertGe(address(d.feePool).balance, 1 ether - 2 * d.feePool.MAX_WIF_BUY_ETH(), "remainder carries");
    }

    /// Anyone may call distribute (permissionless, no parameters), but only once per epoch and only above the floor.
    function test_griefing_distributeOncePerEpochAndThreshold() public {
        vm.deal(address(d.feePool), 0.000009 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        vm.prank(eve);
        vm.expectRevert(FeePool.BelowThreshold.selector);
        d.feePool.distribute();
        vm.deal(address(d.feePool), 0.001 ether);
        vm.prank(eve);
        d.feePool.distribute();
        vm.deal(address(d.feePool), 0.001 ether);
        vm.prank(eve);
        vm.expectRevert(FeePool.EpochNotElapsed.selector);
        d.feePool.distribute();
    }

    // ------------------------------------------------------------------ DH-11 FriendJar (M-05)

    function test_friendJar_wrongInviteAndNonMember() public {
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("correct horse battery staple"));
        vm.prank(eve);
        vm.expectRevert(FriendJar.BadInvite.selector);
        d.friendJar.join(id, "guess");
        vm.prank(eve);
        vm.expectRevert(FriendJar.NotMember.selector);
        d.friendJar.contribute{value: 0.001 ether}(id, 0);
        vm.prank(eve);
        vm.expectRevert(FriendJar.NothingToExit.selector);
        d.friendJar.exit(id);
    }

    function test_friendJar_doubleExitReverts() public {
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("x"));
        vm.prank(alice);
        d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.startPrank(alice);
        d.friendJar.exit(id);
        vm.expectRevert(FriendJar.NothingToExit.selector);
        d.friendJar.exit(id);
        vm.stopPrank();
    }

    /// Documented limitation (LIMITATIONS / M-05): join() takes the invite in plaintext calldata, so once any member
    /// joins, the invite is public onchain and anyone can replay it. Membership only grants the right to add your own
    /// ETH; it can never move another member's shares (proved by the exit-isolation assertion below).
    function test_friendJar_inviteReplayCannotTouchOthersShares() public {
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("flat"));
        vm.prank(bob);
        d.friendJar.join(id, "flat");
        vm.prank(bob);
        uint256 b = d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.prank(eve);
        d.friendJar.join(id, "flat"); // replayed from bob's public calldata
        vm.prank(eve);
        vm.expectRevert(FriendJar.NothingToExit.selector);
        d.friendJar.exit(id);
        vm.prank(bob);
        uint256 out = d.friendJar.exit(id);
        assertApproxEqRel(out, b, 0.0001e18, "bob exits with his own stock");
    }

    // ------------------------------------------------------------------ fuzz

    /// forge-config: default.fuzz.runs = 48
    function testFuzz_joinOnlyWithExactInvite(string calldata guess) public {
        vm.assume(keccak256(bytes(guess)) != keccak256("s3cret-invite"));
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("s3cret-invite"));
        vm.prank(eve);
        vm.expectRevert(FriendJar.BadInvite.selector);
        d.friendJar.join(id, guess);
    }

    /// forge-config: default.fuzz.runs = 48
    function testFuzz_buyFeeAndSweepAccounting(uint96 value, uint16 sweepBps) public {
        uint256 v = bound(value, 0.0005 ether, 0.05 ether);
        sweepBps = uint16(bound(sweepBps, 0, 1000));
        uint256 fp0 = address(d.feePool).balance;
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: v}(v3Buy(PONS), PONS, sweepBps, 0, 1, 0);
        assertEq(address(d.feePool).balance - fp0, v * 50 / 10_000, "fee is exactly 0.5% for a non-staker");
        assertGt(memeOut, 0);
        if (sweepBps > 0) assertEq(d.jar.balanceOf(alice, NVDA), stockOut, "jar credit == stock received");
        assertEq(address(d.router).balance, 0, "router keeps no ETH");
        assertEq(IERC20(NVDA).balanceOf(address(d.jar)), d.jar.totalHeld(NVDA), "jar fully backed");
    }

    /// forge-config: default.fuzz.runs = 48
    function testFuzz_sweepAboveMaxReverts(uint16 sweepBps) public {
        sweepBps = uint16(bound(sweepBps, 1001, type(uint16).max));
        vm.prank(alice);
        vm.expectRevert(TerraRouter.SweepTooHigh.selector);
        d.router.buy{value: 0.002 ether}(v3Buy(PONS), PONS, sweepBps, 0, 1, 0);
    }
}
