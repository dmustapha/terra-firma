# TIMING-PLAN: Terra Firma demo film

Film total **2:48.39 (168.4 s)**: under the submission form's hard rule ("keep it under 3 minutes and show it working rather than slides", `research/raw/js/form.js`); target 2:50, max 2:55. 1920x1080, 30 fps. Walkthrough = locked `recordings/rough/rough_cut_v4.mp4` (173.2 s; EDL `recordings/edl/master.json`; real Robinhood Chain mainnet, demo wallet 0x7204…05aa). Intro/outro = read-only dark captures in `recordings/extra/`. Narration: `video/SCRIPT.md` (30 lines, max 2.57 words/s).

Rules: NO full-screen slides. Every title, label and card is an overlay ON footage. Sped spans carry a corner tag `N s skipped · xK`. Every MetaMask moment is replaced by a branded wallet-confirm card (seal, `Confirmed in wallet ✓`, action + tx hash, 1.0–1.4 s) laid over the frozen last clean frame. MetaMask, Blockaid warnings, VS Code and desktop never appear. Source times are seconds in the named file.

| # | film_t_in | film_t_out | source | speed | on-screen | narration line # |
|---|---|---|---|---|---|---|
| i1 | 0:00.00 | 0:04.30 | `extra/card3fdb.mp4` 9.0–13.3 | 1x | public card 0x3fDB…b09E reveal: 'This wallet turned $18,421 into $0.35. In NVDA: $16,972.' counter rolls to $16,971 left on the table (loader 0-9 s cut) | 1 |
| i2 | 0:04.30 | 0:07.70 | `extra/card3fdb.mp4` 13.3–16.7 | 1x | hold on '$0.35' (slow push-in on the eroded meme layer) | 2 |
| i3 | 0:07.70 | 0:12.30 | `extra/card3fdb.mp4` 16.7–21.3 | 1x | hold on 'In NVDA: $16,972' + NVDA bedrock column | 3 |
| i4 | 0:12.30 | 0:16.90 | `extra/card3fdb.mp4` 22.0–26.6 | 1x | 'The ledger, coin by coin.' + overlay: each buy -> its Chainlink round; lower-third 'Measured, not estimated.' | 4 |
| i6 | 0:16.90 | 0:25.50 | `extra/home.mp4` 15.0–23.6 | 1x | 'From loose sediment to solid ground.' bands; overlays on footage: TERRA FIRMA wordmark + seal (first 2 s), then labels TerraRouter (slice) -> Jar (Stock Tokens) ; FeePool -> burn $WIF / stock to stakers | 5,6 |
| s01 | 0:25.50 | 0:28.10 | `rough_cut_v4.mp4` 0.0–2.6 | 1x | live home hero, header 0x7204...05aa connected | 6 |
| s02a | 0:28.10 | 0:31.10 | `rough_cut_v4.mp4` 2.6–5.6 | 1x | Trade WALLET: 0.0003 ETH, slice 0.0%, quote ~41.25 WALLET | 6,7 |
| s02b | 0:31.10 | 0:32.07 | `rough_cut_v4.mp4` 5.6–8.5 | 3x | Buy clicked, Working... (corner tag: skipped x3) [tag: 1.9 s skipped · 3x] | 7 |
| c1 | 0:32.07 | 0:33.47 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ buy WALLET · 0x0dfe…04c0` | - | Confirmed in wallet: buy WALLET (tx nonce 14->15) | 8 |
| s02c | 0:33.47 | 0:36.97 | `rough_cut_v4.mp4` 9.7–13.2 | 1x | Received 41.25 WALLET | 8 |
| s03a | 0:36.97 | 0:37.43 | `rough_cut_v4.mp4` 13.2–14.6 | 3x | My card loading [tag: 0.9 s skipped · 3x] | 9 |
| s03b | 0:37.43 | 0:41.43 | `rough_cut_v4.mp4` 14.6–18.6 | 1x | You turned $1 into $0.60. In NVDA: $1. | 9 |
| s03c | 0:41.43 | 0:42.73 | `rough_cut_v4.mp4` 18.6–22.5 | 3x | ledger row WALLET, buttons incl. 'Mint this card' [tag: 2.6 s skipped · 3x] | 9 |
| s04a | 0:42.73 | 0:46.53 | `rough_cut_v4.mp4` 22.5–26.3 | 1x | Convert: WALLET ticked, NVDA, quote ~0.003688 NVDA, click | 10 |
| c2 | 0:46.53 | 0:47.53 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ approve WALLET (step 1 of 2)` | - | Approve WALLET (step 1 of 2) | 11 |
| s04b | 0:47.53 | 0:48.80 | `rough_cut_v4.mp4` 27.3–31.1 | 3x | Working... step 2 (corner tag) [tag: 2.5 s skipped · 3x] | 11 |
| c3 | 0:48.80 | 0:50.00 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ convert to NVDA · 0x9425…b037` | - | Confirmed in wallet: convert to NVDA | 11 |
| s04c | 0:50.00 | 0:50.83 | `rough_cut_v4.mp4` 32.1–34.6 | 3x | confirming [tag: 1.7 s skipped · 3x] | 11 |
| s04d | 0:50.83 | 0:53.53 | `rough_cut_v4.mp4` 34.6–37.3 | 1x | Done. You own 0.003688 NVDA. It's in your Jar. | 11 |
| s05a | 0:53.53 | 0:55.13 | `rough_cut_v4.mp4` 37.3–40.5 | 2x | open Jar, loading [tag: 1.6 s skipped · 2x] | 12 |
| s05b | 0:55.13 | 0:58.13 | `rough_cut_v4.mp4` 40.5–43.5 | 1x | Your bedrock. Jar value $1.25 | 12 |
| s05c | 0:58.13 | 1:01.28 | `rough_cut_v4.mp4` 43.5–49.8 | 2x | NVDA balance + Withdraw; 'Where your stock came from' history [tag: 3.1 s skipped · 2x] | 12 |
| s06a | 1:01.28 | 1:02.68 | `rough_cut_v4.mp4` 49.8–54.0 | 3x | back to Trade, load PONS [tag: 2.8 s skipped · 3x] | 13 |
| s06b | 1:02.68 | 1:08.88 | `rough_cut_v4.mp4` 54.0–60.2 | 1x | slice 2.0% to NVDA, 0.0003 ETH, quote ~4.034 PONS + NVDA slice, Buy | 13,14 |
| s06c | 1:08.88 | 1:09.62 | `rough_cut_v4.mp4` 60.2–62.4 | 3x | Working... [tag: 1.5 s skipped · 3x] | 14 |
| c4 | 1:09.62 | 1:10.82 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ buy PONS, 2% to NVDA · 0xea3f…20d3` | - | Confirmed in wallet: buy PONS, 2% to NVDA | 14 |
| s06d | 1:10.82 | 1:11.32 | `rough_cut_v4.mp4` 63.6–65.1 | 3x | confirming [tag: 1.0 s skipped · 3x] | 14 |
| s06e | 1:11.32 | 1:15.22 | `rough_cut_v4.mp4` 65.1–69.0 | 1x | Received ~4.034 PONS, NVDA slice sent to Jar | 14 |
| s07a | 1:15.22 | 1:16.78 | `rough_cut_v4.mp4` 69.0–72.9 | 2.5x | Sell tab [tag: 2.3 s skipped · 2.5x] | 15 |
| s07b | 1:16.78 | 1:18.91 | `rough_cut_v4.mp4` 72.9–76.1 | 1.5x | sell 2 PONS, 2% slice, Approve and sell [tag: 1.1 s skipped · 1.5x] | 15 |
| s07c | 1:18.91 | 1:19.24 | `rough_cut_v4.mp4` 76.1–77.1 | 3x | Working... [tag: 0.7 s skipped · 3x] | 15 |
| c5 | 1:19.24 | 1:20.24 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ approve PONS (step 1 of 2)` | - | Approve PONS (step 1 of 2) | 15 |
| s07d | 1:20.24 | 1:21.64 | `rough_cut_v4.mp4` 78.1–82.3 | 3x | step 2 Working... [tag: 2.8 s skipped · 3x] | 15 |
| c6 | 1:21.64 | 1:22.64 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ sell PONS · 0x4e26…3b35` | - | Confirmed in wallet: sell PONS | 16 |
| s07e | 1:22.64 | 1:23.31 | `rough_cut_v4.mp4` 83.3–85.3 | 3x | confirming [tag: 1.3 s skipped · 3x] | 16 |
| s07f | 1:23.31 | 1:27.01 | `rough_cut_v4.mp4` 85.3–89.0 | 1x | Sold: ETH back, NVDA slice to Jar | 16 |
| s08a | 1:27.01 | 1:28.01 | `rough_cut_v4.mp4` 89.0–91.5 | 2.5x | Trending list: click $WIF (buy only) [tag: 1.5 s skipped · 2.5x] | 17 |
| s08b | 1:28.01 | 1:32.07 | `rough_cut_v4.mp4` 91.5–98.0 | 1.6x | $WIF: 0.0001 ETH, slice 0.0%, quote ~158.4 $WIF, Buy [tag: 2.4 s skipped · 1.6x] | 17 |
| s08c | 1:32.07 | 1:32.67 | `rough_cut_v4.mp4` 98.0–99.8 | 3x | Working... [tag: 1.2 s skipped · 3x] | 17 |
| c7 | 1:32.67 | 1:33.87 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ buy $WIF · 0x379a…ea75` | - | Confirmed in wallet: buy $WIF | 17 |
| s08d | 1:33.87 | 1:35.87 | `rough_cut_v4.mp4` 101.0–103.0 | 1x | Received $WIF | 17 |
| s08e | 1:35.87 | 1:36.61 | `rough_cut_v4.mp4` 103.0–105.2 | 3x | to Stake [tag: 1.5 s skipped · 3x] | 17 |
| s09a | 1:36.61 | 1:39.91 | `rough_cut_v4.mp4` 105.2–109.5 | 1.3x | Stake $WIF. Earn real stock. next epoch timer, 11.07 $WIF burned [tag: 1.0 s skipped · 1.3x] | 18 |
| s09b | 1:39.91 | 1:40.58 | `rough_cut_v4.mp4` 109.5–111.5 | 3x | reward pools [tag: 1.3 s skipped · 3x] | 18 |
| s09c | 1:40.58 | 1:43.46 | `rough_cut_v4.mp4` 111.5–116.1 | 1.6x | Your stake: wallet 315.5, active 159.4; type 100, Approve and stake [tag: 1.7 s skipped · 1.6x] | 18 |
| c8 | 1:43.46 | 1:44.86 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ approve + stake 100 $WIF · 0x5a0f…6f11` | - | Approve + stake 100 $WIF | 18 |
| s09d | 1:44.86 | 1:49.26 | `rough_cut_v4.mp4` 117.5–121.9 | 1x | wallet 215.5, activating 100 | 19 |
| s10a | 1:49.26 | 1:50.86 | `rough_cut_v4.mp4` 121.9–123.5 | 1x | Proof: Don't trust the core. 11.07 $WIF burned | 20 |
| s10b | 1:50.86 | 1:52.01 | `rough_cut_v4.mp4` 123.5–125.8 | 2x | scroll claims to Run the hourly distribute [tag: 1.1 s skipped · 2x] | 20 |
| s10c | 1:52.01 | 1:52.81 | `rough_cut_v4.mp4` 125.8–126.6 | 1x | Run distribute clicked | 20 |
| c9 | 1:52.81 | 1:54.01 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ distribute · 0x0d23…aa9d` | - | Confirmed in wallet: distribute | 20 |
| s10d | 1:54.01 | 1:56.01 | `rough_cut_v4.mp4` 127.8–129.8 | 1x | Dispatches: Epoch 23 paid out: 11.36 $WIF burned | 21 |
| s10e | 1:56.01 | 1:59.51 | `rough_cut_v4.mp4` 129.8–133.3 | 1x | Distributed. The burn and staker stream are onchain. | 21 |
| s11a | 1:59.51 | 2:00.91 | `rough_cut_v4.mp4` 133.3–134.7 | 1x | Stake page: 22.43 $WIF burned | 22 |
| s11b | 2:00.91 | 2:02.81 | `rough_cut_v4.mp4` 134.7–136.6 | 1x | reward to claim 0.00008969 NVDA, Claim to Jar | 22 |
| c10 | 2:02.81 | 2:04.01 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ claim to Jar · 0x2833…5717` | - | Confirmed in wallet: claim | 23 |
| s11c | 2:04.01 | 2:07.11 | `rough_cut_v4.mp4` 137.8–140.9 | 1x | Claimed. The reward stock is in your Jar. (0 NVDA left) | 23 |
| s12a | 2:07.11 | 2:07.31 | `rough_cut_v4.mp4` 140.9–141.5 | 3x | card loading [tag: 0.4 s skipped · 3x] | 24 |
| s12b | 2:07.31 | 2:09.81 | `rough_cut_v4.mp4` 141.5–144.0 | 1x | You turned $2 into $0.30. In NVDA: $2. | 24 |
| s12c | 2:09.81 | 2:12.01 | `rough_cut_v4.mp4` 144.0–146.2 | 1x | ledger, click Mint this card (burns 1 $WIF) | 24 |
| c11 | 2:12.01 | 2:13.01 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ approve 1 $WIF (step 1 of 2)` | - | Approve 1 $WIF (step 1 of 2) | 25 |
| s12d | 2:13.01 | 2:14.41 | `rough_cut_v4.mp4` 147.2–148.6 | 1x | step 2 mint confirming | 25 |
| c12 | 2:14.41 | 2:15.41 | CARD wallet-confirm over frozen last clean frame: `Confirmed in wallet ✓ mint card · 0x81bf…9d11` | - | Confirmed in wallet: mint card (0x81bf...9d11) | 25 |
| s12e | 2:15.41 | 2:19.01 | `rough_cut_v4.mp4` 149.6–153.2 | 1x | Minted onchain. 1 $WIF burned. | 25 |
| s13 | 2:19.01 | 2:23.63 | `rough_cut_v4.mp4` 153.2–160.6 | 1.6x | Leaderboard: Who got buried. Who hit bedrock. biggest regret, biggest jars, most fees [tag: 2.8 s skipped · 1.6x] | 26 |
| s14a | 2:23.63 | 2:25.63 | `rough_cut_v4.mp4` 160.6–162.6 | 1x | Proof: 22.43 $WIF burned | 27 |
| s14b | 2:25.63 | 2:27.99 | `rough_cut_v4.mp4` 162.6–168.5 | 2.5x | How to check every claim; contracts; first-of-kind transactions [tag: 3.5 s skipped · 2.5x] | 27 |
| s14c | 2:27.99 | 2:32.59 | `rough_cut_v4.mp4` 168.5–173.1 | 1x | Dispatches: minted a card, Jar credited, Epoch 23 paid out | 27 |
| o1 | 2:32.59 | 2:38.59 | `extra/board.mp4` 1.0–7.0 | 1x | board: three core tubes filling; overlay chips build: 'meme traders on Robinhood Chain' / '$WIF holders, paid in stock' | 28 |
| o2 | 2:38.59 | 2:43.59 | `extra/proof.mp4` 12.0–17.0 | 1x | proof 'How to check every claim'; overlay lower-third: 'Tracked memes only · not P&L · unaudited' | 29 |
| o3 | 2:43.59 | 2:48.39 | `extra/home.mp4` 35.0–39.8 | 1x | home 'Stand on bedrock.' band; overlay: 'Stand on $WIF. Sweep the rest into stock.' + terrafirma-wif.vercel.app + repo | 30 |

## Notes for the edit

- Hook numbers exactly as `extra/card3fdb.mp4` shows them: 'This wallet turned $18,421 into $0.35. In NVDA: $16,972.' ($16,971 left on the table). Never use card3fdb 0–9 s (loader).
- The title is an overlay on `extra/home.mp4` (i6, first 2 s: TERRA FIRMA wordmark + seal), then animated contract labels on the sediment / sieve / bedrock bands. No title slide.
- rough_cut_v4 already removes the grey MetaMask frame that v3 had at about 9.0 s (FG-011).
- Approval cards (`c2`, `c5`, `c11`) carry no tx hash (the approve is on the token contract); every other card uses the real hash listed (mainnet logs, blocks 112,377,285–112,406,524).
- Outro stays on footage: board tubes (o1, who it's for), proof 'How to check every claim' (o2, limits), home 'Stand on bedrock.' (o3, close + `terrafirma-wif.vercel.app` + repo).
