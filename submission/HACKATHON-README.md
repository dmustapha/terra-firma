# Terra Firma

> See what your memes would be in stock, then keep a slice of every trade as stock.

Live on Robinhood Chain mainnet: https://terrafirma-wif.vercel.app · proof: https://terrafirma-wif.vercel.app/proof · repo: https://github.com/dmustapha/terra-firma

## The Problem
Most meme traders on Robinhood Chain have a number they never look at: what all that money would be worth if it had gone into a real stock instead. One real wallet on the chain put about eighteen thousand dollars into memes; what is left is worth very little, while the same dollars in NVDA, bought at the same moments, would still be most of it. The chain has real Stock Tokens sitting right next to the memes, and nothing connects the two.

## What We Built
Terra Firma shows any wallet its Hindsight card, priced from the Chainlink round that was live at every buy. Then it lets you convert the dead memes into real Stock Tokens in an ownerless Jar, and keep a slice of up to ten percent of every future meme buy or sell as stock, in the same transaction.

## Our Integration
$WIF holds it together. Every trade pays a half percent fee that only ever buys $WIF. Once an hour the fee pool burns half of what it bought and turns the other half into real Stock Tokens for $WIF stakers, in the stock each of them picked. Staking 10,000 $WIF cuts your own fee to 0.3%, and minting your card burns one more $WIF. The full integration write-up, with file and line references and mainnet transactions, is in [`sponsor-tracks.md`](sponsor-tracks.md).

## What Makes This Different
I started from what traders already do instead of asking them to stop. The numbers are not estimates: a card can be recomputed onchain by `HindsightLens`, every stock fill is bounded by Chainlink, and $WIF is never sold by the protocol. More trading means more $WIF bought and burned and more stock paid to holders.

## Track
Stock Tokens, with hooks and defi and consumer and payments.

## Tech Stack
Solidity 0.8.26 with Foundry, Chainlink feeds, the Uniswap Universal Router, Next.js 15 with wagmi and viem on Vercel, and an hourly GitHub Actions keeper. Architecture, invariants and the security table live in the [repo README](../README.md#architecture).

## Verify in 60s
One command re-derives the mainnet claims from chain logs, no API keys:

```bash
git clone https://github.com/dmustapha/terra-firma.git && cd terra-firma && pnpm install && pnpm --dir web install
RPC_URL=https://rpc.mainnet.chain.robinhood.com pnpm verify-claims   # re-derives every row of CLAIMS.md, exits 1 on any mismatch
```

On the site, the Recompute box on [/proof](https://terrafirma-wif.vercel.app/proof) runs `HindsightLens.recompute` on a card's own inputs and shows the result next to the card. The committed record is [`proof.md`](proof.md).

## Try It
Open https://terrafirma-wif.vercel.app and paste any Robinhood Chain wallet, or connect your own. Wallets new to the domain may show a generic warning; MetaMask works once you acknowledge it.

## Demo Walkthrough
Demo video (2:58, every transaction real on Robinhood Chain mainnet): https://youtu.be/4tybHV9ezGc. The same film plays inline at the top of the [repo README](https://github.com/dmustapha/terra-firma#readme).

## Team
Solo build by Dami Mustapha ([@dmustapha](https://github.com/dmustapha)).
