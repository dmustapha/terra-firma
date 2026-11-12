# STRESS-RESULTS.md

status: complete

## What Just Happened
Stress testing hammered every surface judges and users touch, without sending a single mainnet transaction: 87
contract tests on a mainnet fork (25 new: the card mint burn, boundary values, a sandwich on the $WIF burn, distribute
griefing, Friend Jar invite replay, three fuzz suites), 37 API checks, 45 browser checks, and a 20-wallet concurrency
run. Gutting the burn on a scratch copy turned 12 tests red, so the suite really guards the headline. One real bug
surfaced: when 20 people open cold cards at once, some requests died as a Vercel 504 after 60 seconds. It now answers a
clean "busy, retry in 5 s" before the cut-off and the client retries into the cache. That matters for the demo and
the community vote, when many wallets open cards at once; livetest re-checks it on the deployed build.

## Honest Gaps
- The 504 fix is committed (8fc6f57, b001e51) but not deployed by this phase; prod still has the old behaviour until
  the next deploy, and the re-vector ran on a local build, not on Vercel.
- Cold-card capacity under 20 simultaneous new wallets is still bounded by the public RPC log rate limit (only 3/20
  carded locally inside the retry window); the cure is HyperSync, which needs Dami's Envio token (PLAN P5.0).
- Wallet-signing UI journeys (buy, sell, convert, stake, claim, withdraw clicks) were not run headless; they rest on
  Dami's 12 real mainnet transactions and livetest DH-1.
- Visual viewport sweep (320/768/1024/1920) and a11y/contrast were deferred because the UI redesign is pending.
- Run 1 of the UI checks hit the live site before the coordinator's no-live-load directive; run 2 was local only.
