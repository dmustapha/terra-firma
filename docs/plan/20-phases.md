## Phase P0: Forge-built foundation (verify)
Files in this phase were written and tested during forge Phase 2; tasks verify parity and tests.
{{FILES:P0}}
#### Task P0.T: Run the full fork suite
- Architecture: Section "Contract tests"
- Command: `cd contracts && set -a && source ../../.env.local && set +a && set -o pipefail && RPC_URL=$GETBLOCK_RPC_FRA forge test 2>&1 | grep -E 'PASS|FAIL|Suite|Ran' | tee ../evidence/forge-test.txt | tail -3`
- Expected: `38 tests passed, 0 failed` (3 suites) and the pipeline exit code is 0
- Decision tree: DT-7
- Commit: `test(contracts): 32 mainnet-fork tests green`

### Phase P0 Gate
- [ ] `forge build --sizes` shows every contract < 24,576 bytes runtime
- [ ] 38/38 fork tests pass (evidence/forge-test.txt)
- [ ] `cd web && npx tsc --noEmit` clean
- [ ] INVARIANTS.md NON-NEGOTIABLES 1–6 each map to a passing test

## Phase P1: Repo, honesty scaffold, data
#### Task P1.0: Initialise the repo
- Architecture: Section 1 File Structure
- Command: `cd ~/wif-hack/terra-firma && test -f .gitignore && git init -b main && git add -A && git commit -m "chore: terra firma forge output"` (`terra-firma/.gitignore` is created by forge: `.env*`, `node_modules/`, `.next/`, `out/`, `cache/`, `broadcast/`, `contracts/out/`, `contracts/cache/`, `contracts/broadcast/`, `contracts/deployments/4663.fork.json`, `.vercel/`)
- Expected: `git ls-files | grep -cE '^(node_modules|web/node_modules|.*/out|.*/cache|.*broadcast)/|(^|/)\.env($|\.)'` prints 0; `git grep -nE 'getblock\.io/[0-9a-f]{20}'` empty
- Commit: `chore: terra firma forge output`
#### Task P1.1: Domain knowledge file
- Architecture: Section N+1 (Domain Knowledge)
- Command: create `DOMAIN-GUIDE.md` from the Section N+1 table (concepts, rules, glossary, source mapping)
- Expected: every code identifier in the table exists (`for id in BAND_BPS MAX_AGE SCALED_THRESHOLD normalize8 scanBuys payments; do grep -rq $id contracts/src web/lib || echo MISSING $id; done` prints nothing)
- Commit: `docs: domain guide`
#### Task P1.2: Franchise skeleton (claims ledger, recompute verifier, SECURITY.md, honesty ledger)
- Architecture: Section "Security spec (for build's SECURITY.md)"; INVARIANTS.md VERIFY-BEFORE-CLAIMING
- Command: `pnpm tsx scripts/verify-claims.ts` (CLAIMS.md + verifier come from the scripts agent); create `SECURITY.md` with the exact spec shape; create `HONESTY.md` listing every MUST NOT CLAIM item and where the UI/README avoids it
- Expected: verify-claims exits 0 (PENDING rows skipped, none faked); SECURITY.md has `## Threat matrix` with 12 rows, `## Not defended against`, and <!-- [CRITIQUE E-4] --> `## Known weaknesses (our own)` listing every INVARIANTS critical-review survivor + accepted risk, plus a per-contract Blockscout verification status table; README links SECURITY.md above the fold
- Commit: `docs: claims ledger, security, honesty ledger`
#### Task P1.3: Build data files
- Architecture: Section "Generated artifacts"; Section N+9 step 3
- Command: `pnpm tsx scripts/build-registry.ts && pnpm tsx scripts/build-rounds.ts && pnpm tsx scripts/build-restricted.ts && node scripts/export-abis.mjs`
- Expected: memes.json has >= 15 memes with `tested:true`; rounds for 7 feeds (ETH/USD, USDG/USD, NVDA, TSLA, GOOGL, SNDK history, SPY, QQQ; deduped); restricted.json countries non-empty
- Decision tree: DT-13, DT-10
- Commit: `data: registry, chainlink round tables, restricted list`
#### Task P1.4: Seed demo script dry run + Hindsight payment test
- Architecture: Section "C10/C11 Scripts + keeper"
- Command: `pnpm tsx scripts/test-hindsight.ts && DEMO_KEY=0x$(openssl rand -hex 32) pnpm tsx scripts/seed-demo.ts --dry`
- Expected: test-hindsight prints 2 real WETH/USDG-paid tx hashes with detected payKind; seed dry-run prints planned txs with live quotes
- Commit: `test(scripts): hindsight payment detection + seed dry run`
{{FILES:P1}}

### Phase P1 Gate
- [ ] [C8] cumulative corrections applied: mainnet 4663, 1-seat vote, no dividend claims, UR 2.1 layout, GetBlock log cap, early-round scaling on all feeds (`grep -c "46630" PRD.md ARCHITECTURE.md` → only historical mentions)
- [ ] repo initialised, no secrets tracked: `git grep -nE 'getblock\.io/[0-9a-f]{20}|quiknode\.pro/[0-9a-f]{20}'` empty and `git grep -nE '(DEPLOYER|DEMO|KEEPER)_KEY=0x[0-9a-fA-F]{64}' -- ':!PLAN.md'` empty
- [ ] CLAIMS.md + scripts/verify-claims.ts + SECURITY.md + HONESTY.md exist (franchise skeleton at C0)
- [ ] data files built from chain; `cd web && npx tsc --noEmit` still clean

## Phase P2: UI completion + local hero flow on a fork deployment
{{FILES:P2}}
#### Task P2.3: Hardest-guarantee line + rubric map (critique E-1, E-2)
- Architecture: Section "C9 Frontend"; PRD §4.13 "Landing guarantee", §7.6 rubric map
- Command: add the guarantee line + "Recompute this card" link to `web/app/page.tsx` and `web/components/hindsight-card.tsx`; add the three rubric cards at the top of `web/components/proof-view.tsx`; then `cd web && npx tsc --noEmit && pnpm build`
- Expected: build clean; `curl -s localhost:3000/ | grep -c recomputable` → 1; /proof shows 3 rubric cards each with >= 1 live link
- Commit: `feat(web): hardest-guarantee line + rubric map (critique E-1/E-2)`
#### Task P2.1: Local fork deployment for UI testing
- Architecture: Section N+9 (Deployment Sequence), steps 1 and 3 against anvil
- Command: `(anvil --fork-url $GETBLOCK_RPC_FRA --chain-id 4663 --port 8545 > /tmp/anvil.log 2>&1 &) && until cast block-number --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1; do sleep 1; done && cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast && mv deployments/4663.json deployments/4663.fork.json && cd ..` (the fork file is gitignored and never synced; `test ! -f contracts/deployments/4663.json` must hold after this task) (anvil default key 0 — a public test key, never funded on mainnet; kill anvil when done: `lsof -ti:8545 | xargs kill`)
- Expected: 7 addresses printed; NOT synced into web/data (mainnet-only file)
- Commit: `git commit --allow-empty -m "chore(milestone): fork deployment for UI testing"`
#### Task P2.2: Hero flow run (local)
- Architecture: Section "C9 Frontend"
- Command: `cd web && NEXT_PUBLIC_RPC_OVERRIDE=http://127.0.0.1:8545 pnpm dev` then walk F1→F3→F5→F4 in Chrome with an anvil account (wallet RPC = localhost)
- Expected: card renders for a real mainnet wallet; convert/buy/stake succeed against the fork contracts
- Decision tree: DT-5, DT-15
- Commit: `feat(web): hero flow verified on fork`

### Phase P2 Gate
- [ ] `cd web && npx tsc --noEmit && pnpm build` clean
- [ ] every route in ROUTE-ARCHITECTURE.md renders with deployed:false (read-only) and with the fork deployment
- [ ] no client bundle contains "getblock.io" (`grep -r getblock .next/static || echo clean` → clean)
- [ ] anvil and dev server killed

## Phase P3: Mainnet deploy, verify, host, keeper
#### Task P3.1: Fund the deployer + keeper (Dami; 0.003 ETH total plan)
- Architecture: Section N+6 Credentials Needed
- Command: Dami bridges ~8 USDT from BSC to ETH on Robinhood Chain into HIS OWN wallet (Relay / LI.FI), then sends 0.0008 ETH to DEPLOYER `0xA39258b9cac4f9c6Ea444b229210839d12953166` and 0.0004 ETH to KEEPER `0x77ac4bD2e09eF0A7416E1a61d319ff9f4f5194BD`; he keeps ~0.0018 ETH to act as the demo user himself (Claude never executes trades or transfers). Keys already generated in `~/wif-hack/.env.local` (DEPLOYER_KEY/DEPLOYER, KEEPER_KEY/KEEPER, RPC_URL; DEMO_* unused)
- Expected: `set -a; source ../.env.local; set +a; cast chain-id --rpc-url $RPC_URL` → 4663; `cast balance $DEPLOYER --rpc-url $RPC_URL` >= 800000000000000; `cast balance $KEEPER --rpc-url $RPC_URL` >= 400000000000000
- Decision tree: DT-8
- Commit: `git commit --allow-empty -m "chore(milestone): deployer + keeper funded (keys in .env.local, never committed)"`
#### Task P3.2: Deploy
- Architecture: Section N+9 step 1
- Command: `cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --slow`
- Expected: deployments/4663.json with 7 addresses, each with code on the PUBLIC mainnet RPC: `for a in $(jq -r '.StockOracle,.Jar,.WifStaking,.FeePool,.TerraRouter,.HindsightLens,.FriendJar' deployments/4663.json); do [ "$(cast code $a --rpc-url https://rpc.mainnet.chain.robinhood.com)" != "0x" ] || echo FAKE $a; done` prints nothing
- Decision tree: DT-8, DT-3
- Commit: `deploy: terra firma on robinhood chain mainnet 4663`
#### Task P3.3: Verify on Blockscout
- Architecture: Section N+9 step 2
- Command: for each contract `forge verify-contract $ADDR src/<Name>.sol:<Name> --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/ --compiler-version 0.8.26 --num-of-optimizations 200 --via-ir --guess-constructor-args --watch` (constructor args are read from the creation tx; if guessing fails, pass `--constructor-args $(cast abi-encode "constructor(...)" ...)` using the values in contracts/script/TerraConfig.sol `deployAll`)
- Expected: each contract page on https://robinhoodchain.blockscout.com/address/$ADDR shows "Contract source code verified" (Blockscout's API is Cloudflare-gated for curl; check in the browser). If verification fails twice: publish the source + Standard JSON input (`forge verify-contract --show-standard-json-input`) in the repo and link it from /proof (DT-3 style disclosure)
- Commit: `chore: verify contracts on blockscout`
#### Task P3.4: Sync + host
- Architecture: Section N+9 steps 3–4
- Command: `node scripts/sync-deployments.mjs && pnpm tsx scripts/build-rounds.ts --update && cd web && vercel link --yes --project terra-firma && for V in GETBLOCK_RPC_FRA GETBLOCK_RPC_NYC GETBLOCK_WSS_FRA; do printf %s "${!V}" | vercel env add $V production; done && printf %s "$DEMO_ADDR" | vercel env add NEXT_PUBLIC_DEMO_ADDR production && vercel deploy --prod --yes` (run in bash for `${!V}`; requires a prior `vercel login` by Dami)
- Expected: `vercel env ls production | grep -c GETBLOCK` → 3; `curl -s $URL/api/health | jq '.rpc,.deployed'` → "ok", true
- Commit: `deploy(web): live on vercel`
#### Task P3.5: Keeper live
- Architecture: Section N+9 step 5; Section "C10/C11 Scripts + keeper"
- Command: `cast wallet new` (a DISTINCT keeper key; Dami funds ~0.001 ETH only) then `gh repo create terra-firma --private --source . --push && gh secret set RPC_URL --body "$RPC_URL" && gh secret set KEEPER_KEY --body "$KEEPER_KEY" && gh workflow run keeper.yml`; README states that anyone can call `FeePool.distribute()` from /proof if the keeper stops
- Expected: `gh secret list` shows RPC_URL and KEEPER_KEY; run log prints "skip" or a distribute tx; the daily rounds refresh is followed by `vercel deploy --prod` from the workflow (VERCEL_TOKEN secret) or by a manual redeploy each morning until 2026-11-16
- Decision tree: DT-12
- Commit: `ci: hourly keeper`

### Phase P3 Gate
- [ ] hackathon-interrogate (contracts scope) PASS BEFORE Task P3.2 (a post-deploy contract fix would wipe seeded state and verifications)
- [ ] 7 contracts deployed + verified; deployments synced; `/api/health` ok
- [ ] keeper workflow green
- [ ] no secret in git history (`git log -p | grep -c getblock.io/` → 0)

## Phase P4: Real demo state + proof
#### Task P4.1: Seed real demo state (Dami's own wallet, minimal spend)
- Architecture: Section N+9 step 6; PRD §6 seed table
- Command: Dami, in the live app with his own wallet: (1) buy ~0.0003 ETH of 2 registry memes in /trade with sweep 0 (gives his card history if he holds no RH memes yet); (2) one /trade buy of ~0.0003 ETH with 2% sweep; (3) /app convert one meme to NVDA; (4) buy ~150 $WIF in /trade and stake it on /stake (NVDA pool). Claude prints exact amounts and checks each tx; `scripts/seed-demo.ts --dry` prints the same plan with live quotes
- Expected: tx hashes for buys, a sweep, a convert, a stake; FeePool balance >= 0.00001 ETH (MIN_DISTRIBUTE_ETH)
- Decision tree: DT-7, DT-17
- Commit: `git commit --allow-empty -m "chore(milestone): real demo state seeded by Dami's wallet"`
#### Task P4.2: First distribute with burn, then claim
- Architecture: Section N+9 step 7
- Command: after the next epoch boundary `gh workflow run keeper.yml`; then from the demo wallet `cast send $STAKING "claim()" --private-key $DEMO_KEY --rpc-url $RPC_URL` in the epoch after the stake activated
- Expected: `Distributed.wifBurned > 0`; `Claimed` event; Jar reward credit
- Decision tree: DT-1, DT-4
- Commit: `git commit --allow-empty -m "chore(milestone): first distribute with burn + first claim on mainnet"`
#### Task P4.3: Proof + claims
- Architecture: Section N+9 step 8; INVARIANTS VERIFY-BEFORE-CLAIMING
- Command: `pnpm tsx scripts/proof.ts && pnpm tsx scripts/verify-claims.ts`
- Expected: proof.md lists 7 contracts + 4 first-of-kind txs; verify-claims exit 0 with no PENDING rows left for deployed facts
- Commit: `docs: mainnet proof + verified claims`

### Phase P4 Gate
- [ ] F-001..F-011 observable on mainnet (FEATURE-OBSERVABLES.md commands pass)
- [ ] /proof shows real first-of-kind txs; recompute box matches for DEMO_ADDR (DT-6)

## Phase P5: Depth adds live + mobile
Entry rule (peer review, adopted): no P5 task starts until the Phase P4 gate is fully ticked on mainnet.
{{FILES:P5}}
#### Task P5.0: Enable HyperSync (Dami's Envio token)
- Architecture: Section "C7 Hindsight Indexer" (web/lib/hypersync.ts); Section N+6 ENVIO_API_TOKEN
- Command: `vercel env add ENVIO_API_TOKEN production && vercel deploy --prod && time curl -s "$URL/api/hindsight?addr=0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E" | jq '.memes|length'`
- Expected: same card as the public-RPC path (1 meme, AI, 81 buys) in < 3s; Vercel logs show no `hypersync: fallback`
- Decision tree: DT-5
- Commit: `feat(hindsight): envio hypersync provider`
#### Task P5.1: Quicknode badge
- Architecture: Section "C13 Live Stream + ops API" (qn-jar)
- Command: `vercel env add QUICKNODE_RPC production && vercel deploy --prod && curl -s "$URL/api/qn-jar?addr=$JAR"`
- Expected: `{"agreement":true,...}` or badge hidden with reason logged
- Decision tree: DT-16
- Commit: `feat: quicknode-verified jar badge`
#### Task P5.2: Mint a real card + board rows
- Architecture: Section "C6 HindsightLens"
- Command: from the demo wallet in the UI: Mint this card (approve 1 WIF + mintCard)
- Expected: `CardMinted` event; /board "biggest regret" lists it; WIF totalSupply − 1e18
- Commit: `git commit --allow-empty -m "chore(milestone): first card minted onchain"`
#### Task P5.3: Mobile pass
- Architecture: PRD §4.17
- Command: Chrome DevTools emulation iPhone 14 + Pixel 7 on all routes; real phone via MetaMask in-app browser
- Expected: no horizontal scroll; tap targets >= 44px; hero flow completes
- Decision tree: DT-15
- Commit: `fix(web): mobile pass`

### Phase P5 Gate
- [ ] F-018..F-026 observable on mainnet (or explicitly cut per DT-2 with SUBMISSION_STATUS.md reason)
- [ ] /api/stream emits a `traded` event within 10s of a live trade

## Phase P6: Core-green check + OD7 gate
#### Task P6.1: Core-green audit
- Architecture: PRD §7.7 F-001..F-017
- Command: run every FEATURE-OBSERVABLES.md command for F-001..F-017 against mainnet
- Expected: all pass by 2026-11-11 23:59 WAT
- Decision tree: DT-2
- Commit: `chore: core green on mainnet`
#### Task P6.2: Friend Jars (only if P6.1 green before 23:59 WAT)
- Architecture: Section "C12 FriendJar"
- Command: `vercel env add NEXT_PUBLIC_FRIEND_JARS production` (value 1) `&& vercel deploy --prod`; create a group + 2 contributions + 1 exit on mainnet
- Expected: JarCreated/Contributed/Exited events
- Commit: `feat: friend jars (gate passed)`

### Phase P6 Gate
- [ ] OD7 decision recorded in SUBMISSION_STATUS.md with timestamp (passed/failed)

## Phase P7: Quality, story, submission
#### Task P7.1: livetest + design + interrogate
- Architecture: whole document
- Command: run skills in order: hackathon-livetest → design (generate) → design-forge → hackathon-interrogate → hackathon-verify (preflight)
- Expected: each skill's gate PASS; fixes committed
- Commit: `git commit -am "fix: livetest + design + interrogate findings"` (one commit per skill run, same prefix)
#### Task P7.4: Robinhood Chain Regret Index snapshot (one-off, block-numbered)
- Architecture: Section "C7 Hindsight Indexer"
- Command: for the top 20 holders of the 5 largest registry memes (cap: must finish in < 20 min; `time` it) (from Transfer logs), call `/api/hindsight?addr=…` sequentially (5-min cache), sum `usdPaid8`/`usdToday8`/`usdCounterfactual8`, write `submission/regret-index.md` stating the block number and wallet count
- Expected: one table with totals + block number; every wallet's card reproducible via /card/[addr]
- Commit: `docs: robinhood chain regret index snapshot (block N)`
#### Task P7.2: README + docs + package
- Architecture: Section N+2 (Submission Directory)
- Command: deploy-to-github (README, screenshots) → hackathon-package (submission bundle) owner skills
- Expected: README with Proof, Core Invariants (codes from INVARIANTS.md), Documentation Suite, the Regret Index block number; then `git log -p | grep -cE 'getblock\.io/[0-9a-f]{20}'` → 0 and `gh repo edit --visibility public --accept-visibility-change-consequences` (AI judges must run the README)
- Commit: `docs: readme + submission package`
#### Task P7.3: Demo video + submit + ship thread
- Architecture: PRD §6
- Demo order (AMEND-1 primary flow first; peer diff-3 adapted): Connect the funded demo wallet → its own card → convert → trade with sweep (+ Run distribute burn) → stake/claim; the real long-history wallet `/card/0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E` appears only as a 10s secondary-lookup contrast shot after connecting (numbers re-read live; forge measured $15,314.80 → $2.28 → $14,798.24)
- Command: hackathon-demo (video < 3 min) → submit on worldisflat.fun/build (Dami signs in) → personal-tweeter ship thread (Dami approves)
- Expected: submission receipt by 2026-11-12 08:00 WAT
- Decision tree: DT-11
- Commit: `chore: submitted`

### Phase P7 Gate
- [ ] [C3] README/submission state the uncontested lane with evidence (0 of ~49 entrants convert meme activity into owned stock; research/roster-audit/strategy-density.md)
- [ ] [C5][C9] README opens with the real problem and a real card (the Regret Index snapshot + one live /card link), not a hypothetical
- [ ] [C13] day-1 users: any Robinhood Chain meme wallet can open its card without connecting (verify 3 random registry holders via /card/[addr])
- [ ] [C15] no self-duplication: README positions Terra Firma against built-projects.md (no overlap with leash or other shipped projects)
- [ ] [C1][PH-3] all 4 load-bearing mechanisms + safety layer live on mainnet (F-001..F-011 observables)
- [ ] submission receipt; video link; README links live URL + contracts
- [ ] keeper + host healthy; schedule a check each day until 2026-11-16 17:30 UTC
