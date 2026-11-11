// SPDX-License-Identifier: MIT
// File: contracts/test/HindsightLens.t.sol
// [VERIFIED] real mainnet rounds: NVDA/USD n=24 (scaled, ts 1782222509) and n=25 (8dp, ts 1782222749);
// ETH/USD n=549 (ts 1782221550, next 1782224251, answer 165768649010).
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {HindsightLens} from "../src/HindsightLens.sol";

contract HindsightLensTest is Test, TerraConfig {
    uint80 constant BASE = uint80(1 << 64);
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    function buyAt(uint64 ts, uint80 nvdaRound) internal pure returns (HindsightLens.Buy[] memory b) {
        b = new HindsightLens.Buy[](1);
        b[0] = HindsightLens.Buy({
            payKind: 0, payStockId: 0, amountPaid: 1 ether, payRoundId: BASE + 549, stockRoundId: BASE + nvdaRound, ts: ts
        });
    }

    function test_scaledEarlyRoundNormalized() public view {
        (uint256 p24,) = d.oracle.historicalAnswer8(0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, BASE + 24);
        (uint256 p25,) = d.oracle.historicalAnswer8(0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, BASE + 25);
        assertEq(p24, 20306520000, "n=24 -> $203.0652");
        assertEq(p25, 20344000000, "n=25 -> $203.44");
    }

    function test_recomputeOneEthBuy() public view {
        // ts inside both rounds: ETH n=549 [1782221550, 1782224251), NVDA n=24 [1782222509, 1782222749)
        (uint256 usd8, uint256 shares18, uint256 now8) = d.lens.recompute(buyAt(1782222600, 24), 0);
        assertEq(usd8, 165768649010, "1 ETH = $1657.69");
        assertEq(shares18, uint256(165768649010) * 1e18 / 20306520000, "~8.163 NVDA");
        assertGt(now8, 0);
    }

    function test_wrongRoundReverts() public {
        vm.expectRevert(); // NVDA n=25 starts after ts
        d.lens.recompute(buyAt(1782222600, 25), 0);
        vm.expectRevert(); // NVDA n=23 was superseded by n=24 before ts
        d.lens.recompute(buyAt(1782222600, 23), 0);
    }
}
