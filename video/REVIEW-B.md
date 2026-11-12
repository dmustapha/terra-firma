# REVIEW-B — Terra Firma demo film (independent cold review)

File: `video/out/terra-firma-demo.mp4` — 1920x1080 30fps, **2:57.9** (under the 3:00 cap by 2 s), -16 LUFS integrated, LRA 4.9 LU.
Method: 1 fps frames (178) + frames at every soft scene change (ffmpeg found **zero** cuts above scene>0.25; highest 0.21 at 0:31 — every transition is soft), timestamped contact sheets, 6 full-res spot checks, whisper base.en transcript.
Reviewer hats: (a) judge seeing ~50 entries, (b) $WIF holder scrolling X muted, (c) senior editor.

---

## 1. Story

**Hook (0:00–0:10): clear and strong, but it is a regret hook, not a $WIF hook.**
- 0:00 "This is a real wallet on Robinhood Chain" over a card: *"This wallet turned $18,421 into $0.35. In NVDA: $16,972."* with an animated core sample filling green. Concrete, real, emotional — best possible opening for a stranger.
- Problem: the very first frame (0:00) shows the big counter at **"$1"** mid-roll — that is the X auto-thumbnail / first impression. Should open on the finished number.
- 0:04–0:16 holds the same card for ~12 s while three lines play; the counter roll and the side-column fill carry it, but by 0:12 it reads as a held frame.

**By 0:30 does a stranger get it?** Half. They get "your memes died, stocks didn't, this shows you the number and helps you fix it" (0:17–0:28, landing page "Your memes died. NVDA didn't." + "From loose sediment to solid ground" three-row Sediment / Sieve / Bedrock). They do **not** yet know it is a $WIF product. **$WIF is not said or shown as a concept until 1:25 ("This is where $WIF comes in") — 47% into the film.** For a hackathon whose #1 criterion is "a real reason to use $WIF", that is the single biggest structural risk: a judge skimming the first 30–40 s files it under "PnL card app".

**One argument or a list?** Mostly one argument: regret → see your number → convert the dead bag → keep converting while you trade → the fee feeds $WIF → stakers get paid in stock → proof. The connective tissue is good ("That one isn't coming back, so I convert it", "People are always going to trade memes, so might as well take advantage of that", "This is where $WIF comes in"). It drifts into feature-list mode in the staking stretch (1:34–1:53: "new stakes wait a full epoch / so nobody can game a payout / staking ten thousand drops your own fee to 0.3%") — three mechanics in 19 s over a dense form.

**Whole-product coverage — all present:**

| Item | Where | Note |
|---|---|---|
| Hindsight card, Chainlink pricing | 0:00–0:16, 0:36–0:42 | "any wallet" is visible ("Look up any wallet", 0:44) but never said |
| Convert dead meme → Stock Token, 2 sigs | 0:43–0:54 | "priced against Chainlink" 0:53 |
| Ownerless Jar, withdraw any time, streak | 0:55–1:03 | callout "ownerless contract / no admin key" |
| Slice up to 10% on buy/sell, same tx | 1:06–1:24 | buy 1:20, sell 1:22 |
| Fee only buys $WIF, never sells | 1:25–1:33 | callout "buy only — the router refuses any $WIF sell" — great |
| Staking, choose stock, epoch anti-gaming, 10k discount | 1:34–1:53 | correct but crammed |
| Hourly distribute: half burn, half stock to stakers | 1:54–2:05 | "anyone can run it" |
| Claim into Jar | 2:06–2:11 | |
| Card mint burns 1 $WIF after Chainlink check | 2:12–2:19 | |
| Leaderboard | 2:20–2:22, 2:41–2:48 | |
| Flywheel recap | 2:24–2:30 | best moment |
| Proof page / recompute onchain / 62 tests | 2:32–2:40 | |
| Who it's for, honest limits ("isn't profit and loss") | 2:41–2:52 | |
| End card + URLs | 2:54–2:57 | |

**Flywheel significance:** unmistakable *at 2:24* (circle diagram: meme trade → 0.5% fee buys $WIF, never sold → half burned every hour → half buys stock for stakers → more reason to hold $WIF). Before that it has to be assembled by the viewer from four separate scenes. Judges will get it; muted scrollers will only get it if they reach 2:24.

---

## 2. Craft

**Transitions.** Consistent, on-brand, no default xfade look. Two families: soft crossfades/scroll-throughs (all of them under scene 0.21) and a branded **striped sediment wipe** (rust/sand/green bands) at 0:16, 0:28, 2:23, 2:31, 2:40, 2:53. The wipe is a nice idea but it is used **4 times in the last 35 s** (2:23, 2:31, 2:40, 2:53) and only twice in the first 2:20 — the ending feels choppy and the device wears out exactly where it should land hardest. Each wipe shows a near-full-frame flat rust slab for ~0.5 s (0:16, 2:23, 2:53 frames are almost entirely red) — reads as a flash on phones.

**Pacing.**
- Good: convert (0:43–0:54) and trade (1:06–1:24) are tight, real wallet popups shown ("Confirmed in wallet — convert WALLET to NVDA").
- Held/frozen: 0:04–0:16 hook card; 2:36–2:40 Dispatches list static 4–5 s; 2:41–2:48 leaderboard held ~8 s with **visibly empty/black card slots** ("Biggest regret" card is a dark void) — the weakest visual in the film, held the longest.
- Rushed: 1:41–1:53 staking (three mechanics on a dense form, cursor wandering), 2:12–2:19 mint (popups overlap card, hard to see what was minted).
- Mid-scroll frames everywhere (0:21–0:23, 0:43, 1:03, 1:39, 2:10): virtual camera is constantly gliding. Reads "screen recording with pans" rather than "directed". Not janky, but restless; no speed ramps detected that look broken.

**Overlays / callouts.** Cream sticky-note callouts ("worth now", "ownerless contract", "buy only / router refuses any $WIF sell", "10,000 staked: 0.3% fee", "anyone can run it", "minted onchain, 1 $WIF burned") are the film's best craft element — on-brand, factual, timed to VO. Issues: at 1080p they are ~14 px secondary text; at phone width the sub-lines are unreadable. At 1:40–1:41 a "pick your stock" callout is caught mid-fade, ghosted over the stats row (looks like a render glitch). At 2:13–2:15 two wallet popups and a callout stack on the mint button.

**Captions.** Burned in, bottom-centre, white on dark pill with green left rule, one phrase at a time, synced. Clean. But all lowercase and some phrases are 1–3 words ("two signatures", "in real stock"), so muted readers get fragments. Captions sit over UI tables at times (0:00–0:15 over the ledger row) — legible thanks to the pill.

**Voice.** Whisper base.en badly mis-heard key nouns: "Terra Firma" → "Rafima/Rafema", "$WIF" → "whiff/Zwift", "burns" → "bonds", "stake" → "stick", "slice" → "lies", "NVDA" → "the video". Whisper base is weak, but these misses cluster on exactly the brand words — a signal that the read is fast/soft on proper nouns. Worth a listen on phone speakers; if confirmed, the burned captions are doing the heavy lifting.

**Music.** Continuous bed (no silence >0.8 s at -40 dB anywhere), overall -16 LUFS, narrow 4.9 LU range — level is sensible for X; no obvious swells at key beats (flywheel / end card get no musical lift).

**Ending / CTA.** 2:54–2:57: logo, "Stand on $WIF. Sweep the rest into stock.", URL chips `terrafirma-wif.vercel.app` + `github.com/dmustapha/terra-firma`, over a busy half-green landing page ("Stand on bedrock." + "Drill my wallet" input compete with it). ~3 s, fading out from 2:56 — too short to read two URLs, and the background fights the card. No ask ("paste your wallet", "stake $WIF").

---

## 3. Sound-off

Mostly works: captions + callouts + real UI carry the convert, trade and fee scenes. Fails in three places muted: (1) the first 30 s never mentions $WIF visually, (2) staking 1:41–1:53 — captions are fragments over a form, (3) the flywheel point only becomes visual at 2:24. A muted $WIF holder who drops at 0:30 never learns it's for them.

---

## 4. Strongest moments

1. **0:00–0:15 real-wallet regret card** — "$18,421 into $0.35. In NVDA: $16,972." with the core sample filling. Instantly human, uses Chainlink-priced real data, Robinhood-Chain-native (stocks vs memes).
2. **1:25–1:33 "This is where $WIF comes in"** — 0.5% fee, callout "buy only — the router refuses any $WIF sell", wallet confirm "buy $WIF". The cleanest proof of a real, enforced reason to use $WIF.
3. **2:24–2:30 flywheel diagram** — simple, branded, animated in sync with the VO; the one frame a judge will remember.

## 5. Most damaging weaknesses + ≤60-min fixes

1. **$WIF absent until 1:25 (47%).** Fix: add a 2–3 s lower-third / title card at ~0:26–0:29 (over the landing page, before "this is my own wallet") — *"Every trade feeds $WIF: bought on every trade, burned every hour, stakers paid in stock."* Or, cheaper: pull a 2 s flash of the flywheel diagram (2:24) to 0:26 as a "here's where this goes" tease. Also make the X post thumbnail/first frame mention $WIF.
2. **First frame shows "$1".** Fix: start the film 0.5–1 s later or freeze the finished "$16,971 / $18,421 into $0.35" frame as frame 0 (and as the cover image) — it's the thumbnail on X.
3. **Leaderboard held 8 s with empty black cards (2:41–2:48), plus Dispatches static 2:36–2:40.** Fix: cut the 2:41–2:48 "who it's for" VO onto the flywheel diagram or the end card instead of the leaderboard; trim Dispatches hold to ~1.5 s. Saves ~6 s to give to the end card.
4. **End card 3 s, cluttered background, no ask.** Fix: hold it 5–6 s (using the seconds saved above), blur/darken the landing page behind it to ~20% or use flat background, add one line: *"Paste your wallet. Stake $WIF. Get paid in stock."*
5. **Wipe overuse in the last 35 s + red flash slabs; staking scene crammed.** Fix: replace the 2:31 and 2:40 striped wipes with the same soft crossfade used elsewhere (keep wipe only at chapter breaks 0:16, 2:23, 2:53) and shorten the rust-slab dwell to ≤6 frames. For staking, add one summary callout pinned for the whole 1:41–1:53 stretch: "stake $WIF → pick a stock → paid hourly · new stakes wait 1 epoch · 10k = 0.3% fee", and fix the half-faded "pick your stock" ghost at 1:40–1:41.

Minor: say "any wallet" aloud at 0:44; bump callout sub-line size ~1.5x for phones; capitalise captions' brand words ($WIF, NVDA, Terra Firma); give the flywheel and end card a small music lift.

---

## 6. Scores

- **Judge appeal: 7.5/10** — genuinely working, on-mainnet, every mechanic shown end-to-end with real wallet confirmations and a proof page, but the $WIF reason arrives late enough that a skim-judge could miss that it's the core.
- **Community-vote appeal: 6/10** — great regret hook and handsome brand, but muted scrollers don't see "$WIF" for 85 s, the payoff (burn + paid in stock) lands at 2:24, and the end card gives them nothing to do.
