// SPDX-License-Identifier: MIT
// File: contracts/src/interfaces/IExternal.sol
// [VERIFIED] signatures exercised on a Robinhood Chain mainnet fork (forge Phase 0B spike, block 111155803).
pragma solidity 0.8.26;

/// @notice Uniswap Universal Router (RH mainnet 0x8876789976dEcBfCbBbe364623C63652db8C0904).
interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Chainlink AggregatorV3 proxy.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256 answer, uint256 startedAt, uint256 updatedAt, uint80);
}

/// @notice $WIF is OpenZeppelin ERC20Burnable (burn + burnFrom), 18 decimals, no permit.
interface IWIF {
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/// @notice Canonical WETH9 on RH mainnet (0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73).
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

/// @notice Uniswap v4 PoolKey (currency0 < currency1; native ETH = address(0)).
struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @notice v4-periphery IV4Router.ExactInputSingleParams (5-field form, VERIFIED on RH UR).
struct ExactInputSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 amountIn;
    uint128 amountOutMinimum;
    bytes hookData;
}
