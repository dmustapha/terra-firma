# VERIFY-RESULTS.md

status: complete

## What Just Happened
The milestone gate re-ran the evidence ledger and drove the demo script against a mainnet fork. It decided PROCEED to the mainnet deploy, with conditions. Every contract and API step of scenes 2–6 works on the fork:
- card pricing, recompute, and the 1-WIF card mint
- convert and withdraw
- a demo-size trade followed by a real $WIF burn
- stake and claim

So Terra Firma's thesis (memes into real stock, $WIF burned and streamed) holds end to end everywhere except the browser wallet. The gate also caught 2 real issues:
- Two build-time facts had gone stale. They were flipped to FAILED and replaced before proceeding.
- The planned 0.002 ETH demo trade sits exactly on the contract's distribute minimum, so the demo should use 0.003 ETH.

Deploy and livetest ride on this: they must reproduce these fork results on mainnet with real tx hashes.

## Honest Gaps
- Nothing is on mainnet; every onchain result here is FORK-only until Dami funds the deployer and keeper.
- The browser wallet-signing path (connect, convert, trade, stake, claim, withdraw from the UI) has never been executed; that is why P0 is 7/11 fully tested and not 11/11.
- Mobile layout at 360px (F-017) was not checked.
- mintCard has no automated fork test; it was proven once by hand on the fork (DH-12 → stress).
- Quicknode and Envio integrations remain untested for lack of tokens.
- The submission form on worldisflat.fun/build has not been drafted.
