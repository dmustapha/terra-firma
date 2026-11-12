# Submission status
_Last updated: verify_preflight, 2026-11-12 ~15:20 UTC (submissions close 17:29 UTC)_

## Status
- [x] 7 contracts on Robinhood Chain mainnet (chain 4663), all exact-match source verified on Sourcify (Blockscout shows them verified)
- [x] Tests: 62 mainnet-fork contract tests + 25 stress/fuzz tests (87), 143 web tests
- [x] Live app: https://terrafirma-wif.vercel.app (same build at https://terra-firma-henna.vercel.app); all routes 200
- [x] Hourly keeper in GitHub Actions (cron `7 * * * *`), last runs green; keeper gas covers about 19 more distributes through 2026-11-16 17:30 UTC
- [x] Real mainnet usage: 11 trades, 2 distributes, 22.43 $WIF burned (FeePool.totalWifBurned), 2 staker claims, 1 card minted (submission/proof.md)
- [x] Demo film: video/out/terra-firma-demo.mp4, 2:57.9, recorded on mainnet, under the form's 3-minute rule
- [x] Paste-ready form answers: submission/FORM-ANSWERS.md
- [ ] Demo video uploaded to YouTube and linked in the form and README (Dami)
- [ ] Form submitted on worldisflat.fun/build with payout wallet and email (Dami)
- [ ] Repo pinned on github.com/dmustapha (Dami, GitHub has no API for pins)

## Live integrations
- **Envio HyperSync for card loads:** enabled in production. The card route pulls a wallet's meme transfers from Robinhood Chain HyperSync, and falls back to the RPC log scan on any error, so a HyperSync outage never breaks a card.

## Intentional cuts (with reasons)
- **Quicknode "verified Jar" badge (F-018):** built but not shown. Reason: the Quicknode endpoint token was never available (QUICKNODE_TOKEN empty). The Jar reads directly from the contract instead.
- **Friend Jars (F-020):** contract deployed and tested, UI switched off. Reason: scope gate OD7; it needs more mainnet testing before people pool money in it.
- **Weekly Jar report card and live ticker:** built, not featured in the demo film. Reason: 3-minute limit.

## Known limitations
- New domains: Blockaid flags both domains, so Zerion blocks the connect and MetaMask asks you to acknowledge a warning on each signature. A developer verification was filed with Blockaid on 2026-11-12. All contracts are source verified and the site never asks for a seed phrase or permit signature.
- Unaudited hackathon software; keep amounts small.
- See LIMITATIONS.md and HONESTY.md.
