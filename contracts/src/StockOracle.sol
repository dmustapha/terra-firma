// SPDX-License-Identifier: MIT
// File: contracts/src/StockOracle.sol
// [VERIFIED] feed addresses from Chainlink reference-data-directory (robinhood-mainnet); 8dp answers;
// heartbeat 86400s per directory; early-round scaling (NVDA, TSLA, GOOGL, SNDK, SPY, QQQ history feeds) from
// spike-indexing.md §4 + scripts/build-rounds.ts (every scaled row is a 1..k prefix rejoining the 8dp series within 10%).
pragma solidity 0.8.26;

import {IAggregatorV3} from "./interfaces/IExternal.sol";

/// @title StockOracle
/// @notice Ownerless registry of the 6 curated Stock Tokens + Chainlink reads and min-out math.
///         Nothing here can be changed after deployment.
contract StockOracle {
    uint8 public constant STOCKS = 6;
    uint16 public constant BAND_BPS = 300; // 3% Chainlink band on every stock fill
    uint256 public constant MAX_AGE = 25 hours; // Chainlink heartbeat (24h) + 1h grace
    /// @dev Early rounds of the stock history feeds report a 1e16-scaled value. An 8dp answer above 1e15
    ///      (a $10M share price) is impossible for the curated assets, so such answers are divided by 1e8.
    uint256 public constant SCALED_THRESHOLD = 1e15;

    struct Stock {
        address token; // ERC-8056 Stock Token (18dp)
        address liveFeed; // used for fills (24/7 feed where it exists)
        address historyFeed; // used by Hindsight (market-hours feed with history from 2026-06)
        bytes path; // packed Uniswap v3 path WETH -> ... -> token
        string symbol;
    }

    IAggregatorV3 public immutable ethUsdFeed;
    IAggregatorV3 public immutable usdgUsdFeed;
    Stock[STOCKS] private _stocks;

    error StaleOracle(address feed);
    error BadAnswer(address feed);
    error BadStock(uint8 id);

    constructor(address ethUsd, address usdgUsd, Stock[STOCKS] memory stocks_) {
        ethUsdFeed = IAggregatorV3(ethUsd);
        usdgUsdFeed = IAggregatorV3(usdgUsd);
        for (uint256 i; i < STOCKS; ++i) {
            _stocks[i] = stocks_[i];
        }
    }

    function stock(uint8 id) public view returns (Stock memory) {
        if (id >= STOCKS) revert BadStock(id);
        return _stocks[id];
    }

    function token(uint8 id) external view returns (address) {
        return stock(id).token;
    }

    function path(uint8 id) external view returns (bytes memory) {
        return stock(id).path;
    }

    /// @notice Fresh, positive 8dp price from a feed, or revert.
    function read(address feed) public view returns (uint256 price8) {
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        if (answer <= 0) revert BadAnswer(feed);
        if (updatedAt == 0 || block.timestamp - updatedAt > MAX_AGE) revert StaleOracle(feed);
        return uint256(answer);
    }

    function isFreshFeed(address feed) public view returns (bool) {
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        return answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= MAX_AGE;
    }

    function ethUsd() public view returns (uint256) {
        return read(address(ethUsdFeed));
    }

    function stockUsd(uint8 id) public view returns (uint256) {
        return read(stock(id).liveFeed);
    }

    function isFresh(uint8 id) external view returns (bool) {
        return isFreshFeed(address(ethUsdFeed)) && isFreshFeed(stock(id).liveFeed);
    }

    /// @notice Least stock (18dp) acceptable for `ethIn` wei, Chainlink price minus BAND_BPS.
    function minStockOut(uint8 id, uint256 ethIn) external view returns (uint256) {
        return ethIn * ethUsd() / stockUsd(id) * (10_000 - BAND_BPS) / 10_000;
    }

    /// @notice Historical answer normalized to 8 decimals (handles early-round 1e16 scaling on any feed).
    function historicalAnswer8(address feed, uint80 roundId)
        public
        view
        returns (uint256 price8, uint256 updatedAt)
    {
        (, int256 answer,, uint256 ts,) = IAggregatorV3(feed).getRoundData(roundId);
        if (answer <= 0) revert BadAnswer(feed);
        price8 = uint256(answer);
        if (price8 > SCALED_THRESHOLD) price8 = price8 / 1e8;
        updatedAt = ts;
    }
}
