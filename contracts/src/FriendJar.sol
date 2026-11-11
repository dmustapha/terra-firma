// SPDX-License-Identifier: MIT
// File: contracts/src/FriendJar.sol
// [ASSUMED] original pro-rata share accounting; GATED (OD7): deploy only if F-001..F-017 are green on mainnet
// by 2026-11-11 23:59 WAT. CAUTION: test immediately - test/FriendJar.t.sol.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Jar} from "./Jar.sol";
import {StockOracle} from "./StockOracle.sol";

interface ITerraDeposit {
    function deposit(uint8 stockId, uint256 minStockOut) external payable returns (uint256);
}

/// @title FriendJar
/// @notice A shared Jar for friends. Members contribute ETH, which TerraRouter turns into one real Stock Token
///         held in the main Jar under this contract's address; ownership is pro-rata to stock contributed.
///         Any member can exit at any time with their share of the real stock. No vouching, no lockups.
contract FriendJar is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ITerraDeposit public immutable router;
    Jar public immutable jar;
    StockOracle public immutable oracle;

    struct Group {
        uint8 stockId;
        address creator;
        bytes32 inviteHash; // keccak256(invite code) chosen by the creator
        uint256 totalShares;
    }

    Group[] public groups;
    mapping(uint256 => mapping(address => uint256)) public sharesOf;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => uint256) public stockOf; // stock units owned by each group inside the main Jar

    event JarCreated(uint256 indexed id, address indexed creator, uint8 stockId);
    event Joined(uint256 indexed id, address indexed member);
    event Contributed(uint256 indexed id, address indexed member, uint256 ethIn, uint256 stockOut);
    event Exited(uint256 indexed id, address indexed member, uint256 stockOut);

    error NotMember();
    error BadInvite();
    error NothingToExit();

    constructor(ITerraDeposit router_, Jar jar_, StockOracle oracle_) {
        router = router_;
        jar = jar_;
        oracle = oracle_;
    }

    function create(uint8 stockId, bytes32 inviteHash) external returns (uint256 id) {
        oracle.token(stockId); // reverts on a bad id
        id = groups.length;
        groups.push(Group(stockId, msg.sender, inviteHash, 0));
        isMember[id][msg.sender] = true;
        emit JarCreated(id, msg.sender, stockId);
        emit Joined(id, msg.sender);
    }

    function join(uint256 id, string calldata invite) external {
        if (keccak256(bytes(invite)) != groups[id].inviteHash) revert BadInvite();
        isMember[id][msg.sender] = true;
        emit Joined(id, msg.sender);
    }

    function contribute(uint256 id, uint256 minStockOut) external payable nonReentrant returns (uint256 stockOut) {
        if (!isMember[id][msg.sender]) revert NotMember();
        Group storage g = groups[id];
        stockOut = router.deposit{value: msg.value}(g.stockId, minStockOut);
        uint256 shares = g.totalShares == 0 ? stockOut : stockOut * g.totalShares / stockOf[id];
        g.totalShares += shares;
        sharesOf[id][msg.sender] += shares;
        stockOf[id] += stockOut;
        emit Contributed(id, msg.sender, msg.value, stockOut);
    }

    /// @notice Leave with your pro-rata share of the group's real stock, sent to your wallet.
    function exit(uint256 id) external nonReentrant returns (uint256 stockOut) {
        uint256 shares = sharesOf[id][msg.sender];
        if (shares == 0) revert NothingToExit();
        Group storage g = groups[id];
        stockOut = stockOf[id] * shares / g.totalShares;
        sharesOf[id][msg.sender] = 0;
        g.totalShares -= shares;
        stockOf[id] -= stockOut;
        address token = oracle.token(g.stockId);
        jar.withdraw(token, stockOut);
        IERC20(token).safeTransfer(msg.sender, stockOut);
        emit Exited(id, msg.sender, stockOut);
    }

    function groupCount() external view returns (uint256) {
        return groups.length;
    }
}
