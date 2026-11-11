// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-feepool.t.sol
// hackathon-debug Phase 6 (critique S-1, S-2). FORK tests on Robinhood Chain mainnet 4663.
//   S-1: distribute() takes no caller-chosen $WIF minimum, so a griefer cannot force BurnSkipped with an absurd one.
//   S-2: out-of-gas is detected by gas left (63/64 rule), not by empty revert data. An EMPTY revert with gas to spare
//        (burn leg or stock leg) skips and carries instead of bricking distribute; a swap that exhausts its gas reverts
//        InsufficientGas and the epoch does not advance.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p6-feepool.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {PoolKey, IWIF, IUniversalRouter} from "../src/interfaces/IExternal.sol";
import {URCodec} from "../src/lib/URCodec.sol";

/// Universal Router stand-in whose execute burns every unit of gas it is given.
contract GasBurnerUR {
    uint256 public sink;

    function execute(bytes calldata, bytes[] calldata, uint256) external payable {
        while (true) {
            ++sink;
        }
    }
}

/// Universal Router stand-in whose execute reverts with no data right away.
contract EmptyRevertUR {
    function execute(bytes calldata, bytes[] calldata, uint256) external payable {
        assembly {
            revert(0, 0)
        }
    }
}

contract DebugP6FeePool is Test, TerraConfig {
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

    function _buyPons(address who, uint256 eth) internal {
        TerraRouter.Route memory r;
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, uint24(3000), PONS);
        vm.prank(who);
        d.router.buy{value: eth}(r, PONS, 0, 0, 1, 0);
    }

    function _stakeWif(address who, uint256 eth) internal {
        TerraRouter.Route memory r;
        r.kind = 3;
        r.key = wifKey();
        vm.startPrank(who);
        (uint256 amount,) = d.router.buy{value: eth}(r, WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, 0);
        vm.stopPrank();
    }

    function _poolWith(address ur) internal returns (FeePool fp) {
        fp = new FeePool(IUniversalRouter(ur), IWIF(WIF), d.oracle, IWifStakingPool(address(d.staking)), wifKey(), block.timestamp);
        vm.deal(address(fp), 0.01 ether);
    }

    // ------------------------------------------------------------------ S-1

    function test_highWifMinOutCannotSkipBurn() public {
        _buyPons(alice, 0.05 ether);
        (bool ok,) = address(d.feePool).call(abi.encodeWithSignature("distribute(uint256)", type(uint128).max));
        assertFalse(ok, "the caller-chosen minOut entry point no longer exists");
        assertEq(d.feePool.lastEpoch(), 0, "epoch not advanced");
        vm.prank(bob); // any caller: the burn always runs
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0, "griefer cannot switch the burn off");
    }

    // ------------------------------------------------------------------ S-2

    function test_emptyRevertBurnSkipsAndCarries() public {
        _buyPons(alice, 0.05 ether);
        uint256 bal = address(d.feePool).balance;
        vm.mockCallRevert(UR, IUniversalRouter.execute.selector, "");
        vm.expectEmit(true, false, false, true, address(d.feePool));
        emit FeePool.BurnSkipped(d.feePool.epoch(), bal / 2, "");
        d.feePool.distribute();
        assertEq(d.feePool.lastEpoch(), d.feePool.epoch() + 1, "epoch advanced (liveness)");
        assertEq(d.feePool.totalWifBurned(), 0, "nothing burned");
        assertEq(address(d.feePool).balance, bal, "all ETH carried (no stakers, burn skipped)");
    }

    function test_emptyRevertUrContractSkipsNotBricks() public {
        FeePool fp = _poolWith(address(new EmptyRevertUR()));
        vm.expectEmit(true, false, false, true, address(fp));
        emit FeePool.BurnSkipped(0, 0.005 ether, "");
        fp.distribute();
        assertEq(fp.lastEpoch(), 1, "epoch advanced");
        assertEq(address(fp).balance, 0.01 ether, "ETH carried");
    }

    function test_emptyRevertStockLegSkipsAndCarries() public {
        _stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // bob active
        _buyPons(alice, 0.05 ether);
        uint256 bal = address(d.feePool).balance;
        uint256 leg = bal / 2 > d.feePool.MAX_WIF_BUY_ETH() ? d.feePool.MAX_WIF_BUY_ETH() : bal / 2;
        bytes memory stockLeg = URCodec.v3(address(d.staking), d.oracle.minStockOut(0, leg), d.oracle.path(0));
        bytes memory call_ = abi.encodeCall(
            IUniversalRouter.execute,
            (URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN), URCodec.inputs2(URCodec.wrap(leg), stockLeg), block.timestamp)
        );
        vm.mockCallRevert(UR, call_, ""); // exact match: only the NVDA stock leg fails, the burn leg is real
        vm.expectEmit(true, true, false, true, address(d.feePool));
        emit FeePool.StockBuySkipped(d.feePool.epoch(), 0, leg, "");
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0, "burn leg ran");
        assertEq(d.feePool.totalEthToStock(), 0, "stock leg skipped");
        assertEq(address(d.feePool).balance, bal - leg, "stock ETH carried");
    }

    function test_outOfGasSwapRevertsNotSkips() public {
        FeePool fp = _poolWith(address(new GasBurnerUR()));
        vm.expectRevert(FeePool.InsufficientGas.selector);
        fp.distribute{gas: 2_000_000}();
        assertEq(fp.lastEpoch(), 0, "a starved swap never advances the epoch");
        assertEq(address(fp).balance, 0.01 ether, "ETH untouched");
    }
}
