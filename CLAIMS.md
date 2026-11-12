# CLAIMS — every headline figure and where it comes from

`pnpm tsx scripts/verify-claims.ts` re-derives each `value` from its source and exits 1 on any mismatch.
Rows that depend on the mainnet deployment stay `PENDING` until `web/data/deployments.json` is live; a PENDING row is
skipped, never filled in by hand. Fill a value only by copying what the script prints as "derived".

| id | claim | value | source command |
|---|---|---|---|
| fork-tests | Fork tests passing on a Robinhood Chain mainnet fork | 62 | `grep "tests passed" evidence/forge-test.txt` (last summary line) |
| deployed-contracts | Terra Firma contracts deployed with code on mainnet 4663 | 7 | `eth_getCode` of each address in `web/data/deployments.json` |
| wif-burned | Total $WIF bought and burned by the FeePool | PENDING | `FeePool.totalWifBurned()` (cross-checked in `scripts/proof.ts` against WIF Transfer to 0x0) |
| nvda-fill-deviation | Fork-measured NVDA fill vs Chainlink-implied output | -0.04% | `grep "CL-implied" research/spike-fork.md` |
