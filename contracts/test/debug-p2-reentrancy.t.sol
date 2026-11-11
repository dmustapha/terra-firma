// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-reentrancy.t.sol
// hackathon-debug Phase 2 (known risk: no dedicated reentrancy test; T5 relied on OZ nonReentrant alone). FORK tests on
// Robinhood Chain mainnet 4663. Every external entry point that hands control to a third party is attacked:
//   - TerraRouter.sell: the ETH send-back to msg.sender re-enters buy / sell / deposit / convert (real deployment)
//   - TerraRouter.sell / convert: a hostile meme token's transferFrom callback re-enters the router (real deployment)
//   - Jar.withdraw: a hostile token's transfer hook re-enters withdraw (isolated Jar; real Jars only ever hold curated
//     Stock Tokens, because credit() is depositor-only and backed, so this proves the guard, not a live path)
//   - WifStaking.withdraw / stake: a hostile $WIF-like token re-enters withdraw / claim (isolated instance, same reason)
//   - FeePool.distribute: a hostile staking hook (rollAll) re-enters distribute after the real $WIF burn leg ran
// Each re-entry must fail with ReentrancyGuardReentrantCall.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-reentrancy.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {IUniversalRouter, IWIF, PoolKey} from "../src/interfaces/IExternal.sol";

bytes4 constant REENTRANT = bytes4(keccak256("ReentrancyGuardReentrantCall()"));

function selectorOf(bytes memory err) pure returns (bytes4 s) {
    if (err.length >= 4) s = bytes4(err);
}

interface IHook {
    function onTokenHook() external;
}

/// ERC20 that calls `onTokenHook()` on a registered hook contract during every transfer / transferFrom.
contract HookToken is ERC20 {
    address public hook;

    constructor() ERC20("Hook", "HOOK") {}

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }

    function setHook(address h) external {
        hook = h;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (hook != address(0) && from != address(0)) IHook(hook).onTokenHook();
    }
}

/// Malicious seller: re-enters TerraRouter from receive() when the router sends sale proceeds back.
contract EthReentrant {
    TerraRouter immutable router;
    address immutable meme;
    uint8 public mode; // 1 buy, 2 sell, 3 deposit, 4 convert
    bytes4 public seen;
    bool armed;

    constructor(TerraRouter r, address meme_) {
        router = r;
        meme = meme_;
    }

    function arm(uint8 m) external {
        mode = m;
        armed = true;
    }

    function route(bool isBuy) public view returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = isBuy
            ? abi.encodePacked(address(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73), uint24(3000), meme)
            : abi.encodePacked(meme, uint24(3000), address(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73));
    }

    function buyMeme() external payable returns (uint256 got) {
        (got,) = router.buy{value: msg.value}(route(true), meme, 0, 0, 1, 0);
        IERC20(meme).approve(address(router), type(uint256).max);
    }

    function sellAll() external returns (uint256 ethOut) {
        (ethOut,) = router.sell(route(false), meme, IERC20(meme).balanceOf(address(this)), 0, 0, 0, 0);
    }

    receive() external payable {
        if (!armed) return;
        armed = false;
        if (mode == 1) {
            try router.buy{value: msg.value / 2}(route(true), meme, 0, 0, 1, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else if (mode == 2) {
            try router.sell(route(false), meme, 1, 0, 0, 0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else if (mode == 3) {
            try router.deposit{value: msg.value / 2}(0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else {
            TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
            rs[0] = route(false);
            address[] memory ts = new address[](1);
            ts[0] = meme;
            uint256[] memory am = new uint256[](1);
            am[0] = 1;
            try router.convert(rs, ts, am, 0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        }
    }
}

/// Hook that re-enters TerraRouter.deposit from inside a hostile token's transferFrom (no catch: the revert bubbles).
contract RouterHook is IHook {
    TerraRouter immutable router;

    constructor(TerraRouter r) payable {
        router = r;
    }

    function onTokenHook() external {
        router.deposit{value: 1e14}(0, 0);
    }
}

/// Hook that re-enters a target with `data` and records the revert selector (state survives: it catches).
contract RecordingHook is IHook {
    address public target;
    bytes public data;
    bytes4 public seen;
    bool public armed;

    function set(address t, bytes calldata d) external {
        target = t;
        data = d;
        armed = true;
    }

    function onTokenHook() external {
        if (!armed) return;
        armed = false;
        (bool ok, bytes memory e) = target.call(data);
        if (!ok) seen = selectorOf(e);
    }
}

/// Staking stand-in whose rollAll() re-enters FeePool.distribute.
contract ReentrantStaking is IWifStakingPool {
    FeePool public pool;

    function setPool(FeePool p) external {
        pool = p;
    }

    function rollAll() external {
        pool.distribute();
    }

    function activeStake(uint8) external pure returns (uint256) {
        return 0;
    }

    function notifyReward(uint8, uint256) external {}
}

contract DebugP2Reentrancy is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    // ------------------------------------------------------------------ TerraRouter: ETH send-back path

    function _sellWithReentry(uint8 mode) internal returns (EthReentrant atk, uint256 ethOut) {
        atk = new EthReentrant(d.router, PONS);
        vm.deal(address(atk), 1 ether);
        atk.buyMeme{value: 0.01 ether}();
        atk.arm(mode);
        uint256 bal0 = address(atk).balance;
        ethOut = atk.sellAll();
        assertGt(ethOut, 0, "sale paid out");
        assertEq(address(atk).balance - bal0, ethOut, "re-entry did nothing; proceeds intact");
        assertEq(atk.seen(), REENTRANT, "re-entry rejected by nonReentrant");
        assertEq(address(d.router).balance, 0, "no ETH stuck in router");
    }

    function test_sellEthSendBack_reenterBuy() public {
        _sellWithReentry(1);
    }

    function test_sellEthSendBack_reenterSell() public {
        _sellWithReentry(2);
    }

    function test_sellEthSendBack_reenterDeposit() public {
        _sellWithReentry(3);
    }

    function test_sellEthSendBack_reenterConvert() public {
        _sellWithReentry(4);
    }

    // ------------------------------------------------------------------ TerraRouter: hostile token callback

    function _hostileRoute(address tok) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(tok, uint24(3000), WETH);
    }

    function test_sellHostileTokenCallbackReverts() public {
        HookToken tok = new HookToken();
        RouterHook hook = new RouterHook{value: 1 ether}(d.router);
        tok.mint(address(this), 1e18);
        tok.approve(address(d.router), 1e18);
        tok.setHook(address(hook));
        vm.expectRevert(REENTRANT);
        d.router.sell(_hostileRoute(address(tok)), address(tok), 1e18, 0, 0, 0, 0);
    }

    function test_convertHostileTokenCallbackReverts() public {
        HookToken tok = new HookToken();
        RouterHook hook = new RouterHook{value: 1 ether}(d.router);
        tok.mint(address(this), 1e18);
        tok.approve(address(d.router), 1e18);
        tok.setHook(address(hook));
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
        rs[0] = _hostileRoute(address(tok));
        address[] memory ts = new address[](1);
        ts[0] = address(tok);
        uint256[] memory am = new uint256[](1);
        am[0] = 1e18;
        vm.expectRevert(REENTRANT);
        d.router.convert(rs, ts, am, 0, 0);
    }

    // ------------------------------------------------------------------ Jar.withdraw

    function test_jarWithdrawReentry() public {
        HookToken tok = new HookToken();
        RecordingHook atk = new RecordingHook();
        Jar jar = new Jar(address(this), address(0)); // this test is the depositor
        tok.mint(address(jar), 10e18);
        jar.credit(address(atk), address(tok), 10e18, 4);
        tok.setHook(address(atk));
        atk.set(address(jar), abi.encodeCall(Jar.withdraw, (address(tok), 5e18)));
        vm.prank(address(atk));
        jar.withdraw(address(tok), 5e18);
        assertEq(atk.seen(), REENTRANT, "re-entrant withdraw rejected");
        assertEq(tok.balanceOf(address(atk)), 5e18, "only the outer withdraw paid");
        assertEq(jar.balanceOf(address(atk), address(tok)), 5e18, "ledger debited once");
        assertEq(jar.totalHeld(address(tok)), tok.balanceOf(address(jar)), "still fully backed");
    }

    // ------------------------------------------------------------------ WifStaking.withdraw / stake

    function _hostileStaking() internal returns (HookToken w, WifStaking s, RecordingHook atk) {
        w = new HookToken();
        StockOracle o = new StockOracle(ETH_USD, USDG_USD, stocks());
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        Jar j = new Jar(address(0xdead), pStaking);
        s = new WifStaking(IERC20(address(w)), o, j, address(this), block.timestamp);
        atk = new RecordingHook();
        w.mint(address(atk), 100e18);
        vm.prank(address(atk));
        w.approve(address(s), type(uint256).max);
    }

    function test_stakingWithdrawReentry() public {
        (HookToken w, WifStaking s, RecordingHook atk) = _hostileStaking();
        vm.startPrank(address(atk));
        s.stake(100e18, 0);
        s.requestUnstake(100e18);
        vm.stopPrank();
        vm.warp(block.timestamp + 24 hours);
        w.setHook(address(atk));
        atk.set(address(s), abi.encodeCall(WifStaking.withdraw, ()));
        vm.prank(address(atk));
        s.withdraw();
        assertEq(atk.seen(), REENTRANT, "re-entrant withdraw rejected");
        assertEq(w.balanceOf(address(atk)), 100e18, "paid exactly once");
        assertEq(w.balanceOf(address(s)), 0);
    }

    function test_stakingStakeReentersClaim() public {
        (HookToken w, WifStaking s, RecordingHook atk) = _hostileStaking();
        w.setHook(address(atk));
        atk.set(address(s), abi.encodeCall(WifStaking.claim, ()));
        vm.prank(address(atk));
        s.stake(50e18, 0);
        assertEq(atk.seen(), REENTRANT, "claim re-entered from stake's transferFrom rejected");
        (, , uint256 pend,,,,,) = s.stakers(address(atk));
        assertEq(pend, 50e18, "stake recorded once");
    }

    // ------------------------------------------------------------------ FeePool.distribute

    function test_feePoolDistributeReentry() public {
        ReentrantStaking evil = new ReentrantStaking();
        FeePool fp = new FeePool(IUniversalRouter(UR), IWIF(WIF), d.oracle, evil, wifKey(), block.timestamp);
        evil.setPool(fp);
        vm.deal(address(fp), 0.01 ether);
        vm.expectRevert(REENTRANT); // the real $WIF burn leg runs first, then rollAll() re-enters
        fp.distribute();
        assertEq(fp.lastEpoch(), 0, "reverted distribute did not advance the epoch");
    }
}
