# DEMO-SCRIPT: Terra Firma
Generated 2026-11-12 | Duration target ~3:10 (plan cap: under 3 min of footage plus title/outro; trim scenes 7-8 first if long) | audio_strategy: **separate** (Claude drives the live site in Dami's Chrome while macOS screencapture records; Dami signs every tx in Zerion; Dami records the voiceover from video/SCRIPT.md in the voicebooth) | pacing_mode: gap
Every on-chain action in the film is a REAL Robinhood Chain mainnet transaction from demo wallet 0x7204f8fec453efe771e69559b597a1229dca05aa, signed by Dami during the take. No fork footage. Cut waits carry a small 'N s skipped' tag. The Zerion/Blockaid warning is cut (DH-14).

## Pre-Recording Setup
- [ ] Zerion unlocked on 0x7204…05aa, network Robinhood Chain (4663). Balance >= 0.0016 ETH and >= 101 $WIF (now 0.00234 ETH, 156 $WIF).
- [ ] Site connected once already (so the Blockaid page is behind us); geofence attestation accepted (FG-007).
- [ ] /app and /proof opened once to warm caches (FG-004, FG-009).
- [ ] One theme for the whole take (dark) (FG-010). Browser zoom 100%. Notifications off. No other tabs in shot.
- [ ] No load-generating jobs running on this machine (FG-008).
- [ ] Before scene 10: `cast call 0xb1FDE1C822a3fA7542B7A87D730a1969B2bFf5EB 'canDistribute()(bool)'` = true (FG-003).
- [ ] Screen capture: macOS `screencapture -v` full screen (3024x1964 retina), cropped + scaled to 1920x1080 in post (demo-video OffthreadVideo needs 1920x1080).
- [ ] Take log: write each tx hash + wall-clock time as it confirms (recordings/take-log.md) so the edit and /proof agree.
- [ ] Voicebooth: quiet room, 10 s test take played back, no clipping. Lines in video/voicebooth-lines.txt.

## Filming Sequence

### Scene 1: Cold open: a real wallet's regret [Remotion over live capture] 0:00-0:21
Action: https://terra-firma-henna.vercel.app/card/0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E (or the landing hero, which reads the same wallet live)
Show: Paid $18,216 / today $0.05 / NVDA path $16,697 count up; the core-sample column: eroded meme layer over NVDA bedrock.
Real tx: read-only; numbers live from /api/hindsight at block 112,360,875
Say:
[SUB] this wallet put eighteen thousand two hundred dollars into memes on robinhood chain.
[SUB] today those memes are worth five cents.
[SUB] the same dollars in nvda, bought at the same moments, would be worth sixteen thousand seven hundred.
[SUB] every buy priced with the chainlink round of that moment. measured, not estimated.

### Scene 2: Title + claim [Remotion] 0:21-0:27
Action: TERRA FIRMA card with the seedling seal + tagline
Show: Seal, wordmark, 'Stand on $WIF. Sweep the rest into stock.'
Real tx: none
Say:
[SUB] this is terra firma. your hindsight, then solid ground: real stock tokens you own.

### Scene 3: How it works [Remotion diagram] 0:27-0:41
Action: Three ownerless contracts: TerraRouter -> Jar; fees -> FeePool -> half buy+burn $WIF, half stock to stakers; Chainlink feeds into HindsightLens
Show: Animated: meme trade -> slice -> Jar bedrock; fee drip -> burn flame / stock stream
Real tx: none
Say:
[SUB] three ownerless contracts.
[SUB] a router that trades memes and keeps a slice as stock. a jar that holds it. a fee pool that turns fees into burned wif and stock for stakers.

### Scene 4: It's real [live capture] 0:41-0:46
Action: / (header shows Connect)
Show: Corner tag: 'Robinhood Chain mainnet 4663 · wallet 0x7204…05aa'
Real tx: none
Say:
[SUB] everything next is real, on robinhood chain mainnet, from my own wallet.

### Scene 5: 1 Connect [live capture (Claude drives, Dami signs)] 0:46-0:47
Action: https://terra-firma-henna.vercel.app -> Connect -> Zerion
Show: Header flips to 0x7204…05aa. CUT the Zerion 'Malicious DApp' page entirely (FG-001).
Real tx: connect only
Say:
[SUB] i connect.

### Scene 6: 2 Buy a meme [live capture] 0:47-0:54
Action: /trade/0x0339f5459FC690aC85F1782e15782A151b4A9E1b: Pay 0.0003 ETH, slice dragged to 0%, Buy WALLET
Show: Quote line (≈ WALLET out, 0.5% fee builds the $WIF burn), Zerion confirm, success toast + explorer link
Real tx: NEW mainnet Traded tx (record hash in the take log)
Say:
[SUB] first, i buy a meme like anyone would. a few cents of eth, through uniswap.

### Scene 7: 3 Hindsight card [live capture] 0:54-1:00
Action: /app (refresh if cached, FG-005)
Show: WALLET row: paid / today / NVDA path, priced from Chainlink rounds; 'Compare against' NVDA
Real tx: read-only
Say:
[SUB] my card shows what i paid, what it's worth, and what it would be in nvda.

### Scene 8: 4 Convert [live capture] 1:00-1:10
Action: Convert tab -> WALLET -> convert HALF (FG-002) -> NVDA -> Approve, Convert
Show: Two Zerion confirms (cut the gap between them), 'NVDA added to your Jar'
Real tx: NEW Converted tx
Say:
[SUB] this meme is going nowhere. so i convert it.
[SUB] one confirmation. the meme is sold, and real nvda lands in my jar.

### Scene 9: 5 Jar [live capture] 1:10-1:15
Action: My Jar
Show: NVDA balance (includes the earlier 0.0000878 NVDA claim + the convert); 'Withdraw' button visible; 'Ownerless' note
Real tx: read-only
Say:
[SUB] no admin key. i can take my stock out any time.

### Scene 10: 6 Buy with a slice [live capture] 1:15-1:28
Action: /trade -> PONS: Pay 0.001 ETH, slice 2%, NVDA, Buy PONS
Show: Quote: '2% goes to your Jar as NVDA ≈ …' then confirm; Jar slice toast
Real tx: NEW Traded + Swept tx
Say:
[SUB] but you don't have to stop trading memes. you just keep a slice.
[SUB] i buy pons with two percent to my jar. one transaction: the meme, plus a slice of nvda.

### Scene 11: 7 Sell [live capture] 1:28-1:34
Action: /trade PONS -> Sell tab -> Max -> Approve, Sell (slice 0%)
Show: ETH comes back; fee line
Real tx: NEW Traded (sell) tx
Say:
[SUB] and sell it back. buys and sells, on every kind of uniswap pool here.

### Scene 12: 8 Buy $WIF [live capture] 1:34-1:39
Action: /trade -> $WIF (badge '$WIF · buy only'): Pay 0.0001 ETH, Buy $WIF
Show: 'Terra Firma never sells $WIF' note in shot
Real tx: NEW Traded tx
Say:
[SUB] every trade pays a half percent fee. that's where wif comes in.

### Scene 13: 9 Stake [live capture] 1:39-1:50
Action: /stake: 100 $WIF, NVDA, Approve and stake
Show: 'Activating, earns from epoch N' + the 10,000 $WIF 0.3% fee chip
Real tx: NEW Staked tx
Say:
[SUB] i buy wif and stake it. stakers pick a stock. mine is nvda.
[SUB] stake ten thousand and your fee drops to point three percent.

### Scene 14: 10 Burn [live capture] 1:50-2:06
Action: /proof -> 'Run the hourly distribute' -> Run distribute (check canDistribute first, FG-003)
Show: Distributed: $WIF burned + NVDA streamed; the three burn reads agree (Distributed event, Transfer to 0x0, totalWifBurned)
Real tx: NEW Distributed tx (second ever; first was 0xbd233684)
Say:
[SUB] every epoch the fee pool splits. half buys wif and burns it. half buys stock for stakers.
[SUB] anyone can run it. i press run distribute.
[SUB] wif bought and burned, and the burn checks out three separate ways.

### Scene 15: 11 Claim [live capture] 2:06-2:12
Action: /stake -> Claim to Jar
Show: Reward to claim > 0 NVDA, confirm, Jar ticks up
Real tx: NEW Claimed tx (first was 0x37441924)
Say:
[SUB] the other half is waiting for me. i claim it, into my jar as nvda.

### Scene 16: 12 Mint the card [live capture] 2:12-2:19
Action: My card -> 'Mint this card · burns 1 $WIF' -> Approve, Mint
Show: Button flips to 'Minted onchain'
Real tx: NEW CardMinted tx (first ever onchain)
Say:
[SUB] last, i mint my card. it burns one wif, after the contract recomputes it from chainlink.

### Scene 17: 13 Leaderboard [live capture] 2:19-2:23
Action: /board
Show: 'Biggest regret' row with the minted card; 'Biggest Jars' row for 0x7204…
Real tx: read-only
Say:
[SUB] it's on the leaderboard now. biggest regrets, biggest jars.

### Scene 18: Proof [live capture] 2:23-2:34
Action: /proof: first-of-kind table, then click 2-3 hashes to robinhoodchain.blockscout.com; Recompute box on 0x3fDB…
Show: Hashes open on the explorer; recompute result matches the card
Real tx: read-only
Say:
[SUB] don't trust me. every transaction you just watched is on the proof page.
[SUB] and the contract itself can price any card, so you can check my numbers.

### Scene 19: Who it's for [Remotion three cards] 2:34-2:52
Action: Meme holders / $WIF holders / traders who won't stop
Show: Cards build with the voice
Real tx: none
Say:
[SUB] who is it for? anyone on robinhood chain holding memes they know the ending of.
[SUB] wif holders. every trade buys wif, burns wif, and pays stakers in stock.
[SUB] and traders who won't stop. let every trade leave a little stock behind.

### Scene 20: Honest [Remotion] 2:52-3:05
Action: What it doesn't promise
Show: tracked memes + ETH/WETH/USDG/stock buys only (rest unpriced); not P&L; unaudited
Real tx: none
Say:
[SUB] what it doesn't promise: it covers tracked memes and eth, usdg or stock buys. the rest shows as unpriced.
[SUB] it's not profit and loss. and it's unaudited, so keep it small.

### Scene 21: Outro [Remotion] 3:05-3:10
Action: Seal + live URL + github.com/dmustapha/terra-firma + 'Measured, not estimated.'
Show: 
Real tx: none
Say:
[SUB] that's terra firma. stand on wif. sweep the rest into stock.

## Do NOT Show During Recording

| Footgun | Severity | Cause | Why | Workaround |
|---|---|---|---|---|
| FG-001 Zerion 'Malicious DApp' page | HIGH | wallet-reputation | new domain flagged by Blockaid; would read as a scam | cut it entirely (DH-14) |
| FG-002 empty card at mint | CRITICAL (fixed by order) | sequencing | converting ALL WALLET + selling ALL PONS leaves nothing to mint | convert half the WALLET |
| FG-003 'Not due yet' on Run distribute | HIGH | precondition | button disabled without fees/new epoch | do fee trades first, check canDistribute |
| FG-004 cold card 503/wait | HIGH | latency | public RPC log scans | warm cache, tag cut waits |
| FG-009 /proof placeholders | LOW | latency | first paint | film after tables fill |

## Async Operation Timings

| Operation | Expected wait | What to say during the wait |
|---|---|---|
| Any tx confirm on Robinhood Chain | 1-3 s after Zerion confirm | covered by the line; cut dead air |
| Cold Hindsight card | 5-40 s (FG-004) | cut with tag |
| /proof tables first paint | 20-30 s | cut with tag |
| Distribute tx (3.5M gas cap) | 2-5 s | line 23 |
