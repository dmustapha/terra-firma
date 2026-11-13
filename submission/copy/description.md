**Most meme traders on Robinhood Chain have never seen what their memes would be worth as stock. Terra Firma shows them, then quietly turns their trading into real Stock Tokens.**
World is Flat hackathon · Stock Tokens · hooks and defi · consumer and payments

## Project Status
- **Live on mainnet:** seven contracts on Robinhood Chain (4663), all source verified (Sourcify exact match).
- **Live app:** https://terrafirma-wif.vercel.app (the same app also runs at terra-firma-henna.vercel.app).
- **Real activity:** 11 routed trades, 2 hourly distributes that burned 22.43 $WIF in total, 2 staker claims paid in NVDA, 1 card minted, all listed on the proof page with explorer links.
- **Tests:** 62 contract tests on a mainnet fork, 25 adversarial and fuzz tests, 142 web tests.
- **Open source:** https://github.com/dmustapha/terra-firma

Everything below is implemented and runnable today.

## The Problem
Meme trading on Robinhood Chain is fun and almost always ends the same way: the bag goes to zero and nobody looks back at what that money could have been. The chain sits right next to real Stock Tokens, but there is no bridge between the habit people actually have and the assets that hold value.

## The Solution
Terra Firma builds a **Hindsight card** for any wallet from its real onchain buys, priced with the Chainlink round that was live at each buy, and shows what the same money would be in NVDA today. Then it lets you convert dead memes into real Stock Tokens in an ownerless Jar, and keep a slice of every future meme trade as stock. The key claim is that every number is recomputable onchain: `HindsightLens.recompute` re-derives a card from the same Chainlink rounds and rejects a round that was not in effect.

## How It Works
**1. See your number.** Paste or connect a wallet; the card prices every buy from Chainlink history.
**2. Convert.** `TerraRouter.convert` sells the meme through Uniswap and credits the Jar with a Stock Token, fill bounded by Chainlink.
**3. Keep a slice.** Any buy or sell can sweep up to 10% into the Jar as stock in the same transaction.
**4. Fees feed $WIF.** Every trade pays 0.5%; `FeePool.distribute` runs hourly: half buys and burns $WIF, half buys stock for $WIF stakers.
**5. Stake and claim.** Stakers pick their stock, claim it into their Jar, and 10,000 staked $WIF cuts their own fee to 0.3%.

## Key Features
- **Onchain recompute:** `HindsightLens` re-prices any card from Chainlink rounds.
- **Ownerless Jar:** no admin key, withdraw any time.
- **$WIF is never sold:** `TerraRouter` reverts `WifNotSellable`.
- **Anti-gaming stakes:** new stakes wait a full epoch before earning.
- **Card mint burn:** `mintCard` burns exactly 1 $WIF and lands on the leaderboard.
- **Friend Jars:** a group chat owns one stock together, pro rata, and anyone can exit with their share (`FriendJar`, live at /friends).
- **Weekly Jar report and share cards:** every card and every Jar report renders its own share image; the report has a Share to X button.
- **Leaderboard:** biggest regret (each minted card rebuilt from chain history before it ranks), biggest Jars, most fees paid.
- **Saving streak and Jar history:** consecutive days of sweeps and converts, and where every share in the Jar came from.
- **Live protocol feed:** server-sent events of every trade, sweep, burn and claim on the landing page.
- **Independent cross-checks:** Envio HyperSync builds card history; the Quicknode Stock Token API confirms the Jar's holdings to the wei.

## Tech Stack / Architecture
`Solidity 0.8.26` · `Foundry` · `Chainlink` · `Uniswap Universal Router` · `Next.js 15` · `wagmi` · `viem` · `Vercel` · `GitHub Actions keeper`

## Deployed Contracts (Robinhood Chain, chainId 4663)
| Contract | Address |
|---|---|
| TerraRouter | `0xBa4d301D9fD6f5e96c47961EE582851AF4db56Fa` |
| FeePool | `0xb1FDE1C822a3fA7542B7A87D730a1969B2bFf5EB` |
| WifStaking | `0x065783d9C37c10E1067B5042108E9EEa24429571` |
| Jar | `0xa921DCaF524c4A50f46F26543B0EA3DBD2a4d5bF` |
| HindsightLens | `0x2402898497B0532BCbdEE6339987F1D7056d4422` |
| StockOracle | `0xA79a67F16262DEF44f1DDaeF247d96a0a36EdA81` |
| FriendJar | `0x07E1b71f45890f995c81Df316f4d303cfc786769` (live at /friends) |

## Hackathon Alignment
✔ Primary category: Stock Tokens · also hooks and defi, consumer and payments. $WIF is used onchain in four ways: hourly buy-and-burn from fees, staking paid in Stock Tokens, a staker fee discount, and a burn per card mint.

## Try It / Links
- Live app: https://terrafirma-wif.vercel.app
- Proof page: https://terrafirma-wif.vercel.app/proof
- GitHub: https://github.com/dmustapha/terra-firma
- Demo video: https://youtu.be/4tybHV9ezGc
