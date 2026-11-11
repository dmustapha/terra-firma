# Phase 4.6 - Mock Leak Scan (Terra Firma)

Scope: contracts/test/*.sol, web/lib/*.test.ts, web/lib/*.integration.ts, scripts/*.live.ts. Read-only.

## Result: no mock leakage found. Counts: SECURITY-CRITICAL 0, HIGH 0, MEDIUM 2 (coverage gaps), LOW 2.

Grep for `vi.mock|jest.mock|vi.fn|vi.spyOn|vi.stubGlobal|msw|nock|fetch =|vm.mock|vm.etch|Mock` across all test tiers: zero hits.

## Findings
- Solidity (`TerraFirma.t.sol`, `HindsightLens.t.sol`, `URProbe.t.sol`): all use `vm.createSelectFork(RPC_URL, FORK_BLOCK=111155803)` against real RH mainnet state (real Universal Router, Chainlink feeds, WIF hook, Stock Tokens). Only cheatcodes: `vm.deal` (funding) and `vm.warp` (epoch/staleness). No `etch`/`store`/mock contracts. PASS.
- `web/lib/rounds.test.ts`: synthetic `RoundTable` (3 rounds) with a real feed address - pure-function unit test of `roundAt`/`normalize8`; real-data equivalent exists in `rounds.integration.ts` (committed mainnet tables). Acceptable.
- `web/lib/quote.test.ts`: hand-built `PoolEntry` with `ZERO` pool addresses for `routeFor`/`v3Path` encoding and "no RPC reached" guard tests. Pure encoding; the on-chain acceptance of these routes is covered by the forked TerraFirma tests. Acceptable.
- `web/lib/stock-paths.integration.ts`: compares TS constants to TerraConfig.sol (file parse, not on-chain). Real data, but static.
- `scripts/hindsight.live.ts`: real mainnet wallet, public RPC, asserts derived values (no hardcoded expected numbers). PASS.

## MEDIUM (coverage gaps where the real dependency IS available)
- [MK-1] No test of any `web/app/api/*` route handler (hindsight, card-check, quote, stream, qn-jar, health, geo). `GETBLOCK_RPC_*`, `GETBLOCK_WSS_FRA` and `RPC_URL` exist in `~/wif-hack/.env.local`, so a live route test is possible. Add `scripts/api.live.ts` hitting each route against a dev server (also exercises M-02 error paths).
- [MK-2] `/api/stream` (marked `[UNVERIFIED]`, route.ts:1) and `lib/hypersync.ts` ("UNVERIFIED PATTERN") have no live test. `GETBLOCK_WSS_FRA` is available so the stream can be verified for real; Envio cannot (`ENVIO_API_TOKEN` not in .env.local) - state it as unverified in submission claims. `/api/qn-jar` is likewise untested and currently dead because `.env.local` provides `QUICKNODE_BASE/QUICKNODE_TOKEN` not `QUICKNODE_RPC`.

## LOW
- Fork tests require `RPC_URL`; if unset in CI they error rather than skip, so CI cannot run Solidity tests without the secret (`.github/workflows/ci.yml` runs `forge build` only). Make this explicit in the proof docs.
- `web/lib/*.test.ts` include no negative test for `HindsightLens` provenance (see M-04 in security results); the forged-card path is only covered off-chain.
