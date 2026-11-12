# Organizer Feedback: Terra Firma on Robinhood Chain

_Built during the World is Flat hackathon. Field notes from actually shipping on your stack, sent in the spirit of making it better._

## What Worked Well
- Mainnet was steady the whole time we were deploying and trading, and Sourcify verification worked for chain 4663, which saved us when the explorer API was hard to reach from scripts (all seven contracts are exact matches).
- Having Chainlink feeds for the Stock Tokens, with real round history, is what made the whole product possible. Being able to price a buy from the round that was live at that second is a genuinely rare thing on a new chain.
- Uniswap v2, v3 and v4 all being there, including the hooked $WIF/ETH pool, meant we could route real meme trades on day one.
- The public project and vote-window APIs on worldisflat.fun made it easy to check where things stood without guessing.

## Friction & Suggestions

_Ordered by how much build time each one took, so the first two are the ones that actually hurt._

### Infrastructure
**What we hit:** the public Robinhood Chain RPC starts returning 429 at about 4 to 5 requests a second from one IP.
**Cost to discover:** first measured in our indexing spike, then hit again under load in stress testing and during a live recording, where it showed up in the browser as "HTTP request failed".
**Delta:** we could not find a published rate limit for `rpc.mainnet.chain.robinhood.com`; the number we work with is the one we measured.
**Impact:** cold Hindsight cards (which scan a wallet's logs) are slow, and a busy shared IP can make a normal page fail. We added a server-side read proxy so browsers stop hitting the public RPC directly.
**Evidence:** `web/lib/rpc.ts` lines 2 and 59; `STRESS-TEST-REPORT.md` line 93 (ST-INFRA-429).
**Suggestion:** publish the limits in the builder docs, and if you can, point builders at a higher-limit or archive endpoint for log-heavy apps.
_Severity: FRICTION_

**What we hit:** GetBlock's Robinhood Chain endpoint caps `eth_getLogs` at about 1,000 blocks ("Block range is too large"), while the public RPC accepts ranges up to 10 million.
**Cost to discover:** found while building the indexer; it forced us to send log scans and normal reads to different providers.
**Delta:** two providers on the same chain behave very differently for the same call, and neither limit is documented in one place.
**Impact:** extra routing code, and log scans still depend on the rate-limited public RPC.
**Evidence:** `web/lib/rpc.ts` line 21.
**Suggestion:** a short table in the Robinhood Chain docs listing each recommended provider's log-range and rate limits would save the next team a day.
_Severity: FRICTION_

### Developer Experience
**What we hit:** wallets running Blockaid (Zerion blocks the site outright, MetaMask asks you to acknowledge a risk on every signature) flag brand new Robinhood Chain dApp domains as malicious. This may be Blockaid being cautious with any new domain rather than anything specific to the chain.
**Cost to discover:** it surfaced the first time we signed on mainnet and cost us a full recording session.
**Delta:** nothing on our side asks for seed phrases or permits; approvals are exact amounts to seven verified contracts.
**Impact:** a judge or new user meets a red warning before they see the product.
**Evidence:** `INTERROGATE-REPORT.md` line 24 (I-4).
**Suggestion (question):** is there a path for hackathon dApps on Robinhood Chain to get verified with Blockaid, or a note you could add to the builder docs telling teams to file a developer verification early?
_Severity: FRICTION_

### SDK / API
**What we hit:** $WIF has no EIP-2612 `permit`, so every flow that spends it (staking, the card mint, and voting too) needs a separate approve transaction first.
**Cost to discover:** spotted in the token audit during research.
**Delta:** $WIF is a standard ERC20Burnable with `burn` and `burnFrom` and no `permit`.
**Impact:** one more wallet signature in each $WIF flow, which matters a lot when every signature also shows a wallet warning.
**Evidence:** `/Users/MAC/wif-hack/research/research-brief.md` lines 116 and 156.
**Suggestion:** a short guide on using Permit2 (already deployed on the chain) with $WIF would let apps collapse those approvals.
_Severity: POLISH_

### Documentation
**What we hit:** the Chainlink stock feeds on Robinhood Chain change phase, so a round id does not always have a next round, and early NVDA rounds report at a different scale from later ones.
**Cost to discover:** found while making Hindsight prices exact; it needed explicit handling in the contract.
**Delta:** we had to infer both behaviors from the rounds themselves.
**Impact:** without the extra checks, a stale old-phase round could price a later buy.
**Evidence:** `contracts/src/HindsightLens.sol` lines 88 to 91.
**Suggestion:** a note in the feed docs about phase changes and any decimal or scale changes per feed.
_Severity: POLISH_

### Sponsor Integration
**What we hit:** submissions are approved in batches with at least a day of lag, and builders cannot see where theirs is.
**Evidence:** `/Users/MAC/wif-hack/research/social-intel.md` line 36 (organizer answer in Discord).
**Suggestion:** a simple "in review / approved" status on the builder dashboard would cut down the anxious messages near the deadline.
_Severity: POLISH_

## Contributions
For the two RPC issues we worked around, the fixes are small and reusable, and anyone is welcome to copy them. `web/app/api/rpc/route.ts` is a read-only JSON-RPC proxy that forwards browser reads to a private node with the public RPC as a fallback and refuses transaction sends. `web/lib/rpc.ts` shows how we split log scans from normal reads across providers with a per-request budget under the public limit. For the feed phase issue, the round-bracketing check in `HindsightLens._priceAt` (lines 88 to 101) is a drop-in way to make sure a historical price really was the one in effect.

## At a Glance
| Category | BLOCKER | FRICTION | POLISH |
|---|---|---|---|
| SDK / API | 0 | 0 | 1 |
| Documentation | 0 | 0 | 1 |
| Infrastructure | 0 | 2 | 0 |
| Developer Experience | 0 | 1 | 0 |
| Sponsor Integration | 0 | 0 | 1 |

## Shareable Summary
Building Terra Firma on Robinhood Chain was mostly smooth, and having Chainlink stock feeds with real history made the product possible. The two things that cost us the most were the public RPC's rate limit (about 4 to 5 requests a second per IP, not documented anywhere we could find) and the very different log-range limits between providers. New dApp domains also get flagged by Blockaid in wallets like Zerion and MetaMask, which is rough for judges seeing a project for the first time. A small docs table of provider limits and a note on wallet verification would help the next teams a lot.
