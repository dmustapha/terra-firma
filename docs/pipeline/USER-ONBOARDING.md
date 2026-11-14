# USER-ONBOARDING: Terra Firma
Designed from the real user's entry (AMEND-4, Dami-ratified), not developer convenience.

## USER CLASSES
### U1 Meme trader (primary)
- WHO: non-US Robinhood Chain memecoin trader; already has a wallet with ETH on RH (MetaMask, Rabby, Coinbase Wallet, Robinhood Wallet via WalletConnect); buys memes by pasting contract addresses from X/Telegram; probably down on memes; has never bought a Stock Token. Uses web and phone equally.
- GENESIS: arrives from an X post (a friend's Hindsight card or the ship thread) or the WIF gallery; first account state = wallet with memes + some ETH, zero stock, maybe some $WIF.
- ONBOARDING: tap Connect → card renders in ~3–12s with receipts → "Fix it: convert to NVDA" → region attestation (once) → approve + sign → "You own 0.02 NVDA". First value (the card) needs zero signatures; first ownership needs one approval per meme + one tx.
- INTEGRATION: keeps their own wallet; Jar balances are visible in the app and withdrawable as standard ERC-20 Stock Tokens; trades via `/trade` instead of a bot or Uniswap UI; shares their card to X.

### U2 $WIF holder / staker
- WHO: holds $WIF (one of ~1.45K active $WIF voter wallets, or a WIF/ETH pool trader).
- GENESIS: arrives via the WIF community (Discord/X, vote phase); account state = wallet with $WIF and ETH.
- ONBOARDING: `/stake` → pick a reward stock (NVDA default) → approve + stake → "earning from next epoch" → after an epoch, pending reward visible → Claim to Jar.
- INTEGRATION: rewards are real Stock Tokens in the Jar; unstake with a 24h delay; burn counter shows the $WIF supply effect.

### U3 Judge / curious stranger (read-only)
- WHO: hackathon judge or a CT reader with no intent to transact (possibly in a restricted region).
- GENESIS: opens the live URL or a shared card link cold, no wallet connected.
- ONBOARDING: landing counters → "See a real card" → `/card/[addr]` with receipts → `/proof` with verified contracts and tx table → optionally "look up any wallet" with their own address.
- INTEGRATION: nothing to install; every number links to the explorer; recompute box verifies a card onchain.

## COLD-STRANGER GENESIS
A cold stranger with no prior setup reaches a real, receipt-backed Hindsight card via `/` → "or look up any wallet" (or "See a real card") with no login wall and no wallet; a meme trader with an existing RH wallet reaches owned stock via Connect → card → convert in two signatures for a single meme.

## USER PATH (not the demo's)
- REAL: Connect wallet → Hindsight card from their own onchain history → convert (attestation once) → trade memes in `/trade` with sweep → stake $WIF → claim rewards to Jar → withdraw any time.
- DEMO: identical path executed with the funded demo wallet on mainnet; no simulate button, no pasted numbers, no demo-only route. Seed state is real transactions made ahead of recording through the same UI/contracts.
