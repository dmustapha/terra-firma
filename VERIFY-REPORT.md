# VERIFY-REPORT: preflight (Terra Firma, World is Flat)
Run: 2026-11-12 ~15:15-15:25 UTC. Mode: preflight. Deadline 17:29 UTC.

## Decision: SHIP WITH FIXES (fixes are Dami-only actions: upload video, submit, pin repo)
Winner-readiness: **88 / 100**

## Kill-zones
| KZ | Status | Evidence |
|---|---|---|
| KZ-1 demo reliability | CLEAR | 9 key routes x5 on terrafirma-wif.vercel.app = 45/45 HTTP 200; henna domain 200; /api/hindsight 0x3fDB card 200 in 6.6 s; /api/rpc chainId 0x1237 and refuses eth_sendRawTransaction |
| KZ-2 submission completeness | CLEAR_CONDITIONAL | every form field drafted in submission/FORM-ANSWERS.md within limits; film final (177.86 s). Condition: Dami uploads the film (YouTube/Loom/Vimeo/X), pastes link, adds payout wallet + email, submits before 17:29 UTC |
| KZ-3 wrong network | CLEAR | all 7 contracts on Robinhood Chain 4663, Sourcify exact_match 7/7 |
| KZ-4 sponsor/$WIF integration | CLEAR | ABCD 4/4 for $WIF: code (FeePool buy+burn, WifStaking, TerraRouter fee discount, HindsightLens mintCard burn), live mainnet txs (2 distributes, totalWifBurned 22.43 $WIF, stake, claims, card mint), UI surfaces, docs |
| KZ-5 eligibility | CLEAR | $WIF used onchain; must stay live to 2026-11-16 17:30 UTC: keeper hourly runs green, 0.000385 ETH gas (~19 distributes); geofence on Stock Token actions uses Vercel real-IP (spoofed x-vercel-ip-country ignored); brand rules respected |
| KZ-6 claim integrity | CLEAR | VF sample 6: 5 recompute as recorded; VF-24b (script had 34 table lines) stale after the Dami-directed script rewrite (v6, prose sections) and is flipped to FAILED-superseded with replacement VF-29; no claim in any submitted surface depends on it |
| KZ-7 infra survives judging | CLEAR | Vercel prod (two domains) + GitHub Actions keeper; no free-tier spin-down |

## Facets
| Facet | Score | Notes |
|---|---|---|
| F1 demo reliability | 22/25 | all routes + flows live; wallet-warning hazard (Blockaid flags new domains; MetaMask needs "proceed"), disclosed in README/form |
| F2 submission completeness | 15/20 | everything staged; video link, payout wallet, submit and repo pin pending (Dami) |
| F3 sponsor/$WIF integration | 19/20 | deep, onchain, provable; Quicknode badge cut (no token) |
| F4 technical correctness | 14/15 | 7/7 verified, 87 contract + 143 web tests, 13/13 cited txs success onchain |
| F5 narrative | 8/10 | one-argument film in Dami's voice, two independent reviews applied (judge 7.5 -> fixes for early $WIF, CTA end card, accuracy) |
| F6 eligibility | 5/5 | see KZ-5 |
| F7 code quality | 3/3 | typecheck/build clean, secret scan clean, interrogate 0 P0 |
| F8 presentation assets | 2/2 | seal logo, 16 fresh screenshots, film 1080p/30, -16 LUFS |

## Links and txs
35 unique URLs in README.md, submission/FORM-ANSWERS.md, submission/HACKATHON-README.md: all 200 except `http://localhost:3000` (local run instruction) and the public RPC root (POST-only, 400 on GET) - both expected. 13/13 cited tx hashes: receipt status 1.

## Intentional cuts
Recorded with reasons in SUBMISSION_STATUS.md (HyperSync, Quicknode badge, Friend Jars UI, report card/ticker not featured).

## Remaining items (Dami)
1. Upload ~/Desktop/terra-firma-demo.mp4 to YouTube (unlisted ok); paste link into the form "demo video" field and send it to Claude for the README line.
2. Submit on worldisflat.fun/build: paste fields from submission/FORM-ANSWERS.md; add payout wallet (double check), email, optional handle; tick integration types (buy-and-burn, staking rewards, fee discount, burn per action); logo web/public/logo-seal.png; categories Stock Tokens, hooks and defi, consumer and payments.
3. Pin terra-firma on github.com/dmustapha.
