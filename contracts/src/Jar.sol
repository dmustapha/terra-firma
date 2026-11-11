// SPDX-License-Identifier: MIT
// File: contracts/src/Jar.sol
// [VERIFIED] pattern: contracts can hold Stock Tokens (fact-check CR3); OpenZeppelin v5.1.0 SafeERC20/ReentrancyGuard.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Jar
/// @notice One ownerless contract holding every user's real Stock Tokens in a per-user ledger.
///         Only the immutable depositors (TerraRouter, WifStaking) can credit, and only with tokens
///         that have actually arrived. Only the user can withdraw their balance, at any time.
contract Jar is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SOURCE_CONVERT = 1;
    uint8 public constant SOURCE_SWEEP = 2;
    uint8 public constant SOURCE_REWARD = 3;
    uint8 public constant SOURCE_DEPOSIT = 4;

    address public immutable router;
    address public immutable staking;

    mapping(address user => mapping(address stock => uint256)) public balanceOf;
    mapping(address stock => uint256) public totalHeld;

    event Credited(address indexed user, address indexed stock, uint256 amount, uint8 source);
    event Withdrawn(address indexed user, address indexed stock, uint256 amount);

    error NotDepositor();
    error Unbacked();
    error Insufficient();

    constructor(address router_, address staking_) {
        router = router_;
        staking = staking_;
    }

    /// @notice Record `amount` of `stock` for `user`. The tokens must already be in this contract.
    function credit(address user, address stock, uint256 amount, uint8 source) external {
        if (msg.sender != router && msg.sender != staking) revert NotDepositor();
        uint256 held = totalHeld[stock] + amount;
        if (IERC20(stock).balanceOf(address(this)) < held) revert Unbacked();
        totalHeld[stock] = held;
        balanceOf[user][stock] += amount;
        emit Credited(user, stock, amount, source);
    }

    /// @notice Withdraw your own real Stock Tokens to your wallet.
    function withdraw(address stock, uint256 amount) external nonReentrant {
        uint256 bal = balanceOf[msg.sender][stock];
        if (amount > bal) revert Insufficient();
        balanceOf[msg.sender][stock] = bal - amount;
        totalHeld[stock] -= amount;
        IERC20(stock).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, stock, amount);
    }
}
