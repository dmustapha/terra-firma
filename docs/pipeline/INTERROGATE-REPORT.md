## INTERROGATE REPORT: Terra Firma
**Date:** 2026-11-12T12:12:48.522303+00:00
**Mode:** STANDARD (run inline by one agent under deadline; persona lenses applied directly, not as 13 sub-agents)
**Findings:** 8 (P1: 3, P2: 4, P3: 1); fixed in-phase: 3

## VERIFIED SOLID
- $WIF used onchain: 2 distributes burned 22.43 $WIF, 3 sources agree (proof.md)
- No secrets in tree or full git history (0 hits incl. RPC keys and private keys)
- All 10 routes 200 on both domains; /friends 404 by design (gated)
- Geofence: Vercel IP country, spoofed header ignored; list = 15 RH restricted jurisdictions incl. US/CA/GB
- RPC proxy refuses eth_sendRawTransaction (method not allowed)
- Keeper healthy: scheduled runs succeeding, 0.000385 ETH (~19 distributes) through Nov 16
- Brand rules: no 'tokenized', no $HOOD, no em dashes in README; no-affiliation note present
- verify-claims: fork-tests 62, contracts 7, NVDA fill -0.04% all re-derive OK
- Contracts: 87 tests (62 fork + 25 stress incl. 3 fuzz suites) per evidence files; no owner/admin surface
- NVDA counterfactual prices equal Chainlink RHNVDA/USD round answers in force at each buy (3 buys checked)

## OPEN / FIXED GAPS
| # | Sev | Persona | Gap | Location | Status | Fix | Demo | Submission |
|---|---|---|---|---|---|---|---|---|
| I-1 | P1 | P9: Honesty Cop | README said burn, staker claim and card mint were 'Not yet onchain' after all three landed | README.md:115 (first-of-kind table) | FIXED | replaced with the three real tx hashes + live totals (22.43 $WIF burned, 2 distributes, 2 claims, 1 card) in 3ba9fca | NONE | NONE |
| I-2 | P2 | P20: Narrative Check | README test counts understated (62 fork / 133 web vs 87 contract / 142 web) | README.md badges + Tests table | FIXED | badges and table now cite 62 fork + 25 stress (with evidence files) and 142 web tests (3ba9fca, 3bdfe7c) | NONE | NONE |
| I-3 | P1 | P8: Config Guardian | Founder voice takes (video/voice/takes/*.webm) were untracked but not ignored in a PUBLIC repo; one 'git add -A' would publish them | .gitignore | FIXED | gitignored video/voice/takes/, guide, renders, *.webm (3ba9fca) | NONE | NONE |
| I-4 | P1 | P14: Demo Reliability | Blockaid flags both domains: Zerion blocks the dApp outright; MetaMask shows red 'unknown address/high-risk' and requires acknowledging the risk on every signature | terra-firma-henna.vercel.app, terrafirma-wif.vercel.app | OPEN | Blockaid developer verification filed 2026-11-12 (pending). Video already masks it. Keep the README disclosure; in the submission text tell judges MetaMask works after 'proceed anyway'; a custom domain would likely start clean | WARNS | WARNS |
| I-5 | P2 | P10: Judge Simulator | Regret Index paragraph leads with 'only 1 of 8 would be better off in NVDA', which reads against the pitch for a skimming judge | README.md Regret Index section | OPEN (Dami's call) | keep it (honesty is a strength) but reframe the sentence to the measured-not-estimated point first, or move it below the proof table | NONE | WARNS |
| I-6 | P2 | P18: Edge Cases | Cold card for an unseen wallet takes ~16.6s without HyperSync (Envio token absent) | /api/hindsight (live probe 0x56a2...AE58: 16.62s, 200) | OPEN | add ENVIO_API_TOKEN to Vercel if available; UI already shows a progress screen and returns 503+Retry-After under load | NONE | NONE |
| I-7 | P2 | P8: Config Guardian | /api/rpc read proxy has method allowlist and batch cap but no per-IP rate limit; abuse could spend GetBlock quota | web/app/api/rpc/route.ts | OPEN | falls back to public RPC automatically, so worst case is degraded speed; add a small per-IP token bucket post-submission | NONE | NONE |
| I-8 | P3 | P9: Honesty Cop | CLAIMS.md wif-burned row still PENDING though derivable (22.430322849521702563) | CLAIMS.md:11 | OPEN | left PENDING on purpose: the value grows with each hourly burn and an exact pin would turn verify-claims red later; the live /proof shows it | NONE | NONE |

**DEMO GATE:** HAZARDS
**SUBMISSION GATE:** WARNING
