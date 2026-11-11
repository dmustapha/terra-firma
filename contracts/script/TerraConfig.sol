// SPDX-License-Identifier: MIT
// File: contracts/script/TerraConfig.sol
// [VERIFIED] every address below was read live on Robinhood Chain mainnet 4663 (intel, fact-check, forge spike).
pragma solidity 0.8.26;

import {Vm} from "forge-std/Vm.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {TerraRouter, IStakeReader} from "../src/TerraRouter.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {HindsightLens} from "../src/HindsightLens.sol";
import {FriendJar, ITerraDeposit} from "../src/FriendJar.sol";
import {IUniversalRouter, IWIF, PoolKey} from "../src/interfaces/IExternal.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Mainnet constants + a deterministic deploy of the whole protocol (shared by tests and scripts).
abstract contract TerraConfig {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address internal constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address internal constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address internal constant WIF_HOOK = 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044;
    address internal constant ETH_USD = 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9;
    address internal constant USDG_USD = 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2;

    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address internal constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;
    address internal constant SNDK = 0xB90A19fF0Af67f7779afF50A882A9CfF42446400;
    address internal constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address internal constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;

    struct Deployment {
        StockOracle oracle;
        Jar jar;
        WifStaking staking;
        FeePool feePool;
        TerraRouter router;
        HindsightLens lens;
        FriendJar friendJar;
        uint256 start;
    }

    function wifKey() internal pure returns (PoolKey memory) {
        return PoolKey(address(0), WIF, 0, 200, WIF_HOOK);
    }

    function stocks() internal pure returns (StockOracle.Stock[6] memory s) {
        s[0] = StockOracle.Stock(
            NVDA, 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F, 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15,
            abi.encodePacked(WETH, uint24(500), NVDA), "NVDA"
        );
        s[1] = StockOracle.Stock(
            TSLA, 0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37, 0x4A1166a659A55625345e9515b32adECea5547C38,
            abi.encodePacked(WETH, uint24(3000), TSLA), "TSLA"
        );
        s[2] = StockOracle.Stock(
            GOOGL, 0x53e040D2C8c9278cBc4b702328aC652068a0E063, 0xF6f373a037c30F0e5010d854385cA89185AE638b,
            abi.encodePacked(WETH, uint24(500), USDG, uint24(500), GOOGL), "GOOGL"
        );
        s[3] = StockOracle.Stock(
            SNDK, 0x7FA2c251b345b8492C039a59a42b38603a05Ed9b, 0xfb133Fa4B7b385802B693a293606682Df47109A3,
            abi.encodePacked(WETH, uint24(500), USDG, uint24(10000), SNDK), "SNDK"
        );
        s[4] = StockOracle.Stock(
            SPY, 0x319724394D3A0e3669269846abE664Cd621f9f6A, 0x319724394D3A0e3669269846abE664Cd621f9f6A,
            abi.encodePacked(WETH, uint24(500), SPY), "SPY"
        );
        s[5] = StockOracle.Stock(
            QQQ, 0x80901d846d5D7B030F26B480776EE3b29374C2ae, 0x80901d846d5D7B030F26B480776EE3b29374C2ae,
            abi.encodePacked(WETH, uint24(3000), QQQ), "QQQ"
        );
    }

    /// @dev Deploys 7 contracts from `deployer` with CREATE-address prediction to break the dependency cycle
    ///      (Jar <-> TerraRouter <-> WifStaking <-> FeePool). Nothing is configurable afterwards.
    function deployAll(address deployer) internal returns (Deployment memory d) {
        uint64 n = VM.getNonce(deployer);
        address pJar = VM.computeCreateAddress(deployer, n + 1);
        address pStaking = VM.computeCreateAddress(deployer, n + 2);
        address pFeePool = VM.computeCreateAddress(deployer, n + 3);
        address pRouter = VM.computeCreateAddress(deployer, n + 4);
        d.start = block.timestamp - (block.timestamp % 1 hours); // epochs align to UTC hours

        d.oracle = new StockOracle(ETH_USD, USDG_USD, stocks());
        d.jar = new Jar(pRouter, pStaking);
        d.staking = new WifStaking(IERC20(WIF), d.oracle, d.jar, pFeePool, d.start);
        d.feePool = new FeePool(IUniversalRouter(UR), IWIF(WIF), d.oracle, IWifStakingPool(pStaking), wifKey(), d.start);
        d.router = new TerraRouter(
            UR, WETH, USDG, WIF, d.jar, d.oracle, address(d.feePool), IStakeReader(address(d.staking))
        );
        d.lens = new HindsightLens(d.oracle, IWIF(WIF));
        d.friendJar = new FriendJar(ITerraDeposit(address(d.router)), d.jar, d.oracle);

        require(address(d.jar) == pJar && address(d.staking) == pStaking, "predict");
        require(address(d.feePool) == pFeePool && address(d.router) == pRouter, "predict");
    }
}
