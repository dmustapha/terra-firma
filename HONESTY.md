# Honesty ledger

Every "MUST NOT CLAIM" item in `INVARIANTS.md`, and where the product, docs and submission avoid it. Re-check with
the grep in the last column before any README, video or post ships. A hit that is not listed here as reviewed is a
defect.

## MUST NOT CLAIM → where it is avoided

| # | Must not claim | How we avoid it | Where (files) | Re-check |
|---|---|---|---|---|
| H1 | Any dividend-driven burn, yield or "live dividend beat" during judging | No dividend feature or copy exists; listed as feature-gated | `LIMITATIONS.md` ("Dividend-driven features"), `web/components/stake-view.tsx` (rewards described as fee-funded only) | `grep -rni dividend web/app web/components` → no hits |
| H2 | A projected APR or "earn X% on $WIF" headline | Stake page shows only real routed-fee rewards and states "No projected yield is shown: rewards depend only on real routed fees."; the only % on that page is the 0.3% trade-fee discount | `web/components/stake-view.tsx`, `web/components/proof-view.tsx` ("Live totals, no projections") | `grep -rniE "apr\b\|apy\|% (yield\|apr)" web/app web/components` → no hits |
| H3 | That geofencing is enforced onchain | Attestation dialog says "This check is a frontend control, not enforced onchain."; SECURITY.md "Not defended against" | `web/components/geo-gate.tsx`, `SECURITY.md`, `LIMITATIONS.md` ("Onchain geofencing") | `grep -rni "onchain geofenc\|geofence.*onchain" web` → only the negating copy |
| H4 | That the WIF/ETH pool hook is ours, audited or verified | Disclosed as third-party, owned by 0x263e…19Dd, unverified; /proof labels it only "Burn path: hooked WIF/ETH pool" with its address | `SECURITY.md` ("Third-party dependencies"), `web/components/proof-view.tsx` | `grep -rni "our hook\|audited hook\|verified hook" .` → no hits |
| H5 | That Hindsight covers buys paid in tokens other than ETH, WETH, USDG or the curated stocks | Such buys are listed under "Not priced (n)" with a reason (`paid in tokens, not priced`) and excluded from totals | `web/lib/hindsight.ts` (`payments`, `Card.unpriced`), `web/components/hindsight-card.tsx`, `LIMITATIONS.md` | `grep -n "not priced" web/lib/hindsight.ts web/components/hindsight-card.tsx` → present |
| H6 | "Audited", "zero risk", "guaranteed returns" | SECURITY.md opens with "unaudited"; the one "Guaranteed at least N {stock} or nothing happens" string in the convert panel is the contract-enforced min-out (revert otherwise), not a return guarantee — reviewed and kept | `SECURITY.md`, `web/components/convert-panel.tsx` (reviewed hit), `web/components/guarantee.tsx` (fixed copy about recomputability and Chainlink bounds, no return claim) | `grep -rniE "audited\|zero risk\|guaranteed return" web README.md` → only the negating SECURITY.md line |
| H7 | Any fork-only result (e.g. fork-test burns) as a mainnet event | Fork tests are always labelled "against a Robinhood Chain mainnet fork"; CLAIMS.md `fork-tests` row says "on a ... mainnet fork"; mainnet totals stay PENDING until real txs exist | `web/components/proof-view.tsx` (fork-test copy), `CLAIMS.md`, `SECURITY.md` ("that is a fork result, not a mainnet event") | `grep -rn "fork" web/components/proof-view.tsx` → every hit says fork |

## Proof-disclosure standard (PRD 7.6b)

| Rule | How it is met | Where |
|---|---|---|
| Every proof surface labels its network: "Robinhood Chain mainnet 4663" or "mainnet fork (block N, not onchain)" | Footer and connect dialog state mainnet 4663; fork-test row says mainnet fork; SECURITY.md names the fork block 111155803 | `web/app/layout.tsx`, `web/components/connect-button.tsx`, `web/components/proof-view.tsx`, `SECURITY.md` |
| Cached proof shows the block it was read at; live reads say "live" | Card carries `asOfBlock`; /proof marks pre-deploy rows "live after mainnet deploy" and reads totals from chain | `web/lib/hindsight.ts` (`Card.asOfBlock`), `web/components/proof-view.tsx` |
| No claim without a mainnet tx/address or a CLAIMS.md row re-derived by `scripts/verify-claims.ts` | CLAIMS.md rows are re-derived on every `pnpm check`; deployment-dependent rows stay PENDING until the deploy exists; `docs/pipeline/claims.json` is the machine ledger | `CLAIMS.md`, `scripts/verify-claims.ts`, `docs/pipeline/claims.json`, `package.json` (`check`) |
| Geofencing is interface-level only; Stock Token issuer/transfer restrictions must be reviewed before production use | Stated in the attestation dialog and SECURITY.md | `web/components/geo-gate.tsx`, `SECURITY.md` ("Not defended against") |
| The Jar is disclosed as pooled custody by an ownerless contract (withdraw any time; no admin path) | Stated in SECURITY.md Known weaknesses and the Jar contract NatSpec | `SECURITY.md`, `contracts/src/Jar.sol` |

## Team demo transactions

Demo-wallet transactions are made by the team (Dami's own wallet, small sizes, see `scripts/seed-demo.ts --dry`).
They are real mainnet transactions and are disclosed as team transactions wherever they are shown (SURVIVOR-9);
they are never presented as organic user volume.
