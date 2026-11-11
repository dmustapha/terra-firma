// SPDX-License-Identifier: MIT
// File: contracts/src/HindsightLens.sol
// [ASSUMED] original pricing view over Chainlink getRoundData; round bracketing + NVDA scaling covered by
// test/HindsightLens.t.sol against real mainnet rounds (n=1, 24, 25, latest).
pragma solidity 0.8.26;

import {IAggregatorV3, IWIF} from "./interfaces/IExternal.sol";
import {StockOracle} from "./StockOracle.sol";

/// @title HindsightLens
/// @notice Anyone can recompute a Hindsight card onchain from its receipts: what was paid (priced with the
///         Chainlink round in effect at that time), how many shares of a stock that would have bought (the
///         stock's historical round), and what those shares are worth now. Optional: mint the card onchain
///         by burning 1 $WIF.
contract HindsightLens {
    uint8 public constant PAY_ETH = 0; // native ETH or WETH, priced by ETH/USD
    uint8 public constant PAY_USDG = 1; // USDG (6dp), priced by USDG/USD
    uint8 public constant PAY_STOCK = 2; // a curated Stock Token, priced by its history feed
    uint256 public constant CARD_BURN = 1e18;

    StockOracle public immutable oracle;
    IWIF public immutable wif;

    /// @param amountPaid amount of the paying asset in its own decimals (18 for ETH/stock, 6 for USDG)
    /// @param payRoundId Chainlink round of the paying asset's feed in effect at `ts`
    /// @param stockRoundId Chainlink round of the counterfactual stock's history feed in effect at `ts`
    /// @param payStockId curated stock id when payKind == PAY_STOCK
    struct Buy {
        uint8 payKind;
        uint8 payStockId;
        uint256 amountPaid;
        uint80 payRoundId;
        uint80 stockRoundId;
        uint64 ts;
    }

    event CardMinted(address indexed wallet, uint8 stockId, uint256 usdPaid8, uint256 shares18, uint256 usdNow8);

    error BadRound(address feed, uint80 roundId);
    error BadPayKind();

    constructor(StockOracle oracle_, IWIF wif_) {
        oracle = oracle_;
        wif = wif_;
    }

    /// @return usdPaid8 total USD paid (8dp)
    /// @return shares18 counterfactual stock shares (18dp)
    /// @return usdNow8 value of those shares at the latest round (8dp)
    function recompute(Buy[] calldata buys, uint8 stockId)
        public
        view
        returns (uint256 usdPaid8, uint256 shares18, uint256 usdNow8)
    {
        address hist = oracle.stock(stockId).historyFeed;
        for (uint256 i; i < buys.length; ++i) {
            Buy calldata b = buys[i];
            uint256 paid8 = _usdPaid8(b);
            uint256 stock8 = _priceAt(hist, b.stockRoundId, b.ts);
            usdPaid8 += paid8;
            shares18 += paid8 * 1e18 / stock8;
        }
        (, int256 nowAnswer,,,) = IAggregatorV3(hist).latestRoundData();
        usdNow8 = shares18 * uint256(nowAnswer) / 1e18;
    }

    /// @notice Recompute and record the card onchain, burning 1 $WIF from the caller (needs approval).
    function mintCard(Buy[] calldata buys, uint8 stockId) external {
        (uint256 usdPaid8, uint256 shares18, uint256 usdNow8) = recompute(buys, stockId);
        wif.burnFrom(msg.sender, CARD_BURN);
        emit CardMinted(msg.sender, stockId, usdPaid8, shares18, usdNow8);
    }

    function _usdPaid8(Buy calldata b) internal view returns (uint256) {
        if (b.payKind == PAY_ETH) {
            return b.amountPaid * _priceAt(address(oracle.ethUsdFeed()), b.payRoundId, b.ts) / 1e18;
        }
        if (b.payKind == PAY_USDG) {
            return b.amountPaid * _priceAt(address(oracle.usdgUsdFeed()), b.payRoundId, b.ts) / 1e6;
        }
        if (b.payKind == PAY_STOCK) {
            address feed = oracle.stock(b.payStockId).historyFeed;
            return b.amountPaid * _priceAt(feed, b.payRoundId, b.ts) / 1e18;
        }
        revert BadPayKind();
    }

    /// @dev Round `rid` must be the one in effect at `ts`: updatedAt(rid) <= ts < updatedAt(rid + 1),
    ///      or rid is the latest round. Answers are normalized to 8dp (NVDA early-round scaling).
    function _priceAt(address feed, uint80 rid, uint64 ts) internal view returns (uint256 price8) {
        uint256 at;
        (price8, at) = oracle.historicalAnswer8(feed, rid);
        if (at == 0 || at > ts) revert BadRound(feed, rid);
        (uint80 latest,,,,) = IAggregatorV3(feed).latestRoundData();
        if (rid < latest) {
            (,,, uint256 nextAt,) = IAggregatorV3(feed).getRoundData(rid + 1);
            if (nextAt != 0 && nextAt <= ts) revert BadRound(feed, rid);
        }
    }
}
