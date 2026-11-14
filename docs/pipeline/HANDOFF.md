# HANDOFF

## Target commit
`git checkout 1728029` is the reviewed commit on `main` of https://github.com/dmustapha/terra-firma.

## Fresh-clone verify
```bash
git clone https://github.com/dmustapha/terra-firma.git && cd terra-firma
pnpm install && pnpm --dir web install
RPC_URL=https://rpc.mainnet.chain.robinhood.com pnpm verify-claims
pnpm --dir web test
```
Expected: `verify-claims` exits 0, and the web suite reports 142 passing tests. The 62 contract fork tests need a private RPC (`cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test`); their last recorded run is `evidence/forge-test.txt` (62 passed, 0 failed).

## Demo walkthrough
Follow "Try It" in [`submission/HACKATHON-README.md`](submission/HACKATHON-README.md).

## Do-not-modify (freeze list)
- `contracts/src/*.sol`: these are the deployed, source-verified contracts on Robinhood Chain 4663; changing them breaks the Sourcify match.
- `web/data/deployments.json` and `contracts/deployments/4663.json`: the live addresses the site and scripts read.
- `CLAIMS.md`, `scripts/verify-claims.ts` and `submission/proof.md`: the proof surface judges re-derive.
