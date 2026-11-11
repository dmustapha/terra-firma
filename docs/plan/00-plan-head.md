# Terra Firma — Implementation Plan

## 1. Plan Metadata
| Field | Value |
|---|---|
| Project | Terra Firma (World is Flat hackathon, Robinhood Chain mainnet 4663) |
| Architecture | `ARCHITECTURE.md` (generated from the real source tree by `scripts/gen-architecture.py`) |
| PRD | `PRD.md` · Law: `INVARIANTS.md` · Thesis: `warroom/WINNER-BRIEF.md ## Thesis` (canonical) |
| scope_mode | see `.forge-state.json` (canonical) |
| Clock | forge ends ~05:30 WAT 2026-11-11; core green on mainnet by 2026-11-11 23:59 WAT (OD7 gate); internal submit 2026-11-12 08:00 WAT; hard deadline 2026-11-12 17:30 UTC; live until 2026-11-16 17:30 UTC |
| Executor | hackathon-build (CAMPAIGN, hand-driven), Dami reviews at each phase gate |

### How to Use This Plan
1. Work phases in order; never start a phase until the previous phase gate checklist is fully ticked.
2. Every task names its ARCHITECTURE.md section; the code there is the code. If a file already exists (forge pre-built it), the task is to verify parity (`python3 scripts/gen-architecture.py` regenerates the doc from the tree) and run its test.
3. Commands are exact and run from `~/wif-hack/terra-firma` unless a `cd` is shown. Secrets come from `~/wif-hack/.env.local` (`set -a; source ../.env.local; set +a`).
4. At any risk point, follow the decision tree (DT-n) named in the task. Never fabricate: escalate per INVARIANTS.md "Escalate, don't fabricate".
5. Commit after each task with the exact message given (repo initialised in Phase 1, Task 1.0).

## 2. Phase Overview
| Phase | Purpose | Time (h) | Window (WAT) | Depends on |
|---|---|:---:|---|---|
| P0 | Forge-built foundation: verify contracts + core libs on fork (already written) | 0.5 | Nov 11 05:30–06:00 | forge |
| P1 | Repo, honesty scaffold (CLAIMS, verify-claims, SECURITY, evidence), domain guide, data builds | 1.5 | 06:00–07:30 | P0 |
| P2 | UI completion (pages already built) + local hero-flow run against a fork-deployed system | 2 | 07:30–09:30 | P1 |
| P3 | Mainnet deploy + verify + sync + Vercel + keeper | 2 | 09:30–11:30 (needs funded deployer) | P2 |
| P4 | Seed real demo state, first distribute with burn, proof | 2 | 11:30–13:30 | P3 |
| P5 | Depth adds on mainnet (stream, board, streak, report, Quicknode, HyperSync, card mint) + mobile pass | 5 | 13:30–18:30 | P4 gate |
| P6 | Core-green check (F-001..F-017), OD7 gate, FriendJar UI only if green | 3.5 | 18:30–22:00 | P5 |
| P7 | Livetest, design pass, interrogate, README/docs, package, demo video, submit (incl. 3h slack) | 10 | Nov 11 22:00 – Nov 12 08:00 | P6 |
| Total | | 26.5 | | |
### Hard cutoffs (peer review, adopted)
| Cutoff | Time (WAT) | Rule |
|---|---|---|
| Mainnet deploy | 2026-11-11 12:00 | if wallets unfunded → DT-8 escalation |
| Core green (OD7) | 2026-11-11 23:59 | depth adds only after P4 gate; DT-2 cut order applies |
| Feature freeze | 2026-11-12 04:00 | only fixes after this |
| Submit (internal) | 2026-11-12 08:00 | two hours earlier than first planned; buffer for approval lag + rehearsal |
| Absolute | 2026-11-12 16:30 (15:30 UTC) | submit whatever is live; 2h before the hard deadline |
Sleep/recovery buffer: 3h reserved inside P7 (P7 = 10h of which 3h is slack).

Build window available: Nov 11 05:30 → Nov 12 08:00 = 26.5h. Sum 26.5h ≤ 26.5h (METRIC 7 PASS; 3h slack inside P7, plus 10.5h between the 08:00 WAT internal submit and the 18:30 WAT (17:30 UTC) hard deadline).
