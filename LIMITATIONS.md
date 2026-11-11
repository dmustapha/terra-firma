# Limitations

## In scope (built for this submission)
- Hindsight card for any wallet over a curated registry of Robinhood Chain memes, priced from Chainlink rounds, recomputable onchain (HindsightLens).
- One-tap convert of non-$WIF memes into one of 6 real Stock Tokens held in an ownerless Jar; withdraw any time.
- Meme terminal over Uniswap v2/v3/v4 (incl. hooked and dynamic-fee pools) with a same-transaction sweep into stock.
- 0.5% fee (0.3% for >= 10K $WIF stakers) → hourly $WIF buy-and-burn + real-stock stream to $WIF stakers in the stock they pick.
- Card mint (burns 1 $WIF), leaderboards, saving streak, weekly report card, live event stream, Quicknode cross-check badge.
- Restricted-jurisdiction geofence (IP + attestation) on stock actions.

## Feature-gated (deliberately not built for this scope)
- Friend Jars UI. Reason: gated on the core being green on mainnet by 2026-11-11 23:59 WAT (OD7); contract ships and is tested.
- Memes outside the registry in Hindsight. Reason: per-token scans keep a card under ~12s; the registry is rebuilt by script.
- Buys paid in tokens other than ETH/WETH/USDG/curated stocks. Reason: no Chainlink price → shown as "unpriced", never estimated.
- Fee-on-transfer (taxed) memes in the terminal. Reason: received-amount accounting differs; flagged in the registry.
- Onchain geofencing. Reason: impossible without identity; the stock leg is gated in the frontend with attestation.
- Telegram bot. Reason: not selected at Phase 1.5; same router could serve it later.
- Dividend-driven features. Reason: no dividend step is guaranteed during judging (Thesis tripwire 2).
