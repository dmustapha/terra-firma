# Integrations and categories

World is Flat has one prize and no sponsor bounties, so this file justifies the categories we picked and the partner tech we actually use, strongest first. Every code path below was checked with grep against the repo.

## $WIF on Robinhood Chain (required by the rules)

**What we use:** the $WIF token `0x5173b8eA6923c2d40267890D45C46a3480954773` and the hooked $WIF/ETH Uniswap v4 pool.
**Where in the code:** `contracts/src/FeePool.sol:90` (`distribute`), `:107` (`_buyAndBurn`), `:123` (`_streamToStakers`); `contracts/src/WifStaking.sol:93` (`stake`), `:159` (`claim`); `contracts/src/TerraRouter.sol:184` (`feeBps`, the 10,000 $WIF discount), `:194` (`WifNotSellable`); `contracts/src/HindsightLens.sol:68` (`mintCard`, burns 1 $WIF).
**What it does in our project:** every trade, convert and buy-with-stock pays 0.5% into the FeePool, and that money only ever buys $WIF. Once an hour `distribute` splits the pool: half buys $WIF and burns it, half buys Stock Tokens that stream to $WIF stakers in the stock each staker picked. Stakes only earn after a full epoch, so nobody can jump in just before a payout. Holding 10,000 staked $WIF drops your own fee to 0.3%, and minting a Hindsight card burns exactly 1 $WIF. Nothing in the protocol ever sells $WIF.
**Proof of integration:**
- First distribute, 11.07 $WIF burned: https://robinhoodchain.blockscout.com/tx/0xbd23368477c98de488447b1c20895b8d438bdba9977d63b8f01835899d0287c0
- Second distribute (22.43 $WIF burned in total): https://robinhoodchain.blockscout.com/tx/0x0d23d2d3fbba68a4a84e497bd9063bdc222df376d65cd383271f5ac41764aa9d
- Card mint, 1 $WIF burned: https://robinhoodchain.blockscout.com/tx/0x81bfa5ff6814b1325be443cdd62ec2008e7dbdf3280a20c5e857818f9c2b9d11
- Staker claim paid in NVDA: https://robinhoodchain.blockscout.com/tx/0x37441924dfa9af929f8c4e13dd584801658e802689f81bd2ff26839aad223834
**Integration depth:** Platinum. $WIF is in the fee path, the burn, staking rewards, fee pricing and the card mint, and all of it has happened on mainnet.

## Stock Tokens (primary category)

**What we use:** Robinhood Chain Stock Tokens (NVDA, TSLA, GOOGL, SNDK, SPY, QQQ) held per user in an ownerless Jar.
**Where in the code:** `contracts/src/Jar.sol`, `contracts/src/StockOracle.sol`, `TerraRouter.sol:102` (`buy` with sweep), `:128` (`sell` with sweep), `:154` (`convert`).
**What it does in our project:** converts sell dead memes and credit real Stock Tokens to the user's Jar; any buy or sell can sweep up to 10% (`MAX_SWEEP_BPS = 1000`, `TerraRouter.sol:34`) into stock in the same transaction; stakers are paid in Stock Tokens. Stock actions are geofenced off for restricted jurisdictions in the frontend.
**Proof of integration:** convert https://robinhoodchain.blockscout.com/tx/0xc5500b3cdd258f293c22f126f614af07c8ae541b159d27bd7ca84a85872131b5 · buy with a 2% slice into NVDA https://robinhoodchain.blockscout.com/tx/0xea3f511478a2f387dd0bf118b37fe5d8d84feac77c7b8cfc1c49ebb3052f20d3
**Integration depth:** Gold.

## Chainlink price feeds

**What we use:** the Robinhood Chain stock feeds (for example "RHNVDA / USD") plus ETH/USD and USDG/USD, both latest and historical rounds.
**Where in the code:** `contracts/src/StockOracle.sol:89` (`historicalAnswer8`), `contracts/src/HindsightLens.sol:50` (`recompute`).
**What it does in our project:** every Hindsight buy is priced from the round that was in effect at that second, and `recompute` rejects any round that was not, so anyone can re-derive a card onchain. Stock fills are bounded by Chainlink, so a stale or bad price reverts instead of filling.
**Integration depth:** Gold. I spot-checked three real buys on the 0x3fDB wallet: the app's NVDA price equals the feed's round answer, and each round's time brackets the buy.

## Uniswap (hooks and defi category)

**What we use:** the Uniswap Universal Router across v2, v3 and v4 pools, including the hooked $WIF/ETH v4 pool.
**Where in the code:** `contracts/src/TerraRouter.sol`, `contracts/src/FeePool.sol`, `web/lib/quote.ts`.
**What it does in our project:** the meme terminal quotes every pool type and routes through the Universal Router; the FeePool's $WIF buy goes through the hooked v4 pool.
**Integration depth:** Silver.

> **Honest note:** we use Uniswap's router and pools; we did not write a v4 hook of our own.

## GetBlock

**What we use:** GetBlock RPC and websockets for Robinhood Chain.
**Where in the code:** `web/app/api/rpc/route.ts:68`, `web/lib/rpc.ts:28`, `web/app/api/stream/route.ts:132`.
**What it does in our project:** server-side reads and the live event stream run through GetBlock, so the public RPC's per-IP limit does not break the page. The endpoint never reaches the browser.
**Integration depth:** Silver.

## Quicknode Stock Token API

**What we use:** the Stock Token API add-on on a Robinhood Chain mainnet endpoint.
**Where in the code:** `web/app/api/qn-jar/route.ts:29` (`qn_getStockTokenBalances`), badge in `web/components/jar-view.tsx:124`.
**What it does in our project:** the Jar page asks Quicknode what Stock Tokens the Jar contract holds and compares it to direct `balanceOf` reads. When they agree to the wei it shows "Verified by Quicknode Stock Token API". Display only, never in the money path.
**Proof of integration:** live at https://terrafirma-wif.vercel.app/api/qn-jar (on 2026-11-12 both sides read 8401797135669796 NVDA units).
**Integration depth:** Silver.

## Envio HyperSync

**What we use:** Robinhood Chain HyperSync for wallet transfer history.
**Where in the code:** `web/lib/hypersync.ts`, called from `web/lib/hindsight.ts:95`.
**What it does in our project:** a Hindsight card needs every meme buy a wallet made. HyperSync returns those transfers in one query; if it errors, the card falls back to a chunked `eth_getLogs` scan, so a card never depends on one indexer.
**Integration depth:** Silver.
