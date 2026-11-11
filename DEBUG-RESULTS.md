# DEBUG-RESULTS.md

status: complete

## What Just Happened
Debug ran the full six-phase quality gate against a mainnet fork and the local app, and it caught the kind of bugs that lose hackathons: a staking accounting flaw that could permanently lock other users' $WIF, a card bug that would have shown an empty Hindsight card right after the demo trade, and two FeePool holes (a caller could force-skip every burn; a hook reverting with empty data could freeze distribute). All are fixed with regression tests (fork tests 38 → 62, web tests 21 → 133), so the Thesis loop (memes → real stock, $WIF burned and streamed) now holds under adversarial use. Wire rides on this: it must prove the live integrations (GetBlock stream, Quicknode, HyperSync) and, after funding, the real wallet-signing and router-buy paths on mainnet.

## Honest Gaps
- Browser wallet signing (stake, buy+sweep, convert, claim) has never been clicked through: Claude cannot import keys into Dami's wallet, and nothing is deployed on mainnet yet; first real exercise is Dami's demo session (DH-1, DH-6).
- The router-buy branch of the Hindsight card (`routerMemeLeg`, fee and sweep excluded from "paid") is proven only with a synthetic receipt; no real TerraRouter transaction exists until deploy.
- `/api/stream` has never received a real GetBlock WSS event (no deployed contracts emit yet).
- FriendJar invite codes can be brute-forced from the public hash (M-05); acceptable only while Friend Jars stay gated off.
- No CSP / X-Frame-Options headers and no per-IP rate limiter (global caps only); to be set at deploy.
- Heavy-wallet card latency on the public RPC sits at 18.6–19.8s, close to its 20s test bound; HyperSync needs Dami's Envio token.
