# DEPLOY-RESULTS.md

status: complete

## What Just Happened
The repo README was rebuilt from a full inventory of what ships, after Dami pointed out it did not carry the whole project. It now documents every live capability with its route or file: the Hindsight card (any wallet, recompute, mint, share image), convert, the trade terminal with its slice, Friend Jars, the Jar page (withdraw, saving streak, history, Quicknode badge), the weekly Jar report, staking, the three leaderboards, the live event feed, and tables of all 11 pages and 8 APIs plus every live integration (Chainlink, Uniswap, Envio HyperSync, Quicknode, GetBlock). The screenshot gallery gained My Jar, Leaderboard and a fresh Friend Jars capture, LIMITATIONS.md stopped calling Friend Jars gated, and the repo got its homepage URL and 10 topics. The gates ran for real: 143 web tests, both typechecks, contract and web builds, claim re-derivation, a cold-clone clean-room run that passed with zero drift, a 17-route live probe plus manual checks of the 3 dynamic routes and both share images, and a rendered URL identity check. Judges reading the repo now see the same full product the live site offers.

## Honest Gaps
- The YouTube demo is Private again (YouTube reports "Private video"); Dami must set it to Public. Ship-check reports it as a dead link until then.
- 78 historical commits carry Claude co-author trailers, so GitHub lists Claude as a contributor; clearing it needs a history rewrite and force-push, held for Dami's go-ahead.
- Ship-check still reports two false positives with evidence: the worktree branch is named design/depth-v2 while it pushes to main (0 commits ahead of origin/main), and the user-attachments video URL 404s on a bare request while the logged-out repo page renders it with a signed URL.
- The local .git is 72 MB, over the 40 MB budget; the clean-room clone and install still succeed.
