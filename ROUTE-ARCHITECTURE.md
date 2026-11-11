# ROUTE-ARCHITECTURE — Terra Firma
Derived from USER-ONBOARDING.md (3 user classes → multi-page required). Next.js App Router.

## ROUTES
- / (landing) — R-7 opening beat: "Your memes, in real stock." live protocol counters from events, Connect wallet (primary), "or look up any wallet", "See a real card".
- /app — connected home: your Hindsight card + convert sheet; redirects to / if not connected.
- /app/convert — full-screen convert sheet on mobile (desktop uses a side sheet on /app).
- /trade — meme terminal: paste CA, buy/sell with sweep; trending registry list.
- /trade/[token] — deep link for a token (shareable from X).
- /jar — Jar balances (shares, USD), source history, withdraw.
- /stake — 6 sub-pools, stake/switch/unstake/withdraw/claim, epoch countdown, burn counter.
- /card/[addr] — read-only card for any wallet + OG image (`opengraph-image.tsx`), ends with "Connect to fix yours".
- /proof — separate judge/demo route: contracts, first-of-kind txs, totals, recompute box, run distribute, keeper last run, SECURITY.md link.
- /api/hindsight, /api/quote, /api/geo, /api/health — API routes (serverless).

## FIRST-CONTACT
- 30-sec legibility: "See what your memecoins cost you in NVDA. Fix it in one tap. Every trade after builds real stock and burns $WIF."
- money-shot: the Hindsight card (paid / today / in NVDA) for a real wallet, rendered on the landing via "See a real card" and as the OG image.
- liveness/cold-start: landing counters (WIF burned, stock streamed, Jars, routed trades) read live from contract events; demo wallet card available without connecting.
- honesty: `/proof` linked in the header and footer; "every number from mainnet or Chainlink" line under the counters; unpriced rows labelled; SECURITY.md disclosures linked.
- entry-funnel: single hero CTA "Connect wallet" → /app; secondary read-only lookup link → /card/[addr].
