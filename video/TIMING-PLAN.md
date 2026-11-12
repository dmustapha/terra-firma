# TIMING-PLAN: Terra Firma demo film

Film total **3:09.66 (189.7 s)**, 1920x1080, 30 fps. App walkthrough = locked `recordings/rough/rough_cut_v3.mp4` (174.7 s; EDL `recordings/edl/master.json`; real Robinhood Chain mainnet, demo wallet 0x7204…05aa). Intro/outro = clean read-only dark-theme captures in `recordings/extra/` (card3fdb, home, proof, board). Narration: Dami, voicebooth, `video/SCRIPT.md` (38 lines, max 2.57 words/s).

Rules: every sped-up span carries a small corner tag `N s skipped · xK` (Plumbline rule). Every MetaMask moment is replaced by a branded **wallet-confirm card** (seal mark, `Confirmed in wallet ✓`, action + tx hash, 1.0 to 1.4 s); MetaMask, Blockaid warnings, VS Code and desktop never appear. Source times are seconds in the named file.

| # | film_t_in | film_t_out | source | speed | on-screen | narration line # |
|---|---|---|---|---|---|---|
| i1 | 0:00.00 | 0:04.20 | `extra/card3fdb.mp4` 9.0–13.2 | 1x | public card 0x3fDB…b09E reveal: 'This wallet turned $18,421 into $0.35. In NVDA: $16,972.' counter rolls to $16,971 left on the table (loader 0-9 s cut) | 1 |
| i2 | 0:04.20 | 0:07.60 | `extra/card3fdb.mp4` 13.2–16.6 | 1x | hold on '$0.35' (slow push-in on the eroded meme layer) | 2 |
| i3 | 0:07.60 | 0:12.20 | `extra/card3fdb.mp4` 16.6–21.2 | 1x | hold on 'In NVDA: $16,972' + NVDA bedrock column | 3 |
| i4 | 0:12.20 | 0:16.80 | `extra/card3fdb.mp4` 22.0–26.6 | 1x | scroll to 'The ledger, coin by coin.' + overlay: each buy -> its Chainlink round; caption 'Measured, not estimated.' | 4 |
| i5 | 0:16.80 | 0:20.80 | GRAPHIC title card + seal logo | - | TERRA FIRMA / Stand on $WIF. Sweep the rest into stock. | 5 |
| i6 | 0:20.80 | 0:33.80 | `extra/home.mp4` 15.0–28.0 | 1x | 'From loose sediment to solid ground.' Sediment / The sieve / Bedrock bands + 'Drop the dead bag through the sieve. Keep what lands.' with animated overlay labels: TerraRouter (slice) -> Jar (Stock Tokens); FeePool -> burn $WIF / stock to stakers | 6,7,8 |
| s01 | 0:33.80 | 0:37.51 | `rough_cut_v3.mp4` 0.0–2.6 | 0.7x | live home hero, header 0x7204...05aa connected | 9 |
| s02a | 0:37.51 | 0:40.51 | `rough_cut_v3.mp4` 2.6–5.6 | 1x | Trade WALLET: 0.0003 ETH, slice 0.0%, quote ~41.25 WALLET | 10 |
| s02b | 0:40.51 | 0:41.51 | `rough_cut_v3.mp4` 5.6–8.6 | 3x | Buy clicked, Working... (corner tag: skipped x3) [tag: 2.0 s skipped · 3x] | 10 |
| c1 | 0:41.51 | 0:42.91 | CARD wallet-confirm: `Confirmed in wallet ✓ buy WALLET · 0x0dfe…04c0` | - | Confirmed in wallet: buy WALLET (tx nonce 14->15) | 11 |
| s02c | 0:42.91 | 0:46.41 | `rough_cut_v3.mp4` 10.7–14.2 | 1x | Received 41.25 WALLET | 11 |
| s03a | 0:46.41 | 0:47.11 | `rough_cut_v3.mp4` 14.2–15.6 | 2x | My card loading [tag: 0.7 s skipped · 2x] | 12 |
| s03b | 0:47.11 | 0:51.11 | `rough_cut_v3.mp4` 15.6–19.6 | 1x | You turned $1 into $0.60. In NVDA: $1. | 12 |
| s03c | 0:51.11 | 0:52.41 | `rough_cut_v3.mp4` 19.6–23.5 | 3x | ledger row WALLET, buttons incl. 'Mint this card' [tag: 2.6 s skipped · 3x] | 12 |
| s04a | 0:52.41 | 0:56.21 | `rough_cut_v3.mp4` 23.5–27.3 | 1x | Convert: WALLET ticked, NVDA, quote ~0.003688 NVDA, click | 13 |
| c2 | 0:56.21 | 0:57.21 | CARD wallet-confirm: `Confirmed in wallet ✓ approve WALLET (step 1 of 2)` | - | Approve WALLET (step 1 of 2) | 14 |
| s04b | 0:57.21 | 0:58.73 | `rough_cut_v3.mp4` 28.3–32.1 | 2.5x | Working... step 2 (corner tag) [tag: 2.3 s skipped · 2.5x] | 14 |
| c3 | 0:58.73 | 0:59.93 | CARD wallet-confirm: `Confirmed in wallet ✓ convert to NVDA · 0x9425…b037` | - | Confirmed in wallet: convert to NVDA | 14 |
| s04c | 0:59.93 | 1:00.93 | `rough_cut_v3.mp4` 33.1–35.6 | 2.5x | confirming [tag: 1.5 s skipped · 2.5x] | 14 |
| s04d | 1:00.93 | 1:03.63 | `rough_cut_v3.mp4` 35.6–38.3 | 1x | Done. You own 0.003688 NVDA. It's in your Jar. | 14 |
| s05a | 1:03.63 | 1:05.23 | `rough_cut_v3.mp4` 38.3–41.5 | 2x | open Jar, loading [tag: 1.6 s skipped · 2x] | 15 |
| s05b | 1:05.23 | 1:08.23 | `rough_cut_v3.mp4` 41.5–44.5 | 1x | Your bedrock. Jar value $1.25 | 15 |
| s05c | 1:08.23 | 1:11.38 | `rough_cut_v3.mp4` 44.5–50.8 | 2x | NVDA balance + Withdraw; 'Where your stock came from' history [tag: 3.1 s skipped · 2x] | 15 |
| s06a | 1:11.38 | 1:12.78 | `rough_cut_v3.mp4` 50.8–55.0 | 3x | back to Trade, load PONS [tag: 2.8 s skipped · 3x] | 16 |
| s06b | 1:12.78 | 1:18.98 | `rough_cut_v3.mp4` 55.0–61.2 | 1x | slice 2.0% to NVDA, 0.0003 ETH, quote ~4.034 PONS + NVDA slice, Buy | 16,17 |
| s06c | 1:18.98 | 1:20.08 | `rough_cut_v3.mp4` 61.2–63.4 | 2x | Working... [tag: 1.1 s skipped · 2x] | 17 |
| c4 | 1:20.08 | 1:21.28 | CARD wallet-confirm: `Confirmed in wallet ✓ buy PONS, 2% to NVDA · 0xea3f…20d3` | - | Confirmed in wallet: buy PONS, 2% to NVDA | 17 |
| s06d | 1:21.28 | 1:22.28 | `rough_cut_v3.mp4` 64.6–66.6 | 2x | confirming [tag: 1.0 s skipped · 2x] | 17 |
| s06e | 1:22.28 | 1:26.18 | `rough_cut_v3.mp4` 66.6–70.5 | 1x | Received ~4.034 PONS, NVDA slice sent to Jar | 17 |
| s07a | 1:26.18 | 1:27.48 | `rough_cut_v3.mp4` 70.5–74.4 | 3x | Sell tab [tag: 2.6 s skipped · 3x] | 18 |
| s07b | 1:27.48 | 1:29.62 | `rough_cut_v3.mp4` 74.4–77.6 | 1.5x | sell 2 PONS, 2% slice, Approve and sell [tag: 1.1 s skipped · 1.5x] | 18 |
| s07c | 1:29.62 | 1:30.12 | `rough_cut_v3.mp4` 77.6–78.6 | 2x | Working... [tag: 0.5 s skipped · 2x] | 18 |
| c5 | 1:30.12 | 1:31.12 | CARD wallet-confirm: `Confirmed in wallet ✓ approve PONS (step 1 of 2)` | - | Approve PONS (step 1 of 2) | 18 |
| s07d | 1:31.12 | 1:32.52 | `rough_cut_v3.mp4` 79.6–83.8 | 3x | step 2 Working... [tag: 2.8 s skipped · 3x] | 18 |
| c6 | 1:32.52 | 1:33.52 | CARD wallet-confirm: `Confirmed in wallet ✓ sell PONS · 0x4e26…3b35` | - | Confirmed in wallet: sell PONS | 19 |
| s07e | 1:33.52 | 1:34.52 | `rough_cut_v3.mp4` 84.8–86.8 | 2x | confirming [tag: 1.0 s skipped · 2x] | 19 |
| s07f | 1:34.52 | 1:38.22 | `rough_cut_v3.mp4` 86.8–90.5 | 1x | Sold: ETH back, NVDA slice to Jar | 19 |
| s08a | 1:38.22 | 1:39.47 | `rough_cut_v3.mp4` 90.5–93.0 | 2x | Trending list: click $WIF (buy only) [tag: 1.2 s skipped · 2x] | 20 |
| s08b | 1:39.47 | 1:42.72 | `rough_cut_v3.mp4` 93.0–99.5 | 2x | $WIF: 0.0001 ETH, slice 0.0%, quote ~158.4 $WIF, Buy [tag: 3.2 s skipped · 2x] | 20 |
| s08c | 1:42.72 | 1:43.62 | `rough_cut_v3.mp4` 99.5–101.3 | 2x | Working... [tag: 0.9 s skipped · 2x] | 20 |
| c7 | 1:43.62 | 1:44.82 | CARD wallet-confirm: `Confirmed in wallet ✓ buy $WIF · 0x379a…ea75` | - | Confirmed in wallet: buy $WIF | 20 |
| s08d | 1:44.82 | 1:46.82 | `rough_cut_v3.mp4` 102.5–104.5 | 1x | Received $WIF | 20 |
| s08e | 1:46.82 | 1:47.92 | `rough_cut_v3.mp4` 104.5–106.7 | 2x | to Stake [tag: 1.1 s skipped · 2x] | 20 |
| s09a | 1:47.92 | 1:51.50 | `rough_cut_v3.mp4` 106.7–111.0 | 1.2x | Stake $WIF. Earn real stock. next epoch timer, 11.07 $WIF burned [tag: 0.7 s skipped · 1.2x] | 21 |
| s09b | 1:51.50 | 1:52.50 | `rough_cut_v3.mp4` 111.0–113.0 | 2x | reward pools [tag: 1.0 s skipped · 2x] | 22 |
| s09c | 1:52.50 | 1:55.57 | `rough_cut_v3.mp4` 113.0–117.6 | 1.5x | Your stake: wallet 315.5, active 159.4; type 100, Approve and stake [tag: 1.5 s skipped · 1.5x] | 22 |
| c8 | 1:55.57 | 1:56.97 | CARD wallet-confirm: `Confirmed in wallet ✓ approve + stake 100 $WIF · 0x5a0f…6f11` | - | Approve + stake 100 $WIF | 22 |
| s09d | 1:56.97 | 2:01.37 | `rough_cut_v3.mp4` 119.0–123.4 | 1x | wallet 215.5, activating 100 | 23 |
| s10a | 2:01.37 | 2:02.97 | `rough_cut_v3.mp4` 123.4–125.0 | 1x | Proof: Don't trust the core. 11.07 $WIF burned | 24 |
| s10b | 2:02.97 | 2:04.50 | `rough_cut_v3.mp4` 125.0–127.3 | 1.5x | scroll claims to Run the hourly distribute [tag: 0.8 s skipped · 1.5x] | 24 |
| s10c | 2:04.50 | 2:05.30 | `rough_cut_v3.mp4` 127.3–128.1 | 1x | Run distribute clicked | 25 |
| c9 | 2:05.30 | 2:06.50 | CARD wallet-confirm: `Confirmed in wallet ✓ distribute · 0x0d23…aa9d` | - | Confirmed in wallet: distribute | 25 |
| s10d | 2:06.50 | 2:08.50 | `rough_cut_v3.mp4` 129.3–131.3 | 1x | Dispatches: Epoch 23 paid out: 11.36 $WIF burned | 26 |
| s10e | 2:08.50 | 2:12.00 | `rough_cut_v3.mp4` 131.3–134.8 | 1x | Distributed. The burn and staker stream are onchain. | 26 |
| s11a | 2:12.00 | 2:13.40 | `rough_cut_v3.mp4` 134.8–136.2 | 1x | Stake page: 22.43 $WIF burned | 27 |
| s11b | 2:13.40 | 2:15.30 | `rough_cut_v3.mp4` 136.2–138.1 | 1x | reward to claim 0.00008969 NVDA, Claim to Jar | 27 |
| c10 | 2:15.30 | 2:16.50 | CARD wallet-confirm: `Confirmed in wallet ✓ claim to Jar · 0x2833…5717` | - | Confirmed in wallet: claim | 28 |
| s11c | 2:16.50 | 2:19.60 | `rough_cut_v3.mp4` 139.3–142.4 | 1x | Claimed. The reward stock is in your Jar. (0 NVDA left) | 28 |
| s12a | 2:19.60 | 2:19.90 | `rough_cut_v3.mp4` 142.4–143.0 | 2x | card loading [tag: 0.3 s skipped · 2x] | 29 |
| s12b | 2:19.90 | 2:22.40 | `rough_cut_v3.mp4` 143.0–145.5 | 1x | You turned $2 into $0.30. In NVDA: $2. | 29 |
| s12c | 2:22.40 | 2:24.60 | `rough_cut_v3.mp4` 145.5–147.7 | 1x | ledger, click Mint this card (burns 1 $WIF) | 29 |
| c11 | 2:24.60 | 2:25.60 | CARD wallet-confirm: `Confirmed in wallet ✓ approve 1 $WIF (step 1 of 2)` | - | Approve 1 $WIF (step 1 of 2) | 30 |
| s12d | 2:25.60 | 2:27.00 | `rough_cut_v3.mp4` 148.7–150.1 | 1x | step 2 mint confirming | 30 |
| c12 | 2:27.00 | 2:28.00 | CARD wallet-confirm: `Confirmed in wallet ✓ mint card · 0x81bf…9d11` | - | Confirmed in wallet: mint card (0x81bf...9d11) | 30 |
| s12e | 2:28.00 | 2:31.60 | `rough_cut_v3.mp4` 151.1–154.7 | 1x | Minted onchain. 1 $WIF burned. | 30 |
| s13 | 2:31.60 | 2:35.30 | `rough_cut_v3.mp4` 154.7–162.1 | 2x | Leaderboard: Who got buried. Who hit bedrock. biggest regret, biggest jars, most fees [tag: 3.7 s skipped · 2x] | 31 |
| s14a | 2:35.30 | 2:37.30 | `rough_cut_v3.mp4` 162.1–164.1 | 1x | Proof: 22.43 $WIF burned | 32 |
| s14b | 2:37.30 | 2:39.66 | `rough_cut_v3.mp4` 164.1–170.0 | 2.5x | How to check every claim; contracts; first-of-kind transactions [tag: 3.5 s skipped · 2.5x] | 32 |
| s14c | 2:39.66 | 2:44.26 | `rough_cut_v3.mp4` 170.0–174.6 | 1x | Dispatches: minted a card, Jar credited, Epoch 23 paid out | 33 |
| o1 | 2:44.26 | 2:54.86 | `extra/board.mp4` 1.0–11.6 | 1x | 'Who got buried. Who hit bedrock.' three core tubes filling (biggest regret / biggest jars / most fees paid) + who-it's-for cards build: meme traders on Robinhood Chain / $WIF holders | 34,35 |
| o2 | 2:54.86 | 3:04.86 | `extra/proof.mp4` 12.0–22.0 | 1x | 'How to check every claim' panels (a real reason to use $WIF / a flywheel that holds up / works and built well) + honest-limits card overlay | 36,37 |
| o3 | 3:04.86 | 3:09.66 | `extra/home.mp4` 35.0–39.8 | 1x | 'Stand on bedrock.' green band + close card: Stand on $WIF. Sweep the rest into stock. terrafirma-wif.vercel.app + repo | 38 |

## Notes for the edit

- Hook numbers are exactly what `extra/card3fdb.mp4` shows: 'This wallet turned $18,421 into $0.35. In NVDA: $16,972.' and $16,971 left on the table. Lines 1 to 3 say eighteen thousand four hundred / thirty five cents / almost seventeen thousand.
- `extra/card3fdb.mp4` 0–9 s is the 'Reading 21 memes' loader: never use it.
- `s01` plays the live home hero from the take at 0.7x (connected header 0x7204…05aa) under line 9; `extra/home.mp4` 0–12 s is a spare hero counter if a cleaner roll is wanted.
- **Leak in the locked cut:** rough_cut_v3 at about 9.0 s (take4 ≈197.4 s) shows a grey MetaMask window sliding in on the right. The plan cuts `s02b` at 8.6 s and covers 8.6–10.7 with card `c1`, so the film never shows it; do NOT reuse rough 8.6–10.7 (EDL fix: S02 first keep should end at 196.9).
- Approvals (`c2`, `c5`, `c11`) carry no tx hash (the approve tx is on the token contract); every other card uses the real hash listed (all from mainnet logs, blocks 112,377,285 to 112,406,524).
- Line 12 runs about 2 s into the convert page (s04a); acceptable, or slow `s03c` to 1.5x (+1.3 s) if the cut needs it on the card.
- Outro: `o1` board tubes + who-it's-for cards (lines 34-35), `o2` proof 'How to check every claim' + honest-limits card (36-37), `o3` home 'Stand on bedrock.' + close card with `terrafirma-wif.vercel.app` and the repo (38). Use `terrafirma-wif.vercel.app` (wallet-safe domain) on screen everywhere.

## REVISION 2 (2:50.42): hard 3-minute cap from the submission form
Source: worldisflat.fun form help text "keep it under 3 minutes and show it working rather than slides. youtube, loom, vimeo or x links all work." Picture now `rough_cut_v4.mp4` (173.2 s): vs v3 everything after S02 is -1.0 s and after S06 -1.5 s (re-map v3 ranges accordingly at render).
- i5 GRAPHIC title card REMOVED (no slides); the title becomes a lower-third over i6.
- i6 = `extra/home.mp4` 15.0-24.0 (9.0 s) at film 16.8-25.8; lines 5-6.
- s01 at 1x (2.6 s) at film 25.8-28.4; line 7. Every later app row shifts -9.11 s.
- s14a 146.19-148.19, s14b 148.19-150.55, s14c (v4 168.5-173.1) at 1.5x 150.55-153.62; line 30.
- o1 = `extra/board.mp4` 1.0-7.0 at 153.62-159.62; line 31.
- o2 = `extra/proof.mp4` 12.0-18.0 at 159.62-165.62; line 32.
- o3 = `extra/home.mp4` 35.0-39.8 at 165.62-170.42; line 33. TOTAL 170.42 s.
Narration: `video/SCRIPT.md` (33 lines) and `video/voicebooth-lines.txt` are authoritative for line windows.
