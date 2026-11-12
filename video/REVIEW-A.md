# REVIEW-A: terra-firma-demo.mp4 (independent QA)

File: `video/out/terra-firma-demo.mp4`, 1920x1080, 30 fps, h264 + AAC 48 kHz stereo, **177.86 s** (under 180 s, 2.1 s of margin).
Method: frames every 0.5 s (356 frames, 18 contact sheets), 10 fps fine passes around transitions, bottom-left 480x40 strip for every frame, whisper base.en for the full track (word-level) plus medium for unclear clips, voice-band RMS envelope for caption sync, ebur128/astats/silencedetect.

## Summary
- **P0: none.** No MetaMask/wallet popups, VS Code, macOS menu bar, tab bar or address bar, "Claude" labels, or third-party personal data.
- **P1 (8):** browser status-bar URL leaks (9 places), on-screen "left on the table" math that contradicts itself, a "my own wallet" line said over someone else's wallet, a stake tx hash that matches nothing in the app, an unexplained $WIF balance jump, half-loaded panels, captions in lowercase that break the "Robinhood Chain" brand rule, and captions that jump position mid-line.
- **Audio:** -16.0 LUFS integrated, true peak -0.9 dBFS, no clipping, no silent gaps over 1.5 s (the music bed runs throughout). Captions are in sync (see below). The music bed is heavy in the bass and is not ducked under the voice.

## Findings

| t (s) | Sev | Issue | Evidence | Suggested fix |
|---|---|---|---|---|
| 45.5-46.0 | P1 | Browser status-bar hover URL leaks bottom-left | `https://terrafirma-wif.vercel.app/app/convert` (also shows an odd doubled `/app/app/` path) | Re-record with the cursor off links, crop or mask the bottom 40 px, or cut the frames |
| 56.0-58.0 | P1 | Status-bar URL leak | `…blockscout.com/address/0xa921DCaF524c4A50f46F26543B0FA3DBD2a4d5bF` | Same |
| 65.5-69.0 | P1 | Status-bar URL leak (~3.5 s) | `https://terrafirma-wif.vercel.app/trade`, then `/trade/0x39dBED3a2bd333467115dE45665cC57F813C4571` and `/trade/0x5173b8eA…` | Same |
| 85.0-85.5 | P1 | Status-bar URL leak | `terrafirma-wif.vercel.app/trade/0x5173b8eA6923c2d40267890D45C46a3480954773` | Same |
| 94.0-94.5 | P1 | Status-bar URL leak | `https://terrafirma-wif.vercel.app/stake` | Same |
| 115.0 | P1 | Status-bar URL leak | `robinhoodchain.blockscout.com/…/0xBa4d301D9fD6f5e96c4796…` | Same |
| 125.5 | P1 | Status-bar URL leak | `https://terrafirma-wif.vercel.app/stake` | Same |
| 140.0-141.0 | P1 | Status-bar URL leak | `https://terrafirma-wif.vercel.app/board` | Same |
| 36.5-42.0 | P1 | Card math contradicts itself: "You turned $1 into $0.60. In NVDA: $1." with **LEFT ON THE TABLE $0**, while the ledger shows Paid $1.22 / Today $0.60 (-51%) / In NVDA $1.22, so about $0.62 is left on the table. Narration is "and what it would be in nvda" | Frames 36.4 and 43.5 | Show cents when the value is under $10 (e.g. "$1.22 into $0.60", "left on the table $0.62"), or avoid lingering on it |
| 131.0-139.5 | P1 | Same defect on the PONS card: "You turned $2 into $0.30. In NVDA: $2.", left on the table $0, while the ledger shows $2.59 / $0.30 (-88.4%) / $2.62 | Frames 131.0 and 132.0 | Same as above |
| 29.0-31.0 | P1 | VO says "this is my own wallet on mainnet", but the hero on screen is the $18,421 example wallet ("aped $18,421 … now worth $0.34 … $16,902") with a counter animating $0 → $13,827. Your wallet (0x7204…05aa) actually turns $1 into $0.60. It also gives a second, different value for the opening wallet (0:00 says $0.35 / $16,972; 0:30 says $0.34 / $16,902) | Frames 29.0-30.5 | Cut 29-31 to the connected wallet's own card, or move the line onto the 36 s shot |
| 104.5-105.5 | P1 | "Confirmed in wallet" card reads `approve + stake 100 $WIF tx 0x5a0f…6f11`, but the app at 113.5 lists `Approve $WIF: 0xa63c…5077` and `Stake $WIF: 0xaae4…6fe8`. Neither matches. Anyone checking the explorer will see a hash that isn't there | Crops at 104.6 and 113.5. Other cards check out: buy WALLET 0x0dfe…04c0, buy PONS 0xea3f…20d3, distribute 0x0d23…aa9d, claim 0x2833…5717, mint 0x81bf…9d11 | Put the real stake (or approve) hash on the card |
| 113 → 127.5 | P1 | Wallet $WIF jumps from 215.5 to **1,370** with no explanation (no buy is shown; the 30 s VO line is "staking ten thousand drops your own fee") | Frames 113.0 and 127.5 | Hide the gap with a cut, or say/show the top-up |
| 55.5 | P1 | Half-loaded My Jar page: Jar value and saving streak are empty black skeleton boxes | Frame 55.5 | Start the shot after the data loads (≥56.0) |
| 94.0 | P1 | Half-loaded Stake page: the countdown, current epoch and $WIF burned are blank boxes | Frame 94.0 | Trim about 0.5 s |
| 140.0-141.0, 161.0-168.0 | P1 | Leaderboard "Biggest regret" core is empty/black (and at 161.0 all three are empty). At 161-168 it stays empty for 7 s while the VO pitches the product, even though it was filled at 141.5 | Frames 140.5, 161.0-168.0 | Use the loaded state (as at 141.5) for the 161-168 shot |
| 0-2.5, 161.5-163.5 | P1 | Brand rule: captions say "robinhood chain" in lowercase. All captions are lowercase: "nvda", "chainlink", "uniswap", "terra firma", "wif", "nvda stock tokens" (rule: "Stock Tokens") | Caption frames | Use sentence case with proper nouns: "Robinhood Chain", "NVDA", "Chainlink", "Uniswap", "Terra Firma", "$WIF", "Stock Tokens" |
| 33.5-34.5, 77.5-78.0, 104.5, 120.5-123.1, 130.5 | P1 | Caption jumps from the bottom bar to the top of the frame mid-phrase (sometimes mid-line, e.g. 123.1→123.2 "and the other half…" jumps top→bottom), and covers the app header/inputs | 10 fps pass at 122.2-123.3 | One fixed caption position (bottom safe area), or move it only at sentence boundaries |
| 122.4 | P2 | Caption "and the other half buys stock for the stakers." appears ~0.2-0.35 s before the voice (speech starts ≈122.6-122.8). All other captions measured within about ±0.15 s of voice onset (e.g. 3.65/3.72, 9.25/9.22, 17.25/17.22, 47.25/47.22, 64.75/64.68, 70.70/70.66, 79.80/79.8, 114.00/114.16, 118.85/118.8, 132.0/132.2, 161.4/161.5, 169.35/169.4) | RMS envelope versus caption-band change detection | Delay that cue by about 250 ms; 114.0 could also move +100 ms |
| 7.5-8.0, 11.0, 31.0 | P2 | Caption box sits on top of app text during zoom moves ("The ledger, coin by c[oin]", "The s[ieve]") | Sheets 0 and 1 | Add a darker scrim, or offset the caption during zooms |
| 26.5-28.0 | P2 | "Fee pool" callout is half hidden behind the caption | Frames 26.5-28.0 | Move the callout up or shorten the caption |
| 17.5-20.0 | P2 | Terra Firma logo plate covers the hero number ($16,9…) for 2.5 s, which is the number the VO is about ("a number like that") | Frames 17.5-20.0 | Move the plate off the number, or show it after 20.5 |
| 20.5, 48.5, 50.0, 85.0, 131.0 | P2 | Long cross-dissolves stack two layouts (doubled headlines like "Sieve the sediment", "You turned $2 into $0.30" ghosting over the stake page), which reads as an error | Sheets 2, 4, 5, 8, 13 | Hard cuts or shorter (≤6 frame) dissolves |
| 84.5-85.0 | P2 | A stray "$WIF buy only: Terra Firma never sells it" callout from a later shot ghosts in over the PONS sell screen | Frame 85.0 | Remove it from that dissolve |
| 58.0, 100.5 | P2 | Callouts left at the wrong place during zoom (the "withdraw any time" box floats mid-frame; the "pick your stock" box covers Wallet $WIF 315.5) | Frames 58.0, 100.5 | Keyframe callouts to the zoom transform |
| 16.5, 28.5, 143.5, 151.5, 160.5, 168.5, 173.5 | P2 | Full-frame orange/beige/green stripe wipe 7 times. It flashes with saturated colour and could read as a glitch on X autoplay | Sheets | Use fewer wipes, or shorten them / lower their opacity |
| 0.0 | P2 | First frame shows "LEFT ON THE TABLE $0" and an empty core (the counter animates from 0), so the thumbnail/first impression is "$0" | Frame 0.0 | Start on the settled $16,971 frame, or set a poster frame |
| 29.0-29.5 | P2 | Text-cursor (I-beam) parked next to "NVDA didn't." | Frame 29.0 | Hide the cursor or move it off the text |
| 94.5-98.5 | P2 | The "Next epoch in 47m 09s" countdown stays frozen for 4 s (a 2x-sped segment), so it looks static/fake | Frames 94.5-98.5 | Cut tighter or let it tick |
| 32-93 | P2 | Trending list shows meme tickers "BONER" and "ROBINHOOD" (a meme token named after the brand) for about a minute | Trade screens | Crop or blur the list, or filter them out of the demo |
| 2.0 | P2 | "FIELD REPORT · 0X3FDB…B09E" uses an uppercase "0X" because of letter-spacing caps (an app style thing; looks off to crypto viewers) | Frame 2.0 | Leave hex addresses out of the uppercase style |
| 174-177 | P2 | End card: page content ghosts behind the logo/URLs ("Keep what lands", "0.0025 NVDA"); busy | Frames 174-177 | Solid/blurred background behind the end card |
| 174-177 | P2 | End card shows github.com/dmustapha/terra-firma (personal handle). It's intentional, but noting it for the personal-data check | Frame 175 | Fine if intended |
| whole film | P2 | Music bed isn't ducked: in pauses it measures -19.4 to -19.5 LUFS against -16 LUFS for speech sections. The <180 Hz band is about -21 LUFS everywhere (as loud in pauses as under speech). Voice stays intelligible: the voice band (>300 Hz) is -16 to -19 LUFS when speaking against -24/-25 LUFS for the music | ebur128 per window | Duck the music 4-6 dB under the VO and roll off the bass below about 120 Hz |
| whole film | P2 | True peak -0.9 dBFS (2 samples) is just over the usual -1.0 dBTP ceiling | astats/ebur128 | Limiter at -1.5 dBTP |
| 61.0-64.3, 124.6-128.2, 157.8-160.7 | P2 | VO gaps of 3.3 s, 3.6 s and 2.9 s (music continues; no true silence >1.5 s anywhere). 21.2-23.5 (2.3 s) and 15.0-16.8 (1.9 s) are borderline | whisper word times + envelope | Tighten the edit or add an on-screen beat in those gaps |

## Checks that passed
- Duration 177.86 s (< 180 s).
- Integrated -16.0 LUFS, LRA 4.9 LU, no clipped samples, no silence >1.5 s at -45 dB.
- Caption text matches what is said throughout (whisper misread accent-heavy words like "Terra Firma", "Robinhood", "NVDA", "WIF"; the medium model confirmed 113 s is "run the fee pool" and 128 s is "Mine goes straight into my jar"). Captions are large (~40 px cap height at 1080p), cream on a dark pill, with good contrast.
- Numbers agree with each other: 0:00 $18,421 → $0.35, NVDA $16,972, left on table $16,971 (= 16,972 - 0.35, floored). $WIF burned 11.07 + epoch-23 burn 11.36 = 22.43 (shown on the proof page). Cards minted 0 → 1 after the mint. Wallet $WIF 315.5 → 215.5 after staking 100. Jar $1.25 = 0.007776 NVDA × $161.18.
- No em dashes seen in captions or callouts. "Stock Tokens" is correct in app copy and callouts. No "$HOOD" and no Robinhood logo seen.
- No wallet extension popups, OS UI, tab bar or address bar, or "Claude" text anywhere.
