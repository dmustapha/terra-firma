// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-hindsight-phase.t.sol
// hackathon-debug Phase 6 (critique S-3). FORK test: at a Chainlink phase boundary the last round of the old phase has
// no rid + 1 (getRoundData returns updatedAt == 0), so it must not "bracket" any later ts. Simulated with vm.mockCall on
// the real ETH/USD feed: phase-1 round 549 becomes the last of its phase and latest is phase-2 round 1.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p6-hindsight-phase.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {HindsightLens} from "../src/HindsightLens.sol";
import {IAggregatorV3} from "../src/interfaces/IExternal.sol";

contract DebugP6HindsightPhase is Test, TerraConfig {
    uint80 constant BASE = uint80(1 << 64);
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    function _buy(uint64 ts) internal pure returns (HindsightLens.Buy[] memory b) {
        b = new HindsightLens.Buy[](1);
        b[0] = HindsightLens.Buy({
            payKind: 0, payStockId: 0, amountPaid: 1 ether, payRoundId: BASE + 549, stockRoundId: BASE + 24, ts: ts
        });
    }

    function test_phaseBoundaryRoundRejectedForLaterTs() public {
        address feed = address(d.oracle.ethUsdFeed());
        d.lens.recompute(_buy(1782222600), 0); // control: a normal in-phase bracket is accepted
        uint80 phase2First = uint80(2 << 64) + 1;
        vm.mockCall(
            feed,
            abi.encodeCall(IAggregatorV3.latestRoundData, ()),
            abi.encode(phase2First, int256(165768649010), uint256(1782300000), uint256(1782300000), phase2First)
        );
        vm.mockCall(
            feed,
            abi.encodeCall(IAggregatorV3.getRoundData, (BASE + 550)),
            abi.encode(BASE + 550, int256(0), uint256(0), uint256(0), uint80(0))
        );
        vm.expectRevert(abi.encodeWithSelector(HindsightLens.BadRound.selector, feed, BASE + 549));
        d.lens.recompute(_buy(1782222600), 0);
    }
}
