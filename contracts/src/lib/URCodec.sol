// SPDX-License-Identifier: MIT
// File: contracts/src/lib/URCodec.sol
// [VERIFIED] command/action bytes + input layouts proven on RH mainnet fork (spike-fork.md).
// ROOT CAUSE (VERIFIED, test/URProbe.t.sol): this is Universal Router 2.1, whose V2_SWAP_EXACT_IN and
// V3_SWAP_EXACT_IN inputs carry a trailing `uint256[] maxHopSlippage`. Omitting it makes the calldata
// decoder revert SliceOutOfBounds(). We always append an empty array and pay legs with CONTRACT_BALANCE
// after an exact WRAP / token push (so each leg spends exactly what this call provided).
pragma solidity 0.8.26;

import {PoolKey, ExactInputSingleParams} from "../interfaces/IExternal.sol";

library URCodec {
    // Universal Router commands
    bytes1 internal constant V3_SWAP_EXACT_IN = 0x00;
    bytes1 internal constant V2_SWAP_EXACT_IN = 0x08;
    bytes1 internal constant WRAP_ETH = 0x0b;
    bytes1 internal constant UNWRAP_WETH = 0x0c;
    bytes1 internal constant V4_SWAP = 0x10;

    // v4 router actions
    uint8 internal constant SWAP_EXACT_IN_SINGLE = 0x06;
    uint8 internal constant SETTLE = 0x0b;
    uint8 internal constant SETTLE_ALL = 0x0c;
    uint8 internal constant TAKE_ALL = 0x0f;

    // ActionConstants
    address internal constant ADDRESS_THIS = address(2);
    uint256 internal constant CONTRACT_BALANCE = 1 << 255;

    function wrap(uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(ADDRESS_THIS, amount);
    }

    function unwrap(address recipient, uint256 minOut) internal pure returns (bytes memory) {
        return abi.encode(recipient, minOut);
    }

    /// V3 exact-in paid from the router's own balance (payerIsUser = false).
    function v3(address recipient, uint256 minOut, bytes memory path) internal pure returns (bytes memory) {
        return abi.encode(recipient, CONTRACT_BALANCE, minOut, path, false, new uint256[](0));
    }

    /// V2 exact-in paid from the router's own balance (payerIsUser = false).
    function v2(address recipient, uint256 minOut, address[] memory path) internal pure returns (bytes memory) {
        return abi.encode(recipient, CONTRACT_BALANCE, minOut, path, false, new uint256[](0));
    }

    /// v4 single-hop paying native ETH (currency0 = address(0)) and taking `currencyOut` to the UR caller.
    function v4EthIn(PoolKey memory key, uint256 amountIn, uint256 minOut) internal pure returns (bytes memory) {
        bytes memory actions = abi.encodePacked(SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL);
        bytes[] memory p = new bytes[](3);
        p[0] = abi.encode(ExactInputSingleParams(key, true, uint128(amountIn), uint128(minOut), ""));
        p[1] = abi.encode(key.currency0, amountIn);
        p[2] = abi.encode(key.currency1, minOut);
        return abi.encode(actions, p);
    }

    /// v4 single-hop selling `currency1` (already pushed to the UR) for native ETH taken to the UR caller.
    /// SETTLE with payerIsUser = false pays from the UR's own token balance.
    function v4TokenInForEth(PoolKey memory key, uint256 amountIn, uint256 minOut) internal pure returns (bytes memory) {
        bytes memory actions = abi.encodePacked(SWAP_EXACT_IN_SINGLE, SETTLE, TAKE_ALL);
        bytes[] memory p = new bytes[](3);
        p[0] = abi.encode(ExactInputSingleParams(key, false, uint128(amountIn), uint128(minOut), ""));
        p[1] = abi.encode(key.currency1, amountIn, false);
        p[2] = abi.encode(key.currency0, minOut);
        return abi.encode(actions, p);
    }

    function one(bytes1 c) internal pure returns (bytes memory) {
        return abi.encodePacked(c);
    }

    function two(bytes1 a, bytes1 b) internal pure returns (bytes memory) {
        return abi.encodePacked(a, b);
    }

    function inputs1(bytes memory a) internal pure returns (bytes[] memory r) {
        r = new bytes[](1);
        r[0] = a;
    }

    function inputs2(bytes memory a, bytes memory b) internal pure returns (bytes[] memory r) {
        r = new bytes[](2);
        r[0] = a;
        r[1] = b;
    }

    /// First and last token of a packed v3 path (20-byte address, 3-byte fee, 20-byte address, ...).
    function v3Ends(bytes memory path) internal pure returns (address first, address last) {
        require(path.length == 43 || path.length == 66, "path");
        assembly {
            first := shr(96, mload(add(path, 32)))
            last := shr(96, mload(add(add(path, 32), sub(mload(path), 20))))
        }
    }

    /// Middle token of a 2-hop packed v3 path.
    function v3Mid(bytes memory path) internal pure returns (address mid) {
        require(path.length == 66, "path");
        assembly {
            mid := shr(96, mload(add(path, 55)))
        }
    }
}
