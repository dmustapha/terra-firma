# WIRE-RESULTS.md

status: complete

## What Just Happened
Wire mapped the 16 connections in Terra Firma and tested each one against real endpoints: GetBlock RPC and WebSocket, the public RPC that does wide log scans, Chainlink feeds, the Uniswap quoters, DexScreener and Vercel's geo header all answered live on mainnet. The money paths (router buys with sweep, convert, the $WIF burn through the hooked v4 pool, the keeper's distribute, Jar isolation) were proven on a fresh mainnet fork deployed with the real deployer key, so its addresses predict the mainnet ones. The most important result: the Hindsight card now correctly prices TerraRouter buys from real (fork) receipts, matching an independent recompute to the cent. That closes debug's DH-2 risk, the empty-card-after-demo-trade failure. verify_milestone runs the demo path on this same fork next.

## Honest Gaps
- No onchain integration has a mainnet transaction yet; every contract result above is FORK-only until Dami funds the deployer and keeper and build P3 deploys.
- Browser wallet signing (BT-5 network capture, DEV-001) is untested: no deployed UI, and Claude cannot import keys into Dami's wallet.
- Envio HyperSync and the Quicknode Stock Token cross-check were never called with a token; both routes run on their fallbacks (eth_getLogs; badge hidden).
- The keeper's 0.0002 ETH minimum means it will not distribute at demo trade sizes; the demo's first distribute must be manual (/proof) or the minimum lowered.
- A webpack `next build` would fail on the wagmi → x402 import chain; only the turbopack build is safe, which the repo's scripts use.
- The heavy-wallet card takes 12 s cold without HyperSync; the demo needs a pre-warm or a visible wait.
