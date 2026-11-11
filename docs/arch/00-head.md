# Terra Firma — Architecture Document (single source of truth)

**Hackathon:** World is Flat (Robinhood Chain mainnet 4663) · **Version:** V1 (forge Phase 2, 2026-11-11)
**Inputs:** PRD.md (V1 + Phase 1.5 corrections), INVARIANTS.md, research/spike-*.md, warroom/WINNER-BRIEF.md (Thesis, canonical)
**How this document is built:** every code block below is the COMPLETE content of a real file in this repository, compiled and (for contracts) fork-tested on Robinhood Chain mainnet state before being embedded. `scripts/gen-architecture.py` regenerates this document from `docs/arch/*.md` prose + the source tree, so the document and the code cannot drift. A developer with zero context can rebuild the project by creating each file exactly as shown.

Verification tags: **[VERIFIED]** proven by a live mainnet probe or a passing fork test · **[UNVERIFIED]** pattern sourced but not yet exercised end to end (code carries a WARNING comment) · **[ASSUMED]** original logic with no external source (code carries a CAUTION comment and has a dedicated test).

---

## 1. System Overview

### Purpose
Turn Robinhood Chain memecoin activity into real stock ownership and make $WIF the token that earns from it: Hindsight card → one-tap convert into a real Stock Token Jar → every meme trade sweeps a slice into the Jar → 0.5% fee pool hourly splits into $WIF buy-and-burn and a real-stock stream to $WIF stakers.

### System Diagram
[VERIFIED] — diagram of the deployed topology (not code)
```
 Browser (Next.js 15, wagmi 2 / viem 2, chain `robinhood` 4663)                    GitHub Actions (cron :07)
   │  reads: public RPC (wallet + viem)        │ fetch /api/*                          │ scripts/keeper.ts
   ▼                                           ▼                                       ▼
 ┌───────────────────────────── Vercel (stateless) ─────────────────────────────┐   FeePool.distribute()
 │ /api/hindsight  web/lib/hindsight.ts ─┐                                      │        │
 │ /api/quote      web/lib/quote.ts ─────┼─► web/lib/rpc.ts ─► GetBlock FRA → NYC → public RPC (server-only secrets)
 │ /api/stream     SSE ◄─ GetBlock WSS logs (fallback: getLogs poll)            │
 │ /api/geo        x-vercel-ip-country + data/restricted.json                   │
 │ /api/health     feeds + FeePool balance                                      │
 │ data/: memes.json (registry) · rounds/*.json (Chainlink tables) · deployments.json
 └──────────────────────────────────────────────────────────────────────────────┘
                         │ user-signed txs (wallet)
                         ▼
 ┌──────────────────────── Robinhood Chain mainnet 4663 (ownerless, immutable) ────────────────────────┐
 │ TerraRouter ──encodes──► Universal Router 2.1 ──► Uniswap v2 / v3 / v4 pools (incl. third-party hooks)│
 │   │ fee (0.5% | 0.3% staker) ───────────────► FeePool ── 50% ─► v4 WIF/ETH (hook 0xE5e7…) ─► WIF.burn() │
 │   │ sweep / convert / deposit ─► stock ─► Jar (ledger)          └ 50% ─► stock per sub-pool ─► WifStaking
 │   │                                    ▲                                                    │ claim()
 │   └─ reads StockOracle (Chainlink 8dp, MAX_AGE 25h, band 3%) ─┘◄──────────── Jar.credit ◄─────┘
 │ HindsightLens.recompute(Buy[]) view · mintCard burns 1 $WIF        FriendJar (gated) ─► TerraRouter.deposit
 └──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Demo path through the system (what a judge sees → what proves it)
1. **Hindsight (verification first):** `/card/<real wallet>` → `web/lib/hindsight.ts` (logs + receipts + Chainlink round tables) → `/proof` recompute box → `HindsightLens.recompute` (onchain, same inputs; wrong round reverts `BadRound`). INVARIANT 8.
2. **Convert:** `TerraRouter.convert` → memes sold via Universal Router 2.1 → 0.5% fee to FeePool → stock bought with `max(user, Chainlink − 3%)` → `Jar.credit` (balance-backed) → `Converted` + `Credited(source=1)`.
3. **Trade with sweep:** `TerraRouter.buy/sell` → same-tx sweep into the Jar → `Swept`, `Traded`.
4. **$WIF consequence:** hourly `FeePool.distribute` → capped buy through the WIF/ETH hooked pool → `WIF.burn` (`Distributed.wifBurned`, supply delta) or `BurnSkipped` (ETH carried, user txs never affected); stock half → `WifStaking.notifyReward` → `claim()` → `Credited(source=3)`. Each epoch's burn links to the conversions/trades that funded it through FeePool's `Received`/`Traded.fee` events. Stakers with >= 10K active $WIF pay 0.3% (the holder path); everyone else's 0.5% funds the burn and stream.
5. **Security invariants kept explicit:** no owner/pause/upgrade anywhere; TerraRouter accepts typed Routes only; `WifNotSellable` is contract-enforced; a stake earns only from the epoch after it was placed (a full epoch boundary must pass) and unstaking waits 24h.

### Dependency direction (one-way)
`contracts/src/lib/URCodec.sol` (pure encoding) ← `StockOracle` (pure reads) ← `Jar` ← `WifStaking`/`FeePool`/`TerraRouter` ← `HindsightLens`/`FriendJar`. The deterministic core (`URCodec`, `StockOracle` math, `Jar` ledger) imports nothing that performs I/O beyond its immutable external reads. Off-chain: `web/lib/config.ts` + `abi.ts` (pure data) ← `rpc.ts` (only module doing network I/O) ← `rounds.ts`/`quote.ts` ← `hindsight.ts` ← `app/api/*` ← pages. Sponsor/external couplings are quarantined: Uniswap encoding only in `URCodec.sol` + `web/lib/quote.ts`; Chainlink only in `StockOracle.sol` + `web/lib/rounds.ts`; GetBlock only in `web/lib/rpc.ts` + `app/api/stream`; Quicknode only in `app/api/qn-jar`.

### Technology Stack
| Technology | Version | Purpose |
|---|---|---|
| Solidity | 0.8.26 (cancun, optimizer 200, via-IR) | contracts |
| Foundry | 1.4.4-stable | build, fork tests, deploy |
| OpenZeppelin Contracts | v5.1.0 | SafeERC20, ReentrancyGuard |
| Next.js | 15.5.29 (App Router, Turbopack) | frontend + API routes |
| React | 19.1.0 | UI |
| wagmi / viem | 2.19.5 / 2.57.17 (`robinhood` chain, id 4663, VERIFIED) | wallet + chain I/O |
| @tanstack/react-query | 5.107.1 | client data cache |
| Tailwind CSS | 4 | styling |
| tsx | 4 | scripts |
| Universal Router | 2.1 on RH (0x8876…0904) | all swaps |
| Chainlink Data Feeds | AggregatorV3 proxies, 8dp | pricing + bounds |
| GetBlock | shared hackathon RPC + WSS | primary RPC, live stream |
| Quicknode | Build plan endpoint (Stock Token API) | Jar cross-check badge |
| Vercel | Hobby | hosting (stateless) |
| GitHub Actions | cron | keeper |
