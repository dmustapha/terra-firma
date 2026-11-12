# Terra Firma — onchain proof (Robinhood Chain mainnet 4663)

Generated 2026-11-12T07:31:39.431Z by `pnpm tsx scripts/proof.ts` from RPC logs, deployment block 111602102 to head 112357645. Every number below is a sum of onchain events; rerun the script to recompute.

## Contracts
| Contract | Address |
|---|---|
| StockOracle | [`0xA79a67F16262DEF44f1DDaeF247d96a0a36EdA81`](https://robinhoodchain.blockscout.com/address/0xA79a67F16262DEF44f1DDaeF247d96a0a36EdA81) |
| Jar | [`0xa921DCaF524c4A50f46F26543B0EA3DBD2a4d5bF`](https://robinhoodchain.blockscout.com/address/0xa921DCaF524c4A50f46F26543B0EA3DBD2a4d5bF) |
| WifStaking | [`0x065783d9C37c10E1067B5042108E9EEa24429571`](https://robinhoodchain.blockscout.com/address/0x065783d9C37c10E1067B5042108E9EEa24429571) |
| FeePool | [`0xb1FDE1C822a3fA7542B7A87D730a1969B2bFf5EB`](https://robinhoodchain.blockscout.com/address/0xb1FDE1C822a3fA7542B7A87D730a1969B2bFf5EB) |
| TerraRouter | [`0xBa4d301D9fD6f5e96c47961EE582851AF4db56Fa`](https://robinhoodchain.blockscout.com/address/0xBa4d301D9fD6f5e96c47961EE582851AF4db56Fa) |
| HindsightLens | [`0x2402898497B0532BCbdEE6339987F1D7056d4422`](https://robinhoodchain.blockscout.com/address/0x2402898497B0532BCbdEE6339987F1D7056d4422) |
| FriendJar | [`0x07E1b71f45890f995c81Df316f4d303cfc786769`](https://robinhoodchain.blockscout.com/address/0x07E1b71f45890f995c81Df316f4d303cfc786769) |

## First-of-kind transactions
| Event | Tx |
|---|---|
| First routed trade (Traded) | [`0xffe2d3906357a4de2620f7c224bb35c884f8a18af0720469d30dcfcde51939d8`](https://robinhoodchain.blockscout.com/tx/0xffe2d3906357a4de2620f7c224bb35c884f8a18af0720469d30dcfcde51939d8) |
| First convert (Converted) | [`0xc5500b3cdd258f293c22f126f614af07c8ae541b159d27bd7ca84a85872131b5`](https://robinhoodchain.blockscout.com/tx/0xc5500b3cdd258f293c22f126f614af07c8ae541b159d27bd7ca84a85872131b5) |
| First sweep trade (Swept) | [`0x7f5b2f1fb864bce8ac6f2fb0fdfebfbf5758997ad1a3bf7ea3cd5cff89551b53`](https://robinhoodchain.blockscout.com/tx/0x7f5b2f1fb864bce8ac6f2fb0fdfebfbf5758997ad1a3bf7ea3cd5cff89551b53) |
| First Distributed with WIF burn | [`0xbd23368477c98de488447b1c20895b8d438bdba9977d63b8f01835899d0287c0`](https://robinhoodchain.blockscout.com/tx/0xbd23368477c98de488447b1c20895b8d438bdba9977d63b8f01835899d0287c0) |
| First stake (Staked) | [`0x15551573a7f3ff7cfbb2ab11ce3e2b8141c64701a5ea014984b9fcd7374bcd8f`](https://robinhoodchain.blockscout.com/tx/0x15551573a7f3ff7cfbb2ab11ce3e2b8141c64701a5ea014984b9fcd7374bcd8f) |
| First staker claim (Claimed) | [`0x37441924dfa9af929f8c4e13dd584801658e802689f81bd2ff26839aad223834`](https://robinhoodchain.blockscout.com/tx/0x37441924dfa9af929f8c4e13dd584801658e802689f81bd2ff26839aad223834) |
| First card mint (CardMinted) | not yet (no such event onchain) |

## Totals
| Metric | Value |
|---|---|
| Routed trades | 5 |
| Routed ETH (Traded.ethAmount) | 0.002473013468316603 ETH |
| Trade fees (Traded.fee) | 0.000012365067341583 ETH |
| ETH received by FeePool (all fees) | 0.000013830509820193 ETH |
| Sweeps / converts | 2 / 1 |
| Distributions | 1 |
| WIF burned (Distributed events) | 11.0666547007385185 |
| WIF burned (WIF Transfer FeePool -> 0x0) | 11.0666547007385185 |
| WIF burned (FeePool.totalWifBurned) | 11.0666547007385185 |
| Burn sources agree | yes |
| Stock streamed to stakers | NVDA 0.000087790798490783, TSLA 0, GOOGL 0, SNDK 0, SPY 0, QQQ 0 |
| Jars (distinct credited users) | 1 |
| Staker claims | 1 (0.000087790798490733 stock) |
| Cards minted | 0 |
