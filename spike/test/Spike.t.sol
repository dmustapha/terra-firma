// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function burn(uint256) external;
    function transferFrom(address, address, uint256) external returns (bool);
}

interface IUR {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

interface IFeed {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }
struct ExactInputSingleParams { PoolKey poolKey; bool zeroForOne; uint128 amountIn; uint128 amountOutMinimum; bytes hookData; }

/// Throwaway prototype of the Terra Router money path (spike only).
contract SpikeRouter {
    address constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant HOOK = 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044;
    IFeed constant ETH_USD = IFeed(0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9);
    IFeed constant NVDA_USD = IFeed(0x321A36e441DfBadA01Aa6f9884F14a344E133D1F);
    address constant UR_THIS = address(2); // ActionConstants.ADDRESS_THIS
    uint256 constant CONTRACT_BALANCE = 1 << 255;

    function _v4EthToWif(uint256 amt, uint128 minOut) internal pure returns (bytes memory) {
        PoolKey memory key = PoolKey(address(0), WIF, 0, 200, HOOK);
        bytes memory actions = abi.encodePacked(uint8(0x06), uint8(0x0c), uint8(0x0f));
        bytes[] memory p = new bytes[](3);
        p[0] = abi.encode(ExactInputSingleParams(key, true, uint128(amt), minOut, ""));
        p[1] = abi.encode(address(0), amt);
        p[2] = abi.encode(WIF, uint256(minOut));
        return abi.encode(actions, p);
    }

    /// Buy WIF with ETH through the hooked v4 pool, then burn it. Returns amount burned.
    function buyAndBurnWif(uint128 minOut) external payable returns (uint256 burned) {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _v4EthToWif(msg.value, minOut);
        IUR(UR).execute{value: msg.value}(hex"10", inputs, block.timestamp);
        burned = IERC20(WIF).balanceOf(address(this));
        IERC20(WIF).burn(burned);
    }

    /// Chainlink-bounded min-out for ETH -> NVDA (both feeds 8dp, both tokens 18dp).
    function nvdaMinOut(uint256 ethIn, uint256 bandBps) public view returns (uint256) {
        (, int256 e,, uint256 eAt,) = ETH_USD.latestRoundData();
        (, int256 n,, uint256 nAt,) = NVDA_USD.latestRoundData();
        require(e > 0 && n > 0, "feed");
        require(block.timestamp - eAt < 6 hours && block.timestamp - nAt < 6 hours, "stale");
        return ethIn * uint256(e) / uint256(n) * (10_000 - bandBps) / 10_000;
    }

    /// Sweep: ETH -> WETH -> NVDA (v3 fee 500) delivered straight to `to`.
    function sweepToNvda(address to, uint256 bandBps) external payable returns (uint256 got) {
        uint256 minOut = nvdaMinOut(msg.value, bandBps);
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = abi.encode(UR_THIS, msg.value); // WRAP_ETH
        inputs[1] = abi.encode(to, CONTRACT_BALANCE, minOut, abi.encodePacked(WETH, uint24(500), NVDA), false);
        uint256 before = IERC20(NVDA).balanceOf(to);
        IUR(UR).execute{value: msg.value}(hex"0b00", inputs, block.timestamp);
        got = IERC20(NVDA).balanceOf(to) - before;
    }

    /// Meme buy (v3 WETH->meme) with sweep + fee in ONE tx: the platform invariant.
    function swapAndSweep(address meme, uint24 fee, uint256 sweepBps, uint256 feeBps, uint256 memeMin)
        external payable returns (uint256 memeOut, uint256 nvdaOut, uint256 feeKept)
    {
        feeKept = msg.value * feeBps / 10_000;
        uint256 sweep = msg.value * sweepBps / 10_000;
        uint256 trade = msg.value - feeKept - sweep;
        bytes[] memory inputs = new bytes[](4);
        inputs[0] = abi.encode(UR_THIS, trade);
        inputs[1] = abi.encode(msg.sender, CONTRACT_BALANCE, memeMin, abi.encodePacked(WETH, fee, meme), false);
        inputs[2] = abi.encode(UR_THIS, sweep);
        inputs[3] = abi.encode(msg.sender, CONTRACT_BALANCE, sweep == 0 ? 0 : nvdaMinOut(sweep, 300), abi.encodePacked(WETH, uint24(500), NVDA), false);
        uint256 m0 = IERC20(meme).balanceOf(msg.sender);
        uint256 n0 = IERC20(NVDA).balanceOf(msg.sender);
        if (sweep == 0) IUR(UR).execute{value: trade}(hex"0b00", _trim(inputs, 2), block.timestamp);
        else IUR(UR).execute{value: trade + sweep}(hex"0b000b00", inputs, block.timestamp);
        memeOut = IERC20(meme).balanceOf(msg.sender) - m0;
        nvdaOut = IERC20(NVDA).balanceOf(msg.sender) - n0;
    }

    function _trim(bytes[] memory a, uint256 n) internal pure returns (bytes[] memory b) {
        b = new bytes[](n);
        for (uint256 i; i < n; ++i) b[i] = a[i];
    }

    /// Meme sell: pull meme (plain approve), push to UR, v3 meme->WETH, unwrap to this.
    function sellMeme(address meme, uint24 fee, uint256 amt, uint256 minEth) external returns (uint256 ethOut) {
        IERC20(meme).transferFrom(msg.sender, address(this), amt);
        IERC20(meme).transfer(UR, amt);
        bytes[] memory inputs = new bytes[](2);
        inputs[0] = abi.encode(UR_THIS, CONTRACT_BALANCE, minEth, abi.encodePacked(meme, fee, WETH), false);
        inputs[1] = abi.encode(address(this), minEth); // UNWRAP_WETH
        uint256 b0 = address(this).balance;
        IUR(UR).execute(hex"000c", inputs, block.timestamp);
        ethOut = address(this).balance - b0;
    }

    receive() external payable {}
}


contract SpikeTest is Test {
    SpikeRouter r;
    address constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    address user = address(0xBEEF);

    function setUp() public {
        vm.createSelectFork(vm.envOr("RPC", string("https://rpc.mainnet.chain.robinhood.com")), 111155803);
        r = new SpikeRouter();
        vm.deal(user, 1 ether);
    }

    function test_buyAndBurnWif() public {
        uint256 s0 = IERC20(WIF).totalSupply();
        uint256 g = gasleft();
        uint256 burned = r.buyAndBurnWif{value: 0.001 ether}(1);
        emit log_named_uint("gas buyAndBurn", g - gasleft());
        emit log_named_decimal_uint("WIF burned", burned, 18);
        assertEq(s0 - IERC20(WIF).totalSupply(), burned, "supply drop == burned");
        assertGt(burned, 0);
    }

    function test_minOutReverts() public {
        vm.expectRevert();
        r.buyAndBurnWif{value: 0.001 ether}(type(uint128).max);
    }

    function test_sweepToNvda() public {
        uint256 g = gasleft();
        uint256 got = r.sweepToNvda{value: 0.002 ether}(user, 300);
        emit log_named_uint("gas sweep", g - gasleft());
        emit log_named_decimal_uint("NVDA out", got, 18);
        emit log_named_decimal_uint("CL minOut(0bps)", r.nvdaMinOut(0.002 ether, 0), 18);
        assertGt(got, 0);
    }

    function test_swapAndSweep_PONS() public {
        vm.prank(user);
        uint256 g = gasleft();
        (uint256 m, uint256 n, uint256 f) = r.swapAndSweep{value: 0.003 ether}(PONS, 3000, 200, 50, 1);
        emit log_named_uint("gas swapAndSweep", g - gasleft());
        emit log_named_decimal_uint("PONS out", m, 18);
        emit log_named_decimal_uint("NVDA swept", n, 18);
        emit log_named_decimal_uint("fee kept ETH", f, 18);
        assertGt(m, 0); assertGt(n, 0);
    }

    function test_sellMeme_PONS() public {
        vm.prank(user);
        r.swapAndSweep{value: 0.003 ether}(PONS, 3000, 0, 0, 1);
        uint256 bal = IERC20(PONS).balanceOf(user);
        vm.startPrank(user);
        IERC20(PONS).approve(address(r), bal);
        uint256 out = r.sellMeme(PONS, 3000, bal, 1);
        vm.stopPrank();
        emit log_named_decimal_uint("PONS sold -> ETH", out, 18);
        assertGt(out, 0);
    }
}
