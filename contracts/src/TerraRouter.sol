// SPDX-License-Identifier: MIT
// File: contracts/src/TerraRouter.sol
// [VERIFIED] money-path pattern proven on RH mainnet fork (spike-fork.md: swapAndSweep 356k gas, -0.04% vs Chainlink).
// [VERIFIED] v4 token->ETH leg (SETTLE payerIsUser=false + TAKE_ALL): test_sellV4_plain on the mainnet fork; all route kinds in test/TerraFirma.t.sol.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniversalRouter, PoolKey} from "./interfaces/IExternal.sol";
import {URCodec} from "./lib/URCodec.sol";
import {StockOracle} from "./StockOracle.sol";
import {Jar} from "./Jar.sol";

interface IStakeReader {
    function activeOf(address user) external view returns (uint256);
}

/// @title TerraRouter
/// @notice Meme buy/sell/convert through the Uniswap Universal Router. Every trade pays a 0.5% fee
///         (0.3% for >= 10,000 $WIF active stakers) to the FeePool and sweeps the user's chosen slice
///         into a real Stock Token credited to their Jar, in the same transaction.
///         The router encodes every Universal Router command itself from a typed Route; callers can
///         never pass raw commands. $WIF can be bought here but never sold or converted.
contract TerraRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant KIND_V2 = 1;
    uint8 public constant KIND_V3 = 2;
    uint8 public constant KIND_V4 = 3;
    uint16 public constant FEE_BPS = 50;
    uint16 public constant STAKER_FEE_BPS = 30;
    uint256 public constant DISCOUNT_STAKE = 10_000e18;
    uint16 public constant MAX_SWEEP_BPS = 1000;
    uint8 internal constant SRC_CONVERT = 1;
    uint8 internal constant SRC_SWEEP = 2;
    uint8 internal constant SRC_DEPOSIT = 4;

    IUniversalRouter public immutable ur;
    address public immutable weth;
    address public immutable usdg;
    address public immutable wif;
    Jar public immutable jar;
    StockOracle public immutable oracle;
    address public immutable feePool;
    IStakeReader public immutable staking;

    /// @param kind 1 = Uniswap v2, 2 = v3 (packed path), 3 = v4 single hop against native ETH.
    /// @param v2Path v2 token path (length 2: [WETH, token] for buys, [token, WETH] for sells).
    /// @param v3Path packed v3 path (1 hop, or 2 hops through USDG) from WETH to token (buy) or token to WETH (sell).
    /// @param key v4 PoolKey with currency0 = address(0) (native ETH) and currency1 = token.
    struct Route {
        uint8 kind;
        address[] v2Path;
        bytes v3Path;
        PoolKey key;
    }

    event Traded(
        address indexed user, address indexed token, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 fee
    );
    event Swept(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut);
    /// @notice A direct ETH -> Stock Token deposit into the Jar (distinct from trade sweeps, which emit Swept).
    event Deposited(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut);
    event Converted(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut, uint256 memes);

    error WifNotSellable();
    error SweepTooHigh();
    error Slippage();
    error BadRoute();
    error NothingToConvert();
    error EthTransferFailed();
    error LengthMismatch();

    constructor(
        address ur_,
        address weth_,
        address usdg_,
        address wif_,
        Jar jar_,
        StockOracle oracle_,
        address feePool_,
        IStakeReader staking_
    ) {
        ur = IUniversalRouter(ur_);
        weth = weth_;
        usdg = usdg_;
        wif = wif_;
        jar = jar_;
        oracle = oracle_;
        feePool = feePool_;
        staking = staking_;
    }

    receive() external payable {}

    // ----------------------------------------------------------------------------------------------
    // User entry points
    // ----------------------------------------------------------------------------------------------

    /// @notice Buy `token` with ETH; sweep `sweepBps` of msg.value into `stockId` in the caller's Jar.
    function buy(Route calldata r, address token, uint16 sweepBps, uint8 stockId, uint256 minTokenOut, uint256 minStockOut)
        external
        payable
        nonReentrant
        returns (uint256 tokenOut, uint256 stockOut)
    {
        if (sweepBps > MAX_SWEEP_BPS) revert SweepTooHigh();
        _validate(r, token, true);
        uint256 fee = msg.value * feeBps(msg.sender) / 10_000;
        uint256 sweep = msg.value * sweepBps / 10_000;
        uint256 trade = msg.value - fee - sweep;
        _sendEth(feePool, fee);

        uint256 before = IERC20(token).balanceOf(msg.sender);
        _swapEthForToken(r, token, trade, minTokenOut, msg.sender);
        tokenOut = IERC20(token).balanceOf(msg.sender) - before;
        if (tokenOut < minTokenOut) revert Slippage();

        if (sweep > 0) {
            stockOut = _ethToJar(msg.sender, stockId, sweep, minStockOut, SRC_SWEEP);
            emit Swept(msg.sender, stockId, sweep, stockOut);
        }
        emit Traded(msg.sender, token, true, msg.value, tokenOut, fee);
    }

    /// @notice Sell `amountIn` of `token` for ETH; sweep `sweepBps` of the proceeds into the caller's Jar.
    function sell(
        Route calldata r,
        address token,
        uint256 amountIn,
        uint16 sweepBps,
        uint8 stockId,
        uint256 minEthOut,
        uint256 minStockOut
    ) external nonReentrant returns (uint256 ethOut, uint256 stockOut) {
        if (sweepBps > MAX_SWEEP_BPS) revert SweepTooHigh();
        _validate(r, token, false);
        uint256 proceeds = _sellToEth(r, token, amountIn);
        uint256 fee = proceeds * feeBps(msg.sender) / 10_000;
        uint256 sweep = proceeds * sweepBps / 10_000;
        ethOut = proceeds - fee - sweep;
        if (ethOut < minEthOut) revert Slippage();
        _sendEth(feePool, fee);
        if (sweep > 0) {
            stockOut = _ethToJar(msg.sender, stockId, sweep, minStockOut, SRC_SWEEP);
            emit Swept(msg.sender, stockId, sweep, stockOut);
        }
        _sendEth(msg.sender, ethOut);
        emit Traded(msg.sender, token, false, proceeds, amountIn, fee);
    }

    /// @notice Sell several non-$WIF memes and put 100% of the proceeds (after fee) into `stockId` in the Jar.
    function convert(
        Route[] calldata rs,
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint8 stockId,
        uint256 minStockOut
    ) external nonReentrant returns (uint256 stockOut) {
        uint256 n = rs.length;
        if (n == 0) revert NothingToConvert();
        if (tokens.length != n || amounts.length != n) revert LengthMismatch();
        uint256 proceeds;
        for (uint256 i; i < n; ++i) {
            _validate(rs[i], tokens[i], false);
            proceeds += _sellToEth(rs[i], tokens[i], amounts[i]);
        }
        uint256 fee = proceeds * feeBps(msg.sender) / 10_000;
        _sendEth(feePool, fee);
        stockOut = _ethToJar(msg.sender, stockId, proceeds - fee, minStockOut, SRC_CONVERT);
        emit Converted(msg.sender, stockId, proceeds, stockOut, n);
    }

    /// @notice Buy a Stock Token straight into the caller's Jar with ETH (fee applies).
    function deposit(uint8 stockId, uint256 minStockOut) external payable nonReentrant returns (uint256 stockOut) {
        uint256 fee = msg.value * feeBps(msg.sender) / 10_000;
        _sendEth(feePool, fee);
        stockOut = _ethToJar(msg.sender, stockId, msg.value - fee, minStockOut, SRC_DEPOSIT);
        emit Deposited(msg.sender, stockId, msg.value - fee, stockOut);
    }

    /// @notice 30 bps for wallets with >= 10,000 $WIF active stake, else 50 bps. Reads a stake amount, never a price.
    function feeBps(address user) public view returns (uint16) {
        return staking.activeOf(user) >= DISCOUNT_STAKE ? STAKER_FEE_BPS : FEE_BPS;
    }

    // ----------------------------------------------------------------------------------------------
    // Internals
    // ----------------------------------------------------------------------------------------------

    /// @dev Route endpoints must match the declared token and the ETH side; $WIF can never be an input.
    function _validate(Route calldata r, address token, bool isBuy) internal view {
        if (!isBuy && token == wif) revert WifNotSellable();
        if (token == address(0) || token == weth) revert BadRoute();
        if (r.kind == KIND_V2) {
            if (r.v2Path.length != 2) revert BadRoute();
            (address a, address b) = isBuy ? (weth, token) : (token, weth);
            if (r.v2Path[0] != a || r.v2Path[1] != b) revert BadRoute();
        } else if (r.kind == KIND_V3) {
            (address first, address last) = URCodec.v3Ends(r.v3Path);
            (address a, address b) = isBuy ? (weth, token) : (token, weth);
            if (first != a || last != b) revert BadRoute();
            if (r.v3Path.length == 66 && URCodec.v3Mid(r.v3Path) != usdg) revert BadRoute();
        } else if (r.kind == KIND_V4) {
            if (r.key.currency0 != address(0) || r.key.currency1 != token) revert BadRoute();
        } else {
            revert BadRoute();
        }
    }

    function _swapEthForToken(Route calldata r, address token, uint256 amount, uint256 minOut, address to) internal {
        if (r.kind == KIND_V4) {
            uint256 before = IERC20(token).balanceOf(address(this));
            ur.execute{value: amount}(
                URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(URCodec.v4EthIn(r.key, amount, minOut)), block.timestamp
            );
            IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)) - before);
            return;
        }
        bytes memory leg = r.kind == KIND_V3 ? URCodec.v3(to, minOut, r.v3Path) : URCodec.v2(to, minOut, r.v2Path);
        bytes1 cmd = r.kind == KIND_V3 ? URCodec.V3_SWAP_EXACT_IN : URCodec.V2_SWAP_EXACT_IN;
        ur.execute{value: amount}(
            URCodec.two(URCodec.WRAP_ETH, cmd), URCodec.inputs2(URCodec.wrap(amount), leg), block.timestamp
        );
    }

    /// @dev Pull `amountIn` from the caller, push it to the UR, swap to ETH delivered to this contract.
    ///      Returns the ETH actually received (fee-on-transfer tokens get whatever arrives).
    function _sellToEth(Route calldata r, address token, uint256 amountIn) internal returns (uint256 ethOut) {
        uint256 got = _pull(token, amountIn);
        IERC20(token).safeTransfer(address(ur), got);
        uint256 before = address(this).balance;
        if (r.kind == KIND_V4) {
            ur.execute(
                URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(URCodec.v4TokenInForEth(r.key, got, 0)), block.timestamp
            );
        } else {
            bytes memory leg = r.kind == KIND_V3
                ? URCodec.v3(URCodec.ADDRESS_THIS, 0, r.v3Path)
                : URCodec.v2(URCodec.ADDRESS_THIS, 0, r.v2Path);
            bytes1 cmd = r.kind == KIND_V3 ? URCodec.V3_SWAP_EXACT_IN : URCodec.V2_SWAP_EXACT_IN;
            ur.execute(
                URCodec.two(cmd, URCodec.UNWRAP_WETH),
                URCodec.inputs2(leg, URCodec.unwrap(address(this), 0)),
                block.timestamp
            );
        }
        ethOut = address(this).balance - before;
    }

    /// @dev ETH -> Stock Token (Chainlink-bounded) delivered to the Jar and credited to `user`.
    function _ethToJar(address user, uint8 stockId, uint256 ethIn, uint256 userMin, uint8 source)
        internal
        returns (uint256 stockOut)
    {
        address stockToken = oracle.token(stockId);
        uint256 oracleMin = oracle.minStockOut(stockId, ethIn); // reverts StaleOracle if not fresh
        uint256 minOut = userMin > oracleMin ? userMin : oracleMin;
        uint256 before = IERC20(stockToken).balanceOf(address(jar));
        ur.execute{value: ethIn}(
            URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN),
            URCodec.inputs2(URCodec.wrap(ethIn), URCodec.v3(address(jar), minOut, oracle.path(stockId))),
            block.timestamp
        );
        stockOut = IERC20(stockToken).balanceOf(address(jar)) - before;
        if (stockOut < minOut) revert Slippage();
        jar.credit(user, stockToken, stockOut, source);
    }

    function _pull(address token, uint256 amount) internal returns (uint256 got) {
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        got = IERC20(token).balanceOf(address(this)) - before;
    }

    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
