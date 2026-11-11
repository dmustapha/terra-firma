# ROADMAP — Terra Firma (STAGE-0 foundation, CAMPAIGN)
| Stage | Envelope | Order | HARD gate | Scoped |
|---|---|---|---|---|
| SF-1 Core money path | contracts + Hindsight engine + convert/trade/stake/distribute on mainnet with real txs (F-001..F-017) | 1 | yes: PLAN P0–P4 gates + OD7 core-green by 2026-11-11 23:59 WAT | phases/C1-SCOPE-KICKOFF.md |
| SF-2 Depth adds | stream, board, streak, weekly report, Quicknode, card mint, mobile (F-018..F-026) | 2 | yes: PLAN P5 gate | scoped when reached (C2) |
| SF-3 Friend Jars | gated UI on the deployed FriendJar | 3 | yes: OD7 (only if SF-1 green in time) | scoped when reached (C3) |
| SF-4 Quality + submission | livetest, design, interrogate, docs, package, video, submit, ship thread | 4 | yes: PLAN P7 gate, submit by 2026-11-12 08:00 WAT | scoped when reached (C4) |

## PREREQUISITES (dated, each bound to a gated item)
| Prerequisite | Needed by | Owner | Status (2026-11-11 02:00 WAT) |
|---|---|---|---|
| GetBlock endpoints | SF-1 build/tests | Dami | DONE (in .env.local) |
| Funded deployer (~0.002 ETH) + demo wallet (~0.004 ETH) on 4663 | SF-1 P3 (09:00 WAT) | Dami | OPEN |
| Quicknode auth token | SF-2 F-018 | Dami | OPEN (endpoint created) |
| Vercel login + GitHub repo/secrets | SF-1 P3.4–P3.5 | Dami / gh CLI | OPEN |
| WalletConnect project id (optional) | SF-2 mobile | Dami | OPEN (injected works without) |

## RISK map
PRD §7 R1–R18 with decision trees DT-1..DT-18 in PLAN.md; binding stage: R1,R3,R4,R6,R7,R8,R17,R18 → SF-1; R5,R13,R14,R15,R16 → SF-1/SF-2; R2,R9,R10,R11,R12 → SF-4.

## Spike plan
Phase 0B (done): research/spike-coverage.md, spike-indexing.md, spike-fork.md; platform invariant proven on fork; UR 2.1 layout root-caused in Phase 2 (contracts/test/URProbe.t.sol).
