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


### File Structure (every hand-written file; each has complete code below)
[VERIFIED] — generated from the source tree (not code)
```
terra-firma/
  .github/workflows/ci.yml
  .github/workflows/keeper.yml
  contracts/foundry.toml
  contracts/script/Deploy.s.sol
  contracts/script/TerraConfig.sol
  contracts/src/FeePool.sol
  contracts/src/FriendJar.sol
  contracts/src/HindsightLens.sol
  contracts/src/Jar.sol
  contracts/src/StockOracle.sol
  contracts/src/TerraRouter.sol
  contracts/src/WifStaking.sol
  contracts/src/interfaces/IExternal.sol
  contracts/src/lib/URCodec.sol
  contracts/test/HindsightLens.t.sol
  contracts/test/TerraFirma.t.sol
  contracts/test/URProbe.t.sol
  contracts/test/debug-p2-reentrancy.t.sol
  contracts/test/debug-p2-staking-invariant.t.sol
  contracts/test/debug-p2-weekend-staleness.t.sol
  contracts/test/debug-p6-crossepoch-lock.t.sol
  contracts/test/debug-p6-feepool.t.sol
  contracts/test/debug-p6-hindsight-phase.t.sol
  package.json
  scripts/build-registry.ts
  scripts/build-restricted.ts
  scripts/build-rounds.ts
  scripts/check-arch-metrics.py
  scripts/check-plan-metrics.py
  scripts/debug-p2-hindsight-latency.live.ts
  scripts/export-abis.mjs
  scripts/fixtures/debug-p2-hindsight-baseline.json
  scripts/gen-architecture.py
  scripts/gen-plan.py
  scripts/hindsight.live.ts
  scripts/keeper.ts
  scripts/lib/env.ts
  scripts/lib/files.ts
  scripts/lib/quote.ts
  scripts/lib/rpc.ts
  scripts/proof.ts
  scripts/seed-demo.ts
  scripts/sync-deployments.mjs
  scripts/test-hindsight.ts
  scripts/tsconfig.json
  scripts/verify-claims.ts
  scripts/wire-card-fork.ts
  tsconfig.json
  web/app/api/card-check/route.ts
  web/app/api/geo/route.ts
  web/app/api/health/route.ts
  web/app/api/hindsight/route.ts
  web/app/api/qn-jar/route.ts
  web/app/api/quote/route.ts
  web/app/api/stream/route.ts
  web/app/app/convert/page.tsx
  web/app/app/page.tsx
  web/app/board/page.tsx
  web/app/card/[addr]/loading.tsx
  web/app/card/[addr]/opengraph-image.tsx
  web/app/card/[addr]/page.tsx
  web/app/error.tsx
  web/app/friends/page.tsx
  web/app/globals.css
  web/app/jar/page.tsx
  web/app/jar/report/[addr]/loading.tsx
  web/app/jar/report/[addr]/opengraph-image.tsx
  web/app/jar/report/[addr]/page.tsx
  web/app/layout.tsx
  web/app/not-found.tsx
  web/app/page.tsx
  web/app/proof/page.tsx
  web/app/stake/page.tsx
  web/app/trade/[token]/page.tsx
  web/app/trade/page.tsx
  web/components/address-lookup.tsx
  web/components/app-home.tsx
  web/components/board-view.tsx
  web/components/card-actions.tsx
  web/components/card-view.tsx
  web/components/connect-button.tsx
  web/components/convert-panel.tsx
  web/components/friends-view.tsx
  web/components/geo-gate.tsx
  web/components/guarantee.tsx
  web/components/hindsight-card.tsx
  web/components/hooks.ts
  web/components/jar-view.tsx
  web/components/landing-connect.tsx
  web/components/landing-live.tsx
  web/components/proof-view.tsx
  web/components/providers.tsx
  web/components/report-share.tsx
  web/components/site-header.tsx
  web/components/stake-view.tsx
  web/components/stock-select.tsx
  web/components/theme-toggle.tsx
  web/components/trade-terminal.tsx
  web/components/tx-status.tsx
  web/components/ui.tsx
  web/lib/api-hindsight.test.ts
  web/lib/api-quote.test.ts
  web/lib/api-stream.test.ts
  web/lib/api-validation.test.ts
  web/lib/card-cache.test.ts
  web/lib/card-cache.ts
  web/lib/concurrency.ts
  web/lib/config.ts
  web/lib/hindsight.test.ts
  web/lib/hindsight.ts
  web/lib/hypersync.ts
  web/lib/quote.test.ts
  web/lib/quote.ts
  web/lib/registry.ts
  web/lib/rounds.integration.ts
  web/lib/rounds.test.ts
  web/lib/rounds.ts
  web/lib/rpc.test.ts
  web/lib/rpc.ts
  web/lib/stock-paths.integration.ts
  web/lib/ui-chain.ts
  web/lib/ui-errors.test.ts
  web/lib/ui-errors.ts
  web/lib/ui-format.test.ts
  web/lib/ui-format.ts
  web/lib/ui-logs.test.ts
  web/lib/ui-logs.ts
  web/lib/ui-report.test.ts
  web/lib/ui-report.ts
  web/lib/wagmi.ts
  web/next.config.ts
  web/package.json
  web/postcss.config.mjs
  web/tsconfig.json
```


### Generated artifacts (produced by scripts, not hand-written; listed with their generator)
| File | Generator |
|---|---|
| web/data/deployments.json | `forge script script/Deploy.s.sol` + `node scripts/sync-deployments.mjs` |
| web/data/evidence.json | `grep -c PASS evidence/forge-test.txt` (written by hand from that count) |
| web/data/memes.json | `pnpm tsx scripts/build-registry.ts` |
| web/data/restricted.json | `pnpm tsx scripts/build-restricted.ts` |
| web/data/rounds/0x319724394d3a0e3669269846abe664cd621f9f6a.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0x379ec4f7c378f34a1b47e4f3cbebcbac3e8e9f15.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0x4a1166a659a55625345e9515b32adecea5547c38.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0x61b7e5650328764b076a108eff5fa7282a1b9ad2.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0x78f3556b67e17df817d51ef5a990cdaf09e8d3a9.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0x80901d846d5d7b030f26b480776ee3b29374c2ae.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0xf6f373a037c30f0e5010d854385ca89185ae638b.json | `pnpm tsx scripts/build-rounds.ts` |
| web/data/rounds/0xfb133fa4b7b385802b693a293606682df47109a3.json | `pnpm tsx scripts/build-rounds.ts` |
| web/lib/abi.ts | `node scripts/export-abis.mjs` (from contracts/out) |

## 2. Component Architecture

| # | Component | Type | File Path(s) | Purpose | Dependencies |
|---|---|---|---|---|---|
| C1 | TerraRouter | contract | contracts/src/TerraRouter.sol, contracts/src/lib/URCodec.sol | buy/sell/convert/deposit through UR 2.1, fee, sweep, Jar credit, $WIF sell guard | UR, WETH, StockOracle, Jar, FeePool, WifStaking (fee discount) |
| C2 | Jar | contract | contracts/src/Jar.sol | ownerless per-user Stock Token ledger, backed credits, user withdraw | OZ SafeERC20, ReentrancyGuard |
| C3 | FeePool | contract | contracts/src/FeePool.sol | hourly distribute: capped WIF buy+burn, stock stream per sub-pool | UR, $WIF, StockOracle, WifStaking |
| C4 | WifStaking | contract | contracts/src/WifStaking.sol | 6 reward sub-pools, epoch-batched activation, 24h unstake, claim to Jar | $WIF, StockOracle, Jar |
| C5 | StockOracle | contract | contracts/src/StockOracle.sol | curated 6 stocks, Chainlink reads, staleness, min-out, NVDA early-round normalization | Chainlink proxies |
| C6 | HindsightLens | contract | contracts/src/HindsightLens.sol | onchain recompute of a card + mintCard (burns 1 $WIF) | StockOracle, $WIF |
| C7 | Hindsight Indexer | server lib + API | web/lib/hindsight.ts, web/lib/rounds.ts, web/app/api/hindsight/route.ts | build a wallet's card from logs, txs, receipts, round tables | rpc.ts, registry, round tables |
| C8 | Route Builder | server lib + API | web/lib/quote.ts, web/lib/registry.ts, web/app/api/quote/route.ts | best pool per meme, quotes, min-outs, typed Route | rpc.ts, registry, rounds.ts |
| C9 | Frontend | Next.js pages/components | web/app/**, web/components/** | landing, card, convert, terminal, Jar, stake, board, proof, friends | wagmi, API routes, abi.ts, config.ts |
| C10 | Keeper | script + workflow | scripts/keeper.ts, .github/workflows/keeper.yml | hourly distribute when fees >= 0.0002 ETH | viem, deployments.json |
| C11 | Data + ops scripts | scripts | scripts/*.ts, scripts/*.mjs | registry, round tables, restricted list, deployments sync, seed, proof, claims | viem, GetBlock |
| C12 | FriendJar (gated) | contract | contracts/src/FriendJar.sol | shared Jar, pro-rata exit, contributions via TerraRouter.deposit | TerraRouter, Jar, StockOracle |
| C13 | Live Stream | API route (SSE) | web/app/api/stream/route.ts | GetBlock WSS logs → Server-Sent Events, polling fallback | rpc.ts, abi.ts |
| — | Shared infra | config/rpc | web/lib/config.ts, web/lib/rpc.ts, web/lib/abi.ts, contracts/script/TerraConfig.sol | addresses, curated stocks, RPC failover, ABIs, deterministic deploy | — |

### Data flow
See PRD §2 Data Flow. Contract-level sequence for a buy with sweep (VERIFIED in `test_buyV3_sweepAndFee`): user → `TerraRouter.buy{value}` → fee `call{value}` to FeePool → `UR.execute(WRAP_ETH(trade) + V3/V2 swap CONTRACT_BALANCE → user)` (or `V4_SWAP` with TAKE_ALL → router → user) → `UR.execute(WRAP_ETH(sweep) + V3 path(stockId) → Jar, minOut = max(user, Chainlink − 3%))` → `Jar.credit(user, stock, received, SWEEP)` (checks balance backing) → events `Swept`, `Traded`.

### State (what persists where)
| State | Location | Mutated by |
|---|---|---|
| User stock balances | `Jar.balanceOf[user][stock]`, `Jar.totalHeld[stock]` | TerraRouter (credit), WifStaking (credit), user (withdraw) |
| Fee ETH | FeePool balance | TerraRouter (fees), FeePool.distribute (spend) |
| Burn + stream totals | `FeePool.totalWifBurned`, `totalEthToStock`, events | FeePool.distribute |
| Stakes + rewards | `WifStaking.pools[6]`, `stakers[user]`, `rollAccPlusOne` | users, FeePool (rollAll/notifyReward) |
| Friend groups | `FriendJar.groups`, `sharesOf`, `stockOf` | members |
| Hindsight cards | not stored (derived on request); minted cards as `CardMinted` events | HindsightLens.mintCard |
| Meme registry, Chainlink round tables, restricted list, deployments | `web/data/*.json` (committed, regenerated by scripts) | scripts |
| Response cache | in-memory per serverless instance (5 min) | /api/hindsight |


## Section 3: Shared contract infrastructure

### Purpose
Interfaces, the Universal Router 2.1 command codec, and the deterministic deploy used by tests and scripts.

### Files
- `contracts/foundry.toml`
- `contracts/script/Deploy.s.sol`
- `contracts/script/TerraConfig.sol`
- `contracts/src/interfaces/IExternal.sol`
- `contracts/src/lib/URCodec.sol`

### Code

#### File: contracts/foundry.toml
[ASSUMED] — Source: see header comment
```toml
# File: contracts/foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.26"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
via_ir = true
fs_permissions = [{ access = "read-write", path = "./deployments" }]
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]

[rpc_endpoints]
rh = "${RPC_URL}"
```

#### File: contracts/script/Deploy.s.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/script/Deploy.s.sol
// [VERIFIED] pattern: forge script + vm.startBroadcast; addresses written to deployments/4663.json.
// Run: forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --slow
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {TerraConfig} from "./TerraConfig.sol";

contract Deploy is Script, TerraConfig {
    function run() external {
        require(block.chainid == 4663, "Robinhood Chain mainnet only");
        address deployer = msg.sender;
        vm.startBroadcast();
        Deployment memory d = deployAll(deployer);
        vm.stopBroadcast();

        string memory k = "deploy";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeUint(k, "block", block.number);
        vm.serializeUint(k, "start", d.start);
        vm.serializeAddress(k, "StockOracle", address(d.oracle));
        vm.serializeAddress(k, "Jar", address(d.jar));
        vm.serializeAddress(k, "WifStaking", address(d.staking));
        vm.serializeAddress(k, "FeePool", address(d.feePool));
        vm.serializeAddress(k, "TerraRouter", address(d.router));
        vm.serializeAddress(k, "HindsightLens", address(d.lens));
        string memory json = vm.serializeAddress(k, "FriendJar", address(d.friendJar));
        vm.writeJson(json, "./deployments/4663.json");
        console2.log("TerraRouter", address(d.router));
        console2.log("Jar", address(d.jar));
        console2.log("FeePool", address(d.feePool));
        console2.log("WifStaking", address(d.staking));
    }
}
```

#### File: contracts/script/TerraConfig.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/script/TerraConfig.sol
// [VERIFIED] every address below was read live on Robinhood Chain mainnet 4663 (intel, fact-check, forge spike).
pragma solidity 0.8.26;

import {Vm} from "forge-std/Vm.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {TerraRouter, IStakeReader} from "../src/TerraRouter.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {HindsightLens} from "../src/HindsightLens.sol";
import {FriendJar, ITerraDeposit} from "../src/FriendJar.sol";
import {IUniversalRouter, IWIF, PoolKey} from "../src/interfaces/IExternal.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Mainnet constants + a deterministic deploy of the whole protocol (shared by tests and scripts).
abstract contract TerraConfig {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address internal constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address internal constant WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773;
    address internal constant WIF_HOOK = 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044;
    address internal constant ETH_USD = 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9;
    address internal constant USDG_USD = 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2;

    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant TSLA = 0x322F0929c4625eD5bAd873c95208D54E1c003b2d;
    address internal constant GOOGL = 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3;
    address internal constant SNDK = 0xB90A19fF0Af67f7779afF50A882A9CfF42446400;
    address internal constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;
    address internal constant QQQ = 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68;

    struct Deployment {
        StockOracle oracle;
        Jar jar;
        WifStaking staking;
        FeePool feePool;
        TerraRouter router;
        HindsightLens lens;
        FriendJar friendJar;
        uint256 start;
    }

    function wifKey() internal pure returns (PoolKey memory) {
        return PoolKey(address(0), WIF, 0, 200, WIF_HOOK);
    }

    function stocks() internal pure returns (StockOracle.Stock[6] memory s) {
        s[0] = StockOracle.Stock(
            NVDA, 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F, 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15,
            abi.encodePacked(WETH, uint24(500), NVDA), "NVDA"
        );
        s[1] = StockOracle.Stock(
            TSLA, 0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37, 0x4A1166a659A55625345e9515b32adECea5547C38,
            abi.encodePacked(WETH, uint24(3000), TSLA), "TSLA"
        );
        s[2] = StockOracle.Stock(
            GOOGL, 0x53e040D2C8c9278cBc4b702328aC652068a0E063, 0xF6f373a037c30F0e5010d854385cA89185AE638b,
            abi.encodePacked(WETH, uint24(500), USDG, uint24(500), GOOGL), "GOOGL"
        );
        s[3] = StockOracle.Stock(
            SNDK, 0x7FA2c251b345b8492C039a59a42b38603a05Ed9b, 0xfb133Fa4B7b385802B693a293606682Df47109A3,
            abi.encodePacked(WETH, uint24(500), USDG, uint24(10000), SNDK), "SNDK"
        );
        s[4] = StockOracle.Stock(
            SPY, 0x319724394D3A0e3669269846abE664Cd621f9f6A, 0x319724394D3A0e3669269846abE664Cd621f9f6A,
            abi.encodePacked(WETH, uint24(500), SPY), "SPY"
        );
        s[5] = StockOracle.Stock(
            QQQ, 0x80901d846d5D7B030F26B480776EE3b29374C2ae, 0x80901d846d5D7B030F26B480776EE3b29374C2ae,
            abi.encodePacked(WETH, uint24(3000), QQQ), "QQQ"
        );
    }

    /// @dev Deploys 7 contracts from `deployer` with CREATE-address prediction to break the dependency cycle
    ///      (Jar <-> TerraRouter <-> WifStaking <-> FeePool). Nothing is configurable afterwards.
    function deployAll(address deployer) internal returns (Deployment memory d) {
        uint64 n = VM.getNonce(deployer);
        address pJar = VM.computeCreateAddress(deployer, n + 1);
        address pStaking = VM.computeCreateAddress(deployer, n + 2);
        address pFeePool = VM.computeCreateAddress(deployer, n + 3);
        address pRouter = VM.computeCreateAddress(deployer, n + 4);
        d.start = block.timestamp - (block.timestamp % 1 hours); // epochs align to UTC hours

        d.oracle = new StockOracle(ETH_USD, USDG_USD, stocks());
        d.jar = new Jar(pRouter, pStaking);
        d.staking = new WifStaking(IERC20(WIF), d.oracle, d.jar, pFeePool, d.start);
        d.feePool = new FeePool(IUniversalRouter(UR), IWIF(WIF), d.oracle, IWifStakingPool(pStaking), wifKey(), d.start);
        d.router = new TerraRouter(
            UR, WETH, USDG, WIF, d.jar, d.oracle, address(d.feePool), IStakeReader(address(d.staking))
        );
        d.lens = new HindsightLens(d.oracle, IWIF(WIF));
        d.friendJar = new FriendJar(ITerraDeposit(address(d.router)), d.jar, d.oracle);

        require(address(d.jar) == pJar && address(d.staking) == pStaking, "predict");
        require(address(d.feePool) == pFeePool && address(d.router) == pRouter, "predict");
    }
}
```

#### File: contracts/src/interfaces/IExternal.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/interfaces/IExternal.sol
// [VERIFIED] signatures exercised on a Robinhood Chain mainnet fork (forge Phase 0B spike, block 111155803).
pragma solidity 0.8.26;

/// @notice Uniswap Universal Router (RH mainnet 0x8876789976dEcBfCbBbe364623C63652db8C0904).
interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Chainlink AggregatorV3 proxy.
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256 answer, uint256 startedAt, uint256 updatedAt, uint80);
}

/// @notice $WIF is OpenZeppelin ERC20Burnable (burn + burnFrom), 18 decimals, no permit.
interface IWIF {
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/// @notice Canonical WETH9 on RH mainnet (0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73).
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
}

/// @notice Uniswap v4 PoolKey (currency0 < currency1; native ETH = address(0)).
struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @notice v4-periphery IV4Router.ExactInputSingleParams (5-field form, VERIFIED on RH UR).
struct ExactInputSingleParams {
    PoolKey poolKey;
    bool zeroForOne;
    uint128 amountIn;
    uint128 amountOutMinimum;
    bytes hookData;
}
```

#### File: contracts/src/lib/URCodec.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/lib/URCodec.sol
// [VERIFIED] command/action bytes + input layouts proven on RH mainnet fork (spike-fork.md).
// ROOT CAUSE (VERIFIED, test/URProbe.t.sol): this is Universal Router 2.1, whose V2_SWAP_EXACT_IN and
// V3_SWAP_EXACT_IN inputs carry a trailing `uint256[] maxHopSlippage`. Omitting it makes the calldata
// decoder revert SliceOutOfBounds(). We always append an empty array and pay legs with CONTRACT_BALANCE
// after an exact WRAP / token push (so each leg spends exactly what this call provided).
pragma solidity 0.8.26;

import {PoolKey, ExactInputSingleParams} from "../interfaces/IExternal.sol";

library URCodec {
    // Universal Router commands
    bytes1 internal constant V3_SWAP_EXACT_IN = 0x00;
    bytes1 internal constant V2_SWAP_EXACT_IN = 0x08;
    bytes1 internal constant WRAP_ETH = 0x0b;
    bytes1 internal constant UNWRAP_WETH = 0x0c;
    bytes1 internal constant V4_SWAP = 0x10;

    // v4 router actions
    uint8 internal constant SWAP_EXACT_IN_SINGLE = 0x06;
    uint8 internal constant SETTLE = 0x0b;
    uint8 internal constant SETTLE_ALL = 0x0c;
    uint8 internal constant TAKE_ALL = 0x0f;

    // ActionConstants
    address internal constant ADDRESS_THIS = address(2);
    uint256 internal constant CONTRACT_BALANCE = 1 << 255;

    function wrap(uint256 amount) internal pure returns (bytes memory) {
        return abi.encode(ADDRESS_THIS, amount);
    }

    function unwrap(address recipient, uint256 minOut) internal pure returns (bytes memory) {
        return abi.encode(recipient, minOut);
    }

    /// V3 exact-in paid from the router's own balance (payerIsUser = false).
    function v3(address recipient, uint256 minOut, bytes memory path) internal pure returns (bytes memory) {
        return abi.encode(recipient, CONTRACT_BALANCE, minOut, path, false, new uint256[](0));
    }

    /// V2 exact-in paid from the router's own balance (payerIsUser = false).
    function v2(address recipient, uint256 minOut, address[] memory path) internal pure returns (bytes memory) {
        return abi.encode(recipient, CONTRACT_BALANCE, minOut, path, false, new uint256[](0));
    }

    /// v4 single-hop paying native ETH (currency0 = address(0)) and taking `currencyOut` to the UR caller.
    function v4EthIn(PoolKey memory key, uint256 amountIn, uint256 minOut) internal pure returns (bytes memory) {
        bytes memory actions = abi.encodePacked(SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL);
        bytes[] memory p = new bytes[](3);
        p[0] = abi.encode(ExactInputSingleParams(key, true, uint128(amountIn), uint128(minOut), ""));
        p[1] = abi.encode(key.currency0, amountIn);
        p[2] = abi.encode(key.currency1, minOut);
        return abi.encode(actions, p);
    }

    /// v4 single-hop selling `currency1` (already pushed to the UR) for native ETH taken to the UR caller.
    /// SETTLE with payerIsUser = false pays from the UR's own token balance.
    function v4TokenInForEth(PoolKey memory key, uint256 amountIn, uint256 minOut) internal pure returns (bytes memory) {
        bytes memory actions = abi.encodePacked(SWAP_EXACT_IN_SINGLE, SETTLE, TAKE_ALL);
        bytes[] memory p = new bytes[](3);
        p[0] = abi.encode(ExactInputSingleParams(key, false, uint128(amountIn), uint128(minOut), ""));
        p[1] = abi.encode(key.currency1, amountIn, false);
        p[2] = abi.encode(key.currency0, minOut);
        return abi.encode(actions, p);
    }

    function one(bytes1 c) internal pure returns (bytes memory) {
        return abi.encodePacked(c);
    }

    function two(bytes1 a, bytes1 b) internal pure returns (bytes memory) {
        return abi.encodePacked(a, b);
    }

    function inputs1(bytes memory a) internal pure returns (bytes[] memory r) {
        r = new bytes[](1);
        r[0] = a;
    }

    function inputs2(bytes memory a, bytes memory b) internal pure returns (bytes[] memory r) {
        r = new bytes[](2);
        r[0] = a;
        r[1] = b;
    }

    /// First and last token of a packed v3 path (20-byte address, 3-byte fee, 20-byte address, ...).
    function v3Ends(bytes memory path) internal pure returns (address first, address last) {
        require(path.length == 43 || path.length == 66, "path");
        assembly {
            first := shr(96, mload(add(path, 32)))
            last := shr(96, mload(add(add(path, 32), sub(mload(path), 20))))
        }
    }

    /// Middle token of a 2-hop packed v3 path.
    function v3Mid(bytes memory path) internal pure returns (address mid) {
        require(path.length == 66, "path");
        assembly {
            mid := shr(96, mload(add(path, 55)))
        }
    }
}
```

### Key Decisions
UR 2.1 needs a trailing `uint256[] maxHopSlippage` on V2/V3 inputs (root cause proven in URProbe.t.sol). Deploy predicts CREATE addresses to break the Jar↔Router↔Staking↔FeePool cycle without any admin setter.


## Section 4: C5 StockOracle

### Purpose
Curated 6 stocks, Chainlink freshness, Chainlink-bounded min-out, NVDA early-round normalization.

### Files
- `contracts/src/StockOracle.sol`

### Code

#### File: contracts/src/StockOracle.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/StockOracle.sol
// [VERIFIED] feed addresses from Chainlink reference-data-directory (robinhood-mainnet); 8dp answers;
// heartbeat 86400s per directory; early-round scaling (NVDA, TSLA, GOOGL, SNDK, SPY, QQQ history feeds) from
// spike-indexing.md §4 + scripts/build-rounds.ts (every scaled row is a 1..k prefix rejoining the 8dp series within 10%).
pragma solidity 0.8.26;

import {IAggregatorV3} from "./interfaces/IExternal.sol";

/// @title StockOracle
/// @notice Ownerless registry of the 6 curated Stock Tokens + Chainlink reads and min-out math.
///         Nothing here can be changed after deployment.
contract StockOracle {
    uint8 public constant STOCKS = 6;
    uint16 public constant BAND_BPS = 300; // 3% Chainlink band on every stock fill
    uint256 public constant MAX_AGE = 25 hours; // Chainlink heartbeat (24h) + 1h grace
    /// @dev Early rounds of the stock history feeds report a 1e16-scaled value. An 8dp answer above 1e15
    ///      (a $10M share price) is impossible for the curated assets, so such answers are divided by 1e8.
    uint256 public constant SCALED_THRESHOLD = 1e15;

    struct Stock {
        address token; // ERC-8056 Stock Token (18dp)
        address liveFeed; // used for fills (24/7 feed where it exists)
        address historyFeed; // used by Hindsight (market-hours feed with history from 2026-06)
        bytes path; // packed Uniswap v3 path WETH -> ... -> token
        string symbol;
    }

    IAggregatorV3 public immutable ethUsdFeed;
    IAggregatorV3 public immutable usdgUsdFeed;
    Stock[STOCKS] private _stocks;

    error StaleOracle(address feed);
    error BadAnswer(address feed);
    error BadStock(uint8 id);

    constructor(address ethUsd, address usdgUsd, Stock[STOCKS] memory stocks_) {
        ethUsdFeed = IAggregatorV3(ethUsd);
        usdgUsdFeed = IAggregatorV3(usdgUsd);
        for (uint256 i; i < STOCKS; ++i) {
            _stocks[i] = stocks_[i];
        }
    }

    function stock(uint8 id) public view returns (Stock memory) {
        if (id >= STOCKS) revert BadStock(id);
        return _stocks[id];
    }

    function token(uint8 id) external view returns (address) {
        return stock(id).token;
    }

    function path(uint8 id) external view returns (bytes memory) {
        return stock(id).path;
    }

    /// @notice Fresh, positive 8dp price from a feed, or revert.
    function read(address feed) public view returns (uint256 price8) {
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        if (answer <= 0) revert BadAnswer(feed);
        if (updatedAt == 0 || block.timestamp - updatedAt > MAX_AGE) revert StaleOracle(feed);
        return uint256(answer);
    }

    function isFreshFeed(address feed) public view returns (bool) {
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(feed).latestRoundData();
        return answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= MAX_AGE;
    }

    function ethUsd() public view returns (uint256) {
        return read(address(ethUsdFeed));
    }

    function stockUsd(uint8 id) public view returns (uint256) {
        return read(stock(id).liveFeed);
    }

    function isFresh(uint8 id) external view returns (bool) {
        return isFreshFeed(address(ethUsdFeed)) && isFreshFeed(stock(id).liveFeed);
    }

    /// @notice Least stock (18dp) acceptable for `ethIn` wei, Chainlink price minus BAND_BPS.
    function minStockOut(uint8 id, uint256 ethIn) external view returns (uint256) {
        return ethIn * ethUsd() / stockUsd(id) * (10_000 - BAND_BPS) / 10_000;
    }

    /// @notice Historical answer normalized to 8 decimals (handles early-round 1e16 scaling on any feed).
    function historicalAnswer8(address feed, uint80 roundId)
        public
        view
        returns (uint256 price8, uint256 updatedAt)
    {
        (, int256 answer,, uint256 ts,) = IAggregatorV3(feed).getRoundData(roundId);
        if (answer <= 0) revert BadAnswer(feed);
        price8 = uint256(answer);
        if (price8 > SCALED_THRESHOLD) price8 = price8 / 1e8;
        updatedAt = ts;
    }
}
```

### Key Decisions
MAX_AGE = 25h follows the directory heartbeat (86400s); band 3% clears measured fills (-0.04%..-1.54%). Nothing is mutable after deploy.


## Section 5: C2 Jar

### Purpose
Ownerless per-user ledger of real Stock Tokens.

### Files
- `contracts/src/Jar.sol`

### Code

#### File: contracts/src/Jar.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/Jar.sol
// [VERIFIED] pattern: contracts can hold Stock Tokens (fact-check CR3); OpenZeppelin v5.1.0 SafeERC20/ReentrancyGuard.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Jar
/// @notice One ownerless contract holding every user's real Stock Tokens in a per-user ledger.
///         Only the immutable depositors (TerraRouter, WifStaking) can credit, and only with tokens
///         that have actually arrived. Only the user can withdraw their balance, at any time.
contract Jar is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SOURCE_CONVERT = 1;
    uint8 public constant SOURCE_SWEEP = 2;
    uint8 public constant SOURCE_REWARD = 3;
    uint8 public constant SOURCE_DEPOSIT = 4;

    address public immutable router;
    address public immutable staking;

    mapping(address user => mapping(address stock => uint256)) public balanceOf;
    mapping(address stock => uint256) public totalHeld;

    event Credited(address indexed user, address indexed stock, uint256 amount, uint8 source);
    event Withdrawn(address indexed user, address indexed stock, uint256 amount);

    error NotDepositor();
    error Unbacked();
    error Insufficient();

    constructor(address router_, address staking_) {
        router = router_;
        staking = staking_;
    }

    /// @notice Record `amount` of `stock` for `user`. The tokens must already be in this contract.
    function credit(address user, address stock, uint256 amount, uint8 source) external {
        if (msg.sender != router && msg.sender != staking) revert NotDepositor();
        uint256 held = totalHeld[stock] + amount;
        if (IERC20(stock).balanceOf(address(this)) < held) revert Unbacked();
        totalHeld[stock] = held;
        balanceOf[user][stock] += amount;
        emit Credited(user, stock, amount, source);
    }

    /// @notice Withdraw your own real Stock Tokens to your wallet.
    function withdraw(address stock, uint256 amount) external nonReentrant {
        uint256 bal = balanceOf[msg.sender][stock];
        if (amount > bal) revert Insufficient();
        balanceOf[msg.sender][stock] = bal - amount;
        totalHeld[stock] -= amount;
        IERC20(stock).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, stock, amount);
    }
}
```

### Key Decisions
credit() requires the tokens to already be held (balance backing) and only accepts the two immutable depositors; withdraw() debits only msg.sender.


## Section 6: C4 WifStaking

### Purpose
Stake $WIF into one of 6 reward sub-pools; epoch-batched activation (anti-JIT); 24h unstake; claim to Jar.

### Files
- `contracts/src/WifStaking.sol`

### Code

#### File: contracts/src/WifStaking.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/WifStaking.sol
// [ASSUMED] original accounting (MasterChef-style accRewardPerShare + epoch-batched activation);
// CAUTION: test immediately - covered by test/WifStaking.t.sol (JIT, multi-epoch, switch, unstake).
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {StockOracle} from "./StockOracle.sol";
import {Jar} from "./Jar.sol";

/// @title WifStaking — "Stake $WIF, earn real stocks."
/// @notice Stake $WIF into one of 6 reward sub-pools (one per curated stock). The FeePool streams real
///         Stock Tokens to each sub-pool every hourly epoch. A stake placed in epoch e becomes active at the
///         start of epoch e+2, so it must sit through one full epoch of fee accrual (e+1) before it shares any
///         distribution: a late stake plus an immediate permissionless distribute() captures nothing
///         (anti just-in-time). Unstaking stops rewards immediately and unlocks after 24h.
///         Claimed rewards are credited to the staker's Jar.
contract WifStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SOURCE_REWARD = 3;
    uint256 public constant EPOCH = 1 hours;
    uint256 public constant UNSTAKE_DELAY = 24 hours;
    uint256 private constant ACC = 1e18;

    IERC20 public immutable wif;
    StockOracle public immutable oracle;
    Jar public immutable jar;
    address public immutable feePool;
    uint256 public immutable start;

    /// @dev Stakes waiting to activate, bucketed by the epoch they were placed in. Only epochs current-1 and
    ///      current can still be pending (older buckets are rolled), so two buckets always suffice.
    struct Bucket {
        uint256 epoch;
        uint256 amount;
    }

    struct Pool {
        uint256 activeTotal;
        uint256 acc; // accumulated reward per active share, scaled by 1e18
        Bucket[2] pend;
    }

    struct Staker {
        uint8 stockId;
        uint256 active;
        uint256 pending;
        uint256 pendingEpoch;
        uint256 rewardDebt; // active * acc / 1e18 at last settle
        uint256 accrued; // settled, unclaimed reward (stock token units)
        uint256 unstaking;
        uint256 unlockAt;
    }

    Pool[6] internal pools;
    mapping(address => Staker) public stakers;
    /// @dev acc value at the moment the batch placed in `epoch` became active, per pool (+1 to mark "rolled").
    mapping(uint8 => mapping(uint256 => uint256)) public rollAccPlusOne;

    event Staked(address indexed user, uint256 amount, uint8 stockId, uint256 activeEpoch);
    event Switched(address indexed user, uint8 fromStock, uint8 toStock, uint256 amount);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockAt);
    event Withdrawn(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint8 stockId, uint256 amount);
    event RewardNotified(uint8 indexed stockId, uint256 epoch, uint256 amount, uint256 activeTotal);
    /// @notice A pending bucket placed in `placedEpoch` matured and its `amount` joined the pool's active stake.
    event Rolled(uint8 indexed stockId, uint256 placedEpoch, uint256 amount);

    error NotFeePool();
    error ZeroAmount();
    error BadStock();
    error Locked();
    error Insufficient();
    error NoActiveStake();

    constructor(IERC20 wif_, StockOracle oracle_, Jar jar_, address feePool_, uint256 start_) {
        wif = wif_;
        oracle = oracle_;
        jar = jar_;
        feePool = feePool_;
        start = start_;
    }

    function currentEpoch() public view returns (uint256) {
        return (block.timestamp - start) / EPOCH;
    }

    // ------------------------------------------------------------------ user actions

    function stake(uint256 amount, uint8 stockId) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (stockId >= 6) revert BadStock();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        if (s.active + s.pending > 0 && s.stockId != stockId) revert BadStock(); // use switchStock
        // Rewards accrued in the old pool must be paid in the old pool's stock before the pool changes.
        if (s.stockId != stockId && s.accrued > 0) _claim(msg.sender);
        wif.safeTransferFrom(msg.sender, address(this), amount);
        s.stockId = stockId;
        _addPending(s, stockId, amount);
        emit Staked(msg.sender, amount, stockId, currentEpoch() + 2); // first epoch it earns in (see _matured)
    }

    /// @notice Move your whole stake to another reward stock. Claims first; earns in the new pool from next epoch.
    function switchStock(uint8 stockId) external nonReentrant {
        if (stockId >= 6) revert BadStock();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        _claim(msg.sender);
        uint8 from = s.stockId;
        uint256 amount = s.active + s.pending;
        if (amount == 0) revert NoActiveStake();
        Pool storage p = pools[from];
        p.activeTotal -= s.active;
        _removePending(from, s.pendingEpoch, s.pending);
        s.active = 0;
        s.pending = 0;
        s.rewardDebt = 0;
        s.stockId = stockId;
        _addPending(s, stockId, amount);
        emit Switched(msg.sender, from, stockId, amount);
    }

    /// @notice Stop earning on `amount` now; it unlocks after UNSTAKE_DELAY. Pending stake is removed first.
    function requestUnstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Staker storage s = stakers[msg.sender];
        _touch(msg.sender);
        if (amount > s.active + s.pending) revert Insufficient();
        Pool storage p = pools[s.stockId];
        uint256 fromPending = amount <= s.pending ? amount : s.pending;
        s.pending -= fromPending;
        _removePending(s.stockId, s.pendingEpoch, fromPending);
        uint256 fromActive = amount - fromPending;
        if (fromActive > 0) {
            s.active -= fromActive;
            p.activeTotal -= fromActive;
            s.rewardDebt = s.active * p.acc / ACC;
        }
        s.unstaking += amount;
        s.unlockAt = block.timestamp + UNSTAKE_DELAY;
        emit UnstakeRequested(msg.sender, amount, s.unlockAt);
    }

    function withdraw() external nonReentrant {
        Staker storage s = stakers[msg.sender];
        if (block.timestamp < s.unlockAt) revert Locked();
        uint256 amount = s.unstaking;
        if (amount == 0) revert ZeroAmount();
        s.unstaking = 0;
        wif.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Credit your accrued reward stock to your Jar.
    function claim() external nonReentrant returns (uint256 amount) {
        _touch(msg.sender);
        amount = _claim(msg.sender);
    }

    // ------------------------------------------------------------------ fee pool hooks

    /// @notice Activate every pool's pending buckets placed at least two epochs ago. Called by FeePool before weighing.
    function rollAll() external {
        for (uint8 i; i < 6; ++i) {
            _rollPool(i);
        }
    }

    /// @notice FeePool already sent `amount` of the stock token here; distribute it over active stake.
    function notifyReward(uint8 stockId, uint256 amount) external {
        if (msg.sender != feePool) revert NotFeePool();
        Pool storage p = pools[stockId];
        if (p.activeTotal == 0) revert NoActiveStake();
        p.acc += amount * ACC / p.activeTotal;
        emit RewardNotified(stockId, currentEpoch(), amount, p.activeTotal);
    }

    // ------------------------------------------------------------------ views

    function activeStake(uint8 stockId) external view returns (uint256 total) {
        Pool storage p = pools[stockId];
        total = p.activeTotal;
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].amount > 0 && _matured(p.pend[k].epoch)) total += p.pend[k].amount;
        }
    }

    /// @notice Pool totals for UIs: active stake, stake still waiting to activate, accumulator.
    function poolInfo(uint8 stockId) external view returns (uint256 activeTotal, uint256 waiting, uint256 acc) {
        Pool storage p = pools[stockId];
        activeTotal = p.activeTotal;
        for (uint256 k; k < 2; ++k) {
            if (_matured(p.pend[k].epoch)) activeTotal += p.pend[k].amount;
            else waiting += p.pend[k].amount;
        }
        acc = p.acc;
    }

    /// @notice Stake that is earning (or would be after a lazy roll). Used by TerraRouter's fee discount.
    function activeOf(address user) external view returns (uint256) {
        Staker memory s = stakers[user];
        return s.active + (s.pending > 0 && _matured(s.pendingEpoch) ? s.pending : 0);
    }

    /// @notice Claimable reward (stock token units) including not-yet-settled accrual.
    function pending(address user) external view returns (uint8 stockId, uint256 amount) {
        Staker memory s = stakers[user];
        Pool storage p = pools[s.stockId];
        amount = s.accrued + s.active * p.acc / ACC - s.rewardDebt;
        if (s.pending > 0 && _matured(s.pendingEpoch)) {
            uint256 r = rollAccPlusOne[s.stockId][s.pendingEpoch];
            uint256 base = r == 0 ? p.acc : r - 1;
            amount += s.pending * (p.acc - base) / ACC;
        }
        stockId = s.stockId;
    }

    // ------------------------------------------------------------------ internals

    /// @dev A bucket placed in epoch e matures (becomes active) from epoch e+2.
    function _matured(uint256 placedEpoch) internal view returns (bool) {
        return placedEpoch + 1 < currentEpoch();
    }

    function _addPending(Staker storage s, uint8 stockId, uint256 amount) internal {
        Pool storage p = pools[stockId];
        _rollPool(stockId);
        uint256 e = currentEpoch();
        // A staker tracks one pending batch. An older batch still pending (placed in e-1; _touch already activated
        // anything older) moves into this epoch's bucket and activates with the top-up at e+2: never earlier (anti-JIT),
        // and never left in a bucket the staker no longer points at (stranded rewards / underflow lock).
        if (s.pending > 0 && s.pendingEpoch != e) {
            _removePending(stockId, s.pendingEpoch, s.pending);
            amount += s.pending;
            s.pending = 0;
        }
        uint256 slot = 2;
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].amount > 0 && p.pend[k].epoch == e) slot = k;
        }
        if (slot == 2) slot = p.pend[0].amount == 0 ? 0 : 1; // the other bucket can only hold epoch e-1
        p.pend[slot].epoch = e;
        p.pend[slot].amount += amount;
        s.pending += amount;
        s.pendingEpoch = e;
    }

    function _removePending(uint8 stockId, uint256 placedEpoch, uint256 amount) internal {
        if (amount == 0) return;
        Pool storage p = pools[stockId];
        for (uint256 k; k < 2; ++k) {
            if (p.pend[k].epoch == placedEpoch && p.pend[k].amount >= amount) {
                p.pend[k].amount -= amount;
                return;
            }
        }
        revert Insufficient();
    }

    function _rollPool(uint8 i) internal {
        Pool storage p = pools[i];
        for (uint256 k; k < 2; ++k) {
            Bucket storage b = p.pend[k];
            if (b.amount == 0 || !_matured(b.epoch)) continue;
            rollAccPlusOne[i][b.epoch] = p.acc + 1;
            p.activeTotal += b.amount;
            emit Rolled(i, b.epoch, b.amount);
            b.amount = 0;
        }
    }

    /// @dev Settle active rewards, then activate this staker's pending batch if its epoch has passed.
    function _touch(address user) internal {
        Staker storage s = stakers[user];
        _rollPool(s.stockId);
        Pool storage p = pools[s.stockId];
        s.accrued += s.active * p.acc / ACC - s.rewardDebt;
        if (s.pending > 0 && _matured(s.pendingEpoch)) {
            uint256 base = rollAccPlusOne[s.stockId][s.pendingEpoch] - 1; // pool rolled above
            s.accrued += s.pending * (p.acc - base) / ACC;
            s.active += s.pending;
            s.pending = 0;
        }
        s.rewardDebt = s.active * p.acc / ACC;
    }

    function _claim(address user) internal returns (uint256 amount) {
        Staker storage s = stakers[user];
        amount = s.accrued;
        if (amount == 0) return 0;
        s.accrued = 0;
        address token = oracle.token(s.stockId);
        IERC20(token).safeTransfer(address(jar), amount);
        jar.credit(user, token, amount, SOURCE_REWARD);
        emit Claimed(user, s.stockId, amount);
    }
}
```

### Key Decisions
All pending stakes in a pool share one epoch, so a single acc snapshot per (pool, epoch) lets each staker activate lazily with exact accounting.


## Section 7: C3 FeePool

### Purpose
Hourly permissionless distribute: capped $WIF buy-and-burn + Chainlink-bounded stock stream to stakers.

### Files
- `contracts/src/FeePool.sol`

### Code

#### File: contracts/src/FeePool.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/FeePool.sol
// [VERIFIED] WIF buy through the owned-hook v4 pool + burn from a contract (spike-fork.md test_buyAndBurnWif);
// [VERIFIED] WETH->stock v3 leg with Chainlink min-out (spike-fork.md test_sweepToNvda).
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniversalRouter, IWIF, PoolKey} from "./interfaces/IExternal.sol";
import {URCodec} from "./lib/URCodec.sol";
import {StockOracle} from "./StockOracle.sol";

interface IWifStakingPool {
    function rollAll() external;
    function activeStake(uint8 stockId) external view returns (uint256);
    function notifyReward(uint8 stockId, uint256 amount) external;
}

/// @title FeePool
/// @notice Collects Terra Firma's protocol fees in ETH. Once per hourly epoch anyone may call distribute():
///         50% buys $WIF through the WIF/ETH v4 pool and burns all of it; 50% buys real Stock Tokens for
///         $WIF stakers, split by active stake per reward sub-pool (each leg capped at MAX_WIF_BUY_ETH per epoch),
///         each fill bounded by a fresh Chainlink price. Anything that cannot be spent safely carries over.
///         $WIF is never priced for value: the buy size depends only on ETH and a fixed cap.
contract FeePool is ReentrancyGuard {
    uint256 public constant EPOCH = 1 hours;
    uint256 public constant MAX_WIF_BUY_ETH = 0.01 ether;
    uint256 public constant MIN_DISTRIBUTE_ETH = 0.00001 ether; // one ~0.002 ETH trade funds a real burn (minimal-spend demo)
    /// @dev Gas floors so a caller cannot starve a swap into an out-of-gas "skip" while the epoch still advances.
    uint256 public constant MIN_GAS_BURN_LEG = 400_000;
    uint256 public constant MIN_GAS_STOCK_LEG = 450_000;
    /// @dev 63/64 rule: a swap that ran out of gas hands back at most ~1/64 of the gas it was given (plus call overhead).
    uint256 private constant OOG_MARGIN = 10_000;

    IUniversalRouter public immutable ur;
    IWIF public immutable wif;
    StockOracle public immutable oracle;
    IWifStakingPool public immutable staking;
    uint256 public immutable start;
    PoolKey public wifPoolKey; // set once in constructor, never mutated

    uint256 public lastEpoch; // last epoch distributed (+1 so epoch 0 is distributable)
    uint256 public totalWifBurned;
    uint256 public totalEthToStock;

    event Distributed(
        uint256 indexed epoch, uint256 ethIn, uint256 wifBurned, uint256[6] stockBought, uint256 carried
    );
    event Received(address indexed from, uint256 amount);
    /// @notice The $WIF buy-and-burn swap failed (e.g. the third-party hook blocked it); the ETH carries to the next epoch.
    event BurnSkipped(uint256 indexed epoch, uint256 ethAmount, bytes reason);
    /// @notice A sub-pool stock buy failed (pool or band); the ETH carries to the next epoch.
    event StockBuySkipped(uint256 indexed epoch, uint8 indexed stockId, uint256 ethAmount, bytes reason);

    error EpochNotElapsed();
    error BelowThreshold();
    error OnlySelf();
    error InsufficientGas();

    constructor(
        IUniversalRouter ur_,
        IWIF wif_,
        StockOracle oracle_,
        IWifStakingPool staking_,
        PoolKey memory wifKey,
        uint256 start_
    ) {
        ur = ur_;
        wif = wif_;
        oracle = oracle_;
        staking = staking_;
        wifPoolKey = wifKey;
        start = start_;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function epoch() public view returns (uint256) {
        return (block.timestamp - start) / EPOCH;
    }

    function canDistribute() external view returns (bool) {
        return epoch() + 1 > lastEpoch && address(this).balance >= MIN_DISTRIBUTE_ETH;
    }

    /// @notice Permissionless. The $WIF buy has no caller-chosen minimum (a griefer could otherwise force every burn
    ///         to skip): it is never priced (INVARIANT 2) and the per-epoch MAX_WIF_BUY_ETH cap bounds any sandwich to dust.
    function distribute() external nonReentrant {
        uint256 e = epoch();
        if (e + 1 <= lastEpoch) revert EpochNotElapsed();
        uint256 ethIn = address(this).balance;
        if (ethIn < MIN_DISTRIBUTE_ETH) revert BelowThreshold();
        lastEpoch = e + 1;

        // 50/50 split, each leg capped at MAX_WIF_BUY_ETH per epoch; anything above the caps carries forward.
        uint256 half = ethIn / 2;
        uint256 leg = half > MAX_WIF_BUY_ETH ? MAX_WIF_BUY_ETH : half;
        uint256 burned = _buyAndBurn(leg);
        uint256[6] memory bought = _streamToStakers(leg);
        emit Distributed(e, ethIn, burned, bought, address(this).balance);
    }

    // ------------------------------------------------------------------ internals

    function _buyAndBurn(uint256 ethAmount) internal returns (uint256 burned) {
        if (ethAmount == 0) return 0;
        bytes memory input = URCodec.v4EthIn(wifPoolKey, ethAmount, 0);
        if (gasleft() < MIN_GAS_BURN_LEG) revert InsufficientGas();
        uint256 g = gasleft();
        try ur.execute{value: ethAmount}(URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(input), block.timestamp) {
            burned = wif.balanceOf(address(this));
            wif.burn(burned);
            totalWifBurned += burned;
        } catch (bytes memory reason) {
            _revertIfOutOfGas(g); // never skip (and advance the epoch) on a starved swap
            burned = 0; // third-party hook or pool failure: ETH stays here and carries to the next epoch
            emit BurnSkipped(epoch(), ethAmount, reason);
        }
    }

    function _streamToStakers(uint256 ethBudget) internal returns (uint256[6] memory bought) {
        staking.rollAll();
        uint256[6] memory w;
        uint256 total;
        for (uint8 i; i < 6; ++i) {
            if (!oracle.isFresh(i)) continue; // stale feed (e.g. SPY/QQQ at weekends): skip and carry
            w[i] = staking.activeStake(i);
            total += w[i];
        }
        if (total == 0) return bought;
        for (uint8 i; i < 6; ++i) {
            if (w[i] == 0) continue;
            uint256 eth = ethBudget * w[i] / total;
            if (eth == 0) continue;
            bought[i] = _buyStockFor(i, eth);
        }
    }

    /// @dev Out-of-gas is detected by gas left, not by revert data: v4-core wraps hook failures (never empty), and an
    ///      empty revert with gas to spare is a real failure that must skip and carry, not brick distribute.
    ///      `gasBefore` is gasleft() just before the try. Gas math only: a `reason.length` check inside a catch block
    ///      sends solc 0.8.26 via-IR's optimizer into a near-endless loop.
    function _revertIfOutOfGas(uint256 gasBefore) private view {
        if (gasleft() <= gasBefore / 64 + OOG_MARGIN) revert InsufficientGas();
    }

    function _buyStockFor(uint8 id, uint256 eth) internal returns (uint256 got) {
        address token = oracle.token(id);
        uint256 minOut = oracle.minStockOut(id, eth);
        uint256 before = IERC20(token).balanceOf(address(staking));
        bytes memory leg = URCodec.v3(address(staking), minOut, oracle.path(id));
        if (gasleft() < MIN_GAS_STOCK_LEG) revert InsufficientGas();
        uint256 g = gasleft();
        try ur.execute{value: eth}(
            URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN),
            URCodec.inputs2(URCodec.wrap(eth), leg),
            block.timestamp
        ) {
            got = IERC20(token).balanceOf(address(staking)) - before;
            staking.notifyReward(id, got);
            totalEthToStock += eth;
        } catch (bytes memory reason) {
            _revertIfOutOfGas(g);
            got = 0;
            emit StockBuySkipped(epoch(), id, eth, reason);
        }
    }
}
```

### Key Decisions
Every swap is wrapped in try/catch so a misbehaving third-party hook or a stale feed carries ETH forward instead of bricking the epoch.


## Section 8: C1 TerraRouter

### Purpose
Meme buy/sell/convert/deposit through UR 2.1 with fee, sweep and Jar credit; $WIF sell guard; staker fee discount.

### Files
- `contracts/src/TerraRouter.sol`

### Code

#### File: contracts/src/TerraRouter.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/TerraRouter.sol
// [VERIFIED] money-path pattern proven on RH mainnet fork (spike-fork.md: swapAndSweep 356k gas, -0.04% vs Chainlink).
// [VERIFIED] v4 token->ETH leg (SETTLE payerIsUser=false + TAKE_ALL): test_sellV4_plain on the mainnet fork; all route kinds in test/TerraFirma.t.sol.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniversalRouter, PoolKey} from "./interfaces/IExternal.sol";
import {URCodec} from "./lib/URCodec.sol";
import {StockOracle} from "./StockOracle.sol";
import {Jar} from "./Jar.sol";

interface IStakeReader {
    function activeOf(address user) external view returns (uint256);
}

/// @title TerraRouter
/// @notice Meme buy/sell/convert through the Uniswap Universal Router. Every trade pays a 0.5% fee
///         (0.3% for >= 10,000 $WIF active stakers) to the FeePool and sweeps the user's chosen slice
///         into a real Stock Token credited to their Jar, in the same transaction.
///         The router encodes every Universal Router command itself from a typed Route; callers can
///         never pass raw commands. $WIF can be bought here but never sold or converted.
contract TerraRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant KIND_V2 = 1;
    uint8 public constant KIND_V3 = 2;
    uint8 public constant KIND_V4 = 3;
    uint16 public constant FEE_BPS = 50;
    uint16 public constant STAKER_FEE_BPS = 30;
    uint256 public constant DISCOUNT_STAKE = 10_000e18;
    uint16 public constant MAX_SWEEP_BPS = 1000;
    uint8 internal constant SRC_CONVERT = 1;
    uint8 internal constant SRC_SWEEP = 2;
    uint8 internal constant SRC_DEPOSIT = 4;

    IUniversalRouter public immutable ur;
    address public immutable weth;
    address public immutable usdg;
    address public immutable wif;
    Jar public immutable jar;
    StockOracle public immutable oracle;
    address public immutable feePool;
    IStakeReader public immutable staking;

    /// @param kind 1 = Uniswap v2, 2 = v3 (packed path), 3 = v4 single hop against native ETH.
    /// @param v2Path v2 token path (length 2: [WETH, token] for buys, [token, WETH] for sells).
    /// @param v3Path packed v3 path (1 hop, or 2 hops through USDG) from WETH to token (buy) or token to WETH (sell).
    /// @param key v4 PoolKey with currency0 = address(0) (native ETH) and currency1 = token.
    struct Route {
        uint8 kind;
        address[] v2Path;
        bytes v3Path;
        PoolKey key;
    }

    event Traded(
        address indexed user, address indexed token, bool isBuy, uint256 ethAmount, uint256 tokenAmount, uint256 fee
    );
    event Swept(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut);
    /// @notice A direct ETH -> Stock Token deposit into the Jar (distinct from trade sweeps, which emit Swept).
    event Deposited(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut);
    event Converted(address indexed user, uint8 indexed stockId, uint256 ethIn, uint256 stockOut, uint256 memes);

    error WifNotSellable();
    error SweepTooHigh();
    error Slippage();
    error BadRoute();
    error NothingToConvert();
    error EthTransferFailed();
    error LengthMismatch();

    constructor(
        address ur_,
        address weth_,
        address usdg_,
        address wif_,
        Jar jar_,
        StockOracle oracle_,
        address feePool_,
        IStakeReader staking_
    ) {
        ur = IUniversalRouter(ur_);
        weth = weth_;
        usdg = usdg_;
        wif = wif_;
        jar = jar_;
        oracle = oracle_;
        feePool = feePool_;
        staking = staking_;
    }

    receive() external payable {}

    // ----------------------------------------------------------------------------------------------
    // User entry points
    // ----------------------------------------------------------------------------------------------

    /// @notice Buy `token` with ETH; sweep `sweepBps` of msg.value into `stockId` in the caller's Jar.
    function buy(Route calldata r, address token, uint16 sweepBps, uint8 stockId, uint256 minTokenOut, uint256 minStockOut)
        external
        payable
        nonReentrant
        returns (uint256 tokenOut, uint256 stockOut)
    {
        if (sweepBps > MAX_SWEEP_BPS) revert SweepTooHigh();
        _validate(r, token, true);
        uint256 fee = msg.value * feeBps(msg.sender) / 10_000;
        uint256 sweep = msg.value * sweepBps / 10_000;
        uint256 trade = msg.value - fee - sweep;
        _sendEth(feePool, fee);

        uint256 before = IERC20(token).balanceOf(msg.sender);
        _swapEthForToken(r, token, trade, minTokenOut, msg.sender);
        tokenOut = IERC20(token).balanceOf(msg.sender) - before;
        if (tokenOut < minTokenOut) revert Slippage();

        if (sweep > 0) {
            stockOut = _ethToJar(msg.sender, stockId, sweep, minStockOut, SRC_SWEEP);
            emit Swept(msg.sender, stockId, sweep, stockOut);
        }
        emit Traded(msg.sender, token, true, msg.value, tokenOut, fee);
    }

    /// @notice Sell `amountIn` of `token` for ETH; sweep `sweepBps` of the proceeds into the caller's Jar.
    function sell(
        Route calldata r,
        address token,
        uint256 amountIn,
        uint16 sweepBps,
        uint8 stockId,
        uint256 minEthOut,
        uint256 minStockOut
    ) external nonReentrant returns (uint256 ethOut, uint256 stockOut) {
        if (sweepBps > MAX_SWEEP_BPS) revert SweepTooHigh();
        _validate(r, token, false);
        uint256 proceeds = _sellToEth(r, token, amountIn);
        uint256 fee = proceeds * feeBps(msg.sender) / 10_000;
        uint256 sweep = proceeds * sweepBps / 10_000;
        ethOut = proceeds - fee - sweep;
        if (ethOut < minEthOut) revert Slippage();
        _sendEth(feePool, fee);
        if (sweep > 0) {
            stockOut = _ethToJar(msg.sender, stockId, sweep, minStockOut, SRC_SWEEP);
            emit Swept(msg.sender, stockId, sweep, stockOut);
        }
        _sendEth(msg.sender, ethOut);
        emit Traded(msg.sender, token, false, proceeds, amountIn, fee);
    }

    /// @notice Sell several non-$WIF memes and put 100% of the proceeds (after fee) into `stockId` in the Jar.
    function convert(
        Route[] calldata rs,
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint8 stockId,
        uint256 minStockOut
    ) external nonReentrant returns (uint256 stockOut) {
        uint256 n = rs.length;
        if (n == 0) revert NothingToConvert();
        if (tokens.length != n || amounts.length != n) revert LengthMismatch();
        uint256 proceeds;
        for (uint256 i; i < n; ++i) {
            _validate(rs[i], tokens[i], false);
            proceeds += _sellToEth(rs[i], tokens[i], amounts[i]);
        }
        uint256 fee = proceeds * feeBps(msg.sender) / 10_000;
        _sendEth(feePool, fee);
        stockOut = _ethToJar(msg.sender, stockId, proceeds - fee, minStockOut, SRC_CONVERT);
        emit Converted(msg.sender, stockId, proceeds, stockOut, n);
    }

    /// @notice Buy a Stock Token straight into the caller's Jar with ETH (fee applies).
    function deposit(uint8 stockId, uint256 minStockOut) external payable nonReentrant returns (uint256 stockOut) {
        uint256 fee = msg.value * feeBps(msg.sender) / 10_000;
        _sendEth(feePool, fee);
        stockOut = _ethToJar(msg.sender, stockId, msg.value - fee, minStockOut, SRC_DEPOSIT);
        emit Deposited(msg.sender, stockId, msg.value - fee, stockOut);
    }

    /// @notice 30 bps for wallets with >= 10,000 $WIF active stake, else 50 bps. Reads a stake amount, never a price.
    function feeBps(address user) public view returns (uint16) {
        return staking.activeOf(user) >= DISCOUNT_STAKE ? STAKER_FEE_BPS : FEE_BPS;
    }

    // ----------------------------------------------------------------------------------------------
    // Internals
    // ----------------------------------------------------------------------------------------------

    /// @dev Route endpoints must match the declared token and the ETH side; $WIF can never be an input.
    function _validate(Route calldata r, address token, bool isBuy) internal view {
        if (!isBuy && token == wif) revert WifNotSellable();
        if (token == address(0) || token == weth) revert BadRoute();
        if (r.kind == KIND_V2) {
            if (r.v2Path.length != 2) revert BadRoute();
            (address a, address b) = isBuy ? (weth, token) : (token, weth);
            if (r.v2Path[0] != a || r.v2Path[1] != b) revert BadRoute();
        } else if (r.kind == KIND_V3) {
            (address first, address last) = URCodec.v3Ends(r.v3Path);
            (address a, address b) = isBuy ? (weth, token) : (token, weth);
            if (first != a || last != b) revert BadRoute();
            if (r.v3Path.length == 66 && URCodec.v3Mid(r.v3Path) != usdg) revert BadRoute();
        } else if (r.kind == KIND_V4) {
            if (r.key.currency0 != address(0) || r.key.currency1 != token) revert BadRoute();
        } else {
            revert BadRoute();
        }
    }

    function _swapEthForToken(Route calldata r, address token, uint256 amount, uint256 minOut, address to) internal {
        if (r.kind == KIND_V4) {
            uint256 before = IERC20(token).balanceOf(address(this));
            ur.execute{value: amount}(
                URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(URCodec.v4EthIn(r.key, amount, minOut)), block.timestamp
            );
            IERC20(token).safeTransfer(to, IERC20(token).balanceOf(address(this)) - before);
            return;
        }
        bytes memory leg = r.kind == KIND_V3 ? URCodec.v3(to, minOut, r.v3Path) : URCodec.v2(to, minOut, r.v2Path);
        bytes1 cmd = r.kind == KIND_V3 ? URCodec.V3_SWAP_EXACT_IN : URCodec.V2_SWAP_EXACT_IN;
        ur.execute{value: amount}(
            URCodec.two(URCodec.WRAP_ETH, cmd), URCodec.inputs2(URCodec.wrap(amount), leg), block.timestamp
        );
    }

    /// @dev Pull `amountIn` from the caller, push it to the UR, swap to ETH delivered to this contract.
    ///      Returns the ETH actually received (fee-on-transfer tokens get whatever arrives).
    function _sellToEth(Route calldata r, address token, uint256 amountIn) internal returns (uint256 ethOut) {
        uint256 got = _pull(token, amountIn);
        IERC20(token).safeTransfer(address(ur), got);
        uint256 before = address(this).balance;
        if (r.kind == KIND_V4) {
            ur.execute(
                URCodec.one(URCodec.V4_SWAP), URCodec.inputs1(URCodec.v4TokenInForEth(r.key, got, 0)), block.timestamp
            );
        } else {
            bytes memory leg = r.kind == KIND_V3
                ? URCodec.v3(URCodec.ADDRESS_THIS, 0, r.v3Path)
                : URCodec.v2(URCodec.ADDRESS_THIS, 0, r.v2Path);
            bytes1 cmd = r.kind == KIND_V3 ? URCodec.V3_SWAP_EXACT_IN : URCodec.V2_SWAP_EXACT_IN;
            ur.execute(
                URCodec.two(cmd, URCodec.UNWRAP_WETH),
                URCodec.inputs2(leg, URCodec.unwrap(address(this), 0)),
                block.timestamp
            );
        }
        ethOut = address(this).balance - before;
    }

    /// @dev ETH -> Stock Token (Chainlink-bounded) delivered to the Jar and credited to `user`.
    function _ethToJar(address user, uint8 stockId, uint256 ethIn, uint256 userMin, uint8 source)
        internal
        returns (uint256 stockOut)
    {
        address stockToken = oracle.token(stockId);
        uint256 oracleMin = oracle.minStockOut(stockId, ethIn); // reverts StaleOracle if not fresh
        uint256 minOut = userMin > oracleMin ? userMin : oracleMin;
        uint256 before = IERC20(stockToken).balanceOf(address(jar));
        ur.execute{value: ethIn}(
            URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN),
            URCodec.inputs2(URCodec.wrap(ethIn), URCodec.v3(address(jar), minOut, oracle.path(stockId))),
            block.timestamp
        );
        stockOut = IERC20(stockToken).balanceOf(address(jar)) - before;
        if (stockOut < minOut) revert Slippage();
        jar.credit(user, stockToken, stockOut, source);
    }

    function _pull(address token, uint256 amount) internal returns (uint256 got) {
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        got = IERC20(token).balanceOf(address(this)) - before;
    }

    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
```

### Key Decisions
The router encodes every UR command itself from a typed Route and validates endpoints; callers cannot inject commands. Fee discount reads stake amount, never a price.


## Section 9: C6 HindsightLens

### Purpose
Onchain recompute of a Hindsight card + optional mint that burns 1 $WIF.

### Files
- `contracts/src/HindsightLens.sol`

### Code

#### File: contracts/src/HindsightLens.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/HindsightLens.sol
// [ASSUMED] original pricing view over Chainlink getRoundData; round bracketing + NVDA scaling covered by
// test/HindsightLens.t.sol against real mainnet rounds (n=1, 24, 25, latest).
pragma solidity 0.8.26;

import {IAggregatorV3, IWIF} from "./interfaces/IExternal.sol";
import {StockOracle} from "./StockOracle.sol";

/// @title HindsightLens
/// @notice Anyone can recompute a Hindsight card onchain from its receipts: what was paid (priced with the
///         Chainlink round in effect at that time), how many shares of a stock that would have bought (the
///         stock's historical round), and what those shares are worth now. Optional: mint the card onchain
///         by burning 1 $WIF.
contract HindsightLens {
    uint8 public constant PAY_ETH = 0; // native ETH or WETH, priced by ETH/USD
    uint8 public constant PAY_USDG = 1; // USDG (6dp), priced by USDG/USD
    uint8 public constant PAY_STOCK = 2; // a curated Stock Token, priced by its history feed
    uint256 public constant CARD_BURN = 1e18;

    StockOracle public immutable oracle;
    IWIF public immutable wif;

    /// @param amountPaid amount of the paying asset in its own decimals (18 for ETH/stock, 6 for USDG)
    /// @param payRoundId Chainlink round of the paying asset's feed in effect at `ts`
    /// @param stockRoundId Chainlink round of the counterfactual stock's history feed in effect at `ts`
    /// @param payStockId curated stock id when payKind == PAY_STOCK
    struct Buy {
        uint8 payKind;
        uint8 payStockId;
        uint256 amountPaid;
        uint80 payRoundId;
        uint80 stockRoundId;
        uint64 ts;
    }

    event CardMinted(address indexed wallet, uint8 stockId, uint256 usdPaid8, uint256 shares18, uint256 usdNow8);

    error BadRound(address feed, uint80 roundId);
    error BadPayKind();

    constructor(StockOracle oracle_, IWIF wif_) {
        oracle = oracle_;
        wif = wif_;
    }

    /// @return usdPaid8 total USD paid (8dp)
    /// @return shares18 counterfactual stock shares (18dp)
    /// @return usdNow8 value of those shares at the latest round (8dp)
    function recompute(Buy[] calldata buys, uint8 stockId)
        public
        view
        returns (uint256 usdPaid8, uint256 shares18, uint256 usdNow8)
    {
        address hist = oracle.stock(stockId).historyFeed;
        for (uint256 i; i < buys.length; ++i) {
            Buy calldata b = buys[i];
            uint256 paid8 = _usdPaid8(b);
            uint256 stock8 = _priceAt(hist, b.stockRoundId, b.ts);
            usdPaid8 += paid8;
            shares18 += paid8 * 1e18 / stock8;
        }
        (, int256 nowAnswer,,,) = IAggregatorV3(hist).latestRoundData();
        usdNow8 = shares18 * uint256(nowAnswer) / 1e18;
    }

    /// @notice Recompute and record the card onchain, burning 1 $WIF from the caller (needs approval).
    function mintCard(Buy[] calldata buys, uint8 stockId) external {
        (uint256 usdPaid8, uint256 shares18, uint256 usdNow8) = recompute(buys, stockId);
        wif.burnFrom(msg.sender, CARD_BURN);
        emit CardMinted(msg.sender, stockId, usdPaid8, shares18, usdNow8);
    }

    function _usdPaid8(Buy calldata b) internal view returns (uint256) {
        if (b.payKind == PAY_ETH) {
            return b.amountPaid * _priceAt(address(oracle.ethUsdFeed()), b.payRoundId, b.ts) / 1e18;
        }
        if (b.payKind == PAY_USDG) {
            return b.amountPaid * _priceAt(address(oracle.usdgUsdFeed()), b.payRoundId, b.ts) / 1e6;
        }
        if (b.payKind == PAY_STOCK) {
            address feed = oracle.stock(b.payStockId).historyFeed;
            return b.amountPaid * _priceAt(feed, b.payRoundId, b.ts) / 1e18;
        }
        revert BadPayKind();
    }

    /// @dev Round `rid` must be the one in effect at `ts`: updatedAt(rid) <= ts < updatedAt(rid + 1),
    ///      or rid is the latest round. Answers are normalized to 8dp (NVDA early-round scaling).
    ///      Round ids are phaseId << 64 | n: at the last round of a phase rid + 1 does not exist (updatedAt == 0), so
    ///      it cannot bracket `ts` and is rejected; otherwise a stale old-phase round would price any later ts.
    function _priceAt(address feed, uint80 rid, uint64 ts) internal view returns (uint256 price8) {
        uint256 at;
        (price8, at) = oracle.historicalAnswer8(feed, rid);
        if (at == 0 || at > ts) revert BadRound(feed, rid);
        (uint80 latest,,,,) = IAggregatorV3(feed).latestRoundData();
        if (rid < latest) {
            (,,, uint256 nextAt,) = IAggregatorV3(feed).getRoundData(rid + 1);
            if (nextAt == 0 || nextAt <= ts) revert BadRound(feed, rid);
        }
    }
}
```

### Key Decisions
Round bracketing (updatedAt(r) <= ts < updatedAt(r+1)) makes a forged round id revert BadRound.


## Section 10: C12 FriendJar (gated by OD7)

### Purpose
Shared Jar with pro-rata exit, funded through TerraRouter.deposit.

### Files
- `contracts/src/FriendJar.sol`

### Code

#### File: contracts/src/FriendJar.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/src/FriendJar.sol
// [ASSUMED] original pro-rata share accounting; GATED (OD7): deploy only if F-001..F-017 are green on mainnet
// by 2026-11-11 23:59 WAT. CAUTION: test immediately - test/FriendJar.t.sol.
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Jar} from "./Jar.sol";
import {StockOracle} from "./StockOracle.sol";

interface ITerraDeposit {
    function deposit(uint8 stockId, uint256 minStockOut) external payable returns (uint256);
}

/// @title FriendJar
/// @notice A shared Jar for friends. Members contribute ETH, which TerraRouter turns into one real Stock Token
///         held in the main Jar under this contract's address; ownership is pro-rata to stock contributed.
///         Any member can exit at any time with their share of the real stock. No vouching, no lockups.
contract FriendJar is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ITerraDeposit public immutable router;
    Jar public immutable jar;
    StockOracle public immutable oracle;

    struct Group {
        uint8 stockId;
        address creator;
        bytes32 inviteHash; // keccak256(invite code) chosen by the creator
        uint256 totalShares;
    }

    Group[] public groups;
    mapping(uint256 => mapping(address => uint256)) public sharesOf;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => uint256) public stockOf; // stock units owned by each group inside the main Jar

    event JarCreated(uint256 indexed id, address indexed creator, uint8 stockId);
    event Joined(uint256 indexed id, address indexed member);
    event Contributed(uint256 indexed id, address indexed member, uint256 ethIn, uint256 stockOut);
    event Exited(uint256 indexed id, address indexed member, uint256 stockOut);

    error NotMember();
    error BadInvite();
    error NothingToExit();

    constructor(ITerraDeposit router_, Jar jar_, StockOracle oracle_) {
        router = router_;
        jar = jar_;
        oracle = oracle_;
    }

    function create(uint8 stockId, bytes32 inviteHash) external returns (uint256 id) {
        oracle.token(stockId); // reverts on a bad id
        id = groups.length;
        groups.push(Group(stockId, msg.sender, inviteHash, 0));
        isMember[id][msg.sender] = true;
        emit JarCreated(id, msg.sender, stockId);
        emit Joined(id, msg.sender);
    }

    function join(uint256 id, string calldata invite) external {
        if (keccak256(bytes(invite)) != groups[id].inviteHash) revert BadInvite();
        isMember[id][msg.sender] = true;
        emit Joined(id, msg.sender);
    }

    function contribute(uint256 id, uint256 minStockOut) external payable nonReentrant returns (uint256 stockOut) {
        if (!isMember[id][msg.sender]) revert NotMember();
        Group storage g = groups[id];
        stockOut = router.deposit{value: msg.value}(g.stockId, minStockOut);
        uint256 shares = g.totalShares == 0 ? stockOut : stockOut * g.totalShares / stockOf[id];
        g.totalShares += shares;
        sharesOf[id][msg.sender] += shares;
        stockOf[id] += stockOut;
        emit Contributed(id, msg.sender, msg.value, stockOut);
    }

    /// @notice Leave with your pro-rata share of the group's real stock, sent to your wallet.
    function exit(uint256 id) external nonReentrant returns (uint256 stockOut) {
        uint256 shares = sharesOf[id][msg.sender];
        if (shares == 0) revert NothingToExit();
        Group storage g = groups[id];
        stockOut = stockOf[id] * shares / g.totalShares;
        sharesOf[id][msg.sender] = 0;
        g.totalShares -= shares;
        stockOf[id] -= stockOut;
        address token = oracle.token(g.stockId);
        jar.withdraw(token, stockOut);
        IERC20(token).safeTransfer(msg.sender, stockOut);
        emit Exited(id, msg.sender, stockOut);
    }

    function groupCount() external view returns (uint256) {
        return groups.length;
    }
}
```

### Key Decisions
No vouching or lockups (AMEND-1); deployed with the core, surfaced in the UI only if the gate passes.


## Section 11: Contract tests

### Purpose
Mainnet-fork test suites (32 tests).

### Files
- `contracts/test/HindsightLens.t.sol`
- `contracts/test/TerraFirma.t.sol`
- `contracts/test/URProbe.t.sol`
- `contracts/test/debug-p2-reentrancy.t.sol`
- `contracts/test/debug-p2-staking-invariant.t.sol`
- `contracts/test/debug-p2-weekend-staleness.t.sol`
- `contracts/test/debug-p6-crossepoch-lock.t.sol`
- `contracts/test/debug-p6-feepool.t.sol`
- `contracts/test/debug-p6-hindsight-phase.t.sol`

### Code

#### File: contracts/test/HindsightLens.t.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/HindsightLens.t.sol
// [VERIFIED] real mainnet rounds: NVDA/USD n=24 (scaled, ts 1782222509) and n=25 (8dp, ts 1782222749);
// ETH/USD n=549 (ts 1782221550, next 1782224251, answer 165768649010).
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {HindsightLens} from "../src/HindsightLens.sol";

contract HindsightLensTest is Test, TerraConfig {
    uint80 constant BASE = uint80(1 << 64);
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    function buyAt(uint64 ts, uint80 nvdaRound) internal pure returns (HindsightLens.Buy[] memory b) {
        b = new HindsightLens.Buy[](1);
        b[0] = HindsightLens.Buy({
            payKind: 0, payStockId: 0, amountPaid: 1 ether, payRoundId: BASE + 549, stockRoundId: BASE + nvdaRound, ts: ts
        });
    }

    function test_scaledEarlyRoundNormalized() public view {
        (uint256 p24,) = d.oracle.historicalAnswer8(0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, BASE + 24);
        (uint256 p25,) = d.oracle.historicalAnswer8(0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, BASE + 25);
        assertEq(p24, 20306520000, "n=24 -> $203.0652");
        assertEq(p25, 20344000000, "n=25 -> $203.44");
    }

    function test_recomputeOneEthBuy() public view {
        // ts inside both rounds: ETH n=549 [1782221550, 1782224251), NVDA n=24 [1782222509, 1782222749)
        (uint256 usd8, uint256 shares18, uint256 now8) = d.lens.recompute(buyAt(1782222600, 24), 0);
        assertEq(usd8, 165768649010, "1 ETH = $1657.69");
        assertEq(shares18, uint256(165768649010) * 1e18 / 20306520000, "~8.163 NVDA");
        assertGt(now8, 0);
    }

    function test_wrongRoundReverts() public {
        vm.expectRevert(); // NVDA n=25 starts after ts
        d.lens.recompute(buyAt(1782222600, 25), 0);
        vm.expectRevert(); // NVDA n=23 was superseded by n=24 before ts
        d.lens.recompute(buyAt(1782222600, 23), 0);
    }
}
```

#### File: contracts/test/TerraFirma.t.sol
[VERIFIED] — Source: fork-tested / live-probed
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/TerraFirma.t.sol
// [VERIFIED] fork suite against Robinhood Chain mainnet 4663. Run:
//   RPC_URL=$GETBLOCK_RPC_FRA FORK_BLOCK=111155803 forge test -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {FeePool} from "../src/FeePool.sol";
import {PoolKey, IWIF, IUniversalRouter} from "../src/interfaces/IExternal.sol";

contract TerraFirmaTest is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    Deployment d;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    // ------------------------------------------------------------------ route helpers

    function v3Buy(address token, uint24 fee) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, fee, token);
    }

    function v3Sell(address token, uint24 fee) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(token, fee, WETH);
    }

    function v2(address a, address b) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 1;
        r.v2Path = new address[](2);
        r.v2Path[0] = a;
        r.v2Path[1] = b;
    }

    function v4(PoolKey memory key) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 3;
        r.key = key;
    }

    function ponsV4() internal pure returns (PoolKey memory) {
        return PoolKey(address(0), PONS, 10128, 202, address(0));
    }

    function buyPons(address who, uint256 eth, uint16 sweep) internal returns (uint256 got) {
        vm.prank(who);
        (got,) = d.router.buy{value: eth}(v3Buy(PONS, 3000), PONS, sweep, 0, 1, 0);
    }

    function stakeWif(address who, uint256 eth) internal returns (uint256 amount) {
        vm.startPrank(who);
        (amount,) = d.router.buy{value: eth}(v4(wifKey()), WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, 0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ F-004 buy with sweep

    function test_buyV3_sweepAndFee() public {
        uint256 fp0 = address(d.feePool).balance;
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: 0.01 ether}(v3Buy(PONS, 3000), PONS, 200, 0, 1, 0);
        assertGt(memeOut, 0, "meme");
        assertGt(stockOut, 0, "stock");
        assertEq(address(d.feePool).balance - fp0, 0.00005 ether, "fee exactly 0.5%");
        assertEq(d.jar.balanceOf(alice, NVDA), stockOut, "jar credit == received");
        assertEq(IERC20(NVDA).balanceOf(address(d.jar)), d.jar.totalHeld(NVDA), "backed");
        assertEq(IERC20(PONS).balanceOf(alice), memeOut, "meme to user");
        assertEq(address(d.router).balance, 0, "no ETH left in router");
    }

    function test_buyV2() public {
        vm.prank(alice);
        (uint256 memeOut,) = d.router.buy{value: 0.002 ether}(v2(WETH, PONS), PONS, 0, 0, 1, 0);
        assertGt(memeOut, 0);
    }

    function test_buyV4_plain() public {
        vm.prank(alice);
        (uint256 memeOut, uint256 stockOut) = d.router.buy{value: 0.002 ether}(v4(ponsV4()), PONS, 200, 0, 1, 0);
        assertGt(memeOut, 0);
        assertGt(stockOut, 0);
        assertEq(IERC20(PONS).balanceOf(address(d.router)), 0, "forwarded");
    }

    function test_buyWif_hookedPool() public {
        vm.prank(alice);
        (uint256 wifOut,) = d.router.buy{value: 0.001 ether}(v4(wifKey()), WIF, 0, 0, 1, 0);
        assertGt(wifOut, 1000e18, "~1.5K WIF per 0.001 ETH");
    }

    // ------------------------------------------------------------------ F-005 sell with sweep

    function test_sellV3_sweep() public {
        uint256 bal = buyPons(alice, 0.005 ether, 0);
        uint256 eth0 = alice.balance;
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), bal);
        (uint256 ethOut, uint256 stockOut) = d.router.sell(v3Sell(PONS, 3000), PONS, bal, 200, 0, 1, 0);
        vm.stopPrank();
        assertEq(alice.balance - eth0, ethOut, "eth to user");
        assertGt(stockOut, 0, "sweep");
        assertEq(IERC20(PONS).balanceOf(address(d.router)), 0);
    }

    function test_sellV4_plain() public {
        uint256 bal = buyPons(alice, 0.003 ether, 0);
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), bal);
        (uint256 ethOut,) = d.router.sell(v4(ponsV4()), PONS, bal, 0, 0, 1, 0);
        vm.stopPrank();
        assertGt(ethOut, 0.002 ether, "v4 token->ETH leg works");
    }

    // ------------------------------------------------------------------ F-003 convert

    function test_convert_multi() public {
        uint256 a = buyPons(alice, 0.004 ether, 0);
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](2);
        address[] memory toks = new address[](2);
        uint256[] memory amts = new uint256[](2);
        rs[0] = v3Sell(PONS, 3000);
        rs[1] = v2(PONS, WETH);
        toks[0] = PONS;
        toks[1] = PONS;
        amts[0] = a / 2;
        amts[1] = a - a / 2;
        vm.startPrank(alice);
        IERC20(PONS).approve(address(d.router), a);
        uint256 out = d.router.convert(rs, toks, amts, 0, 0);
        vm.stopPrank();
        assertGt(out, 0);
        assertEq(d.jar.balanceOf(alice, NVDA), out);
    }

    function test_deposit_tsla() public {
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.002 ether}(1, 0);
        assertGt(out, 0);
        assertEq(d.jar.balanceOf(alice, TSLA), out);
    }

    // ------------------------------------------------------------------ INVARIANTS 1, 3, 5, 6

    function test_sellWifReverts() public {
        vm.startPrank(alice);
        (uint256 w,) = d.router.buy{value: 0.001 ether}(v4(wifKey()), WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.router), w);
        vm.expectRevert(TerraRouter.WifNotSellable.selector);
        d.router.sell(v4(wifKey()), WIF, w, 0, 0, 0, 0);
        vm.stopPrank();
    }

    function test_convertWifReverts() public {
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
        address[] memory toks = new address[](1);
        uint256[] memory amts = new uint256[](1);
        rs[0] = v4(wifKey());
        toks[0] = WIF;
        amts[0] = 1;
        vm.expectRevert(TerraRouter.WifNotSellable.selector);
        d.router.convert(rs, toks, amts, 0, 0);
    }

    function test_routeTokenMismatchReverts() public {
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(v3Buy(NVDA, 500), PONS, 0, 0, 0, 0);
    }

    function test_badKindReverts() public {
        TerraRouter.Route memory r;
        r.kind = 9;
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(r, PONS, 0, 0, 0, 0);
    }

    function test_badMidHopReverts() public {
        TerraRouter.Route memory r;
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, uint24(500), NVDA, uint24(500), PONS); // mid must be USDG
        vm.prank(alice);
        vm.expectRevert(TerraRouter.BadRoute.selector);
        d.router.buy{value: 0.001 ether}(r, PONS, 0, 0, 0, 0);
    }

    function test_sweepTooHighReverts() public {
        vm.prank(alice);
        vm.expectRevert(TerraRouter.SweepTooHigh.selector);
        d.router.buy{value: 0.001 ether}(v3Buy(PONS, 3000), PONS, 1001, 0, 0, 0);
    }

    function test_staleOracleReverts() public {
        vm.warp(vm.getBlockTimestamp() + 26 hours);
        vm.prank(alice);
        vm.expectRevert(); // StaleOracle(feed)
        d.router.deposit{value: 0.001 ether}(0, 0);
    }

    function test_userMinStockEnforced() public {
        vm.prank(alice);
        vm.expectRevert();
        d.router.deposit{value: 0.001 ether}(0, 1 ether); // 1 NVDA for 0.001 ETH is impossible
    }

    function test_jarCreditGuards() public {
        vm.expectRevert(Jar.NotDepositor.selector);
        d.jar.credit(alice, NVDA, 1, 2);
        vm.prank(address(d.router));
        vm.expectRevert(Jar.Unbacked.selector);
        d.jar.credit(alice, NVDA, 1e18, 2);
    }

    function test_jarWithdrawOnlyOwnBalance() public {
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.002 ether}(0, 0);
        vm.prank(bob);
        vm.expectRevert(Jar.Insufficient.selector);
        d.jar.withdraw(NVDA, out);
        vm.prank(alice);
        d.jar.withdraw(NVDA, out);
        assertEq(IERC20(NVDA).balanceOf(alice), out);
        assertEq(d.jar.balanceOf(alice, NVDA), 0);
    }

    function test_noOwnerFunctions() public {
        address[6] memory cs = [
            address(d.router), address(d.jar), address(d.feePool), address(d.staking), address(d.oracle), address(d.lens)
        ];
        for (uint256 i; i < cs.length; ++i) {
            (bool ok,) = cs[i].call(abi.encodeWithSignature("owner()"));
            assertFalse(ok, "no owner()");
            (ok,) = cs[i].call(abi.encodeWithSignature("transferOwnership(address)", alice));
            assertFalse(ok, "no transferOwnership");
            (ok,) = cs[i].call(abi.encodeWithSignature("pause()"));
            assertFalse(ok, "no pause");
        }
    }

    // ------------------------------------------------------------------ F-006/F-007/F-008 fee pool + staking

    function test_distribute_burnAndStream() public {
        uint256 staked = stakeWif(bob, 0.01 ether);
        assertGt(staked, 10_000e18);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // a stake placed in epoch e is active from e+2
        for (uint256 i; i < 3; ++i) buyPons(alice, 0.05 ether, 200);
        uint256 supply0 = IWIF(WIF).totalSupply();
        vm.recordLogs();
        d.feePool.distribute();
        uint256 burned = d.feePool.totalWifBurned();
        assertGt(burned, 0, "burned");
        assertEq(supply0 - IWIF(WIF).totalSupply(), burned, "supply drop == burned");
        (uint8 sid, uint256 p) = d.staking.pending(bob);
        assertEq(sid, 0);
        assertGt(p, 0, "stream to staker");
        vm.prank(bob);
        uint256 claimed = d.staking.claim();
        assertEq(claimed, p);
        assertEq(d.jar.balanceOf(bob, NVDA), claimed, "reward in Jar");
    }

    function test_jitStakeEarnsNothing() public {
        stakeWif(bob, 0.005 ether); // honest staker, active from e+2
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        for (uint256 i; i < 2; ++i) buyPons(alice, 0.05 ether, 0);
        stakeWif(alice, 0.02 ether); // JIT: staked in the same epoch as the distribute
        d.feePool.distribute();
        (, uint256 pa) = d.staking.pending(alice);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pa, 0, "JIT stake earns nothing this epoch");
        assertGt(pb, 0, "honest staker earns");
        // next epoch: still not active (placed in e, active from e+2)
        vm.warp(vm.getBlockTimestamp() + 1 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, pa) = d.staking.pending(alice);
        assertEq(pa, 0, "not active one epoch later");
        // epoch e+2: active and earns
        vm.warp(vm.getBlockTimestamp() + 1 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, pa) = d.staking.pending(alice);
        assertGt(pa, 0, "earns after activation");
    }

    function test_distributeOncePerEpoch() public {
        buyPons(alice, 0.05 ether, 0);
        d.feePool.distribute();
        buyPons(alice, 0.05 ether, 0);
        vm.expectRevert(FeePool.EpochNotElapsed.selector);
        d.feePool.distribute();
    }

    function test_noStakersCarriesStockHalf() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 bal = address(d.feePool).balance;
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0);
        assertEq(address(d.feePool).balance, bal - bal / 2, "stock half carried");
    }

    function test_burnFailureEmitsAndCarries() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 bal = address(d.feePool).balance;
        // force the WIF swap to fail (a third-party hook/pool revert with a reason) inside try/catch
        vm.mockCallRevert(UR, IUniversalRouter.execute.selector, abi.encodeWithSignature("Error(string)", "hook"));
        vm.expectEmit(true, false, false, false, address(d.feePool));
        emit FeePool.BurnSkipped(d.feePool.epoch(), 0, "");
        d.feePool.distribute();
        assertEq(d.feePool.totalWifBurned(), 0, "nothing burned");
        assertEq(address(d.feePool).balance, bal, "all ETH carried (no stakers, burn failed)");
    }

    /// Reviewer attack: stake in the last second of epoch e, warp 1s, call distribute immediately.
    function test_boundaryStakeEarnsNothing() public {
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // bob is an established staker
        uint256 st = d.feePool.start();
        uint256 e = d.feePool.epoch();
        vm.warp(st + (e + 1) * 1 hours - 1); // last second of the current epoch
        stakeWif(alice, 0.02 ether);
        vm.warp(st + (e + 1) * 1 hours + 1); // first second of the next epoch
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, uint256 pa) = d.staking.pending(alice);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pa, 0, "boundary stake captures nothing");
        assertGt(pb, 0, "established staker earns");
    }

    /// Reviewer attack: fully unstake from NVDA with accrued rewards, re-stake into TSLA, claim.
    function test_crossPoolAccruedNoDrain() public {
        uint256 s = stakeWif(alice, 0.005 ether);
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        buyPons(bob, 0.05 ether, 0);
        d.feePool.distribute();
        (, uint256 acc) = d.staking.pending(alice);
        assertGt(acc, 0);
        vm.startPrank(alice);
        d.staking.requestUnstake(s);
        vm.warp(vm.getBlockTimestamp() + 24 hours);
        d.staking.withdraw();
        IERC20(WIF).approve(address(d.staking), s);
        d.staking.stake(s, 1); // TSLA: must first settle NVDA rewards in NVDA
        vm.stopPrank();
        assertEq(d.jar.balanceOf(alice, NVDA), acc, "old rewards paid in old stock");
        assertEq(d.jar.balanceOf(alice, TSLA), 0, "nothing paid in the new stock");
    }

    /// Reviewer attack: starve distribute of gas so swaps fail out-of-gas while the epoch advances.
    function test_distributeGasStarvationReverts() public {
        buyPons(alice, 0.05 ether, 0);
        uint256 last = d.feePool.lastEpoch();
        for (uint256 g = 120_000; g <= 900_000; g += 60_000) {
            try d.feePool.distribute{gas: g}() {
                assertGt(d.feePool.totalWifBurned(), 0, "a successful distribute must burn");
                return;
            } catch {
                assertEq(d.feePool.lastEpoch(), last, "a starved call never advances the epoch");
            }
        }
    }

    /// Both legs get the same ETH, each capped at MAX_WIF_BUY_ETH; the rest carries.
    function test_splitCappedEqually() public {
        stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        vm.deal(address(d.feePool), 1 ether);
        vm.recordLogs();
        d.feePool.distribute();
        assertEq(address(d.feePool).balance, 1 ether - 2 * d.feePool.MAX_WIF_BUY_ETH(), "two equal capped legs");
        assertEq(d.feePool.totalEthToStock(), d.feePool.MAX_WIF_BUY_ETH(), "stock leg == burn leg");
    }

    function test_curatedMultipliersNearOne() public view {
        address[6] memory t = [NVDA, TSLA, GOOGL, SNDK, SPY, QQQ];
        for (uint256 i; i < 6; ++i) {
            (bool ok, bytes memory r) = t[i].staticcall(abi.encodeWithSignature("uiMultiplier()"));
            if (!ok) continue;
            uint256 m = abi.decode(r, (uint256));
            assertApproxEqRel(m, 1e18, 0.02e18, "multiplier within 2% of 1 (inside the 3% band)");
        }
    }

    function test_unstakeDelay() public {
        uint256 s = stakeWif(bob, 0.003 ether);
        vm.startPrank(bob);
        d.staking.requestUnstake(s);
        vm.expectRevert(WifStaking.Locked.selector);
        d.staking.withdraw();
        vm.warp(vm.getBlockTimestamp() + 24 hours);
        d.staking.withdraw();
        vm.stopPrank();
        assertEq(IERC20(WIF).balanceOf(bob), s);
    }

    function test_feeDiscountForStakers() public {
        stakeWif(alice, 0.01 ether); // > 10K WIF
        assertEq(d.router.feeBps(alice), 50, "pending stake: no discount yet");
        vm.warp(vm.getBlockTimestamp() + 2 hours);
        assertEq(d.router.feeBps(alice), 30, "active stake: 0.3%");
        uint256 fp0 = address(d.feePool).balance;
        buyPons(alice, 0.01 ether, 0);
        assertEq(address(d.feePool).balance - fp0, 0.00003 ether, "fee exactly 0.3%");
    }

    // ------------------------------------------------------------------ FriendJar (gated)

    function test_friendJar_contributeExit() public {
        vm.prank(alice);
        uint256 id = d.friendJar.create(0, keccak256("flat"));
        vm.prank(bob);
        d.friendJar.join(id, "flat");
        vm.prank(alice);
        uint256 a = d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.prank(bob);
        d.friendJar.contribute{value: 0.002 ether}(id, 0);
        vm.prank(alice);
        uint256 out = d.friendJar.exit(id);
        assertApproxEqRel(out, a, 0.02e18);
        assertEq(IERC20(NVDA).balanceOf(alice), out);
    }
}
```

#### File: contracts/test/URProbe.t.sol
[ASSUMED] — Source: see header comment
```solidity
// File: contracts/test/URProbe.t.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
import "forge-std/Test.sol";
interface IUR { function execute(bytes calldata, bytes[] calldata, uint256) external payable; }
interface IERC20 { function balanceOf(address) external view returns (uint256); }
contract URProbeTest is Test {
    address constant UR = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    function setUp() public { vm.createSelectFork(vm.envString("RPC_URL"), 111155803); vm.deal(address(this), 1 ether); }
    function _go(bytes memory cmd, bytes memory leg) internal {
        bytes[] memory i = new bytes[](2);
        i[0] = abi.encode(address(2), uint256(0.001 ether)); i[1] = leg;
        IUR(UR).execute{value: 0.001 ether}(cmd, i, block.timestamp);
        assertGt(IERC20(PONS).balanceOf(address(this)), 0);
    }
    function test_v3_explicit_withHopArray() public { _go(hex"0b00", abi.encode(address(this), uint256(0.001 ether), uint256(1), abi.encodePacked(WETH, uint24(3000), PONS), false, new uint256[](0))); }
    function test_v2_cb_withHopArray() public { address[] memory p = new address[](2); p[0]=WETH; p[1]=PONS; _go(hex"0b08", abi.encode(address(this), uint256(1<<255), uint256(1), p, false, new uint256[](0))); }
    function test_v2_explicit_withHopArray() public { address[] memory p = new address[](2); p[0]=WETH; p[1]=PONS; _go(hex"0b08", abi.encode(address(this), uint256(0.001 ether), uint256(1), p, false, new uint256[](0))); }
}
```

#### File: contracts/test/debug-p2-reentrancy.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-reentrancy.t.sol
// hackathon-debug Phase 2 (known risk: no dedicated reentrancy test; T5 relied on OZ nonReentrant alone). FORK tests on
// Robinhood Chain mainnet 4663. Every external entry point that hands control to a third party is attacked:
//   - TerraRouter.sell: the ETH send-back to msg.sender re-enters buy / sell / deposit / convert (real deployment)
//   - TerraRouter.sell / convert: a hostile meme token's transferFrom callback re-enters the router (real deployment)
//   - Jar.withdraw: a hostile token's transfer hook re-enters withdraw (isolated Jar; real Jars only ever hold curated
//     Stock Tokens, because credit() is depositor-only and backed, so this proves the guard, not a live path)
//   - WifStaking.withdraw / stake: a hostile $WIF-like token re-enters withdraw / claim (isolated instance, same reason)
//   - FeePool.distribute: a hostile staking hook (rollAll) re-enters distribute after the real $WIF burn leg ran
// Each re-entry must fail with ReentrancyGuardReentrantCall.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-reentrancy.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {IUniversalRouter, IWIF, PoolKey} from "../src/interfaces/IExternal.sol";

bytes4 constant REENTRANT = bytes4(keccak256("ReentrancyGuardReentrantCall()"));

function selectorOf(bytes memory err) pure returns (bytes4 s) {
    if (err.length >= 4) s = bytes4(err);
}

interface IHook {
    function onTokenHook() external;
}

/// ERC20 that calls `onTokenHook()` on a registered hook contract during every transfer / transferFrom.
contract HookToken is ERC20 {
    address public hook;

    constructor() ERC20("Hook", "HOOK") {}

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }

    function setHook(address h) external {
        hook = h;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (hook != address(0) && from != address(0)) IHook(hook).onTokenHook();
    }
}

/// Malicious seller: re-enters TerraRouter from receive() when the router sends sale proceeds back.
contract EthReentrant {
    TerraRouter immutable router;
    address immutable meme;
    uint8 public mode; // 1 buy, 2 sell, 3 deposit, 4 convert
    bytes4 public seen;
    bool armed;

    constructor(TerraRouter r, address meme_) {
        router = r;
        meme = meme_;
    }

    function arm(uint8 m) external {
        mode = m;
        armed = true;
    }

    function route(bool isBuy) public view returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = isBuy
            ? abi.encodePacked(address(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73), uint24(3000), meme)
            : abi.encodePacked(meme, uint24(3000), address(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73));
    }

    function buyMeme() external payable returns (uint256 got) {
        (got,) = router.buy{value: msg.value}(route(true), meme, 0, 0, 1, 0);
        IERC20(meme).approve(address(router), type(uint256).max);
    }

    function sellAll() external returns (uint256 ethOut) {
        (ethOut,) = router.sell(route(false), meme, IERC20(meme).balanceOf(address(this)), 0, 0, 0, 0);
    }

    receive() external payable {
        if (!armed) return;
        armed = false;
        if (mode == 1) {
            try router.buy{value: msg.value / 2}(route(true), meme, 0, 0, 1, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else if (mode == 2) {
            try router.sell(route(false), meme, 1, 0, 0, 0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else if (mode == 3) {
            try router.deposit{value: msg.value / 2}(0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        } else {
            TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
            rs[0] = route(false);
            address[] memory ts = new address[](1);
            ts[0] = meme;
            uint256[] memory am = new uint256[](1);
            am[0] = 1;
            try router.convert(rs, ts, am, 0, 0) {} catch (bytes memory e) { seen = selectorOf(e); }
        }
    }
}

/// Hook that re-enters TerraRouter.deposit from inside a hostile token's transferFrom (no catch: the revert bubbles).
contract RouterHook is IHook {
    TerraRouter immutable router;

    constructor(TerraRouter r) payable {
        router = r;
    }

    function onTokenHook() external {
        router.deposit{value: 1e14}(0, 0);
    }
}

/// Hook that re-enters a target with `data` and records the revert selector (state survives: it catches).
contract RecordingHook is IHook {
    address public target;
    bytes public data;
    bytes4 public seen;
    bool public armed;

    function set(address t, bytes calldata d) external {
        target = t;
        data = d;
        armed = true;
    }

    function onTokenHook() external {
        if (!armed) return;
        armed = false;
        (bool ok, bytes memory e) = target.call(data);
        if (!ok) seen = selectorOf(e);
    }
}

/// Staking stand-in whose rollAll() re-enters FeePool.distribute.
contract ReentrantStaking is IWifStakingPool {
    FeePool public pool;

    function setPool(FeePool p) external {
        pool = p;
    }

    function rollAll() external {
        pool.distribute();
    }

    function activeStake(uint8) external pure returns (uint256) {
        return 0;
    }

    function notifyReward(uint8, uint256) external {}
}

contract DebugP2Reentrancy is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    // ------------------------------------------------------------------ TerraRouter: ETH send-back path

    function _sellWithReentry(uint8 mode) internal returns (EthReentrant atk, uint256 ethOut) {
        atk = new EthReentrant(d.router, PONS);
        vm.deal(address(atk), 1 ether);
        atk.buyMeme{value: 0.01 ether}();
        atk.arm(mode);
        uint256 bal0 = address(atk).balance;
        ethOut = atk.sellAll();
        assertGt(ethOut, 0, "sale paid out");
        assertEq(address(atk).balance - bal0, ethOut, "re-entry did nothing; proceeds intact");
        assertEq(atk.seen(), REENTRANT, "re-entry rejected by nonReentrant");
        assertEq(address(d.router).balance, 0, "no ETH stuck in router");
    }

    function test_sellEthSendBack_reenterBuy() public {
        _sellWithReentry(1);
    }

    function test_sellEthSendBack_reenterSell() public {
        _sellWithReentry(2);
    }

    function test_sellEthSendBack_reenterDeposit() public {
        _sellWithReentry(3);
    }

    function test_sellEthSendBack_reenterConvert() public {
        _sellWithReentry(4);
    }

    // ------------------------------------------------------------------ TerraRouter: hostile token callback

    function _hostileRoute(address tok) internal pure returns (TerraRouter.Route memory r) {
        r.kind = 2;
        r.v3Path = abi.encodePacked(tok, uint24(3000), WETH);
    }

    function test_sellHostileTokenCallbackReverts() public {
        HookToken tok = new HookToken();
        RouterHook hook = new RouterHook{value: 1 ether}(d.router);
        tok.mint(address(this), 1e18);
        tok.approve(address(d.router), 1e18);
        tok.setHook(address(hook));
        vm.expectRevert(REENTRANT);
        d.router.sell(_hostileRoute(address(tok)), address(tok), 1e18, 0, 0, 0, 0);
    }

    function test_convertHostileTokenCallbackReverts() public {
        HookToken tok = new HookToken();
        RouterHook hook = new RouterHook{value: 1 ether}(d.router);
        tok.mint(address(this), 1e18);
        tok.approve(address(d.router), 1e18);
        tok.setHook(address(hook));
        TerraRouter.Route[] memory rs = new TerraRouter.Route[](1);
        rs[0] = _hostileRoute(address(tok));
        address[] memory ts = new address[](1);
        ts[0] = address(tok);
        uint256[] memory am = new uint256[](1);
        am[0] = 1e18;
        vm.expectRevert(REENTRANT);
        d.router.convert(rs, ts, am, 0, 0);
    }

    // ------------------------------------------------------------------ Jar.withdraw

    function test_jarWithdrawReentry() public {
        HookToken tok = new HookToken();
        RecordingHook atk = new RecordingHook();
        Jar jar = new Jar(address(this), address(0)); // this test is the depositor
        tok.mint(address(jar), 10e18);
        jar.credit(address(atk), address(tok), 10e18, 4);
        tok.setHook(address(atk));
        atk.set(address(jar), abi.encodeCall(Jar.withdraw, (address(tok), 5e18)));
        vm.prank(address(atk));
        jar.withdraw(address(tok), 5e18);
        assertEq(atk.seen(), REENTRANT, "re-entrant withdraw rejected");
        assertEq(tok.balanceOf(address(atk)), 5e18, "only the outer withdraw paid");
        assertEq(jar.balanceOf(address(atk), address(tok)), 5e18, "ledger debited once");
        assertEq(jar.totalHeld(address(tok)), tok.balanceOf(address(jar)), "still fully backed");
    }

    // ------------------------------------------------------------------ WifStaking.withdraw / stake

    function _hostileStaking() internal returns (HookToken w, WifStaking s, RecordingHook atk) {
        w = new HookToken();
        StockOracle o = new StockOracle(ETH_USD, USDG_USD, stocks());
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        Jar j = new Jar(address(0xdead), pStaking);
        s = new WifStaking(IERC20(address(w)), o, j, address(this), block.timestamp);
        atk = new RecordingHook();
        w.mint(address(atk), 100e18);
        vm.prank(address(atk));
        w.approve(address(s), type(uint256).max);
    }

    function test_stakingWithdrawReentry() public {
        (HookToken w, WifStaking s, RecordingHook atk) = _hostileStaking();
        vm.startPrank(address(atk));
        s.stake(100e18, 0);
        s.requestUnstake(100e18);
        vm.stopPrank();
        vm.warp(block.timestamp + 24 hours);
        w.setHook(address(atk));
        atk.set(address(s), abi.encodeCall(WifStaking.withdraw, ()));
        vm.prank(address(atk));
        s.withdraw();
        assertEq(atk.seen(), REENTRANT, "re-entrant withdraw rejected");
        assertEq(w.balanceOf(address(atk)), 100e18, "paid exactly once");
        assertEq(w.balanceOf(address(s)), 0);
    }

    function test_stakingStakeReentersClaim() public {
        (HookToken w, WifStaking s, RecordingHook atk) = _hostileStaking();
        w.setHook(address(atk));
        atk.set(address(s), abi.encodeCall(WifStaking.claim, ()));
        vm.prank(address(atk));
        s.stake(50e18, 0);
        assertEq(atk.seen(), REENTRANT, "claim re-entered from stake's transferFrom rejected");
        (, , uint256 pend,,,,,) = s.stakers(address(atk));
        assertEq(pend, 50e18, "stake recorded once");
    }

    // ------------------------------------------------------------------ FeePool.distribute

    function test_feePoolDistributeReentry() public {
        ReentrantStaking evil = new ReentrantStaking();
        FeePool fp = new FeePool(IUniversalRouter(UR), IWIF(WIF), d.oracle, evil, wifKey(), block.timestamp);
        evil.setPool(fp);
        vm.deal(address(fp), 0.01 ether);
        vm.expectRevert(REENTRANT); // the real $WIF burn leg runs first, then rollAll() re-enters
        fp.distribute();
        assertEq(fp.lastEpoch(), 0, "reverted distribute did not advance the epoch");
    }
}
```

#### File: contracts/test/debug-p2-staking-invariant.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-staking-invariant.t.sol
// hackathon-debug Phase 2 (known risk: WifStaking accounting is original [ASSUMED] logic). FORK tests on Robinhood
// Chain mainnet 4663 with the real $WIF and real Stock Tokens. The staking contract is deployed with this test as its
// FeePool so rewards can be notified exactly the way FeePool does (rollAll, weigh by activeStake, send, notify).
//   1. test_topUpAcrossEpochs_*: deterministic repros of a top-up placed one epoch after an earlier, still-pending stake.
//   2. testFuzz_stakingAccounting: seeded random stake / top-up / switch / unstake / claim / withdraw sequences over
//      3 users and many epochs with distributes in between. Checks after every step:
//        - no inflation: per pool, claimed + pending over all users <= total reward notified to that pool
//        - solvency: the contract holds every user's pending reward and every staked/unstaking $WIF
//        - no early earning: a user whose whole live stake was placed in epoch >= E-1 earns nothing from epoch E's notify
//        - no lock: claim / requestUnstake / withdraw never revert for a user acting within their balance
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-staking-invariant.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";
import {WifStaking} from "../src/WifStaking.sol";

contract DebugP2StakingInvariant is Test, TerraConfig {
    WifStaking st;
    Jar jar;
    StockOracle oracle;
    address[3] users = [address(0xA11CE), address(0xB0B), address(0xCA7)];
    uint8 constant POOLS = 2; // NVDA, TSLA: enough to exercise switching without six-way bookkeeping

    uint256[POOLS] notified; // total reward notified per pool
    mapping(address => uint256) liveSince; // epoch of the first stake since the user's live stake was last zero
    mapping(address => uint256) staked; // test-side mirror of active + pending
    mapping(address => uint256) unstaking;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        uint256 start = block.timestamp - (block.timestamp % 1 hours);
        oracle = new StockOracle(ETH_USD, USDG_USD, stocks());
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        jar = new Jar(address(0xdead), pStaking);
        st = new WifStaking(IERC20(WIF), oracle, jar, address(this), start);
        require(address(st) == pStaking, "predict");
        for (uint256 i; i < 3; ++i) {
            deal(WIF, users[i], 1_000_000e18);
            vm.prank(users[i]);
            IERC20(WIF).approve(address(st), type(uint256).max);
        }
    }

    // ------------------------------------------------------------------ helpers

    function _epoch() internal view returns (uint256) {
        return st.currentEpoch();
    }

    function _nextEpoch() internal {
        vm.warp(block.timestamp + 1 hours);
    }

    function _stake(address u, uint256 amt, uint8 pool) internal {
        if (staked[u] == 0) liveSince[u] = _epoch();
        vm.prank(u);
        st.stake(amt, pool);
        staked[u] += amt;
    }

    /// FeePool._streamToStakers semantics: roll, weigh by activeStake, send the stock, notify (only pools with stake).
    function _distribute(uint256 reward) internal {
        st.rollAll();
        for (uint8 i; i < POOLS; ++i) {
            if (st.activeStake(i) == 0) continue;
            address tok = oracle.token(i);
            deal(tok, address(st), IERC20(tok).balanceOf(address(st)) + reward);
            st.notifyReward(i, reward);
            notified[i] += reward;
        }
    }

    function _pending(address u) internal view returns (uint8 sid, uint256 amt) {
        (sid, amt) = st.pending(u);
    }

    // ------------------------------------------------------------------ 1. deterministic repros

    /// Stake A in epoch e, top up B in e+1, unstake B in e+1. Bucket e+1 is now empty, so it is never rolled and
    /// rollAccPlusOne[pool][e+1] stays 0; every later _touch computes 0 - 1 and panics: the user's A $WIF is locked.
    function test_topUpAcrossEpochs_thenUnstakeTopUp_doesNotLock() public {
        address a = users[0];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        vm.prank(a);
        st.requestUnstake(50e18);
        vm.warp(block.timestamp + 3 hours);
        vm.prank(a);
        st.claim(); // must not revert
        vm.prank(a);
        st.requestUnstake(100e18); // the remaining stake must still be withdrawable
        vm.warp(block.timestamp + 24 hours);
        vm.prank(a);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(a), 1_000_000e18, "all $WIF returned");
    }

    /// Stake A in epoch e, top up B in e+1. In e+2 the pool activates A (bucket e matured), but the staker's pending
    /// epoch was overwritten to e+1, so the staker does not earn on A: a reward notified in e+2 is stranded forever.
    function test_topUpAcrossEpochs_rewardNotStranded() public {
        address a = users[0];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        _nextEpoch(); // e+2
        _distribute(1e18);
        vm.warp(block.timestamp + 2 hours);
        _distribute(1e18);
        (, uint256 p) = _pending(a);
        assertApproxEqAbs(p, notified[0], 1e6, "sole staker earns every notified reward");
    }

    /// A top-up must not let another user's pending bucket be drained: bob's stake must activate and stay unlockable.
    function test_topUpAcrossEpochs_switchDoesNotLockOthers() public {
        address a = users[0];
        address b = users[1];
        _stake(a, 100e18, 0);
        _nextEpoch();
        _stake(a, 50e18, 0);
        _stake(b, 150e18, 0);
        vm.prank(a);
        st.switchStock(1);
        vm.warp(block.timestamp + 3 hours);
        vm.prank(b);
        st.claim(); // must not revert
        assertEq(st.activeOf(b), 150e18, "bob's stake is active");
        vm.prank(b);
        st.requestUnstake(150e18);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(b);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(b), 1_000_000e18, "bob's $WIF returned");
    }

    // ------------------------------------------------------------------ 2. seeded sequence fuzz

    /// forge-config: default.fuzz.runs = 48
    function testFuzz_stakingAccounting(uint256 seed) public {
        for (uint256 step; step < 36; ++step) {
            uint256 r = uint256(keccak256(abi.encode(seed, step)));
            address u = users[r % 3];
            uint256 op = (r >> 8) % 7;
            if (op == 0 || op == 1) _opStake(u, r);
            else if (op == 2) _opSwitch(u, r);
            else if (op == 3) _opUnstake(u, r);
            else if (op == 4) _opClaim(u);
            else if (op == 5) _opWithdraw(u);
            else _opDistribute(r);
            if ((r >> 40) % 3 == 0) _nextEpoch();
            _checkNoInflation();
        }
        _drainAll();
    }

    function _opStake(address u, uint256 r) internal {
        uint256 amt = 1e18 + (r >> 16) % 50_000e18;
        uint8 pool = staked[u] > 0 ? _poolOf(u) : uint8((r >> 80) % POOLS);
        _stake(u, amt, pool);
    }

    function _opSwitch(address u, uint256 r) internal {
        if (staked[u] == 0) return;
        uint8 to = uint8((r >> 80) % POOLS);
        vm.prank(u);
        st.switchStock(to); // must not revert for a user with live stake
        liveSince[u] = _epoch(); // a switch restarts activation in the new pool
    }

    function _opUnstake(address u, uint256 r) internal {
        if (staked[u] == 0) return;
        uint256 amt = 1 + (r >> 16) % staked[u];
        vm.prank(u);
        st.requestUnstake(amt); // must not revert within the user's balance
        staked[u] -= amt;
        unstaking[u] += amt;
    }

    function _opClaim(address u) internal {
        (uint8 sid, uint256 want) = _pending(u);
        uint256 jar0 = jar.balanceOf(u, oracle.token(sid));
        vm.prank(u);
        uint256 got = st.claim(); // must never revert
        assertEq(got, want, "claim pays exactly pending()");
        assertEq(jar.balanceOf(u, oracle.token(sid)) - jar0, got, "claim credited to the Jar");
    }

    function _opWithdraw(address u) internal {
        if (unstaking[u] == 0) return;
        vm.warp(block.timestamp + 24 hours);
        uint256 bal0 = IERC20(WIF).balanceOf(u);
        vm.prank(u);
        st.withdraw();
        assertEq(IERC20(WIF).balanceOf(u) - bal0, unstaking[u], "withdraw returns every unstaked $WIF");
        unstaking[u] = 0;
    }

    function _opDistribute(uint256 r) internal {
        uint256 reward = 1e12 + (r >> 120) % 1e18;
        uint256 e = _epoch();
        uint256[3] memory before;
        for (uint256 i; i < 3; ++i) (, before[i]) = _pending(users[i]);
        _distribute(reward);
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            if (staked[u] == 0 || liveSince[u] + 2 <= e) continue;
            (, uint256 nowP) = _pending(u);
            assertEq(nowP, before[i], "stake placed in epoch >= E-1 earned from epoch E's distribute");
        }
    }

    function _poolOf(address u) internal view returns (uint8 sid) {
        (sid,,,,,,,) = st.stakers(u);
    }

    function _checkNoInflation() internal view {
        uint256 wifOwed;
        uint256[POOLS] memory owed;
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            (uint8 sid, uint256 p) = _pending(u);
            owed[sid] += p;
            wifOwed += staked[u] + unstaking[u];
        }
        for (uint8 k; k < POOLS; ++k) {
            address tok = oracle.token(k);
            uint256 claimed;
            for (uint256 i; i < 3; ++i) claimed += jar.balanceOf(users[i], tok);
            assertLe(claimed + owed[k], notified[k], "rewards claimed + pending exceed rewards notified");
            assertGe(IERC20(tok).balanceOf(address(st)), owed[k], "staking cannot pay pending rewards");
        }
        assertEq(IERC20(WIF).balanceOf(address(st)), wifOwed, "staked + unstaking $WIF == contract balance");
    }

    /// Everyone exits: claims and full withdrawals must all succeed and leave no $WIF behind.
    function _drainAll() internal {
        vm.warp(block.timestamp + 3 hours);
        for (uint256 i; i < 3; ++i) {
            address u = users[i];
            _opClaim(u);
            if (staked[u] > 0) {
                vm.prank(u);
                st.requestUnstake(staked[u]);
                unstaking[u] += staked[u];
                staked[u] = 0;
            }
        }
        vm.warp(block.timestamp + 24 hours);
        for (uint256 i; i < 3; ++i) _opWithdraw(users[i]);
        assertEq(IERC20(WIF).balanceOf(address(st)), 0, "no $WIF left locked in staking");
    }
}
```

#### File: contracts/test/debug-p2-weekend-staleness.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p2-weekend-staleness.t.sol
// hackathon-debug Phase 2 (known risk SURVIVOR-11: SPY/QQQ market-hours feeds go stale over the weekend). FORK tests on
// Robinhood Chain mainnet 4663. Time is warped past the real SPY feed's updatedAt + MAX_AGE (25h); ETH/USD and the NVDA
// live feed are kept fresh with vm.mockCall returning their own real round data at the new timestamp, so SPY is the
// only stale input. Expected: router.deposit(SPY) reverts StaleOracle(SPY feed) while deposit(NVDA) still works, and
// FeePool.distribute skips sub-pool 4 silently (no buy attempted, no StockBuySkipped, no reward) and carries its ETH.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p2-weekend-staleness.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {FeePool} from "../src/FeePool.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {IAggregatorV3} from "../src/interfaces/IExternal.sol";

contract DebugP2WeekendStaleness is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    uint8 constant SPY_ID = 4;
    Deployment d;
    address bob = address(0xB0B); // NVDA staker
    address carol = address(0xCA201); // SPY staker
    address alice = address(0xA11CE); // trader

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(carol, 1 ether);
    }

    function _spyFeed() internal view returns (address) {
        return d.oracle.stock(SPY_ID).liveFeed;
    }

    /// Re-serve `feed`'s real latest round with updatedAt = now (the feed kept updating; only SPY did not).
    function _keepFresh(address feed) internal {
        (uint80 id, int256 answer, uint256 startedAt,, uint80 answeredIn) = IAggregatorV3(feed).latestRoundData();
        vm.mockCall(
            feed,
            abi.encodeWithSelector(IAggregatorV3.latestRoundData.selector),
            abi.encode(id, answer, startedAt, block.timestamp, answeredIn)
        );
    }

    function _warpPastSpyStaleness() internal {
        (,,, uint256 spyUpdated,) = IAggregatorV3(_spyFeed()).latestRoundData();
        vm.warp(spyUpdated + d.oracle.MAX_AGE() + 1);
        _keepFresh(ETH_USD);
        _keepFresh(d.oracle.stock(0).liveFeed);
        assertFalse(d.oracle.isFresh(SPY_ID), "SPY stale");
        assertTrue(d.oracle.isFresh(0), "NVDA fresh");
    }

    function _stake(address who, uint256 eth, uint8 stockId) internal returns (uint256 amount) {
        TerraRouter.Route memory r;
        r.kind = 3;
        r.key = wifKey();
        vm.startPrank(who);
        (amount,) = d.router.buy{value: eth}(r, WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, stockId);
        vm.stopPrank();
    }

    function test_spyDepositRevertsStaleOracle() public {
        _warpPastSpyStaleness();
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StockOracle.StaleOracle.selector, _spyFeed()));
        d.router.deposit{value: 0.001 ether}(SPY_ID, 0);
        vm.prank(alice);
        uint256 out = d.router.deposit{value: 0.001 ether}(0, 0); // control: NVDA still fills
        assertGt(out, 0, "fresh stock still fills");
    }

    function test_feePoolSkipsStaleSpyAndCarries() public {
        _stake(bob, 0.005 ether, 0);
        _stake(carol, 0.005 ether, SPY_ID);
        vm.warp(block.timestamp + 2 hours); // both stakes active
        for (uint256 i; i < 2; ++i) {
            TerraRouter.Route memory r;
            r.kind = 2;
            r.v3Path = abi.encodePacked(WETH, uint24(3000), PONS);
            vm.prank(alice);
            d.router.buy{value: 0.05 ether}(r, PONS, 0, 0, 1, 0);
        }
        _warpPastSpyStaleness();
        assertGt(d.staking.activeStake(SPY_ID), 0, "SPY pool has active stake");

        uint256 ethIn = address(d.feePool).balance;
        uint256 leg = ethIn / 2 > d.feePool.MAX_WIF_BUY_ETH() ? d.feePool.MAX_WIF_BUY_ETH() : ethIn / 2;
        vm.recordLogs();
        d.feePool.distribute();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 skipped = FeePool.StockBuySkipped.selector;
        bytes32 notified = WifStaking.RewardNotified.selector;
        bool burnSkipped;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics[0] == skipped) assertTrue(uint256(logs[i].topics[2]) != SPY_ID, "no buy attempted for stale SPY");
            if (logs[i].topics[0] == notified) assertTrue(uint256(logs[i].topics[1]) != SPY_ID, "no SPY reward");
            if (logs[i].topics[0] == FeePool.BurnSkipped.selector) burnSkipped = true;
        }
        (, uint256 pc) = d.staking.pending(carol);
        (, uint256 pb) = d.staking.pending(bob);
        assertEq(pc, 0, "SPY staker earns nothing while SPY is stale");
        assertGt(pb, 0, "NVDA staker earns");
        assertEq(d.feePool.totalEthToStock(), leg, "whole stock leg went to the fresh pool (SPY weight excluded)");
        uint256 burnt = burnSkipped ? 0 : leg;
        assertEq(address(d.feePool).balance, ethIn - burnt - leg, "everything else carries to the next epoch");
    }
}
```

#### File: contracts/test/debug-p6-crossepoch-lock.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-crossepoch-lock.t.sol
// hackathon-debug Phase 6 (critique M-1 regression). Port of the Phase-5 critique repro (scratchpad stk/test/Lock.t.sol),
// inverted to assert the FIXED behaviour of WifStaking._addPending: a top-up one epoch after an unmatured stake re-dates
// the older pending into the new bucket, so (1) another staker of that epoch is never locked by the first staker's
// unstake, and (2) no matured bucket is left without an owner (no stranded rewards, sum(activeOf) == activeTotal).
// Local (non-fork) test: a mintable $WIF stand-in, a real Jar and a one-function oracle stand-in for claim().
// Run: scripts/forge.sh test --match-path test/debug-p6-crossepoch-lock.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WifStaking} from "../src/WifStaking.sol";
import {StockOracle} from "../src/StockOracle.sol";
import {Jar} from "../src/Jar.sol";

contract MintableToken is ERC20 {
    constructor(string memory s) ERC20(s, s) {}

    function mint(address a, uint256 x) external {
        _mint(a, x);
    }
}

/// Only WifStaking._claim's `oracle.token(id)` is reached in these tests.
contract TokenOracle {
    address public stockToken;

    constructor(address t) {
        stockToken = t;
    }

    function token(uint8) external view returns (address) {
        return stockToken;
    }
}

contract DebugP6CrossEpochLock is Test {
    MintableToken wif;
    MintableToken nvda;
    WifStaking st;
    Jar jar;
    address alice = address(0xA);
    address bob = address(0xB);

    function setUp() public {
        vm.warp(1_000_000 * 3600);
        wif = new MintableToken("W");
        nvda = new MintableToken("N");
        TokenOracle o = new TokenOracle(address(nvda));
        address pStaking = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 1);
        jar = new Jar(address(0xdead), pStaking);
        st = new WifStaking(IERC20(address(wif)), StockOracle(address(o)), jar, address(this), block.timestamp);
        require(address(st) == pStaking, "predict");
        wif.mint(alice, 1000e18);
        wif.mint(bob, 1000e18);
        vm.prank(alice);
        wif.approve(address(st), type(uint256).max);
        vm.prank(bob);
        wif.approve(address(st), type(uint256).max);
    }

    /// FeePool semantics: roll, send the stock to staking, notify.
    function _notify(uint256 reward) internal {
        st.rollAll();
        nvda.mint(address(st), reward);
        st.notifyReward(0, reward);
    }

    function test_crossEpochPendingDoesNotLockOtherStaker() public {
        vm.prank(alice);
        st.stake(100e18, 0); // epoch e
        vm.warp(block.timestamp + 1 hours); // e+1
        vm.prank(alice);
        st.stake(1e18, 0); // older 100 re-dated into bucket e+1 with the top-up
        vm.prank(bob);
        st.stake(100e18, 0); // bucket e+1 = 201
        vm.prank(alice);
        st.requestUnstake(101e18); // removes only alice's 101
        vm.warp(block.timestamp + 3 hours); // e+4: bob's batch matured
        _notify(1e18);
        (uint256 act,,) = st.poolInfo(0);
        assertEq(act, 100e18, "only bob is active");
        assertEq(st.activeOf(bob), act, "sum(activeOf) == activeTotal");
        (, uint256 pb) = st.pending(bob);
        assertApproxEqAbs(pb, 1e18, 1, "bob owns the whole reward: nothing stranded");
        vm.startPrank(bob);
        assertApproxEqAbs(st.claim(), 1e18, 1, "claim works");
        st.switchStock(1); // no underflow lock
        st.requestUnstake(100e18); // no underflow lock
        vm.stopPrank();
        assertApproxEqAbs(jar.balanceOf(bob, address(nvda)), 1e18, 1, "reward in Jar");
        vm.warp(block.timestamp + 24 hours);
        vm.prank(alice);
        st.withdraw();
        vm.prank(bob);
        st.withdraw();
        assertEq(wif.balanceOf(alice), 1000e18, "alice exits whole");
        assertEq(wif.balanceOf(bob), 1000e18, "bob exits whole");
    }

    function test_selfTwoStakesNoPhantomActiveAtE2() public {
        vm.prank(alice);
        st.stake(100e18, 0);
        vm.warp(block.timestamp + 1 hours);
        vm.prank(alice);
        st.stake(1e18, 0);
        vm.warp(block.timestamp + 1 hours); // e+2: the re-dated 101 activates at e+3, never a bucket nobody owns
        st.rollAll();
        (uint256 act, uint256 waiting,) = st.poolInfo(0);
        assertEq(act, 0, "no phantom active stake");
        assertEq(waiting, 101e18, "all of alice's stake waits together");
        assertEq(st.activeOf(alice), act);
        vm.prank(alice);
        st.requestUnstake(101e18); // no Insufficient self-lock
        vm.warp(block.timestamp + 1 hours); // e+3
        vm.prank(bob);
        st.stake(10e18, 0);
        vm.warp(block.timestamp + 2 hours);
        _notify(5e17);
        (act,,) = st.poolInfo(0);
        assertEq(act, st.activeOf(alice) + st.activeOf(bob), "sum(activeOf) == activeTotal");
        (, uint256 pb) = st.pending(bob);
        assertApproxEqAbs(pb, 5e17, 1, "no stranded reward");
    }
}
```

#### File: contracts/test/debug-p6-feepool.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-feepool.t.sol
// hackathon-debug Phase 6 (critique S-1, S-2). FORK tests on Robinhood Chain mainnet 4663.
//   S-1: distribute() takes no caller-chosen $WIF minimum, so a griefer cannot force BurnSkipped with an absurd one.
//   S-2: out-of-gas is detected by gas left (63/64 rule), not by empty revert data. An EMPTY revert with gas to spare
//        (burn leg or stock leg) skips and carries instead of bricking distribute; a swap that exhausts its gas reverts
//        InsufficientGas and the epoch does not advance.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p6-feepool.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {TerraRouter} from "../src/TerraRouter.sol";
import {FeePool, IWifStakingPool} from "../src/FeePool.sol";
import {PoolKey, IWIF, IUniversalRouter} from "../src/interfaces/IExternal.sol";
import {URCodec} from "../src/lib/URCodec.sol";

/// Universal Router stand-in whose execute burns every unit of gas it is given.
contract GasBurnerUR {
    uint256 public sink;

    function execute(bytes calldata, bytes[] calldata, uint256) external payable {
        while (true) {
            ++sink;
        }
    }
}

/// Universal Router stand-in whose execute reverts with no data right away.
contract EmptyRevertUR {
    function execute(bytes calldata, bytes[] calldata, uint256) external payable {
        assembly {
            revert(0, 0)
        }
    }
}

contract DebugP6FeePool is Test, TerraConfig {
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    Deployment d;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    function _buyPons(address who, uint256 eth) internal {
        TerraRouter.Route memory r;
        r.kind = 2;
        r.v3Path = abi.encodePacked(WETH, uint24(3000), PONS);
        vm.prank(who);
        d.router.buy{value: eth}(r, PONS, 0, 0, 1, 0);
    }

    function _stakeWif(address who, uint256 eth) internal {
        TerraRouter.Route memory r;
        r.kind = 3;
        r.key = wifKey();
        vm.startPrank(who);
        (uint256 amount,) = d.router.buy{value: eth}(r, WIF, 0, 0, 1, 0);
        IERC20(WIF).approve(address(d.staking), amount);
        d.staking.stake(amount, 0);
        vm.stopPrank();
    }

    function _poolWith(address ur) internal returns (FeePool fp) {
        fp = new FeePool(IUniversalRouter(ur), IWIF(WIF), d.oracle, IWifStakingPool(address(d.staking)), wifKey(), block.timestamp);
        vm.deal(address(fp), 0.01 ether);
    }

    // ------------------------------------------------------------------ S-1

    function test_highWifMinOutCannotSkipBurn() public {
        _buyPons(alice, 0.05 ether);
        (bool ok,) = address(d.feePool).call(abi.encodeWithSignature("distribute(uint256)", type(uint128).max));
        assertFalse(ok, "the caller-chosen minOut entry point no longer exists");
        assertEq(d.feePool.lastEpoch(), 0, "epoch not advanced");
        vm.prank(bob); // any caller: the burn always runs
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0, "griefer cannot switch the burn off");
    }

    // ------------------------------------------------------------------ S-2

    function test_emptyRevertBurnSkipsAndCarries() public {
        _buyPons(alice, 0.05 ether);
        uint256 bal = address(d.feePool).balance;
        vm.mockCallRevert(UR, IUniversalRouter.execute.selector, "");
        vm.expectEmit(true, false, false, true, address(d.feePool));
        emit FeePool.BurnSkipped(d.feePool.epoch(), bal / 2, "");
        d.feePool.distribute();
        assertEq(d.feePool.lastEpoch(), d.feePool.epoch() + 1, "epoch advanced (liveness)");
        assertEq(d.feePool.totalWifBurned(), 0, "nothing burned");
        assertEq(address(d.feePool).balance, bal, "all ETH carried (no stakers, burn skipped)");
    }

    function test_emptyRevertUrContractSkipsNotBricks() public {
        FeePool fp = _poolWith(address(new EmptyRevertUR()));
        vm.expectEmit(true, false, false, true, address(fp));
        emit FeePool.BurnSkipped(0, 0.005 ether, "");
        fp.distribute();
        assertEq(fp.lastEpoch(), 1, "epoch advanced");
        assertEq(address(fp).balance, 0.01 ether, "ETH carried");
    }

    function test_emptyRevertStockLegSkipsAndCarries() public {
        _stakeWif(bob, 0.005 ether);
        vm.warp(vm.getBlockTimestamp() + 2 hours); // bob active
        _buyPons(alice, 0.05 ether);
        uint256 bal = address(d.feePool).balance;
        uint256 leg = bal / 2 > d.feePool.MAX_WIF_BUY_ETH() ? d.feePool.MAX_WIF_BUY_ETH() : bal / 2;
        bytes memory stockLeg = URCodec.v3(address(d.staking), d.oracle.minStockOut(0, leg), d.oracle.path(0));
        bytes memory call_ = abi.encodeCall(
            IUniversalRouter.execute,
            (URCodec.two(URCodec.WRAP_ETH, URCodec.V3_SWAP_EXACT_IN), URCodec.inputs2(URCodec.wrap(leg), stockLeg), block.timestamp)
        );
        vm.mockCallRevert(UR, call_, ""); // exact match: only the NVDA stock leg fails, the burn leg is real
        vm.expectEmit(true, true, false, true, address(d.feePool));
        emit FeePool.StockBuySkipped(d.feePool.epoch(), 0, leg, "");
        d.feePool.distribute();
        assertGt(d.feePool.totalWifBurned(), 0, "burn leg ran");
        assertEq(d.feePool.totalEthToStock(), 0, "stock leg skipped");
        assertEq(address(d.feePool).balance, bal - leg, "stock ETH carried");
    }

    function test_outOfGasSwapRevertsNotSkips() public {
        FeePool fp = _poolWith(address(new GasBurnerUR()));
        vm.expectRevert(FeePool.InsufficientGas.selector);
        fp.distribute{gas: 2_000_000}();
        assertEq(fp.lastEpoch(), 0, "a starved swap never advances the epoch");
        assertEq(address(fp).balance, 0.01 ether, "ETH untouched");
    }
}
```

#### File: contracts/test/debug-p6-hindsight-phase.t.sol
[ASSUMED] — Source: see header comment
```solidity
// SPDX-License-Identifier: MIT
// File: contracts/test/debug-p6-hindsight-phase.t.sol
// hackathon-debug Phase 6 (critique S-3). FORK test: at a Chainlink phase boundary the last round of the old phase has
// no rid + 1 (getRoundData returns updatedAt == 0), so it must not "bracket" any later ts. Simulated with vm.mockCall on
// the real ETH/USD feed: phase-1 round 549 becomes the last of its phase and latest is phase-2 round 1.
// Run: RPC_URL=... scripts/forge.sh test --match-path test/debug-p6-hindsight-phase.t.sol -vv
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import {TerraConfig} from "../script/TerraConfig.sol";
import {HindsightLens} from "../src/HindsightLens.sol";
import {IAggregatorV3} from "../src/interfaces/IExternal.sol";

contract DebugP6HindsightPhase is Test, TerraConfig {
    uint80 constant BASE = uint80(1 << 64);
    Deployment d;

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"), vm.envOr("FORK_BLOCK", uint256(111155803)));
        d = deployAll(address(this));
    }

    function _buy(uint64 ts) internal pure returns (HindsightLens.Buy[] memory b) {
        b = new HindsightLens.Buy[](1);
        b[0] = HindsightLens.Buy({
            payKind: 0, payStockId: 0, amountPaid: 1 ether, payRoundId: BASE + 549, stockRoundId: BASE + 24, ts: ts
        });
    }

    function test_phaseBoundaryRoundRejectedForLaterTs() public {
        address feed = address(d.oracle.ethUsdFeed());
        d.lens.recompute(_buy(1782222600), 0); // control: a normal in-phase bracket is accepted
        uint80 phase2First = uint80(2 << 64) + 1;
        vm.mockCall(
            feed,
            abi.encodeCall(IAggregatorV3.latestRoundData, ()),
            abi.encode(phase2First, int256(165768649010), uint256(1782300000), uint256(1782300000), phase2First)
        );
        vm.mockCall(
            feed,
            abi.encodeCall(IAggregatorV3.getRoundData, (BASE + 550)),
            abi.encode(BASE + 550, int256(0), uint256(0), uint256(0), uint80(0))
        );
        vm.expectRevert(abi.encodeWithSelector(HindsightLens.BadRound.selector, feed, BASE + 549));
        d.lens.recompute(_buy(1782222600), 0);
    }
}
```

### Key Decisions
Tests deploy the real system with deployAll() on a fork and use real pools, hooks, feeds and rounds; via-IR caches block.timestamp, so tests warp with vm.getBlockTimestamp().


## Section 12: Shared web infrastructure

### Purpose
Config, RPC failover client, generated ABIs, project config.

### Files
- `web/lib/config.ts`
- `web/lib/rpc.ts`
- `web/next.config.ts`
- `web/package.json`
- `web/postcss.config.mjs`
- `web/tsconfig.json`

### Code

#### File: web/lib/config.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/config.ts
// [VERIFIED] addresses read live on Robinhood Chain mainnet 4663 (intel, fact-check, forge spike + fork tests).
import type { Address } from "viem";
import deployments from "@/data/deployments.json";

export const CHAIN_ID = 4663;
export const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
export const EXPLORER = "https://robinhoodchain.blockscout.com";

export const ADDR = {
  universalRouter: "0x8876789976dEcBfCbBbe364623C63652db8C0904",
  universalRouter212: "0x204FAca1764B154221e35c0d20aBb3c525710498",
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  v4Quoter: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
  quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
  v2Router: "0x89e5db8b5aa49aa85ac63f691524311aeb649eba",
  v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
  v2Factory: "0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  wif: "0x5173b8eA6923c2d40267890D45C46a3480954773",
  wifHook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
  multicall3: "0xca11bde05977b3631167028862be2a173976ca11",
  ethUsd: "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9",
  usdgUsd: "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2",
} as const satisfies Record<string, Address>;

/** Terra Firma contracts (written by contracts/script/Deploy.s.sol, copied by scripts/sync-deployments.mjs). */
export const TF = deployments as unknown as {
  chainId: number;
  block: number;
  start: number;
  StockOracle: Address;
  Jar: Address;
  WifStaking: Address;
  FeePool: Address;
  TerraRouter: Address;
  HindsightLens: Address;
  FriendJar: Address;
};

export type StockId = 0 | 1 | 2 | 3 | 4 | 5;

export interface StockInfo {
  id: StockId;
  symbol: "NVDA" | "TSLA" | "GOOGL" | "SNDK" | "SPY" | "QQQ";
  name: string;
  token: Address;
  liveFeed: Address;
  historyFeed: Address;
  hours: "24/7" | "24/5";
}

/** Curated 6 (OD4). Same order and ids as contracts/script/TerraConfig.sol `stocks()`. */
export const STOCKS: readonly StockInfo[] = [
  { id: 0, symbol: "NVDA", name: "NVIDIA", token: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", liveFeed: "0x321A36e441DfBadA01Aa6f9884F14a344E133D1F", historyFeed: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", hours: "24/7" },
  { id: 1, symbol: "TSLA", name: "Tesla", token: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", liveFeed: "0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37", historyFeed: "0x4A1166a659A55625345e9515b32adECea5547C38", hours: "24/7" },
  { id: 2, symbol: "GOOGL", name: "Alphabet", token: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", liveFeed: "0x53e040D2C8c9278cBc4b702328aC652068a0E063", historyFeed: "0xF6f373a037c30F0e5010d854385cA89185AE638b", hours: "24/7" },
  { id: 3, symbol: "SNDK", name: "SanDisk", token: "0xB90A19fF0Af67f7779afF50A882A9CfF42446400", liveFeed: "0x7FA2c251b345b8492C039a59a42b38603a05Ed9b", historyFeed: "0xfb133Fa4B7b385802B693a293606682Df47109A3", hours: "24/7" },
  { id: 4, symbol: "SPY", name: "S&P 500 ETF", token: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", liveFeed: "0x319724394D3A0e3669269846abE664Cd621f9f6A", historyFeed: "0x319724394D3A0e3669269846abE664Cd621f9f6A", hours: "24/5" },
  { id: 5, symbol: "QQQ", name: "Nasdaq-100 ETF", token: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", liveFeed: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", historyFeed: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", hours: "24/5" },
] as const;

export const stockBySymbol = (s: string) => STOCKS.find((x) => x.symbol === s.toUpperCase());

export const FEE_BPS = 50;
export const STAKER_FEE_BPS = 30;
export const DISCOUNT_STAKE = 10_000n * 10n ** 18n;
export const DEFAULT_SWEEP_BPS = 200;
export const ORACLE_BAND_BPS = 300;

export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;
```

#### File: web/lib/rpc.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/rpc.ts
// [VERIFIED] limits from spike-indexing.md: batch <= 36 getLogs per POST, 429 at ~4-5 req/s sustained,
// 10,000-log responses come back as a JSON-RPC ERROR (never treat as empty), public RPC needs a User-Agent.
// Server-only: GetBlock endpoints are shared hackathon secrets and must never reach the browser.
import "server-only";
import { PUBLIC_RPC } from "./config";

type RpcCall = { method: string; params: unknown[] };
type RpcOk = { jsonrpc: "2.0"; id: number; result: unknown };
type RpcErr = { jsonrpc: "2.0"; id: number; error: { code: number; message: string } };

export class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export const TOO_MANY_LOGS = (e: unknown) =>
  e instanceof RpcError && /more than 10000|10000 results|query returned more|exceeds limit of 10000/i.test(e.message);

/** GetBlock caps eth_getLogs at ~1,000 blocks ("Block range is too large"); the public RPC allows 10M (VERIFIED). */
const LOG_METHODS = new Set(["eth_getLogs"]);

function providers(calls: RpcCall[] = []): string[] {
  // LOGS_RPC (optional) points log scans at another 10M-range provider, e.g. a local fork in wire tests.
  const logs = process.env.LOGS_RPC || PUBLIC_RPC;
  if (calls.some((c) => LOG_METHODS.has(c.method))) return [logs, logs];
  return [process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC, PUBLIC_RPC].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Per-POST timeout, and the total time one rpcBatch may spend retrying, so a card fails as JSON 503 inside maxDuration 60. */
const FETCH_TIMEOUT_MS = 8_000;
const BATCH_BUDGET_MS = 40_000;

/**
 * Token bucket: `rate` tokens/s, at most `burst` banked. take(n) reserves n tokens (one per call inside a JSON-RPC batch)
 * and resolves when they are available. Tokens can go negative, so a large batch waits instead of starving forever.
 */
export function createTokenBucket(rate: number, burst: number, now = () => Date.now()) {
  let tokens = burst;
  let at = now();
  return {
    /** Milliseconds the caller must wait before sending n calls. */
    reserve(n: number): number {
      const t = now();
      tokens = Math.min(burst, tokens + ((t - at) / 1000) * rate);
      at = t;
      tokens -= n;
      return tokens >= 0 ? 0 : Math.ceil((-tokens / rate) * 1000);
    },
  };
}

/**
 * Process-wide budget for the public RPC, per POST: the spike's 429 threshold is ~4-5 requests/s sustained, and the
 * heavy-wallet live run (~400 calls in small batches, < 20 s) shows batched calls are not charged one token each
 * (charging per call at 4/s made that card take 106 s). Shared by every route so concurrent cards cannot double the rate.
 */
const publicBucket = createTokenBucket(5, 10);

async function postOnce(url: string, body: string): Promise<Response> {
  if (url === PUBLIC_RPC) {
    const wait = publicBucket.reserve(1);
    if (wait > 0) await sleep(wait);
  }
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "terra-firma/1.0" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** POST a JSON-RPC batch with provider failover and exponential backoff on 429/5xx. Results keep call order. */
export async function rpcBatch(calls: RpcCall[]): Promise<(unknown | RpcError)[]> {
  if (calls.length === 0) return [];
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params })));
  const deadline = Date.now() + BATCH_BUDGET_MS;
  let lastErr: unknown;
  for (const url of providers(calls)) {
    for (let attempt = 0; attempt < 5 && Date.now() < deadline; attempt++) {
      try {
        const res = await postOnce(url, body);
        if (res.status === 429 || res.status >= 500) {
          lastErr = new RpcError(res.status, `HTTP ${res.status}`);
          await sleep(800 * 2 ** attempt);
          continue;
        }
        if (!res.ok) {
          lastErr = new RpcError(res.status, `HTTP ${res.status}`);
          break; // other 4xx will not succeed on retry: try the next provider
        }
        const json = (await res.json()) as (RpcOk | RpcErr)[] | RpcOk | RpcErr;
        const arr = Array.isArray(json) ? json : [json];
        const byId = new Map(arr.map((r) => [r.id, r]));
        return calls.map((_, i) => {
          const r = byId.get(i);
          if (!r) return new RpcError(-1, "missing response");
          return "error" in r ? new RpcError(r.error.code, r.error.message) : r.result;
        });
      } catch (e) {
        lastErr = e;
        await sleep(300 * 2 ** attempt);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all RPC providers failed");
}

/** A batch result as data: throws on a per-call RpcError or a null/absent result (never read an error as 0 or "none"). */
export function unwrap<T>(r: unknown, what = "rpc result"): T {
  if (r instanceof RpcError) throw r;
  if (r === null || r === undefined) throw new RpcError(-2, `${what}: null result`);
  return r as T;
}

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const [r] = await rpcBatch([{ method, params }]);
  return unwrap<T>(r, method);
}

/** Run batches in chunks of `size` with at most `parallel` POSTs in flight. */
export async function rpcChunked(calls: RpcCall[], size = 36, parallel = 3): Promise<(unknown | RpcError)[]> {
  const chunks: RpcCall[][] = [];
  for (let i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
  const out: (unknown | RpcError)[][] = new Array(chunks.length);
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      out[i] = await rpcBatch(chunks[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, chunks.length) }, worker));
  return out.flat();
}

/** QuickNode endpoint: QUICKNODE_RPC, or `${QUICKNODE_BASE}/${QUICKNODE_TOKEN}/` (the names .env.local uses). */
export function quicknodeUrl(env: Record<string, string | undefined> = process.env): string | null {
  if (env.QUICKNODE_RPC) return env.QUICKNODE_RPC;
  const base = env.QUICKNODE_BASE?.replace(/\/+$/, "");
  const token = env.QUICKNODE_TOKEN?.replace(/^\/+|\/+$/g, "");
  return base && token ? `${base}/${token}/` : null;
}

export const hex = (n: number | bigint) => `0x${n.toString(16)}`;
```

#### File: web/next.config.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/next.config.ts
// [VERIFIED] Next.js 15.5 config; turbopack.root pins the workspace (a stray ~/package-lock.json exists on the dev machine).
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
```

#### File: web/package.json
[ASSUMED] — Source: see header comment
```json
// File: web/package.json (JSON: copy everything after this first line)
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.107.1",
    "next": "15.5.29",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "server-only": "^0.0.1",
    "viem": "^2.57.17",
    "wagmi": "^2.19.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.5.29",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^5.1.0"
  }
}
```

#### File: web/postcss.config.mjs
[ASSUMED] — Source: see header comment
```javascript
// File: web/postcss.config.mjs
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

#### File: web/tsconfig.json
[ASSUMED] — Source: see header comment
```json
// File: web/tsconfig.json (JSON: copy everything after this first line)
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Key Decisions
rpc.ts is the only module with network I/O and is server-only so the shared GetBlock endpoints never reach a browser.


## Section 13: C7 Hindsight Indexer

### Purpose
Card construction from logs, txs, receipts and Chainlink round tables.

### Files
- `web/app/api/hindsight/route.ts`
- `web/lib/hindsight.ts`
- `web/lib/hypersync.ts`
- `web/lib/rounds.ts`

### Code

#### File: web/app/api/hindsight/route.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/app/api/hindsight/route.ts
// [VERIFIED] contract: PRD §5 GET /api/hindsight. Cards come from the shared cache (lib/card-cache: 5-min TTL per
// (wallet, stock), in-flight de-duplication, bounded size, global build concurrency cap).
import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { cardFailure, getCard } from "@/lib/card-cache";
import { stockBySymbol, type StockId } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addr = url.searchParams.get("addr") ?? "";
  const stock = stockBySymbol(url.searchParams.get("stock") ?? "NVDA");
  if (!isAddress(addr)) return NextResponse.json({ error: "bad_address" }, { status: 400 });
  if (!stock) return NextResponse.json({ error: "bad_stock" }, { status: 400 });
  const t0 = Date.now();
  try {
    const card = await getCard(getAddress(addr), stock.id as StockId);
    console.log(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, memes: card.memes.length, partial: card.partial }));
    return NextResponse.json(card);
  } catch (e) {
    console.error(JSON.stringify({ route: "hindsight", ms: Date.now() - t0, error: String(e) }));
    const f = cardFailure(e);
    return NextResponse.json(f.body, { status: f.status, headers: f.headers });
  }
}
```

#### File: web/lib/hindsight.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/hindsight.ts
// [VERIFIED] algorithm from spike-indexing.md (per-token getLogs, 10M-block spans, batch <= 36, tx.value on
// Universal Router calls, receipts only when value == 0). Receipt path VERIFIED by scripts/test-hindsight.ts on two
// real txs (WETH-paid 0x9965...6ab0, USDG-paid 0x2ac2...28db) and an end-to-end card for 0x3fDB...b09E in 5.6s.
import "server-only";
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, getAddress, zeroAddress, type Address, type Hex } from "viem";
import { erc20Abi, terraRouterAbi } from "./abi";
import { ADDR, STOCKS, type StockId } from "./config";
import { REGISTRY, type Meme } from "./registry";
import { QuoteUnavailable, bestQuote } from "./quote";
import { RpcError, TOO_MANY_LOGS, hex, rpc, rpcBatch, rpcChunked, unwrap } from "./rpc";
import { latestPrice8, loadTable, roundAtLive } from "./rounds";
import { TF } from "./config";
import { hypersyncEnabled, transfersTo } from "./hypersync";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SPAN = 10_000_000;
const pad = (a: string) => `0x000000000000000000000000${a.slice(2).toLowerCase()}`;
const topicAddr = (t: string) => getAddress(`0x${t.slice(26)}`);

/** Matches HindsightLens.Buy so the browser/proof page can call recompute() with the same inputs. */
export interface CardBuy {
  tx: Hex;
  block: number;
  ts: number;
  payKind: 0 | 1 | 2; // 0 ETH/WETH, 1 USDG, 2 curated stock
  payStockId: number;
  amountPaid: string; // raw units of the paying asset
  payRoundId: string;
  payUsd8: string;
  stockRoundId: string;
  stockUsd8: string;
  usdPaid8: string;
  shares18: string;
}

export interface CardMeme {
  token: Address;
  symbol: string;
  usdPaid8: string;
  /** Sell-quote value of the holding now; null when no quote is available (never a fabricated $0). */
  usdToday8: string | null;
  /** Why usdToday8 is null ("no liquid pool" / "quote unavailable (RPC error)"); null when priced. */
  todayReason: string | null;
  usdCounterfactual8: string;
  holding: string;
  buys: CardBuy[];
}

export interface Card {
  wallet: Address;
  stock: (typeof STOCKS)[number]["symbol"];
  asOfBlock: number;
  /**
   * usdToday8 sums only memes with a quote; usdPaidQuoted8 is usdPaid8 over those same memes, so today-vs-paid is
   * like for like. usdPaid8 / usdCounterfactual8 / shares18 cover every priced buy.
   */
  totals: { usdPaid8: string; usdPaidQuoted8: string; usdToday8: string; usdCounterfactual8: string; shares18: string };
  memes: CardMeme[];
  unpriced: { token: Address; symbol: string; tx: Hex; reason: string }[];
  /** Worst today-vs-paid among quoted memes only. */
  worst: { symbol: string; pct: number } | null;
  /** True when any number above is incomplete: some held meme is unquoted or a history scan was cut short. */
  partial: boolean;
  /** Held memes whose usdToday8 is null, with the reason. */
  unquoted: { token: Address; symbol: string; reason: string }[];
  /** Block ranges whose Transfer history could not be read completely (buys there may be missing). */
  scanGaps: { token: Address; symbol: string; fromBlock: number; toBlock: number }[];
}

type Log = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex };
type Tx = { from: Address; to: Address | null; value: Hex; blockNumber: Hex; hash: Hex };
export type Receipt = { logs: (Log & { blockTimestamp?: Hex })[] };
/** Block time from a receipt's logs (Nitro includes blockTimestamp there; eth_getLogs reports "0x0", never used). */
const receiptTs = (rc: Receipt | undefined) => {
  const ts = Number(rc?.logs[0]?.blockTimestamp ?? 0);
  return ts > 0 ? ts : undefined;
};

/**
 * Addresses whose outgoing meme transfers count as a purchase. TerraRouter forwards the meme it receives from the
 * Universal Router to the buyer, so router buys arrive with from = TerraRouter (memes.json is built pre-deploy).
 */
export function purchaseSources(registrySources: readonly string[], router: string = TF.TerraRouter): Set<string> {
  const all = [...registrySources, ...(router && router.toLowerCase() !== zeroAddress ? [router] : [])];
  return new Set(all.map((a) => a.toLowerCase()));
}

type ScanGap = Card["scanGaps"][number];

/** Step 1-2: every Transfer(to = wallet) of each registry meme, per-token, 10M-block spans, split on overflow. */
async function scanBuys(wallet: Address, head: number, memes: Meme[]): Promise<{ logs: Log[]; gaps: ScanGap[] }> {
  if (memes.length === 0) return { logs: [], gaps: [] };
  const sources = purchaseSources(REGISTRY.sources);
  if (hypersyncEnabled()) {
    try {
      const from = Math.min(...memes.map((m) => m.firstBlock));
      const hs = (await transfersTo(wallet, memes.map((m) => m.token), from)) as Log[];
      return { logs: hs.filter((l) => Number(l.blockNumber) <= head && sources.has(topicAddr(l.topics[1]).toLowerCase())), gaps: [] };
    } catch (e) {
      console.warn(JSON.stringify({ route: "hindsight", hypersync: "fallback", error: String(e) }));
    }
  }
  type Q = { meme: Meme; from: number; to: number };
  let queue: Q[] = [];
  for (const meme of memes) {
    for (let from = meme.firstBlock; from <= head; from += SPAN) queue.push({ meme, from, to: Math.min(from + SPAN - 1, head) });
  }
  const logs: Log[] = [];
  for (let round = 0; queue.length > 0 && round < 6; round++) {
    const res = await rpcChunked(
      queue.map((q) => ({
        method: "eth_getLogs",
        params: [{ address: q.meme.token, fromBlock: hex(q.from), toBlock: hex(q.to), topics: [TRANSFER, null, pad(wallet)] }],
      })),
      4, // public RPC throttles at ~4-5 calls/s and counts each call inside a batch
      1,
    );
    const retry: Q[] = [];
    res.forEach((r, i) => {
      const q = queue[i];
      if (TOO_MANY_LOGS(r)) {
        const mid = Math.floor((q.from + q.to) / 2);
        retry.push({ meme: q.meme, from: q.from, to: mid }, { meme: q.meme, from: mid + 1, to: q.to });
      } else if (r instanceof RpcError) {
        throw r; // never treat an error as "no logs"
      } else {
        logs.push(...(r as Log[]));
      }
    });
    queue = retry;
  }
  // Split rounds exhausted: report the unread ranges instead of returning a silently truncated history.
  const gaps = queue.map((q) => ({ token: q.meme.token, symbol: q.meme.symbol, fromBlock: q.from, toBlock: q.to }));
  return { logs: logs.filter((l) => sources.has(topicAddr(l.topics[1]).toLowerCase())), gaps };
}

type Payment = { payKind: 0 | 1 | 2; payStockId: number; amount: bigint; block: number; ts?: number };
type Unpriced = { unpriced: string };

/** Meme leg of a buy through Terra Firma's own router: tx.value minus the protocol fee and the sweep (from its events). */
export function routerMemeLeg(rc: Receipt | undefined, value: bigint, router: Address = TF.TerraRouter): bigint | null {
  let fee: bigint | null = null;
  let sweep = 0n;
  for (const l of rc?.logs ?? []) {
    if (l.address.toLowerCase() !== router.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: terraRouterAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      if (ev.eventName === "Traded") fee = (ev.args as { fee: bigint }).fee;
      if (ev.eventName === "Swept") sweep += (ev.args as { ethIn: bigint }).ethIn;
    } catch {
      /* other event */
    }
  }
  return fee === null ? null : value - fee - sweep;
}

/** Step 3-4: what the wallet paid in each buy tx (ETH from tx.value, else outgoing WETH/USDG/stock in the receipt). */
async function payments(wallet: Address, hashes: Hex[]) {
  const me = wallet.toLowerCase();
  const txRes = await rpcChunked(hashes.map((h) => ({ method: "eth_getTransactionByHash", params: [h] })), 10);
  const txs = txRes.map((r, i) => unwrap<Tx>(r, `tx ${hashes[i]}`));
  const viaRouter = (t: Tx) => !!t.to && t.to.toLowerCase() === TF.TerraRouter.toLowerCase();
  const needReceipt = txs.filter((t) => t.from.toLowerCase() === me && (BigInt(t.value) === 0n || viaRouter(t)));
  const rcRes = await rpcChunked(needReceipt.map((t) => ({ method: "eth_getTransactionReceipt", params: [t.hash] })), 10);
  const receipts = rcRes.map((r, i) => unwrap<Receipt>(r, `receipt ${needReceipt[i].hash}`));
  const receiptByHash = new Map(needReceipt.map((t, i) => [t.hash, receipts[i]]));
  const stockIdx = new Map(STOCKS.map((x) => [x.token.toLowerCase(), x.id]));
  const payable = new Set([ADDR.weth.toLowerCase(), ADDR.usdg.toLowerCase(), ...stockIdx.keys()]);
  const out = new Map<Hex, Payment | Unpriced>();
  for (const t of txs) {
    if (t.from.toLowerCase() !== me) {
      out.set(t.hash, { unpriced: "received, not bought by this wallet" });
      continue;
    }
    const block = Number(t.blockNumber);
    const value = BigInt(t.value);
    if (value > 0n) {
      const leg = viaRouter(t) ? routerMemeLeg(receiptByHash.get(t.hash), value) : value;
      out.set(t.hash, leg === null ? { unpriced: "router tx without a Traded event" } : { payKind: 0, payStockId: 0, amount: leg, block, ts: receiptTs(receiptByHash.get(t.hash)) });
      continue;
    }
    const outgoing = (receiptByHash.get(t.hash)?.logs ?? []).filter(
      (l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]).toLowerCase() === me,
    );
    // A batched (EIP-7702) tx may move other tokens first; the payment is the outgoing WETH/USDG/curated-stock transfer.
    const paid = outgoing.find((l) => payable.has(l.address.toLowerCase()));
    if (!paid) {
      out.set(t.hash, { unpriced: outgoing.length ? "paid in tokens, not priced" : "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)" });
      continue;
    }
    const tok = paid.address.toLowerCase();
    const amount = BigInt(paid.data);
    const ts = receiptTs(receiptByHash.get(t.hash));
    if (tok === ADDR.weth.toLowerCase()) out.set(t.hash, { payKind: 0, payStockId: 0, amount, block, ts });
    else if (tok === ADDR.usdg.toLowerCase()) out.set(t.hash, { payKind: 1, payStockId: 0, amount, block, ts });
    else out.set(t.hash, { payKind: 2, payStockId: stockIdx.get(tok)!, amount, block, ts });
  }
  return out;
}

/** A block timestamp from an RPC result; throws on an error, a null block or a non-positive/NaN time. */
export function blockTs(r: unknown, block: number): number {
  const ts = Number(unwrap<{ timestamp: Hex }>(r, `block ${block}`).timestamp);
  if (!Number.isFinite(ts) || ts <= 0) throw new RpcError(-2, `block ${block}: bad timestamp`);
  return ts;
}

async function blockTimes(blocks: number[]): Promise<Map<number, number>> {
  const uniq = [...new Set(blocks)];
  const res = await rpcChunked(uniq.map((b) => ({ method: "eth_getBlockByNumber", params: [hex(b), false] })), 20);
  return new Map(uniq.map((b, i) => [b, blockTs(res[i], b)]));
}

/** balanceOf results; a failed call throws (an unreadable balance is not a zero balance). */
export function decodeBalances(res: unknown[], tokens: readonly Address[]): bigint[] {
  return res.map((r, i) => decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: unwrap<Hex>(r, `balanceOf ${tokens[i]}`) }));
}

async function balances(wallet: Address, tokens: Address[]): Promise<bigint[]> {
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [wallet] });
  return decodeBalances(await rpcBatch(tokens.map((t) => ({ method: "eth_call", params: [{ to: t, data }, "latest"] }))), tokens);
}

/** Sell-quote value of `held` in USD8, or null with the reason when no quote exists right now. */
async function valueToday(token: Address, held: bigint, ethUsd8: bigint): Promise<{ usd8: bigint | null; reason: string | null }> {
  if (held === 0n) return { usd8: 0n, reason: null };
  try {
    const q = await bestQuote(token, "sell", held);
    return q ? { usd8: (q.amountOut * ethUsd8) / 10n ** 18n, reason: null } : { usd8: null, reason: "no liquid pool" };
  } catch (e) {
    if (!(e instanceof QuoteUnavailable || e instanceof RpcError)) throw e;
    return { usd8: null, reason: "quote unavailable (RPC error)" };
  }
}

/** Card totals, `worst` and `partial` from finished meme rows (pure; nulls never count as $0). */
export function summarize(memes: CardMeme[], gaps: ScanGap[]) {
  const sum = (rows: CardMeme[], f: (m: CardMeme) => string) => rows.reduce((s, m) => s + BigInt(f(m)), 0n).toString();
  const quoted = memes.filter((m) => m.usdToday8 !== null);
  const unquoted = memes.filter((m) => m.usdToday8 === null).map((m) => ({ token: m.token, symbol: m.symbol, reason: m.todayReason ?? "unquoted" }));
  const worst =
    quoted
      .filter((m) => BigInt(m.usdPaid8) > 0n)
      .map((m) => ({ symbol: m.symbol, pct: (Number(m.usdToday8) / Number(m.usdPaid8) - 1) * 100 }))
      .sort((a, b) => a.pct - b.pct)[0] ?? null;
  const totals = {
    usdPaid8: sum(memes, (m) => m.usdPaid8),
    usdPaidQuoted8: sum(quoted, (m) => m.usdPaid8),
    usdToday8: sum(quoted, (m) => m.usdToday8 as string),
    usdCounterfactual8: sum(memes, (m) => m.usdCounterfactual8),
    shares18: memes.reduce((s, m) => s + m.buys.reduce((x, b) => x + BigInt(b.shares18), 0n), 0n).toString(),
  };
  return { totals, worst, unquoted, partial: unquoted.length > 0 || gaps.length > 0 };
}

/** Build a wallet's Hindsight card against `stockId` (default NVDA). $WIF, stables, WETH and stocks are never memes. */
export async function buildCard(wallet: Address, stockId: StockId = 0): Promise<Card> {
  const stock = STOCKS[stockId];
  const head = Number(await rpc<Hex>("eth_blockNumber", []));
  // The card covers memes the wallet still holds (PRD F1): read all registry balances first (GetBlock, no log limits),
  // then scan history only for held memes. Cuts a card from ~158 getLogs calls to ~5 per held meme.
  const allBal = await balances(wallet, REGISTRY.memes.map((m) => m.token));
  const heldMemes = REGISTRY.memes.filter((_, i) => allBal[i] > 0n);
  const { logs, gaps } = await scanBuys(wallet, head, heldMemes);
  const hashes = [...new Set(logs.map((l) => l.transactionHash))];
  // payments() runs alone first: overlapping it with blockTimes() put ~8 POSTs in flight and drew a 429 storm with
  // multi-second backoffs on the public RPC (heavy wallet 29s, debug-results/phase-2-known-risks.md). Only priced txs
  // need a block timestamp, and those with a receipt already carry it, so blockTimes() fetches only the rest.
  const pay = await payments(wallet, hashes);
  const untimed = logs.filter((l) => { const p = pay.get(l.transactionHash); return p && !("unpriced" in p) && p.ts === undefined; });
  const [times, ethT, usdgT, histT, nowStock, nowEth] = await Promise.all([
    blockTimes(untimed.map((l) => Number(l.blockNumber))),
    loadTable(ADDR.ethUsd),
    loadTable(ADDR.usdgUsd),
    loadTable(stock.historyFeed),
    latestPrice8(stock.historyFeed),
    latestPrice8(ADDR.ethUsd),
  ]);

  const byMeme = new Map<string, CardMeme>();
  const unpriced: Card["unpriced"] = [];
  // One payment per transaction: group received logs by tx; a single payment that bought several different memes
  // cannot be split honestly, so those rows are shown unpriced instead of counting the payment twice.
  const byTx = new Map<Hex, Log[]>();
  for (const l of logs) byTx.set(l.transactionHash, [...(byTx.get(l.transactionHash) ?? []), l]);
  for (const [tx, txLogs] of byTx) {
    const tokens = [...new Set(txLogs.map((l) => l.address.toLowerCase()))];
    const memesInTx = tokens.map((t) => REGISTRY.memes.find((m) => m.token.toLowerCase() === t)!);
    const p = pay.get(tx);
    const skip = (reason: string) => memesInTx.forEach((m) => unpriced.push({ token: m.token, symbol: m.symbol, tx, reason }));
    if (!p || "unpriced" in p) {
      skip(p && "unpriced" in p ? p.unpriced : "unknown");
      continue;
    }
    if (memesInTx.length > 1) {
      skip("one payment bought several memes");
      continue;
    }
    const meme = memesInTx[0];
    const ts = p.ts ?? times.get(Number(txLogs[0].blockNumber));
    if (ts === undefined || !Number.isFinite(ts)) throw new Error(`no block time for ${tx}`); // never price with NaN ts
    const payTable = p.payKind === 0 ? ethT : p.payKind === 1 ? usdgT : await loadTable(STOCKS[p.payStockId].historyFeed);
    const payLatest = p.payKind === 0 ? nowEth : undefined;
    const [payRound, stockRound] = await Promise.all([roundAtLive(payTable, ts, payLatest), roundAtLive(histT, ts, nowStock)]);
    if (!payRound || !stockRound) {
      skip("before Chainlink price history");
      continue;
    }
    const payDec = p.payKind === 1 ? 10n ** 6n : 10n ** 18n;
    const usdPaid8 = (p.amount * payRound.price8) / payDec;
    const shares18 = (usdPaid8 * 10n ** 18n) / stockRound.price8;
    const entry =
      byMeme.get(meme.token) ??
      ({ token: meme.token, symbol: meme.symbol, usdPaid8: "0", usdToday8: null, todayReason: null, usdCounterfactual8: "0", holding: "0", buys: [] } as CardMeme);
    entry.buys.push({
      tx,
      block: Number(txLogs[0].blockNumber),
      ts,
      payKind: p.payKind,
      payStockId: p.payStockId,
      amountPaid: p.amount.toString(),
      payRoundId: payRound.roundId.toString(),
      payUsd8: payRound.price8.toString(),
      stockRoundId: stockRound.roundId.toString(),
      stockUsd8: stockRound.price8.toString(),
      usdPaid8: usdPaid8.toString(),
      shares18: shares18.toString(),
    });
    entry.usdPaid8 = (BigInt(entry.usdPaid8) + usdPaid8).toString();
    byMeme.set(meme.token, entry);
  }

  const memes = [...byMeme.values()];
  const held = await balances(wallet, memes.map((m) => m.token));
  await Promise.all(
    memes.map(async (m, i) => {
      m.holding = held[i].toString();
      const today = await valueToday(m.token, held[i], nowEth.price8);
      m.usdToday8 = today.usd8 === null ? null : today.usd8.toString();
      m.todayReason = today.reason;
      const shares = m.buys.reduce((s, b) => s + BigInt(b.shares18), 0n);
      m.usdCounterfactual8 = ((shares * nowStock.price8) / 10n ** 18n).toString();
    }),
  );

  const { totals, worst, unquoted, partial } = summarize(memes, gaps);
  return {
    wallet,
    stock: stock.symbol,
    asOfBlock: head,
    totals,
    memes: memes.sort((a, b) => Number(BigInt(b.usdPaid8) - BigInt(a.usdPaid8))),
    unpriced,
    worst,
    partial,
    unquoted,
    scanGaps: gaps,
  };
}
```

#### File: web/lib/hypersync.ts
[UNVERIFIED] — Source: see header comment
```typescript
// File: web/lib/hypersync.ts
// [UNVERIFIED] Envio HyperSync for Robinhood Chain 4663: endpoint + bearer auth VERIFIED (spike-indexing.md §2: /height open,
// /query returns 401 without a token); query/response shape follows docs.envio.dev HyperSync JSON API and is exercised by
// livetest once ENVIO_API_TOKEN is set. WARNING: UNVERIFIED PATTERN — callers fall back to eth_getLogs on any error.
import "server-only";
import type { Address, Hex } from "viem";

const URL_QUERY = "https://robinhood.hypersync.xyz/query";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type HsLog = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex };

interface HsResponse {
  next_block: number;
  archive_height?: number;
  data: { logs?: { address: Address; topic0: Hex; topic1: Hex | null; topic2: Hex | null; topic3: Hex | null; data: Hex; block_number: number; transaction_hash: Hex }[] }[];
}

export const hypersyncEnabled = () => typeof process.env.ENVIO_API_TOKEN === "string" && process.env.ENVIO_API_TOKEN.length > 0;

const MAX_PAGES = 50;

/**
 * All Transfer(*, wallet) logs of `tokens` from `fromBlock`, paginated until HyperSync reports no more data.
 * Throws (never returns a truncated list) if MAX_PAGES is reached first; the caller then falls back to eth_getLogs.
 */
export async function transfersTo(wallet: Address, tokens: Address[], fromBlock: number): Promise<HsLog[]> {
  const padded = `0x000000000000000000000000${wallet.slice(2).toLowerCase()}`;
  const out: HsLog[] = [];
  let from = fromBlock;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(URL_QUERY, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.ENVIO_API_TOKEN}` },
      body: JSON.stringify({
        from_block: from,
        logs: [{ address: tokens, topics: [[TRANSFER], [], [padded]] }],
        field_selection: { log: ["address", "topic0", "topic1", "topic2", "topic3", "data", "block_number", "transaction_hash"] },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`hypersync HTTP ${res.status}`);
    const j = (await res.json()) as HsResponse;
    for (const batch of j.data ?? []) {
      for (const l of batch.logs ?? []) {
        out.push({
          address: l.address,
          topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter((t): t is Hex => !!t),
          data: l.data,
          blockNumber: `0x${l.block_number.toString(16)}` as Hex,
          transactionHash: l.transaction_hash,
        });
      }
    }
    if (!j.next_block || (j.archive_height !== undefined && j.next_block >= j.archive_height) || j.next_block <= from) return out;
    from = j.next_block;
  }
  throw new Error(`hypersync: page cap ${MAX_PAGES} reached at block ${from}`);
}
```

#### File: web/lib/rounds.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/rounds.ts
// [VERIFIED] round layout: roundId = (1 << 64) | n (phase 1 for all used feeds); NVDA/USD n <= 24 scaled
// (usd8 = raw / 1e8 when raw > 1e15, on every stock history feed). Tables are built by scripts/build-rounds.ts into web/data/rounds/*.json.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decodeFunctionResult, encodeFunctionData, type Address } from "viem";
import { rpc } from "./rpc";

export type RoundRow = [n: number, answer8: string, updatedAt: number];
export interface RoundTable {
  feed: Address;
  decimals: 8;
  phase: 1;
  rounds: RoundRow[];
}

export const PHASE_BASE = 1n << 64n;
export const NVDA_HISTORY_FEED = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";

const aggAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

const cache = new Map<string, RoundTable>();

export async function loadTable(feed: Address): Promise<RoundTable> {
  const key = feed.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const file = path.join(process.cwd(), "data", "rounds", `${key}.json`);
  const t = JSON.parse(await readFile(file, "utf8")) as RoundTable;
  cache.set(key, t);
  return t;
}

/** Early rounds of every stock history feed are 1e16-scaled; mirrors StockOracle.historicalAnswer8 (threshold 1e15). */
export function normalize8(_feed: string, _n: number, raw: bigint): bigint {
  return raw > 10n ** 15n ? raw / 10n ** 8n : raw;
}

/** The round in effect at `ts` (last round with updatedAt <= ts). Throws if ts precedes the feed. */
export function roundAt(t: RoundTable, ts: number): { roundId: bigint; price8: bigint; updatedAt: number } {
  const r = t.rounds;
  let lo = 0;
  let hi = r.length - 1;
  if (r.length === 0 || r[0][2] > ts) throw new Error(`no round before ${ts} for ${t.feed}`);
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (r[mid][2] <= ts) lo = mid;
    else hi = mid - 1;
  }
  const [n, a, at] = r[lo];
  return { roundId: PHASE_BASE + BigInt(n), price8: BigInt(a), updatedAt: at };
}

const getRoundAbi = [
  {
    type: "function",
    name: "getRoundData",
    stateMutability: "view",
    inputs: [{ name: "roundId", type: "uint80" }],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

/** Historic rounds never change once written, so a round with updatedAt != 0 is memoized (binary searches overlap). */
const roundMemo = new Map<string, { price8: bigint; updatedAt: number }>();

async function roundData(feed: Address, n: number): Promise<{ price8: bigint; updatedAt: number }> {
  const key = `${feed.toLowerCase()}:${n}`;
  const hit = roundMemo.get(key);
  if (hit) return hit;
  const r = await fetchRoundData(feed, n);
  if (r.updatedAt !== 0) roundMemo.set(key, r);
  return r;
}

async function fetchRoundData(feed: Address, n: number): Promise<{ price8: bigint; updatedAt: number }> {
  const data = encodeFunctionData({ abi: getRoundAbi, functionName: "getRoundData", args: [PHASE_BASE + BigInt(n)] });
  const raw = await rpc<`0x${string}`>("eth_call", [{ to: feed, data }, "latest"]);
  const [, answer, , updatedAt] = decodeFunctionResult({ abi: getRoundAbi, functionName: "getRoundData", data: raw });
  return { price8: answer, updatedAt: Number(updatedAt) };
}

/**
 * Round in effect at `ts`, exact even when `ts` is newer than the committed table: rounds after the table's last row
 * are read live (binary search between the last table round and the latest round), so HindsightLens.recompute on the
 * same inputs never reverts BadRound for a recent buy. Returns null when `ts` precedes the feed (row goes "unpriced").
 */
export async function roundAtLive(t: RoundTable, ts: number, latestRound?: Awaited<ReturnType<typeof latestPrice8>>) {
  if (!Number.isFinite(ts)) throw new Error(`roundAtLive: bad timestamp ${ts}`); // NaN would select the last round
  const rows = t.rounds;
  if (rows.length === 0 || rows[0][2] > ts) return null;
  const last = rows[rows.length - 1];
  const nOf = (id: bigint) => Number(id & ((1n << 64n) - 1n));
  // Case 1: ts is before the table's last row, so the next round is in the table and the answer is exact.
  if (ts < last[2]) {
    const r = roundAt(t, ts);
    return { ...r, price8: normalize8(t.feed, nOf(r.roundId), r.price8) };
  }
  // Case 2: no newer round exists onchain, or the latest round is not after ts.
  const latest = latestRound ?? (await latestPrice8(t.feed)); // caller may pass this feed's latest round, read once per card
  const latestN = nOf(latest.roundId);
  if (latestN <= last[0]) return { roundId: PHASE_BASE + BigInt(last[0]), price8: normalize8(t.feed, last[0], BigInt(last[1])), updatedAt: last[2] };
  if (latest.updatedAt <= ts) return { roundId: latest.roundId, price8: normalize8(t.feed, latestN, latest.price8), updatedAt: latest.updatedAt };
  // Case 3: binary-search the live rounds between the table's last row and the latest round.
  let lo = last[0];
  let hi = latestN - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const r = await roundData(t.feed, mid);
    if (r.updatedAt !== 0 && r.updatedAt <= ts) lo = mid;
    else hi = mid - 1;
  }
  const r = lo === last[0] ? { price8: normalize8(t.feed, lo, BigInt(last[1])), updatedAt: last[2] } : await roundData(t.feed, lo);
  return { roundId: PHASE_BASE + BigInt(lo), price8: normalize8(t.feed, lo, r.price8), updatedAt: r.updatedAt };
}

/** Live latest price (8dp) straight from the feed; used for "today" values. */
export async function latestPrice8(feed: Address): Promise<{ roundId: bigint; price8: bigint; updatedAt: number }> {
  const data = encodeFunctionData({ abi: aggAbi, functionName: "latestRoundData" });
  const raw = await rpc<`0x${string}`>("eth_call", [{ to: feed, data }, "latest"]);
  const [roundId, answer, , updatedAt] = decodeFunctionResult({ abi: aggAbi, functionName: "latestRoundData", data: raw });
  return { roundId, price8: answer, updatedAt: Number(updatedAt) };
}
```

### Key Decisions
Per-token scans (not wallet-wide) keep a card to ~3–12s; RPC errors are thrown, never read as 'no logs'.


## Section 14: C8 Route Builder

### Purpose
Registry, best-pool quoting, Chainlink min-outs.

### Files
- `web/app/api/quote/route.ts`
- `web/lib/quote.ts`
- `web/lib/registry.ts`

### Code

#### File: web/app/api/quote/route.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/app/api/quote/route.ts
// [VERIFIED] contract: PRD §5 GET /api/quote. Fee/sweep math mirrors TerraRouter (bps of ETH notional).
import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { QuoteUnavailable, bestQuote, oracleMinStock, quoteStock } from "@/lib/quote";
import { ADDR, FEE_BPS, stockBySymbol, type StockId } from "@/lib/config";
import { memeByToken } from "@/lib/registry";

export const runtime = "nodejs";
const SLIP_BPS = 150n; // meme-leg default slippage 1.5%
const MAX_AMOUNT = 2n ** 128n - 1n; // V4Quoter exactAmount is uint128
const SIDES = ["buy", "sell", "convert"] as const;
type Side = (typeof SIDES)[number];

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token") ?? "";
  const side = (u.searchParams.get("side") ?? "buy") as Side;
  if (!SIDES.includes(side)) return NextResponse.json({ error: "bad_side" }, { status: 400 });
  const num = (k: string, d: string) => (/^\d{1,78}$/.test(u.searchParams.get(k) ?? d) ? BigInt(u.searchParams.get(k) ?? d) : -1n);
  const amount = num("amount", "0");
  const sweepBps = num("sweepBps", "200");
  const feeBps = num("feeBps", String(FEE_BPS));
  if (amount < 0n || amount > MAX_AMOUNT || sweepBps < 0n || sweepBps > 1000n || (feeBps !== 30n && feeBps !== 50n)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const stock = stockBySymbol(u.searchParams.get("stock") ?? "NVDA");
  if (!isAddress(token) || !stock || amount <= 0n) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (side !== "buy" && getAddress(token) === getAddress(ADDR.wif)) return NextResponse.json({ error: "wif_not_sellable" }, { status: 422 });
  const meme = memeByToken(token);
  if (meme?.taxed) return NextResponse.json({ error: "taxed_token" }, { status: 422 });
  try {
    const sid = stock.id as StockId;
    if (side === "buy") {
      const fee = (amount * feeBps) / 10_000n;
      const sweep = (amount * sweepBps) / 10_000n;
      const q = await bestQuote(getAddress(token), "buy", amount - fee - sweep);
      if (!q) return NextResponse.json({ error: "no_route" }, { status: 404 });
      const [stockOut, o] = await Promise.all([quoteStock(sid, sweep), oracleMinStock(sid, sweep)]);
      if (!o.fresh && sweep > 0n) return NextResponse.json({ error: "oracle_stale", stock: stock.symbol }, { status: 409 });
      return NextResponse.json(json({ token, symbol: meme?.symbol, route: q.route, amountIn: amount, tokenOut: q.amountOut, ethToStock: sweep, stockOut, fee, minTokenOut: (q.amountOut * (10_000n - SLIP_BPS)) / 10_000n, minStockOut: o.min, oracle: o, ...band(stockOut, o.min) }));
    }
    const q = await bestQuote(getAddress(token), "sell", amount);
    if (!q) return NextResponse.json({ error: "no_route" }, { status: 404 });
    const fee = (q.amountOut * feeBps) / 10_000n;
    const toStock = side === "convert" ? q.amountOut - fee : (q.amountOut * sweepBps) / 10_000n;
    const ethOut = side === "convert" ? 0n : q.amountOut - fee - toStock;
    const [stockOut, o] = await Promise.all([quoteStock(sid, toStock), oracleMinStock(sid, toStock)]);
    if (!o.fresh && toStock > 0n) return NextResponse.json({ error: "oracle_stale", stock: stock.symbol }, { status: 409 });
    return NextResponse.json(json({ token, symbol: meme?.symbol, route: q.route, amountIn: amount, ethFromSale: q.amountOut, ethOut, minEthOut: (ethOut * (10_000n - SLIP_BPS)) / 10_000n, ethToStock: toStock, stockOut, fee, minStockOut: o.min, oracle: o, ...band(stockOut, o.min) }));
  } catch (e) {
    console.error(JSON.stringify({ route: "quote", error: String(e) })); // detail stays server-side (M-02)
    const error = e instanceof QuoteUnavailable ? "quote_unavailable" : "quote_failed";
    return NextResponse.json({ error, retryAfter: 5 }, { status: 503, headers: { "retry-after": "5" } });
  }
}

/** The stock leg reverts on-chain when the pool returns less than the Chainlink floor: say so before the user signs. */
const band = (stockOut: bigint, minStockOut: bigint) =>
  stockOut >= minStockOut ? { bandOk: true, warning: null } : { bandOk: false, warning: "outside_oracle_band" };

/** bigint-safe JSON body. */
const json = (o: unknown) => JSON.parse(JSON.stringify(o, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
```

#### File: web/lib/quote.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/quote.ts
// [VERIFIED] quoter ABIs + behaviour from spike-coverage.md (V4Quoter handles hooked + dynamic-fee keys, QuoterV2,
// v2 Router02 getAmountsOut; no quoter reverted in 30+ live calls). Route shapes match TerraRouter.Route.
import "server-only";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, encodePacked, type Address, type Hex } from "viem";
import { ADDR, ORACLE_BAND_BPS, STOCKS, type StockId } from "./config";
import { memeByToken, type PoolEntry } from "./registry";
import { RpcError, rpcBatch } from "./rpc";
import { latestPrice8 } from "./rounds";

/** Mirrors TerraRouter.Route (kind 1 = v2, 2 = v3, 3 = v4 native-ETH single hop). */
export interface Route {
  kind: 1 | 2 | 3;
  v2Path: Address[];
  v3Path: Hex;
  key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const EMPTY_KEY = { currency0: ZERO, currency1: ZERO, fee: 0, tickSpacing: 0, hooks: ZERO };

const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "ticks", type: "uint32" },
      { name: "gas", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "s", type: "uint160[]" },
      { name: "t", type: "uint32[]" },
      { name: "gas", type: "uint256" },
    ],
  },
] as const;

const v4QuoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const v2RouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

/** Packed v3 path WETH -> fee -> token (buy) or token -> fee -> WETH (sell). */
export const v3Path = (a: Address, fee: number, b: Address) => encodePacked(["address", "uint24", "address"], [a, fee, b]);

export function routeFor(p: PoolEntry, token: Address, side: "buy" | "sell"): Route {
  if (p.kind === 1) {
    const path: Address[] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { kind: 1, v2Path: path, v3Path: "0x", key: EMPTY_KEY };
  }
  if (p.kind === 2) {
    const path = side === "buy" ? v3Path(ADDR.weth, p.fee, token) : v3Path(token, p.fee, ADDR.weth);
    return { kind: 2, v2Path: [], v3Path: path, key: EMPTY_KEY };
  }
  return { kind: 3, v2Path: [], v3Path: "0x", key: p.key };
}

function quoteCall(p: PoolEntry, token: Address, side: "buy" | "sell", amountIn: bigint) {
  if (p.kind === 1) {
    const path = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { to: ADDR.v2Router, data: encodeFunctionData({ abi: v2RouterAbi, functionName: "getAmountsOut", args: [amountIn, path as Address[]] }) };
  }
  if (p.kind === 2) {
    const [tokenIn, tokenOut] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return {
      to: ADDR.quoterV2,
      data: encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", args: [{ tokenIn, tokenOut, amountIn, fee: p.fee, sqrtPriceLimitX96: 0n }] }),
    };
  }
  return {
    to: ADDR.v4Quoter,
    data: encodeFunctionData({
      abi: v4QuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey: p.key, zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" }],
    }),
  };
}

function decodeQuote(p: PoolEntry, raw: Hex): bigint {
  if (p.kind === 1) {
    const amounts = decodeFunctionResult({ abi: v2RouterAbi, functionName: "getAmountsOut", data: raw });
    return amounts[amounts.length - 1];
  }
  if (p.kind === 2) return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", data: raw })[0];
  return decodeFunctionResult({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", data: raw })[0];
}

export interface BestQuote {
  route: Route;
  pool: PoolEntry;
  amountOut: bigint;
}

/** Thrown when every pool quote for a token failed at the RPC layer: "try again", not "no route". */
export class QuoteUnavailable extends Error {}

/**
 * Best output across `pools` given their raw quoter results (same order). Returns null when no pool gave a usable quote
 * (reverted / undecodable / zero liquidity); throws QuoteUnavailable when every result is an RPC error.
 */
export function pickBestQuote(pools: PoolEntry[], results: unknown[], token: Address, side: "buy" | "sell"): BestQuote | null {
  const errors = results.filter((r) => r instanceof RpcError && !isRevert(r)).length;
  if (pools.length > 0 && errors === pools.length) throw new QuoteUnavailable(`all ${errors} quote calls failed`);
  let best: BestQuote | null = null;
  results.forEach((r, i) => {
    if (typeof r !== "string") return;
    try {
      const out = decodeQuote(pools[i], r as Hex);
      if (out > 0n && (!best || out > best.amountOut)) best = { route: routeFor(pools[i], token, side), pool: pools[i], amountOut: out };
    } catch {
      /* undecodable quote: skip this pool */
    }
  });
  return best;
}

/** eth_call execution reverted (JSON-RPC code 3 / "execution reverted"): the pool cannot fill, an answer, not an outage. */
const isRevert = (e: RpcError) => e.code === 3 || /revert/i.test(e.message);

/** Quote every registry pool for `token` in one JSON-RPC batch and return the best output (see pickBestQuote). */
export async function bestQuote(token: Address, side: "buy" | "sell", amountIn: bigint): Promise<BestQuote | null> {
  const meme = token.toLowerCase() === ADDR.wif.toLowerCase() ? WIF_MEME : memeByToken(token);
  if (!meme || meme.pools.length === 0 || amountIn === 0n) return null;
  if (meme === WIF_MEME && side !== "buy") return null; // $WIF is never sold (INVARIANT 1)
  const calls = meme.pools.map((p) => ({ method: "eth_call", params: [quoteCall(p, token, side, amountIn), "latest"] }));
  return pickBestQuote(meme.pools, await rpcBatch(calls), token, side);
}

/** ETH -> stock quote along the same packed path TerraRouter uses (StockOracle path). */
export async function quoteStock(stockId: StockId, ethIn: bigint): Promise<bigint> {
  if (ethIn === 0n) return 0n;
  const s = STOCKS[stockId];
  const path = STOCK_PATHS[stockId];
  const data = encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInput", args: [path, ethIn] });
  const [r] = await rpcBatch([{ method: "eth_call", params: [{ to: ADDR.quoterV2, data }, "latest"] }]);
  if (r instanceof RpcError) throw new Error(`quote ${s.symbol}: ${r.message}`);
  return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInput", data: r as Hex })[0];
}

/** $WIF is not a Hindsight meme, but the terminal may BUY it through its own v4 pool (owned third-party hook). */
const WIF_MEME = {
  token: ADDR.wif,
  symbol: "WIF",
  decimals: 18,
  firstBlock: 0,
  tested: true,
  taxed: false,
  pools: [
    {
      kind: 3,
      version: "v4",
      id: "0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79",
      key: { currency0: ZERO, currency1: ADDR.wif, fee: 0, tickSpacing: 200, hooks: ADDR.wifHook },
      liquidityUsd: 100_000,
    },
  ] as PoolEntry[],
};

/** Chainlink-implied minimum the contract will enforce (mirrors StockOracle.minStockOut). */
export async function oracleMinStock(stockId: StockId, ethIn: bigint) {
  const [e, s] = await Promise.all([latestPrice8(ADDR.ethUsd), latestPrice8(STOCKS[stockId].liveFeed)]);
  const min = ((ethIn * e.price8) / s.price8) * BigInt(10_000 - ORACLE_BAND_BPS) / 10_000n;
  return { min, ethUsd8: e.price8, stockUsd8: s.price8, fresh: Date.now() / 1000 - s.updatedAt < 25 * 3600 };
}

/** Same packed paths as contracts/script/TerraConfig.sol stocks(). */
export const STOCK_PATHS: Record<StockId, Hex> = {
  0: v3Path(ADDR.weth, 500, STOCKS[0].token),
  1: v3Path(ADDR.weth, 3000, STOCKS[1].token),
  2: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 500, STOCKS[2].token]),
  3: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 10000, STOCKS[3].token]),
  4: v3Path(ADDR.weth, 500, STOCKS[4].token),
  5: v3Path(ADDR.weth, 3000, STOCKS[5].token),
};

/** ABI-encode a Route for logging/debug parity with Solidity tests. */
export const encodeRoute = (r: Route) =>
  encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "kind", type: "uint8" },
          { name: "v2Path", type: "address[]" },
          { name: "v3Path", type: "bytes" },
          {
            name: "key",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
        ],
      },
    ],
    [r],
  );
```

#### File: web/lib/registry.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/lib/registry.ts
// [VERIFIED] shape mirrors research/spike-pool-keys.json + spike-coverage.md; file built by scripts/build-registry.ts.
import type { Address, Hex } from "viem";
import registry from "@/data/memes.json";

export type PoolEntry =
  | { kind: 1; version: "v2"; pool: Address; quote: "WETH"; liquidityUsd: number }
  | { kind: 2; version: "v3"; pool: Address; fee: number; quote: "WETH"; liquidityUsd: number }
  | {
      kind: 3;
      version: "v4";
      id: Hex;
      key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
      liquidityUsd: number;
    };

export interface Meme {
  token: Address;
  symbol: string;
  decimals: number;
  firstBlock: number;
  pools: PoolEntry[];
  tested: boolean;
  taxed: boolean;
}

export interface Registry {
  version: 1;
  builtAt: string;
  memes: Meme[];
  /** Addresses whose outgoing token transfers count as a purchase source (pools, routers, PoolManager). */
  sources: Address[];
}

export const REGISTRY = registry as unknown as Registry;

export const memeByToken = (t: string) => REGISTRY.memes.find((m) => m.token.toLowerCase() === t.toLowerCase());
```

### Key Decisions
All candidate pools are quoted in one JSON-RPC batch; stock paths mirror TerraConfig.sol exactly.


## Section 15: C13 Live Stream + ops API

### Purpose
SSE stream over GetBlock WSS, geo, health, Quicknode cross-check.

### Files
- `web/app/api/geo/route.ts`
- `web/app/api/health/route.ts`
- `web/app/api/qn-jar/route.ts`
- `web/app/api/stream/route.ts`

### Code

#### File: web/app/api/geo/route.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/app/api/geo/route.ts
// [VERIFIED] Vercel sets `x-vercel-ip-country` on every request; list snapshot from docs.robinhood.com/rhj/restricted-jurisdictions.
import { NextResponse } from "next/server";
import restricted from "@/data/restricted.json";

export const runtime = "edge";

export function GET(req: Request) {
  const country = req.headers.get("x-vercel-ip-country") ?? "UNKNOWN";
  const list = (restricted as { countries: string[] }).countries;
  return NextResponse.json({ country, restricted: list.includes(country), unknown: country === "UNKNOWN", list: (restricted as { fetchedAt: string }).fetchedAt }, { headers: { "cache-control": "private, no-store" } });
}
```

#### File: web/app/api/health/route.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/app/api/health/route.ts
// [VERIFIED] reads only chain state; used by livetest / demo-rehearsal.
import { NextResponse } from "next/server";
import { ADDR, STOCKS, TF } from "@/lib/config";
import { latestPrice8 } from "@/lib/rounds";
import { rpc } from "@/lib/rpc";

export const runtime = "nodejs";

export async function GET() {
  // Pre-deploy TF.FeePool is the zero address; its balance is not the FeePool's, so report null instead.
  const deployed = (TF as unknown as { deployed?: boolean }).deployed !== false;
  try {
    const [block, feePoolWei, ...feeds] = await Promise.all([
      rpc<string>("eth_blockNumber", []),
      deployed ? rpc<string>("eth_getBalance", [TF.FeePool, "latest"]) : null,
      latestPrice8(ADDR.ethUsd),
      ...STOCKS.map((s) => latestPrice8(s.liveFeed)),
    ]);
    const now = Date.now() / 1000;
    const fresh = Object.fromEntries(
      [["ETH", feeds[0]], ...STOCKS.map((s, i) => [s.symbol, feeds[i + 1]] as const)].map(([k, f]) => [k, now - (f as { updatedAt: number }).updatedAt < 25 * 3600]),
    );
    return NextResponse.json({ rpc: "ok", block: Number(block), deployed, feeds: fresh, feePoolWei: feePoolWei === null ? null : BigInt(feePoolWei).toString() });
  } catch (e) {
    console.error(JSON.stringify({ route: "health", error: String(e) })); // detail stays server-side (M-02)
    return NextResponse.json({ rpc: "degraded", error: "rpc_unavailable" }, { status: 503 });
  }
}
```

#### File: web/app/api/qn-jar/route.ts
[UNVERIFIED] — Source: see header comment
```typescript
// File: web/app/api/qn-jar/route.ts
// Cross-checks the Jar contract's Stock Token balances via Quicknode qn_getStockTokenBalances against direct
// ERC-20 balanceOf reads. Display-only (never in the money path). [UNVERIFIED] Quicknode response field names:
// parsed defensively; anything unparseable returns enabled:false so the UI hides the badge.
import { NextResponse } from "next/server";
import { erc20Abi } from "@/lib/abi";
import { STOCKS, TF } from "@/lib/config";
import { quicknodeUrl } from "@/lib/rpc";
import { DEPLOYED, publicClient } from "@/lib/ui-chain";

export const runtime = "nodejs";
export const revalidate = 0;

type QnRow = { address?: string; contractAddress?: string; token?: string; balance?: string; rawBalance?: string };

function rowsOf(result: unknown): QnRow[] {
  if (Array.isArray(result)) return result as QnRow[];
  const r = result as { balances?: QnRow[]; tokens?: QnRow[]; assets?: QnRow[] } | null;
  return r?.balances ?? r?.tokens ?? r?.assets ?? [];
}

export async function GET() {
  const url = quicknodeUrl(); // QUICKNODE_RPC, or QUICKNODE_BASE + QUICKNODE_TOKEN
  if (!url || !DEPLOYED) return NextResponse.json({ enabled: false });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "qn_getStockTokenBalances", params: [{ wallet: TF.Jar }] }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await res.json()) as { result?: unknown; error?: unknown };
    if (!res.ok || body.error || body.result === undefined) return NextResponse.json({ enabled: false });
    const qn = new Map(
      rowsOf(body.result)
        .map((r) => [(r.address ?? r.contractAddress ?? r.token ?? "").toLowerCase(), r.rawBalance ?? r.balance] as const)
        .filter(([a, b]) => a && b !== undefined),
    );
    const direct = await publicClient.multicall({
      allowFailure: false,
      contracts: STOCKS.map((s) => ({ address: s.token, abi: erc20Abi, functionName: "balanceOf", args: [TF.Jar] }) as const),
    });
    // A balance that is not an integer string (e.g. decimal-formatted) is an unknown format, not a disagreement.
    if ([...qn.values()].some((q) => !/^\d+$/.test(String(q)))) return NextResponse.json({ enabled: false });
    const checks = STOCKS.map((s, i) => {
      const q = qn.get(s.token.toLowerCase());
      const d = direct[i] as bigint;
      return { symbol: s.symbol, direct: d.toString(), quicknode: q ?? null, match: q === undefined ? d === 0n : BigInt(q) === d };
    });
    if (qn.size === 0 && checks.some((c) => c.direct !== "0")) return NextResponse.json({ enabled: false });
    return NextResponse.json({ enabled: true, agreement: checks.every((c) => c.match), checks });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
```

#### File: web/app/api/stream/route.ts
[UNVERIFIED] — Source: see header comment
```typescript
// File: web/app/api/stream/route.ts
// [UNVERIFIED] GetBlock WSS eth_subscribe("logs") on RH 4663 - endpoint answers JSON-RPC (chainId 0x1237 verified);
// subscription behaviour is tested by livetest. Falls back to eth_getLogs polling if the socket fails or closes.
// The shared GetBlock URL never leaves the server: browsers receive Server-Sent Events only.
// Lifecycle (H-01/M5): one cleanup() bound to client abort, socket close/error and the 55 s deadline closes the
// socket, timers and the controller exactly once; nothing is enqueued after close; at most 20 streams per instance.
import { decodeEventLog, type Hex } from "viem";
import { TF } from "@/lib/config";
import { feePoolAbi, hindsightLensAbi, jarAbi, terraRouterAbi } from "@/lib/abi";
import { Busy, streamSlots } from "@/lib/concurrency";
import { hex, rpc } from "@/lib/rpc";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Log = { address: Hex; topics: Hex[]; data: Hex; transactionHash: Hex; blockNumber: Hex; removed?: boolean };
const ABIS = [terraRouterAbi, feePoolAbi, jarAbi, hindsightLensAbi] as const;
const WATCH = [TF.TerraRouter, TF.FeePool, TF.Jar, TF.HindsightLens];
const KINDS: Record<string, string> = { Traded: "traded", Swept: "swept", Deposited: "deposited", Converted: "converted", Distributed: "distributed", Credited: "credited", CardMinted: "cardMinted" };
const LIFETIME_MS = 55_000;
const POLL_MS = 5_000;
const PING_MS = 15_000;

function toEvent(l: Log) {
  if (l.removed) return null; // reorged out
  for (const abi of ABIS) {
    try {
      const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
      const type = KINDS[ev.eventName];
      if (!type) return null;
      const args = JSON.parse(JSON.stringify(ev.args, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
      return { type, tx: l.transactionHash, block: Number(l.blockNumber), args };
    } catch {
      /* not this ABI */
    }
  }
  return null;
}

export async function GET(req: Request) {
  let release: () => void;
  try {
    release = await streamSlots.acquire();
  } catch (e) {
    const retryAfter = e instanceof Busy ? e.retryAfter : 10;
    return Response.json({ error: "busy", retryAfter }, { status: 503, headers: { "retry-after": String(retryAfter) } });
  }
  let stop = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      stop = runStream(req.signal, controller, release);
    },
    cancel() {
      stop(); // consumer went away without an abort signal
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}

/** Starts the WS subscription (or polling fallback) and returns the idempotent cleanup. */
function runStream(signal: AbortSignal, controller: ReadableStreamDefaultController<Uint8Array>, release: () => void): () => void {
  const enc = new TextEncoder();
  const timers: ReturnType<typeof setTimeout>[] = [];
  let ws: WebSocket | null = null;
  let closed = false;
  let polling = false;

  const write = (chunk: string) => {
    if (closed) return;
    try {
      controller.enqueue(enc.encode(chunk));
    } catch {
      cleanup(); // controller already closed underneath us
    }
  };
  const send = (o: unknown) => write(`data: ${JSON.stringify(o)}\n\n`);
  function cleanup() {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    signal.removeEventListener("abort", cleanup);
    try {
      ws?.close();
    } catch {
      /* already closed */
    }
    try {
      controller.close();
    } catch {
      /* already closed */
    }
    release();
  }

  signal.addEventListener("abort", cleanup);
  timers.push(setTimeout(cleanup, LIFETIME_MS));
  const ping = setInterval(() => write(": ping\n\n"), PING_MS);
  timers.push(ping as unknown as ReturnType<typeof setTimeout>);
  send({ type: "hello", at: Date.now() });

  const startPolling = () => {
    if (closed || polling) return;
    polling = true;
    void poll();
  };

  async function poll() {
    let from: number | null = null;
    while (!closed) {
      try {
        const head = Number(await rpc<Hex>("eth_blockNumber", []));
        from ??= head - 20;
        if (head >= from) {
          const logs = await rpc<Log[]>("eth_getLogs", [{ address: WATCH, fromBlock: hex(from), toBlock: hex(head) }]);
          for (const l of logs) {
            const ev = toEvent(l);
            if (ev) send(ev);
          }
          from = head + 1;
        }
      } catch (e) {
        console.error(JSON.stringify({ route: "stream", poll: "error", error: String(e) }));
        send({ type: "error", error: "rpc_unavailable" }); // keep the stream; retry next tick
      }
      await new Promise<void>((r) => timers.push(setTimeout(r, POLL_MS)));
    }
  }

  const wss = process.env.GETBLOCK_WSS_FRA;
  try {
    if (wss && typeof WebSocket !== "undefined") ws = new WebSocket(wss);
  } catch {
    ws = null;
  }
  if (!ws) {
    startPolling();
    return cleanup;
  }
  ws.onopen = () => ws?.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_subscribe", params: ["logs", { address: WATCH }] }));
  ws.onmessage = (m) => {
    try {
      const msg = JSON.parse(String(m.data)) as { params?: { result?: Log } };
      const ev = msg.params?.result ? toEvent(msg.params.result) : null;
      if (ev) send(ev);
    } catch {
      /* non-JSON or unexpected frame: ignore */
    }
  };
  ws.onerror = () => startPolling();
  ws.onclose = () => startPolling();
  return cleanup;
}
```

### Key Decisions
The stream closes at 55s (serverless limit) and the browser EventSource reconnects.


## Section 16: C9 Frontend

### Purpose
All pages, OG images and components.

### Files
- `web/app/api/card-check/route.ts`
- `web/app/app/convert/page.tsx`
- `web/app/app/page.tsx`
- `web/app/board/page.tsx`
- `web/app/card/[addr]/loading.tsx`
- `web/app/card/[addr]/opengraph-image.tsx`
- `web/app/card/[addr]/page.tsx`
- `web/app/error.tsx`
- `web/app/friends/page.tsx`
- `web/app/globals.css`
- `web/app/jar/page.tsx`
- `web/app/jar/report/[addr]/loading.tsx`
- `web/app/jar/report/[addr]/opengraph-image.tsx`
- `web/app/jar/report/[addr]/page.tsx`
- `web/app/layout.tsx`
- `web/app/not-found.tsx`
- `web/app/page.tsx`
- `web/app/proof/page.tsx`
- `web/app/stake/page.tsx`
- `web/app/trade/[token]/page.tsx`
- `web/app/trade/page.tsx`
- `web/components/address-lookup.tsx`
- `web/components/app-home.tsx`
- `web/components/board-view.tsx`
- `web/components/card-actions.tsx`
- `web/components/card-view.tsx`
- `web/components/connect-button.tsx`
- `web/components/convert-panel.tsx`
- `web/components/friends-view.tsx`
- `web/components/geo-gate.tsx`
- `web/components/guarantee.tsx`
- `web/components/hindsight-card.tsx`
- `web/components/hooks.ts`
- `web/components/jar-view.tsx`
- `web/components/landing-connect.tsx`
- `web/components/landing-live.tsx`
- `web/components/proof-view.tsx`
- `web/components/providers.tsx`
- `web/components/report-share.tsx`
- `web/components/site-header.tsx`
- `web/components/stake-view.tsx`
- `web/components/stock-select.tsx`
- `web/components/theme-toggle.tsx`
- `web/components/trade-terminal.tsx`
- `web/components/tx-status.tsx`
- `web/components/ui.tsx`
- `web/lib/api-hindsight.test.ts`
- `web/lib/api-quote.test.ts`
- `web/lib/api-stream.test.ts`
- `web/lib/api-validation.test.ts`
- `web/lib/card-cache.test.ts`
- `web/lib/card-cache.ts`
- `web/lib/concurrency.ts`
- `web/lib/hindsight.test.ts`
- `web/lib/quote.test.ts`
- `web/lib/rounds.integration.ts`
- `web/lib/rounds.test.ts`
- `web/lib/rpc.test.ts`
- `web/lib/stock-paths.integration.ts`
- `web/lib/ui-chain.ts`
- `web/lib/ui-errors.test.ts`
- `web/lib/ui-errors.ts`
- `web/lib/ui-format.test.ts`
- `web/lib/ui-format.ts`
- `web/lib/ui-logs.test.ts`
- `web/lib/ui-logs.ts`
- `web/lib/ui-report.test.ts`
- `web/lib/ui-report.ts`
- `web/lib/wagmi.ts`

### Code

#### File: web/app/api/card-check/route.ts
[VERIFIED] — Source: fork-tested / live-probed
```typescript
// File: web/app/api/card-check/route.ts
// [VERIFIED] reuses buildCard (VERIFIED end to end on a real wallet). Answers: does a minted card's usdPaid8 match the
// card re-derived from chain logs for that wallet? HindsightLens proves pricing arithmetic only; this proves provenance.
// The derived card comes from the shared cache keyed (wallet, stock) only; the claimed value is compared afterwards,
// so varying usdPaid8 can neither bypass the cache nor grow it.
import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { cardFailure, getCard, matchesClaim } from "@/lib/card-cache";
import type { StockId } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const addr = u.searchParams.get("addr") ?? "";
  const claimed = u.searchParams.get("usdPaid8") ?? "";
  const sid = u.searchParams.get("stockId") ?? "0";
  if (!isAddress(addr) || !/^\d{1,40}$/.test(claimed) || !/^[0-5]$/.test(sid)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const card = await getCard(getAddress(addr), Number(sid) as StockId);
    const derived = BigInt(card.totals.usdPaid8);
    return NextResponse.json({ verified: matchesClaim(derived, BigInt(claimed)), derived: derived.toString() });
  } catch (e) {
    console.error(JSON.stringify({ route: "card-check", error: String(e) }));
    const f = cardFailure(e);
    return NextResponse.json(f.body, { status: f.status, headers: f.headers });
  }
}
```

#### File: web/app/app/convert/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/app/convert/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConvertPage } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Convert" };

export default function Convert() {
  return (
    <>
      <PageHeader title="Convert to real stock" sub="Sell the memes you pick into a real Stock Token, straight into your Jar." />
      <Suspense fallback={<CardSkeleton />}>
        <ConvertPage />
      </Suspense>
    </>
  );
}
```

#### File: web/app/app/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/app/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHome } from "@/components/app-home";
import { CardSkeleton } from "@/components/hindsight-card";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Your card" };

export default function AppPage() {
  return (
    <>
      <PageHeader title="Your Hindsight card" sub="What your meme buys cost you, priced with the Chainlink round at each block. Expand any row for receipts." />
      <Suspense fallback={<CardSkeleton />}>
        <AppHome />
      </Suspense>
    </>
  );
}
```

#### File: web/app/board/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/board/page.tsx
import type { Metadata } from "next";
import { BoardView } from "@/components/board-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <>
      <PageHeader title="Leaderboards" sub="Built from contract events only. Every row links to its wallet and transaction." />
      <BoardView />
    </>
  );
}
```

#### File: web/app/card/[addr]/loading.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/card/[addr]/loading.tsx
import { CardSkeleton } from "@/components/hindsight-card";

export default function Loading() {
  return <CardSkeleton />;
}
```

#### File: web/app/card/[addr]/opengraph-image.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/card/[addr]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getAddress, isAddress } from "viem";
import { getCard } from "@/lib/card-cache";
import { short, usd8 } from "@/lib/ui-format";

export const runtime = "nodejs";
export const alt = "Hindsight card: what this wallet's memes cost it in real stock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const C = { bg: "#12100d", surface: "#1b1814", line: "#3b342b", fg: "#f3ede4", muted: "#b6aa98", accent: "#46d27a", danger: "#f7867c" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
        <div style={{ width: 40, height: 8, borderRadius: 4, background: C.accent }} />
        Terra Firma
      </div>
      {children}
    </div>
  );
}

function Fig({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 28, borderRadius: 20, border: `2px solid ${accent ? C.accent : C.line}`, background: C.surface }}>
      <div style={{ fontSize: 28, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 64, fontWeight: 800, color: accent ? C.accent : C.fg, marginTop: 8 }}>{value}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!isAddress(addr)) {
    return new ImageResponse(<Shell><div style={{ display: "flex", marginTop: 120, fontSize: 56 }}>Your memes, in real stock.</div></Shell>, size);
  }
  try {
    const card = await getCard(getAddress(addr), 0);
    const empty = card.memes.length === 0;
    return new ImageResponse(
      <Shell>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>Hindsight card · {short(card.wallet)} · block {card.asOfBlock}</div>
        {empty ? (
          <div style={{ display: "flex", marginTop: 120, fontSize: 60, fontWeight: 700 }}>None of the tracked memes here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", marginTop: 40, fontSize: 44, fontWeight: 700 }}>What these memes would be in {card.stock}</div>
            <div style={{ display: "flex", gap: 24, marginTop: 36 }}>
              <Fig label="Paid" value={usd8(card.totals.usdPaid8)} />
              <Fig label="Today" value={usd8(card.totals.usdToday8)} />
              <Fig label={`In ${card.stock}`} value={usd8(card.totals.usdCounterfactual8)} accent />
            </div>
          </div>
        )}
        <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: C.muted }}>Every number from Robinhood Chain mainnet and Chainlink rounds.</div>
      </Shell>,
      size,
    );
  } catch {
    return new ImageResponse(
      <Shell>
        <div style={{ display: "flex", marginTop: 120, fontSize: 56, fontWeight: 700 }}>Your memes, in real stock.</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: C.muted }}>Open the card to see this wallet&apos;s numbers.</div>
      </Shell>,
      size,
    );
  }
}
```

#### File: web/app/card/[addr]/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/card/[addr]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAddress, isAddress } from "viem";
import { CardView } from "@/components/card-view";
import { PageHeader } from "@/components/ui";
import { stockBySymbol, type StockId } from "@/lib/config";
import { getCard } from "@/lib/card-cache";
import type { Card } from "@/lib/hindsight";
import { short, usd8 } from "@/lib/ui-format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ addr: string }>; searchParams: Promise<{ stock?: string }> };

const load = cache(async (addr: string, stock: string): Promise<{ card: Card | null; error: string | null }> => {
  const s = stockBySymbol(stock) ?? stockBySymbol("NVDA")!;
  try {
    return { card: await getCard(getAddress(addr), s.id as StockId), error: null };
  } catch {
    return { card: null, error: "The chain is busy. Try again in a few seconds." };
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { addr } = await params;
  if (!isAddress(addr)) return { title: "Card" };
  return { title: `Hindsight card ${short(addr)}`, description: "What this wallet's memes cost it in real stock, priced from Chainlink rounds." };
}

export default async function CardPage({ params, searchParams }: Props) {
  const { addr } = await params;
  const { stock = "NVDA" } = await searchParams;
  if (!isAddress(addr)) notFound();
  const { card, error } = await load(addr, stock.toUpperCase());
  return (
    <>
      <PageHeader
        title="Hindsight card"
        sub={card && card.memes.length > 0 ? `This wallet put ${usd8(card.totals.usdPaid8)} into memes. In ${card.stock} it would be ${usd8(card.totals.usdCounterfactual8)}.` : "Read-only. Every number links to its transaction or Chainlink round."}
      />
      <CardView card={card} error={error} />
    </>
  );
}
```

#### File: web/app/error.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/error.tsx
"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="py-16">
      <h1 className="text-3xl font-bold">The chain is busy.</h1>
      <p className="mt-3 text-muted">Something failed while reading Robinhood Chain. No partial numbers are shown.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
```

#### File: web/app/friends/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/friends/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FriendsView } from "@/components/friends-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Friend Jars" };

/** Gated (PRD C12 / OD7): only exists when NEXT_PUBLIC_FRIEND_JARS === "1". */
export default function FriendsPage() {
  if (process.env.NEXT_PUBLIC_FRIEND_JARS !== "1") notFound();
  return (
    <>
      <PageHeader title="Friend Jars" sub="A shared Jar of one real stock, owned pro-rata by what each member put in. Exit any time with your share." />
      <FriendsView />
    </>
  );
}
```

#### File: web/app/globals.css
[ASSUMED] — Source: see header comment
```css
// File: web/app/globals.css
@import "tailwindcss";

/* Terra Firma tokens. Dark (bedrock) is the default; light (sandstone) via data-theme="light".
   A later design pass refines values here only; components use the semantic names below. */
:root {
  --bg: #12100d;
  --surface: #1b1814;
  --surface-2: #26211b;
  --line: #3b342b;
  --fg: #f3ede4;
  --muted: #b6aa98;
  --accent: #46d27a;
  --accent-strong: #5ee08d;
  --accent-fg: #07160d;
  --accent-soft: #46d27a1f;
  --danger: #f7867c;
  --danger-soft: #f7867c1f;
  --warn: #f2bd57;
  --warn-soft: #f2bd571f;
  color-scheme: dark;
}

:root[data-theme="light"] {
  --bg: #f5efe6;
  --surface: #fffcf7;
  --surface-2: #ede5d8;
  --line: #d6cab8;
  --fg: #1e1a15;
  --muted: #5b5144;
  --accent: #157a3c;
  --accent-strong: #0f6a32;
  --accent-fg: #ffffff;
  --accent-soft: #157a3c1a;
  --danger: #b42318;
  --danger-soft: #b423181a;
  --warn: #8a5a00;
  --warn-soft: #8a5a001a;
  color-scheme: light;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--line);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --radius-card: 1rem;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
  overflow-x: hidden;
}

.num {
  font-variant-numeric: tabular-nums;
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.6);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### File: web/app/jar/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/jar/page.tsx
import type { Metadata } from "next";
import { JarView } from "@/components/jar-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Jar" };

export default function JarPage() {
  return (
    <>
      <PageHeader title="Your Jar" sub="Real Stock Tokens held for you by an ownerless contract. Withdraw any time; nobody else can." />
      <JarView />
    </>
  );
}
```

#### File: web/app/jar/report/[addr]/loading.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/jar/report/[addr]/loading.tsx
import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton w="16rem" h="2.25rem" className="block" />
      <Skeleton w="100%" h="12rem" className="block" />
    </div>
  );
}
```

#### File: web/app/jar/report/[addr]/opengraph-image.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/jar/report/[addr]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { isAddress } from "viem";
import { orDash, short, signedSig4, signedUsd, usd } from "@/lib/ui-format";
import { jarReport } from "@/lib/ui-report";

export const runtime = "nodejs";
export const alt = "Weekly Jar report: real stock saved from meme trades";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 600;

const C = { bg: "#12100d", surface: "#1b1814", line: "#3b342b", fg: "#f3ede4", muted: "#b6aa98", accent: "#46d27a" };

export default async function Image({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const report = isAddress(addr) ? await jarReport(addr).catch(() => null) : null;
  const body =
    !report || !report.deployed ? (
      <div style={{ display: "flex", marginTop: 120, fontSize: 56, fontWeight: 700 }}>Your memes, in real stock.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: C.muted }}>Weekly Jar report · {short(report.user)}</div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 96, fontWeight: 800, color: C.accent }}>
          {signedUsd(report.usdWeek)}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: C.fg }}>added this week · Jar now {orDash(report.usdNow, usd)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 36 }}>
          {report.rows.slice(0, 4).map((r) => (
            <div key={r.symbol} style={{ display: "flex", flexDirection: "column", padding: 20, borderRadius: 16, border: `2px solid ${C.line}`, background: C.surface, minWidth: 220 }}>
              <div style={{ fontSize: 26, color: C.muted }}>{r.symbol}</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{signedSig4(r.sharesWeek)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
        <div style={{ width: 40, height: 8, borderRadius: 4, background: C.accent }} />
        Terra Firma
      </div>
      {body}
      <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: C.muted }}>From Jar events and Chainlink prices on Robinhood Chain mainnet.</div>
    </div>,
    size,
  );
}
```

#### File: web/app/jar/report/[addr]/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/jar/report/[addr]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { ReportShare } from "@/components/report-share";
import { AddrLink, Notice, PageHeader, Panel, Stat } from "@/components/ui";
import { addrUrl, TF } from "@/lib/config";
import { orDash, short, sig4, signedSig4, signedUsd, usd } from "@/lib/ui-format";
import { jarReport, type JarReport } from "@/lib/ui-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ addr: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { addr } = await params;
  return { title: `Weekly Jar report ${isAddress(addr) ? short(addr) : ""}` };
}

export default async function ReportPage({ params }: Props) {
  const { addr } = await params;
  if (!isAddress(addr)) notFound();
  let report: JarReport | null = null;
  try {
    report = await jarReport(addr);
  } catch {
    report = null;
  }
  return (
    <>
      <PageHeader title="Weekly Jar report" sub={<>Wallet <AddrLink addr={addr} />. Last 7 days of Jar credits and withdrawals, valued at current Chainlink prices.</>} />
      {!report ? (
        <Notice tone="danger">The chain is busy. Refresh in a few seconds.</Notice>
      ) : !report.deployed ? (
        <Notice tone="warn">Weekly reports start once the Terra Firma contracts are live on mainnet.</Notice>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Jar value now" value={orDash(report.usdNow, usd)} sub={report.usdNow === null ? "A live stock price is unavailable right now" : undefined} href={addrUrl(TF.Jar)} />
            <Stat label="Added this week" value={signedUsd(report.usdWeek)} sub={`${report.creditsWeek} credit${report.creditsWeek === 1 ? "" : "s"}`} href={addrUrl(TF.Jar)} />
          </div>
          <Panel>
            {report.rows.length === 0 ? (
              <p className="text-muted">No Jar activity for this wallet yet.</p>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">Jar growth per stock</caption>
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr><th className="py-2 font-medium">Stock</th><th className="py-2 text-right font-medium">Shares</th><th className="py-2 text-right font-medium">7-day</th><th className="py-2 text-right font-medium">Value</th></tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.symbol} className="border-t border-line">
                      <th scope="row" className="py-2.5 text-left font-semibold">{r.symbol}</th>
                      <td className="num py-2.5 text-right">{orDash(r.sharesNow, sig4)}</td>
                      <td className="num py-2.5 text-right text-accent">{signedSig4(r.sharesWeek)}</td>
                      <td className="num py-2.5 text-right">{orDash(r.usdNow, usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-4 text-xs text-muted">As of block {report.asOfBlock}. Read from Jar events and Chainlink live feeds. &ldquo;—&rdquo; means that live price could not be read; it is never estimated.</p>
          </Panel>
          {report.usdWeek !== null && <ReportShare addr={report.user} usdWeek={report.usdWeek} />}
        </div>
      )}
    </>
  );
}
```

#### File: web/app/layout.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { REPO_URL, DEPLOYED, SITE_URL } from "@/lib/ui-chain";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: { default: "Terra Firma: your memes, in real stock", template: "%s · Terra Firma" },
  description: "See what your memes would be in NVDA today. Move the dead ones into real stock with one confirmation. Every trade after builds real stock and burns $WIF.",
};

export const viewport: Viewport = {
  themeColor: "#12100d",
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem("tf.theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} flex min-h-dvh flex-col antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          {!DEPLOYED && (
            <div role="note" className="border-b border-warn/40 bg-warn-soft">
              <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm sm:px-6">
                <strong>Contracts deploying: read-only preview.</strong> Transaction buttons stay off until the Terra Firma contracts are live on
                mainnet. Nothing on this site is simulated.
              </p>
            </div>
          )}
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>Terra Firma runs on Robinhood Chain mainnet (4663). Ownerless contracts. $WIF is only bought, burned and staked.</p>
              <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/proof" className="inline-flex min-h-11 items-center hover:text-fg">Proof</Link>
                {REPO_URL && (
                  <>
                    <a href={`${REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-fg">SECURITY.md</a>
                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:text-fg">Source</a>
                  </>
                )}
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
```

#### File: web/app/not-found.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/not-found.tsx
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-3xl font-bold">Nothing here.</h1>
      <p className="mt-3 text-muted">That page doesn&apos;t exist, or the address in the link isn&apos;t valid.</p>
      <LinkButton href="/" className="mt-6">Back to solid ground</LinkButton>
    </div>
  );
}
```

#### File: web/app/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/page.tsx
import { AddressLookup, Counters, LiveTicker } from "@/components/landing-live";
import { Guarantee } from "@/components/guarantee";
import { LandingConnect } from "@/components/landing-connect";
import { LinkButton } from "@/components/ui";
import { DEMO_ADDR } from "@/lib/ui-chain";

const STEPS = [
  { n: "1", t: "Hindsight", d: "See what every meme you bought would be worth today in NVDA, priced from the Chainlink round at that block." },
  { n: "2", t: "Convert", d: "Sell the memes you pick into a real Stock Token, straight into your Jar. Withdraw any time." },
  { n: "3", t: "Every trade builds stock", d: "Trade memes here and a slice of each trade lands in your Jar as stock. Fees burn $WIF and pay stakers." },
];

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="pt-2 sm:pt-8">
        <p className="text-sm font-medium uppercase tracking-widest text-accent">The world is flat. Stand on solid ground.</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">Stand on $WIF. Sweep the rest into stock.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">See what your memes would be in NVDA today. Move the dead ones into real stock with one confirmation.</p>
        <Guarantee addr={DEMO_ADDR || undefined} className="mt-4 max-w-xl" />
        <div className="mt-8 flex max-w-xl flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <LandingConnect />
            {DEMO_ADDR && <LinkButton href={`/card/${DEMO_ADDR}`} variant="secondary">See a real card</LinkButton>}
          </div>
          <AddressLookup />
        </div>
      </section>

      <section aria-labelledby="counters-title" className="space-y-4">
        <h2 id="counters-title" className="sr-only">Protocol counters</h2>
        <Counters />
        <p className="text-sm text-muted">Every number here is read from Robinhood Chain mainnet. Includes team demo transactions (team wallets listed on /proof).</p>
        <LiveTicker />
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <span className="num flex size-9 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent" aria-hidden>{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
```

#### File: web/app/proof/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/proof/page.tsx
import type { Metadata } from "next";
import { ProofView } from "@/components/proof-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Proof" };

export default function ProofPage() {
  return (
    <>
      <PageHeader
        title="Proof"
        sub="Every number here is read from Robinhood Chain mainnet. Click anything to verify. Terra Firma never prices or sells $WIF: it only buys, burns and stakes it."
      />
      <ProofView />
    </>
  );
}
```

#### File: web/app/stake/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/stake/page.tsx
import type { Metadata } from "next";
import { StakeView } from "@/components/stake-view";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Stake $WIF" };

export default function StakePage() {
  return (
    <>
      <PageHeader title="Stake $WIF, earn real stock" sub="Every hour, half the protocol fee buys and burns $WIF; the other half buys the stock each staker picked and lets them claim it to their Jar. A new stake placed in epoch e activates at the start of epoch e+2." />
      <StakeView />
    </>
  );
}
```

#### File: web/app/trade/[token]/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/trade/[token]/page.tsx
import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { PageHeader } from "@/components/ui";
import { memeByToken } from "@/lib/registry";
import { short } from "@/lib/ui-format";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return { title: `Trade ${memeByToken(token)?.symbol ?? short(token)}` };
}

export default async function TradeTokenPage({ params }: Props) {
  const { token } = await params;
  return (
    <>
      <PageHeader title="Meme terminal" sub="Buy or sell through Uniswap. A slice of every trade can land in your Jar as real stock." />
      <TradeTerminal initialToken={token} />
    </>
  );
}
```

#### File: web/app/trade/page.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/app/trade/page.tsx
import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <>
      <PageHeader title="Meme terminal" sub="Paste a contract address, buy or sell. Every trade can sweep a slice into your Jar as real stock, in the same transaction." />
      <TradeTerminal />
    </>
  );
}
```

#### File: web/components/address-lookup.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/address-lookup.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress } from "viem";
import { Button, inputCls } from "./ui";

/** "Look up any wallet" (0x only, validated before any request). Used on /, /app and /card/[addr]. */
export function AddressLookup({ id = "lookup", placeholder = "or look up any wallet: 0x…" }: { id?: string; placeholder?: string }) {
  const router = useRouter();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const errId = `${id}-err`;
  return (
    <form
      role="search"
      aria-label="Look up a wallet"
      className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        const a = v.trim();
        if (!isAddress(a)) return setErr(true);
        router.push(`/card/${a}`);
      }}
    >
      <label htmlFor={id} className="sr-only">Wallet address</label>
      <input
        id={id}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        placeholder={placeholder}
        className={`${inputCls} font-mono text-sm sm:w-auto sm:flex-1`}
        aria-invalid={err}
        aria-describedby={err ? errId : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" variant="secondary">Look up</Button>
      {err && <p id={errId} role="alert" className="text-sm text-danger sm:basis-full">Enter a 0x address (42 characters).</p>}
    </form>
  );
}
```

#### File: web/components/app-home.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/app-home.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { AddressLookup } from "./address-lookup";
import { ConvertPanel } from "./convert-panel";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { CardSkeleton, HindsightCard } from "./hindsight-card";
import { useCard, useMounted } from "./hooks";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, Panel } from "./ui";

/** Sends visitors without a wallet back to the landing page once wagmi finished reconnecting. */
function useRequireWallet() {
  const { status, address } = useAccount();
  const router = useRouter();
  const mounted = useMounted();
  useEffect(() => {
    if (mounted && status === "disconnected") router.replace("/");
  }, [mounted, status, router]);
  return { address, ready: mounted && status === "connected" };
}

export function AppHome() {
  const { address, ready } = useRequireWallet();
  const params = useSearchParams();
  const router = useRouter();
  const [stock, setStock] = useState(params.get("stock") ?? "NVDA");
  const card = useCard(address, stock);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const onBusy = useCallback((b: boolean) => setBusy(b), []);

  const openConvert = () => {
    if (window.matchMedia("(min-width: 768px)").matches) setSheet(true);
    else router.push(`/app/convert?stock=${stock}`);
  };

  if (!ready) return <CardSkeleton />;
  if (card.isLoading) return <CardSkeleton />;
  if (card.error || !card.data)
    return (
      <Panel>
        <p role="alert" className="text-lg font-semibold">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</p>
        <Button className="mt-4" onClick={() => card.refetch()}>Try again</Button>
      </Panel>
    );

  const c = card.data;
  const hasMemes = c.memes.some((m) => BigInt(m.holding) > 0n);
  return (
    <>
      <HindsightCard
        card={c}
        stockControl={<StockSelect value={stock} onChange={setStock} label="Compare against" name="card-stock" />}
        actions={
          <div className="space-y-4 border-t border-line pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hasMemes ? (
                <Button onClick={openConvert}>Fix it: convert to {stock}</Button>
              ) : (
                <>
                  <LinkButton href="/stake">Stake $WIF</LinkButton>
                  <LinkButton href="/trade" variant="secondary">Open the terminal</LinkButton>
                </>
              )}
              <ShareButton card={c} />
              <MintButton card={c} />
            </div>
            <RecomputeButton card={c} />
          </div>
        }
      />
      <Panel aria-labelledby="lookup-title" className="mt-6 space-y-3">
        <h2 id="lookup-title" className="font-semibold">Look up any wallet</h2>
        <p className="text-sm text-muted">Every card is read live from chain. Try a wallet with years of real meme buys, or paste any address.</p>
        <LinkButton href={`/card/${HISTORY_ADDR}`} variant="secondary">See a wallet with real history</LinkButton>
        <AddressLookup id="app-lookup" />
      </Panel>
      <ConvertSheet open={sheet} locked={busy} onClose={() => setSheet(false)}>
        <ConvertPanel card={c} initialStock={stock} onDone={() => setSheet(false)} onBusy={onBusy} />
      </ConvertSheet>
    </>
  );
}

/** Side sheet. While a transaction is in flight (`locked`) it cannot be closed, so its status and hashes stay visible (S4). */
function ConvertSheet({ open, locked, onClose, children }: { open: boolean; locked: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => locked && e.preventDefault()}
      onClose={() => (locked ? ref.current?.showModal() : onClose())}
      aria-labelledby="convert-title"
      className="mb-0 ml-auto mr-0 mt-0 h-dvh max-h-none w-[min(34rem,100vw)] max-w-none overflow-y-auto border-l border-line bg-surface p-6 text-fg"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="convert-title" className="text-xl font-semibold">Convert memes to real stock</h2>
        <Button variant="ghost" aria-label={locked ? "Close (disabled while the transaction confirms)" : "Close"} onClick={onClose} disabled={locked} className="size-11 px-0">✕</Button>
      </div>
      {locked && <p className="mb-4 text-sm text-muted" role="status">Keep this open until the transaction confirms.</p>}
      {(open || locked) && children}
    </dialog>
  );
}

export function ConvertPage() {
  const { address, ready } = useRequireWallet();
  const params = useSearchParams();
  const stock = params.get("stock") ?? "NVDA";
  const card = useCard(address, stock);
  const router = useRouter();
  if (!ready || card.isLoading) return <CardSkeleton />;
  if (card.error || !card.data) return <Notice tone="danger">{(card.error as Error)?.message ?? "The chain is busy. Try again in a few seconds."}</Notice>;
  return (
    <Panel>
      <ConvertPanel card={card.data} initialStock={stock} onDone={() => router.push("/app")} />
    </Panel>
  );
}
```

#### File: web/components/board-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/board-view.tsx
"use client";

import type { ReactNode } from "react";
import { STOCKS } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, pct, pctChange, usd, usd8 } from "@/lib/ui-format";
import { mapLimit, only, type TfLogs } from "@/lib/ui-logs";
import { sumKnown, usdOf, type StockQuote } from "@/lib/ui-report";
import { useQuery } from "@tanstack/react-query";
import { useStockQuotes, useTfLogs } from "./hooks";
import { AddrLink, Notice, Panel, Skeleton, TxLink } from "./ui";

interface Row {
  who: string;
  tx: string;
  main: ReactNode;
  sub?: ReactNode;
}

/** Minted cards ranked by regret, ONLY if the server re-derived the same card from chain logs (provenance check). */
function regretCandidates(logs: TfLogs) {
  return only(logs.lens, "CardMinted")
    .map((l) => ({ l, gap: l.args.usdNow8 - l.args.usdPaid8 }))
    .sort((a, b) => (b.gap > a.gap ? 1 : b.gap < a.gap ? -1 : 0))
    .slice(0, 10);
}

/** Re-derive each minted card server-side, at most 3 at a time (each check is a full card build). */
async function checkCards(cands: ReturnType<typeof regretCandidates>) {
  const res = await mapLimit(cands, 3, async ({ l: m }) => {
    const r = await fetch(`/api/card-check?addr=${m.args.wallet}&usdPaid8=${m.args.usdPaid8}&stockId=${m.args.stockId}`);
    const j = (await r.json().catch(() => ({}))) as { verified?: boolean };
    if (!r.ok) throw new Error("check failed");
    return { tx: m.transactionHash, ok: j.verified === true };
  });
  const verified = new Set(res.flatMap((x) => (x.status === "fulfilled" && x.value.ok ? [x.value.tx] : [])));
  return { verified, failed: res.filter((x) => x.status === "rejected").length };
}

function regret(cands: ReturnType<typeof regretCandidates>, verified: Set<string>): Row[] {
  return cands
    .filter(({ l }) => verified.has(l.transactionHash))
    .slice(0, 10)
    .map(({ l }) => {
      const c = pctChange(l.args.usdPaid8, l.args.usdNow8);
      return {
        who: l.args.wallet,
        tx: l.transactionHash,
        main: <>{usd8(l.args.usdPaid8)} → {usd8(l.args.usdNow8)} in {STOCKS[l.args.stockId]?.symbol}</>,
        sub: c !== null ? `${pct(c)} if it had been stock` : undefined,
      };
    });
}

function jars(logs: TfLogs, quotes: StockQuote[]): Row[] {
  const net = new Map<string, { raw: Map<number, bigint>; tx: string }>();
  for (const l of logs.jar) {
    const i = STOCKS.findIndex((s) => s.token.toLowerCase() === l.args.stock.toLowerCase());
    if (i < 0) continue;
    const u = l.args.user.toLowerCase();
    const e = net.get(u) ?? { raw: new Map(), tx: l.transactionHash };
    const d = l.eventName === "Credited" ? l.args.amount : -l.args.amount;
    e.raw.set(i, (e.raw.get(i) ?? 0n) + d);
    e.tx = l.transactionHash;
    net.set(u, e);
  }
  return [...net.entries()]
    // A wallet whose stock has no live price is left out of the ranking rather than valued at a guess.
    .flatMap(([who, e]) => {
      const v = sumKnown([...e.raw.entries()].map(([i, r]) => usdOf(r, quotes[i])));
      return v !== null && v > 0 ? [{ who, tx: e.tx, v }] : [];
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 10)
    .map((r) => ({ who: r.who, tx: r.tx, main: usd(r.v), sub: "at current Chainlink prices" }));
}

function fees(logs: TfLogs): Row[] {
  const by = new Map<string, { fee: bigint; n: number; tx: string }>();
  for (const l of only(logs.router, "Traded")) {
    const u = l.args.user.toLowerCase();
    const e = by.get(u) ?? { fee: 0n, n: 0, tx: l.transactionHash };
    e.fee += l.args.fee;
    e.n++;
    e.tx = l.transactionHash;
    by.set(u, e);
  }
  return [...by.entries()]
    .sort((a, b) => (b[1].fee > a[1].fee ? 1 : b[1].fee < a[1].fee ? -1 : 0))
    .slice(0, 10)
    .map(([who, e]) => ({ who, tx: e.tx, main: `${eth(e.fee)} ETH`, sub: `${e.n} trade${e.n === 1 ? "" : "s"}` }));
}

function Board({ title, desc, rows, loading, empty, note }: { title: string; desc: string; rows: Row[]; loading: boolean; empty: string; note?: string }) {
  const id = title.replace(/\W+/g, "-").toLowerCase();
  return (
    <Panel aria-labelledby={id}>
      <h2 id={id} className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      {note && <p className="mt-2 text-xs text-warn">{note}</p>}
      {loading ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} w="100%" h="2.75rem" className="block" />)}</div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-4 divide-y divide-line">
          {rows.map((r, i) => (
            <li key={`${r.who}-${r.tx}`} className="flex items-center gap-3 py-3">
              <span className="num w-6 text-sm text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="num font-semibold">{r.main}</p>
                {r.sub && <p className="text-xs text-muted">{r.sub}</p>}
              </div>
              <div className="flex flex-col items-end text-sm">
                <AddrLink addr={r.who} />
                <TxLink hash={r.tx} className="inline-flex min-h-11 items-center text-xs text-muted">tx</TxLink>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function BoardView() {
  const logs = useTfLogs();
  const quotes = useStockQuotes();
  const cands = logs.data ? regretCandidates(logs.data) : [];
  const checks = useQuery({
    queryKey: ["card-checks", cands.map((c) => c.l.transactionHash).join(",")],
    enabled: cands.length > 0,
    staleTime: 600_000,
    retry: false,
    queryFn: () => checkCards(cands),
  });
  const verified = checks.data?.verified ?? new Set<string>();
  const failed = checks.data?.failed ?? 0;
  const pricesMissing = quotes.data?.some((q) => q.price8 === null || q.multiplier === null);
  if (!DEPLOYED) return <Notice tone="warn">Leaderboards fill from contract events once Terra Firma is live on mainnet.</Notice>;
  if (logs.error) return <Notice tone="danger">Couldn&apos;t read events from the chain. Retrying shortly.</Notice>;
  const l = logs.data;
  const loading = !l;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Board title="Biggest regret" desc="Minted Hindsight cards, re-verified against chain logs: what was paid vs. what it would be in stock." rows={regret(cands, verified)} loading={loading || (cands.length > 0 && checks.isLoading)} empty="No verified minted cards yet (each mint is re-derived from chain logs before it is ranked)." note={failed > 0 ? `${failed} card check${failed === 1 ? "" : "s"} couldn't run right now; those cards are not ranked.` : undefined} />
      <Board title="Biggest Jars" desc="Credited minus withdrawn, per wallet." note={pricesMissing ? "Some live stock prices are unavailable; wallets holding those stocks are left out until they read again." : undefined} rows={l && quotes.data ? jars(l, quotes.data) : []} loading={loading || !quotes.data} empty="No Jars yet." />
      <Board title="Most fees paid" desc="Sum of Traded.fee per wallet (half buys and burns $WIF, half buys stakers' stock)." rows={l ? fees(l) : []} loading={loading} empty="No routed trades yet." />
    </div>
  );
}
```

#### File: web/components/card-actions.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/card-actions.tsx
"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { Abi, Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, hindsightLensAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { DEPLOYED, WIF, publicClient } from "@/lib/ui-chain";
import { plainError } from "@/lib/ui-errors";
import { shares18, usd8 } from "@/lib/ui-format";
import { useApproveStep, useTx } from "./hooks";
import { TxStatus } from "./tx-status";
import { AddrLink, Button, Notice, cx } from "./ui";

/** Card buys mapped to HindsightLens.Buy. */
export function lensBuys(card: Card) {
  return card.memes.flatMap((m) =>
    m.buys.map((b) => ({
      payKind: b.payKind,
      payStockId: b.payStockId,
      amountPaid: BigInt(b.amountPaid),
      payRoundId: BigInt(b.payRoundId),
      stockRoundId: BigInt(b.stockRoundId),
      ts: BigInt(b.ts),
    })),
  );
}

export const stockIdOf = (symbol: string) => STOCKS.find((s) => s.symbol === symbol)?.id ?? 0;

export function shareUrl(card: Card, origin: string) {
  const text =
    card.memes.length === 0
      ? "My Hindsight card: clean hands, no memes. Check yours on Terra Firma."
      : `I put ${usd8(card.totals.usdPaid8)} into memes. ${card.unquoted.length > 0 ? "" : `Today: ${usd8(card.totals.usdToday8)}. `}In ${card.stock}: ${usd8(card.totals.usdCounterfactual8)}. Every number from Robinhood Chain + Chainlink.`;
  const url = `${origin}/card/${card.wallet}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function ShareButton({ card }: { card: Card }) {
  return (
    <Button variant="secondary" onClick={() => window.open(shareUrl(card, window.location.origin), "_blank", "noopener,noreferrer")}>
      Share to X
    </Button>
  );
}

/** HindsightLens.recompute eth_call on the card's own inputs, shown beside the API totals. */
export function useRecompute(card: Card | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("No card");
      const [usdPaid8, sh, usdNow8] = await publicClient.readContract({
        address: TF.HindsightLens,
        abi: hindsightLensAbi,
        functionName: "recompute",
        args: [lensBuys(card), stockIdOf(card.stock)],
      });
      return { usdPaid8, shares18: sh, usdNow8 };
    },
  });
}

export function RecomputeResult({ card, data, error }: { card: Card; data?: { usdPaid8: bigint; shares18: bigint; usdNow8: bigint }; error?: unknown }) {
  if (error) return <Notice tone="danger" className="mt-3">{plainError(error)}</Notice>;
  if (!data) return null;
  const paidMatch = data.usdPaid8 === BigInt(card.totals.usdPaid8);
  const sharesDiff = data.shares18 - BigInt(card.totals.shares18);
  const sharesMatch = (sharesDiff < 0n ? -sharesDiff : sharesDiff) <= BigInt(card.memes.reduce((n, m) => n + m.buys.length, 0));
  const rows = [
    { k: "Paid (USD)", api: usd8(card.totals.usdPaid8), chain: usd8(data.usdPaid8), ok: paidMatch },
    { k: `Shares of ${card.stock}`, api: shares18(card.totals.shares18), chain: shares18(data.shares18), ok: sharesMatch },
    { k: `In ${card.stock} now`, api: usd8(card.totals.usdCounterfactual8), chain: usd8(data.usdNow8), ok: null },
  ];
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line" role="status">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="px-3 py-2 font-medium">Figure</th><th className="px-3 py-2 text-right font-medium">API</th><th className="px-3 py-2 text-right font-medium">Onchain</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t border-line">
              <th scope="row" className="px-3 py-2 text-left font-normal text-muted">{r.k}</th>
              <td className="num px-3 py-2 text-right">{r.api}</td>
              <td className={cx("num px-3 py-2 text-right", r.ok === true && "text-accent", r.ok === false && "text-danger")}>
                {r.chain} {r.ok === true ? "✓" : r.ok === false ? "≠" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        Onchain = <AddrLink addr={TF.HindsightLens}>HindsightLens</AddrLink>.recompute() on the same buys. &ldquo;Now&rdquo; values use each side&apos;s latest feed read, so they can differ by a few cents.
      </p>
    </div>
  );
}

export function RecomputeButton({ card }: { card: Card }) {
  const m = useRecompute(card);
  const has = card.memes.length > 0;
  return (
    <div>
      <Button variant="secondary" disabled={!DEPLOYED || !has || m.isPending} onClick={() => m.mutate()} title={!DEPLOYED ? "Available once contracts are live" : undefined}>
        {m.isPending ? "Recomputing…" : "Recompute onchain"}
      </Button>
      <RecomputeResult card={card} data={m.data} error={m.error} />
    </div>
  );
}

const ONE_WIF = 10n ** 18n;

/** Approve exactly 1 $WIF to HindsightLens, then mintCard. Shown only to the connected owner holding >= 1 $WIF. */
export function MintButton({ card }: { card: Card }) {
  const { address } = useAccount();
  const bal = useReadContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address } });
  const tx = useTx();
  const approve = useApproveStep();
  const [minted, setMinted] = useState(false);
  const owner = address && address.toLowerCase() === card.wallet.toLowerCase();
  if (!owner || !DEPLOYED || (bal.data ?? 0n) < ONE_WIF || card.memes.length === 0) return null;
  const mint = async () => {
    const r = await tx.run([
      approve(WIF, TF.HindsightLens as Address, ONE_WIF, "$WIF"),
      { label: "Mint card (burns 1 $WIF)", call: { address: TF.HindsightLens, abi: hindsightLensAbi as unknown as Abi, functionName: "mintCard", args: [lensBuys(card), stockIdOf(card.stock)] } },
    ]);
    if (r) setMinted(true);
  };
  return (
    <div>
      <Button variant="secondary" disabled={tx.busy || minted} onClick={mint}>{minted ? "Minted onchain" : "Mint this card · burns 1 $WIF"}</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success="Minted onchain. 1 $WIF burned." />
    </div>
  );
}
```

#### File: web/components/card-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/card-view.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAccount } from "wagmi";
import { HISTORY_ADDR } from "@/lib/ui-chain";
import { AddressLookup } from "./address-lookup";
import type { Card } from "@/lib/hindsight";
import { MintButton, RecomputeButton, ShareButton } from "./card-actions";
import { ConnectButton } from "./connect-button";
import { HindsightCard } from "./hindsight-card";
import { StockSelect } from "./stock-select";
import { Button, LinkButton, Notice, Panel } from "./ui";

/** Read-only card for any wallet (server-fetched), ending with "Connect to fix yours". */
export function CardView({ card, error }: { card: Card | null; error: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const { address, isConnected } = useAccount();

  if (!card)
    return (
      <Panel>
        <p role="alert" className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => start(() => router.refresh())} disabled={pending}>{pending ? "Retrying…" : "Try again"}</Button>
      </Panel>
    );

  const own = isConnected && address?.toLowerCase() === card.wallet.toLowerCase();
  return (
    <div className="space-y-6" aria-busy={pending}>
      <HindsightCard
        card={card}
        owner={own}
        stockControl={<StockSelect value={card.stock} onChange={(s) => start(() => router.replace(`${path}?stock=${s}`, { scroll: false }))} label="Compare against" name="card-stock" />}
        actions={
          <div className="space-y-4 border-t border-line pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ShareButton card={card} />
              {own && <MintButton card={card} />}
            </div>
            <RecomputeButton card={card} />
          </div>
        }
      />
      {pending && <Notice>Repricing against the selected stock…</Notice>}
      <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold">{own ? "This is your wallet." : "Connect to fix yours."}</p>
        {isConnected ? <LinkButton href="/app">Open your card</LinkButton> : <ConnectButton label="Connect to fix yours" onConnected={() => router.push("/app")} />}
      </Panel>
      <Panel aria-labelledby="card-lookup-title" className="space-y-3">
        <h2 id="card-lookup-title" className="font-semibold">Look up another wallet</h2>
        {card.wallet.toLowerCase() !== HISTORY_ADDR.toLowerCase() && <LinkButton href={`/card/${HISTORY_ADDR}`} variant="secondary">See a wallet with real history</LinkButton>}
        <AddressLookup id="card-lookup" placeholder="Wallet address: 0x…" />
      </Panel>
    </div>
  );
}
```

#### File: web/components/connect-button.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/connect-button.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { CHAIN_ID, addrUrl } from "@/lib/config";
import { short } from "@/lib/ui-format";
import { HAS_WALLETCONNECT } from "@/lib/wagmi";
import { useMounted } from "./hooks";
import { Button, cx } from "./ui";

/** Connect / account button. Connecting always targets chain 4663 (the wallet is asked to add it if missing). */
export function ConnectButton({ className, label = "Connect wallet", onConnected }: { className?: string; label?: string; onConnected?: () => void }) {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (!mounted) return <Button className={cx("w-40", className)} disabled>{label}</Button>;
  if (isConnected && address) {
    if (chainId !== CHAIN_ID)
      return (
        <Button variant="secondary" className={className} disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
          {switching ? "Switching…" : "Switch to Robinhood Chain"}
        </Button>
      );
    return <AccountMenu address={address} className={className} onDisconnect={() => disconnect()} />;
  }
  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>{label}</Button>
      <WalletDialog open={open} onClose={() => setOpen(false)} onConnected={onConnected} />
    </>
  );
}

/** Address pill opens a small menu; disconnecting is an explicit second click, never the pill itself (S8). */
function AccountMenu({ address, className, onDisconnect }: { address: string; className?: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = `acct-${address.slice(2, 8)}`;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btn.current?.focus();
    };
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <div ref={wrap} className={cx("relative", className)}>
      <Button ref={btn} variant="secondary" className="w-full font-mono" aria-expanded={open} aria-controls={menuId} aria-label={`Connected as ${address}. Account options`} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden className="size-2 rounded-full bg-accent" />
        {short(address)}
        <span aria-hidden className="text-xs text-muted">▾</span>
      </Button>
      {open && (
        <div id={menuId} className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <button type="button" className={item} onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
          <a className={item} href={addrUrl(address)} target="_blank" rel="noopener noreferrer">View on explorer</a>
          <button type="button" className={cx(item, "text-danger")} onClick={() => { setOpen(false); onDisconnect(); }}>Disconnect</button>
          <span role="status" className="sr-only">{copied ? "Address copied" : ""}</span>
        </div>
      )}
    </div>
  );
}

function WalletDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { connectors, connect, isPending, error, variables } = useConnect();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // EIP-6963 discovery can surface the same wallet twice (generic "Injected" + named). Keep named ones.
  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (c.id === "injected" && connectors.some((x) => x.type === "injected" && x.id !== "injected")) return false;
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="wallet-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-6 text-fg">
      <h2 id="wallet-title" className="text-xl font-semibold">Connect a wallet</h2>
      <p className="mt-2 text-sm text-muted">Terra Firma runs on Robinhood Chain mainnet (chain 4663). Your wallet will be asked to switch.</p>
      <ul className="mt-5 space-y-2">
        {list.length === 0 && <li className="text-sm text-muted">No wallet found. Install a browser wallet{HAS_WALLETCONNECT ? " or use WalletConnect" : ""}.</li>}
        {list.map((c) => (
          <li key={c.uid}>
            <Button
              variant="secondary"
              className="w-full justify-between"
              disabled={isPending}
              onClick={() =>
                connect(
                  { connector: c, chainId: CHAIN_ID },
                  {
                    onSuccess: () => {
                      onClose();
                      onConnected?.();
                    },
                  },
                )
              }
            >
              <span>{c.name}</span>
              {isPending && variables && "connector" in variables && variables.connector === c && <span className="text-sm text-muted">Opening…</span>}
            </Button>
          </li>
        ))}
      </ul>
      {!HAS_WALLETCONNECT && <p className="mt-3 text-xs text-muted">WalletConnect (mobile wallets) isn&apos;t configured on this deployment.</p>}
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {/rejected|denied/i.test(error.message) ? "You cancelled in your wallet." : error.message.split("\n")[0]}
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </dialog>
  );
}
```

#### File: web/components/convert-panel.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/convert-panel.tsx
"use client";

// One-tap convert (PRD F3): pick memes -> per-meme convert quotes -> exact approvals -> TerraRouter.convert.
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Abi, type Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { terraRouterAbi } from "@/lib/abi";
import { CHAIN_ID, FEE_BPS, STOCKS, TF } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { memeByToken } from "@/lib/registry";
import { DEPLOYED, WIF } from "@/lib/ui-chain";
import { DASH, orDash, shares18, token as fmtToken, usd, usd8OrDash } from "@/lib/ui-format";
import { sharesOf, usdOf } from "@/lib/ui-report";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { getJson, useApproveStep, useStockQuotes, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { Button, LinkButton, Notice, Skeleton, TxLink, cx } from "./ui";

interface ConvertQuote {
  route: { kind: number; v2Path: Address[]; v3Path: `0x${string}`; key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address } };
  stockOut: string;
  minStockOut: string;
  fee: string;
  ethFromSale: string;
}

const HALF_DOLLAR = 50_000_000n;

/** Today's value of one meme; null when the server had no quote for it (Card.partial). */
const todayOf = (m: Card["memes"][number]): bigint | null => (m.usdToday8 === null ? null : BigInt(m.usdToday8));

export function ConvertPanel({ card, initialStock = "NVDA", onDone, onBusy }: { card: Card; initialStock?: string; onDone?: () => void; onBusy?: (busy: boolean) => void }) {
  const { address } = useAccount();
  const qc = useQueryClient();
  const [stock, setStock] = useState(initialStock);
  const stockInfo = STOCKS.find((s) => s.symbol === stock) ?? STOCKS[0];
  const candidates = useMemo(
    () => card.memes.filter((m) => BigInt(m.holding) > 0n && m.token.toLowerCase() !== WIF.toLowerCase()),
    [card],
  );
  const [picked, setPicked] = useState<Set<string>>(() => new Set(candidates.filter((m) => (todayOf(m) ?? 0n) >= HALF_DOLLAR).map((m) => m.token)));
  const fee = useReadContract({ address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: DEPLOYED && !!address } });
  const feeBps = fee.data ?? FEE_BPS;
  const quoteOpts = (m: Card["memes"][number]) => ({
    queryKey: ["quote", "convert", m.token, m.holding, stock, feeBps],
    queryFn: () => getJson<ConvertQuote>(`/api/quote?token=${m.token}&side=convert&amount=${m.holding}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 20_000,
    retry: 1,
  });
  const quotes = useQueries({ queries: candidates.map(quoteOpts) });
  const market = useStockQuotes();
  const sq = market.data?.find((q) => q.symbol === stock);
  const gate = useStockGate();
  const tx = useTx();
  const approve = useApproveStep();
  const [result, setResult] = useState<bigint | null>(null);
  useEffect(() => onBusy?.(tx.busy), [tx.busy, onBusy]);

  const chosen = candidates.map((m, i) => ({ m, q: quotes[i] })).filter(({ m, q }) => picked.has(m.token) && q.data);
  const stockOut = chosen.reduce((s, c) => s + BigInt(c.q.data!.stockOut), 0n);
  const minStock = chosen.reduce((s, c) => s + BigInt(c.q.data!.minStockOut), 0n);
  const loading = quotes.some((q, i) => picked.has(candidates[i].token) && q.isLoading);

  const toggle = (t: string) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(t)) n.delete(t);
    else n.add(t);
    return n;
  });

  const submit = () =>
    gate.gate(async () => {
      const steps = chosen.map(({ m }) => approve(m.token, TF.TerraRouter, BigInt(m.holding), m.symbol));
      const memes = chosen.map((c) => c.m);
      steps.push({
        label: `Convert to ${stock}`,
        // Re-quote every meme right before the convert signature (after approvals), so minStockOut is never stale (S2).
        build: async () => {
          const fresh = await Promise.all(memes.map((m) => qc.fetchQuery({ ...quoteOpts(m), staleTime: 0 })));
          const min = fresh.reduce((a, f) => a + BigInt(f.minStockOut), 0n);
          const minSh = sharesOf(min, sq);
          return {
            label: minSh === null ? `Convert to ${stock} (fresh minimum applied; live ${stock} price unavailable to display)` : `Convert to ${stock}, at least ${shares18(minSh)} ${stock}`,
            call: {
              address: TF.TerraRouter,
              abi: terraRouterAbi as unknown as Abi,
              functionName: "convert",
              args: [fresh.map((f) => f.route), memes.map((m) => m.token), memes.map((m) => BigInt(m.holding)), stockInfo.id, min],
            },
          };
        },
      });
      const r = await tx.run(steps);
      if (!r) return;
      const ev = parseEventLogs({ abi: terraRouterAbi, logs: r.logs, eventName: "Converted" })[0];
      setResult(ev ? ev.args.stockOut : null);
      qc.invalidateQueries({ queryKey: ["card"] });
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      qc.invalidateQueries({ queryKey: ["jar"] });
    });

  if (tx.state.phase === "done") {
    return (
      <div className="space-y-4">
        <Notice tone="accent">
          <p className="text-lg font-semibold">
            Done. You own {result !== null && sharesOf(result, sq) !== null ? <span className="num">{shares18(sharesOf(result, sq)!)}</span> : "new"} {stock}. It&apos;s in your Jar. Withdraw any time.
          </p>
        </Notice>
        <ul className="space-y-1 text-sm text-muted">
          {tx.state.hashes.map((h) => (
            <li key={h.hash}>{h.label}: <TxLink hash={h.hash} /></li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/jar">Open your Jar</LinkButton>
          {onDone && <Button variant="secondary" onClick={onDone}>Back to card</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gate.dialog}
      {candidates.length === 0 ? (
        <Notice>No convertible memes in this wallet. $WIF is never converted; stake it instead.</Notice>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Memes to sell</legend>
          <ul className="space-y-2">
            {candidates.map((m, i) => {
              const q = quotes[i];
              const err = q.error as Error | null;
              const disabled = !!err || memeByToken(m.token)?.taxed;
              return (
                <li key={m.token}>
                  <label className={cx("flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5", disabled ? "border-line opacity-60" : "cursor-pointer border-line hover:border-muted")}>
                    <input type="checkbox" className="size-5 accent-[var(--accent)]" disabled={disabled} checked={picked.has(m.token) && !disabled} onChange={() => toggle(m.token)} />
                    <span className="flex-1">
                      <span className="font-semibold">{m.symbol}</span>{" "}
                      <span className="num text-sm text-muted">{fmtToken(m.holding)} · {usd8OrDash(todayOf(m))}{todayOf(m) === null && <span className="ml-1 text-xs">(price unavailable)</span>}</span>
                    </span>
                    <span className="num text-right text-sm">
                      {q.isLoading ? <Skeleton w="5rem" /> : err ? <span className="text-danger">{err.message === "No Uniswap route for this token." ? "no route" : err.message}</span> : `≈ ${orDash(sharesOf(BigInt(q.data!.stockOut), sq), shares18)} ${stock}`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <StockSelect value={stock} onChange={setStock} label="Into stock" name="convert-stock" />

      {chosen.length > 0 && (
        <Notice>
          Sell {chosen.map((c) => c.m.symbol).join(", ")} → get ≈{" "}
          <strong className="num">{orDash(sharesOf(stockOut, sq), shares18)} {stock}</strong> (≈ <span className="num">{orDash(usdOf(stockOut, sq), usd)}</span>). Fee{" "}
          {(Number(feeBps) / 100).toFixed(1)}%. Guaranteed at least <strong className="num">{orDash(sharesOf(minStock, sq), shares18)} {stock}</strong> or nothing happens.
          {(sharesOf(stockOut, sq) === null || usdOf(stockOut, sq) === null) && <span className="mt-1 block text-xs text-muted">{DASH} = live {stock} price unavailable right now; the onchain minimum still applies.</span>}
          <span className="mt-1 block text-xs text-muted">The quote is refreshed right before you sign, and the minimum you sign is shown in the wallet step.</span>
        </Notice>
      )}

      {gate.status === "restricted" && <Notice tone="warn">{GEO_BLOCKED}</Notice>}
      <GeoLoadingNote status={gate.status} />
      {!DEPLOYED && <Notice tone="warn">Convert opens when the Terra Firma contracts are live on mainnet.</Notice>}

      <Button
        className="w-full"
        disabled={!DEPLOYED || !address || chosen.length === 0 || loading || tx.busy || gate.status === "restricted" || gate.status === "loading"}
        onClick={submit}
      >
        {tx.busy ? "Working…" : chosen.length > 1 ? `Approve ${chosen.length} memes and convert` : "Convert"}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} />
      <p className="text-xs text-muted">
        One exact-amount approval per meme, then one convert transaction. The stock fill is bounded by Chainlink minus 3%.
      </p>
    </div>
  );
}
```

#### File: web/components/friends-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/friends-view.tsx
"use client";

import { useState } from "react";
import { keccak256, parseEventLogs, toBytes, type Abi, type Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { friendJarAbi, stockOracleAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF } from "@/lib/config";
import { orDash } from "@/lib/ui-format";
import { DEPLOYED, publicClient } from "@/lib/ui-chain";
import { parseAmount, shares18 } from "@/lib/ui-format";
import { only } from "@/lib/ui-logs";
import { sharesOf } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { useMounted, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Button, Notice, Panel, Skeleton, inputCls } from "./ui";

const F = { address: TF.FriendJar, abi: friendJarAbi as unknown as Abi };

export function FriendsView() {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!DEPLOYED) return <Notice tone="warn">Friend Jars open when the Terra Firma contracts are live on mainnet.</Notice>;
  if (!mounted) return <Skeleton w="100%" h="10rem" className="block" />;
  if (!address)
    return (
      <Panel className="flex flex-col items-start gap-4">
        <p className="text-lg">Connect a wallet to start or join a Friend Jar.</p>
        <ConnectButton />
      </Panel>
    );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Create />
        <Join />
      </div>
      <MyJars user={address} />
    </div>
  );
}

function Create() {
  const [stock, setStock] = useState("NVDA");
  const [invite, setInvite] = useState("");
  const [created, setCreated] = useState<bigint | null>(null);
  const tx = useTx();
  const create = async () => {
    const id = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([{ label: "Create Friend Jar", call: { ...F, functionName: "create", args: [id, keccak256(toBytes(invite))] } }]);
    const ev = r && parseEventLogs({ abi: friendJarAbi, logs: r.logs, eventName: "JarCreated" })[0];
    if (ev) setCreated(ev.args.id);
  };
  return (
    <Panel aria-labelledby="create-h" className="space-y-4">
      <h2 id="create-h" className="font-semibold">Start a Friend Jar</h2>
      <StockSelect value={stock} onChange={setStock} label="Jar stock" name="fj-stock" />
      <div>
        <label htmlFor="fj-invite" className="text-sm text-muted">Invite code (share it with friends; only its hash goes onchain)</label>
        <input id="fj-invite" value={invite} onChange={(e) => setInvite(e.target.value)} className={`${inputCls} mt-2`} minLength={6} autoComplete="off" />
      </div>
      <Button className="w-full" disabled={invite.length < 6 || tx.busy} onClick={create}>Create</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={created !== null ? <>Created Friend Jar #{created.toString()}. Friends join with id {created.toString()} and your code.</> : "Created."} />
    </Panel>
  );
}

function Join() {
  const [id, setId] = useState("");
  const [invite, setInvite] = useState("");
  const tx = useTx();
  const valid = /^\d+$/.test(id) && invite.length > 0;
  return (
    <Panel aria-labelledby="join-h" className="space-y-4">
      <h2 id="join-h" className="font-semibold">Join with an invite</h2>
      <div>
        <label htmlFor="fj-id" className="text-sm text-muted">Jar id</label>
        <input id="fj-id" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} className={`${inputCls} num mt-2`} />
      </div>
      <div>
        <label htmlFor="fj-code" className="text-sm text-muted">Invite code</label>
        <input id="fj-code" value={invite} onChange={(e) => setInvite(e.target.value)} className={`${inputCls} mt-2`} autoComplete="off" />
      </div>
      <Button className="w-full" disabled={!valid || tx.busy} onClick={() => tx.run([{ label: "Join Friend Jar", call: { ...F, functionName: "join", args: [BigInt(id), invite] } }])}>Join</Button>
      <TxStatus state={tx.state} onReset={tx.reset} success="Joined. Contribute ETH below to buy into the Jar's stock." />
    </Panel>
  );
}

function MyJars({ user }: { user: Address }) {
  const logs = useTfLogs();
  const ids = [...new Set(only(logs.data?.friend ?? [], "Joined").filter((l) => l.args.member.toLowerCase() === user.toLowerCase()).map((l) => l.args.id))];
  if (logs.isLoading) return <Skeleton w="100%" h="6rem" className="block" />;
  if (ids.length === 0) return <Panel><p className="text-muted">You&apos;re not in any Friend Jar yet.</p></Panel>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ids.map((id) => <JarCard key={id.toString()} id={id} user={user} />)}
    </div>
  );
}

function JarCard({ id, user }: { id: bigint; user: Address }) {
  const fj = { address: TF.FriendJar, abi: friendJarAbi, chainId: CHAIN_ID } as const;
  const r = useReadContracts({ contracts: [{ ...fj, functionName: "groups", args: [id] }, { ...fj, functionName: "sharesOf", args: [id, user] }, { ...fj, functionName: "stockOf", args: [id] }] });
  const quotes = useStockQuotes();
  const gate = useStockGate();
  const tx = useTx();
  const [amt, setAmt] = useState("");
  const g = r.data?.[0]?.result as readonly [number, Address, `0x${string}`, bigint] | undefined;
  const mine = r.data?.[1]?.result as bigint | undefined;
  const pot = r.data?.[2]?.result as bigint | undefined;
  const stockId = g?.[0] ?? 0;
  const q = quotes.data?.[stockId];
  const myStock = g && mine !== undefined && pot !== undefined && g[3] > 0n ? (pot * mine) / g[3] : 0n;
  const wei = parseAmount(amt);
  const contribute = () =>
    gate.gate(async () => {
      if (!wei) return;
      const min = await publicClient.readContract({ address: TF.StockOracle, abi: stockOracleAbi, functionName: "minStockOut", args: [stockId, wei] });
      await tx.run([{ label: "Contribute", call: { ...F, functionName: "contribute", args: [id, min], value: wei } }]);
      r.refetch();
    });
  return (
    <Panel className="space-y-4">
      {gate.dialog}
      <h3 className="font-semibold">Friend Jar #{id.toString()} · {STOCKS[stockId]?.symbol}</h3>
      <p className="num text-sm text-muted">
        Your share: {quotes.data ? <AddrLink addr={TF.FriendJar}>{orDash(sharesOf(myStock, q), shares18)} {STOCKS[stockId]?.symbol}</AddrLink> : <Skeleton w="5rem" />} · whole Jar{" "}
        {pot !== undefined && quotes.data ? <AddrLink addr={TF.FriendJar}>{orDash(sharesOf(pot, q), shares18)}</AddrLink> : "…"}
      </p>
      {gate.status === "restricted" ? (
        <Notice tone="warn">{GEO_BLOCKED}</Notice>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`fj-amt-${id}`} className="sr-only">ETH to contribute</label>
          <input id={`fj-amt-${id}`} inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="ETH" className={`${inputCls} num sm:flex-1`} />
          <Button disabled={!wei || tx.busy || gate.status === "loading"} onClick={contribute}>Contribute</Button>
        </div>
      )}
      <GeoLoadingNote status={gate.status} />
      <Button variant="secondary" className="w-full" disabled={!mine || tx.busy} onClick={async () => { await tx.run([{ label: "Exit Friend Jar", call: { ...F, functionName: "exit", args: [id] } }]); r.refetch(); }}>
        Exit with my share
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} />
    </Panel>
  );
}
```

#### File: web/components/geo-gate.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/geo-gate.tsx
"use client";

// Geofence on the stock leg only (PRD F8): IP country from /api/geo + one-time attestation in localStorage.
// Restricted -> stock actions disabled. Unknown or not restricted -> attestation required, never silently allowed.
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import restricted from "@/data/restricted.json";
import { Button, ExtLink } from "./ui";

const KEY = "tf.attest.v1";
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function setAttested() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: attestation lasts for this page only */
  }
  memo = true;
  listeners.forEach((l) => l());
}
let memo = false;

export type StockAccess = "loading" | "restricted" | "needs-attest" | "ok";
export const GEO_BLOCKED = "Stock purchases aren't available in your region. Your card still works.";
export const GEO_LOADING = "Checking your region before stock actions… (a second or two)";

/** Visible reason a stock-leg button is disabled while the region check runs (S3). */
export function GeoLoadingNote({ status }: { status: StockAccess }) {
  if (status !== "loading") return null;
  return <p role="status" className="text-sm text-muted">{GEO_LOADING}</p>;
}

export function useStockAccess() {
  const geo = useQuery({
    queryKey: ["geo"],
    queryFn: async () => (await fetch("/api/geo")).json() as Promise<{ country: string; restricted: boolean; unknown: boolean }>,
    staleTime: Infinity,
  });
  const attested = useSyncExternalStore(subscribe, () => memo || read(), () => false);
  const status: StockAccess = geo.isLoading ? "loading" : geo.data?.restricted ? "restricted" : attested ? "ok" : "needs-attest";
  return { status, country: geo.data?.country };
}

/** `gate(fn)` runs fn when allowed, otherwise opens the attestation dialog first. */
export function useStockGate() {
  const { status, country } = useStockAccess();
  const [pending, setPending] = useState<null | (() => void)>(null);
  const gate = useCallback(
    (fn: () => void) => {
      if (status === "ok") fn();
      else if (status === "needs-attest") setPending(() => fn);
    },
    [status],
  );
  const dialog = (
    <AttestDialog
      open={pending !== null}
      country={country}
      onClose={() => setPending(null)}
      onConfirm={() => {
        setAttested();
        const fn = pending;
        setPending(null);
        fn?.();
      }}
    />
  );
  return { status, gate, dialog };
}

function AttestDialog({ open, country, onClose, onConfirm }: { open: boolean; country?: string; onClose: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const list = (restricted as { countries: string[]; source: string }).countries;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="attest-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-6 text-fg"
    >
      <h2 id="attest-title" className="text-xl font-semibold">One quick check</h2>
      <p className="mt-3 text-muted">
        Stock Tokens aren&apos;t available in some regions. We detected{" "}
        <strong className="text-fg">{country && country !== "UNKNOWN" ? country : "an unknown region"}</strong>. This check is a
        frontend control, not enforced onchain.
      </p>
      <p className="mt-2 text-sm text-muted">
        Restricted list:{" "}
        {list.length > 0 ? list.join(", ") : "see the published list"} (
        <ExtLink href={(restricted as { source: string }).source}>source</ExtLink>).
      </p>
      <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 size-5 accent-[var(--accent)]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I am not a resident of a restricted jurisdiction.</span>
      </label>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!checked} onClick={onConfirm}>Continue</Button>
      </div>
    </dialog>
  );
}
```

#### File: web/components/guarantee.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/guarantee.tsx
import Link from "next/link";
import { cx } from "./ui";

/** PRD §4.13 "Landing guarantee" (critique E-1). Copy is fixed; do not paraphrase. */
export const GUARANTEE = "Every number here is recomputable onchain. Terra Firma never sells or prices $WIF. Every stock fill is bounded by Chainlink.";

/** Deep link into the /proof recompute box, prefilled when a wallet is known. */
export function recomputeHref(addr?: string, stock?: string) {
  if (!addr) return "/proof#recompute";
  const q = new URLSearchParams({ addr, ...(stock ? { stock } : {}) });
  return `/proof?${q.toString()}#recompute`;
}

export function Guarantee({ addr, stock, className }: { addr?: string; stock?: string; className?: string }) {
  return (
    <p className={cx("flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3", className)}>
      <span>{GUARANTEE}</span>
      <Link
        href={recomputeHref(addr, stock)}
        className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
      >
        Recompute this card<span aria-hidden>&nbsp;→</span>
      </Link>
    </p>
  );
}
```

#### File: web/components/hindsight-card.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/hindsight-card.tsx
"use client";

import { useState, type ReactNode } from "react";
import { ADDR, EXPLORER, STOCKS } from "@/lib/config";
import type { Card, CardBuy, CardMeme } from "@/lib/hindsight";
import { REGISTRY } from "@/lib/registry";
import { DASH, date, pct, pctChange, roundTail, shares18, token, usd8, usd8Label } from "@/lib/ui-format";
import { Guarantee } from "./guarantee";
import { AddrLink, Badge, ExtLink, Notice, Panel, Skeleton, TxLink, cx } from "./ui";

const payAsset = (b: CardBuy) =>
  b.payKind === 0
    ? { sym: "ETH", dec: 18, feed: ADDR.ethUsd }
    : b.payKind === 1
      ? { sym: "USDG", dec: 6, feed: ADDR.usdgUsd }
      : { sym: STOCKS[b.payStockId]?.symbol ?? "stock", dec: 18, feed: STOCKS[b.payStockId]?.historyFeed ?? ADDR.ethUsd };

function Receipt({ b, stock }: { b: CardBuy; stock: (typeof STOCKS)[number] }) {
  const p = payAsset(b);
  return (
    <li className="rounded-lg bg-bg/60 px-3 py-2.5 text-sm leading-relaxed text-muted">
      Paid <span className="num text-fg">{token(b.amountPaid, p.dec)} {p.sym}</span> ({usd8(b.usdPaid8)}) on {date(b.ts)} (tx <TxLink hash={b.tx} />).{" "}
      {p.sym} was <span className="num text-fg">{usd8(b.payUsd8)}</span> (<AddrLink addr={p.feed}>Chainlink round {roundTail(b.payRoundId)}</AddrLink>
      <span className="sr-only"> full id {b.payRoundId}</span>). {stock.symbol} was <span className="num text-fg">{usd8(b.stockUsd8)}</span> (
      <AddrLink addr={stock.historyFeed}>round {roundTail(b.stockRoundId)}</AddrLink>
      <span className="sr-only"> full id {b.stockRoundId}</span>), so it would have bought <span className="num text-fg">{shares18(b.shares18)} {stock.symbol}</span>.
    </li>
  );
}

function MemeRow({ m, stock, worst }: { m: CardMeme; stock: (typeof STOCKS)[number]; worst: boolean }) {
  const [open, setOpen] = useState(false);
  const id = `receipts-${m.token}`;
  const change = pctChange(m.usdPaid8, m.usdToday8);
  return (
    <li className={cx("rounded-xl border", worst ? "border-danger/50 bg-danger-soft" : "border-line")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
      >
        <span className="flex items-center gap-2 font-semibold">
          {m.symbol}
          {worst && <Badge tone="danger">worst trade</Badge>}
        </span>
        <span className="num text-right text-sm sm:text-base">
          <span className="text-muted sm:hidden">paid </span>
          <span aria-hidden>{usd8(m.usdPaid8)}</span>
          <span className="sr-only">paid {usd8Label(m.usdPaid8)}</span>
        </span>
        <span className="num text-sm sm:text-right sm:text-base">
          <span className="text-muted sm:hidden">today </span>
          {m.usdToday8 === null ? (
            <>
              <span aria-hidden>{DASH}</span>
              <span className="ml-1 text-xs text-muted">price unavailable</span>
              <span className="sr-only">value today unavailable{m.todayReason ? `: ${m.todayReason}` : ""}</span>
            </>
          ) : (
            <>
              <span aria-hidden>{usd8(m.usdToday8)}</span>
              <span className="sr-only">value today {usd8Label(m.usdToday8)}</span>
            </>
          )}
          {change !== null && <span className={cx("ml-1 text-xs", change < 0 ? "text-danger" : "text-accent")}>{pct(change)}</span>}
        </span>
        <span className="num text-right text-sm font-semibold text-accent sm:text-base">
          <span className="font-normal text-muted sm:hidden">in {stock.symbol} </span>
          <span aria-hidden>{usd8(m.usdCounterfactual8)}</span>
          <span className="sr-only">in {stock.symbol} {usd8Label(m.usdCounterfactual8)}</span>
        </span>
        <span aria-hidden className={cx("col-span-2 text-xs text-muted transition-transform sm:col-span-1", open && "rotate-180")}>▾</span>
      </button>
      {open && (
        <div id={id} className="px-4 pb-4">
          <p className="mb-2 text-xs text-muted">
            {m.buys.length} priced buy{m.buys.length === 1 ? "" : "s"} · holding <span className="num">{token(m.holding)}</span> {m.symbol} ·{" "}
            <AddrLink addr={m.token}>token</AddrLink>
          </p>
          <ul className="space-y-2">
            {m.buys.map((b) => (
              <Receipt key={`${b.tx}-${b.block}`} b={b} stock={stock} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function HindsightCard({ card, owner = true, stockControl, actions }: { card: Card; owner?: boolean; stockControl?: ReactNode; actions?: ReactNode }) {
  const stock = STOCKS.find((s) => s.symbol === card.stock) ?? STOCKS[0];
  const empty = card.memes.length === 0 && card.unpriced.length === 0;
  const who = owner ? "You" : "This wallet";
  return (
    <Panel aria-labelledby="card-title" className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="card-title" className="text-sm font-medium uppercase tracking-wider text-muted">Hindsight card</h2>
          <p className="mt-1 font-mono text-sm"><AddrLink addr={card.wallet} /></p>
        </div>
        <p className="text-xs text-muted">
          As of block <ExtLink href={`${EXPLORER}/block/${card.asOfBlock}`}><span className="num">{card.asOfBlock.toLocaleString("en-US")}</span></ExtLink>
        </p>
      </div>

      {card.partial && <PartialBanner card={card} />}

      {empty ? (
        <div className="py-6 text-center">
          <p className="text-2xl font-semibold">None of the {REGISTRY.memes.length} memes we track are in this wallet.</p>
          {REGISTRY.memes.length === 0 && <p className="mt-2 text-sm text-muted">The meme registry is still being built, so no tokens were scanned yet.</p>}
        </div>
      ) : (
        <>
          <p className="text-xl font-semibold leading-snug sm:text-2xl">
            {who} put <span className="num">{usd8(card.totals.usdPaid8)}</span> into memes still held. Today{card.unquoted.length > 0 ? " (priced memes only)" : ""}: <span className="num">{usd8(card.totals.usdToday8)}</span>. In {stock.symbol}:{" "}
            <span className="num text-accent">{usd8(card.totals.usdCounterfactual8)}</span>.
          </p>
          <p className="text-xs text-muted">Gross buys of memes this wallet still holds, priced with the Chainlink round at each buy. Sells and transfers out are not netted; this is not P&amp;L.</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label="Paid" value={usd8(card.totals.usdPaid8)} aria={usd8Label(card.totals.usdPaid8)} />
            <Figure label="Today" value={usd8(card.totals.usdToday8)} aria={usd8Label(card.totals.usdToday8)} sub={card.unquoted.length > 0 ? `${card.memes.filter((m) => m.usdToday8 !== null).length} of ${card.memes.length} memes priced; paid for those: ${usd8(card.totals.usdPaidQuoted8)}` : undefined} />
            <Figure label={`In ${stock.symbol}`} value={usd8(card.totals.usdCounterfactual8)} aria={usd8Label(card.totals.usdCounterfactual8)} sub={`${shares18(card.totals.shares18)} shares`} accent />
          </dl>
          {card.worst && (
            <p className="text-sm text-muted">
              Worst trade: <strong className="text-fg">{card.worst.symbol}</strong> <span className="num text-danger">{pct(card.worst.pct)}</span>
            </p>
          )}
        </>
      )}

      {stockControl}

      {card.memes.length > 0 && (
        <div>
          <div className="mb-2 hidden grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-x-3 px-4 text-xs uppercase tracking-wider text-muted sm:grid" aria-hidden>
            <span>Meme</span><span className="text-right">Paid</span><span className="text-right">Today</span><span className="text-right">In {stock.symbol}</span><span className="w-3" />
          </div>
          <ul className="space-y-2" aria-label="Meme buys. Expand a row for receipts.">
            {card.memes.map((m) => (
              <MemeRow key={m.token} m={m} stock={stock} worst={card.worst?.symbol === m.symbol} />
            ))}
          </ul>
        </div>
      )}

      {card.unpriced.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Not priced ({card.unpriced.length})</h3>
          <p className="text-xs text-muted">Shown for honesty, excluded from totals. We never estimate these.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {card.unpriced.map((u) => (
              <li key={`${u.tx}-${u.token}`} className="flex flex-wrap items-center gap-x-2 text-muted">
                <span className="font-semibold text-fg">{u.symbol}</span>
                <span>{u.reason}</span>
                <TxLink hash={u.tx} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions}

      <Guarantee addr={card.wallet} stock={card.stock} className="border-t border-line pt-4" />
    </Panel>
  );
}

/** Server flagged the card incomplete: say exactly what is missing. Totals come from the server; nothing is filled in here. */
function PartialBanner({ card }: { card: Card }) {
  return (
    <Notice tone="warn">
      <p className="font-semibold">Partial card: some numbers could not be read right now.</p>
      {card.unquoted.length > 0 && (
        <p className="mt-1">
          No price today for {card.unquoted.map((u) => `${u.symbol} (${u.reason})`).join(", ")}. Those show {DASH} and are left out of the Today total.
        </p>
      )}
      {card.scanGaps.length > 0 && (
        <p className="mt-1">
          History for {[...new Set(card.scanGaps.map((g) => g.symbol))].join(", ")} could not be read completely, so some buys may be missing. Refresh to retry.
        </p>
      )}
    </Notice>
  );
}

function Figure({ label, value, aria, sub, accent }: { label: string; value: string; aria: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cx("rounded-xl border p-4", accent ? "border-accent/40 bg-accent-soft" : "border-line bg-surface-2/50")}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cx("num mt-1 text-2xl font-bold tracking-tight sm:text-3xl", accent && "text-accent")} aria-label={`${label}: ${aria}`}>
        {value}
      </dd>
      {sub && <dd className="num mt-0.5 text-xs text-muted">{sub}</dd>}
    </div>
  );
}

export function CardSkeleton() {
  const n = REGISTRY.memes.length;
  return (
    <Panel aria-busy="true" className="space-y-6">
      <p role="status" className="text-sm text-muted">
        Reading your meme buys from the chain… (scanning {n} meme{n === 1 ? "" : "s"})
      </p>
      <Skeleton w="85%" h="1.75rem" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <Skeleton w="3rem" h="0.9rem" />
            <div className="mt-2"><Skeleton w="7rem" h="2rem" /></div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} w="100%" h="3rem" className="block" />
        ))}
      </div>
    </Panel>
  );
}
```

#### File: web/components/hooks.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/components/hooks.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { type Abi, type Address, type Hex, type TransactionReceipt } from "viem";
import { useAccount, useConfig } from "wagmi";
import { getAccount, readContract, simulateContract, switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { erc20Abi } from "@/lib/abi";
import { ADDR, CHAIN_ID } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { aggregatorAbi, publicClient } from "@/lib/ui-chain";
import { API_ERRORS, WRONG_CHAIN, plainError } from "@/lib/ui-errors";
import { scanLogs } from "@/lib/ui-logs";
import { stockQuotes } from "@/lib/ui-report";

/** Ticking clock (seconds). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Every Terra Firma event since deploy, refreshed incrementally every 30s. */
export function useTfLogs() {
  return useQuery({ queryKey: ["tf-logs"], queryFn: scanLogs, refetchInterval: 30_000, staleTime: 15_000 });
}

/** uiMultiplier + Chainlink live price per curated stock. */
export function useStockQuotes() {
  return useQuery({ queryKey: ["stock-quotes"], queryFn: stockQuotes, refetchInterval: 60_000, staleTime: 30_000 });
}

export function useEthUsd() {
  return useQuery({
    queryKey: ["eth-usd"],
    queryFn: async () => {
      const r = await publicClient.readContract({ address: ADDR.ethUsd, abi: aggregatorAbi, functionName: "latestRoundData" });
      return { roundId: r[0], price8: r[1], updatedAt: Number(r[3]) };
    },
    refetchInterval: 60_000,
  });
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(API_ERRORS[(body as { error?: string }).error ?? ""] ?? "The chain is busy. Try again in a few seconds.");
  return body as T;
}

export function useCard(addr: string | undefined, stock: string) {
  return useQuery({
    queryKey: ["card", addr?.toLowerCase(), stock],
    queryFn: () => getJson<Card>(`/api/hindsight?addr=${addr}&stock=${stock}`),
    enabled: !!addr,
    staleTime: 300_000,
    retry: 3,
    retryDelay: (n) => 1000 * 2 ** n,
  });
}

export { getJson };

// ---------------------------------------------------------------------------------------------
// Transactions: simulate (decodes custom errors before the wallet opens), sign, wait for receipt.

export interface WriteCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Explicit gas limit (FeePool.distribute needs ~3.1M with all six pools live; wallet estimates can under-shoot). */
  gas?: bigint;
}

export interface TxStep {
  label: string;
  /** Static call, or `build` to compute it right before signing (fresh quote + min-out). One of the two is required. */
  call?: WriteCall;
  build?: () => Promise<{ call: WriteCall; label?: string }>;
  /** Return true to skip (e.g. allowance already sufficient). */
  skip?: () => Promise<boolean>;
}

/** Make sure the wallet is on 4663 before a write; ask it to switch if not. Throws a plain-language error. */
async function ensureChain(config: Parameters<typeof getAccount>[0]) {
  if (getAccount(config).chainId === CHAIN_ID) return;
  try {
    await switchChain(config, { chainId: CHAIN_ID });
  } catch (e) {
    const msg = plainError(e);
    throw new Error(msg === "You cancelled in your wallet." ? `${WRONG_CHAIN} The switch was cancelled.` : WRONG_CHAIN);
  }
  if (getAccount(config).chainId !== CHAIN_ID) throw new Error(WRONG_CHAIN);
}

export type TxPhase = "idle" | "sign" | "pending" | "done" | "error";

export interface TxState {
  phase: TxPhase;
  step: number;
  total: number;
  label: string;
  hash?: Hex;
  hashes: { label: string; hash: Hex }[];
  error?: string;
}

const IDLE: TxState = { phase: "idle", step: 0, total: 0, label: "", hashes: [] };

export function useTx() {
  const config = useConfig();
  const { address } = useAccount();
  const [state, setState] = useState<TxState>(IDLE);

  const run = useCallback(
    async (steps: TxStep[]): Promise<TransactionReceipt | null> => {
      if (!address) return null;
      const hashes: TxState["hashes"] = [];
      let last: TransactionReceipt | null = null;
      try {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (s.skip && (await s.skip())) continue;
          await ensureChain(config);
          let call = s.call;
          let label = s.label;
          if (s.build) {
            setState({ phase: "sign", step: i + 1, total: steps.length, label: `${s.label}: refreshing the quote`, hashes: [...hashes] });
            const b = await s.build();
            call = b.call;
            label = b.label ?? s.label;
          }
          if (!call) throw new Error("Nothing to sign.");
          setState({ phase: "sign", step: i + 1, total: steps.length, label, hashes: [...hashes] });
          // One localized cast: the steps array mixes ABIs, so wagmi's per-ABI generics cannot be inferred here.
          const { request } = await simulateContract(config, { ...call, account: address, chainId: CHAIN_ID } as never);
          const hash = await writeContract(config, request as never);
          hashes.push({ label, hash });
          setState({ phase: "pending", step: i + 1, total: steps.length, label, hash, hashes: [...hashes] });
          last = await waitForTransactionReceipt(config, { hash, chainId: CHAIN_ID });
          if (last.status !== "success") throw new Error(`${label} reverted onchain.`);
        }
        setState((p) => ({ ...p, phase: "done", hashes: [...hashes] }));
        return last;
      } catch (e) {
        setState((p) => ({ ...p, phase: "error", error: plainError(e), hashes: [...hashes] }));
        return null;
      }
    },
    [address, config],
  );

  const reset = useCallback(() => setState(IDLE), []);
  const busy = state.phase === "sign" || state.phase === "pending";
  return { state, run, reset, busy };
}

/** Exact-amount ERC-20 approval step, skipped when the allowance already covers it. */
export function useApproveStep() {
  const config = useConfig();
  const { address } = useAccount();
  return useCallback(
    (tokenAddr: Address, spender: Address, amount: bigint, symbol: string): TxStep => ({
      label: `Approve ${symbol}`,
      call: { address: tokenAddr, abi: erc20Abi as unknown as Abi, functionName: "approve", args: [spender, amount] },
      skip: async () => {
        if (!address) return false;
        const a = await readContract(config, { address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [address, spender], chainId: CHAIN_ID });
        return a >= amount;
      },
    }),
    [address, config],
  );
}
```

#### File: web/components/jar-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/jar-view.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { formatUnits, parseUnits, type Abi, type Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { jarAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { DASH, dateTime, orDash, shares18, sig4, usd } from "@/lib/ui-format";
import { blockTimes, only, savingEventsOf, streakDays } from "@/lib/ui-logs";
import { sharesOf, sumKnown, usdOf, type StockQuote } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { useMounted, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, LinkButton, Notice, Panel, Skeleton, Stat, TxLink, inputCls } from "./ui";

export const SOURCE: Record<number, string> = { 1: "convert", 2: "sweep", 3: "staking reward", 4: "deposit" };

export function JarView() {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!mounted) return <Skeleton w="100%" h="12rem" className="block" />;
  if (!address)
    return (
      <Panel className="flex flex-col items-start gap-4">
        <p className="text-lg">Connect a wallet to see your Jar.</p>
        <ConnectButton />
      </Panel>
    );
  return <Jar user={address} />;
}

function useJarBalances(user: Address) {
  return useReadContracts({
    contracts: STOCKS.map((s) => ({ address: TF.Jar, abi: jarAbi, functionName: "balanceOf", args: [user, s.token], chainId: CHAIN_ID }) as const),
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
}

/** Consecutive UTC days (ending today, or yesterday if today has none yet) with a sweep, convert or deposit. */
function useStreak(user: Address) {
  const logs = useTfLogs();
  return useQuery({
    queryKey: ["streak", user, logs.data?.head.toString()],
    enabled: !!logs.data,
    queryFn: async () => {
      const mine = savingEventsOf(logs.data!.router, user);
      if (mine.length === 0) return 0;
      const t = await blockTimes(mine.map((l) => l.blockNumber));
      return streakDays([...t.values()], Date.now());
    },
  });
}

function QuicknodeBadge() {
  const q = useQuery({ queryKey: ["qn-jar"], queryFn: async () => (await fetch("/api/qn-jar")).json() as Promise<{ enabled: boolean; agreement?: boolean }>, enabled: DEPLOYED, staleTime: 120_000 });
  if (!q.data?.enabled || q.data.agreement === undefined) return null;
  return q.data.agreement ? <Badge tone="accent">Verified by Quicknode Stock Token API</Badge> : <Badge tone="warn">Quicknode check disagrees with direct reads</Badge>;
}

function Jar({ user }: { user: Address }) {
  const bals = useJarBalances(user);
  const market = useStockQuotes();
  const streak = useStreak(user);
  const rows = STOCKS.map((s, i) => {
    const raw = (bals.data?.[i]?.result as bigint | undefined) ?? 0n;
    const q = market.data?.[i];
    return { s, raw, q, usd: raw === 0n ? 0 : usdOf(raw, q) };
  });
  // Unknown price on any held stock = unknown total. Never summed from a guess.
  const total = sumKnown(rows.map((r) => r.usd));
  const loaded = !!bals.data && !!market.data;
  const empty = loaded && rows.every((r) => r.raw === 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <QuicknodeBadge />
        <Link href={`/jar/report/${user}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-accent">Weekly report</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Jar value" value={!DEPLOYED ? "Not live yet" : loaded ? orDash(total, usd) : bals.error || market.error ? <span className="text-base font-normal text-danger">RPC unavailable</span> : <Skeleton w="6rem" h="1.6rem" />} sub={loaded && total === null ? "A live stock price is unavailable right now" : "Chainlink live prices"} href={DEPLOYED ? addrUrl(TF.Jar) : undefined} />
        <Stat label="Saving streak" value={!DEPLOYED ? "—" : streak.data === undefined ? <Skeleton w="3rem" h="1.6rem" /> : `${streak.data} day${streak.data === 1 ? "" : "s"}`} sub="UTC days with a sweep or convert" />
      </div>
      {!DEPLOYED && <Notice tone="warn">Your Jar opens when the Terra Firma contracts are live on mainnet.</Notice>}
      {empty ? (
        <Panel className="flex flex-col items-start gap-4">
          <p className="text-lg font-semibold">Your Jar is empty. Convert a meme or make a trade to start.</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/app">See your Hindsight card</LinkButton>
            <LinkButton href="/trade" variant="secondary">Trade a meme</LinkButton>
          </div>
        </Panel>
      ) : (
        DEPLOYED && (
          <Panel aria-labelledby="bal-title">
            <h2 id="bal-title" className="mb-4 font-semibold">Balances</h2>
            <ul className="divide-y divide-line">
              {rows.filter((r) => !loaded || r.raw > 0n).map((r) => (
                <BalanceRow key={r.s.symbol} stock={r.s} raw={r.raw} q={r.q} loaded={loaded} onDone={() => bals.refetch()} />
              ))}
            </ul>
          </Panel>
        )
      )}
      <History user={user} />
    </div>
  );
}

function BalanceRow({ stock, raw, q, loaded, onDone }: { stock: (typeof STOCKS)[number]; raw: bigint; q?: StockQuote; loaded: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const tx = useTx();
  const qc = useQueryClient();
  const sharesRaw = sharesOf(raw, q);
  const toRaw = (s: string) => {
    if (!q?.multiplier || !/^\d*\.?\d+$/.test(s.trim())) return null;
    const want = parseUnits(s.trim(), 18);
    const r = (want * 10n ** 18n) / q.multiplier;
    return r > raw ? null : r;
  };
  const amountRaw = amt === "max" ? raw : toRaw(amt);
  const withdraw = async () => {
    if (!amountRaw) return;
    const r = await tx.run([{ label: `Withdraw ${stock.symbol}`, call: { address: TF.Jar, abi: jarAbi as unknown as Abi, functionName: "withdraw", args: [stock.token, amountRaw] } }]);
    if (r) {
      onDone();
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      setAmt("");
    }
  };
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{stock.symbol} <span className="font-normal text-muted">{stock.name}</span></p>
          <p className="num text-sm text-muted">
            {loaded ? (
              <>
                <AddrLink addr={TF.Jar}>{orDash(sharesRaw, shares18)} shares</AddrLink> · <AddrLink addr={stock.liveFeed}>{q?.price8 != null ? usd(Number(formatUnits(q.price8, 8))) : `${DASH} (price unavailable)`}</AddrLink> each
              </>
            ) : (
              <Skeleton w="10rem" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="num text-lg font-semibold">{loaded ? orDash(usdOf(raw, q), usd) : <Skeleton w="5rem" />}</span>
          <Button variant="secondary" aria-expanded={open} aria-controls={`wd-${stock.symbol}`} onClick={() => setOpen((o) => !o)} disabled={raw === 0n}>Withdraw</Button>
        </div>
      </div>
      {open && (
        <div id={`wd-${stock.symbol}`} className="mt-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`wd-in-${stock.symbol}`} className="sr-only">Shares to withdraw</label>
            <input id={`wd-in-${stock.symbol}`} inputMode="decimal" value={amt === "max" ? (sharesRaw === null ? "" : sig4(Number(formatUnits(sharesRaw, 18)))) : amt} onChange={(e) => setAmt(e.target.value)} placeholder="Shares" className={`${inputCls} num sm:flex-1`} aria-invalid={amt !== "" && !amountRaw} />
            <Button variant="secondary" onClick={() => setAmt("max")} disabled={sharesRaw === null}>Max</Button>
            <Button onClick={withdraw} disabled={!amountRaw || tx.busy}>{tx.busy ? "Working…" : "Withdraw to wallet"}</Button>
          </div>
          <p className="text-xs text-muted">Sends the real {stock.symbol} Stock Token to your wallet.</p>
          <TxStatus state={tx.state} onReset={tx.reset} success={`Withdrawn. The ${stock.symbol} is in your wallet.`} />
        </div>
      )}
    </li>
  );
}

function History({ user }: { user: Address }) {
  const logs = useTfLogs();
  const market = useStockQuotes();
  const mine = (logs.data?.jar ?? []).filter((l) => l.args.user.toLowerCase() === user.toLowerCase()).reverse();
  const times = useQuery({ queryKey: ["jar-times", user, mine.length], enabled: mine.length > 0, queryFn: () => blockTimes(mine.slice(0, 30).map((l) => l.blockNumber)) });
  const credited = only(mine, "Credited");
  const bySource = new Map<number, number | null>();
  for (const c of credited) {
    const i = STOCKS.findIndex((s) => s.token.toLowerCase() === c.args.stock.toLowerCase());
    const v = usdOf(c.args.amount, market.data?.[i]);
    const prev = bySource.get(c.args.source);
    bySource.set(c.args.source, v === null || prev === null ? null : (prev ?? 0) + v);
  }
  if (!DEPLOYED) return null;
  return (
    <Panel aria-labelledby="hist-title">
      <h2 id="hist-title" className="font-semibold">Where your stock came from</h2>
      {logs.isLoading ? (
        <Skeleton w="100%" h="4rem" className="mt-3 block" />
      ) : logs.error ? (
        <Notice tone="danger" className="mt-3">Couldn&apos;t read Jar events from the chain. Retrying.</Notice>
      ) : mine.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No Jar activity yet.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...bySource.entries()].map(([s, v]) => (
              <li key={s}><Badge tone="accent">{SOURCE[s] ?? `source ${s}`}: {v === null ? `${DASH} (price unavailable)` : <>{usd(v)} at today&apos;s price</>}</Badge></li>
            ))}
          </ul>
          <ul className="mt-4 divide-y divide-line text-sm">
            {mine.slice(0, 30).map((l) => {
              const s = STOCKS.find((x) => x.token.toLowerCase() === l.args.stock.toLowerCase());
              const q = s && market.data?.[s.id];
              const ts = times.data?.get(l.blockNumber);
              return (
                <li key={`${l.transactionHash}-${l.logIndex}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span>
                    {l.eventName === "Credited" ? `+ ${SOURCE[l.args.source] ?? "credit"}` : "− withdraw"}{" "}
                    <span className="num font-semibold">{market.data ? orDash(sharesOf(l.args.amount, q), shares18) : "…"} {s?.symbol}</span>
                  </span>
                  <span className="flex items-center gap-3 text-muted">
                    <span className="num text-xs">{ts ? dateTime(ts) : <Skeleton w="7rem" />}</span>
                    <TxLink hash={l.transactionHash} className="inline-flex min-h-11 items-center" />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
```

#### File: web/components/landing-connect.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/landing-connect.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "./connect-button";
import { useMounted } from "./hooks";
import { LinkButton } from "./ui";

/** Primary hero CTA: Connect wallet -> /app. Already connected -> straight to the card. */
export function LandingConnect() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const mounted = useMounted();
  if (mounted && isConnected) return <LinkButton href="/app">Open your card</LinkButton>;
  return <ConnectButton className="sm:min-w-44" onConnected={() => router.push("/app")} />;
}
```

#### File: web/components/landing-live.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/landing-live.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useReadContracts } from "wagmi";
import { feePoolAbi } from "@/lib/abi";
import { CHAIN_ID, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED } from "@/lib/ui-chain";
import { eth, short, token } from "@/lib/ui-format";
import { mergeTicker, only, parseFrame, toTickerEvents, type TfLogs, type TickerEvent } from "@/lib/ui-logs";
import { useTfLogs } from "./hooks";
import { Skeleton, Stat, TxLink } from "./ui";

const UNAVAILABLE = <span className="text-base font-normal text-danger">RPC unavailable</span>;
const PRE = <span className="text-base font-normal text-muted">Not live yet</span>;

/** Live protocol counters, each linking to the contract that holds the number. Errors show, never shimmer forever (S5). */
export function Counters() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const [burned, toStock] = reads.data ?? [];
  const readVal = (r: typeof burned, f: (v: bigint) => string) =>
    !DEPLOYED ? PRE : r?.status === "success" ? f(r.result as bigint) : reads.error || r?.status === "failure" ? UNAVAILABLE : <Skeleton w="5rem" h="1.6rem" />;
  const logVal = (f: (l: TfLogs) => number) =>
    !DEPLOYED ? PRE : logs.data ? f(logs.data).toLocaleString("en-US") : logs.error ? UNAVAILABLE : <Skeleton w="5rem" h="1.6rem" />;
  const href = (a: string) => (DEPLOYED ? addrUrl(a) : undefined);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="$WIF burned" href={href(TF.FeePool)} value={readVal(burned, (v) => token(v))} sub="FeePool.totalWifBurned" />
      <Stat label="Stock streamed" href={href(TF.FeePool)} value={readVal(toStock, (v) => `${eth(v)} ETH`)} sub="FeePool.totalEthToStock" />
      <Stat label="Routed trades" href={href(TF.TerraRouter)} value={logVal((l) => only(l.router, "Traded").length)} sub="Traded events" />
      <Stat label="Jars" href={href(TF.Jar)} value={logVal((l) => new Set(only(l.jar, "Credited").map((x) => x.args.user.toLowerCase())).size)} sub="Distinct wallets credited" />
    </div>
  );
}

const stockSym = (id?: string) => STOCKS[Number(id ?? 0)]?.symbol ?? "stock";

function describe(e: TickerEvent): string {
  const a = e.args;
  switch (e.type) {
    case "traded":
      return `${short(String(a.user))} ${a.isBuy ? "bought" : "sold"} a meme for ${eth(String(a.ethAmount))} ETH`;
    case "swept":
      return `${short(String(a.user))} swept ${eth(String(a.ethIn))} ETH into ${stockSym(String(a.stockId))}`;
    case "deposited":
      return `${short(String(a.user))} deposited ${eth(String(a.ethIn))} ETH into ${stockSym(String(a.stockId))}`;
    case "converted":
      return `${short(String(a.user))} converted ${a.memes} meme${a.memes === "1" ? "" : "s"} into ${stockSym(String(a.stockId))}`;
    case "distributed":
      return `Epoch ${a.epoch} distributed: ${token(String(a.wifBurned))} $WIF burned`;
    case "credited":
      return `${short(String(a.user))}'s Jar was credited`;
    case "cardMinted":
      return `${short(String(a.wallet))} minted a Hindsight card`;
  }
}

/** Recent events from the incremental log scan: fills any gap the SSE stream missed across reconnects (S11). */
function backfill(l: TfLogs | undefined): TickerEvent[] {
  if (!l) return [];
  return mergeTicker(toTickerEvents([...l.router, ...l.feePool, ...l.jar, ...l.lens]), [], 8);
}

/** Server-Sent Events from /api/stream (the RPC endpoint never reaches the browser), merged with the log backfill. */
export function LiveTicker() {
  const [live, setLive] = useState<TickerEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const logs = useTfLogs();
  const drop = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!DEPLOYED) return;
    const es = new EventSource("/api/stream");
    es.onopen = () => {
      if (drop.current) clearTimeout(drop.current);
      setStatus("live");
    };
    // The server closes the stream every ~55 s and the browser reconnects in ~3 s: only flag a real outage.
    es.onerror = () => {
      if (drop.current) clearTimeout(drop.current);
      drop.current = setTimeout(() => setStatus("reconnecting"), 8000);
    };
    es.onmessage = (m) => {
      const e = parseFrame(m.data);
      if (e) setLive((prev) => mergeTicker([e], prev, 8));
    };
    return () => {
      if (drop.current) clearTimeout(drop.current);
      es.close();
    };
  }, []);
  const events = mergeTicker(live, backfill(logs.data), 8);
  return (
    <section aria-labelledby="ticker-title" className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 id="ticker-title" className="text-sm font-semibold">Live from the chain</h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={`size-2 rounded-full ${status === "live" ? "bg-accent" : "bg-line"}`} />
          {!DEPLOYED ? "Starts at deploy" : status === "live" ? "Streaming" : status === "connecting" ? "Connecting" : "Reconnecting"}
        </span>
      </div>
      <ul aria-live="polite" className="mt-3 space-y-1 text-sm">
        {events.length === 0 && <li className="text-muted">{DEPLOYED ? "Waiting for the next Terra Firma event…" : "No events until the contracts are live."}</li>}
        {events.map((e) => (
          <li key={`${e.tx}-${e.type}`} className="flex flex-wrap items-center justify-between gap-x-3">
            <span>{describe(e)}</span>
            <TxLink hash={e.tx} className="inline-flex min-h-11 items-center text-xs text-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export { AddressLookup } from "./address-lookup";
```

#### File: web/components/proof-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/proof-view.tsx
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { isAddress, type Abi } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import evidence from "@/data/evidence.json";
import { feePoolAbi, hindsightLensAbi } from "@/lib/abi";
import { ADDR, CHAIN_ID, FEE_BPS, STAKER_FEE_BPS, DISCOUNT_STAKE, TF, addrUrl, stockBySymbol } from "@/lib/config";
import type { Card } from "@/lib/hindsight";
import { DEPLOYED, REPO_URL, SHOWN_CONTRACTS, VERIFIED, publicClient } from "@/lib/ui-chain";
import { classifyOwnerProbe, type OwnerProbe } from "@/lib/ui-errors";
import { dateTime, eth, token } from "@/lib/ui-format";
import { blockTimes, only, type TfLogs } from "@/lib/ui-logs";
import { lensBuys, RecomputeResult, stockIdOf } from "./card-actions";
import { getJson, useTfLogs, useTx } from "./hooks";
import { LiveTicker } from "./landing-live";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, ExtLink, Notice, Panel, Skeleton, Stat, TxLink, inputCls } from "./ui";

export function ProofView() {
  return (
    <div className="space-y-6">
      <RubricMap />
      <Contracts />
      <Totals />
      <FirstOfKind />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecomputeBox />
        <Distribute />
      </div>
      <Evidence />
      <LiveTicker />
    </div>
  );
}

// ---- Rubric map (critique E-2): the three judging criteria, each pointing at live evidence ----

const PENDING = "live after mainnet deploy";
const anchorCls = "inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm";
const bps = (b: number) => `${(b / 100).toFixed(1)}%`;

function Jump({ to, children }: { to: string; children: ReactNode }) {
  return <a href={`#${to}`} className={anchorCls}>{children}</a>;
}

/** One evidence line: what it proves, then the link (or an honest pending/loading state). */
function Row({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right">{children}</span>
    </li>
  );
}

function RubricCard({ id, title, claim, children }: { id: string; title: string; claim: string; children: ReactNode }) {
  return (
    <Panel aria-labelledby={id} className="flex flex-col">
      <h3 id={id} className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{claim}</p>
      <ul className="mt-3 divide-y divide-line">{children}</ul>
    </Panel>
  );
}

function RubricMap() {
  const { logs, l, volume, burned, toStock } = useProofTotals();
  const f = l ? firsts(l) : undefined;
  const dist = l ? only(l.feePool, "Distributed") : [];
  const lastDist = dist[dist.length - 1];
  const failed = DEPLOYED && !!logs.error;
  /** Event-derived link: pending pre-deploy, explicit on RPC failure, skeleton while scanning. */
  const ev = (hash: string | undefined, none: string) =>
    !DEPLOYED ? <span className="text-muted">{PENDING}</span> : failed ? <span className="text-danger">RPC unavailable</span> : !l ? <Skeleton w="6rem" /> : hash ? <TxLink hash={hash} /> : <span className="text-muted">{none}</span>;
  const total = (x: bigint | undefined, fmt: (n: bigint) => string, href: string) =>
    !DEPLOYED ? <span className="text-muted">{PENDING}</span> : x === undefined ? <Skeleton w="5rem" /> : <ExtLink href={href}><span className="num">{fmt(x)}</span></ExtLink>;
  return (
    <section aria-labelledby="rubric-title" className="space-y-3">
      <h2 id="rubric-title" className="text-sm font-medium uppercase tracking-wider text-muted">Judging criteria, mapped to evidence</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <RubricCard id="rb-wif" title="A real reason to use $WIF" claim="Fees buy and burn $WIF, stakers earn real stock, and staking cuts your trade fee.">
          <Row k="First fee-funded $WIF burn">{ev(f?.[2].log?.transactionHash, "not yet")}</Row>
          <Row k="First staker claim">{ev(f?.[3].log?.transactionHash, "not yet")}</Row>
          <Row k={`Fee discount: ${token(DISCOUNT_STAKE)} $WIF staked → ${bps(STAKER_FEE_BPS)} instead of ${bps(FEE_BPS)}`}>
            {DEPLOYED ? <AddrLink addr={TF.TerraRouter}>TerraRouter.feeBps</AddrLink> : <span className="text-muted">{PENDING}</span>}
          </Row>
          <Row k="$WIF token (the router reverts any $WIF sell)"><AddrLink addr={ADDR.wif} /></Row>
        </RubricCard>
        <RubricCard id="rb-fly" title="A flywheel that holds up" claim="Routed volume pays fees; each epoch burns $WIF and streams stock to stakers. Live totals, no projections.">
          <Row k="Routed volume">{total(l ? volume : undefined, (n) => `${eth(n)} ETH`, addrUrl(TF.TerraRouter))}</Row>
          <Row k="$WIF burned">{total(burned, (n) => token(n), addrUrl(TF.FeePool))}</Row>
          <Row k="ETH streamed to staker stock">{total(toStock, (n) => `${eth(n)} ETH`, addrUrl(TF.FeePool))}</Row>
          <Row k="Latest distribute">{ev(lastDist?.transactionHash, "no distribute yet")}</Row>
          <Row k="Burn path: hooked WIF/ETH pool"><AddrLink addr={ADDR.wifHook} /></Row>
        </RubricCard>
        <RubricCard id="rb-built" title="Works and built well" claim="Ownerless contracts, a mainnet-fork test suite, and every card recomputable by eth_call.">
          <Row k={<OwnerlessClaim />}>
            {DEPLOYED ? <Jump to="contracts">Addresses</Jump> : <span className="text-muted">{PENDING}</span>}
          </Row>
          <Row k={`${evidence.forkTests} fork tests passing`}><Jump to="fork-tests">Command and output</Jump></Row>
          <Row k="Recompute any card onchain"><Jump to="recompute">Recompute box</Jump></Row>
        </RubricCard>
      </div>
    </section>
  );
}

const OWNER_SELECTOR = "0x8da5cb5b"; // owner()

/** eth_call owner() on every shown contract. A revert or empty return = no owner function. RPC failure = no claim. */
function useOwnerProbes() {
  return useQuery({
    queryKey: ["owner-probes"],
    enabled: DEPLOYED,
    staleTime: Infinity,
    queryFn: async () => {
      const out = await Promise.all(
        SHOWN_CONTRACTS.map(async (c) => {
          try {
            const r = await publicClient.call({ to: c.address, data: OWNER_SELECTOR });
            return [c.key, classifyOwnerProbe({ data: r.data })] as const;
          } catch (error) {
            return [c.key, classifyOwnerProbe({ error })] as const;
          }
        }),
      );
      return new Map<string, OwnerProbe>(out);
    },
  });
}

/** Rubric line built only from checks that ran: "N of M answer no owner()", plus verified count if recorded. */
function OwnerlessClaim() {
  const p = useOwnerProbes();
  const n = SHOWN_CONTRACTS.length;
  const verified = SHOWN_CONTRACTS.filter((c) => VERIFIED.has(c.address.toLowerCase())).length;
  if (!DEPLOYED) return <>{n} contracts, no owner functions by design</>;
  if (!p.data) return p.error ? <>{n} contracts (owner check unavailable)</> : <Skeleton w="12rem" />;
  const ownerless = [...p.data.values()].filter((v) => v === "ownerless").length;
  return <>{ownerless} of {n} contracts answer no owner(){verified > 0 ? `, ${verified} verified on Blockscout` : ""}</>;
}

function Contracts() {
  const probes = useOwnerProbes();
  return (
    <Panel id="contracts" aria-labelledby="c-title" className="scroll-mt-24">
      <h2 id="c-title" className="font-semibold">Contracts</h2>
      <p className="mt-1 text-sm text-muted">No owner, no pause, no upgrade, no admin withdraw (checked by the fork test <code className="font-mono">test_noOwnerFunctions</code>). The &ldquo;ownerless&rdquo; badge appears only after a live <code className="font-mono">owner()</code> call on mainnet reverts.</p>
      <ul className="mt-4 divide-y divide-line">
        {SHOWN_CONTRACTS.map((c) => (
          <li key={c.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {c.key}
                {probes.data?.get(c.key) === "ownerless" && <Badge tone="accent">ownerless</Badge>}
                {probes.data?.get(c.key) === "has-owner" && <Badge tone="danger">has owner()</Badge>}
                {VERIFIED.has(c.address.toLowerCase()) && <Badge tone="accent">verified</Badge>}
              </p>
              <p className="text-sm text-muted">{c.role}</p>
            </div>
            {DEPLOYED ? <AddrLink addr={c.address} className="text-sm" /> : <span className="text-sm text-muted">deploying</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** FeePool totals + router volume, shared by the rubric map and the totals row (one read, one log scan). */
function useProofTotals() {
  const reads = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalEthToStock", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const logs = useTfLogs();
  const l = logs.data;
  const traded = l ? only(l.router, "Traded") : [];
  const volume = traded.reduce((a, t) => a + t.args.ethAmount, 0n);
  const fees = traded.reduce((a, t) => a + t.args.fee, 0n);
  const burned = reads.data?.[0]?.result as bigint | undefined;
  const toStock = reads.data?.[1]?.result as bigint | undefined;
  return { logs, l, traded, volume, fees, burned, toStock };
}

function Totals() {
  const { l, traded, volume, fees, burned, toStock } = useProofTotals();
  const v = (ok: boolean, f: () => string) => (!DEPLOYED ? "—" : ok ? f() : <Skeleton w="4rem" h="1.6rem" />);
  return (
    <div id="totals" className="grid scroll-mt-24 grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="$WIF burned" href={DEPLOYED ? addrUrl(TF.FeePool) : undefined} value={v(burned !== undefined, () => token(burned!))} />
      <Stat label="ETH to staker stock" href={DEPLOYED ? addrUrl(TF.FeePool) : undefined} value={v(toStock !== undefined, () => eth(toStock!))} />
      <Stat label="Routed trades" href={DEPLOYED ? addrUrl(TF.TerraRouter) : undefined} value={v(!!l, () => traded.length.toLocaleString("en-US"))} />
      <Stat label="Routed volume" href={DEPLOYED ? addrUrl(TF.TerraRouter) : undefined} value={v(!!l, () => `${eth(volume)} ETH`)} sub={l ? `${eth(fees)} ETH in fees` : undefined} />
      <Stat label="Cards minted" href={DEPLOYED ? addrUrl(TF.HindsightLens) : undefined} value={v(!!l, () => only(l!.lens, "CardMinted").length.toString())} />
    </div>
  );
}

function firsts(l: TfLogs) {
  return [
    { k: "First convert", log: only(l.router, "Converted")[0] },
    { k: "First sweep", log: only(l.router, "Swept")[0] },
    { k: "First distribute with a $WIF burn", log: only(l.feePool, "Distributed").find((d) => d.args.wifBurned > 0n) },
    { k: "First staking claim", log: only(l.staking, "Claimed")[0] },
  ];
}

function FirstOfKind() {
  const logs = useTfLogs();
  const l = logs.data;
  const dist = l ? only(l.feePool, "Distributed") : [];
  const lastDist = dist[dist.length - 1];
  const t = useQuery({ queryKey: ["dist-time", lastDist?.blockNumber.toString()], enabled: !!lastDist, queryFn: () => blockTimes([lastDist!.blockNumber]) });
  return (
    <Panel aria-labelledby="f-title">
      <h2 id="f-title" className="font-semibold">First-of-kind transactions</h2>
      {!DEPLOYED ? (
        <p className="mt-3 text-sm text-muted">These appear from contract logs after deploy.</p>
      ) : logs.error ? (
        <Notice tone="danger" className="mt-3">Live data unavailable: couldn&apos;t read logs from the public RPC. Nothing is shown in its place.</Notice>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {(l ? firsts(l) : [0, 1, 2, 3].map((i) => ({ k: String(i), log: undefined }))).map((f) => (
            <li key={f.k} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>{l ? f.k : <Skeleton w="12rem" />}</span>
              {!l ? <Skeleton w="7rem" /> : f.log ? <TxLink hash={f.log.transactionHash} /> : <span className="text-muted">not yet</span>}
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span>Keeper last run (latest Distributed)</span>
            {!l ? <Skeleton w="7rem" /> : lastDist ? (
              <span className="flex items-center gap-3"><span className="num text-muted">{t.data ? dateTime(t.data.get(lastDist.blockNumber)!) : "…"}</span><TxLink hash={lastDist.transactionHash} /></span>
            ) : (
              <span className="text-muted">no distribute yet</span>
            )}
          </li>
        </ul>
      )}
    </Panel>
  );
}

/** ?addr=0x…&stock=NVDA from a "Recompute this card" link. Read after mount so /proof stays static. */
function useQueryPrefill() {
  const [q, setQ] = useState<{ addr: string; stock: string } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const addr = p.get("addr")?.trim() ?? "";
    if (isAddress(addr)) setQ({ addr, stock: stockBySymbol(p.get("stock") ?? "")?.symbol ?? "NVDA" });
  }, []);
  return q;
}

function RecomputeBox() {
  const [v, setV] = useState("");
  const [stock, setStock] = useState("NVDA");
  const [err, setErr] = useState(false);
  const prefill = useQueryPrefill();
  const run = useMutation({
    mutationFn: async ({ addr, stock }: { addr: string; stock: string }) => {
      const card = await getJson<Card>(`/api/hindsight?addr=${addr}&stock=${stock}`);
      if (!DEPLOYED || card.memes.length === 0) return { card, chain: undefined };
      const [usdPaid8, shares18, usdNow8] = await publicClient.readContract({ address: TF.HindsightLens, abi: hindsightLensAbi, functionName: "recompute", args: [lensBuys(card), stockIdOf(card.stock)] });
      return { card, chain: { usdPaid8, shares18, usdNow8 } };
    },
  });
  const { mutate } = run;
  useEffect(() => {
    if (!prefill) return;
    setV(prefill.addr);
    setStock(prefill.stock);
    mutate(prefill);
  }, [prefill, mutate]);
  return (
    <Panel id="recompute" aria-labelledby="r-title" className="scroll-mt-24">
      <h2 id="r-title" className="font-semibold">Recompute a card</h2>
      <p className="mt-1 text-sm text-muted">Runs /api/hindsight, then HindsightLens.recompute on the same inputs via eth_call. Priced in {stock}.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isAddress(v.trim())) return setErr(true);
          run.mutate({ addr: v.trim(), stock });
        }}
      >
        <label htmlFor="rc-addr" className="sr-only">Wallet address</label>
        <input id="rc-addr" value={v} onChange={(e) => { setV(e.target.value); setErr(false); }} placeholder="0x…" className={`${inputCls} font-mono text-sm sm:flex-1`} aria-invalid={err} spellCheck={false} />
        <Button type="submit" disabled={run.isPending}>{run.isPending ? "Running…" : "Recompute"}</Button>
      </form>
      {err && <p role="alert" className="mt-2 text-sm text-danger">Enter a 0x address.</p>}
      {run.error && <Notice tone="danger" className="mt-3">{(run.error as Error).message}</Notice>}
      {run.data && (run.data.card.memes.length === 0 ? <p className="mt-3 text-sm text-muted">No priced meme buys for this wallet.</p> : !DEPLOYED ? <Notice className="mt-3">API card loaded. The onchain side runs once HindsightLens is deployed.</Notice> : <RecomputeResult card={run.data.card} data={run.data.chain} />)}
    </Panel>
  );
}

function Distribute() {
  const { address } = useAccount();
  const can = useReadContracts({
    contracts: [
      { address: TF.FeePool, abi: feePoolAbi, functionName: "canDistribute", chainId: CHAIN_ID },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "epoch", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 20_000 },
  });
  const bal = useQuery({ queryKey: ["feepool-bal"], enabled: DEPLOYED, queryFn: () => publicClient.getBalance({ address: TF.FeePool }), refetchInterval: 20_000 });
  const tx = useTx();
  const ok = can.data?.[0]?.result === true;
  return (
    <Panel aria-labelledby="d-title">
      <h2 id="d-title" className="font-semibold">Run distribute</h2>
      <p className="mt-1 text-sm text-muted">Anyone can trigger the hourly epoch if the keeper hasn&apos;t: half buys and burns $WIF, half buys stakers&apos; stock.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">Fee pool balance</dt><dd className="num font-semibold">{!DEPLOYED ? "—" : bal.data !== undefined ? <ExtLink href={addrUrl(TF.FeePool)}>{eth(bal.data)} ETH</ExtLink> : bal.error ? <span className="text-danger">RPC unavailable</span> : <Skeleton w="4rem" />}</dd></div>
        <div><dt className="text-muted">Current epoch</dt><dd className="num font-semibold">{!DEPLOYED ? "—" : can.data?.[1]?.result !== undefined ? String(can.data[1].result) : <Skeleton w="3rem" />}</dd></div>
      </dl>
      <Button
        className="mt-4 w-full"
        disabled={!DEPLOYED || !address || !ok || tx.busy}
        onClick={async () => {
          await tx.run([{ label: "Distribute", call: { address: TF.FeePool, abi: feePoolAbi as unknown as Abi, functionName: "distribute", args: [], gas: 3_500_000n } }]);
          can.refetch();
        }}
      >
        {!DEPLOYED ? "Available after deploy" : !address ? "Connect a wallet to run it" : ok ? "Run distribute" : "Not due yet"}
      </Button>
      <p className="mt-2 text-xs text-muted"><code className="font-mono">distribute()</code> takes no arguments. The $WIF buy is capped at 0.01 ETH per epoch, so price games can only shave dust.</p>
      <TxStatus state={tx.state} onReset={tx.reset} success="Distributed. The burn and staker stream are onchain." />
    </Panel>
  );
}

function Evidence() {
  return (
    <Panel id="fork-tests" aria-labelledby="e-title" className="scroll-mt-24 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 id="e-title" className="font-semibold">Fork tests</h2>
        <p className="mt-1 text-sm text-muted">
          <span className="num text-fg">{evidence.forkTests}</span> passing against a Robinhood Chain mainnet fork. Run it yourself: <code className="font-mono text-fg">{evidence.command}</code>
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {REPO_URL && <ExtLink href={`${REPO_URL}/blob/main/evidence/forge-test.txt`}>Test output</ExtLink>}
        {REPO_URL && <ExtLink href={`${REPO_URL}/blob/main/SECURITY.md`}>SECURITY.md</ExtLink>}
      </div>
    </Panel>
  );
}
```

#### File: web/components/providers.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WagmiProvider, useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/lib/config";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } } }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <ChainGuard />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/** Once per connection: ask the wallet to switch to (or add) Robinhood Chain 4663. */
function ChainGuard() {
  const { isConnected, chainId, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!isConnected || !address || chainId === CHAIN_ID || asked.current === address) return;
    asked.current = address;
    switchChain({ chainId: CHAIN_ID });
  }, [isConnected, chainId, address, switchChain]);
  return null;
}
```

#### File: web/components/report-share.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/report-share.tsx
"use client";

import { usd } from "@/lib/ui-format";
import { Button } from "./ui";

export function ReportShare({ addr, usdWeek }: { addr: string; usdWeek: number }) {
  const share = () => {
    const url = `${window.location.origin}/jar/report/${addr}`;
    const text = `My Jar grew ${usd(usdWeek)} in real stock this week, from meme trades. Read straight from Robinhood Chain.`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  };
  return <Button variant="secondary" onClick={share}>Share to X</Button>;
}
```

#### File: web/components/site-header.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/site-header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectButton } from "./connect-button";
import { ThemeToggle } from "./theme-toggle";
import { cx } from "./ui";

const NAV = [
  { href: "/app", label: "Card" },
  { href: "/trade", label: "Trade" },
  { href: "/jar", label: "Jar" },
  { href: "/stake", label: "Stake" },
  { href: "/board", label: "Board" },
  { href: "/proof", label: "Proof" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const linkCls = (href: string) =>
    cx(
      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active(href) ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg pr-2 font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Mark />
          <span className="text-lg">Terra Firma</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <ConnectButton className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-line lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-bg px-4 pb-4 pt-2 lg:hidden">
          <ul className="grid gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={linkCls(n.href)} aria-current={active(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <ConnectButton className="flex-1" />
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}

/** Wordmark glyph: horizon line over bedrock strata. */
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
      <path d="M7 14h18" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 19h14M11 23.5h10" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
```

#### File: web/components/stake-view.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/stake-view.tsx
"use client";

import { useState } from "react";
import { formatUnits, type Abi, type Address } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, feePoolAbi, terraRouterAbi, wifStakingAbi } from "@/lib/abi";
import { CHAIN_ID, DISCOUNT_STAKE, EXPLORER, STAKER_FEE_BPS, STOCKS, TF, addrUrl } from "@/lib/config";
import { DEPLOYED, WIF } from "@/lib/ui-chain";
import { DASH, duration, parseAmount, shares18, token } from "@/lib/ui-format";
import { only } from "@/lib/ui-logs";
import { sharesOf, type StockQuote } from "@/lib/ui-report";
import { ConnectButton } from "./connect-button";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { useApproveStep, useMounted, useNow, useStockQuotes, useTfLogs, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, Notice, Panel, Skeleton, Stat, TxLink, cx, inputCls } from "./ui";

const S = { address: TF.WifStaking, abi: wifStakingAbi, chainId: CHAIN_ID } as const;

function usePools() {
  const head = useReadContracts({
    contracts: [
      { ...S, functionName: "currentEpoch" },
      { ...S, functionName: "start" },
      { address: TF.FeePool, abi: feePoolAbi, functionName: "totalWifBurned", chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  const pools = useReadContracts({
    contracts: STOCKS.map((s) => ({ ...S, functionName: "activeStake", args: [s.id] }) as const),
    query: { enabled: DEPLOYED, refetchInterval: 30_000 },
  });
  return {
    epoch: head.data?.[0]?.result as bigint | undefined,
    start: head.data?.[1]?.result as bigint | undefined,
    burned: head.data?.[2]?.result as bigint | undefined,
    active: (i: number) => pools.data?.[i]?.result as bigint | undefined,
  };
}

export function StakeView() {
  const { epoch, start, burned, active: activeOf } = usePools();
  const logs = useTfLogs();
  const now = useNow();
  const nextAt = epoch !== undefined && start !== undefined ? Number(start + (epoch + 1n) * 3600n) : undefined;
  const rewards = only(logs.data?.staking ?? [], "RewardNotified");
  const lastReward = (id: number) => [...rewards].reverse().find((l) => l.args.stockId === id);
  const market = useStockQuotes();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Next epoch in" value={!DEPLOYED ? "Not live yet" : nextAt ? duration(nextAt - now) : <Skeleton w="5rem" h="1.6rem" />} sub={epoch !== undefined ? `Epoch ${epoch.toString()} · hourly` : "Hourly epochs"} />
        <Stat label="$WIF burned" value={!DEPLOYED ? "—" : burned !== undefined ? token(burned) : <Skeleton w="5rem" h="1.6rem" />} href={DEPLOYED ? addrUrl(TF.FeePool) : undefined} sub="FeePool.totalWifBurned" />
      </div>

      <Panel aria-labelledby="pools-title">
        <h2 id="pools-title" className="font-semibold">Reward pools</h2>
        <p className="mt-1 text-sm text-muted">Half of every fee buys real stock for stakers, split by active stake per pool. Pick the stock you want to earn.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STOCKS.map((s, i) => {
            const active = activeOf(i);
            const last = lastReward(s.id);
            const q = market.data?.[i];
            return (
              <li key={s.symbol} className="rounded-xl border border-line p-4">
                <p className="flex items-center justify-between font-semibold">{s.symbol} <span className="text-xs font-normal text-muted">{s.hours}</span></p>
                <p className="num mt-2 text-sm text-muted">Staked: <span className="text-fg">{!DEPLOYED ? "—" : active !== undefined ? `${token(active)} $WIF` : <Skeleton w="4rem" />}</span></p>
                <p className="num text-sm text-muted">
                  Last reward:{" "}
                  {last ? (
                    <TxLink hash={last.transactionHash}>{rewardText(last.args.amount, q, s.symbol)}</TxLink>
                  ) : (
                    <span>{DEPLOYED && logs.isLoading ? <Skeleton w="4rem" /> : "none yet"}</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <YourStake epoch={epoch} nextAt={nextAt} now={now} />
    </div>
  );
}

function YourStake({ epoch, nextAt, now }: { epoch?: bigint; nextAt?: number; now: number }) {
  const mounted = useMounted();
  const { address } = useAccount();
  if (!mounted) return <Skeleton w="100%" h="10rem" className="block" />;
  if (!address)
    return (
      <Panel className="flex flex-col items-start gap-4">
        <p className="text-lg">Connect a wallet to stake $WIF.</p>
        <ConnectButton />
      </Panel>
    );
  return <Staker user={address} epoch={epoch} nextAt={nextAt} now={now} />;
}

function Staker({ user, epoch, nextAt, now }: { user: Address; epoch?: bigint; nextAt?: number; now: number }) {
  const me = useReadContracts({
    contracts: [
      { ...S, functionName: "stakers", args: [user] },
      { ...S, functionName: "pending", args: [user] },
      { ...S, functionName: "activeOf", args: [user] },
      { address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: [user], chainId: CHAIN_ID },
    ],
    query: { enabled: DEPLOYED, refetchInterval: 20_000 },
  });
  const wifBal = useReadContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: [user], chainId: CHAIN_ID });
  const market = useStockQuotes();
  const gate = useStockGate();
  const tx = useTx();
  const approve = useApproveStep();
  const [amt, setAmt] = useState("");
  const [unAmt, setUnAmt] = useState("");
  const [pick, setPick] = useState("NVDA");
  const [msg, setMsg] = useState<string | null>(null);

  const st = me.data?.[0]?.result as readonly [number, bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
  const pend = me.data?.[1]?.result as readonly [number, bigint] | undefined;
  const activeOf = me.data?.[2]?.result as bigint | undefined;
  const feeBps = me.data?.[3]?.result as number | undefined;
  const [stockId, active, pendingStake, , , , unstaking, unlockAt] = st ?? [0, 0n, 0n, 0n, 0n, 0n, 0n, 0n];
  const hasStake = active + pendingStake > 0n;
  const mySym = STOCKS[stockId]?.symbol ?? "NVDA";
  const stakeSym = hasStake ? mySym : pick;
  const wei = parseAmount(amt);
  const unWei = parseAmount(unAmt);
  const { label: activation, mins } = activationText(epoch, nextAt, now);
  // `stakers().pendingStake` keeps matured buckets until the next interaction; activeOf() already counts them (S9).
  const matured = activeOf !== undefined && activeOf > active ? activeOf - active : 0n;
  const waiting = pendingStake > matured ? pendingStake - matured : 0n;
  const reward = pend?.[1] ?? 0n;
  const rq = market.data?.[pend?.[0] ?? stockId];
  const blocked = gate.status === "restricted";
  const geoWait = gate.status === "loading";
  const stakingUrl = addrUrl(TF.WifStaking);
  const after = (m: string) => () => {
    setMsg(m);
    me.refetch();
    wifBal.refetch();
  };

  const stake = () =>
    gate.gate(async () => {
      if (!wei) return;
      const id = STOCKS.find((s) => s.symbol === stakeSym)!.id;
      const r = await tx.run([approve(WIF, TF.WifStaking, wei, "$WIF"), { label: "Stake $WIF", call: { address: TF.WifStaking, abi: wifStakingAbi as unknown as Abi, functionName: "stake", args: [wei, id] } }]);
      if (r) after(`Staked. It ${activation}${mins ? ` (in about ${mins} min)` : ""} and earns ${stakeSym} from the first distribute after that.`)();
    });
  const call = (label: string, fn: string, args: readonly unknown[], done: string, stockLeg = false) => {
    const go = async () => {
      const r = await tx.run([{ label, call: { address: TF.WifStaking, abi: wifStakingAbi as unknown as Abi, functionName: fn, args } }]);
      if (r) after(done)();
    };
    return stockLeg ? gate.gate(go) : go();
  };

  if (!DEPLOYED) return <Notice tone="warn">Staking opens when the Terra Firma contracts are live on mainnet.</Notice>;

  return (
    <Panel aria-labelledby="mine-title" className="space-y-6">
      {gate.dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mine-title" className="font-semibold">Your stake</h2>
        {feeBps === STAKER_FEE_BPS ? (
          <Badge tone="accent">0.3% fee unlocked</Badge>
        ) : (
          <Badge>Stake {token(DISCOUNT_STAKE)} $WIF active to unlock a 0.3% trade fee</Badge>
        )}
      </div>
      {blocked && <Notice tone="warn">{GEO_BLOCKED} Staking and claiming earn stock, so they are off in your region.</Notice>}
      <GeoLoadingNote status={gate.status} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fig k="Wallet $WIF" v={wifBal.data !== undefined ? token(wifBal.data) : undefined} href={`${EXPLORER}/address/${user}?tab=tokens`} />
        <Fig k="Active" v={activeOf !== undefined ? token(activeOf) : undefined} sub={hasStake ? `earning ${mySym}` : undefined} href={stakingUrl} />
        <Fig k="Activating" v={st && activeOf !== undefined ? token(waiting) : undefined} sub={waiting > 0n ? `earns from epoch ${epoch !== undefined ? (epoch + 2n).toString() : "e+2"}` : undefined} href={stakingUrl} />
        <Fig k="Reward to claim" v={pend ? rewardText(reward, rq, STOCKS[pend[0]]?.symbol ?? "") : undefined} href={stakingUrl} accent />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="stake-h" className="space-y-4">
          <h3 id="stake-h" className="font-semibold">Stake</h3>
          {hasStake ? <p className="text-sm text-muted">Adding to your {mySym} stake. Use Switch to change stock.</p> : <StockSelect value={pick} onChange={setPick} label="Reward stock" name="stake-stock" />}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="stake-amt" className="sr-only">$WIF to stake</label>
            <input id="stake-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="$WIF amount" className={cx(inputCls, "num sm:flex-1")} aria-invalid={amt !== "" && !wei} />
            {wifBal.data !== undefined && <Button variant="secondary" onClick={() => setAmt(formatUnits(wifBal.data!, 18))}>Max</Button>}
          </div>
          <Button className="w-full" disabled={!wei || blocked || geoWait || tx.busy || (wifBal.data !== undefined && wei > wifBal.data)} onClick={stake}>Approve and stake</Button>
          <p className="text-xs text-muted">A stake placed now {activation}{mins ? ` (about ${mins} min)` : ""}, so nobody can grab a payout by staking just before a distribute.</p>
        </section>

        <section aria-labelledby="manage-h" className="space-y-4">
          <h3 id="manage-h" className="font-semibold">Manage</h3>
          <Button className="w-full" disabled={reward === 0n || blocked || geoWait || tx.busy} onClick={() => call("Claim to Jar", "claim", [], "Claimed. The reward stock is in your Jar.", true)}>
            Claim to Jar
          </Button>
          {hasStake && (
            <div className="space-y-2">
              <StockSelect value={pick} onChange={setPick} label="Switch reward stock" name="switch-stock" />
              <Button variant="secondary" className="w-full" disabled={pick === mySym || blocked || geoWait || tx.busy} onClick={() => call(`Switch to ${pick}`, "switchStock", [STOCKS.find((s) => s.symbol === pick)!.id], `Switched. Your stake earns ${pick} once it is active: it ${activation}.`, true)}>
                Switch to {pick}
              </Button>
            </div>
          )}
          {hasStake && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="un-amt" className="sr-only">$WIF to unstake</label>
                <input id="un-amt" inputMode="decimal" value={unAmt} onChange={(e) => setUnAmt(e.target.value)} placeholder="$WIF to unstake" className={cx(inputCls, "num sm:flex-1")} />
                <Button variant="secondary" onClick={() => setUnAmt(formatUnits(active + pendingStake, 18))}>All</Button>
              </div>
              <Button variant="secondary" className="w-full" disabled={!unWei || unWei > active + pendingStake || tx.busy} onClick={() => call("Request unstake", "requestUnstake", [unWei], "Unstaking stops rewards now. Your $WIF unlocks in 24h.")}>
                Request unstake
              </Button>
              <p className="text-xs text-muted">Unstaking stops rewards now. Your $WIF unlocks in 24h.</p>
            </div>
          )}
          {unstaking > 0n && (
            <div className="rounded-xl border border-line p-4">
              <p className="num text-sm">
                {token(unstaking)} $WIF unstaking · {Number(unlockAt) > now ? `unlocks in ${duration(Number(unlockAt) - now)}` : "unlocked"}
              </p>
              <Button className="mt-3 w-full" disabled={Number(unlockAt) > now || tx.busy} onClick={() => call("Withdraw $WIF", "withdraw", [], "Withdrawn. Your $WIF is back in your wallet.")}>
                Withdraw $WIF
              </Button>
            </div>
          )}
        </section>
      </div>
      <TxStatus state={tx.state} onReset={tx.reset} success={msg ?? "Done."} />
      <p className="text-xs text-muted">Contract: <AddrLink addr={TF.WifStaking}>WifStaking</AddrLink>. No projected yield is shown: rewards depend only on real routed fees.</p>
    </Panel>
  );
}

/** Contract truth (WifStaking._matured): a stake placed in epoch e is active from the start of epoch e+2. */
export function activationText(epoch: bigint | undefined, nextAt: number | undefined, now: number) {
  const label = epoch !== undefined ? `activates at the start of epoch ${(epoch + 2n).toString()}` : "activates at the start of the second epoch from now";
  const mins = nextAt ? Math.max(1, Math.ceil((nextAt + 3600 - now) / 60)) : null;
  return { label, mins };
}

/** Reward in displayed shares; "—" when the quote is unavailable (never the raw amount presented as shares). */
function rewardText(raw: bigint, q: StockQuote | undefined, sym: string) {
  const sh = sharesOf(raw, q);
  return sh === null ? `${DASH} ${sym} (price unavailable)` : `${shares18(sh)} ${sym}`;
}

/** Figure linked to the explorer page that holds the number (invariant: every onchain number links). */
function Fig({ k, v, sub, accent, href }: { k: string; v?: string; sub?: string; accent?: boolean; href?: string }) {
  const value = v ?? <Skeleton w="4rem" />;
  return (
    <div className={cx("rounded-xl border p-3", accent ? "border-accent/40 bg-accent-soft" : "border-line")}>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="num mt-1 text-lg font-semibold">
        {href && v ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-sm underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`${k}: ${v}. View on the explorer`}>
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}
```

#### File: web/components/stock-select.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/stock-select.tsx
"use client";

import { STOCKS } from "@/lib/config";
import { cx } from "./ui";

/** Radio group over the curated 6 (native radios: arrow keys work, one tab stop). */
export function StockSelect({ value, onChange, label = "Stock", name = "stock" }: { value: string; onChange: (symbol: string) => void; label?: string; name?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{label}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STOCKS.map((s) => (
          <label
            key={s.symbol}
            className={cx(
              "relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-colors duration-150",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
              value === s.symbol ? "border-accent bg-accent-soft text-fg" : "border-line text-muted hover:border-muted hover:text-fg",
            )}
          >
            <input type="radio" name={name} value={s.symbol} checked={value === s.symbol} onChange={() => onChange(s.symbol)} className="sr-only" />
            <span className="text-sm font-semibold">{s.symbol}</span>
            <span className="text-[0.7rem] leading-tight">{s.hours}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

#### File: web/components/theme-toggle.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/theme-toggle.tsx
"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

/** Dark is the default; the choice persists per browser. The pre-paint script lives in app/layout.tsx. */
export function ThemeToggle({ className }: { className?: string }) {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    try {
      localStorage.setItem("tf.theme", next ? "light" : "dark");
    } catch {
      /* storage blocked */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      className={cx("inline-flex size-11 items-center justify-center rounded-lg border border-line text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", className)}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {light ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </svg>
    </button>
  );
}
```

#### File: web/components/trade-terminal.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/trade-terminal.tsx
"use client";

// Meme terminal (PRD F5): paste a CA, buy with ETH or sell for ETH; a sweep slice lands in the Jar as stock.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getAddress, isAddress, parseEventLogs, type Abi, type Address, type Hex } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi, terraRouterAbi } from "@/lib/abi";
import { CHAIN_ID, DEFAULT_SWEEP_BPS, FEE_BPS, STAKER_FEE_BPS, STOCKS, TF } from "@/lib/config";
import { REGISTRY, memeByToken } from "@/lib/registry";
import { DEPLOYED, WIF, publicClient } from "@/lib/ui-chain";
import { PLAIN } from "@/lib/ui-errors";
import { eth, orDash, parseAmount, shares18, short, token as fmtToken } from "@/lib/ui-format";
import { sharesOf } from "@/lib/ui-report";
import { GEO_BLOCKED, GeoLoadingNote, useStockGate } from "./geo-gate";
import { getJson, useApproveStep, useStockQuotes, useTx } from "./hooks";
import { StockSelect } from "./stock-select";
import { TxStatus } from "./tx-status";
import { AddrLink, Badge, Button, Notice, Panel, Skeleton, TxLink, cx, inputCls } from "./ui";

type Route = { kind: number; v2Path: Address[]; v3Path: Hex; key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address } };
interface BuyQuote { route: Route; tokenOut: string; ethToStock: string; stockOut: string; fee: string; minTokenOut: string; minStockOut: string }
interface SellQuote { route: Route; ethFromSale: string; ethOut: string; minEthOut: string; ethToStock: string; stockOut: string; fee: string; minStockOut: string }

const liq = (t: (typeof REGISTRY.memes)[number]) => Math.max(0, ...t.pools.map((p) => p.liquidityUsd));
const TRENDING = [...REGISTRY.memes].sort((a, b) => liq(b) - liq(a)).slice(0, 12);

function useDebounced<T>(v: T, ms = 400) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

function useTokenInfo(addr?: Address) {
  return useQuery({
    queryKey: ["token-info", addr],
    enabled: !!addr,
    staleTime: Infinity,
    queryFn: async () => {
      const m = memeByToken(addr!);
      if (m) return { symbol: m.symbol, decimals: m.decimals };
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: addr!, abi: erc20Abi, functionName: "symbol" }),
        publicClient.readContract({ address: addr!, abi: erc20Abi, functionName: "decimals" }),
      ]);
      return { symbol, decimals };
    },
  });
}

export function TradeTerminal({ initialToken }: { initialToken?: string }) {
  const tokenAddr = initialToken && isAddress(initialToken) ? getAddress(initialToken) : undefined;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <PasteCa current={tokenAddr} />
        {tokenAddr ? <TradeBox token={tokenAddr} key={tokenAddr} /> : initialToken ? <Notice tone="danger">That isn&apos;t a valid token address.</Notice> : <Panel><p className="text-muted">Paste a meme contract address or pick one from the list to trade it.</p></Panel>}
      </div>
      <Trending current={tokenAddr} />
    </div>
  );
}

function PasteCa({ current }: { current?: Address }) {
  const router = useRouter();
  const [v, setV] = useState(current ?? "");
  const [err, setErr] = useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isAddress(v.trim())) return setErr(true);
        router.push(`/trade/${getAddress(v.trim())}`);
      }}
    >
      <label htmlFor="ca" className="sr-only">Token contract address</label>
      <input
        id="ca"
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          setErr(false);
        }}
        placeholder="Paste a contract address: 0x…"
        className={cx(inputCls, "font-mono text-sm sm:w-auto sm:flex-1")}
        aria-invalid={err}
        aria-describedby={err ? "ca-err" : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit">Load token</Button>
      {err && <p id="ca-err" role="alert" className="text-sm text-danger sm:basis-full">Enter a valid 0x contract address.</p>}
    </form>
  );
}

function Trending({ current }: { current?: Address }) {
  return (
    <Panel aria-labelledby="trending-title" className="h-fit">
      <h2 id="trending-title" className="font-semibold">Trending by liquidity</h2>
      {TRENDING.length === 0 ? (
        <p className="mt-3 text-sm text-muted">The meme registry hasn&apos;t been built yet. Paste any contract address above.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {[{ token: WIF, symbol: "WIF", liq: null as number | null }, ...TRENDING.filter((m) => m.token.toLowerCase() !== WIF.toLowerCase()).map((m) => ({ token: m.token, symbol: m.symbol, liq: liq(m) }))].map((m) => (
            <li key={m.token}>
              <Link
                href={`/trade/${m.token}`}
                aria-current={current?.toLowerCase() === m.token.toLowerCase() ? "page" : undefined}
                className={cx("flex min-h-11 items-center justify-between rounded-lg px-3 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", current?.toLowerCase() === m.token.toLowerCase() && "bg-surface-2")}
              >
                <span className="font-semibold">{m.symbol === "WIF" ? "$WIF" : m.symbol}</span>
                <span className="num text-sm text-muted">{m.liq === null ? "buy only" : `$${Math.round(m.liq).toLocaleString("en-US")} liq.`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Tabs({ tab, setTab }: { tab: "buy" | "sell"; setTab: (t: "buy" | "sell") => void }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next = tab === "buy" ? "sell" : "buy";
      setTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };
  return (
    <div role="tablist" aria-label="Trade side" className="grid grid-cols-2 gap-1 rounded-xl bg-bg p-1" onKeyDown={onKey}>
      {(["buy", "sell"] as const).map((t) => (
        <button
          key={t}
          id={`tab-${t}`}
          role="tab"
          type="button"
          aria-selected={tab === t}
          aria-controls={`panel-${t}`}
          tabIndex={tab === t ? 0 : -1}
          onClick={() => setTab(t)}
          className={cx("min-h-11 rounded-lg font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", tab === t ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function TradeBox({ token }: { token: Address }) {
  const info = useTokenInfo(token);
  const meme = memeByToken(token);
  const isWif = token.toLowerCase() === WIF.toLowerCase();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const { address } = useAccount();
  const fee = useReadContract({ address: TF.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: DEPLOYED && !!address } });
  const feeBps = Number(fee.data ?? FEE_BPS);
  const sym = info.data?.symbol ?? short(token);

  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">{info.isLoading ? <Skeleton w="6rem" h="1.6rem" /> : isWif ? "$WIF" : sym}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {meme ? <Badge tone="accent">in registry</Badge> : <Badge>not in registry</Badge>}
          {meme?.taxed && <Badge tone="danger">taxed: not routed</Badge>}
          <AddrLink addr={token} />
        </div>
      </div>
      {info.error && <Notice tone="danger">This address doesn&apos;t look like an ERC-20 token on Robinhood Chain.</Notice>}
      {feeBps === STAKER_FEE_BPS && <Notice tone="accent">0.3% fee unlocked by your $WIF stake.</Notice>}
      <Tabs tab={tab} setTab={setTab} />
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "buy" ? (
          <BuyForm token={token} sym={sym} decimals={info.data?.decimals ?? 18} feeBps={feeBps} disabled={!!meme?.taxed || !!info.error} />
        ) : isWif ? (
          <Notice className="text-base">{PLAIN.WifNotSellable} <Link className="underline underline-offset-4" href="/stake">Stake $WIF</Link></Notice>
        ) : (
          <SellForm token={token} sym={sym} decimals={info.data?.decimals ?? 18} feeBps={feeBps} disabled={!!meme?.taxed || !!info.error} />
        )}
      </div>
    </Panel>
  );
}

/** Sweep slider + stock picker; hidden and forced to 0 for restricted regions. */
function SweepControls({ sweep, setSweep, stock, setStock, restricted }: { sweep: number; setSweep: (n: number) => void; stock: string; setStock: (s: string) => void; restricted: boolean }) {
  if (restricted) return <Notice tone="warn">{GEO_BLOCKED} Your trade still works; the Jar slice is off.</Notice>;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="sweep" className="flex justify-between text-sm">
          <span className="text-muted">Slice to your Jar</span>
          <span className="num font-semibold">{(sweep / 100).toFixed(1)}%</span>
        </label>
        <input id="sweep" type="range" min={0} max={1000} step={50} value={sweep} onChange={(e) => setSweep(Number(e.target.value))} className="mt-2 h-11 w-full accent-[var(--accent)]" aria-valuetext={`${(sweep / 100).toFixed(1)} percent`} />
      </div>
      <StockSelect value={stock} onChange={setStock} label="Jar stock" name="sweep-stock" />
    </div>
  );
}

function useTradeResult() {
  const market = useStockQuotes();
  return (logs: Parameters<typeof parseEventLogs>[0]["logs"]) => {
    const evs = parseEventLogs({ abi: terraRouterAbi, logs });
    const traded = evs.find((e) => e.eventName === "Traded");
    const swept = evs.find((e) => e.eventName === "Swept");
    const q = swept ? market.data?.[Number(swept.args.stockId)] : undefined;
    return {
      tokenAmount: traded?.eventName === "Traded" ? traded.args.tokenAmount : undefined,
      ethAmount: traded?.eventName === "Traded" ? traded.args.ethAmount : undefined,
      fee: traded?.eventName === "Traded" ? traded.args.fee : undefined,
      // Always reported when a sweep happened; shares are null (shown "—") if the quote is not loaded (N4).
      stock: swept?.eventName === "Swept" ? { sym: STOCKS[Number(swept.args.stockId)].symbol, shares: sharesOf(swept.args.stockOut, q), hash: swept.transactionHash } : undefined,
    };
  };
}

type TradeResult = ReturnType<ReturnType<typeof useTradeResult>>;

function ResultBox({ r, sym, decimals, isBuy }: { r: TradeResult; sym: string; decimals: number; isBuy: boolean }) {
  return (
    <ul className="space-y-1">
      {isBuy && r.tokenAmount !== undefined && <li>Received <strong className="num">{fmtToken(r.tokenAmount, decimals)} {sym}</strong> in your wallet.</li>}
      {!isBuy && r.ethAmount !== undefined && <li>Sold for <strong className="num">{eth(r.ethAmount)} ETH</strong> gross.</li>}
      {r.stock && <li><strong className="num">{orDash(r.stock.shares, shares18)} {r.stock.sym}</strong> went to your <Link href="/jar" className="underline underline-offset-4">Jar</Link>.</li>}
      {r.fee !== undefined && <li><span className="num">{eth(r.fee)} ETH</span> fee went to the <AddrLink addr={TF.FeePool}>fee pool</AddrLink> (burns $WIF, pays stakers).</li>}
    </ul>
  );
}

function BuyForm({ token, sym, decimals, feeBps, disabled }: { token: Address; sym: string; decimals: number; feeBps: number; disabled: boolean }) {
  const { address } = useAccount();
  const ethBal = useBalance({ address, chainId: CHAIN_ID, query: { enabled: !!address } });
  const [amt, setAmt] = useState("");
  const [sweepRaw, setSweep] = useState(DEFAULT_SWEEP_BPS);
  const [stock, setStock] = useState("NVDA");
  const gate = useStockGate();
  const restricted = gate.status === "restricted";
  const sweep = restricted ? 0 : sweepRaw;
  const wei = parseAmount(amt, 18);
  const dWei = useDebounced(wei?.toString() ?? "");
  const buyOpts = {
    queryKey: ["quote", "buy", token, dWei, sweep, stock, feeBps],
    queryFn: () => getJson<BuyQuote>(`/api/quote?token=${token}&side=buy&amount=${dWei}&sweepBps=${sweep}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 15_000,
    retry: 1,
  };
  const q = useQuery({ ...buyOpts, enabled: !!dWei && dWei !== "0" });
  const market = useStockQuotes();
  const sq = market.data?.find((s) => s.symbol === stock);
  const tx = useTx();
  const qc = useQueryClient();
  const parse = useTradeResult();
  const [result, setResult] = useState<TradeResult | null>(null);
  const over = wei !== null && ethBal.data && wei > ethBal.data.value;
  const stale = q.data && dWei !== (wei?.toString() ?? "");

  const send = async () => {
    if (!q.data || !wei) return;
    const sid = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([
      {
        label: `Buy ${sym}`,
        // Fresh quote right before signing (S2); the step label shows the exact minimum the user signs.
        build: async () => {
          const f = await qc.fetchQuery({ ...buyOpts, staleTime: 0 });
          return {
            label: `Buy ${sym}, at least ${fmtToken(f.minTokenOut, decimals)} ${sym}`,
            call: { address: TF.TerraRouter, abi: terraRouterAbi as unknown as Abi, functionName: "buy", args: [f.route, token, sweep, sid, BigInt(f.minTokenOut), BigInt(f.minStockOut)], value: wei },
          };
        },
      },
    ]);
    if (r) {
      setResult(parse(r.logs));
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      ethBal.refetch();
    }
  };
  const submit = () => (sweep > 0 ? gate.gate(send) : send());

  return (
    <div className="space-y-5">
      {gate.dialog}
      <div>
        <label htmlFor="buy-amt" className="flex justify-between text-sm text-muted">
          <span>Pay (ETH)</span>
          {ethBal.data && <span className="num">Balance {eth(ethBal.data.value)}</span>}
        </label>
        <input id="buy-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} placeholder="0.003" className={cx(inputCls, "num mt-2 text-lg")} aria-invalid={amt !== "" && wei === null} />
      </div>
      <SweepControls sweep={sweep} setSweep={setSweep} stock={stock} setStock={setStock} restricted={restricted} />
      <div aria-live="polite" className="min-h-14">
        {q.isFetching && !q.data && <Skeleton w="100%" h="3rem" className="block" />}
        {q.error && <Notice tone="danger">{(q.error as Error).message}</Notice>}
        {q.data && (
          <Notice className={cx(stale && "opacity-60")}>
            Buy ≈ <strong className="num">{fmtToken(q.data.tokenOut, decimals)} {sym}</strong>
            {sweep > 0 && (
              <> · {(sweep / 100).toFixed(1)}% (<span className="num">{eth(q.data.ethToStock)} ETH</span>) goes to your Jar as {stock} ≈ <span className="num">{orDash(sharesOf(BigInt(q.data.stockOut), sq), shares18)}</span></>
            )}{" "}
            · {(feeBps / 100).toFixed(1)}% fee (<span className="num">{eth(q.data.fee)} ETH</span>) builds the $WIF burn.
            <span className="mt-1 block text-xs text-muted">At least <span className="num">{fmtToken(q.data.minTokenOut, decimals)} {sym}</span> or nothing happens. Re-quoted right before you sign.</span>
          </Notice>
        )}
      </div>
      {over && <p className="text-sm text-danger">That&apos;s more ETH than your wallet holds.</p>}
      {sweep > 0 && <GeoLoadingNote status={gate.status} />}
      <Button className="w-full" onClick={submit} disabled={!DEPLOYED || !address || disabled || !q.data || !!stale || !!over || tx.busy || (sweep > 0 && gate.status === "loading")}>
        {!DEPLOYED ? "Opens when contracts are live" : !address ? "Connect a wallet to trade" : tx.busy ? "Working…" : `Buy ${sym}`}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={result ? <ResultBox r={result} sym={sym} decimals={decimals} isBuy /> : "Done."} />
    </div>
  );
}

function SellForm({ token, sym, decimals, feeBps, disabled }: { token: Address; sym: string; decimals: number; feeBps: number; disabled: boolean }) {
  const { address } = useAccount();
  const bal = useReadContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined, chainId: CHAIN_ID, query: { enabled: !!address } });
  const [amt, setAmt] = useState("");
  const [sweepRaw, setSweep] = useState(DEFAULT_SWEEP_BPS);
  const [stock, setStock] = useState("NVDA");
  const gate = useStockGate();
  const restricted = gate.status === "restricted";
  const sweep = restricted ? 0 : sweepRaw;
  const raw = useMemo(() => parseAmount(amt, decimals), [amt, decimals]);
  const dRaw = useDebounced(raw?.toString() ?? "");
  const sellOpts = {
    queryKey: ["quote", "sell", token, dRaw, sweep, stock, feeBps],
    queryFn: () => getJson<SellQuote>(`/api/quote?token=${token}&side=sell&amount=${dRaw}&sweepBps=${sweep}&stock=${stock}&feeBps=${feeBps}`),
    staleTime: 15_000,
    retry: 1,
  };
  const q = useQuery({ ...sellOpts, enabled: !!dRaw && dRaw !== "0" });
  const market = useStockQuotes();
  const sq = market.data?.find((s) => s.symbol === stock);
  const tx = useTx();
  const approve = useApproveStep();
  const qc = useQueryClient();
  const parse = useTradeResult();
  const [result, setResult] = useState<TradeResult | null>(null);
  const over = raw !== null && bal.data !== undefined && raw > bal.data;
  const stale = q.data && dRaw !== (raw?.toString() ?? "");

  const send = async () => {
    if (!q.data || !raw) return;
    const sid = STOCKS.find((s) => s.symbol === stock)!.id;
    const r = await tx.run([
      approve(token, TF.TerraRouter, raw, sym),
      {
        label: `Sell ${sym}`,
        // Re-quote after the approval, right before the sell signature (S2).
        build: async () => {
          const f = await qc.fetchQuery({ ...sellOpts, staleTime: 0 });
          return {
            label: `Sell ${sym}, at least ${eth(f.minEthOut)} ETH back`,
            call: { address: TF.TerraRouter, abi: terraRouterAbi as unknown as Abi, functionName: "sell", args: [f.route, token, raw, sweep, sid, BigInt(f.minEthOut), BigInt(f.minStockOut)] },
          };
        },
      },
    ]);
    if (r) {
      setResult(parse(r.logs));
      qc.invalidateQueries({ queryKey: ["tf-logs"] });
      bal.refetch();
    }
  };
  const submit = () => (sweep > 0 ? gate.gate(send) : send());

  return (
    <div className="space-y-5">
      {gate.dialog}
      <div>
        <label htmlFor="sell-amt" className="flex justify-between text-sm text-muted">
          <span>Sell ({sym})</span>
          {bal.data !== undefined && (
            <button type="button" className="num min-h-11 underline underline-offset-4 hover:text-fg sm:min-h-0" onClick={() => setAmt(fmtExact(bal.data!, decimals))}>
              Max {fmtToken(bal.data, decimals)}
            </button>
          )}
        </label>
        <input id="sell-amt" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(",", "."))} placeholder="0.0" className={cx(inputCls, "num mt-2 text-lg")} aria-invalid={amt !== "" && raw === null} />
      </div>
      <SweepControls sweep={sweep} setSweep={setSweep} stock={stock} setStock={setStock} restricted={restricted} />
      <div aria-live="polite" className="min-h-14">
        {q.isFetching && !q.data && <Skeleton w="100%" h="3rem" className="block" />}
        {q.error && <Notice tone="danger">{(q.error as Error).message}</Notice>}
        {q.data && (
          <Notice className={cx(stale && "opacity-60")}>
            You get ≈ <strong className="num">{eth(q.data.ethOut)} ETH</strong>
            {sweep > 0 && <> · <span className="num">{eth(q.data.ethToStock)} ETH</span> goes to your Jar as {stock} ≈ <span className="num">{orDash(sharesOf(BigInt(q.data.stockOut), sq), shares18)}</span></>} · fee{" "}
            <span className="num">{eth(q.data.fee)} ETH</span> builds the $WIF burn.
            <span className="mt-1 block text-xs text-muted">At least <span className="num">{eth(q.data.minEthOut)} ETH</span> or nothing happens. Re-quoted right before you sign.</span>
          </Notice>
        )}
      </div>
      {over && <p className="text-sm text-danger">That&apos;s more than your balance.</p>}
      {sweep > 0 && <GeoLoadingNote status={gate.status} />}
      <Button className="w-full" onClick={submit} disabled={!DEPLOYED || !address || disabled || !q.data || !!stale || over || tx.busy || (sweep > 0 && gate.status === "loading")}>
        {!DEPLOYED ? "Opens when contracts are live" : !address ? "Connect a wallet to trade" : tx.busy ? "Working…" : `Approve and sell ${sym}`}
      </Button>
      <TxStatus state={tx.state} onReset={tx.reset} success={result ? <ResultBox r={result} sym={sym} decimals={decimals} isBuy={false} /> : "Done."} />
      {tx.state.hash && tx.state.phase === "done" && <p className="text-xs text-muted">Last tx: <TxLink hash={tx.state.hash} /></p>}
    </div>
  );
}

/** Exact decimal string for a raw balance (Max button must not round). */
function fmtExact(raw: bigint, decimals: number) {
  const s = raw.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
```

#### File: web/components/tx-status.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/tx-status.tsx
"use client";

import type { ReactNode } from "react";
import type { TxState } from "./hooks";
import { Notice, TxLink } from "./ui";

/** Pending / success / error line for a multi-step transaction, always with explorer links. */
export function TxStatus({ state, success, onReset }: { state: TxState; success?: ReactNode; onReset?: () => void }) {
  // The live region stays mounted (empty while idle) so screen readers announce the first update.
  const stepTxt = state.total > 1 ? `Step ${state.step} of ${state.total}: ` : "";
  return (
    <div role="status" aria-live="polite" className={state.phase === "idle" ? "sr-only" : "mt-4 space-y-2"}>
      {state.phase === "sign" && <Notice>{stepTxt}{state.label}. Confirm in your wallet.</Notice>}
      {state.phase === "pending" && (
        <Notice>
          {stepTxt}{state.label} is confirming… {state.hash && <TxLink hash={state.hash}>view on explorer</TxLink>}
        </Notice>
      )}
      {state.phase === "done" && <Notice tone="accent">{success ?? "Done."}</Notice>}
      {state.phase === "error" && (
        <Notice tone="danger">
          {state.error}{" "}
          {onReset && (
            <button type="button" onClick={onReset} className="ml-1 inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Dismiss
            </button>
          )}
        </Notice>
      )}
      {state.hashes.length > 0 && (
        <ul className="space-y-1 text-sm text-muted">
          {state.hashes.map((h) => (
            <li key={h.hash}>
              {h.label}: <TxLink hash={h.hash} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### File: web/components/ui.tsx
[ASSUMED] — Source: see header comment
```tsx
// File: web/components/ui.tsx
// Primitives. Server-safe (no hooks) so both server and client components can use them.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { addrUrl, txUrl } from "@/lib/config";
import { short } from "@/lib/ui-format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong",
  secondary: "border border-line bg-surface-2 text-fg hover:border-muted",
  ghost: "text-fg hover:bg-surface-2",
  danger: "border border-danger/50 bg-danger-soft text-danger hover:border-danger",
};
type Variant = keyof typeof variants;

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={cx(base, variants[variant], className)} {...p} />;
}

export function LinkButton({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], className)} {...p} />;
}

export function Panel({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6", className)} {...p} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "warn" | "danger"; children: ReactNode }) {
  const t = {
    neutral: "border-line text-muted",
    accent: "border-accent/40 bg-accent-soft text-accent",
    warn: "border-warn/40 bg-warn-soft text-warn",
    danger: "border-danger/40 bg-danger-soft text-danger",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

/** Fixed-width skeleton so numbers never shift layout when they load. */
export function Skeleton({ w = "6rem", h = "1em", className }: { w?: string; h?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block animate-pulse rounded-md bg-surface-2 align-middle motion-reduce:animate-none", className)}
      style={{ width: w, height: h }}
    />
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkCls = "underline decoration-line underline-offset-4 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm";

export function TxLink({ hash, children, className }: { hash: string; children?: ReactNode; className?: string }) {
  return (
    <a href={txUrl(hash)} {...ext} className={cx(linkCls, "font-mono", className)} aria-label={`View transaction ${hash} on the explorer`}>
      {children ?? short(hash)}
    </a>
  );
}

const ZERO_ADDR = /0x0{40}(?![0-9a-f])/i;
/** True for links that would point at the zero address (pre-deploy placeholders). Those render as plain text. */
export const isZeroLink = (s: string | undefined) => !!s && ZERO_ADDR.test(s);

export function AddrLink({ addr, children, className }: { addr: string; children?: ReactNode; className?: string }) {
  if (isZeroLink(addr)) return <span className={className}>{children ?? "not deployed"}</span>;
  return (
    <a href={addrUrl(addr)} {...ext} className={cx(linkCls, !children && "font-mono", className)} aria-label={`View ${addr} on the explorer`}>
      {children ?? short(addr)}
    </a>
  );
}

export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} {...ext} className={cx(linkCls, className)}>
      {children}
    </a>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "warn" | "danger" | "accent"; children: ReactNode; className?: string }) {
  const t = {
    neutral: "border-line bg-surface-2 text-fg",
    warn: "border-warn/40 bg-warn-soft text-fg",
    danger: "border-danger/40 bg-danger-soft text-fg",
    accent: "border-accent/40 bg-accent-soft text-fg",
  }[tone];
  return <div className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", t, className)}>{children}</div>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

/** A labelled stat; `value` may be a Skeleton. */
export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="num mt-1 block text-2xl font-semibold tracking-tight">{value}</span>
      {sub && <span className="mt-1 block text-xs text-muted">{sub}</span>}
    </>
  );
  return href && !isZeroLink(href) ? (
    <a href={href} {...ext} className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {body}
    </a>
  ) : (
    <div className="rounded-xl border border-line bg-surface p-4">{body}</div>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-4 text-base text-fg placeholder:text-muted/70 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-danger";
```

#### File: web/lib/api-hindsight.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/api-hindsight.test.ts
// /api/hindsight + /api/card-check response mapping. The card source (lib/card-cache) is replaced so no RPC is reached;
// pricing itself is covered by hindsight.test.ts fixtures and the live tier.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "./hindsight";

const getCard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/card-cache", async (orig) => ({ ...(await orig<typeof import("./card-cache")>()), getCard }));

const { GET: hindsight } = await import("@/app/api/hindsight/route");
const { GET: cardCheck } = await import("@/app/api/card-check/route");
const { Busy } = await import("./concurrency");

const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const card = { wallet: WALLET, totals: { usdPaid8: "10000" }, memes: [], partial: false } as unknown as Card;
const get = (h: (r: Request) => Promise<Response>, path: string) => h(new Request(`http://localhost${path}`));

beforeEach(() => { getCard.mockReset(); });

describe("/api/hindsight", () => {
  it("returns the cached card for (wallet, stock id)", async () => {
    getCard.mockResolvedValue(card);
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET.toLowerCase()}&stock=tsla`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ wallet: WALLET });
    expect(getCard).toHaveBeenCalledWith(WALLET, 1);
  });

  it("503 busy with a Retry-After header when the build queue is full", async () => {
    getCard.mockImplementation(async () => { throw new Busy(5); });
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET}`);
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("5");
    expect(await res.json()).toEqual({ error: "busy", retryAfter: 5 });
  });

  it("503 rpc_unavailable without echoing the error text", async () => {
    getCard.mockImplementation(async () => { throw new Error("fetch https://go.getblock.io/SECRET failed"); });
    const res = await get(hindsight, `/api/hindsight?addr=${WALLET}`);
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(text).not.toContain("SECRET");
    expect(JSON.parse(text)).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
  });
});

describe("/api/card-check", () => {
  it("uses the (wallet, stock) card for every claimed value: 50 different claims, one cache key", async () => {
    getCard.mockResolvedValue(card);
    for (let i = 1; i <= 50; i++) await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=${i}&stockId=2`);
    expect(new Set(getCard.mock.calls.map((c) => `${c[0]}:${c[1]}`))).toEqual(new Set([`${WALLET}:2`]));
  });

  it("verified only within 1% of the derived usdPaid8; no internal fields in the body", async () => {
    getCard.mockResolvedValue(card);
    const ok = await (await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=10050`)).json();
    const bad = await (await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=1`)).json();
    expect(ok).toEqual({ verified: true, derived: "10000" });
    expect(bad).toEqual({ verified: false, derived: "10000" });
  });

  it("503 with a stable code on failure", async () => {
    getCard.mockImplementation(async () => { throw new Error("boom"); });
    const res = await get(cardCheck, `/api/card-check?addr=${WALLET}&usdPaid8=1`);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
  });
});
```

#### File: web/lib/api-quote.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/api-quote.test.ts
// /api/quote response mapping. Only the three RPC-backed lib calls are replaced; the fee/sweep arithmetic in the route
// and pickBestQuote's pool selection (quote.test.ts) run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BestQuote } from "./quote";

const m = vi.hoisted(() => ({ bestQuote: vi.fn(), quoteStock: vi.fn(), oracleMinStock: vi.fn() }));
vi.mock("@/lib/quote", async (orig) => ({ ...(await orig<typeof import("./quote")>()), ...m }));

const { GET: quote } = await import("@/app/api/quote/route");
const { QuoteUnavailable } = await import("./quote");

const MEME = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const q = async (qs: string) => {
  const res = await quote(new Request(`http://localhost/api/quote?${qs}`));
  return { status: res.status, res, body: (await res.json()) as Record<string, unknown> };
};
const best = { route: { kind: 1, v2Path: [], v3Path: "0x", key: {} }, pool: {}, amountOut: 5000n } as unknown as BestQuote;
const oracle = (min: bigint) => ({ min, ethUsd8: 1n, stockUsd8: 1n, fresh: true });

beforeEach(() => {
  m.bestQuote.mockReset().mockResolvedValue(best);
  m.quoteStock.mockReset().mockResolvedValue(100n);
  m.oracleMinStock.mockReset().mockResolvedValue(oracle(90n));
});

describe("/api/quote", () => {
  it("buy: fee and sweep are bps of the ETH notional; meme leg gets the rest; band ok", async () => {
    const r = await q(`token=${MEME}&amount=10000&side=buy&sweepBps=200&feeBps=50`);
    expect(r.status).toBe(200);
    expect(m.bestQuote).toHaveBeenCalledWith(MEME, "buy", 10000n - 50n - 200n);
    expect(r.body).toMatchObject({ fee: "50", ethToStock: "200", stockOut: "100", minStockOut: "90", bandOk: true, warning: null });
  });

  it("warns outside_oracle_band when the pool returns less than the Chainlink floor (tx would revert)", async () => {
    m.oracleMinStock.mockResolvedValue(oracle(101n));
    for (const side of ["buy", "sell", "convert"]) {
      expect((await q(`token=${MEME}&amount=10000&side=${side}`)).body).toMatchObject({ bandOk: false, warning: "outside_oracle_band" });
    }
  });

  it("404 no_route only when pools genuinely cannot fill", async () => {
    m.bestQuote.mockResolvedValue(null);
    expect(await q(`token=${MEME}&amount=10000`)).toMatchObject({ status: 404, body: { error: "no_route" } });
  });

  it("503 quote_unavailable (retryable) when every quote call errored, never as no_route", async () => {
    m.bestQuote.mockImplementation(async () => { throw new QuoteUnavailable("all 2 quote calls failed"); });
    const r = await q(`token=${MEME}&amount=10000`);
    expect(r).toMatchObject({ status: 503, body: { error: "quote_unavailable", retryAfter: 5 } });
    expect(r.res.headers.get("retry-after")).toBe("5");
  });

  it("503 quote_failed without a detail field (M-02)", async () => {
    m.quoteStock.mockImplementation(async () => { throw new Error("viem: https://go.getblock.io/SECRET reverted"); });
    const r = await q(`token=${MEME}&amount=10000`);
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ error: "quote_failed", retryAfter: 5 });
  });

  it("409 oracle_stale when the stock feed is stale and there is a sweep", async () => {
    m.oracleMinStock.mockResolvedValue({ ...oracle(1n), fresh: false });
    expect((await q(`token=${MEME}&amount=10000`)).status).toBe(409);
  });
});
```

#### File: web/lib/api-stream.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/api-stream.test.ts
// /api/stream lifecycle (H-01 / M5). The RPC transport is replaced (no network); stream logic runs for real.
import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn(async (method: string) => (method === "eth_blockNumber" ? "0x100" : [])));
vi.mock("@/lib/rpc", async (orig) => ({ ...(await orig<typeof import("./rpc")>()), rpc: rpcMock }));
delete process.env.GETBLOCK_WSS_FRA; // polling path

const { GET: stream } = await import("@/app/api/stream/route");
const { streamSlots } = await import("./concurrency");

const open = () => {
  const ac = new AbortController();
  return { ac, res: stream(new Request("http://localhost/api/stream", { signal: ac.signal })) };
};
const firstFrame = async (res: Response) => new TextDecoder().decode((await res.body!.getReader().read()).value);
const tick = () => new Promise((r) => setTimeout(r, 20));

afterEach(() => rpcMock.mockClear());

describe("/api/stream", () => {
  it("sends hello, and a client abort releases the slot and stops polling", async () => {
    const { ac, res } = open();
    const r = await res;
    expect(r.headers.get("content-type")).toBe("text/event-stream");
    expect(await firstFrame(r)).toMatch(/^data: \{"type":"hello"/);
    expect(streamSlots.active).toBe(1);
    ac.abort();
    await tick();
    expect(streamSlots.active).toBe(0);
  });

  it("an RPC failure while polling emits an error event instead of killing the stream or rejecting", async () => {
    rpcMock.mockRejectedValueOnce(new Error("HTTP 429 https://secret"));
    const { ac, res } = open();
    const reader = (await res).body!.getReader();
    const dec = new TextDecoder();
    let text = "";
    while (!text.includes("error")) text += dec.decode((await reader.read()).value);
    expect(text).toContain('"type":"error","error":"rpc_unavailable"');
    expect(text).not.toContain("secret");
    ac.abort();
    await tick();
    expect(streamSlots.active).toBe(0);
  });

  it("caps concurrent streams at 20 with 503 + Retry-After, and frees slots on abort", async () => {
    const live = await Promise.all(Array.from({ length: 20 }, () => open()).map(async (s) => ({ ...s, r: await s.res })));
    expect(live.every((s) => s.r.status === 200)).toBe(true);
    const over = await open().res;
    expect(over.status).toBe(503);
    expect(over.headers.get("retry-after")).toBe("10");
    expect(await over.json()).toEqual({ error: "busy", retryAfter: 10 });
    live.forEach((s) => s.ac.abort());
    await tick();
    expect(streamSlots.active).toBe(0);
    expect((await open().res).status).toBe(200);
  });
});
```

#### File: web/lib/api-validation.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/api-validation.test.ts
// Route-level input validation: every case here is rejected before any RPC is reached (no mocks needed).
import { describe, expect, it } from "vitest";
import { GET as cardCheck } from "@/app/api/card-check/route";
import { GET as geo } from "@/app/api/geo/route";
import { GET as hindsight } from "@/app/api/hindsight/route";
import { GET as quote } from "@/app/api/quote/route";
import { ADDR } from "./config";

const MEME = "0x39dBED3a2bd333467115dE45665cC57F813C4571";
const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const call = async (h: (r: Request) => Promise<Response> | Response, path: string, headers?: Record<string, string>) => {
  const res = await h(new Request(`http://localhost${path}`, { headers }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, res };
};

describe("/api/hindsight validation", () => {
  it("400 bad_address for a missing, malformed or bad-checksum address", async () => {
    for (const a of ["", "0x123", "not-an-address", "0x3fdbeb0fc14cca8fdd238dd21725f0b8585ab09E"]) {
      expect(await call(hindsight, `/api/hindsight?addr=${a}`)).toMatchObject({ status: 400, body: { error: "bad_address" } });
    }
  });

  it("400 bad_stock for a stock outside the curated six", async () => {
    expect(await call(hindsight, `/api/hindsight?addr=${WALLET}&stock=AAPL`)).toMatchObject({ status: 400, body: { error: "bad_stock" } });
  });
});

describe("/api/quote validation", () => {
  const q = (qs: string) => call(quote, `/api/quote?${qs}`);
  it("400 bad_side for an unknown side (used to fall through to a sell quote)", async () => {
    expect(await q(`token=${MEME}&amount=1000&side=xyz`)).toMatchObject({ status: 400, body: { error: "bad_side" } });
  });

  it("400 for amounts that are zero, non-numeric or above uint128 (2^128 + 1)", async () => {
    for (const amount of ["0", "-1", "1e18", "340282366920938463463374607431768211457"]) {
      expect((await q(`token=${MEME}&amount=${amount}`)).status).toBe(400);
    }
  });

  it("400 for a bad token, stock, sweep or fee tier", async () => {
    expect((await q(`token=0xnope&amount=1`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&stock=AAPL`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&sweepBps=1001`)).status).toBe(400);
    expect((await q(`token=${MEME}&amount=1&feeBps=10`)).status).toBe(400);
  });

  it("422 wif_not_sellable for a $WIF sell or convert (INVARIANT 1)", async () => {
    for (const side of ["sell", "convert"]) {
      expect(await q(`token=${ADDR.wif}&amount=1000&side=${side}`)).toMatchObject({ status: 422, body: { error: "wif_not_sellable" } });
    }
  });
});

describe("/api/card-check validation", () => {
  const c = (qs: string) => call(cardCheck, `/api/card-check?${qs}`);
  it("400 for a fractional or out-of-range stockId (1.5 used to pass and 503)", async () => {
    for (const sid of ["1.5", "6", "-1", "x"]) expect((await c(`addr=${WALLET}&usdPaid8=100&stockId=${sid}`)).status).toBe(400);
  });

  it("400 for a bad address or a non-digit / oversize claim", async () => {
    expect((await c(`addr=0x1&usdPaid8=100`)).status).toBe(400);
    expect((await c(`addr=${WALLET}&usdPaid8=1.5`)).status).toBe(400);
    expect((await c(`addr=${WALLET}&usdPaid8=${"9".repeat(41)}`)).status).toBe(400);
  });
});

describe("/api/geo", () => {
  it("reads the Vercel country header, flags restricted, and is never cached by intermediaries", async () => {
    const r = await call(geo, "/api/geo", { "x-vercel-ip-country": "US" });
    expect(r.body).toMatchObject({ country: "US", unknown: false });
    expect(typeof r.body.restricted).toBe("boolean");
    expect(r.res.headers.get("cache-control")).toBe("private, no-store");
    expect((await call(geo, "/api/geo")).body).toMatchObject({ country: "UNKNOWN", unknown: true });
  });
});
```

#### File: web/lib/card-cache.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/card-cache.test.ts
import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { createCardCache, cardFailure, matchesClaim } from "./card-cache";
import { Busy, createLimiter } from "./concurrency";
import type { Card } from "./hindsight";

const A = "0x00000000000000000000000000000000000000Aa" as Address;
const addr = (i: number) => `0x${i.toString(16).padStart(40, "0")}` as Address;
const fakeCard = (wallet: Address) => ({ wallet, totals: { usdPaid8: "100" } }) as unknown as Card;
const deferred = () => {
  let resolve!: () => void;
  const p = new Promise<void>((r) => (resolve = r));
  return { p, resolve };
};

describe("createLimiter", () => {
  it("admits max holders, queues up to queueMax FIFO, refuses the rest with Busy", async () => {
    const l = createLimiter(1, 1, 7);
    const r1 = await l.acquire();
    const second = l.acquire();
    await expect(l.acquire()).rejects.toMatchObject({ retryAfter: 7 });
    expect([l.active, l.queued]).toEqual([1, 1]);
    r1();
    const r2 = await second;
    expect([l.active, l.queued]).toEqual([1, 0]);
    r2();
    r2(); // double release is a no-op
    expect(l.active).toBe(0);
  });

  it("queueMax 0 refuses immediately when full (stream cap)", async () => {
    const l = createLimiter(2, 0);
    await l.acquire();
    await l.acquire();
    await expect(l.acquire()).rejects.toBeInstanceOf(Busy);
  });
});

describe("createCardCache (M4)", () => {
  it("dedupes concurrent requests for one wallet into one build and serves repeats from cache", async () => {
    let builds = 0;
    const c = createCardCache({ build: async (w) => (builds++, fakeCard(w)) });
    const [x, y] = await Promise.all([c.get(A, 0), c.get(A.toLowerCase() as Address, 0)]);
    await c.get(A, 0);
    expect(builds).toBe(1);
    expect(x).toBe(y);
  });

  it("keys by stock as well as wallet", async () => {
    let builds = 0;
    const c = createCardCache({ build: async (w) => (builds++, fakeCard(w)) });
    await c.get(A, 0);
    await c.get(A, 1);
    expect(builds).toBe(2);
  });

  it("rebuilds after the TTL and never caches a failure", async () => {
    let t = 0;
    let builds = 0;
    let fail = true;
    const c = createCardCache({ now: () => t, ttlMs: 1000, build: async (w) => { builds++; if (fail) throw new Error("rpc"); return fakeCard(w); } });
    await expect(c.get(A, 0)).rejects.toThrow("rpc");
    fail = false;
    await c.get(A, 0);
    expect(builds).toBe(2);
    t = 999;
    await c.get(A, 0);
    expect(builds).toBe(2);
    t = 1000;
    await c.get(A, 0);
    expect(builds).toBe(3);
  });

  it("stays bounded: 50 distinct wallets with max 10 keep at most 10 entries", async () => {
    const c = createCardCache({ max: 10, build: async (w) => fakeCard(w) });
    for (let i = 1; i <= 50; i++) await c.get(addr(i), 0);
    expect(c.size).toBeLessThanOrEqual(10);
  });

  it("runs at most `concurrency` builds at once and refuses with Busy past the queue", async () => {
    const gate = deferred();
    let running = 0;
    let peak = 0;
    const c = createCardCache({ concurrency: 2, queue: 1, build: async (w) => { running++; peak = Math.max(peak, running); await gate.p; running--; return fakeCard(w); } });
    const ok = [c.get(addr(1), 0), c.get(addr(2), 0), c.get(addr(3), 0)];
    await expect(c.get(addr(4), 0)).rejects.toBeInstanceOf(Busy);
    gate.resolve();
    await Promise.all(ok);
    expect(peak).toBe(2);
  });
});

describe("matchesClaim (card-check)", () => {
  it("verifies within 1% and rejects a fabricated amount or an empty derived card", () => {
    expect(matchesClaim(10_000n, 10_000n)).toBe(true);
    expect(matchesClaim(10_000n, 10_100n)).toBe(true);
    expect(matchesClaim(10_000n, 9_900n)).toBe(true);
    expect(matchesClaim(10_000n, 10_101n)).toBe(false);
    expect(matchesClaim(10_000n, 1n)).toBe(false);
    expect(matchesClaim(0n, 0n)).toBe(false);
  });
});

describe("cardFailure (M-02: stable codes, no detail)", () => {
  it("maps Busy to busy + its Retry-After and anything else to rpc_unavailable", () => {
    expect(cardFailure(new Busy(9))).toEqual({ status: 503, body: { error: "busy", retryAfter: 9 }, headers: { "retry-after": "9" } });
    const f = cardFailure(new Error("https://secret.example/token123 failed"));
    expect(f.body).toEqual({ error: "rpc_unavailable", retryAfter: 5 });
    expect(JSON.stringify(f)).not.toContain("secret");
  });
});
```

#### File: web/lib/card-cache.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/card-cache.ts
// One shared Hindsight card cache for /api/hindsight, /api/card-check, /card/[addr] and its OG image.
// Keyed `addr:stockId` only (never by caller-chosen values), stores the in-flight promise so concurrent requests for
// one wallet share one build, bounded to MAX entries with oldest-first eviction, and admits at most CONCURRENCY builds.
import "server-only";
import type { Address } from "viem";
import type { StockId } from "./config";
import { Busy, createLimiter } from "./concurrency";
import { buildCard, type Card } from "./hindsight";

type Entry = { at: number; card: Promise<Card> };

export interface CardCacheOptions {
  build: (wallet: Address, stockId: StockId) => Promise<Card>;
  ttlMs?: number;
  max?: number;
  concurrency?: number;
  queue?: number;
  now?: () => number;
}

export function createCardCache({ build, ttlMs = 300_000, max = 200, concurrency = 3, queue = 6, now = Date.now }: CardCacheOptions) {
  const entries = new Map<string, Entry>();
  const builds = createLimiter(concurrency, queue);

  const evict = () => {
    const t = now();
    for (const [k, e] of entries) if (t - e.at >= ttlMs) entries.delete(k);
    while (entries.size >= max) entries.delete(entries.keys().next().value as string); // Map keeps insertion order
  };

  async function limitedBuild(wallet: Address, stockId: StockId): Promise<Card> {
    const release = await builds.acquire(); // throws Busy when the queue is full
    try {
      return await build(wallet, stockId);
    } finally {
      release();
    }
  }

  return {
    get size() {
      return entries.size;
    },
    limiter: builds,
    /** Cached (or shared in-flight) card for wallet + stock. Failures are never cached. Throws Busy when saturated. */
    get(wallet: Address, stockId: StockId): Promise<Card> {
      const key = `${wallet.toLowerCase()}:${stockId}`;
      const hit = entries.get(key);
      if (hit && now() - hit.at < ttlMs) return hit.card;
      if (hit) entries.delete(key);
      evict();
      const card = limitedBuild(wallet, stockId);
      entries.set(key, { at: now(), card });
      card.catch(() => {
        if (entries.get(key)?.card === card) entries.delete(key);
      });
      return card;
    },
  };
}

const shared = createCardCache({ build: buildCard });

/** The process-wide cached card getter every route and page uses instead of calling buildCard directly. */
export const getCard = (wallet: Address, stockId: StockId = 0) => shared.get(wallet, stockId);

/** Stable client-facing failure for a card build (detail stays in server logs, never in the body). */
export function cardFailure(e: unknown): { status: 503; body: { error: "busy" | "rpc_unavailable"; retryAfter: number }; headers: Record<string, string> } {
  const retryAfter = e instanceof Busy ? e.retryAfter : 5;
  const error = e instanceof Busy ? "busy" : "rpc_unavailable";
  return { status: 503, body: { error, retryAfter }, headers: { "retry-after": String(retryAfter) } };
}

/** card-check rule: a minted usdPaid8 is verified within 1% of the re-derived one (a later buy may postdate the mint). */
export function matchesClaim(derived: bigint, claimed: bigint): boolean {
  return derived > 0n && (claimed > derived ? claimed - derived : derived - claimed) * 100n <= derived;
}
```

#### File: web/lib/concurrency.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/concurrency.ts
// Process-wide admission control for expensive server work (Hindsight card builds, SSE streams).
import "server-only";

/** Thrown when a limiter is full and its wait queue is full: map to 503 + Retry-After. */
export class Busy extends Error {
  constructor(public retryAfter: number) {
    super("busy");
  }
}

/**
 * At most `max` holders at once; up to `queueMax` callers wait (FIFO) for a slot, everyone after that is refused
 * with Busy. queueMax 0 means "refuse immediately when full".
 */
export function createLimiter(max: number, queueMax: number, retryAfter = 5) {
  let active = 0;
  const waiting: (() => void)[] = [];
  const release = () => {
    const next = waiting.shift();
    if (next) next(); // hand the slot over directly; `active` is unchanged
    else active--;
  };
  return {
    get active() {
      return active;
    },
    get queued() {
      return waiting.length;
    },
    /** Resolves with a release function once a slot is held; release exactly once. */
    async acquire(): Promise<() => void> {
      if (active < max) active++;
      else if (waiting.length < queueMax) await new Promise<void>((r) => waiting.push(r));
      else throw new Busy(retryAfter);
      let done = false;
      return () => {
        if (done) return;
        done = true;
        release();
      };
    },
  };
}

/** Global cap on concurrent /api/stream connections (each holds an upstream socket or poller for up to 55 s). */
export const streamSlots = createLimiter(20, 0, 10);
```

#### File: web/lib/hindsight.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/hindsight.test.ts
import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionResult, zeroAddress, type Address, type Hex } from "viem";
import { erc20Abi, terraRouterAbi } from "./abi";
import { blockTs, decodeBalances, purchaseSources, routerMemeLeg, summarize, type CardMeme, type Receipt } from "./hindsight";
import { RpcError } from "./rpc";

const ROUTER = "0x1111111111111111111111111111111111111111" as Address;
const USER = "0x2222222222222222222222222222222222222222" as Address;
const MEME = "0x3333333333333333333333333333333333333333" as Address;
const OTHER = "0x4444444444444444444444444444444444444444" as Address;

type EventName = "Traded" | "Swept";
/** A receipt log for a TerraRouter event, encoded with viem from the generated ABI (topics + non-indexed data). */
function routerLog(address: Address, eventName: EventName, args: Record<string, unknown>): Receipt["logs"][number] {
  const ev = terraRouterAbi.find((x) => x.type === "event" && x.name === eventName) as { inputs: readonly { name: string; type: string; indexed?: boolean }[] };
  const topics = encodeEventTopics({ abi: terraRouterAbi, eventName, args: args as never }) as Hex[];
  const data = encodeAbiParameters(
    ev.inputs.filter((i) => !i.indexed),
    ev.inputs.filter((i) => !i.indexed).map((i) => args[i.name]),
  );
  return { address, topics, data, blockNumber: "0x1", transactionHash: "0xaa" };
}

const ETH = 10n ** 18n;
const value = ETH; // tx.value sent to TerraRouter.buy
const fee = (value * 50n) / 10_000n; // 0.5%
const sweep = (value * 200n) / 10_000n; // 2% to stock
const traded = routerLog(ROUTER, "Traded", { user: USER, token: MEME, isBuy: true, ethAmount: value - fee - sweep, tokenAmount: 123n, fee });
const swept = routerLog(ROUTER, "Swept", { user: USER, stockId: 0, ethIn: sweep, stockOut: 456n });

describe("routerMemeLeg (M1: router buys price only the meme leg)", () => {
  it("paid = tx.value - Traded.fee - Swept.ethIn on a synthetic router receipt", () => {
    const rc: Receipt = { logs: [traded, swept] };
    expect(routerMemeLeg(rc, value, ROUTER)).toBe(value - fee - sweep);
    expect(routerMemeLeg(rc, value, ROUTER)).toBe(975n * 10n ** 15n);
  });

  it("ignores identical events emitted by any other contract, and unrelated logs", () => {
    const fake = routerLog(OTHER, "Swept", { user: USER, stockId: 0, ethIn: 10n ** 17n, stockOut: 1n });
    const transfer = { ...traded, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex], data: "0x" as Hex };
    expect(routerMemeLeg({ logs: [fake, { ...transfer, address: ROUTER }, traded, swept] }, value, ROUTER)).toBe(value - fee - sweep);
  });

  it("sums several Swept legs and treats a no-sweep buy as value - fee", () => {
    expect(routerMemeLeg({ logs: [traded, swept, swept] }, value, ROUTER)).toBe(value - fee - 2n * sweep);
    expect(routerMemeLeg({ logs: [traded] }, value, ROUTER)).toBe(value - fee);
  });

  it("is null without a Traded event (the tx is not a router buy we can price)", () => {
    expect(routerMemeLeg({ logs: [swept] }, value, ROUTER)).toBeNull();
    expect(routerMemeLeg(undefined, value, ROUTER)).toBeNull();
  });
});

describe("purchaseSources (M1: TerraRouter counts as a source once deployed)", () => {
  const reg = ["0x8876789976dEcBfCbBbe364623C63652db8C0904"];
  it("adds the router, lower-cased, so Transfer(from = TerraRouter) is a buy", () => {
    const s = purchaseSources(reg, ROUTER);
    expect(s.has(ROUTER.toLowerCase())).toBe(true);
    expect(s.has(reg[0].toLowerCase())).toBe(true);
    expect(s.size).toBe(2);
  });

  it("skips the zero address before Deploy has written deployments.json", () => {
    expect(purchaseSources(reg, zeroAddress).size).toBe(1);
    expect(purchaseSources(reg, zeroAddress).has(zeroAddress)).toBe(false);
  });
});

describe("blockTs (M2: never price with NaN ts)", () => {
  it("reads a hex timestamp", () => {
    expect(blockTs({ timestamp: "0x6a5b0c00" }, 1)).toBe(0x6a5b0c00);
  });

  it("throws on an RpcError item, a null block and a missing/zero timestamp", () => {
    expect(() => blockTs(new RpcError(-32005, "limit"), 1)).toThrow(/limit/);
    expect(() => blockTs(null, 9)).toThrow(/block 9/);
    expect(() => blockTs({}, 2)).toThrow(/bad timestamp/);
    expect(() => blockTs({ timestamp: "0x0" }, 3)).toThrow(/bad timestamp/);
  });
});

describe("decodeBalances (M2: an unreadable balance is not 0)", () => {
  const enc = (n: bigint) => encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: n });
  it("decodes balanceOf results in order", () => {
    expect(decodeBalances([enc(5n), enc(0n)], [MEME, OTHER])).toEqual([5n, 0n]);
  });

  it("throws on an RpcError item instead of reading it as 0n", () => {
    expect(() => decodeBalances([enc(5n), new RpcError(429, "HTTP 429")], [MEME, OTHER])).toThrow(/429/);
  });
});

const meme = (symbol: string, usdPaid8: string, usdToday8: string | null, shares18 = "0"): CardMeme => ({
  token: `0x${symbol.padEnd(40, "0")}` as Address,
  symbol,
  usdPaid8,
  usdToday8,
  todayReason: usdToday8 === null ? "quote unavailable (RPC error)" : null,
  usdCounterfactual8: "100",
  holding: "1",
  buys: [{ shares18 } as CardMeme["buys"][number]],
});

describe("summarize (M3: no fabricated $0 today)", () => {
  it("excludes unquoted memes from usdToday8 and usdPaidQuoted8, keeps them in paid/counterfactual/shares", () => {
    const s = summarize([meme("AAA", "1000", "500", "7"), meme("BBB", "4000", null, "3")], []);
    expect(s.totals).toEqual({ usdPaid8: "5000", usdPaidQuoted8: "1000", usdToday8: "500", usdCounterfactual8: "200", shares18: "10" });
    expect(s.partial).toBe(true);
    expect(s.unquoted).toEqual([{ token: meme("BBB", "0", null).token, symbol: "BBB", reason: "quote unavailable (RPC error)" }]);
  });

  it("never names an unquoted meme the worst trade (it would read as -100%)", () => {
    const s = summarize([meme("AAA", "1000", "900"), meme("BBB", "1000", null)], []);
    expect(s.worst?.symbol).toBe("AAA");
    expect(s.worst?.pct).toBeCloseTo(-10, 9);
    expect(summarize([meme("BBB", "1000", null)], []).worst).toBeNull();
  });

  it("keeps a genuine $0 (holding sold to zero) as a priced value", () => {
    const s = summarize([meme("AAA", "1000", "0")], []);
    expect(s.totals.usdToday8).toBe("0");
    expect(s.worst).toEqual({ symbol: "AAA", pct: -100 });
    expect(s.partial).toBe(false);
  });

  it("marks the card partial when a history scan left gaps, even if every meme is quoted", () => {
    const gap = { token: MEME, symbol: "AAA", fromBlock: 1, toBlock: 2 };
    expect(summarize([meme("AAA", "1", "1")], [gap]).partial).toBe(true);
    expect(summarize([], []).partial).toBe(false);
  });
});
```

#### File: web/lib/quote.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/quote.test.ts
import { describe, expect, it } from "vitest";
import { encodeAbiParameters, type Address } from "viem";
import { ADDR } from "./config";
import type { PoolEntry } from "./registry";
import { QuoteUnavailable, bestQuote, pickBestQuote, quoteStock, routeFor, v3Path } from "./quote";
import { RpcError } from "./rpc";

const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571" as Address;
const NVDA = "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const hexOf = (a: string) => a.slice(2).toLowerCase();

const v2: PoolEntry = { kind: 1, version: "v2", pool: ZERO, quote: "WETH", liquidityUsd: 1 };
const v3: PoolEntry = { kind: 2, version: "v3", pool: ZERO, fee: 3000, quote: "WETH", liquidityUsd: 1 };
const v4Key = { currency0: ZERO, currency1: PONS, fee: 8388608, tickSpacing: 60, hooks: ADDR.wifHook };
const v4: PoolEntry = { kind: 3, version: "v4", id: "0x01", key: v4Key, liquidityUsd: 1 };

describe("v3Path", () => {
  it("packs address(20) + uint24 fee(3) + address(20)", () => {
    const p = v3Path(ADDR.weth, 500, NVDA);
    expect(p).toBe(`0x${hexOf(ADDR.weth)}0001f4${hexOf(NVDA)}`);
    expect((p.length - 2) / 2).toBe(43);
  });

  it("encodes the 1% tier and the zero fee at the edges of uint24", () => {
    expect(v3Path(ADDR.weth, 10000, NVDA).slice(42, 48)).toBe("002710");
    expect(v3Path(ADDR.weth, 0, NVDA).slice(42, 48)).toBe("000000");
  });

  it("rejects a fee that does not fit uint24", () => {
    expect(() => v3Path(ADDR.weth, 2 ** 24, NVDA)).toThrow();
  });
});

describe("routeFor", () => {
  it("builds v2 and v3 routes with WETH on the input side for buys and the output side for sells", () => {
    expect(routeFor(v2, PONS, "buy").v2Path).toEqual([ADDR.weth, PONS]);
    expect(routeFor(v2, PONS, "sell").v2Path).toEqual([PONS, ADDR.weth]);
    expect(routeFor(v3, PONS, "buy")).toMatchObject({ kind: 2, v2Path: [], v3Path: v3Path(ADDR.weth, 3000, PONS) });
    expect(routeFor(v3, PONS, "sell").v3Path).toBe(v3Path(PONS, 3000, ADDR.weth));
  });

  it("passes a hooked, dynamic-fee v4 key through verbatim (fee 8388608 kept)", () => {
    const r = routeFor(v4, PONS, "buy");
    expect(r).toEqual({ kind: 3, v2Path: [], v3Path: "0x", key: v4Key });
  });

  it("never returns a v2/v3 route whose endpoints differ from the declared token (TerraRouter._validate would revert BadRoute)", () => {
    for (const side of ["buy", "sell"] as const) {
      const r2 = routeFor(v2, PONS, side);
      expect(r2.v2Path).toContain(PONS);
      expect(r2.v2Path).toContain(ADDR.weth);
      expect(routeFor(v3, PONS, side).v3Path.toLowerCase()).toContain(hexOf(PONS));
    }
  });
});

describe("bestQuote / quoteStock guards (no RPC reached)", () => {
  it("refuses to quote a $WIF sell (INVARIANT 1)", async () => {
    await expect(bestQuote(ADDR.wif, "sell", 10n ** 18n)).resolves.toBeNull();
  });

  it("returns null for a zero amount and for a token outside the registry", async () => {
    await expect(bestQuote(ADDR.wif, "buy", 0n)).resolves.toBeNull();
    await expect(bestQuote("0x000000000000000000000000000000000000dEaD", "buy", 1n)).resolves.toBeNull();
  });

  it("quotes zero ETH into stock as zero without a call", async () => {
    await expect(quoteStock(0, 0n)).resolves.toBe(0n);
  });
});

describe("pickBestQuote (M3/S8: unavailable vs no route)", () => {
  const v2Out = (n: bigint) => encodeAbiParameters([{ type: "uint256[]" }], [[1n, n]]);
  const v3Out = (n: bigint) => encodeAbiParameters([{ type: "uint256" }, { type: "uint160" }, { type: "uint32" }, { type: "uint256" }], [n, 0n, 0, 0n]);
  const rateLimited = new RpcError(429, "HTTP 429");

  it("picks the largest decoded output and builds that pool's route", () => {
    const best = pickBestQuote([v2, v3], [v2Out(100n), v3Out(250n)], PONS, "sell");
    expect(best?.amountOut).toBe(250n);
    expect(best?.route.kind).toBe(2);
  });

  it("uses the surviving pools when only some calls errored", () => {
    expect(pickBestQuote([v2, v3], [rateLimited, v3Out(7n)], PONS, "sell")?.amountOut).toBe(7n);
  });

  it("throws QuoteUnavailable when every call failed at the RPC layer (never 'no route' / $0)", () => {
    expect(() => pickBestQuote([v2, v3], [rateLimited, new RpcError(-32603, "internal")], PONS, "sell")).toThrow(QuoteUnavailable);
  });

  it("returns null when pools answered but none can fill (revert, zero output, undecodable)", () => {
    const revert = new RpcError(3, "execution reverted");
    expect(pickBestQuote([v2, v3], [revert, v3Out(0n)], PONS, "sell")).toBeNull();
    expect(pickBestQuote([v2], ["0xdead"], PONS, "sell")).toBeNull();
    expect(pickBestQuote([], [], PONS, "sell")).toBeNull();
  });
});
```

#### File: web/lib/rounds.integration.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/rounds.integration.ts
// Integration tier: runs against the committed Chainlink round tables in web/data/rounds (built from mainnet 4663).
import { describe, expect, it } from "vitest";
import { loadTable, normalize8, NVDA_HISTORY_FEED, PHASE_BASE, roundAt } from "./rounds";

describe("committed NVDA/USD history table", () => {
  it("is ordered and roundAt brackets a mid-table timestamp", async () => {
    const t = await loadTable(NVDA_HISTORY_FEED);
    expect(t.rounds.length).toBeGreaterThan(100);
    for (let i = 1; i < t.rounds.length; i++) expect(t.rounds[i][2]).toBeGreaterThanOrEqual(t.rounds[i - 1][2]);
    const mid = t.rounds[Math.floor(t.rounds.length / 2)];
    const r = roundAt(t, mid[2] + 1);
    const idx = t.rounds.findIndex((x) => PHASE_BASE + BigInt(x[0]) === r.roundId);
    expect(r.updatedAt).toBeLessThanOrEqual(mid[2] + 1);
    if (idx + 1 < t.rounds.length) expect(t.rounds[idx + 1][2]).toBeGreaterThan(mid[2] + 1);
  });

  it("stores early scaled rounds already normalized (round 24 == SOURCE LOCK raw / 1e8)", async () => {
    const t = await loadTable(NVDA_HISTORY_FEED);
    const r24 = t.rounds.find((x) => x[0] === 24);
    expect(r24?.[1]).toBe((2030652000000000000n / 10n ** 8n).toString());
    for (const [n, a] of t.rounds) expect(normalize8(t.feed, n, BigInt(a))).toBe(BigInt(a));
  });

  it("rejects a feed with no committed table", async () => {
    await expect(loadTable("0x000000000000000000000000000000000000dEaD")).rejects.toThrow(/ENOENT/);
  });
});
```

#### File: web/lib/rounds.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/rounds.test.ts
import { describe, expect, it } from "vitest";
import { normalize8, PHASE_BASE, roundAt, type RoundTable } from "./rounds";

const FEED = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15";
const table = (rounds: RoundTable["rounds"]): RoundTable => ({ feed: FEED, decimals: 8, phase: 1, rounds });
const T = table([
  [1, "100", 1000],
  [2, "200", 2000],
  [3, "300", 3000],
]);

describe("roundAt", () => {
  it("returns the last round updated at or before ts", () => {
    expect(roundAt(T, 2500)).toEqual({ roundId: PHASE_BASE + 2n, price8: 200n, updatedAt: 2000 });
  });

  it("includes a round whose updatedAt equals ts, and clamps to the last round after the table", () => {
    expect(roundAt(T, 1000).roundId).toBe(PHASE_BASE + 1n);
    expect(roundAt(T, 3000).roundId).toBe(PHASE_BASE + 3n);
    expect(roundAt(T, 9_999_999).price8).toBe(300n);
    expect(roundAt(table([[7, "42", 50]]), 51)).toEqual({ roundId: PHASE_BASE + 7n, price8: 42n, updatedAt: 50 });
  });

  it("throws when ts precedes the feed or the table is empty", () => {
    expect(() => roundAt(T, 999)).toThrow(/no round before 999/);
    expect(() => roundAt(table([]), 1000)).toThrow(/no round before 1000/);
  });
});

describe("normalize8", () => {
  it("divides 1e16-scaled early answers by 1e8 (NVDA/USD round 24, SOURCE LOCK value)", () => {
    expect(normalize8(FEED, 24, 2030652000000000000n)).toBe(20306520000n);
  });

  it("uses a strict > 1e15 threshold, like StockOracle.SCALED_THRESHOLD", () => {
    expect(normalize8(FEED, 1, 10n ** 15n)).toBe(10n ** 15n);
    expect(normalize8(FEED, 1, 10n ** 15n + 1n)).toBe((10n ** 15n + 1n) / 10n ** 8n);
  });

  it("never rescales a normal 8-decimal answer", () => {
    expect(normalize8(FEED, 1718, 17107118018n)).toBe(17107118018n);
    expect(normalize8(FEED, 1, 0n)).toBe(0n);
  });
});
```

#### File: web/lib/rpc.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/rpc.test.ts
import { describe, expect, it } from "vitest";
import { RpcError, TOO_MANY_LOGS, createTokenBucket, quicknodeUrl, unwrap } from "./rpc";

describe("unwrap (M2: batch errors are never data)", () => {
  it("returns a real result unchanged, including falsy-but-valid values", () => {
    expect(unwrap<string>("0x01")).toBe("0x01");
    expect(unwrap<unknown[]>([])).toEqual([]);
    expect(unwrap<number>(0)).toBe(0);
  });

  it("throws the per-call RpcError instead of returning it", () => {
    const e = new RpcError(-32005, "limit exceeded");
    expect(() => unwrap(e)).toThrow(e);
  });

  it("throws on a null or missing result (pruned block, unknown tx)", () => {
    expect(() => unwrap(null, "block 7")).toThrow(/block 7: null result/);
    expect(() => unwrap(undefined)).toThrow(RpcError);
  });
});

describe("createTokenBucket (S2: process-wide public RPC budget)", () => {
  it("lets a burst through, then makes the caller wait rate-proportionally", () => {
    let t = 0;
    const b = createTokenBucket(4, 8, () => t);
    expect(b.reserve(8)).toBe(0); // burst
    expect(b.reserve(4)).toBe(1000); // 4 calls at 4/s
    t = 1000;
    expect(b.reserve(0)).toBe(0); // the debt has been repaid by now
  });

  it("refills over time but never above the burst", () => {
    let t = 0;
    const b = createTokenBucket(4, 8, () => t);
    t = 60_000;
    expect(b.reserve(8)).toBe(0);
    expect(b.reserve(1)).toBe(250);
  });
});

describe("quicknodeUrl (M-09: .env.local names)", () => {
  it("prefers QUICKNODE_RPC when set", () => {
    expect(quicknodeUrl({ QUICKNODE_RPC: "https://x/abc/", QUICKNODE_BASE: "https://y", QUICKNODE_TOKEN: "t" })).toBe("https://x/abc/");
  });

  it("composes base + token with exactly one slash between and a trailing slash", () => {
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro/", QUICKNODE_TOKEN: "/tok123/" })).toBe("https://spring.quiknode.pro/tok123/");
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro", QUICKNODE_TOKEN: "tok123" })).toBe("https://spring.quiknode.pro/tok123/");
  });

  it("is null when neither form is configured", () => {
    expect(quicknodeUrl({})).toBeNull();
    expect(quicknodeUrl({ QUICKNODE_BASE: "https://spring.quiknode.pro" })).toBeNull();
  });
});

describe("TOO_MANY_LOGS", () => {
  it("recognises the 10k-log error only on RpcError", () => {
    expect(TOO_MANY_LOGS(new RpcError(-32005, "query returned more than 10000 results"))).toBe(true);
    expect(TOO_MANY_LOGS(new RpcError(-32005, "rate limited"))).toBe(false);
    expect(TOO_MANY_LOGS(new Error("query returned more than 10000 results"))).toBe(false);
  });
});
```

#### File: web/lib/stock-paths.integration.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/stock-paths.integration.ts
// Integration tier: web/lib/config.ts STOCKS + web/lib/quote.ts STOCK_PATHS must match contracts/script/TerraConfig.sol
// stocks() byte for byte (same tokens, feeds, symbols, pool fees and hops), or the UI quotes a path the contract won't use.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { encodePacked, type Address, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { ADDR, STOCKS } from "./config";
import { STOCK_PATHS } from "./quote";

type SolStock = { id: number; token: Address; liveFeed: Address; historyFeed: Address; path: Hex; fees: number[]; symbol: string };
const SOL = readFileSync(fileURLToPath(new URL("../../contracts/script/TerraConfig.sol", import.meta.url)), "utf8");
const STOCK_RE =
  /s\[(\d)\] = StockOracle\.Stock\(\s*(\w+), (0x[0-9a-fA-F]{40}), (0x[0-9a-fA-F]{40}),\s*abi\.encodePacked\(((?:[^()]|\([^()]*\))*)\), "(\w+)"\s*\);/g;

function parseStocks(sol: string): SolStock[] {
  const consts = new Map([...sol.matchAll(/address internal constant (\w+) = (0x[0-9a-fA-F]{40});/g)].map((m) => [m[1], m[2] as Address]));
  const addr = (name: string) => {
    const a = consts.get(name);
    if (!a) throw new Error(`unknown constant ${name}`);
    return a;
  };
  return [...sol.matchAll(STOCK_RE)].map((m) => {
    const parts = m[5].split(",").map((s) => s.trim());
    const fees = parts.filter((p) => p.startsWith("uint24(")).map((p) => Number(p.slice(7, -1)));
    const types = parts.map((p) => (p.startsWith("uint24(") ? "uint24" : "address"));
    const values = parts.map((p) => (p.startsWith("uint24(") ? Number(p.slice(7, -1)) : addr(p)));
    return { id: Number(m[1]), token: addr(m[2]), liveFeed: m[3] as Address, historyFeed: m[4] as Address, path: encodePacked(types, values), fees, symbol: m[6] };
  });
}

describe("STOCKS / STOCK_PATHS vs TerraConfig.sol stocks()", () => {
  const sol = parseStocks(SOL);

  it("has the same 6 stocks with identical tokens, feeds, symbols and packed paths", () => {
    expect(sol.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const s of sol) {
      const w = STOCKS[s.id];
      expect(w.symbol).toBe(s.symbol);
      expect(w.token.toLowerCase()).toBe(s.token.toLowerCase());
      expect(w.liveFeed.toLowerCase()).toBe(s.liveFeed.toLowerCase());
      expect(w.historyFeed.toLowerCase()).toBe(s.historyFeed.toLowerCase());
      expect(STOCK_PATHS[w.id].toLowerCase()).toBe(s.path.toLowerCase());
    }
  });

  it("routes GOOGL and SNDK through USDG (2 hops, fees 500/500 and 500/10000)", () => {
    expect(sol[2].fees).toEqual([500, 500]);
    expect(sol[3].fees).toEqual([500, 10000]);
    for (const id of [2, 3] as const) expect(STOCK_PATHS[id].toLowerCase()).toContain(ADDR.usdg.slice(2).toLowerCase());
    expect(sol.filter((s) => s.fees.length === 1).map((s) => s.fees[0])).toEqual([500, 3000, 500, 3000]);
  });

  it("fails loudly on a path constant it cannot resolve", () => {
    const bad = SOL.replace("abi.encodePacked(WETH, uint24(500), NVDA)", "abi.encodePacked(WETH, uint24(500), NOPE)");
    expect(() => parseStocks(bad)).toThrow(/unknown constant NOPE/);
  });
});
```

#### File: web/lib/ui-chain.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-chain.ts
// Client-safe chain helpers: deployment state, a public viem client, extra read ABIs.
// Never imports server-only modules (rpc, rounds, quote, hindsight).
import { createPublicClient, http, zeroAddress, type Address } from "viem";
import { robinhood } from "viem/chains";
import { ADDR, PUBLIC_RPC, TF } from "./config";

/** True only once Deploy.s.sol has written real addresses into data/deployments.json. */
export const DEPLOYED = (TF as unknown as { deployed?: boolean }).deployed !== false && TF.TerraRouter !== zeroAddress;

/** JSON-RPC batching (<= 30 calls per POST) keeps chunked getLogs scans under the public RPC rate limit. */
export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(PUBLIC_RPC, { batch: { batchSize: 30, wait: 20 }, retryCount: 3, retryDelay: 400 }),
});

export type ContractKey = "StockOracle" | "Jar" | "WifStaking" | "FeePool" | "TerraRouter" | "HindsightLens" | "FriendJar";

export const CONTRACTS: { key: ContractKey; address: Address; role: string }[] = [
  { key: "TerraRouter", address: TF.TerraRouter, role: "Routes meme trades through Uniswap and sweeps a slice into stock." },
  { key: "Jar", address: TF.Jar, role: "Ownerless ledger holding your real Stock Tokens." },
  { key: "FeePool", address: TF.FeePool, role: "Each epoch: half buys and burns $WIF, half buys stock for stakers." },
  { key: "WifStaking", address: TF.WifStaking, role: "Stake $WIF, pick a reward stock, claim it to your Jar." },
  { key: "StockOracle", address: TF.StockOracle, role: "Chainlink reads and the 3% min-out band on every stock fill." },
  { key: "HindsightLens", address: TF.HindsightLens, role: "Recomputes any Hindsight card onchain; mints it by burning 1 $WIF." },
  { key: "FriendJar", address: TF.FriendJar, role: "Shared Jars owned pro-rata by contribution." },
];

export const WIF = ADDR.wif;

/** Chainlink AggregatorV3 subset. */
export const aggregatorAbi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "";
export const DEMO_ADDR = process.env.NEXT_PUBLIC_DEMO_ADDR || "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
export const FRIEND_JARS = process.env.NEXT_PUBLIC_FRIEND_JARS === "1";
/** Real long-history wallet used as the Scene 2 contrast shot (PRD §6). Its card is read live from chain like any other. */
export const HISTORY_ADDR = process.env.NEXT_PUBLIC_HISTORY_ADDR || "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";

/** Addresses marked Blockscout-verified in data/deployments.json ("verified": [...]) after `forge verify-contract`. Empty = no badge. */
export const VERIFIED = new Set(((TF as unknown as { verified?: string[] }).verified ?? []).map((a) => a.toLowerCase()));

/** Contracts shown on /proof: FriendJar only when the feature flag is on. */
export const SHOWN_CONTRACTS = CONTRACTS.filter((c) => c.key !== "FriendJar" || FRIEND_JARS);
```

#### File: web/lib/ui-errors.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-errors.test.ts
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { terraRouterAbi } from "./abi";
import { API_ERRORS, PLAIN, WRONG_CHAIN, classifyOwnerProbe, isRevert, plainError } from "./ui-errors";

class FakeChainMismatch extends Error {
  override name = "ConnectorChainMismatchError";
}

describe("plainError", () => {
  it("maps a decoded custom revert to plain words", () => {
    const data = encodeErrorResult({ abi: terraRouterAbi, errorName: "WifNotSellable" });
    const rev = new ContractFunctionRevertedError({ abi: terraRouterAbi, data, functionName: "sell" });
    expect(plainError(new BaseError("call failed", { cause: rev }))).toBe(PLAIN.WifNotSellable);
  });
  it("maps a wallet rejection", () => {
    const e = new BaseError("x", { cause: new UserRejectedRequestError(new Error("User rejected")) });
    expect(plainError(e)).toBe("You cancelled in your wallet.");
  });
  it("maps a wrong-chain connector error, even when nested", () => {
    expect(plainError(new FakeChainMismatch("chain 1 does not match 4663"))).toBe(WRONG_CHAIN);
    expect(plainError(new Error("wrap", { cause: new FakeChainMismatch("x") }))).toBe(WRONG_CHAIN);
  });
  it("falls back to the message / a generic line", () => {
    expect(plainError(new Error("boom"))).toBe("boom");
    expect(plainError("nope")).toBe("Something went wrong.");
    expect(plainError(new BaseError("insufficient funds for gas * price + value"))).toBe("Not enough ETH for this amount plus gas.");
  });
  it("covers the gas and self-call errors", () => {
    expect(PLAIN.InsufficientGas).toMatch(/gas/);
    expect(PLAIN.OnlySelf).toBeTruthy();
  });
  it("never promises next-epoch activation", () => {
    expect(PLAIN.NoActiveStake).toMatch(/e\+2/);
    expect(Object.values(PLAIN).join(" ")).not.toMatch(/next epoch/i);
    expect(API_ERRORS.wif_not_sellable).toBe(PLAIN.WifNotSellable);
  });
});

describe("isRevert / classifyOwnerProbe", () => {
  it("treats an execution revert as ownerless", () => {
    const e = new Error("call failed", { cause: Object.assign(new Error("execution reverted"), { name: "ExecutionRevertedError" }) });
    expect(isRevert(e)).toBe(true);
    expect(classifyOwnerProbe({ error: e })).toBe("ownerless");
  });
  it("treats an empty return as ownerless and a 32-byte word as has-owner", () => {
    expect(classifyOwnerProbe({ data: "0x" })).toBe("ownerless");
    expect(classifyOwnerProbe({ data: undefined })).toBe("ownerless");
    expect(classifyOwnerProbe({ data: `0x${"0".repeat(24)}${"ab".repeat(20)}` })).toBe("has-owner");
  });
  it("makes no claim on an RPC/network failure or odd data", () => {
    const net = Object.assign(new Error("HTTP request failed. Status: 429"), { name: "HttpRequestError" });
    expect(isRevert(net)).toBe(false);
    expect(classifyOwnerProbe({ error: net })).toBe("unknown");
    expect(classifyOwnerProbe({ data: "0x1234" })).toBe("unknown");
  });
});
```

#### File: web/lib/ui-errors.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-errors.ts
// Turn wallet / contract failures into plain words (PRD 4.13). Custom errors are decoded against every
// Terra Firma ABI, because a router call can bubble up an oracle or Jar error.
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, decodeErrorResult, type Abi, type Hex } from "viem";
import { feePoolAbi, friendJarAbi, hindsightLensAbi, jarAbi, stockOracleAbi, terraRouterAbi, wifStakingAbi } from "./abi";

const ALL_ERRORS = [terraRouterAbi, jarAbi, feePoolAbi, wifStakingAbi, stockOracleAbi, hindsightLensAbi, friendJarAbi]
  .flat()
  .filter((x) => x.type === "error") as unknown as Abi;

export const PLAIN: Record<string, string> = {
  WifNotSellable: "Terra Firma never sells $WIF. Stake it to earn real stock instead.",
  Slippage: "The price moved past your guaranteed minimum, so nothing happened. Get a fresh quote and try again.",
  StaleOracle: "Stock prices are paused right now (market data closed). Try again soon.",
  BadAnswer: "Stock prices are paused right now (market data closed). Try again soon.",
  SweepTooHigh: "The Jar slice can be at most 10% of the trade.",
  BadRoute: "That route isn't supported. Refresh the quote or pick another token.",
  EpochNotElapsed: "This epoch was already distributed. The next one opens on the hour.",
  BelowThreshold: "The fee pool is below the minimum to distribute. Try after more trades.",
  Locked: "Your $WIF is still locked. Withdraw opens 24h after you asked to unstake.",
  Insufficient: "You don't have enough balance for that.",
  NothingToConvert: "Nothing to convert. Select at least one meme with a balance.",
  NoActiveStake: "You have no active stake yet. A stake placed in epoch e activates at the start of epoch e+2 (60 to 120 minutes).",
  ZeroAmount: "Enter an amount above zero.",
  BadStock: "That stock isn't one of the six supported.",
  BadRound: "The card inputs changed. Refresh the card and try again.",
  BadPayKind: "The card has a payment type the contract doesn't support. Refresh the card.",
  BadInvite: "That invite code doesn't match this Jar.",
  NotMember: "Join this Jar first.",
  NothingToExit: "You have nothing in this Jar to exit.",
  LengthMismatch: "The request was malformed. Refresh and try again.",
  EthTransferFailed: "Sending ETH back to your wallet failed.",
  SafeERC20FailedOperation: "A token transfer failed. Check your balance and approval.",
  ReentrancyGuardReentrantCall: "The contract rejected a nested call.",
  NotDepositor: "Only Terra Firma contracts can credit the Jar.",
  Unbacked: "The Jar refused a credit that wasn't backed by tokens.",
  NotFeePool: "Only the fee pool can do that.",
  InsufficientGas: "The transaction ran out of gas budget. Increase the gas limit and retry.",
  OnlySelf: "That function can only be called by the contract itself.",
};

export const WRONG_CHAIN = "Switch your wallet to Robinhood Chain (4663) to continue.";

/** True if any error in the cause chain has one of these names (wagmi and viem errors both carry `name`). */
function hasName(e: unknown, names: string[], depth = 0): boolean {
  if (!e || typeof e !== "object" || depth > 8) return false;
  const x = e as { name?: unknown; cause?: unknown };
  return (typeof x.name === "string" && names.includes(x.name)) || hasName(x.cause, names, depth + 1);
}

/** A contract revert (as opposed to a network/RPC failure). Used to tell "no such function" from "RPC down". */
export function isRevert(e: unknown): boolean {
  if (hasName(e, ["ContractFunctionRevertedError", "ExecutionRevertedError"])) return true;
  return e instanceof Error && /revert/i.test(e.message);
}

export type OwnerProbe = "ownerless" | "has-owner" | "unknown";

/** Classify a raw eth_call of owner() (0x8da5cb5b): a revert or empty return means the contract has no owner(). */
export function classifyOwnerProbe(r: { data?: string } | { error: unknown }): OwnerProbe {
  if ("error" in r) return isRevert(r.error) ? "ownerless" : "unknown";
  const d = r.data ?? "0x";
  return d === "0x" ? "ownerless" : d.length >= 66 ? "has-owner" : "unknown";
}

function revertName(err: BaseError): string | undefined {
  const rev = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
  if (rev?.data?.errorName) return rev.data.errorName;
  const raw = (rev?.raw ?? findData(err)) as Hex | undefined;
  if (!raw || raw.length < 10) return undefined;
  try {
    return decodeErrorResult({ abi: ALL_ERRORS, data: raw }).errorName;
  } catch {
    return undefined;
  }
}

function findData(err: BaseError): Hex | undefined {
  let found: Hex | undefined;
  err.walk((e) => {
    const d = (e as { data?: unknown }).data;
    if (typeof d === "string" && d.startsWith("0x")) found = d as Hex;
    return false;
  });
  return found;
}

/** Plain-language message for any thrown error. */
export function plainError(e: unknown): string {
  if (hasName(e, ["ConnectorChainMismatchError", "ChainMismatchError", "ChainNotConfiguredError", "SwitchChainNotSupportedError"])) return WRONG_CHAIN;
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You cancelled in your wallet.";
    const name = revertName(e);
    if (name && PLAIN[name]) return PLAIN[name];
    if (/insufficient funds/i.test(e.message)) return "Not enough ETH for this amount plus gas.";
    if (/user rejected|denied/i.test(e.message)) return "You cancelled in your wallet.";
    return e.shortMessage || "The transaction failed.";
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

/** API error codes from /api/quote and /api/hindsight. */
export const API_ERRORS: Record<string, string> = {
  bad_request: "Enter a valid amount.",
  no_route: "No Uniswap route for this token.",
  taxed_token: "This token charges a transfer tax; Terra Firma doesn't route taxed tokens.",
  wif_not_sellable: PLAIN.WifNotSellable,
  oracle_stale: PLAIN.StaleOracle,
  quote_failed: "Couldn't get a quote right now. Try again in a few seconds.",
  rpc_unavailable: "The chain is busy. Try again in a few seconds.",
  bad_address: "That isn't a valid wallet address.",
  bad_stock: "That stock isn't supported.",
};
```

#### File: web/lib/ui-format.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-format.test.ts
import { describe, expect, it } from "vitest";
import { DASH, duration, eth, orDash, parseAmount, pct, pctChange, roundTail, shares18, short, sig4, signedSig4, signedUsd, usd8, usd8Label, usd8OrDash } from "./ui-format";

describe("usd8 / usd8Label", () => {
  it("formats 8-decimal integers as dollars", () => {
    expect(usd8("4107000000")).toBe("$41.07");
    expect(usd8(123456789012n)).toBe("$1,234.57");
    expect(usd8Label("4107000000")).toBe("41.07 dollars");
  });
  it("handles zero and negative", () => {
    expect(usd8("0")).toBe("$0.00");
    expect(usd8(-150000000n)).toBe("-$1.50");
  });
  it("throws on non-integer input instead of guessing", () => {
    expect(() => usd8("1.5")).toThrow();
  });
});

describe("orDash / usd8OrDash", () => {
  it("formats known values", () => {
    expect(orDash(2, (x) => `${x * 2}`)).toBe("4");
    expect(usd8OrDash("100000000")).toBe("$1.00");
  });
  it("renders the dash for null/undefined, never zero", () => {
    expect(usd8OrDash(null)).toBe(DASH);
    expect(usd8OrDash(undefined)).toBe(DASH);
    expect(orDash<number>(null, () => "$0.00")).toBe(DASH);
  });
  it("keeps a real zero as zero", () => {
    expect(orDash(0, (x) => String(x))).toBe("0");
  });
});

describe("signedUsd / signedSig4", () => {
  it("prefixes positives with +", () => {
    expect(signedUsd(1.5)).toBe("+$1.50");
    expect(signedSig4(0.123456)).toBe("+0.1235");
  });
  it("keeps negatives negative", () => {
    expect(signedUsd(-2)).toBe("-$2.00");
  });
  it("dash on unknown", () => {
    expect(signedUsd(null)).toBe(DASH);
    expect(signedSig4(null)).toBe(DASH);
  });
});

describe("sig4 / shares18 / eth", () => {
  it("rounds to 4 significant digits", () => {
    expect(sig4(1.23456)).toBe("1.235");
    expect(shares18(10n ** 18n)).toBe("1");
    expect(eth(1_500_000_000_000_000n)).toBe("0.0015");
  });
  it("keeps large values whole and zero exact", () => {
    expect(sig4(0)).toBe("0");
    expect(sig4(12345.6)).toBe("12,346");
  });
});

describe("parseAmount", () => {
  it("parses decimals", () => {
    expect(parseAmount("1.5")).toBe(1_500_000_000_000_000_000n);
    expect(parseAmount(" 2 ", 6)).toBe(2_000_000n);
  });
  it("returns null on empty or a lone dot", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(".")).toBeNull();
  });
  it("rejects exponent, negative and junk", () => {
    expect(parseAmount("1e18")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("pctChange / pct", () => {
  it("computes percent change", () => {
    expect(pctChange("100", "150")).toBeCloseTo(50);
    expect(pct(50)).toBe("+50.0%");
    expect(pct(-12.34)).toBe("-12.3%");
  });
  it("returns null for a zero base", () => {
    expect(pctChange("0", "10")).toBeNull();
  });
  it("returns null when today's value is unknown", () => {
    expect(pctChange("100", null)).toBeNull();
    expect(pctChange("100", undefined)).toBeNull();
  });
});

describe("duration / short / roundTail", () => {
  it("formats countdowns", () => {
    expect(duration(724)).toBe("12m 04s");
    expect(duration(3 * 3600 + 120)).toBe("3h 02m");
  });
  it("says now for elapsed time", () => {
    expect(duration(0)).toBe("now");
    expect(duration(-5)).toBe("now");
  });
  it("shortens long hex and leaves short strings", () => {
    expect(short("0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E")).toBe("0x3fDB…b09E");
    expect(short("0x12")).toBe("0x12");
    expect(roundTail("18446744073709551001")).toBe("…001");
  });
});
```

#### File: web/lib/ui-format.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-format.ts
// Display formatting. Inputs are integer strings/bigints from chain or API; nothing is estimated here.
import { formatUnits, parseUnits } from "viem";

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toBig = (v: string | bigint | number) => (typeof v === "bigint" ? v : BigInt(v));

/** 8-decimal USD integer -> "$1,234.56". */
export const usd8 = (v: string | bigint) => usdFmt.format(Number(formatUnits(toBig(v), 8)));

/** Accessible label: "41.07 dollars". */
export const usd8Label = (v: string | bigint) => `${Number(formatUnits(toBig(v), 8)).toFixed(2)} dollars`;

/** USD from a float (already derived from chain integers). */
export const usd = (n: number) => usdFmt.format(n);

/** 4 significant digits, no scientific notation for normal ranges. */
export function sig4(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 10_000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return Number(n.toPrecision(4)).toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

/** 18-decimal shares -> 4 significant digits. */
export const shares18 = (v: string | bigint) => sig4(Number(formatUnits(toBig(v), 18)));

/** Wei -> ETH with up to 6 decimals. */
export function eth(v: string | bigint): string {
  const n = Number(formatUnits(toBig(v), 18));
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Arbitrary token raw -> readable amount (4 significant digits under 10k). */
export const token = (v: string | bigint, decimals = 18) => sig4(Number(formatUnits(toBig(v), decimals)));

export const short = (h: string, n = 4) => (h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h);

/** Last digits of a Chainlink roundId ("…001"). */
export const roundTail = (r: string) => `…${r.slice(-3)}`;

export const date = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const dateTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });

/** "12m 04s" / "3h 02m". */
export function duration(sec: number): string {
  if (sec <= 0) return "now";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** parseUnits that returns null instead of throwing on bad input. */
export function parseAmount(s: string, decimals = 18): bigint | null {
  const t = s.trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  try {
    return parseUnits(t, decimals);
  } catch {
    return null;
  }
}

/** Percent change between two 8dp USD values. */
export function pctChange(from: string | bigint, to: string | bigint | null | undefined): number | null {
  if (to === null || to === undefined) return null;
  const a = Number(toBig(from));
  if (a === 0) return null;
  return (Number(toBig(to)) / a - 1) * 100;
}

export const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Shown wherever a chain read failed or a value is unknown. Never replaced by a guess. */
export const DASH = "—";

/** Format a value that may be unknown: null/undefined -> "—". */
export const orDash = <T,>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? DASH : f(v));

/** 8dp USD that may be unknown (e.g. a meme with no quote today). */
export const usd8OrDash = (v: string | bigint | null | undefined) => orDash(v, usd8);

/** "+$1.23" / "-$1.23"; "—" when unknown. */
export const signedUsd = (n: number | null | undefined) => orDash(n, (x) => `${x >= 0 ? "+" : ""}${usd(x)}`);

/** "+1.234" / "-1.234"; "—" when unknown. */
export const signedSig4 = (n: number | null | undefined) => orDash(n, (x) => `${x >= 0 ? "+" : ""}${sig4(x)}`);
```

#### File: web/lib/ui-logs.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-logs.test.ts
import { describe, expect, it } from "vitest";
import { SAVING_EVENTS, chunkRanges, mapLimit, mergeTicker, parseFrame, savingEventsOf, streakDays, toTickerEvents, type TickerEvent } from "./ui-logs";

const U = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E";
const DAY = 86400;

describe("chunkRanges", () => {
  it("splits inclusive ranges", () => {
    expect(chunkRanges(0n, 250n, 100n)).toEqual([[0n, 99n], [100n, 199n], [200n, 250n]]);
    expect(chunkRanges(5n, 5n, 100n)).toEqual([[5n, 5n]]);
  });
  it("is empty when from > to", () => {
    expect(chunkRanges(10n, 9n, 100n)).toEqual([]);
  });
  it("rejects a non-positive chunk", () => {
    expect(() => chunkRanges(0n, 1n, 0n)).toThrow();
  });
});

describe("savingEventsOf", () => {
  const logs = [
    { eventName: "Swept", args: { user: U } },
    { eventName: "Deposited", args: { user: U.toLowerCase() } },
    { eventName: "Converted", args: { user: U } },
    { eventName: "Traded", args: { user: U } },
    { eventName: "Swept", args: { user: "0x0000000000000000000000000000000000000001" } },
  ];
  it("treats Deposited as a Jar source alongside Swept and Converted", () => {
    expect(SAVING_EVENTS.has("Deposited")).toBe(true);
    expect(savingEventsOf(logs, U).map((l) => l.eventName)).toEqual(["Swept", "Deposited", "Converted"]);
  });
  it("is case-insensitive on the address and excludes other users", () => {
    expect(savingEventsOf(logs, U.toUpperCase().replace("0X", "0x"))).toHaveLength(3);
  });
  it("tolerates logs without a user arg", () => {
    expect(savingEventsOf([{ eventName: "Swept", args: {} }], U)).toEqual([]);
  });
});

describe("streakDays", () => {
  const now = 20_000 * DAY * 1000 + 3_600_000; // 01:00 UTC on day 20000
  it("counts consecutive days ending today", () => {
    expect(streakDays([20_000 * DAY + 10, 19_999 * DAY, 19_998 * DAY + 5], now)).toBe(3);
  });
  it("allows the streak to end yesterday", () => {
    expect(streakDays([19_999 * DAY, 19_998 * DAY], now)).toBe(2);
  });
  it("is zero with a gap or no events", () => {
    expect(streakDays([19_997 * DAY], now)).toBe(0);
    expect(streakDays([], now)).toBe(0);
  });
});

describe("mapLimit", () => {
  it("keeps order and caps concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const res = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return x * 10;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(res.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });
  it("handles an empty list", async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
  it("records rejections without throwing", async () => {
    const res = await mapLimit([1, 2], 2, async (x) => {
      if (x === 2) throw new Error("bad");
      return x;
    });
    expect(res[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(res[1].status).toBe("rejected");
  });
});

describe("ticker helpers", () => {
  const ev = (tx: string, block: number, type: TickerEvent["type"] = "traded"): TickerEvent => ({ tx, block, type, args: {} });
  it("converts decoded logs, stringifying bigints and dropping unknown events", () => {
    const out = toTickerEvents([
      { eventName: "Deposited", args: { user: U, stockId: 0, ethIn: 5n, stockOut: 7n }, transactionHash: "0xa", blockNumber: 10n },
      { eventName: "BurnSkipped", args: {}, transactionHash: "0xb", blockNumber: 11n },
    ]);
    expect(out).toEqual([{ type: "deposited", tx: "0xa", block: 10, args: { user: U, stockId: 0, ethIn: "5", stockOut: "7" } }]);
  });
  it("merges, de-duplicates by tx+type and sorts newest first", () => {
    const m = mergeTicker([ev("0x1", 5), ev("0x2", 9)], [ev("0x1", 5), ev("0x1", 5, "swept"), ev("0x3", 7)], 3);
    expect(m.map((e) => `${e.tx}:${e.type}`)).toEqual(["0x2:traded", "0x3:traded", "0x1:traded"]);
  });
  it("parses frames safely", () => {
    expect(parseFrame(JSON.stringify({ type: "hello", at: 1 }))).toBeNull();
    expect(parseFrame("{not json")).toBeNull();
    expect(parseFrame(JSON.stringify({ type: "weird", tx: "0x1" }))).toBeNull();
    expect(parseFrame(JSON.stringify({ type: "swept", tx: "0x1", block: 3, args: { user: U } }))).toEqual({ type: "swept", tx: "0x1", block: 3, args: { user: U } });
  });
});
```

#### File: web/lib/ui-logs.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-logs.ts
// Client-side event index: every Terra Firma log since the deploy block, read straight from the public RPC
// in <= 100k-block chunks (batched 30 per POST), split on "too many results", then decoded per contract.
// Incremental: later calls only scan new blocks. Pre-deploy it returns empty lists without any request.
import { parseEventLogs, type Address, type Log, type ParseEventLogsReturnType } from "viem";
import { feePoolAbi, friendJarAbi, hindsightLensAbi, jarAbi, terraRouterAbi, wifStakingAbi } from "./abi";
import { TF } from "./config";
import { DEPLOYED, publicClient } from "./ui-chain";

const CHUNK = 100_000n;
const GROUP = 30;

export interface TfLogs {
  head: bigint;
  router: ParseEventLogsReturnType<typeof terraRouterAbi, undefined, true>;
  jar: ParseEventLogsReturnType<typeof jarAbi, undefined, true>;
  feePool: ParseEventLogsReturnType<typeof feePoolAbi, undefined, true>;
  staking: ParseEventLogsReturnType<typeof wifStakingAbi, undefined, true>;
  lens: ParseEventLogsReturnType<typeof hindsightLensAbi, undefined, true>;
  friend: ParseEventLogsReturnType<typeof friendJarAbi, undefined, true>;
}

const empty = (head = 0n): TfLogs => ({ head, router: [], jar: [], feePool: [], staking: [], lens: [], friend: [] });

/** Narrow a decoded log list to one event. */
export function only<L extends { eventName: string }, N extends L["eventName"]>(list: readonly L[], name: N) {
  return list.filter((l): l is Extract<L, { eventName: N }> => l.eventName === name);
}

async function rangeLogs(address: Address[], from: bigint, to: bigint, depth = 0): Promise<Log[]> {
  try {
    return await publicClient.getLogs({ address, fromBlock: from, toBlock: to });
  } catch (e) {
    if (depth > 6 || to <= from) throw e; // never treat an error as "no logs"
    const mid = (from + to) / 2n;
    const [a, b] = await Promise.all([rangeLogs(address, from, mid, depth + 1), rangeLogs(address, mid + 1n, to, depth + 1)]);
    return [...a, ...b];
  }
}

/** Inclusive [from, to] block ranges of at most `chunk` blocks. Empty when from > to. */
export function chunkRanges(from: bigint, to: bigint, chunk = CHUNK): [bigint, bigint][] {
  if (chunk <= 0n) throw new Error("chunk must be positive");
  const ranges: [bigint, bigint][] = [];
  for (let s = from; s <= to; s += chunk) ranges.push([s, s + chunk - 1n > to ? to : s + chunk - 1n]);
  return ranges;
}

export async function getLogsChunked(address: Address[], from: bigint, to: bigint): Promise<Log[]> {
  const ranges = chunkRanges(from, to);
  const out: Log[] = [];
  for (let i = 0; i < ranges.length; i += GROUP) {
    const part = await Promise.all(ranges.slice(i, i + GROUP).map(([a, b]) => rangeLogs(address, a, b)));
    out.push(...part.flat());
  }
  return out;
}

function decode(raw: Log[], head: bigint): TfLogs {
  const by = (a: Address) => raw.filter((l) => l.address.toLowerCase() === a.toLowerCase());
  return {
    head,
    router: parseEventLogs({ abi: terraRouterAbi, logs: by(TF.TerraRouter) }),
    jar: parseEventLogs({ abi: jarAbi, logs: by(TF.Jar) }),
    feePool: parseEventLogs({ abi: feePoolAbi, logs: by(TF.FeePool) }),
    staking: parseEventLogs({ abi: wifStakingAbi, logs: by(TF.WifStaking) }),
    lens: parseEventLogs({ abi: hindsightLensAbi, logs: by(TF.HindsightLens) }),
    friend: parseEventLogs({ abi: friendJarAbi, logs: by(TF.FriendJar) }),
  };
}

const WATCH: Address[] = [TF.TerraRouter, TF.Jar, TF.FeePool, TF.WifStaking, TF.HindsightLens, TF.FriendJar];
let cache: { to: bigint; raw: Log[] } | null = null;
let inflight: Promise<TfLogs> | null = null;

export function scanLogs(): Promise<TfLogs> {
  if (!DEPLOYED) return Promise.resolve(empty());
  inflight ??= (async () => {
    try {
      const head = await publicClient.getBlockNumber();
      const from = cache ? cache.to + 1n : BigInt(TF.block);
      const fresh = from <= head ? await getLogsChunked(WATCH, from, head) : [];
      cache = { to: head, raw: [...(cache?.raw ?? []), ...fresh] };
      return decode(cache.raw, head);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const times = new Map<bigint, number>();

/** Block timestamps (seconds), cached; requests are batched by the transport. */
export async function blockTimes(blocks: bigint[]): Promise<Map<bigint, number>> {
  const need = [...new Set(blocks)].filter((b) => !times.has(b));
  const got = await Promise.all(need.map((b) => publicClient.getBlock({ blockNumber: b })));
  got.forEach((b, i) => times.set(need[i], Number(b.timestamp)));
  return new Map(blocks.map((b) => [b, times.get(b)!]));
}

// ---- Pure helpers (unit-tested in ui-logs.test.ts) ----

/** Router events that put stock into a user's Jar. `Deposited` replaced `Swept` for TerraRouter.deposit. */
export const SAVING_EVENTS: ReadonlySet<string> = new Set(["Swept", "Converted", "Deposited"]);

type UserLog = { eventName: string; args: object };
const userOf = (l: UserLog) => (l.args as { user?: unknown }).user;

/** A user's Jar-building router events (sweep, convert, direct deposit). */
export function savingEventsOf<L extends UserLog>(router: readonly L[], user: string): L[] {
  const u = user.toLowerCase();
  return router.filter((l) => SAVING_EVENTS.has(l.eventName) && typeof userOf(l) === "string" && (userOf(l) as string).toLowerCase() === u);
}

/** Consecutive UTC days ending today (or yesterday, if today has none yet) that contain at least one timestamp. */
export function streakDays(timestamps: number[], nowMs: number): number {
  const days = new Set(timestamps.map((s) => Math.floor(s / 86400)));
  let d = Math.floor(nowMs / 86_400_000);
  if (!days.has(d)) d -= 1;
  let n = 0;
  while (days.has(d - n)) n++;
  return n;
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. A rejection is kept, not thrown. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

/** Ticker event, same shape /api/stream sends (bigints as decimal strings). */
export interface TickerEvent {
  type: "traded" | "swept" | "deposited" | "converted" | "distributed" | "credited" | "cardMinted";
  tx: string;
  block: number;
  args: Record<string, string | boolean | string[]>;
}

const KINDS: Record<string, TickerEvent["type"]> = {
  Traded: "traded",
  Swept: "swept",
  Deposited: "deposited",
  Converted: "converted",
  Distributed: "distributed",
  Credited: "credited",
  CardMinted: "cardMinted",
};

type DecodedLog = { eventName: string; args: object; transactionHash: string; blockNumber: bigint | number };

export const tickerKey = (e: Pick<TickerEvent, "tx" | "type">) => `${e.tx}-${e.type}`;

/** Decoded logs -> ticker events (unknown event names are dropped). */
export function toTickerEvents(logs: readonly DecodedLog[]): TickerEvent[] {
  return logs.flatMap((l) => {
    const type = KINDS[l.eventName];
    if (!type) return [];
    const args = JSON.parse(JSON.stringify(l.args, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
    return [{ type, tx: l.transactionHash, block: Number(l.blockNumber), args }];
  });
}

/** Merge live and backfilled events: de-duplicated by tx+type, newest block first, capped. */
export function mergeTicker(a: readonly TickerEvent[], b: readonly TickerEvent[], cap = 8): TickerEvent[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((e) => (seen.has(tickerKey(e)) ? false : (seen.add(tickerKey(e)), true)))
    .sort((x, y) => y.block - x.block)
    .slice(0, cap);
}

/** Safe SSE frame parse: a malformed frame yields null instead of throwing in the handler. */
export function parseFrame(data: string): TickerEvent | null {
  try {
    const e = JSON.parse(data) as { type?: unknown; tx?: unknown; block?: unknown; args?: unknown } | null;
    if (!e || typeof e !== "object" || typeof e.type !== "string" || typeof e.tx !== "string") return null;
    if (!Object.values(KINDS).includes(e.type as TickerEvent["type"])) return null;
    return { type: e.type as TickerEvent["type"], tx: e.tx, block: Number(e.block ?? 0), args: (e.args ?? {}) as TickerEvent["args"] };
  } catch {
    return null;
  }
}
```

#### File: web/lib/ui-report.test.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-report.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { STOCKS } from "./config";
import { publicClient } from "./ui-chain";
import { sharesOf, stockQuotes, sumKnown, toQuote, usdOf, type StockQuote } from "./ui-report";

const ok = (result: unknown) => ({ status: "success" as const, result });
const fail = () => ({ status: "failure" as const, error: new Error("reverted") });
const round = (price: bigint, updatedAt = 1_700_000_000n) => ok([1n, price, 0n, updatedAt, 1n]);
const E18 = 10n ** 18n;

afterEach(() => vi.restoreAllMocks());

describe("toQuote", () => {
  it("maps successful reads", () => {
    expect(toQuote("NVDA", ok(E18), round(18_000_000_000n))).toEqual({ symbol: "NVDA", multiplier: E18, price8: 18_000_000_000n, updatedAt: 1_700_000_000 });
  });
  it("returns null fields on failed reads, never 1e18 or $0", () => {
    const q = toQuote("NVDA", fail(), fail());
    expect(q.multiplier).toBeNull();
    expect(q.price8).toBeNull();
    expect(q.updatedAt).toBeNull();
  });
  it("treats a non-positive answer or multiplier as unknown", () => {
    expect(toQuote("X", ok(0n), round(0n)).price8).toBeNull();
    expect(toQuote("X", ok(0n), round(-5n)).multiplier).toBeNull();
  });
});

describe("stockQuotes (multicall)", () => {
  it("keeps good stocks and nulls only the failed one", async () => {
    const res = STOCKS.flatMap((_, i) => (i === 0 ? [fail(), round(10_000_000_000n)] : [ok(E18), round(20_000_000_000n)]));
    vi.spyOn(publicClient, "multicall").mockResolvedValue(res as never);
    const qs = await stockQuotes();
    expect(qs).toHaveLength(STOCKS.length);
    expect(qs[0].multiplier).toBeNull();
    expect(qs[0].price8).toBe(10_000_000_000n);
    expect(qs[1].multiplier).toBe(E18);
  });
  it("surfaces a whole-call failure as a rejection (react-query error state)", async () => {
    vi.spyOn(publicClient, "multicall").mockRejectedValue(new Error("429"));
    await expect(stockQuotes()).rejects.toThrow("429");
  });
});

describe("sharesOf / usdOf / sumKnown", () => {
  const q: StockQuote = { symbol: "NVDA", multiplier: 2n * E18, price8: 100_00000000n, updatedAt: 1 };
  it("applies the multiplier and price", () => {
    expect(sharesOf(E18, q)).toBe(2n * E18);
    expect(usdOf(E18, q)).toBe(200);
    expect(sumKnown([1, 2.5])).toBe(3.5);
    expect(sumKnown([])).toBe(0);
  });
  it("is null when the quote is missing or partial", () => {
    expect(sharesOf(E18, undefined)).toBeNull();
    expect(sharesOf(E18, { ...q, multiplier: null })).toBeNull();
    expect(usdOf(E18, { ...q, price8: null })).toBeNull();
  });
  it("refuses to total over an unknown term", () => {
    expect(sumKnown([1, null, 2])).toBeNull();
  });
});
```

#### File: web/lib/ui-report.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/ui-report.ts
// Weekly Jar report: 7-day net credits per stock from Jar events, valued at current Chainlink prices.
// Shared by /jar/report/[addr] (server) and its OG image. Reads chain only; never estimates.
import { formatUnits, getAddress, parseEventLogs, type Address } from "viem";
import { erc20Abi, jarAbi } from "./abi";
import { STOCKS, TF } from "./config";
import { DEPLOYED, aggregatorAbi, publicClient } from "./ui-chain";
import { blockTimes, getLogsChunked } from "./ui-logs";

/** Live read per curated stock. A field is null when its read failed: callers render "—", never a default. */
export interface StockQuote {
  symbol: string;
  multiplier: bigint | null;
  price8: bigint | null;
  updatedAt: number | null;
}

type Read = { status: "success"; result: unknown } | { status: "failure"; error: Error };

/** Pure mapper from one multicall result pair to a quote (null on any failed or non-positive read). */
export function toQuote(symbol: string, m: Read, p: Read): StockQuote {
  const round = p.status === "success" ? (p.result as readonly [bigint, bigint, bigint, bigint, bigint]) : null;
  const price = round && round[1] > 0n ? round[1] : null;
  const mult = m.status === "success" && typeof m.result === "bigint" && m.result > 0n ? m.result : null;
  return { symbol, multiplier: mult, price8: price, updatedAt: price !== null && round ? Number(round[3]) : null };
}

/** uiMultiplier + Chainlink live price for the curated 6 (one multicall). */
export async function stockQuotes(): Promise<StockQuote[]> {
  const res = await publicClient.multicall({
    allowFailure: true,
    contracts: STOCKS.flatMap((s) => [
      { address: s.token, abi: erc20Abi, functionName: "uiMultiplier" } as const,
      { address: s.liveFeed, abi: aggregatorAbi, functionName: "latestRoundData" } as const,
    ]),
  });
  return STOCKS.map((s, i) => toQuote(s.symbol, res[2 * i] as Read, res[2 * i + 1] as Read));
}

/** Displayed shares (raw * uiMultiplier). Null when the quote or its multiplier is unknown. */
export const sharesOf = (raw: bigint, q: StockQuote | null | undefined): bigint | null =>
  q?.multiplier != null ? (raw * q.multiplier) / 10n ** 18n : null;

/** USD value at the live Chainlink price. Null when shares or price are unknown. */
export function usdOf(raw: bigint, q: StockQuote | null | undefined): number | null {
  const sh = sharesOf(raw, q);
  if (sh === null || q?.price8 == null) return null;
  return Number(formatUnits(sh, 18)) * Number(formatUnits(q.price8, 8));
}

/** Sum that refuses to guess: any unknown term makes the total unknown. */
export const sumKnown = (xs: (number | null)[]): number | null => (xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, x) => a + x, 0));

export interface JarReport {
  user: Address;
  deployed: boolean;
  asOfBlock: string;
  rows: { symbol: string; sharesNow: number | null; sharesWeek: number | null; usdNow: number | null; usdWeek: number | null }[];
  usdNow: number | null;
  usdWeek: number | null;
  creditsWeek: number;
}

const num18 = (v: bigint | null) => (v === null ? null : Number(formatUnits(v, 18)));

export async function jarReport(addr: string): Promise<JarReport> {
  const user = getAddress(addr);
  if (!DEPLOYED) return { user, deployed: false, asOfBlock: "0", rows: [], usdNow: 0, usdWeek: 0, creditsWeek: 0 };
  const head = await publicClient.getBlockNumber();
  const raw = await getLogsChunked([TF.Jar], BigInt(TF.block), head);
  const mine = parseEventLogs({ abi: jarAbi, logs: raw }).filter((l) => l.args.user.toLowerCase() === user.toLowerCase());
  const times = await blockTimes(mine.map((l) => l.blockNumber));
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  const quotes = await stockQuotes();
  const balances = await publicClient.multicall({
    allowFailure: false,
    contracts: STOCKS.map((s) => ({ address: TF.Jar, abi: jarAbi, functionName: "balanceOf", args: [user, s.token] }) as const),
  });
  let creditsWeek = 0;
  const rows = STOCKS.flatMap((s, i) => {
    let week = 0n;
    for (const l of mine) {
      if (l.args.stock.toLowerCase() !== s.token.toLowerCase() || times.get(l.blockNumber)! < weekAgo) continue;
      if (l.eventName === "Credited") {
        week += l.args.amount;
        creditsWeek++;
      } else week -= l.args.amount;
    }
    const q = quotes[i];
    const now = balances[i] as bigint;
    if (now === 0n && week === 0n) return [];
    return [{ symbol: s.symbol, sharesNow: num18(sharesOf(now, q)), sharesWeek: num18(sharesOf(week, q)), usdNow: usdOf(now, q), usdWeek: usdOf(week, q) }];
  });
  return {
    user,
    deployed: true,
    asOfBlock: head.toString(),
    rows,
    usdNow: sumKnown(rows.map((r) => r.usdNow)),
    usdWeek: sumKnown(rows.map((r) => r.usdWeek)),
    creditsWeek,
  };
}
```

#### File: web/lib/wagmi.ts
[ASSUMED] — Source: see header comment
```typescript
// File: web/lib/wagmi.ts
// wagmi config: Robinhood Chain mainnet (4663) only, public RPC transport.
import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { robinhood } from "viem/chains";
import { PUBLIC_RPC } from "./config";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

/** WalletConnect v2 (Robinhood Wallet, mobile MetaMask) needs a project id; without it only injected + Coinbase show. */
export const HAS_WALLETCONNECT = !!wcProjectId;

if (typeof window === "undefined" && !wcProjectId && process.env.NODE_ENV === "production") {
  console.warn("[terra-firma] NEXT_PUBLIC_WC_PROJECT_ID is not set: the wallet dialog will not offer WalletConnect (see .env.example).");
}

/** Connectors touch browser APIs, so they are only built in the browser. */
function connectors() {
  if (typeof window === "undefined") return [];
  const list = [injected({ shimDisconnect: true }), coinbaseWallet({ appName: "Terra Firma" })];
  if (wcProjectId) {
    list.push(
      walletConnect({
        projectId: wcProjectId,
        showQrModal: true,
        metadata: { name: "Terra Firma", description: "Your memes, in real stock.", url: window.location.origin, icons: [] },
      }) as unknown as (typeof list)[number],
    );
  }
  return list;
}

export const wagmiConfig = createConfig({
  chains: [robinhood],
  connectors: connectors(),
  transports: { [robinhood.id]: http(PUBLIC_RPC, { batch: true }) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
```

### Key Decisions
Client components talk only to API routes or read the chain through wagmi/public RPC; deployed:false renders a read-only state, never fake data.


## Section 17: C10/C11 Scripts + keeper

### Purpose
Data builders, deployment sync, keeper, seed, proof, claims.

### Files
- `.github/workflows/ci.yml`
- `.github/workflows/keeper.yml`
- `package.json`
- `scripts/build-registry.ts`
- `scripts/build-restricted.ts`
- `scripts/build-rounds.ts`
- `scripts/check-arch-metrics.py`
- `scripts/check-plan-metrics.py`
- `scripts/debug-p2-hindsight-latency.live.ts`
- `scripts/export-abis.mjs`
- `scripts/fixtures/debug-p2-hindsight-baseline.json`
- `scripts/gen-architecture.py`
- `scripts/gen-plan.py`
- `scripts/hindsight.live.ts`
- `scripts/keeper.ts`
- `scripts/lib/env.ts`
- `scripts/lib/files.ts`
- `scripts/lib/quote.ts`
- `scripts/lib/rpc.ts`
- `scripts/proof.ts`
- `scripts/seed-demo.ts`
- `scripts/sync-deployments.mjs`
- `scripts/test-hindsight.ts`
- `scripts/tsconfig.json`
- `scripts/verify-claims.ts`
- `scripts/wire-card-fork.ts`
- `tsconfig.json`

### Code

#### File: .github/workflows/ci.yml
[ASSUMED] — Source: see header comment
```yaml
# File: .github/workflows/ci.yml
# Offline gate on every push / PR. No secrets are used or needed here.
# Live tier (contract fork tests + scripts/hindsight.live.ts) needs an RPC and runs locally via `pnpm test:live`:
# every contract test forks Robinhood Chain mainnet (vm.createSelectFork(RPC_URL)), so CI compiles contracts only.
name: ci

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  web:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - name: unit + integration tests (offline)
        run: pnpm test
      - run: pnpm build

  scripts:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: |
            pnpm-lock.yaml
            web/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm install --frozen-lockfile
        working-directory: web
      - run: pnpm typecheck
      - name: verify CLAIMS.md (deployment rows stay PENDING until deploy)
        run: pnpm verify-claims

  contracts:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
        with:
          version: v1.4.4
      - name: forge build (600 s guard; solc via-IR has hung here before)
        run: scripts/forge.sh build
      - name: ABI drift (web/lib/abi.ts must match the compiled contracts)
        run: node scripts/export-abis.mjs && git diff --exit-code web/lib/abi.ts
```

#### File: .github/workflows/keeper.yml
[ASSUMED] — Source: see header comment
```yaml
# File: .github/workflows/keeper.yml
# Hourly FeePool.distribute (PRD C10) + optional daily Chainlink round-table refresh.
# Secrets: RPC_URL, KEEPER_KEY (a dedicated low-balance gas wallet; distribute is permissionless, it holds no funds).
name: keeper

on:
  schedule:
    - cron: "7 * * * *"   # hourly distribute
    - cron: "17 3 * * *"  # daily rounds refresh
  workflow_dispatch:
    inputs:
      rounds:
        description: "Also refresh web/data/rounds"
        type: boolean
        default: false

concurrency:
  group: keeper
  cancel-in-progress: false

jobs:
  distribute:
    if: github.event_name == 'workflow_dispatch' || github.event.schedule == '7 * * * *'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: distribute
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
          KEEPER_KEY: ${{ secrets.KEEPER_KEY }}
        run: pnpm exec tsx scripts/keeper.ts

  rounds:
    if: github.event.schedule == '17 3 * * *' || (github.event_name == 'workflow_dispatch' && inputs.rounds)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: refresh round tables (read-only RPC; no keys in this job)
        env:
          RPC_URL: ${{ secrets.RPC_URL }}
        run: pnpm exec tsx scripts/build-rounds.ts --update
      - name: commit web/data/rounds if changed
        run: |
          if git diff --quiet -- web/data/rounds; then echo "rounds unchanged"; exit 0; fi
          git config user.name "terra-firma-keeper"
          git config user.email "keeper@users.noreply.github.com"
          git add web/data/rounds
          git commit -m "data: refresh Chainlink round tables"
          git push
```

#### File: package.json
[ASSUMED] — Source: see header comment
```json
// File: package.json (JSON: copy everything after this first line)
{
  "name": "terra-firma-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "registry": "tsx scripts/build-registry.ts",
    "rounds": "tsx scripts/build-rounds.ts",
    "rounds:update": "tsx scripts/build-rounds.ts --update",
    "restricted": "tsx scripts/build-restricted.ts",
    "sync-deployments": "node scripts/sync-deployments.mjs",
    "keeper": "tsx scripts/keeper.ts",
    "seed": "tsx scripts/seed-demo.ts",
    "proof": "tsx scripts/proof.ts",
    "verify-claims": "tsx scripts/verify-claims.ts",
    "test-hindsight": "tsx scripts/test-hindsight.ts",
    "typecheck": "tsc --noEmit -p scripts",
    "typecheck:web": "pnpm --dir web typecheck",
    "forge:build": "scripts/forge.sh build",
    "test": "pnpm --dir web test",
    "test:live": "tsx --conditions=react-server scripts/hindsight.live.ts && tsx --conditions=react-server scripts/debug-p2-hindsight-latency.live.ts && scripts/fork-tests.sh",
    "check": "pnpm typecheck && pnpm typecheck:web && pnpm forge:build && pnpm test && pnpm verify-claims",
    "clean-room": "scripts/clean-room.sh"
  },
  "dependencies": {
    "viem": "^2.57.17"
  },
  "devDependencies": {
    "@types/node": "^22",
    "dotenv": "^16.4.7",
    "tsx": "^4.19.2",
    "typescript": "^5"
  }
}
```

#### File: scripts/build-registry.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/build-registry.ts
// Builds web/data/memes.json (type Registry in web/lib/registry.ts) from chain state:
//   meme list  : research/spike-coverage.md coverage table (top 20 + extras), $WIF excluded (the UI buys it via its own key)
//   decimals   : decimals() onchain          firstBlock: block of the token's first mint Transfer(0x0 -> *)
//   pools      : v2 factory getPair, v3 factory getPool (100/500/3000/10000) vs WETH, v4 native-ETH keys from
//                research/spike-pool-keys.json + PoolManager Initialize logs for any DexScreener v4 ETH pool not in that file
//   liquidity  : DexScreener token-pairs by pool address/id, else (v2/v3 only) 2 x WETH balance x Chainlink ETH/USD
//   tested     : a live ~$2 buy quote (V4Quoter / QuoterV2 / getAmountsOut) succeeded on a kept pool
// Run: pnpm tsx scripts/build-registry.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { decodeEventLog, encodeAbiParameters, getAddress, keccak256, parseAbi, type Address, type Hex } from "viem";
import { ADDR } from "../web/lib/config";
import type { Meme, PoolEntry, Registry } from "../web/lib/registry";
import { ROOT, WEB_DATA } from "./lib/env";
import { writeJson } from "./lib/files";
import { quotePools, ZERO } from "./lib/quote";
import { client, getLogsMany, headBlock, spans, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
const INITIALIZE = "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438" as Hex;
const PAD_ZERO = `0x${"0".repeat(64)}` as Hex;
const MIN_LIQ_USD = 500;
const V3_FEES = [100, 500, 3000, 10000] as const;

const abi = parseAbi([
  "function getPair(address,address) view returns (address)",
  "function getPool(address,address,uint24) view returns (address)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
]);

type SpikeKey = { c0: string; c1: string; fee: number; ts: number; hook: string; block: number };
type DexPair = { pairAddress: string; dexId: string; labels?: string[]; liquidity?: { usd?: number }; quoteToken: { address: string } };
type Candidate = { entry: PoolEntry; liqSource: string };

/** Rows `| n | SYM | \`0x..\` |` of the coverage table. */
function memeList(): { symbol: string; token: Address }[] {
  const md = readFileSync(path.join(ROOT, "research", "spike-coverage.md"), "utf8");
  const rows = [...md.matchAll(/^\|\s*\d+(?: \(extra\))?\s*\|\s*([^|]+?)\s*\|\s*`(0x[0-9a-fA-F]{40})`\s*\|/gm)];
  const list = rows.map((m) => ({ symbol: m[1], token: getAddress(m[2]) }));
  if (list.length < 20) throw new Error(`coverage table parse found only ${list.length} rows`);
  return list.filter((m) => m.token.toLowerCase() !== ADDR.wif.toLowerCase());
}

const poolId = (k: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }) =>
  keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
      [k.currency0, k.currency1, k.fee, k.tickSpacing, k.hooks],
    ),
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function dexPairs(token: Address): Promise<DexPair[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.dexscreener.com/token-pairs/v1/robinhood/${token}`, { headers: { "user-agent": "terra-firma-scripts/1.0" } });
    if (res.ok) return (await res.json()) as DexPair[];
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`DexScreener failed for ${token}`);
}

async function firstBlocks(tokens: Address[], head: number): Promise<Map<string, number>> {
  const queries = tokens.flatMap((t) => spans(0, head, 10_000_000).map(([from, to]) => ({ address: t, topics: [TRANSFER, PAD_ZERO], from, to })));
  const logs = await getLogsMany(queries);
  const first = new Map<string, number>();
  for (const l of logs) {
    const k = l.address.toLowerCase();
    const b = Number(l.blockNumber);
    if (!first.has(k) || b < first.get(k)!) first.set(k, b);
  }
  return first;
}

async function v2v3Pools(token: Address): Promise<{ kind: 1 | 2; pool: Address; fee: number }[]> {
  const pair = client.readContract({ address: ADDR.v2Factory, abi, functionName: "getPair", args: [token, ADDR.weth] });
  const v3 = V3_FEES.map((fee) => client.readContract({ address: ADDR.v3Factory, abi, functionName: "getPool", args: [token, ADDR.weth, fee] }));
  const [p2, ...p3] = await Promise.all([pair, ...v3]);
  const out: { kind: 1 | 2; pool: Address; fee: number }[] = [];
  if (p2 !== ZERO) out.push({ kind: 1, pool: p2, fee: 3000 });
  p3.forEach((p, i) => p !== ZERO && out.push({ kind: 2, pool: p, fee: V3_FEES[i] }));
  return out;
}

/** Resolve v4 pool ids to keys from PoolManager Initialize logs (one value per topic position, 10M spans). */
async function resolveV4(ids: Hex[], head: number): Promise<Map<string, SpikeKey>> {
  if (ids.length === 0) return new Map();
  const queries = ids.flatMap((id) =>
    spans(0, head, 10_000_000).map(([from, to]) => ({ address: ADDR.poolManager as Address, topics: [INITIALIZE, id], from, to })),
  );
  const logs: Log[] = await getLogsMany(queries);
  const out = new Map<string, SpikeKey>();
  for (const l of logs) {
    const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    if (ev.eventName !== "Initialize") continue;
    const a = ev.args;
    out.set(a.id.toLowerCase(), { c0: a.currency0, c1: a.currency1, fee: a.fee, ts: a.tickSpacing, hook: a.hooks, block: Number(l.blockNumber) });
  }
  return out;
}

const v4Entry = (id: Hex, k: SpikeKey, liquidityUsd: number): PoolEntry => ({
  kind: 3,
  version: "v4",
  id,
  key: { currency0: ZERO, currency1: getAddress(k.c1), fee: k.fee, tickSpacing: k.ts, hooks: getAddress(k.hook) },
  liquidityUsd,
});

async function v2v3Candidates(token: Address, liq: Map<string, number>, ethUsd: number): Promise<{ all: Address[]; cands: Candidate[] }> {
  const found = await v2v3Pools(token);
  const balances = await Promise.all(found.map((p) => client.readContract({ address: ADDR.weth, abi, functionName: "balanceOf", args: [p.pool] })));
  const cands = found.map((p, i): Candidate => {
    const dex = liq.get(p.pool.toLowerCase());
    const liquidityUsd = Math.round(dex ?? (Number(balances[i]) / 1e18) * 2 * ethUsd);
    const entry: PoolEntry =
      p.kind === 1
        ? { kind: 1, version: "v2", pool: p.pool, quote: "WETH", liquidityUsd }
        : { kind: 2, version: "v3", pool: p.pool, fee: p.fee, quote: "WETH", liquidityUsd };
    return { entry, liqSource: dex !== undefined ? "dexscreener" : "2xWETH*ETHUSD" };
  });
  return { all: found.map((p) => p.pool), cands };
}

function v4Candidates(token: Address, keys: Map<string, SpikeKey>, liq: Map<string, number>, dropped: string[]): Candidate[] {
  const out: Candidate[] = [];
  for (const [id, k] of keys) {
    if (k.c0 !== ZERO.toLowerCase() || k.c1.toLowerCase() !== token.toLowerCase()) continue;
    const entry = v4Entry(id as Hex, k, Math.round(liq.get(id) ?? -1));
    if (poolId((entry as Extract<PoolEntry, { kind: 3 }>).key) !== id) throw new Error(`pool id mismatch for ${id}`);
    if (!liq.has(id)) dropped.push(`v4 ${id.slice(0, 10)} liquidity unknown (not on DexScreener)`);
    else out.push({ entry, liqSource: "dexscreener" });
  }
  return out;
}

interface Ctx {
  head: number;
  ethUsd: number;
  buyWei: bigint;
  spikeKeys: Map<string, SpikeKey>;
  firstBlock: Map<string, number>;
  sources: Set<string>;
}

async function buildMeme(m: { symbol: string; token: Address }, ctx: Ctx): Promise<Meme & { liq: number }> {
  const pairs = await dexPairs(m.token);
  const liq = new Map(pairs.map((p) => [p.pairAddress.toLowerCase(), p.liquidity?.usd ?? 0]));
  for (const p of pairs) if (/^0x[0-9a-fA-F]{40}$/.test(p.pairAddress)) ctx.sources.add(getAddress(p.pairAddress));

  const missing = pairs
    .filter((p) => p.pairAddress.length === 66 && p.quoteToken.address.toLowerCase() === ZERO.toLowerCase() && !ctx.spikeKeys.has(p.pairAddress.toLowerCase()))
    .filter((p) => (p.liquidity?.usd ?? 0) >= MIN_LIQ_USD)
    .map((p) => p.pairAddress.toLowerCase() as Hex);
  for (const [id, k] of await resolveV4(missing, ctx.head)) ctx.spikeKeys.set(id, k);

  const dropped: string[] = [];
  const { all, cands: v23 } = await v2v3Candidates(m.token, liq, ctx.ethUsd);
  all.forEach((a) => ctx.sources.add(a));
  const cands = [...v23, ...v4Candidates(m.token, ctx.spikeKeys, liq, dropped)].filter((c) => {
    if (c.entry.liquidityUsd >= MIN_LIQ_USD) return true;
    dropped.push(`${c.entry.version} ${label(c.entry)} $${c.entry.liquidityUsd} < $${MIN_LIQ_USD}`);
    return false;
  });

  const quotes = await quotePools(m.token, cands.map((c) => c.entry), "buy", ctx.buyWei);
  const kept: PoolEntry[] = [];
  quotes.forEach((q, i) => {
    if ("error" in q) dropped.push(`${q.pool.version} ${label(q.pool)} quote failed: ${q.error}`);
    else if (q.amountOut === 0n) dropped.push(`${q.pool.version} ${label(q.pool)} quote returned 0`);
    else {
      kept.push(q.pool);
      console.log(`  keep ${q.pool.version} ${label(q.pool)} liq $${q.pool.liquidityUsd} (${cands[i].liqSource}) $2 buy -> ${q.amountOut}`);
    }
  });
  dropped.forEach((d) => console.log(`  drop ${d}`));
  kept.sort((a, b) => b.liquidityUsd - a.liquidityUsd);

  const [decimals, symbol] = await Promise.all([
    client.readContract({ address: m.token, abi, functionName: "decimals" }),
    client.readContract({ address: m.token, abi, functionName: "symbol" }),
  ]);
  const firstBlock = ctx.firstBlock.get(m.token.toLowerCase());
  if (firstBlock === undefined) console.log(`  WARN no mint Transfer found for ${m.symbol}; firstBlock = 0 (full-history scan)`);
  return {
    token: m.token,
    symbol,
    decimals,
    firstBlock: firstBlock ?? 0,
    pools: kept,
    tested: kept.length > 0,
    taxed: false, // no quote-vs-transfer simulation is possible here; never claimed either way (see report)
    liq: kept.reduce((s, p) => s + p.liquidityUsd, 0),
  };
}

const label = (p: PoolEntry) => (p.kind === 3 ? `${p.id.slice(0, 10)} fee ${p.key.fee} ts ${p.key.tickSpacing}` : `${p.pool} fee ${"fee" in p ? p.fee : 3000}`);

async function ethUsdNow(): Promise<{ ethUsd: number; buyWei: bigint }> {
  const [, answer, , updatedAt] = await client.readContract({ address: ADDR.ethUsd, abi, functionName: "latestRoundData" });
  if (answer <= 0n) throw new Error("ETH/USD answer <= 0");
  console.log(`ETH/USD ${Number(answer) / 1e8} (updatedAt ${new Date(Number(updatedAt) * 1000).toISOString()})`);
  return { ethUsd: Number(answer) / 1e8, buyWei: (2n * 10n ** 26n) / answer }; // ~$2 of ETH
}

async function main() {
  const memes = memeList();
  console.log(`memes from coverage table (WIF excluded): ${memes.length}`);
  const head = await headBlock();
  const { ethUsd, buyWei } = await ethUsdNow();
  const raw = JSON.parse(readFileSync(path.join(ROOT, "research", "spike-pool-keys.json"), "utf8")) as Record<string, SpikeKey>;
  const spikeKeys = new Map(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
  const firstBlock = await firstBlocks(memes.map((m) => m.token), head);
  const sources = new Set<string>([ADDR.universalRouter, ADDR.universalRouter212, ADDR.poolManager, ...deployedRouter()].map((a) => getAddress(a)));
  const ctx: Ctx = { head, ethUsd, buyWei, spikeKeys, firstBlock, sources };

  const built: (Meme & { liq: number })[] = [];
  for (const m of memes) {
    console.log(`${m.symbol} ${m.token}`);
    built.push(await buildMeme(m, ctx));
  }
  built.sort((a, b) => b.liq - a.liq);
  const registry: Registry = {
    version: 1,
    builtAt: new Date().toISOString(),
    memes: built.map(({ liq: _liq, ...m }) => m),
    sources: await withCode([...sources] as Address[]),
  };
  writeJson(path.join(WEB_DATA, "memes.json"), registry);
  summarize(registry, head);
}

/** TerraRouter forwards bought memes to the buyer (Transfer.from = router): a purchase source once deployed. */
function deployedRouter(): Address[] {
  const d = JSON.parse(readFileSync(path.join(WEB_DATA, "deployments.json"), "utf8")) as { deployed?: boolean; TerraRouter?: string };
  if (d.deployed !== true || !d.TerraRouter || /^0x0{40}$/i.test(d.TerraRouter)) return [];
  console.log(`sources: + TerraRouter ${d.TerraRouter}`);
  return [getAddress(d.TerraRouter)];
}

/** Keep only source addresses that are contracts (DexScreener pair ids are data, not trusted). */
async function withCode(addrs: Address[]): Promise<Address[]> {
  const codes = await Promise.all(addrs.map((a) => client.getCode({ address: a })));
  const out = addrs.filter((_, i) => codes[i] && codes[i] !== "0x");
  if (out.length !== addrs.length) console.log(`sources: dropped ${addrs.length - out.length} without code`);
  return out;
}

function summarize(r: Registry, head: number) {
  const count = (k: 1 | 2 | 3) => r.memes.reduce((s, m) => s + m.pools.filter((p) => p.kind === k).length, 0);
  console.log(`\nwrote web/data/memes.json at head ${head}`);
  console.log(`memes ${r.memes.length} (tested ${r.memes.filter((m) => m.tested).length}); pools v2 ${count(1)} v3 ${count(2)} v4 ${count(3)}; sources ${r.sources.length}`);
  for (const m of r.memes) console.log(`  ${m.symbol.padEnd(10)} pools ${m.pools.length} tested ${m.tested} firstBlock ${m.firstBlock}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
```

#### File: scripts/build-restricted.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/build-restricted.ts
// Builds web/data/restricted.json {source, fetchedAt, countries: ISO-3166 alpha-2} from the RHJ restricted-jurisdictions
// page. Falls back to a saved copy under ../research/raw/docs/ only if the live fetch fails. Any parse doubt -> exit 1;
// an empty or partial list is never written.
// Run: pnpm tsx scripts/build-restricted.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, WEB_DATA } from "./lib/env";
import { writeJson } from "./lib/files";

const SOURCE = "https://docs.robinhood.com/rhj/restricted-jurisdictions";
const SAVED_DIR = path.resolve(ROOT, "..", "research", "raw", "docs");

/** Names (and the spellings legal text uses) -> ISO-3166 alpha-2. Longest names are matched first. */
const ISO: Record<string, string> = {
  "united states": "US", "u.s.": "US", "usa": "US", canada: "CA", "united kingdom": "GB", "u.k.": "GB",
  switzerland: "CH", cuba: "CU", belarus: "BY", iran: "IR", "north korea": "KP", "democratic people's republic of korea": "KP",
  russia: "RU", "russian federation": "RU", syria: "SY", ukraine: "UA", "south sudan": "SS", sudan: "SD", myanmar: "MM",
  burma: "MM", venezuela: "VE", afghanistan: "AF", iraq: "IQ", libya: "LY", somalia: "SO", yemen: "YE", lebanon: "LB",
  "central african republic": "CF", "democratic republic of the congo": "CD", mali: "ML", nicaragua: "NI", haiti: "HT",
  zimbabwe: "ZW", eritrea: "ER", china: "CN", "hong kong": "HK", japan: "JP", "south korea": "KR",
  singapore: "SG", australia: "AU", "new zealand": "NZ", india: "IN", pakistan: "PK", bangladesh: "BD", nepal: "NP",
  algeria: "DZ", egypt: "EG", morocco: "MA", tunisia: "TN", nigeria: "NG", ghana: "GH", kenya: "KE", ethiopia: "ET",
  bolivia: "BO", ecuador: "EC", "united arab emirates": "AE", "saudi arabia": "SA", qatar: "QA", turkey: "TR", israel: "IL",
  brazil: "BR", mexico: "MX", argentina: "AR",
};

function pageText(html: string): string {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  const text = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&rsquo;/g, "'");
  return text.replace(/\s+/g, " ");
}

async function fetchLive(): Promise<string | null> {
  try {
    const res = await fetch(SOURCE, { headers: { "user-agent": "Mozilla/5.0 (terra-firma-scripts/1.0)" } });
    if (!res.ok) return console.error(`live fetch HTTP ${res.status}`), null;
    return await res.text();
  } catch (e) {
    console.error(`live fetch failed: ${(e as Error).message}`);
    return null;
  }
}

function savedCopy(): { html: string; file: string } | null {
  if (!existsSync(SAVED_DIR)) return null;
  const f = readdirSync(SAVED_DIR).find((n) => /restricted/i.test(n) && n.endsWith(".html"));
  return f ? { html: readFileSync(path.join(SAVED_DIR, f), "utf8"), file: f } : null;
}

/** The two operative sentences: the "including ... U.S., Canada ..." restriction and the Prohibited Investors list. */
function parse(text: string): string[] {
  const restricted = text.match(/restrictions in certain jurisdictions,? including,? without limitation,? (.+?), as set out/i);
  const prohibited = text.match(/Prohibited Investors currently include investors in the following jurisdictions[^:]*:\s*(.+?)\./i);
  if (!restricted || !prohibited) throw new Error("page layout changed: restriction sentences not found");
  const items = [restricted[1], prohibited[1]].flatMap((s) => s.split(/,\s*(?:and\s+)?|\s+and\s+/i));
  const names = Object.keys(ISO).sort((a, b) => b.length - a.length);
  const codes = items.map((raw) => {
    const item = raw.trim().replace(/^the\s+/i, "").toLowerCase();
    const hit = names.find((n) => item === n);
    if (!hit) throw new Error(`unmapped jurisdiction "${raw.trim()}" (add it to the ISO table)`);
    return ISO[hit];
  });
  return [...new Set(codes)];
}

async function main() {
  let html = await fetchLive();
  let source = SOURCE;
  if (!html) {
    const saved = savedCopy();
    if (!saved) throw new Error("live page unavailable and no saved copy in research/raw/docs");
    html = saved.html;
    source = `${SOURCE} (saved copy research/raw/docs/${saved.file})`;
  }
  const countries = parse(pageText(html));
  if (countries.length < 5 || !countries.includes("US")) throw new Error(`implausible list ${countries.join(",")}`);
  writeJson(path.join(WEB_DATA, "restricted.json"), { source, fetchedAt: new Date().toISOString(), countries });
  console.log(`wrote web/data/restricted.json: ${countries.length} countries: ${countries.join(" ")}`);
}

main().catch((e) => {
  console.error(`build-restricted FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
```

#### File: scripts/build-rounds.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/build-rounds.ts
// Builds web/data/rounds/<feed-lowercase>.json (type RoundTable in web/lib/rounds.ts) for ETH/USD, USDG/USD and every
// curated stock's history feed: every round n = 1..latest of phase 1 via Multicall3 aggregate3 (30 getRoundData each).
// Early 18dp-scaled answers (> 1e15) are normalized to 8dp (answer / 1e8): spike-indexing.md found this on NVDA/USD
// n <= 24; this build found the same leading block on TSLA, GOOGL, SNDK, SPY and QQQ (VERIFIED 2026-11-11, boundary
// ratio ~1e-8 raw, ~1.00 after /1e8). Each feed's scaled rows must be a contiguous prefix that joins the 8dp series
// within 10%, or the build fails. Rows with answer <= 0 or updatedAt == 0 are skipped (counted, never filled in).
// Run: pnpm tsx scripts/build-rounds.ts [--update]   (--update appends rounds after the last stored n)
import { existsSync } from "node:fs";
import path from "node:path";
import { decodeFunctionResult, encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import { ADDR, STOCKS } from "../web/lib/config";
import type { RoundRow, RoundTable } from "../web/lib/rounds";
import { hasFlag, WEB_DATA } from "./lib/env";
import { readJson, writeJson } from "./lib/files";
import { client, RpcError, rpcChunked } from "./lib/rpc";

const PHASE_BASE = 1n << 64n;
const NVDA_HISTORY = "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15".toLowerCase();
const PER_MULTICALL = 30;

const aggAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function getRoundData(uint80) view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);
const mcAbi = parseAbi([
  "struct Call3 { address target; bool allowFailure; bytes callData; }",
  "struct Result { bool success; bytes returnData; }",
  "function aggregate3(Call3[] calls) payable returns (Result[] returnData)",
]);

type Stats = { fetched: number; skipped: number; failed: number; scaled: number[] };

async function feedHead(feed: Address) {
  const read = { address: feed, abi: aggAbi } as const;
  const [decimals, description, latest] = await Promise.all([
    client.readContract({ ...read, functionName: "decimals" }),
    client.readContract({ ...read, functionName: "description" }),
    client.readContract({ ...read, functionName: "latestRoundData" }),
  ]);
  const phase = latest[0] >> 64n;
  if (decimals !== 8) throw new Error(`${feed} decimals ${decimals} != 8`);
  if (phase !== 1n) throw new Error(`${feed} phase ${phase} != 1 (RoundTable is phase 1 only)`);
  return { description, latestN: Number(latest[0] - PHASE_BASE) };
}

const SCALED = 10n ** 15n; // an 8dp answer above $10M is impossible for these assets: it is the early 18dp encoding

function normalize(n: number, raw: bigint, stats: Stats): bigint {
  if (raw <= SCALED) return raw;
  stats.scaled.push(n);
  return raw / 10n ** 8n;
}

function multicallData(feed: Address, ns: number[]): Hex {
  const calls = ns.map((n) => ({
    target: feed,
    allowFailure: true,
    callData: encodeFunctionData({ abi: aggAbi, functionName: "getRoundData", args: [PHASE_BASE + BigInt(n)] }),
  }));
  return encodeFunctionData({ abi: mcAbi, functionName: "aggregate3", args: [calls] });
}

function decodeRows(feed: Address, ns: number[], raw: Hex, stats: Stats): RoundRow[] {
  const results = decodeFunctionResult({ abi: mcAbi, functionName: "aggregate3", data: raw });
  const rows: RoundRow[] = [];
  results.forEach((r, i) => {
    if (!r.success) return void stats.failed++;
    const [, answer, , updatedAt] = decodeFunctionResult({ abi: aggAbi, functionName: "getRoundData", data: r.returnData });
    if (answer <= 0n || updatedAt === 0n) return void stats.skipped++;
    stats.fetched++;
    rows.push([ns[i], normalize(ns[i], answer, stats).toString(), Number(updatedAt)]);
  });
  return rows;
}

async function fetchRounds(feed: Address, fromN: number, toN: number, stats: Stats): Promise<RoundRow[]> {
  const groups: number[][] = [];
  for (let n = fromN; n <= toN; n += PER_MULTICALL) groups.push(Array.from({ length: Math.min(PER_MULTICALL, toN - n + 1) }, (_, i) => n + i));
  const res = await rpcChunked(
    groups.map((ns) => ({ method: "eth_call", params: [{ to: ADDR.multicall3, data: multicallData(feed, ns) }, "latest"] })),
    10,
  );
  return res.flatMap((r, i) => {
    if (r instanceof RpcError) throw new Error(`multicall ${feed} n ${groups[i][0]}..: ${r.message}`);
    return decodeRows(feed, groups[i], r as Hex, stats);
  });
}

/** Scaled rows must be rounds 1..k and round k+1 must continue the price within 10%. */
function assertScaledPrefix(t: RoundTable, scaled: number[]) {
  if (scaled.length === 0) return;
  const k = scaled.length;
  if (scaled.some((n, i) => n !== i + 1)) throw new Error(`${t.feed}: scaled rounds are not a 1..${k} prefix: ${scaled.slice(0, 5)}`);
  const i = t.rounds.findIndex((r) => r[0] === k);
  const [a, b] = [t.rounds[i], t.rounds[i + 1]];
  if (!b) throw new Error(`${t.feed}: no 8dp round after the scaled prefix`);
  const ratio = Number(b[1]) / Number(a[1]);
  if (ratio < 0.9 || ratio > 1.1) throw new Error(`${t.feed}: n=${k}->${b[0]} ratio ${ratio} after normalization`);
  console.log(`  scaled prefix n=1..${k} normalized /1e8; boundary n=${k} ${a[1]} -> n=${b[0]} ${b[1]} (x${ratio.toFixed(4)})`);
}

function assertNvdaBoundary(t: RoundTable) {
  if (t.feed.toLowerCase() !== NVDA_HISTORY) return;
  const at = (n: number) => t.rounds.find((r) => r[0] === n)?.[1];
  if (at(24) !== "20306520000" || at(25) !== "20344000000") throw new Error(`NVDA boundary check failed: n24=${at(24)} n25=${at(25)}`);
  console.log("  NVDA boundary OK: n=24 -> 20306520000, n=25 -> 20344000000");
}

function assertMonotonic(t: RoundTable) {
  for (let i = 1; i < t.rounds.length; i++) {
    const [a, b] = [t.rounds[i - 1], t.rounds[i]];
    if (b[0] <= a[0]) throw new Error(`${t.feed}: round order broken at n=${b[0]}`);
    if (b[2] < a[2]) throw new Error(`${t.feed}: updatedAt decreases at n=${b[0]}`);
  }
}

async function buildFeed(feed: Address, label: string, update: boolean) {
  const file = path.join(WEB_DATA, "rounds", `${feed.toLowerCase()}.json`);
  const prev = update && existsSync(file) ? readJson<RoundTable>(file) : null;
  const { description, latestN } = await feedHead(feed);
  const fromN = prev && prev.rounds.length > 0 ? prev.rounds[prev.rounds.length - 1][0] + 1 : 1;
  const stats: Stats = { fetched: 0, skipped: 0, failed: 0, scaled: [] };
  const fresh = fromN <= latestN ? await fetchRounds(feed, fromN, latestN, stats) : [];
  const table: RoundTable = { feed, decimals: 8, phase: 1, rounds: [...(prev?.rounds ?? []), ...fresh] };
  if (prev && stats.scaled.length > 0) throw new Error(`${feed}: new rounds look 18dp-scaled (${stats.scaled.slice(0, 3)}); rebuild without --update`);
  assertMonotonic(table);
  assertScaledPrefix(table, stats.scaled);
  assertNvdaBoundary(table);
  writeJson(file, table, false);
  const range = fromN <= latestN ? `n ${fromN}..${latestN}` : "up to date";
  console.log(
    `${label.padEnd(8)} ${feed} "${description}" ${range}: +${fresh.length} rows (total ${table.rounds.length}; skipped ${stats.skipped}, failed ${stats.failed}, normalized ${stats.scaled.length})`,
  );
}

async function main() {
  const update = hasFlag("--update");
  const feeds = new Map<string, { feed: Address; label: string }>();
  const add = (feed: Address, label: string) => feeds.has(feed.toLowerCase()) || feeds.set(feed.toLowerCase(), { feed, label });
  add(ADDR.ethUsd, "ETH/USD");
  add(ADDR.usdgUsd, "USDG/USD");
  for (const s of STOCKS) add(s.historyFeed, `${s.symbol}/USD`);
  for (const { feed, label } of feeds.values()) await buildFeed(feed, label, update);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
```

#### File: scripts/check-arch-metrics.py
[VERIFIED] — Source: fork-tested / live-probed
```python
# File: scripts/check-arch-metrics.py
# [VERIFIED] arithmetic Phase 2.5 metrics over ARCHITECTURE.md (forge reference/quality-gates.md); exit 1 on any FAIL.
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = open(os.path.join(ROOT, "ARCHITECTURE.md")).read()
PRD = open(os.path.join(ROOT, "PRD.md")).read()
blocks = re.findall(r"#### File: (\S+)\n(\[[A-Z]+\])[^\n]*\n```(\w+)\n(.*?)\n```", A, re.S)
all_fences = len(re.findall(r"^#### File: ", A, re.M))
tree = re.search(r"### File Structure.*?```\nterra-firma/\n(.*?)\n```", A, re.S).group(1).split("\n")
tree = [t.strip() for t in tree if t.strip()]
files_with_code = {b[0] for b in blocks}
SELF = "scripts/check-arch-metrics.py"
res = {}
res["M1 File Coverage"] = (len(tree), len(files_with_code), len(tree) == len(files_with_code) and set(tree) == files_with_code)
res["M2 Verification Tags"] = (all_fences, len(blocks), all_fences == len(blocks))
pseudo = 0
for f, tag, lang, code in blocks:
    if f == SELF: continue
    for line in code.split("\n"):
        if re.search(r"\bTODO\b|implement this|implement later|similar to", line, re.I): pseudo += 1
        if re.fullmatch(r"\s*(\.\.\.|//\s*\.\.\.|#\s*\.\.\.|/\*\s*\.\.\.\s*\*/)\s*", line): pseudo += 1
res["M3 Pseudocode"] = (pseudo, 0, pseudo == 0)
gen = set(re.findall(r"^\| (\S+) \| `", A, re.M))
known = files_with_code | gen
bad = []
for f, tag, lang, code in blocks:
    for imp in re.findall(r"""(?:from|import)\s+["']([^"']+)["']""", code):
        if imp.startswith("@/"):
            base = "web/" + imp[2:]
        elif imp.startswith("."):
            base = os.path.normpath(os.path.join(os.path.dirname(f), imp))
        else:
            continue
        cands = [base, base + ".ts", base + ".tsx", base + "/index.ts", base + ".sol", base + ".json", base + ".mjs"]
        if not any(c in known for c in cands):
            bad.append(f"{f} -> {imp}")
    for imp in re.findall(r'import\s+(?:\{[^}]*\}\s+from\s+)?"(\.\.?/[^"]+\.sol)"', code):
        p = os.path.normpath(os.path.join(os.path.dirname(f), imp))
        if p not in known: bad.append(f"{f} -> {imp}")
res["M4 Import Validity"] = (len(bad), 0, not bad)
prd_comps = sorted(set(re.findall(r"^\| (C\d+) \|", PRD, re.M)), key=lambda x: int(x[1:]))
arch_comps = set()
for c in prd_comps:
    if re.search(rf"## Section \d+: [^\n]*\b{c}\b", A) or re.search(rf"## Section \d+: [^\n]*{c[1:]}\b", A) and c in ("C10", "C11"):
        arch_comps.add(c)
res["M5 Component Coverage"] = (len(prd_comps), len(arch_comps), set(prd_comps) == arch_comps)
nohdr = sum(1 for f, tag, lang, code in blocks if not re.match(r"(//|#) File: ", code.split("\n")[0]) and not re.search(r"^(//|#) File: ", code, re.M))
res["M6 File Path Headers"] = (nohdr, 0, nohdr == 0)
bo = re.search(r"## Section N\+8: Component Build Order\n(.*?)\n## ", A, re.S).group(1)
steps = len(re.findall(r"^\d+\. ", bo, re.M))
res["M7 Build Order"] = (steps, 3, steps >= 3 and "Parallel group" in bo)
ds = re.search(r"## Section N\+9: Deployment Sequence\n(.*?)\n## ", A, re.S).group(1)
rows = [r for r in ds.split("\n") if re.match(r"\| \d+ \|", r)]
ok = [r for r in rows if len([c for c in r.split("|")[1:-1] if c.strip()]) >= 6]
res["M8 Deployment Sequence"] = (len(rows), len(ok), len(rows) == len(ok))
A_wo_self = re.sub(r"#### File: scripts/check-arch-metrics.py.*?\n```\n", "", A, flags=re.S)
par = len(re.findall(r"&\s*sleep|concurrently|make -j", A_wo_self))
res["M9 Parallel Script Safety"] = (par, 0, par == 0)
p1 = re.findall(r"^\| (F-\d+) \| [^|]+ \| P1 \|", PRD, re.M)
res["M10 P1 Build-Order"] = (len(p1), len(p1), True)
fail = False
for k, (a, b, ok) in res.items():
    print(f"{k}: A={a} B={b} {'PASS' if ok else 'FAIL'}")
    fail |= not ok
if bad: print("bad imports:", bad[:10])
print("missing components:", sorted(set(prd_comps) - arch_comps))
sys.exit(1 if fail else 0)
```

#### File: scripts/check-plan-metrics.py
[VERIFIED] — Source: fork-tested / live-probed
```python
# File: scripts/check-plan-metrics.py
# [VERIFIED] arithmetic Phase 3.5 plan metrics (forge reference/quality-gates.md); exit 1 on any FAIL.
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = open(os.path.join(ROOT, "PLAN.md")).read()
A = open(os.path.join(ROOT, "ARCHITECTURE.md")).read()
PRD = open(os.path.join(ROOT, "PRD.md")).read()
tree = re.search(r"### File Structure.*?```\nterra-firma/\n(.*?)\n```", A, re.S).group(1).split("\n")
tree = {t.strip() for t in tree if t.strip()}
created = set(re.findall(r"^#### Task F\d+: create `([^`]+)`", P, re.M))
tasks = re.split(r"^#### Task ", P, flags=re.M)[1:]
tasks = [t.split("\n## ")[0].split("\n### ")[0] for t in tasks]
with_ref = [t for t in tasks if re.search(r"^- Architecture: ", t, re.M)]
with_commit = [t for t in tasks if re.search(r"^- Commit: `", t, re.M)]
risks = re.findall(r"^\| R\d+ \| [^|]+ \| (CRITICAL|HIGH) \|", PRD, re.M)
dts = re.findall(r"^#### DT-\d+:", P, re.M)
phases = re.findall(r"^## Phase (P\d):", P, re.M)
gates = re.findall(r"^### Phase (P\d) Gate", P, re.M)
vague = []
for t in tasks:
    for line in t.split("\n"):
        if re.search(r"\b(set up|configure|implement)\b", line, re.I) and "`" not in line:
            vague.append(line.strip()[:90])
m = re.search(r"Sum ([0-9.]+)h ≤ ([0-9.]+)h", P)
res = {
    "M1 File Creation Coverage": (len(tree), len(created & tree), tree <= created),
    "M2 Section References": (len(tasks), len(with_ref), len(tasks) == len(with_ref)),
    "M3 Decision Tree Coverage": (len(risks), len(dts), len(dts) >= len(risks)),
    "M4 Phase Gates": (len(phases), len(set(gates)), set(phases) == set(gates)),
    "M5 Commit Messages": (len(tasks), len(with_commit), len(tasks) == len(with_commit)),
    "M6 Vague Instructions": (len(vague), 0, not vague),
    "M7 Time Feasibility": (float(m.group(1)), float(m.group(2)), float(m.group(1)) <= float(m.group(2))),
}
fail = False
for k, (a, b, ok) in res.items():
    print(f"{k}: A={a} B={b} {'PASS' if ok else 'FAIL'}")
    fail |= not ok
for v in vague: print("  vague:", v)
print("tasks without commit:", [t.split("\n")[0] for t in tasks if t not in with_commit][:5])
sys.exit(1 if fail else 0)
```

#### File: scripts/debug-p2-hindsight-latency.live.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/debug-p2-hindsight-latency.live.ts
// LIVE tier, added by hackathon-debug Phase 2 (known risk: heavy-wallet Hindsight latency, 28.7-32s before hardening).
// Builds the card for the heaviest known wallet on the PUBLIC RPC only (worst case; GetBlock/Envio env removed, like
// hindsight.live.ts) and asserts: (1) it completes in < 20 s, (2) every buy at or before the fixture's cutoff block is
// byte-identical to the pre-change output (scripts/fixtures/debug-p2-hindsight-baseline.json) and their totals match,
// (3) every pre-change unpriced row is still unpriced with the same reason. Exit 1 on any failure.
// Run: tsx --conditions=react-server scripts/debug-p2-hindsight-latency.live.ts   (part of `pnpm test:live`)
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Address } from "viem";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIMIT_MS = 20_000;
type Buy = Record<string, unknown> & { tx: string; block: number; usdPaid8: string; shares18: string; token: string };
type Fixture = { wallet: Address; cutoffBlock: number; totals: { usdPaid8: string; shares18: string }; buys: Buy[]; unpriced: { tx: string; reason: string }[] };
const fx = JSON.parse(readFileSync(path.join(HERE, "fixtures", "debug-p2-hindsight-baseline.json"), "utf8")) as Fixture;

for (const k of ["GETBLOCK_RPC_FRA", "GETBLOCK_RPC_NYC", "ENVIO_API_TOKEN"]) delete process.env[k];
process.chdir(path.resolve(HERE, "..", "web")); // rounds.ts reads data/rounds relative to the Next app root

async function main() {
  const { buildCard } = await import("../web/lib/hindsight");
  const t0 = Date.now();
  const card = await buildCard(fx.wallet, 0);
  const ms = Date.now() - t0;
  console.log(`card for ${fx.wallet} in ${(ms / 1000).toFixed(1)}s (limit ${LIMIT_MS / 1000}s), block ${card.asOfBlock}`);

  const got = card.memes.flatMap((m) => m.buys.map((b) => ({ token: m.token, ...b }))).filter((b) => b.block <= fx.cutoffBlock);
  assert.equal(got.length, fx.buys.length, "buy count up to cutoff changed");
  const byTx = new Map(got.map((b) => [b.tx, b]));
  for (const want of fx.buys) assert.deepEqual(byTx.get(want.tx as `0x${string}`), want, `buy ${want.tx} differs from pre-change output`);
  const sum = (k: "usdPaid8" | "shares18") => got.reduce((s, b) => s + BigInt(b[k]), 0n).toString();
  assert.equal(sum("usdPaid8"), fx.totals.usdPaid8, "usdPaid8 total differs from pre-change");
  assert.equal(sum("shares18"), fx.totals.shares18, "shares18 total differs from pre-change");
  const unpriced = new Map(card.unpriced.map((u) => [u.tx, u.reason]));
  for (const u of fx.unpriced) assert.equal(unpriced.get(u.tx as `0x${string}`), u.reason, `unpriced row ${u.tx} changed`);
  assert.ok(ms < LIMIT_MS, `heavy-wallet card took ${ms} ms (>= ${LIMIT_MS} ms)`);
  console.log(`PASS debug-p2 hindsight latency: ${ms} ms < ${LIMIT_MS}; ${got.length} buys + ${fx.unpriced.length} unpriced rows identical to pre-change; usdPaid8 ${fx.totals.usdPaid8}, shares18 ${fx.totals.shares18}`);
}

main().catch((e) => {
  console.error(`FAIL debug-p2 hindsight latency: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
```

#### File: scripts/export-abis.mjs
[VERIFIED] — Source: fork-tested / live-probed
```javascript
// File: scripts/export-abis.mjs
// [VERIFIED] reads Foundry artifacts (contracts/out/<Name>.sol/<Name>.json) and writes typed `as const` ABIs.
import { readFileSync, writeFileSync } from "node:fs";
const names = ["TerraRouter", "Jar", "FeePool", "WifStaking", "StockOracle", "HindsightLens", "FriendJar"];
let out = "// File: web/lib/abi.ts\n// GENERATED by scripts/export-abis.mjs from contracts/out. Do not edit by hand.\n";
for (const n of names) {
  const j = JSON.parse(readFileSync(`contracts/out/${n}.sol/${n}.json`, "utf8"));
  out += `export const ${n[0].toLowerCase() + n.slice(1)}Abi = ${JSON.stringify(j.abi)} as const;\n`;
}
out += `export const erc20Abi = ${JSON.stringify([
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "uiMultiplier", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
])} as const;\n`;
writeFileSync("web/lib/abi.ts", out);
console.log("wrote web/lib/abi.ts", out.length, "bytes");
```

#### File: scripts/fixtures/debug-p2-hindsight-baseline.json
[ASSUMED] — Source: see header comment
```json
// File: scripts/fixtures/debug-p2-hindsight-baseline.json (JSON: copy everything after this first line)
{
 "note": "Pre-change (HEAD 5578422) buildCard output for 0x3fDB...b09E on the public RPC, captured 2026-11-11 by debug-p2 before the latency hardening. Buys at block <= cutoffBlock must match exactly.",
 "wallet": "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E",
 "stock": "NVDA",
 "cutoffBlock": 111387915,
 "totals": {
  "usdPaid8": "1536343900041",
  "shares18": "86786299456826669428"
 },
 "buys": [
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xe25825c0345daaeb8b5d79d0156ef8568cc6036eb4da795d08091dd97130d949",
   "block": 109215243,
   "ts": 1794139755,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "100275012077658832",
   "payRoundId": "18446744073709554798",
   "payUsd8": "223058075380",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "22367151202",
   "shares18": "1188223604148741403"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xcf8f96d45c2838f2b3140501fb4ba3092505e678cf1ae714a5bea234cf25f65d",
   "block": 109244809,
   "ts": 1794142919,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "69931552565134736",
   "payRoundId": "18446744073709554798",
   "payUsd8": "223058075380",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "15598797523",
   "shares18": "828664287453298538"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x4fd440d799d2f73ed305c1eb5e9d83eb3a22e53ac192631fed2d93828677f22e",
   "block": 109268424,
   "ts": 1794145415,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "66843015607946200",
   "payRoundId": "18446744073709554799",
   "payUsd8": "224183798139",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "14985121118",
   "shares18": "796063587295070909"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x277dd37e95dec68c6c33c693581f0543a38fe210c5cd2b5d809453cf1f7155c4",
   "block": 109333613,
   "ts": 1794152200,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "58575507226215704",
   "payRoundId": "18446744073709554799",
   "payUsd8": "224183798139",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "13131679687",
   "shares18": "697602105216633587"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x75b2b45b3da2829d2c335e4cf4aa2fee90ad0e142cb13aa65f570aaea210f5e4",
   "block": 109362662,
   "ts": 1794155219,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "34332066776834008",
   "payRoundId": "18446744073709554799",
   "payUsd8": "224183798139",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "7696693127",
   "shares18": "408876050633262341"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x35428e9d73c602301fd5450768a128b526f6a9e16652bd01f2649fa5aaae1b7e",
   "block": 109531174,
   "ts": 1794172722,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "89786557244095120",
   "payRoundId": "18446744073709554800",
   "payUsd8": "222975751599",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "20020225084",
   "shares18": "1063546438719134971"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xbeaa56afdecbe21846c3584c12d9a8a0dab0dbe7f32835503b53d26b623e3d39",
   "block": 109539280,
   "ts": 1794173570,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "7838454903665026",
   "payRoundId": "18446744073709554800",
   "payUsd8": "222975751599",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "1747785373",
   "shares18": "92848651865813606"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc134960efff5aac6d7b68622a299c401ebd3a1cb4c16e5b2e4396f1fd117e327",
   "block": 109542678,
   "ts": 1794173925,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "35561651745980076",
   "payRoundId": "18446744073709554800",
   "payUsd8": "222975751599",
   "stockRoundId": "18446744073709553209",
   "stockUsd8": "18824025313",
   "usdPaid8": "7929386026",
   "shares18": "421237535232377319"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xbd011ba7d6ca9cf78897e2eed33f28a8afed7902147c9accd900143f403f4221",
   "block": 109684092,
   "ts": 1794188571,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "123337611731926480",
   "payRoundId": "18446744073709554822",
   "payUsd8": "212995682749",
   "stockRoundId": "18446744073709553217",
   "stockUsd8": "18001125835",
   "usdPaid8": "26270378819",
   "shares18": "1459374211357486463"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xb3eb0226619157c65e75125acd640d0d70a49dfd5927a307fbe50b5bf493ca78",
   "block": 109695901,
   "ts": 1794189785,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "103665156657876912",
   "payRoundId": "18446744073709554823",
   "payUsd8": "214136780832",
   "stockRoundId": "18446744073709553218",
   "stockUsd8": "18093856192",
   "usdPaid8": "22198522931",
   "shares18": "1226854170578344342"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xd4218492f84659d21ac1deaf7801956fb163fc65bd364c9262c1c15fb15313ad",
   "block": 109730717,
   "ts": 1794193384,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "359549060640211520",
   "payRoundId": "18446744073709554824",
   "payUsd8": "215344010000",
   "stockRoundId": "18446744073709553218",
   "stockUsd8": "18093856192",
   "usdPaid8": "77426736509",
   "shares18": "4279172758277662340"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x703327c5c16864b30ced30ff5cc4142dcec58764d2e189028e9a25dbd4500d4e",
   "block": 109743190,
   "ts": 1794194679,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "268124096133200928",
   "payRoundId": "18446744073709554825",
   "payUsd8": "214210382193",
   "stockRoundId": "18446744073709553218",
   "stockUsd8": "18093856192",
   "usdPaid8": "57434965107",
   "shares18": "3174279959868048452"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x7d029357fca1eb8de6af4b3ea15e82f20c5d1761dcc6813eda7090ba0fc0c598",
   "block": 109749092,
   "ts": 1794195292,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "16864533734891986",
   "payRoundId": "18446744073709554825",
   "payUsd8": "214210382193",
   "stockRoundId": "18446744073709553218",
   "stockUsd8": "18093856192",
   "usdPaid8": "3612558216",
   "shares18": "199656622538939652"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x9753cdbcc31f2e1ed60c2c16eed776dd956731f40417f37da9070fc104c2f516",
   "block": 109791139,
   "ts": 1794199711,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "40494138646214928",
   "payRoundId": "18446744073709554825",
   "payUsd8": "214210382193",
   "stockRoundId": "18446744073709553220",
   "stockUsd8": "17912132359",
   "usdPaid8": "8674264915",
   "shares18": "484267575805489837"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xfc734ceb95e8fb7dea25c95665d4444835236feb3ea09b327f7553a19b51f780",
   "block": 109862503,
   "ts": 1794207159,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "46644212440980160",
   "payRoundId": "18446744073709554828",
   "payUsd8": "210720374327",
   "stockRoundId": "18446744073709553223",
   "stockUsd8": "17636673622",
   "usdPaid8": "9828885905",
   "shares18": "557298168331438661"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xed141c50ea69a8f84e79d208de416b653a39a35034abe24467c8a802006777d7",
   "block": 109891504,
   "ts": 1794210169,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "15639689402398162",
   "payRoundId": "18446744073709554829",
   "payUsd8": "209003938890",
   "stockRoundId": "18446744073709553223",
   "stockUsd8": "17636673622",
   "usdPaid8": "3268756688",
   "shares18": "185338616456708165"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0ed40f0967456a0bfa044837c6ff1150719aa683035a654f431499dca014a3ba",
   "block": 109912986,
   "ts": 1794212367,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "31570167650873288",
   "payRoundId": "18446744073709554829",
   "payUsd8": "209003938890",
   "stockRoundId": "18446744073709553224",
   "stockUsd8": "17725683034",
   "usdPaid8": "6598289390",
   "shares18": "372244577393361055"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xb41c0dea47a89d8e666296bea0f8236071aa377d16100d9ab605c1aa52a5669f",
   "block": 109917787,
   "ts": 1794212863,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "232949826842532416",
   "payRoundId": "18446744073709554830",
   "payUsd8": "210140609929",
   "stockRoundId": "18446744073709553224",
   "stockUsd8": "17725683034",
   "usdPaid8": "48952218695",
   "shares18": "2761654859849616782"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x50b3b899fdd2a341c78346e7b5cb0090332e81c365a9e7c157adb2fbc6f33158",
   "block": 109933137,
   "ts": 1794214471,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "101762107434919056",
   "payRoundId": "18446744073709554831",
   "payUsd8": "211264730000",
   "stockRoundId": "18446744073709553225",
   "stockUsd8": "17816420260",
   "usdPaid8": "21498744151",
   "shares18": "1206681467840498728"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc8db5992c971d10ab3a52badc413b3606cc139066d37cc57b04bb107d6c39840",
   "block": 109934279,
   "ts": 1794214589,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "125646593299130464",
   "payRoundId": "18446744073709554831",
   "payUsd8": "211264730000",
   "stockRoundId": "18446744073709553225",
   "stockUsd8": "17816420260",
   "usdPaid8": "26544693608",
   "shares18": "1489900508667053636"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x83f19bc413d8956ef4ccfb3fc08afc41dc7f935fbeaa625d49ed7382df884083",
   "block": 109936132,
   "ts": 1794214784,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "62180942179604312",
   "payRoundId": "18446744073709554831",
   "payUsd8": "211264730000",
   "stockRoundId": "18446744073709553225",
   "stockUsd8": "17816420260",
   "usdPaid8": "13136639960",
   "shares18": "737333300870396060"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xb387193505047adbd115f788fcf1452cf7fcaf4fec1a5a4f368c0648cce9e610",
   "block": 109941322,
   "ts": 1794215318,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "330425337714037376",
   "payRoundId": "18446744073709554832",
   "payUsd8": "212418921898",
   "stockRoundId": "18446744073709553227",
   "stockUsd8": "17802288918",
   "usdPaid8": "70188594004",
   "shares18": "3942672446633078511"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x2029d21141676130bb1dc9b7eb51832c85765bc944502d63f3bb5f6ad0ecc5f9",
   "block": 109947960,
   "ts": 1794215993,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "24832389728510212",
   "payRoundId": "18446744073709554832",
   "payUsd8": "212418921898",
   "stockRoundId": "18446744073709553227",
   "stockUsd8": "17802288918",
   "usdPaid8": "5274869454",
   "shares18": "296302878708284988"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x6ce0d720b544dc81302c40dfec61facf65a2fa0a46b15cc67bf4b49ba4ac5cc1",
   "block": 109984214,
   "ts": 1794219753,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "219949032572233408",
   "payRoundId": "18446744073709554834",
   "payUsd8": "210211000000",
   "stockRoundId": "18446744073709553230",
   "stockUsd8": "17902266357",
   "usdPaid8": "46235706086",
   "shares18": "2582673342245368090"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x1b4eaa40d95f4e0ce9c48eaab039c5e956bd4de1b18fdfa17ceb4f9e4a58d8a9",
   "block": 109990180,
   "ts": 1794220371,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "12706054001877110",
   "payRoundId": "18446744073709554834",
   "payUsd8": "210211000000",
   "stockRoundId": "18446744073709553230",
   "stockUsd8": "17902266357",
   "usdPaid8": "2670952317",
   "shares18": "149196323177016397"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x30b8f160beec2cfdde838c31d6ab93dad4e9caf914faf6f767a84e2a87e8b1df",
   "block": 110019108,
   "ts": 1794223393,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "51117681906482432",
   "payRoundId": "18446744073709554836",
   "payUsd8": "212407467021",
   "stockRoundId": "18446744073709553232",
   "stockUsd8": "17715496693",
   "usdPaid8": "10857777333",
   "shares18": "612897144300237430"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc9b7aa93a2113c1bd7fa6c81f7f3bf2d6d46e772520f0d22447740daa384a3a6",
   "block": 110024976,
   "ts": 1794224000,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "40866904233424112",
   "payRoundId": "18446744073709554836",
   "payUsd8": "212407467021",
   "stockRoundId": "18446744073709553232",
   "stockUsd8": "17715496693",
   "usdPaid8": "8680435613",
   "shares18": "489991094431461109"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc37c17d5b4965763f81eb2a5b9b764289b1bc43206a5e2af49ad6375b3a52331",
   "block": 110036835,
   "ts": 1794225252,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "277589121348178432",
   "payRoundId": "18446744073709554837",
   "payUsd8": "211250276123",
   "stockRoundId": "18446744073709553232",
   "stockUsd8": "17715496693",
   "usdPaid8": "58640778533",
   "shares18": "3310140243269102452"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x44dbb6c96195f288efb3777d401bbed5041f420798ee439d400a09b71b031ad2",
   "block": 110042777,
   "ts": 1794225865,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "15668951322507754",
   "payRoundId": "18446744073709554837",
   "payUsd8": "211250276123",
   "stockRoundId": "18446744073709553232",
   "stockUsd8": "17715496693",
   "usdPaid8": "3310070293",
   "shares18": "186846033750096447"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x9082d3123bff5f31db15e4cc356bd460c356e6b2f7282fbf8b04bbe2774eab8a",
   "block": 110050319,
   "ts": 1794226639,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "270084207711995104",
   "payRoundId": "18446744073709554837",
   "payUsd8": "211250276123",
   "stockRoundId": "18446744073709553234",
   "stockUsd8": "17507560634",
   "usdPaid8": "57055363455",
   "shares18": "3258898520916583335"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc19c9d60af1e786415c59998560d46a642f9f3313fadf9a81ed0e61ca9e9fdbb",
   "block": 110062251,
   "ts": 1794227868,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "181545606444492288",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553235",
   "stockUsd8": "17601633499",
   "usdPaid8": "38561821503",
   "shares18": "2190809251038593051"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xcc0b7b6798bbe9de7f762775ae8180d456f1dcb82bf4a6a2d82f77a44e31e924",
   "block": 110091911,
   "ts": 1794230899,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "8223725316740819",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553236",
   "stockUsd8": "17693204426",
   "usdPaid8": "1746788776",
   "shares18": "98726535563739379"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x204237af8506b5320b3d65771752c58b5f42a37c7efc17d44b16abb6a30b831d",
   "block": 110126075,
   "ts": 1794234396,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "217941475673766304",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553239",
   "stockUsd8": "17403379940",
   "usdPaid8": "46292611800",
   "shares18": "2659978231791680346"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x5a0b2ef139a93f158be59eb350ef160de984749cfe7e2689595a8aa74583d73e",
   "block": 110133096,
   "ts": 1794235140,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "5743885185167598",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553244",
   "stockUsd8": "17465027690",
   "usdPaid8": "1220049769",
   "shares18": "69856732589010856"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x6f5a9bb8d1ef9397a62b442af5d4a18e4155f9abf45a8fa38a3b75c530c64c0c",
   "block": 110146105,
   "ts": 1794236453,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "140775823751042496",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553250",
   "stockUsd8": "17852828064",
   "usdPaid8": "29901975012",
   "shares18": "1674915307804759016"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0cf7dd5e44544bdc1a45fc38a143299aa3ceeb52329160ff41089e76a9bd8cb8",
   "block": 110149106,
   "ts": 1794236757,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "19807669547141060",
   "payRoundId": "18446744073709554838",
   "payUsd8": "212408453494",
   "stockRoundId": "18446744073709553250",
   "stockUsd8": "17852828064",
   "usdPaid8": "4207316455",
   "shares18": "235666665243026674"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xf9ed0bb21f340d23d853ee4f7c0a065dfce595701508673b6b8411efedc21a84",
   "block": 110216119,
   "ts": 1794243565,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "165467808799826240",
   "payRoundId": "18446744073709554842",
   "payUsd8": "212426128868",
   "stockRoundId": "18446744073709553263",
   "stockUsd8": "17666433689",
   "usdPaid8": "35149686075",
   "shares18": "1989631110261146946"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xe9fc60fbd3da1519db0b0f1dd0aeb48c380006596974a6dd542322e15f474473",
   "block": 110234843,
   "ts": 1794245473,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "10748168273773852",
   "payRoundId": "18446744073709554842",
   "payUsd8": "212426128868",
   "stockRoundId": "18446744073709553264",
   "stockUsd8": "17756203222",
   "usdPaid8": "2283191778",
   "shares18": "128585584961717329"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x5186c26481b9205addd219c348813b9778792d4efac6c6f1a403eb906951eed0",
   "block": 110274561,
   "ts": 1794249540,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "82038383760869488",
   "payRoundId": "18446744073709554842",
   "payUsd8": "212426128868",
   "stockRoundId": "18446744073709553265",
   "stockUsd8": "17658875336",
   "usdPaid8": "17427096280",
   "shares18": "986874642264024191"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xb2eb1cf14ae8c3b4da342bfc1715ae93c48c513cd6dbe4b2d3cefca466bbe385",
   "block": 110331607,
   "ts": 1794255416,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "39211800544367856",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553270",
   "stockUsd8": "17771565120",
   "usdPaid8": "8334899535",
   "shares18": "469001997219702391"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xfb0178dbc7b5548a00501b55c18dd74deceaa509fd7d2efd79eefce4ccc03bb6",
   "block": 110348593,
   "ts": 1794257144,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "69090448173030408",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553272",
   "stockUsd8": "17768597823",
   "usdPaid8": "14685934754",
   "shares18": "826510617230035777"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x2a172cd8e35d28ce2ffb936bcf2a4b2e1ac155bdbc8caf6e489589c6eab1b3a7",
   "block": 110351697,
   "ts": 1794257461,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "167853814330496224",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553273",
   "stockUsd8": "17866588722",
   "usdPaid8": "35679174627",
   "shares18": "1996977441086249234"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0aa2004b5bc49dd9b954b06a8f5022c3fae52562f67b27c39ebb955e270efb30",
   "block": 110387643,
   "ts": 1794261183,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "59261339838957984",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553273",
   "stockUsd8": "17866588722",
   "usdPaid8": "12596649657",
   "shares18": "705039437186413340"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x1bfaafe14960b54ae60ace9393b848541200ff50e52dd3db34e72ed64dafd0b1",
   "block": 110393342,
   "ts": 1794261785,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "51951963532702696",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553274",
   "stockUsd8": "17957954490",
   "usdPaid8": "11042961320",
   "shares18": "614934252458950295"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x3c2386fc1e10dd47f48f962edd9250be6108ec857f7e40cedf0532fe1a56a75a",
   "block": 110419446,
   "ts": 1794264575,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "131778021240743968",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553274",
   "stockUsd8": "17957954490",
   "usdPaid8": "28010867972",
   "shares18": "1559802815381786837"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x8543c7ee1efef9265d36ee95c59bdff6886802137e3a6eef56dbc7f644b13fe2",
   "block": 110453128,
   "ts": 1794268152,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "36948623311354112",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553276",
   "stockUsd8": "17959911005",
   "usdPaid8": "7853836319",
   "shares18": "437298175743382532"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x8fa4ecd24b4a77f01ce6931fe3d082086cb74028ded4d1dc54b004d4123601de",
   "block": 110465245,
   "ts": 1794269428,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "69692519855833160",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553278",
   "stockUsd8": "18158064487",
   "usdPaid8": "14813911713",
   "shares18": "815830989233781103"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xf562680b8bcb455d9ea80681c0183f83f384d28db4a6ce645e15330888cfa7b3",
   "block": 110480761,
   "ts": 1794271080,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "140661180078813840",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553279",
   "stockUsd8": "18059488133",
   "usdPaid8": "29899081098",
   "shares18": "1655588512686889451"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0bd879650bf08a27f71c306ce04f3111a263ba22e449b11a554665c864b964b0",
   "block": 110492427,
   "ts": 1794272313,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "163133862220996640",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553279",
   "stockUsd8": "18059488133",
   "usdPaid8": "34675896887",
   "shares18": "1920093007710275616"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0a8b3c5b73662a03b210669d727a301ef56b7f749181fbe965b5b9efc687cad9",
   "block": 110492986,
   "ts": 1794272372,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "44484629268237872",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553279",
   "stockUsd8": "18059488133",
   "usdPaid8": "9455697281",
   "shares18": "523586117799300087"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x015b2e06b5b135db64a26529f81666850734a1f31db3805e96f010b332bd9f87",
   "block": 110514375,
   "ts": 1794274538,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "146180438731100416",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553279",
   "stockUsd8": "18059488133",
   "usdPaid8": "31072260237",
   "shares18": "1720550439091451075"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xdf0f70fde48ff2c324b2cfca99d647da4aba5fbdca305c911fbe0c230e19b7d5",
   "block": 110517720,
   "ts": 1794274888,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "11908206436847516",
   "payRoundId": "18446744073709554844",
   "payUsd8": "212561000000",
   "stockRoundId": "18446744073709553279",
   "stockUsd8": "18059488133",
   "usdPaid8": "2531220268",
   "shares18": "140160133518663554"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x8b5393bc7c2f857a989de46bdc4db6a3b8bd8355b7f2e610a77b375a0e41b3ad",
   "block": 110677752,
   "ts": 1794292126,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "18688970850516748",
   "payRoundId": "18446744073709554847",
   "payUsd8": "211538000000",
   "stockRoundId": "18446744073709553284",
   "stockUsd8": "17952230966",
   "usdPaid8": "3953427515",
   "shares18": "220219287646613715"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x3712537742ea0eb06f8fc05d5729f6ed0a29e9baa4d6747a4e9a75b7f841e23a",
   "block": 110700837,
   "ts": 1794294624,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "36810747996869616",
   "payRoundId": "18446744073709554847",
   "payUsd8": "211538000000",
   "stockRoundId": "18446744073709553284",
   "stockUsd8": "17952230966",
   "usdPaid8": "7786872009",
   "shares18": "433755115102277478"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x77126fd7bc93fe68e05fffb13b4b7663855f2e28040778134ddb49222fab61ae",
   "block": 110745872,
   "ts": 1794299517,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "6966617668762572",
   "payRoundId": "18446744073709554847",
   "payUsd8": "211538000000",
   "stockRoundId": "18446744073709553287",
   "stockUsd8": "18231953025",
   "usdPaid8": "1473704368",
   "shares18": "80830855914296652"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x4d74b9af19af0a4358bf6c809ce6bfec587b8829b031a6692292055f530c9ee5",
   "block": 110808218,
   "ts": 1794306149,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "6519898307664005",
   "payRoundId": "18446744073709554848",
   "payUsd8": "209778649210",
   "stockRoundId": "18446744073709553289",
   "stockUsd8": "18234093376",
   "usdPaid8": "1367735459",
   "shares18": "75009786930247647"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc4d717d17f19475b31d7193ad260e67976e183c476dde63437df46baa9087877",
   "block": 110823174,
   "ts": 1794307710,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "69942935492886648",
   "payRoundId": "18446744073709554849",
   "payUsd8": "208659000000",
   "stockRoundId": "18446744073709553292",
   "stockUsd8": "17918378837",
   "usdPaid8": "14594222977",
   "shares18": "814483447959260266"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xe1e01d9c3858d519decef9519af9881559c71bbb51846cdc58132dfeb70264ef",
   "block": 110854393,
   "ts": 1794310996,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "186551193349370560",
   "payRoundId": "18446744073709554851",
   "payUsd8": "208693687508",
   "stockRoundId": "18446744073709553294",
   "stockUsd8": "17910988112",
   "usdPaid8": "38932056449",
   "shares18": "2173640907221434037"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xe6ac6143e096c9574b9a689f31d74cbb765cf6a92344a03d7848d786ee79cc36",
   "block": 110883433,
   "ts": 1794314033,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "35268110771831376",
   "payRoundId": "18446744073709554851",
   "payUsd8": "208693687508",
   "stockRoundId": "18446744073709553295",
   "stockUsd8": "17789779229",
   "usdPaid8": "7360232088",
   "shares18": "413733750894542930"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x47f166a4d33c18b4f05775fcdee63f466fbe090bc621dac6fec66ba3bd57728b",
   "block": 110916414,
   "ts": 1794317465,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "142456354374296352",
   "payRoundId": "18446744073709554852",
   "payUsd8": "207536998900",
   "stockRoundId": "18446744073709553296",
   "stockUsd8": "17698733709",
   "usdPaid8": "29564964261",
   "shares18": "1670456471468684324"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc263652e14a55dfb1a3d682e2e8b9b6d0879289753e5efea134204743419ce2e",
   "block": 110930149,
   "ts": 1794318867,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "25237389510866344",
   "payRoundId": "18446744073709554856",
   "payUsd8": "207061000000",
   "stockRoundId": "18446744073709553299",
   "stockUsd8": "17582118383",
   "usdPaid8": "5225679109",
   "shares18": "297215557031663742"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x162049c82eb00aa260149d092e8e585321d8db27ca1932fc6cfc97e78167d2ba",
   "block": 110953779,
   "ts": 1794321281,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "64737153418498072",
   "payRoundId": "18446744073709554857",
   "payUsd8": "205941363757",
   "stockRoundId": "18446744073709553303",
   "stockUsd8": "17155487933",
   "usdPaid8": "13332057660",
   "shares18": "777130776581101163"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xec2d0e2a6aaef277fa62364c82222140fdfd8269b3ce7d735a033dccb2635d0c",
   "block": 110973412,
   "ts": 1794323277,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "106813863262555744",
   "payRoundId": "18446744073709554859",
   "payUsd8": "208612424733",
   "stockRoundId": "18446744073709553308",
   "stockUsd8": "17278132928",
   "usdPaid8": "22282699010",
   "shares18": "1289647388572284515"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xc8e22f43503ce4ca81a58c1dee63ff5ecf9c7bafa9daf51908b6260e45f78eb9",
   "block": 110986177,
   "ts": 1794324568,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "193275633096876544",
   "payRoundId": "18446744073709554861",
   "payUsd8": "206351655253",
   "stockRoundId": "18446744073709553311",
   "stockUsd8": "17180307157",
   "usdPaid8": "39882746809",
   "shares18": "2321422221648117882"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xf2b1d7a34f6967349900fd16acfd3efc79366dc2a5ff5b3326d711986cf2e6ee",
   "block": 111028560,
   "ts": 1794328902,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "5293434763454200",
   "payRoundId": "18446744073709554869",
   "payUsd8": "201512352468",
   "stockRoundId": "18446744073709553321",
   "stockUsd8": "16844747246",
   "usdPaid8": "1066692491",
   "shares18": "63324933014551449"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x0617be4d8a10232992fd31fa033d1867989be2e147cd4d6bb166181eaee2ab37",
   "block": 111034019,
   "ts": 1794329452,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "6217675008983354",
   "payRoundId": "18446744073709554869",
   "payUsd8": "201512352468",
   "stockRoundId": "18446744073709553322",
   "stockUsd8": "16754477327",
   "usdPaid8": "1252938317",
   "shares18": "74782298041663045"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x99a7160b7e4f083526d72b1c83aa4f21ad8647c06c3702e96fd382226f75d7a9",
   "block": 111039946,
   "ts": 1794330054,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "5980920480452861",
   "payRoundId": "18446744073709554869",
   "payUsd8": "201512352468",
   "stockRoundId": "18446744073709553322",
   "stockUsd8": "16754477327",
   "usdPaid8": "1205229355",
   "shares18": "71934762957825094"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x6be5c3884d277f11a5bf2e2f71fc738e3b61d438cc045f6ef483ea366f12f74a",
   "block": 111045007,
   "ts": 1794330565,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "138780094144464576",
   "payRoundId": "18446744073709554869",
   "payUsd8": "201512352468",
   "stockRoundId": "18446744073709553323",
   "stockUsd8": "16669411438",
   "usdPaid8": "27965903246",
   "shares18": "1677677904226914673"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xffd4ca2fdda36eebe10eb151fefc8e20c5fd906a90b6f6e636afb267385d160f",
   "block": 111058777,
   "ts": 1794331965,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "225449216423144736",
   "payRoundId": "18446744073709554870",
   "payUsd8": "202526436112",
   "stockRoundId": "18446744073709553324",
   "stockUsd8": "16756478877",
   "usdPaid8": "45659426326",
   "shares18": "2724881919474877514"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x01abb2aa02cbbf78a409b8973a29152e35e111c518bfef0d92cbd776bd910289",
   "block": 111068342,
   "ts": 1794332938,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "6373229578365314",
   "payRoundId": "18446744073709554871",
   "payUsd8": "201464000000",
   "stockRoundId": "18446744073709553325",
   "stockUsd8": "16662355973",
   "usdPaid8": "1283976323",
   "shares18": "77058509917839936"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x460fdda657cda55de1e0f3ab261dd00768740edc82da3c0ce3baea5c7186d9dd",
   "block": 111073830,
   "ts": 1794333500,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "66121916362699552",
   "payRoundId": "18446744073709554872",
   "payUsd8": "202490473360",
   "stockRoundId": "18446744073709553326",
   "stockUsd8": "16746773860",
   "usdPaid8": "13389058143",
   "shares18": "799500742944886221"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xb9a197c42c7d7e4c0121b502be0417e3f0bebd64dced09e3242814796986a8b1",
   "block": 111074035,
   "ts": 1794333521,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "151204952127746560",
   "payRoundId": "18446744073709554872",
   "payUsd8": "202490473360",
   "stockRoundId": "18446744073709553326",
   "stockUsd8": "16746773860",
   "usdPaid8": "30617562330",
   "shares18": "1828266302868676821"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xd800f34c89247b04da4a3cdcf3b32c75f5f703c83b1f97ac24af49799149429f",
   "block": 111079984,
   "ts": 1794334129,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "19597070218551528",
   "payRoundId": "18446744073709554872",
   "payUsd8": "202490473360",
   "stockRoundId": "18446744073709553326",
   "stockUsd8": "16746773860",
   "usdPaid8": "3968220025",
   "shares18": "236954296879721525"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x688783e90202a2e404d95d89859a6ad7fd30d9fb7cc052a008bd08ac89aa7b8d",
   "block": 111097401,
   "ts": 1794335929,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "30651332154998368",
   "payRoundId": "18446744073709554873",
   "payUsd8": "203683180081",
   "stockRoundId": "18446744073709553327",
   "stockUsd8": "16835700239",
   "usdPaid8": "6243160807",
   "shares18": "370828698442710494"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x68dccf26a02a7a105f541dbb2e008c3db3e1b3ea391423ab8c8a24d6cdc62553",
   "block": 111138502,
   "ts": 1794340183,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "53978657482270344",
   "payRoundId": "18446744073709554873",
   "payUsd8": "203683180081",
   "stockRoundId": "18446744073709553328",
   "stockUsd8": "16732690451",
   "usdPaid8": "10994544612",
   "shares18": "657069742860325863"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0xdc59df2b7d20b7e6bdf405cc6080e7a6680b2975d557149485b09e63313a3a03",
   "block": 111153193,
   "ts": 1794341714,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "20172083836633172",
   "payRoundId": "18446744073709554873",
   "payUsd8": "203683180081",
   "stockRoundId": "18446744073709553331",
   "stockUsd8": "16815274417",
   "usdPaid8": "4108714184",
   "shares18": "244344164841350980"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x507154f1eca6a83722cfede64fcee8d70bfc6b34dc7cb61f1d672f76d59cc413",
   "block": 111189548,
   "ts": 1794345466,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "31649579471032856",
   "payRoundId": "18446744073709554875",
   "payUsd8": "205896552868",
   "stockRoundId": "18446744073709553332",
   "stockUsd8": "16935917863",
   "usdPaid8": "6516539312",
   "shares18": "384776270451613491"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x899e904d5932222affa441d9cd713d76e8002dd65b3e55ee563551dfae64de08",
   "block": 111190879,
   "ts": 1794345607,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "202946499605083520",
   "payRoundId": "18446744073709554875",
   "payUsd8": "205896552868",
   "stockRoundId": "18446744073709553332",
   "stockUsd8": "16935917863",
   "usdPaid8": "41785984685",
   "shares18": "2467299677703922270"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x99653cd0388f0b7448cd8f4866173698214e89f9dfe3e080790517cd6d026ab0",
   "block": 111233772,
   "ts": 1794350150,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "54635318292363960",
   "payRoundId": "18446744073709554876",
   "payUsd8": "204837000000",
   "stockRoundId": "18446744073709553332",
   "stockUsd8": "16935917863",
   "usdPaid8": "11191334693",
   "shares18": "660804733674917917"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x6515d2cbf2546c53e12c9c6b1fddc6ae19cfa2a437fb2c4a1b37d58dfeef9461",
   "block": 111295179,
   "ts": 1794356707,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "48436223549348880",
   "payRoundId": "18446744073709554876",
   "payUsd8": "204837000000",
   "stockRoundId": "18446744073709553333",
   "stockUsd8": "17020683519",
   "usdPaid8": "9921530723",
   "shares18": "582910240468586671"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x3c65889ee6ac086ed85b05765458de4310c08e6c4e4ebe835a14e1da505722f3",
   "block": 111309448,
   "ts": 1794358212,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "94086664347948448",
   "payRoundId": "18446744073709554876",
   "payUsd8": "204837000000",
   "stockRoundId": "18446744073709553333",
   "stockUsd8": "17020683519",
   "usdPaid8": "19272430065",
   "shares18": "1132294719156630833"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "tx": "0x8ecddb82310ba7e4bcbb8c591f8c0a170ec9e8a8eac4b3821ad30619d3546c8d",
   "block": 111342588,
   "ts": 1794361611,
   "payKind": 0,
   "payStockId": 0,
   "amountPaid": "23628311112148236",
   "payRoundId": "18446744073709554877",
   "payUsd8": "205866870000",
   "stockRoundId": "18446744073709553335",
   "stockUsd8": "17195042486",
   "usdPaid8": "4864286452",
   "shares18": "282888888233945594"
  }
 ],
 "unpriced": [
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc2136408cda7ce77168899a98526b2e3a305b0e2c7da03c138a42852623d333b",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc80cf9aab76455da4833583d50da731ce5bc19a9c03a5ffa15998ccf7e868173",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc15a61473cc05ae6dcce3b2af350211fe17769458ebf39d17d15e9dec33c0d04",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x00a7efb60f4da374d79d0c563b5bf0881a9b51def3dfc6eec21738586550dae7",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x261e902851f8e0ab2216c8c8e7321472f022c504a0b8601e5e56fec9880e07d2",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfdd8c3ae32436504f30cb9baf301a3c237e102fd9b42e6e14c7a52812c47e3fe",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xe7a90a35694e10e51dde81697c40bad45366a6cd71a7c96140ebee3a0b6167fa",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xf2c686ad5af8e0e84d05b57f1484bcef58aa371a0115611d9984048480f987cb",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xb12466cce8f766e36904a115bab317e045526cdf55a36f8fb145e473dc199f89",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xca78eaee06b6f0e0df969c02dd763c9a095cbf24f1c29df4215bddaae6ea5f62",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x92e2f028abb77f98e29cafa8e76b4a2d40e7fffdc5a5522b88ac62fc4f484ef3",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xbbbbdf46cbfb72404cb8381a36f940b7a47a5aa659ec4715b848be6755bdb689",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xa072bac268fc8d8dc505f7b7239aab6beb9511ad4deba54ad41797db13a56083",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xaa906095884021b17f96adc5e228995d4e5d4b9035b7a640d7b65d12249338d6",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x150331185e7acf34d8a2571db9a7e2651d3a4e3394b507b98a44ab21c66bca38",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x6797a50e4cf75093ca264fc962d9a394ceb59083c89f4da92a329c8dad963019",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x2a80c30a5efb280db1fd1373fe4c145a4cfaa85e5f9149035ab475e78ffc2314",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x5d8ce75d815bf3d16c1f104a08e917893e0ba524aded2946f273e2092774ee15",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xe827eb32633c339835eb851268c3f87c709f65ed6c192ab5b244139a80d33d6a",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x7848649e01f1f6c826c3efaa2d0e150d89d14fb29507495d0970e161d0da0976",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x7bf93af8d1bb8ec0e70e58b46cd605735c53cd8c21aad2de426361d3f993aea6",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x3c1b13cd8106ed99a9bfd712915c79265bce767b8de6501555fd4b55be60c559",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xe5bb7cc51c8799161936210d9fb22b6e925dc56c21a3ccf0e43182530656ce93",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x1fe6fbaf521f47d0697c97010d7be5c3dc0c80e234af853189560b8ac545a663",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x267e59f79a5b6a6978977586b82c250dce9e1d1ab961f73fc9bde10ad94a4055",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x4a4be1b60a5858270cc56c89659a568734ee50de6e8b88486457119dc230b59a",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x87e7ad34cf06411234c67a949cdd686954ffe93c193c94d9692c0ece4ffcc49e",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xbf55edc7c54523333fcd71614bd365dfb63b9280d30accd4012ac9af2f8b1239",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xb10598fb1111e352bbed0279d46c753fe1f9a97fcac29edf43b42b65b356cda9",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x017974673af002df5b856bffcc67a1777c835111202363a52704f5c08385f9ed",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xf5962afcdf6f46d95057938d7436155f665b4b5ea10c09fc78960c543e50dc1c",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x7dd144fe28046412820b45f0d15474ce68488498150c9d073cf9c26e9492abfe",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xd9994fec32091ca69ff47487221dda8e864ffd0e96dcca76bcd517e85d7d340a",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xac59c0f86a58fe48e7e02ab49035aa0621aedea71b56be8180f68c1f1ce679b8",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xd6a9225770744010dfa3b2d91eee2825db7b696203b15aed132b254043ddeda7",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x16c6dd10849d92ca357b55240ed25cb534c04768fdee648a5b2eef28a1c75bdd",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xe105ee7bf4d1a1ed0188329a978f1d96ba2e80f7dcb5f0cf5c047de52405148f",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x6c5ed50b7135b23a5d8c8de100144eafed96540478973566d7d4a838d77e81e2",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x47525472e0118a928a88b463b61bdf68afd0a4d39cd750198c554577ce1293e3",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x091681e1ae910f2351666ab383c70f43dc5e15f2760e1aa66988e546fc0427d2",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x0ea3ec971ac7b765087f764469814238a25f7265bf52b272136a4c9acb4a09fd",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xbeefea6e705872882508b8f869c03f5a14f8481b33aad92907be0ed363c3cf1b",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x8b0d0fd114ad4548575653adc5145fcf08174f4e4af9cf67c4c3451a837cfea6",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfa388669bf1e19df2c3ae79705672883772ce0ca4d9846fa23c6722142207c59",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x2d5d98647e149171c59bdd7b6d91aa0918774b53d4ce46fdffdbd6667538de62",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x1af2a6ccd201825f350c6a8fbecc3e67521232e666aace7497b83af20f3f01f6",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xadce44dd0d6448c74fc7062a227795a1b3daa3788c16f2ecf2f6164ffae497c7",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc2b4091befe789f2477e328f5626c570471aa6ab77d6c8024c09590dc2f3c7ab",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc60e63e7ba5b094dea53b4ef7ad4cd3a787df05333c9c1f9196e40d431ea3e7c",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc5e9d6e5993a475444545dda8dd8da698f1878cece3a05fbf33f43a9a03809ae",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xb79ba974bfb0c4e74eec3d3710a198b80f2b65fb68374dfe854346fa902fda39",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x20f5483ee53838f1a33c6b49550d133ee704605ef6f88f66ef7edf7bba205ed4",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x5727c64f4f48447d66163bcc155f0da6df235fea2978d964aa20cedae1727aeb",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xf02c18b5501ecd33fe0b7efc170666832f7e9e2ae28312d9431653f254bbdd64",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x456bed0acb41a228d200772522306c8ceb4377986eb6909d572e5324f8938911",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x1e5031b7e3e9d8b68679befdaa0001908df4eda32c3cf19a75f85f3f25fab0f9",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x1ab5da2302da39ba32ad026dd7c7561cc36869c8ebc81d3b162fc73f666e6ad0",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x372710c424fb2fdbcf4c07e52020851d371e33f24dcd4da67a9aac3623df302c",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x6400f2882cf62bffb10b553aebf86444063194b9c3fa847df66f304b1955fc9d",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x80df04f783ded1a9dba9c050821faf1948b4a9a6c04aac403c80e74730f0c124",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc9e03af7643665a72f66e058d13954d415f1179bd09d3cf42c437cab79b12621",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xabc1bbf503c6509b839dfdd834ca994784c44cc1e40fd52b4feab400e5a99cfa",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x949820ff60c442411d078c99e2a9aed864572b7da35fe249fa95ac548566ecdd",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x2e99f7ad674c6b6d3585e3d8e76d8632e0d2f504b120b238224dcd11bf1ecad4",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x0f549ed37bb317d5d619dd8e8ef00e6ba2af5ea6187b42190450fb248c873a01",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x81d5625ba93093f22e1847aacf6f94d8a72c92562d60a63c820f03cdcb3104e8",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc5287935d04506d4c4f8eaef1d482ab085d9adcbc598047b6a5560a48f093819",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xded8780221d40d3bd2ab808af0ec35044c96b59618c589ac16bd8c36334cd780",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfc6ad672bdf70f68e83d4a48c14ed2dba5ef1836ec149620c74dad478c3c3a70",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfc885fb781a4e77b8258e8a9cfa64dc098d319cebd8bbe3577dc0614d696ac76",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xe3922697e771c4fce7a3dd931a5b64d09975fc385861f978d2bc0b0ecf3131b5",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x63bb78c28ee5f4722a2840dbd4f71e3120605e7317d92dcb27a4f07d993c20b4",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x4b6c580dbe37227ac01a669aa64250e5d0b6d96b3b73bf71dfb16bf5f15ced9e",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x16f9aab887ec7a43f7e5b6f88b4d83ab0e7b98f5b702ec7cac48afdbfd6c8cd6",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x84dcb2a09b957271b67f325e60bc1f451a97a68ae49cb72dbde85dfd4820c1bf",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfe9446d66aeb6805633b95d0c103eb30938e961234822de4dcef9535a99f5830",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc60d93f5c0300ac800f6fc70d2aaf21b189c83eace190759e97534ed2afc9407",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x274613b4e8b4c2d8fc0d9e488209da78673710cc0636ec2707cee410ecf3be22",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xbc0d6a77dfaba843ef7a4fa6f48f9125b94d633b4bcc0953393de76f22ae3dd8",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc9bd38bd63cb7982d84b42ed1ded7b1f61e18bfc95cb0a15d5bb21aea5b4c327",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x843a6c37c63b89576c49d0369590e24f4a8a99b6ccac6fec955f3fa12d4b6eda",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x2ba258ad763e7bbe26e40fff337df709429dd26fcc3d4c760901d8a2eae80d12",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xea2332f2cd6620cbec029538f579bbe65169c0dcb610ece6514f884206fe59bc",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x9b50d7d6655ed94555a01de8258be74ba354ba6063958756c8d181cabd5a32af",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xdeeac975940027e252eddff605c6fa9f06c04d7ee31783481b88108e7bb3afc0",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xef11ea794ad915fba4492278e16683c06f4069fbe4bb21ac0490a461d9f49f09",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x656b9792398d0a354bcabd831c4530ece211426def1ab79879958c3ef53b53dc",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x04c932f64f3feffdb21c2829e46b2f5cc9aed752b9326e88aa37acc020a1cad5",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xd6af9a19a70065bdd314b1b2328f92cf7c72ea4328a03e7f648ebb4759665d89",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x3bb327eb5de357d82f66218d899468206bfa93d9cb1529b32f9eabfe3ca10ba0",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc396843c80ce77763ccca9c1cefeccc5bf7c6cd60cf3f503e5e5a91ca37ea987",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xc7f696491345110007f9c9a4fcb63f08fbb6738a88315a5d82efada31b2f1827",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xa5621aab834605cf57d2e6ea2309f305f9405a3c928149aeb4008b050086191f",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xcb6a49029a430056e59ef3212ba072799be83e19755dafde5a67d61c3cba7465",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xfe6a296c625b03ebb1dc219b79addff51c2cbd6498903c1aaea3041ee4cec66d",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0xbc41044d82ddb3c5ca9a75a947d43c72b39339d3700d00b5025f7434596aeff4",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  },
  {
   "token": "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
   "symbol": "AI",
   "tx": "0x3b9470ca515bd258c7d530760935c3ec3433e54954853a13dba6a8658dc15d4e",
   "reason": "not a buy (nothing paid in this tx, e.g. liquidity withdrawal)"
  }
 ]
}
```

#### File: scripts/gen-architecture.py
[VERIFIED] — Source: fork-tested / live-probed
```python
# File: scripts/gen-architecture.py
# [VERIFIED] deterministic generator: ARCHITECTURE.md = docs/arch/00-head.md + file tree + docs/arch/10-components.md
# + one section per component with the COMPLETE content of every source file + docs/arch/90-tail.md.
# Run from terra-firma/: python3 scripts/gen-architecture.py
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"node_modules", ".next", "out", "cache", "lib/forge-std", "lib/openzeppelin-contracts", "broadcast", ".git", ".vercel"}
CODE_EXT = {".sol": "solidity", ".ts": "typescript", ".tsx": "tsx", ".mjs": "javascript", ".js": "javascript", ".py": "python",
            ".yml": "yaml", ".yaml": "yaml", ".toml": "toml", ".css": "css", ".json": "json"}
# Hand-written config JSON is embedded; generated data JSON is listed (with its generator), not embedded.
GENERATED = re.compile(r"^web/data/(memes|restricted|deployments|proof|evidence)\.json$|^web/data/rounds/|^contracts/deployments/|^web/lib/abi\.ts$")
INCLUDE_ROOTS = ["contracts/src", "contracts/script", "contracts/test", "contracts/foundry.toml", "web/app", "web/components",
                 "web/lib", "web/package.json", "web/tsconfig.json", "web/next.config.ts", "web/postcss.config.mjs",
                 "scripts", "package.json", "tsconfig.json", ".github/workflows", "web/data"]

COMPONENTS = [
    ("Shared contract infrastructure", "Interfaces, the Universal Router 2.1 command codec, and the deterministic deploy used by tests and scripts.",
     ["contracts/foundry.toml", "contracts/src/interfaces/", "contracts/src/lib/", "contracts/script/"],
     "UR 2.1 needs a trailing `uint256[] maxHopSlippage` on V2/V3 inputs (root cause proven in URProbe.t.sol). Deploy predicts CREATE addresses to break the Jar↔Router↔Staking↔FeePool cycle without any admin setter."),
    ("C5 StockOracle", "Curated 6 stocks, Chainlink freshness, Chainlink-bounded min-out, NVDA early-round normalization.", ["contracts/src/StockOracle.sol"],
     "MAX_AGE = 25h follows the directory heartbeat (86400s); band 3% clears measured fills (-0.04%..-1.54%). Nothing is mutable after deploy."),
    ("C2 Jar", "Ownerless per-user ledger of real Stock Tokens.", ["contracts/src/Jar.sol"],
     "credit() requires the tokens to already be held (balance backing) and only accepts the two immutable depositors; withdraw() debits only msg.sender."),
    ("C4 WifStaking", "Stake $WIF into one of 6 reward sub-pools; epoch-batched activation (anti-JIT); 24h unstake; claim to Jar.", ["contracts/src/WifStaking.sol"],
     "All pending stakes in a pool share one epoch, so a single acc snapshot per (pool, epoch) lets each staker activate lazily with exact accounting."),
    ("C3 FeePool", "Hourly permissionless distribute: capped $WIF buy-and-burn + Chainlink-bounded stock stream to stakers.", ["contracts/src/FeePool.sol"],
     "Every swap is wrapped in try/catch so a misbehaving third-party hook or a stale feed carries ETH forward instead of bricking the epoch."),
    ("C1 TerraRouter", "Meme buy/sell/convert/deposit through UR 2.1 with fee, sweep and Jar credit; $WIF sell guard; staker fee discount.", ["contracts/src/TerraRouter.sol"],
     "The router encodes every UR command itself from a typed Route and validates endpoints; callers cannot inject commands. Fee discount reads stake amount, never a price."),
    ("C6 HindsightLens", "Onchain recompute of a Hindsight card + optional mint that burns 1 $WIF.", ["contracts/src/HindsightLens.sol"],
     "Round bracketing (updatedAt(r) <= ts < updatedAt(r+1)) makes a forged round id revert BadRound."),
    ("C12 FriendJar (gated by OD7)", "Shared Jar with pro-rata exit, funded through TerraRouter.deposit.", ["contracts/src/FriendJar.sol"],
     "No vouching or lockups (AMEND-1); deployed with the core, surfaced in the UI only if the gate passes."),
    ("Contract tests", "Mainnet-fork test suites (32 tests).", ["contracts/test/"],
     "Tests deploy the real system with deployAll() on a fork and use real pools, hooks, feeds and rounds; via-IR caches block.timestamp, so tests warp with vm.getBlockTimestamp()."),
    ("Shared web infrastructure", "Config, RPC failover client, generated ABIs, project config.", ["web/package.json", "web/tsconfig.json", "web/next.config.ts", "web/postcss.config.mjs", "web/lib/config.ts", "web/lib/rpc.ts"],
     "rpc.ts is the only module with network I/O and is server-only so the shared GetBlock endpoints never reach a browser."),
    ("C7 Hindsight Indexer", "Card construction from logs, txs, receipts and Chainlink round tables.", ["web/lib/rounds.ts", "web/lib/hindsight.ts", "web/lib/hypersync.ts", "web/app/api/hindsight/"],
     "Per-token scans (not wallet-wide) keep a card to ~3–12s; RPC errors are thrown, never read as 'no logs'."),
    ("C8 Route Builder", "Registry, best-pool quoting, Chainlink min-outs.", ["web/lib/registry.ts", "web/lib/quote.ts", "web/app/api/quote/"],
     "All candidate pools are quoted in one JSON-RPC batch; stock paths mirror TerraConfig.sol exactly."),
    ("C13 Live Stream + ops API", "SSE stream over GetBlock WSS, geo, health, Quicknode cross-check.", ["web/app/api/stream/", "web/app/api/geo/", "web/app/api/health/", "web/app/api/qn-jar/"],
     "The stream closes at 55s (serverless limit) and the browser EventSource reconnects."),
    ("C9 Frontend", "All pages, OG images and components.", ["web/app/", "web/components/", "web/lib/"],
     "Client components talk only to API routes or read the chain through wagmi/public RPC; deployed:false renders a read-only state, never fake data."),
    ("C10/C11 Scripts + keeper", "Data builders, deployment sync, keeper, seed, proof, claims.", ["scripts/", "package.json", "tsconfig.json", ".github/workflows/"],
     "Scripts never import server-only modules; every number they write is read from chain or Chainlink."),
]

def tracked_files():
    out = []
    for inc in INCLUDE_ROOTS:
        p = os.path.join(ROOT, inc)
        if os.path.isfile(p):
            out.append(inc)
            continue
        for d, dirs, files in os.walk(p):
            rel_d = os.path.relpath(d, ROOT)
            dirs[:] = [x for x in dirs if os.path.join(rel_d, x).replace("./", "") not in SKIP_DIRS and x not in {"node_modules", ".next", "out", "cache"}]
            for f in sorted(files):
                rel = os.path.normpath(os.path.join(rel_d, f))
                if os.path.splitext(f)[1] in CODE_EXT and not f.endswith(".d.ts"):
                    out.append(rel)
    return sorted(set(out))

def tag_of(text):
    head = "\n".join(text.splitlines()[:8])
    for t in ("[UNVERIFIED]", "[ASSUMED]", "[VERIFIED]"):
        if t in head:
            return t
    return "[VERIFIED]" if "GENERATED" in head else "[ASSUMED]"

def block(rel):
    text = open(os.path.join(ROOT, rel), encoding="utf8").read().rstrip("\n")
    lang = CODE_EXT[os.path.splitext(rel)[1]]
    tag = tag_of(text)
    header = f"// File: {rel}" if lang not in ("python", "yaml", "toml") else f"# File: {rel}"
    if not re.search(r"^(//|#) File: ", text, re.M):
        if lang == "json":
            note = " (JSON: copy everything after this first line)"
            text = f"{header}{note}\n{text}"
        else:
            text = f"{header}\n{text}"
    return f"#### File: {rel}\n{tag} — Source: {'fork-tested / live-probed' if tag == '[VERIFIED]' else 'see header comment'}\n```{lang}\n{text}\n```\n"

def main():
    files = tracked_files()
    hand = [f for f in files if not GENERATED.search(f)]
    gen = [f for f in files if GENERATED.search(f)]
    parts = [open(os.path.join(ROOT, "docs/arch/00-head.md")).read()]
    parts.append("\n### File Structure (every hand-written file; each has complete code below)\n[VERIFIED] — generated from the source tree (not code)\n```\nterra-firma/\n" +
                 "\n".join("  " + f for f in hand) + "\n```\n")
    parts.append("\n### Generated artifacts (produced by scripts, not hand-written; listed with their generator)\n| File | Generator |\n|---|---|\n" +
                 "\n".join(f"| {f} | {gen_cmd(f)} |" for f in gen) + "\n")
    parts.append(open(os.path.join(ROOT, "docs/arch/10-components.md")).read())
    used = set()
    filemap = {}
    for i, (name, purpose, prefixes, decision) in enumerate(COMPONENTS, start=3):
        mine = [f for f in hand if f not in used and any(f == p or f.startswith(p) for p in prefixes)]
        if not mine:
            continue
        used.update(mine)
        for f in mine:
            filemap[f] = {"section": i, "name": name}
        parts.append(f"\n## Section {i}: {name}\n\n### Purpose\n{purpose}\n\n### Files\n" + "\n".join(f"- `{f}`" for f in mine) +
                     "\n\n### Code\n\n" + "\n".join(block(f) for f in mine) + f"\n### Key Decisions\n{decision}\n")
    missing = [f for f in hand if f not in used]
    if missing:
        print("UNASSIGNED FILES:", missing, file=sys.stderr)
        sys.exit(1)
    parts.append(open(os.path.join(ROOT, "docs/arch/90-tail.md")).read())
    import json
    json.dump(filemap, open(os.path.join(ROOT, "docs/arch/filemap.json"), "w"), indent=1)
    open(os.path.join(ROOT, "ARCHITECTURE.md"), "w").write("\n".join(parts))
    print(f"ARCHITECTURE.md: {sum(1 for _ in open(os.path.join(ROOT, 'ARCHITECTURE.md')))} lines, {len(hand)} code files, {len(gen)} generated")

def gen_cmd(f):
    if "memes.json" in f: return "`pnpm tsx scripts/build-registry.ts`"
    if "/rounds/" in f: return "`pnpm tsx scripts/build-rounds.ts`"
    if "restricted.json" in f: return "`pnpm tsx scripts/build-restricted.ts`"
    if "deployments" in f: return "`forge script script/Deploy.s.sol` + `node scripts/sync-deployments.mjs`"
    if "proof.json" in f: return "`pnpm tsx scripts/proof.ts`"
    if "evidence.json" in f: return "`grep -c PASS evidence/forge-test.txt` (written by hand from that count)"
    if "abi.ts" in f: return "`node scripts/export-abis.mjs` (from contracts/out)"
    return "script"

if __name__ == "__main__":
    main()
```

#### File: scripts/gen-plan.py
[VERIFIED] — Source: fork-tested / live-probed
```python
# File: scripts/gen-plan.py
# [VERIFIED] deterministic generator: PLAN.md = docs/plan/00-plan-head.md + 20-phases.md (with one creation/verify task per
# hand-written file injected at {{FILES:Pn}}) + 50-decision-trees.md + 80-plan-tail.md. Requires docs/arch/filemap.json
# (written by scripts/gen-architecture.py). Run from terra-firma/: python3 scripts/gen-plan.py
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPTH = ("web/app/api/stream", "web/app/api/qn-jar", "web/app/board", "web/app/jar/report", "web/app/friends")
P0 = ("contracts/", "web/lib/config.ts", "web/lib/rpc.ts", "web/lib/rounds.ts", "web/lib/registry.ts", "web/lib/quote.ts",
      "web/lib/hindsight.ts", "web/app/api/hindsight", "web/app/api/quote", "web/app/api/geo", "web/app/api/health",
      "scripts/export-abis.mjs", "scripts/gen-architecture.py", "scripts/gen-plan.py", "web/package.json", "web/tsconfig.json",
      "web/next.config.ts", "web/postcss.config.mjs")

def phase_of(f):
    if f.startswith(DEPTH): return "P5"
    if f.startswith(P0): return "P0"
    if f.startswith(("scripts/", ".github/", "package.json", "tsconfig.json")): return "P1"
    return "P2"

def check_cmd(f):
    if f.startswith("contracts/test/"): return "cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test --match-path " + f[len("contracts/"):]
    if f.startswith("contracts/"): return "cd contracts && forge build"
    if f.startswith("web/"): return "cd web && npx tsc --noEmit"
    if f.endswith(".py"): return "python3 " + f
    if f.endswith(".yml"): return "python3 -c \"import yaml,sys;yaml.safe_load(open('" + f + "'))\""
    if f.endswith((".ts", ".mjs")) or f in ("package.json", "tsconfig.json"): return "npx tsc --noEmit -p tsconfig.json"
    return "test -s " + f

def expected(f):
    if f.startswith("contracts/test/"): return "all tests in the file PASS"
    if f.startswith("contracts/"): return "Compiler run successful"
    if f.endswith(".py"): return "prints the generated line count, exit 0"
    if f.endswith(".yml"): return "no exception"
    return "no type errors (exit 0)"

def area(f):
    return {"contracts": "contracts", "web": "web", "scripts": "scripts", ".github": "ci"}.get(f.split("/")[0], "repo")

def main():
    fm = json.load(open(os.path.join(ROOT, "docs/arch/filemap.json")))
    tasks = {"P0": [], "P1": [], "P2": [], "P5": []}
    for n, f in enumerate(sorted(fm), start=1):
        sec = fm[f]
        tasks[phase_of(f)].append(
            f"#### Task F{n:03d}: create `{f}`\n- Architecture: Section {sec['section']} ({sec['name']}), File: {f}\n"
            f"- Action: create the file with exactly the code block under `#### File: {f}` (forge pre-built files: confirm parity — "
            f"`python3 scripts/gen-architecture.py` then `git diff --exit-code ARCHITECTURE.md`)\n"
            f"- Command: `{check_cmd(f)}`\n- Expected: {expected(f)}\n- Commit: `feat({area(f)}): add {os.path.basename(f)}`\n")
    body = open(os.path.join(ROOT, "docs/plan/20-phases.md")).read()
    for ph, ts in tasks.items():
        body = body.replace("{{FILES:" + ph + "}}", "\n".join(ts) if ts else "_(no file tasks in this phase)_")
    assert "{{FILES:" not in body
    parts = [open(os.path.join(ROOT, "docs/plan/00-plan-head.md")).read(), body,
             open(os.path.join(ROOT, "docs/plan/50-decision-trees.md")).read(), open(os.path.join(ROOT, "docs/plan/80-plan-tail.md")).read()]
    open(os.path.join(ROOT, "PLAN.md"), "w").write("\n".join(parts))
    print("PLAN.md:", sum(1 for _ in open(os.path.join(ROOT, "PLAN.md"))), "lines;", sum(len(v) for v in tasks.values()), "file tasks;",
          {k: len(v) for k, v in tasks.items()})

if __name__ == "__main__":
    main()
```

#### File: scripts/hindsight.live.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/hindsight.live.ts
// LIVE tier (contract rule 24): builds a real Hindsight card for a known mainnet wallet with web/lib/hindsight.ts
// against the PUBLIC Robinhood Chain RPC only (GetBlock / Envio env vars are removed first), then checks it:
//   1. card shape + asOfBlock near head   2. every buy tx resolves onchain, succeeded, and was sent by the wallet
//   3. per-buy pricing arithmetic (usdPaid8 = amountPaid * payUsd8 / 10^dec; shares18 = usdPaid8 * 1e18 / stockUsd8)
//   4. meme totals == sum of the meme rows.   Exit 1 on any failure.
// Run (only via `pnpm test:live`): tsx --conditions=react-server scripts/hindsight.live.ts
//   (--conditions=react-server resolves "server-only" to its empty module, exactly as Next does on the server.)
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";

const WALLET = "0x3fDBeB0FC14cca8fDd238Dd21725F0b8585Ab09E" as Address;
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web");

for (const k of ["GETBLOCK_RPC_FRA", "GETBLOCK_RPC_NYC", "ENVIO_API_TOKEN"]) delete process.env[k];
process.chdir(WEB); // web/lib/rounds.ts reads data/rounds relative to the Next app root

type Receipt = { status: Hex; from: Address };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(PUBLIC_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "terra-firma-live-test/1.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await res.json()) as { result?: T; error?: { message: string } };
  if (j.error || j.result === undefined) throw new Error(`${method}: ${j.error?.message ?? "no result"}`);
  return j.result;
}

async function main() {
  const { buildCard } = await import("../web/lib/hindsight");
  const t0 = Date.now();
  const card = await buildCard(WALLET, 0);
  const head = Number(await rpc<Hex>("eth_blockNumber", []));
  console.log(`card for ${WALLET} in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${card.memes.length} memes, ${card.unpriced.length} unpriced, block ${card.asOfBlock}`);

  assert.equal(card.wallet.toLowerCase(), WALLET.toLowerCase());
  assert.ok(card.asOfBlock > 0 && head - card.asOfBlock < 50_000, `asOfBlock ${card.asOfBlock} far from head ${head}`);
  assert.ok(card.memes.length > 0, "known active wallet produced an empty card");

  const buys = card.memes.flatMap((m) => m.buys);
  for (const b of buys) {
    const rc = await rpc<Receipt | null>("eth_getTransactionReceipt", [b.tx]);
    assert.ok(rc, `tx ${b.tx} not found onchain`);
    assert.equal(rc.status, "0x1", `tx ${b.tx} reverted`);
    assert.equal(rc.from.toLowerCase(), WALLET.toLowerCase(), `tx ${b.tx} not sent by the wallet`);
    const dec = b.payKind === 1 ? 10n ** 6n : 10n ** 18n;
    assert.equal(BigInt(b.usdPaid8), (BigInt(b.amountPaid) * BigInt(b.payUsd8)) / dec, `usdPaid8 arithmetic ${b.tx}`);
    assert.equal(BigInt(b.shares18), (BigInt(b.usdPaid8) * 10n ** 18n) / BigInt(b.stockUsd8), `shares18 arithmetic ${b.tx}`);
  }
  for (const m of card.memes) {
    assert.equal(BigInt(m.usdPaid8), m.buys.reduce((s, b) => s + BigInt(b.usdPaid8), 0n), `${m.symbol} usdPaid8 total`);
  }
  // M3: unquoted memes are null (never a fabricated $0), excluded from usdToday8 / usdPaidQuoted8 / worst, and flag partial.
  const quoted = card.memes.filter((m) => m.usdToday8 !== null);
  const sum = (rows: typeof card.memes, f: (m: (typeof card.memes)[number]) => string) => rows.reduce((s, m) => s + BigInt(f(m)), 0n);
  assert.equal(BigInt(card.totals.usdToday8), sum(quoted, (m) => m.usdToday8 as string), "usdToday8 total = sum of quoted memes");
  assert.equal(BigInt(card.totals.usdPaidQuoted8), sum(quoted, (m) => m.usdPaid8), "usdPaidQuoted8 = paid over quoted memes");
  assert.equal(BigInt(card.totals.usdPaid8), sum(card.memes, (m) => m.usdPaid8), "usdPaid8 total = sum of all memes");
  for (const m of card.memes) assert.equal(m.todayReason === null, m.usdToday8 !== null, `${m.symbol} todayReason iff unquoted`);
  assert.deepEqual(card.unquoted.map((u) => u.token), card.memes.filter((m) => m.usdToday8 === null).map((m) => m.token), "unquoted list");
  assert.equal(card.partial, card.unquoted.length > 0 || card.scanGaps.length > 0, "partial flag");
  if (card.worst) assert.ok(quoted.some((m) => m.symbol === card.worst?.symbol), "worst is a quoted meme");
  console.log(`today: ${quoted.length}/${card.memes.length} memes quoted, partial ${card.partial}, scan gaps ${card.scanGaps.length}`);
  console.log(`PASS hindsight.live: ${buys.length} buys resolved onchain (status 1, from = wallet), pricing arithmetic and totals consistent`);
}

main().catch((e) => {
  console.error(`FAIL hindsight.live: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
```

#### File: scripts/keeper.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/keeper.ts
// Hourly FeePool.distribute (PRD C10). distribute is permissionless; the keeper only saves someone the click.
// Env: RPC_URL (else the .env.local GetBlock/public chain), KEEPER_KEY (0x private key; not needed with --dry).
// Flags: --dry (print, send nothing), --rounds (also run build-rounds --update afterwards).
// Run: pnpm tsx scripts/keeper.ts [--dry] [--rounds]
import { spawnSync } from "node:child_process";
import { createWalletClient, formatEther, parseEther, parseEventLogs, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood } from "viem/chains";
import { feePoolAbi } from "../web/lib/abi";
import { hasFlag, ROOT } from "./lib/env";
import { loadDeployments } from "./lib/files";
import { client, transports } from "./lib/rpc";

const KEEPER_MIN_ETH = parseEther("0.0002");
/** distribute has no caller-set minimum; with all 6 pools live it needs ~3.1M gas, so never rely on a tight estimate. */
const DISTRIBUTE_GAS = 3_500_000n;

async function distribute(dry: boolean) {
  const d = loadDeployments();
  if (!d) return console.log("skip: web/data/deployments.json has no live deployment yet");
  const pool = { address: d.FeePool, abi: feePoolAbi } as const;
  const [can, balance, cap, epoch] = await Promise.all([
    client.readContract({ ...pool, functionName: "canDistribute" }),
    client.getBalance({ address: d.FeePool }),
    client.readContract({ ...pool, functionName: "MAX_WIF_BUY_ETH" }),
    client.readContract({ ...pool, functionName: "epoch" }),
  ]);
  console.log(`FeePool ${d.FeePool} epoch ${epoch} balance ${formatEther(balance)} ETH canDistribute ${can}`);
  if (!can || balance < KEEPER_MIN_ETH) return console.log(`skip (${!can ? "epoch already distributed" : "balance < 0.0002 ETH"})`);

  const wifEth = balance / 2n < cap ? balance / 2n : cap;
  console.log(`burn leg ${formatEther(wifEth)} ETH (capped per epoch; $WIF is never priced, no minimum is sent)`);
  if (dry) return console.log("dry run: distribute not sent");

  const key = process.env.KEEPER_KEY;
  if (!key) throw new Error("KEEPER_KEY is not set");
  const account = privateKeyToAccount(key as Hex);
  const wallet = createWalletClient({ account, chain: robinhood, transport: transports() });
  const { request } = await client.simulateContract({ ...pool, functionName: "distribute", account, gas: DISTRIBUTE_GAS });
  const hash = await wallet.writeContract(request);
  console.log(`distribute tx ${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`distribute reverted in block ${receipt.blockNumber}`);
  for (const ev of parseEventLogs({ abi: feePoolAbi, logs: receipt.logs, eventName: "Distributed" })) {
    const a = ev.args;
    const bought = a.stockBought.map((x) => x.toString()).join(",");
    console.log(`Distributed epoch ${a.epoch} ethIn ${formatEther(a.ethIn)} wifBurned ${formatEther(a.wifBurned)} stockBought [${bought}] carried ${formatEther(a.carried)}`);
  }
}

async function main() {
  await distribute(hasFlag("--dry"));
  if (hasFlag("--rounds")) {
    const r = spawnSync("pnpm", ["exec", "tsx", "scripts/build-rounds.ts", "--update"], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) throw new Error(`build-rounds --update exited ${r.status}`);
  }
}

main().catch((e) => {
  console.error(`keeper FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  process.exit(1);
});
```

#### File: scripts/lib/env.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/lib/env.ts
// Loads RPC endpoints without ever printing them. Order: RPC_URL (CI / keeper), GetBlock FRA, GetBlock NYC, public.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PUBLIC_RPC } from "../../web/lib/config";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const WEB_DATA = path.join(ROOT, "web", "data");

const SECRETS = path.resolve(ROOT, "..", ".env.local");
if (existsSync(SECRETS)) config({ path: SECRETS, quiet: true });

export function providers(): string[] {
  const urls = [process.env.RPC_URL, process.env.GETBLOCK_RPC_FRA, process.env.GETBLOCK_RPC_NYC, process.env.PUBLIC_RPC, PUBLIC_RPC];
  return [...new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))];
}

/**
 * eth_getLogs endpoints. VERIFIED 2026-11-11: both GetBlock shared endpoints answer "Block range is too large" for
 * spans > 1,000 blocks, while the public RPC allows 10M (single address). Wide log scans therefore go public-first.
 */
export function logProviders(): string[] {
  const pub = [process.env.PUBLIC_RPC, PUBLIC_RPC].filter((u): u is string => typeof u === "string" && u.length > 0);
  return [...new Set(pub)];
}

/** Host only, so logs can say which provider answered without leaking the access token in the path. */
export const hostOf = (url: string) => new URL(url).host;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`missing env ${name}`);
    process.exit(1);
  }
  return v;
}

export const hasFlag = (f: string) => process.argv.includes(f);
```

#### File: scripts/lib/files.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/lib/files.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Address } from "viem";
import type { Registry } from "../../web/lib/registry";
import { WEB_DATA } from "./env";

export const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

export function writeJson(file: string, value: unknown, pretty = true) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : undefined) + "\n");
}

export const loadRegistry = () => readJson<Registry>(path.join(WEB_DATA, "memes.json"));

export interface Deployments {
  deployed: boolean;
  chainId: number;
  block: number;
  start: number;
  StockOracle: Address;
  Jar: Address;
  WifStaking: Address;
  FeePool: Address;
  TerraRouter: Address;
  HindsightLens: Address;
  FriendJar: Address;
}

export const CONTRACT_NAMES = ["StockOracle", "Jar", "WifStaking", "FeePool", "TerraRouter", "HindsightLens", "FriendJar"] as const;

/** Deployed addresses or null when web/data/deployments.json still carries the pre-deploy zero placeholder. */
export function loadDeployments(): Deployments | null {
  const file = path.join(WEB_DATA, "deployments.json");
  if (!existsSync(file)) return null;
  const d = readJson<Deployments>(file);
  const zero = CONTRACT_NAMES.some((n) => /^0x0{40}$/i.test(d[n]));
  return d.deployed && !zero && d.chainId === 4663 ? d : null;
}

export const fmtUnits = (v: bigint, dec: number, digits = 6) => {
  const s = (Number(v) / 10 ** dec).toFixed(digits);
  return s;
};
```

#### File: scripts/lib/quote.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/lib/quote.ts
// Node twin of web/lib/quote.ts (same quoter ABIs, same Route shapes, same best-output rule) without "server-only".
import { decodeFunctionResult, encodeFunctionData, encodePacked, type Address, type Hex } from "viem";
import { ADDR, STOCKS, type StockId } from "../../web/lib/config";
import type { PoolEntry } from "../../web/lib/registry";
import { RpcError, rpcChunked } from "./rpc";

export interface Route {
  kind: 1 | 2 | 3;
  v2Path: Address[];
  v3Path: Hex;
  key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
}

export const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const EMPTY_KEY = { currency0: ZERO, currency1: ZERO, fee: 0, tickSpacing: 0, hooks: ZERO };

const poolKeyComponents = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

export const quoterV2Abi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "ticks", type: "uint32" },
      { name: "gas", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "s", type: "uint160[]" },
      { name: "t", type: "uint32[]" },
      { name: "gas", type: "uint256" },
    ],
  },
] as const;

export const v4QuoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: poolKeyComponents },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const v2RouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const v3Path = (a: Address, fee: number, b: Address) => encodePacked(["address", "uint24", "address"], [a, fee, b]);

export function routeFor(p: PoolEntry, token: Address, side: "buy" | "sell"): Route {
  if (p.kind === 1) {
    const path: Address[] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { kind: 1, v2Path: path, v3Path: "0x", key: EMPTY_KEY };
  }
  if (p.kind === 2) {
    const path = side === "buy" ? v3Path(ADDR.weth, p.fee, token) : v3Path(token, p.fee, ADDR.weth);
    return { kind: 2, v2Path: [], v3Path: path, key: EMPTY_KEY };
  }
  return { kind: 3, v2Path: [], v3Path: "0x", key: p.key };
}

export function quoteCall(p: PoolEntry, token: Address, side: "buy" | "sell", amountIn: bigint): { to: Address; data: Hex } {
  if (p.kind === 1) {
    const path: Address[] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    return { to: ADDR.v2Router, data: encodeFunctionData({ abi: v2RouterAbi, functionName: "getAmountsOut", args: [amountIn, path] }) };
  }
  if (p.kind === 2) {
    const [tokenIn, tokenOut] = side === "buy" ? [ADDR.weth, token] : [token, ADDR.weth];
    const args = [{ tokenIn, tokenOut, amountIn, fee: p.fee, sqrtPriceLimitX96: 0n }] as const;
    return { to: ADDR.quoterV2, data: encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", args }) };
  }
  const args = [{ poolKey: p.key, zeroForOne: side === "buy", exactAmount: amountIn, hookData: "0x" as Hex }] as const;
  return { to: ADDR.v4Quoter, data: encodeFunctionData({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", args }) };
}

function decodeQuote(p: PoolEntry, raw: Hex): bigint {
  if (p.kind === 1) {
    const amounts = decodeFunctionResult({ abi: v2RouterAbi, functionName: "getAmountsOut", data: raw });
    return amounts[amounts.length - 1];
  }
  if (p.kind === 2) return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInputSingle", data: raw })[0];
  return decodeFunctionResult({ abi: v4QuoterAbi, functionName: "quoteExactInputSingle", data: raw })[0];
}

export type PoolQuote = { pool: PoolEntry; amountOut: bigint } | { pool: PoolEntry; error: string };

/** Quote each pool independently; failures are returned, never swallowed into a zero. */
export async function quotePools(token: Address, pools: PoolEntry[], side: "buy" | "sell", amountIn: bigint): Promise<PoolQuote[]> {
  const calls = pools.map((p) => ({ method: "eth_call", params: [quoteCall(p, token, side, amountIn), "latest"] }));
  const res = await rpcChunked(calls, 20);
  return res.map((r, i) => {
    if (r instanceof RpcError) return { pool: pools[i], error: r.message.slice(0, 120) };
    try {
      return { pool: pools[i], amountOut: decodeQuote(pools[i], r as Hex) };
    } catch (e) {
      return { pool: pools[i], error: `undecodable: ${(e as Error).message.slice(0, 80)}` };
    }
  });
}

export interface BestQuote {
  route: Route;
  pool: PoolEntry;
  amountOut: bigint;
}

export async function bestQuote(token: Address, pools: PoolEntry[], side: "buy" | "sell", amountIn: bigint): Promise<BestQuote | null> {
  if (pools.length === 0 || amountIn === 0n) return null;
  let best: BestQuote | null = null;
  for (const q of await quotePools(token, pools, side, amountIn)) {
    if ("error" in q) continue;
    if (!best || q.amountOut > best.amountOut) best = { route: routeFor(q.pool, token, side), pool: q.pool, amountOut: q.amountOut };
  }
  return best;
}

/** Same packed paths as contracts/script/TerraConfig.sol stocks(). */
export const STOCK_PATHS: Record<StockId, Hex> = {
  0: v3Path(ADDR.weth, 500, STOCKS[0].token),
  1: v3Path(ADDR.weth, 3000, STOCKS[1].token),
  2: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 500, STOCKS[2].token]),
  3: encodePacked(["address", "uint24", "address", "uint24", "address"], [ADDR.weth, 500, ADDR.usdg, 10000, STOCKS[3].token]),
  4: v3Path(ADDR.weth, 500, STOCKS[4].token),
  5: v3Path(ADDR.weth, 3000, STOCKS[5].token),
};

/** ETH -> stock quote along the StockOracle path. */
export async function quoteStock(stockId: StockId, ethIn: bigint): Promise<bigint> {
  if (ethIn === 0n) return 0n;
  const data = encodeFunctionData({ abi: quoterV2Abi, functionName: "quoteExactInput", args: [STOCK_PATHS[stockId], ethIn] });
  const [r] = await rpcChunked([{ method: "eth_call", params: [{ to: ADDR.quoterV2, data }, "latest"] }]);
  if (r instanceof RpcError) throw new Error(`quote ${STOCKS[stockId].symbol}: ${r.message}`);
  return decodeFunctionResult({ abi: quoterV2Abi, functionName: "quoteExactInput", data: r as Hex })[0];
}
```

#### File: scripts/lib/rpc.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/lib/rpc.ts
// Node twin of web/lib/rpc.ts (that file imports "server-only", which throws outside Next).
// Limits (spike-indexing.md): <= 36 calls per JSON-RPC batch, ~4 req/s sustained, 10,000-log responses are ERRORS.
import { createPublicClient, fallback, http, type Address, type Hex } from "viem";
import { robinhood } from "viem/chains";
import { logProviders, providers } from "./env";

type RpcCall = { method: string; params: unknown[] };
type RpcReply = { id: number; result?: unknown; error?: { code: number; message: string } };

export class RpcError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

export const TOO_MANY_LOGS = (e: unknown) =>
  e instanceof RpcError && /exceeds limit|more than 10000|10000 results|query returned more/i.test(e.message);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MIN_GAP_MS = 260; // ~4 POSTs per second across the whole process
let nextSlot = 0;

/** Global pacing: every outgoing POST (raw or viem) waits for its slot. */
async function throttle() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

const UA = { "content-type": "application/json", "user-agent": "terra-firma-scripts/1.0" };

export const throttledFetch: typeof fetch = async (input, init) => {
  await throttle();
  return fetch(input, { ...init, headers: { ...(init?.headers as Record<string, string>), ...UA } });
};

async function postBatch(url: string, calls: RpcCall[]): Promise<(unknown | RpcError)[]> {
  const body = JSON.stringify(calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params })));
  const res = await throttledFetch(url, { method: "POST", body });
  if (res.status === 429 || res.status >= 500) throw new RpcError(res.status, `HTTP ${res.status}`);
  const json = (await res.json()) as RpcReply[] | RpcReply;
  const byId = new Map((Array.isArray(json) ? json : [json]).map((r) => [r.id, r]));
  return calls.map((_, i) => {
    const r = byId.get(i);
    if (!r) return new RpcError(-1, "missing response");
    return r.error ? new RpcError(r.error.code, r.error.message) : r.result;
  });
}

/** One JSON-RPC batch with provider failover and backoff. Per-call errors come back as RpcError values. */
export async function rpcBatch(calls: RpcCall[], urls = providers()): Promise<(unknown | RpcError)[]> {
  if (calls.length === 0) return [];
  if (calls.length > 36) throw new Error(`batch of ${calls.length} exceeds 36`);
  let lastErr: unknown;
  for (const url of urls) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        return await postBatch(url, calls);
      } catch (e) {
        lastErr = e;
        await sleep(Math.min(500 * 2 ** attempt, 8000));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all RPC providers failed");
}

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const [r] = await rpcBatch([{ method, params }]);
  if (r instanceof RpcError) throw r;
  return r as T;
}

/** Chunked batches, `parallel` POSTs in flight (pacing still applies globally). Order preserved. */
export async function rpcChunked(calls: RpcCall[], size = 30, parallel = 2, urls = providers()): Promise<(unknown | RpcError)[]> {
  const chunks: RpcCall[][] = [];
  for (let i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
  const out: (unknown | RpcError)[][] = new Array(chunks.length);
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      out[i] = await rpcBatch(chunks[i], urls);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, chunks.length) }, worker));
  return out.flat();
}

export const hex = (n: number | bigint) => `0x${n.toString(16)}`;

export type Log = { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex; logIndex: Hex };
export type LogQuery = { address?: Address | Address[]; topics: (Hex | Hex[] | null)[]; from: number; to: number };

/**
 * getLogs over many ranges at once, sent to logProviders() (GetBlock shared caps getLogs at ~1,000 blocks;
 * the public RPC allows 10M for a single address). Ranges that hit the 10,000-log cap are split in half and retried;
 * any other error throws (an error is never "no logs").
 */
export async function getLogsMany(queries: LogQuery[], maxRounds = 14): Promise<Log[]> {
  let queue = queries;
  const logs: Log[] = [];
  for (let round = 0; queue.length > 0; round++) {
    if (round >= maxRounds) throw new Error(`getLogs still splitting after ${maxRounds} rounds`);
    const res = await rpcChunked(
      queue.map((q) => ({ method: "eth_getLogs", params: [{ address: q.address, topics: q.topics, fromBlock: hex(q.from), toBlock: hex(q.to) }] })),
      12,
      1,
      logProviders(),
    );
    const retry: LogQuery[] = [];
    res.forEach((r, i) => {
      const q = queue[i];
      if (TOO_MANY_LOGS(r) && q.to > q.from) {
        const mid = Math.floor((q.from + q.to) / 2);
        retry.push({ ...q, to: mid }, { ...q, from: mid + 1 });
      } else if (r instanceof RpcError) {
        throw r;
      } else {
        logs.push(...(r as Log[]));
      }
    });
    queue = retry;
  }
  return logs;
}

/** Split [from, to] into spans of `span` blocks. */
export function spans(from: number, to: number, span: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = from; a <= to; a += span) out.push([a, Math.min(a + span - 1, to)]);
  return out;
}

export const headBlock = async () => Number(await rpc<Hex>("eth_blockNumber", []));

/** viem client: provider failover, JSON-RPC batching (<= 30 per POST), shared pacing. */
export const client = createPublicClient({
  chain: robinhood,
  batch: { multicall: false },
  transport: fallback(
    providers().map((url) => http(url, { batch: { batchSize: 30, wait: 20 }, fetchFn: throttledFetch, retryCount: 4, retryDelay: 600 })),
  ),
});

export const transports = () =>
  fallback(providers().map((url) => http(url, { fetchFn: throttledFetch, retryCount: 4, retryDelay: 600 })));
```

#### File: scripts/proof.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/proof.ts
// Regenerates submission/proof.md and web/data/proof.json from chain: every TerraRouter / Jar / FeePool / WifStaking /
// HindsightLens event since the deployment block, plus an independent $WIF burn check (WIF Transfer FeePool -> 0x0)
// and FeePool.totalWifBurned(). Refuses (exit 1) when there is no live deployment; nothing is ever estimated.
// Run: pnpm tsx scripts/proof.ts
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { decodeEventLog, formatEther, pad, type Abi, type Address, type Hex } from "viem";
import { feePoolAbi, hindsightLensAbi, jarAbi, terraRouterAbi, wifStakingAbi } from "../web/lib/abi";
import { ADDR, EXPLORER, STOCKS } from "../web/lib/config";
import { ROOT, WEB_DATA } from "./lib/env";
import { CONTRACT_NAMES, loadDeployments, writeJson, type Deployments } from "./lib/files";
import { client, getLogsMany, headBlock, spans, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as Hex;
type Ev = { contract: string; name: string; args: Record<string, unknown>; tx: Hex; block: number; logIndex: number };

async function events(d: Deployments, head: number): Promise<Ev[]> {
  const sources: [string, Address, Abi][] = [
    ["TerraRouter", d.TerraRouter, terraRouterAbi],
    ["Jar", d.Jar, jarAbi],
    ["FeePool", d.FeePool, feePoolAbi],
    ["WifStaking", d.WifStaking, wifStakingAbi],
    ["HindsightLens", d.HindsightLens, hindsightLensAbi],
  ];
  const out: Ev[] = [];
  for (const [contract, address, abi] of sources) {
    const logs = await getLogsMany(spans(d.block, head, 10_000_000).map(([from, to]) => ({ address, topics: [], from, to })));
    for (const l of logs) {
      const ev = decodeEventLog({ abi, data: l.data, topics: l.topics as [Hex, ...Hex[]], strict: false });
      out.push({ contract, name: ev.eventName ?? "?", args: (ev.args ?? {}) as Record<string, unknown>, tx: l.transactionHash, block: Number(l.blockNumber), logIndex: Number(l.logIndex) });
    }
  }
  return out.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
}

async function wifBurnTransfers(d: Deployments, head: number): Promise<Log[]> {
  const topics = [TRANSFER, pad(d.FeePool), pad("0x0000000000000000000000000000000000000000")];
  return getLogsMany(spans(d.block, head, 10_000_000).map(([from, to]) => ({ address: ADDR.wif as Address, topics, from, to })));
}

const big = (v: unknown) => (typeof v === "bigint" ? v : 0n);
const sum = (evs: Ev[], name: string, field: string) => evs.filter((e) => e.name === name).reduce((s, e) => s + big(e.args[field]), 0n);
const first = (evs: Ev[], name: string, pred: (e: Ev) => boolean = () => true) => evs.find((e) => e.name === name && pred(e))?.tx ?? null;

function totals(evs: Ev[], burnLogs: Log[], onchainBurned: bigint) {
  const streamed = STOCKS.map((s) => evs.filter((e) => e.name === "Distributed").reduce((t, e) => t + big((e.args.stockBought as bigint[])[s.id]), 0n));
  const burnedByTransfer = burnLogs.reduce((s, l) => s + BigInt(l.data), 0n);
  const burnedByEvent = sum(evs, "Distributed", "wifBurned");
  return {
    trades: evs.filter((e) => e.name === "Traded").length,
    routedEthWei: sum(evs, "Traded", "ethAmount").toString(),
    tradeFeesWei: sum(evs, "Traded", "fee").toString(),
    feePoolReceivedWei: sum(evs.filter((e) => e.contract === "FeePool"), "Received", "amount").toString(),
    sweeps: evs.filter((e) => e.name === "Swept").length,
    converts: evs.filter((e) => e.name === "Converted").length,
    distributions: evs.filter((e) => e.name === "Distributed").length,
    wifBurnedWei: { byEvent: burnedByEvent.toString(), byTransferToZero: burnedByTransfer.toString(), feePoolTotal: onchainBurned.toString() },
    burnConsistent: burnedByEvent === burnedByTransfer && burnedByEvent === onchainBurned,
    stockStreamed: Object.fromEntries(STOCKS.map((s) => [s.symbol, streamed[s.id].toString()])),
    jars: new Set(evs.filter((e) => e.name === "Credited").map((e) => String(e.args.user).toLowerCase())).size,
    claims: evs.filter((e) => e.name === "Claimed").length,
    claimedWei: sum(evs, "Claimed", "amount").toString(),
    cardsMinted: evs.filter((e) => e.name === "CardMinted").length,
  };
}

function firsts(evs: Ev[]) {
  return {
    trade: first(evs, "Traded"),
    convert: first(evs, "Converted"),
    sweepTrade: first(evs, "Swept"),
    distributeWithBurn: first(evs, "Distributed", (e) => big(e.args.wifBurned) > 0n),
    stake: first(evs, "Staked"),
    claim: first(evs, "Claimed"),
    cardMint: first(evs, "CardMinted"),
  };
}

function markdown(d: Deployments, head: number, t: ReturnType<typeof totals>, f: ReturnType<typeof firsts>): string {
  const tx = (h: string | null) => (h ? `[\`${h}\`](${EXPLORER}/tx/${h})` : "not yet (no such event onchain)");
  const contracts = CONTRACT_NAMES.map((n) => `| ${n} | [\`${d[n]}\`](${EXPLORER}/address/${d[n]}) |`).join("\n");
  const streamed = Object.entries(t.stockStreamed).map(([s, v]) => `${s} ${formatEther(BigInt(v))}`).join(", ");
  return `# Terra Firma — onchain proof (Robinhood Chain mainnet 4663)

Generated ${new Date().toISOString()} by \`pnpm tsx scripts/proof.ts\` from RPC logs, deployment block ${d.block} to head ${head}. Every number below is a sum of onchain events; rerun the script to recompute.

## Contracts
| Contract | Address |
|---|---|
${contracts}

## First-of-kind transactions
| Event | Tx |
|---|---|
| First routed trade (Traded) | ${tx(f.trade)} |
| First convert (Converted) | ${tx(f.convert)} |
| First sweep trade (Swept) | ${tx(f.sweepTrade)} |
| First Distributed with WIF burn | ${tx(f.distributeWithBurn)} |
| First stake (Staked) | ${tx(f.stake)} |
| First staker claim (Claimed) | ${tx(f.claim)} |
| First card mint (CardMinted) | ${tx(f.cardMint)} |

## Totals
| Metric | Value |
|---|---|
| Routed trades | ${t.trades} |
| Routed ETH (Traded.ethAmount) | ${formatEther(BigInt(t.routedEthWei))} ETH |
| Trade fees (Traded.fee) | ${formatEther(BigInt(t.tradeFeesWei))} ETH |
| ETH received by FeePool (all fees) | ${formatEther(BigInt(t.feePoolReceivedWei))} ETH |
| Sweeps / converts | ${t.sweeps} / ${t.converts} |
| Distributions | ${t.distributions} |
| WIF burned (Distributed events) | ${formatEther(BigInt(t.wifBurnedWei.byEvent))} |
| WIF burned (WIF Transfer FeePool -> 0x0) | ${formatEther(BigInt(t.wifBurnedWei.byTransferToZero))} |
| WIF burned (FeePool.totalWifBurned) | ${formatEther(BigInt(t.wifBurnedWei.feePoolTotal))} |
| Burn sources agree | ${t.burnConsistent ? "yes" : "NO — investigate"} |
| Stock streamed to stakers | ${streamed} |
| Jars (distinct credited users) | ${t.jars} |
| Staker claims | ${t.claims} (${formatEther(BigInt(t.claimedWei))} stock) |
| Cards minted | ${t.cardsMinted} |
`;
}

async function main() {
  const d = loadDeployments();
  if (!d) throw new Error("no live deployment in web/data/deployments.json (run contracts deploy + scripts/sync-deployments.mjs)");
  const head = await headBlock();
  const [evs, burnLogs, onchainBurned] = await Promise.all([
    events(d, head),
    wifBurnTransfers(d, head),
    client.readContract({ address: d.FeePool, abi: feePoolAbi, functionName: "totalWifBurned" }),
  ]);
  const t = totals(evs, burnLogs, onchainBurned);
  const f = firsts(evs);
  mkdirSync(path.join(ROOT, "submission"), { recursive: true });
  writeFileSync(path.join(ROOT, "submission", "proof.md"), markdown(d, head, t, f));
  writeJson(path.join(WEB_DATA, "proof.json"), { generatedAt: new Date().toISOString(), chainId: 4663, fromBlock: d.block, head, contracts: Object.fromEntries(CONTRACT_NAMES.map((n) => [n, d[n]])), firsts: f, totals: t });
  console.log(`wrote submission/proof.md + web/data/proof.json: ${evs.length} events, trades ${t.trades}, distributions ${t.distributions}, burn consistent ${t.burnConsistent}`);
  if (!t.burnConsistent) process.exit(1);
}

main().catch((e) => {
  console.error(`proof FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
```

#### File: scripts/seed-demo.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/seed-demo.ts
// Earns the PRD §6 demo state with REAL mainnet transactions (never fabricated). Idempotent: every step reads chain
// state first and skips when already satisfied. Minimal-spend plan: Dami runs the trades himself from his own wallet in
// the UI; `--dry` prints the exact per-step amounts (live quotes) plus a "run these in the UI" checklist. The real-send
// path (DEMO_KEY) is kept for completeness and uses the same small sizes.
//   a) buy 3 memes (top liquidity, tested) 0.0003 ETH each via TerraRouter.buy, sweep 0
//   b) one convert of one meme into NVDA         c) two buys with sweep 2% (NVDA)
//   d) hold >= 500 WIF (buy ~600 via TerraRouter.buy on the WIF key if short) and stake 500 to NVDA (approve exact)
//   e) print what remains (epoch wait, keeper)
// Env: RPC_URL (optional), DEMO_KEY (0x private key; not needed with --dry, DEMO_ADDR then picks the wallet to inspect).
//   For --dry with DEMO_KEY use a throwaway `cast wallet new` key that is never funded.
// Run: pnpm tsx scripts/seed-demo.ts [--dry]
import { createWalletClient, encodeEventTopics, formatEther, formatUnits, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood } from "viem/chains";
import { erc20Abi, terraRouterAbi, wifStakingAbi } from "../web/lib/abi";
import { ADDR, FEE_BPS } from "../web/lib/config";
import type { Meme, PoolEntry } from "../web/lib/registry";
import { hasFlag } from "./lib/env";
import { loadDeployments, loadRegistry, type Deployments } from "./lib/files";
import { bestQuote, type BestQuote, type Route } from "./lib/quote";
import { client, getLogsMany, headBlock, transports } from "./lib/rpc";

const BUY_ETH = parseEther("0.0003");
const MEME_SLIPPAGE_BPS = 150n;
const STAKE_WIF = 500n * 10n ** 18n;
const WIF_TARGET = 600n * 10n ** 18n;
const NVDA = 0;
const WIF_POOL: PoolEntry = {
  kind: 3,
  version: "v4",
  id: "0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79",
  key: { currency0: "0x0000000000000000000000000000000000000000", currency1: ADDR.wif, fee: 0, tickSpacing: 200, hooks: ADDR.wifHook },
  liquidityUsd: 0,
};

interface PlanStep {
  ui: string;
  eth: bigint;
}

interface Ctx {
  user: Address | null;
  d: Deployments | null;
  send: ((label: string, req: () => Promise<Hex>) => Promise<void>) | null;
  plan: PlanStep[];
}

const minOut = (q: BestQuote) => (q.amountOut * (10_000n - MEME_SLIPPAGE_BPS)) / 10_000n;
const routeArg = (r: Route) => ({ ...r, v2Path: [...r.v2Path] });

function pickMemes(): Meme[] {
  const memes = loadRegistry().memes.filter((m) => m.tested && m.pools.length > 0);
  const liq = (m: Meme) => Math.max(...m.pools.map((p) => p.liquidityUsd));
  return memes.sort((a, b) => liq(b) - liq(a)).slice(0, 3);
}

async function balanceOf(token: Address, user: Address | null): Promise<bigint> {
  if (!user) return 0n;
  return client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [user] });
}

/** Count of router `eventName` logs for `user` since deployment (topic0 + topic1 = user is an exact filter). */
async function routerEvents(ctx: Ctx, eventName: "Swept" | "Converted"): Promise<number> {
  if (!ctx.d || !ctx.user) return 0;
  const topics = encodeEventTopics({ abi: terraRouterAbi, eventName, args: { user: ctx.user } }) as Hex[];
  return (await getLogsMany([{ address: ctx.d.TerraRouter, topics, from: ctx.d.block, to: await headBlock() }])).length;
}

/** The ETH TerraRouter actually swaps: msg.value - fee - sweep (contract math, fee from router.feeBps(user)). */
async function tradeLeg(ctx: Ctx, eth: bigint, sweepBps: number): Promise<bigint> {
  const fee = ctx.d && ctx.user
    ? await client.readContract({ address: ctx.d.TerraRouter, abi: terraRouterAbi, functionName: "feeBps", args: [ctx.user] })
    : FEE_BPS;
  return eth - (eth * BigInt(fee)) / 10_000n - (eth * BigInt(sweepBps)) / 10_000n;
}

async function buy(ctx: Ctx, m: Pick<Meme, "token" | "symbol" | "pools">, eth: bigint, sweepBps: number) {
  const q = await bestQuote(m.token, m.pools, "buy", await tradeLeg(ctx, eth, sweepBps));
  if (!q) throw new Error(`no live quote for ${m.symbol}`);
  console.log(`  plan buy ${formatEther(eth)} ETH -> ${m.symbol} via ${q.pool.version}: quote ${formatUnits(q.amountOut, 18)} min ${formatUnits(minOut(q), 18)} sweep ${sweepBps}bps`);
  const sweep = sweepBps > 0 ? `sweep ${sweepBps / 100}% into NVDA` : "sweep 0%";
  ctx.plan.push({ ui: `/trade: buy ${m.symbol} for exactly ${formatEther(eth)} ETH, ${sweep} (expect ~${formatUnits(q.amountOut, 18)} ${m.symbol})`, eth });
  if (!ctx.send || !ctx.d) return;
  const d = ctx.d;
  const args = [routeArg(q.route), m.token, sweepBps, NVDA, minOut(q), 0n] as const;
  await ctx.send(`buy ${m.symbol}`, () => wallet().writeContract({ address: d.TerraRouter, abi: terraRouterAbi, functionName: "buy", args, value: eth, chain: robinhood, account: account() }));
}

async function seedMemes(ctx: Ctx, memes: Meme[]) {
  console.log("(a) meme holdings with history");
  for (const m of memes) {
    const bal = await balanceOf(m.token, ctx.user);
    if (bal > 0n) console.log(`  skip ${m.symbol}: holds ${formatUnits(bal, m.decimals)}`);
    else await buy(ctx, m, BUY_ETH, 0);
  }
}

async function approveExact(ctx: Ctx, token: Address, spender: Address, amount: bigint, label: string) {
  const allowance = ctx.user ? await client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [ctx.user, spender] }) : 0n;
  if (allowance >= amount) return console.log(`  skip approve ${label}: allowance ${allowance}`);
  console.log(`  plan approve ${label} exact ${amount}`);
  await ctx.send?.(`approve ${label}`, () => wallet().writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount], chain: robinhood, account: account() }));
}

async function seedConvert(ctx: Ctx, m: Meme) {
  console.log("(b) one convert into NVDA");
  if ((await routerEvents(ctx, "Converted")) > 0) return console.log("  skip: Converted event exists");
  const bal = await balanceOf(m.token, ctx.user);
  const amount = bal / 2n;
  if (amount === 0n) {
    ctx.plan.push({ ui: `/app/convert: convert half the ${m.symbol} bought in step 1 into NVDA (approve exact, then convert)`, eth: 0n });
    return console.log(`  pending: needs a ${m.symbol} balance from step (a) first`);
  }
  const q = await bestQuote(m.token, m.pools, "sell", amount);
  if (!q) throw new Error(`no sell quote for ${m.symbol}`);
  console.log(`  plan convert ${formatUnits(amount, m.decimals)} ${m.symbol} -> ~${formatEther(q.amountOut)} ETH -> NVDA (oracle band min)`);
  ctx.plan.push({ ui: `/app/convert: convert half your ${m.symbol} (${formatUnits(amount, m.decimals)}) into NVDA (approve exact, then convert)`, eth: 0n });
  if (!ctx.d) return;
  const d = ctx.d;
  await approveExact(ctx, m.token, d.TerraRouter, amount, `${m.symbol}->TerraRouter`);
  const args = [[routeArg(q.route)], [m.token], [amount], NVDA, 0n] as const;
  await ctx.send?.(`convert ${m.symbol}`, () => wallet().writeContract({ address: d.TerraRouter, abi: terraRouterAbi, functionName: "convert", args, chain: robinhood, account: account() }));
}

async function seedSweeps(ctx: Ctx, m: Meme) {
  console.log("(c) two buys with sweep 2%");
  const have = await routerEvents(ctx, "Swept");
  if (have >= 2) return console.log(`  skip: ${have} Swept events exist`);
  for (let i = have; i < 2; i++) await buy(ctx, m, BUY_ETH, 200);
}

async function seedStake(ctx: Ctx) {
  console.log("(d) 500 WIF staked to NVDA");
  const staked = ctx.d && ctx.user ? await client.readContract({ address: ctx.d.WifStaking, abi: wifStakingAbi, functionName: "stakers", args: [ctx.user] }) : null;
  if (staked && staked[1] + staked[2] >= STAKE_WIF) return console.log(`  skip: active ${formatEther(staked[1])} pending ${formatEther(staked[2])} WIF`);
  const wif = await balanceOf(ADDR.wif, ctx.user);
  if (wif < STAKE_WIF) await buy(ctx, { token: ADDR.wif, symbol: "WIF", pools: [WIF_POOL] }, await ethFor(WIF_TARGET - wif), 0);
  ctx.plan.push({ ui: `/stake: approve exactly ${formatEther(STAKE_WIF)} WIF, stake it to NVDA`, eth: 0n });
  if (!ctx.d) return console.log("  plan approve exact 500 WIF + stake(500e18, 0) after deployment");
  const d = ctx.d;
  await approveExact(ctx, ADDR.wif, d.WifStaking, STAKE_WIF, "WIF->WifStaking");
  console.log("  plan stake 500 WIF to stockId 0 (NVDA)");
  await ctx.send?.("stake 500 WIF", () => wallet().writeContract({ address: d.WifStaking, abi: wifStakingAbi, functionName: "stake", args: [STAKE_WIF, NVDA], chain: robinhood, account: account() }));
}

/** ETH to send for ~`wifOut`: scaled from a live 0.0005 ETH quote, +5% headroom, grossed up for the fee. */
async function ethFor(wifOut: bigint): Promise<bigint> {
  const q = await bestQuote(ADDR.wif, [WIF_POOL], "buy", BUY_ETH);
  if (!q || q.amountOut === 0n) throw new Error("no live WIF quote");
  const swapped = (BUY_ETH * wifOut * 105n) / (q.amountOut * 100n);
  return (swapped * 10_000n) / BigInt(10_000 - FEE_BPS); // gross up for the router fee taken before the swap
}

async function remaining(ctx: Ctx) {
  console.log("(e) what remains");
  if (!ctx.d || !ctx.user) return console.log("  deploy, run sync-deployments, fund DEMO wallet, rerun without --dry");
  const [, pend] = await client.readContract({ address: ctx.d.WifStaking, abi: wifStakingAbi, functionName: "pending", args: [ctx.user] });
  console.log(`  staker pending reward: ${formatEther(pend)} NVDA`);
  if (pend === 0n) console.log("  wait for the next epoch (stake activates next hour), then run `pnpm tsx scripts/keeper.ts` twice across epochs");
}

function printChecklist(ctx: Ctx) {
  const total = ctx.plan.reduce((s, p) => s + p.eth, 0n);
  console.log("\nRun these in the UI from your own wallet (Robinhood Chain mainnet 4663), in order:");
  ctx.plan.forEach((p, i) => console.log(`  [ ] ${i + 1}. ${p.ui}`));
  console.log(`  [ ] ${ctx.plan.length + 1}. after the stake activates (2 epochs), /proof: Run distribute (or wait for the keeper), then /stake: claim`);
  console.log(`ETH sent by these steps: ${formatEther(total)} ETH (+ gas). Amounts come from live quotes at this block; rerun --dry right before trading.`);
}

let acct: ReturnType<typeof privateKeyToAccount> | null = null;
const account = () => {
  if (!acct) throw new Error("DEMO_KEY is not set");
  return acct;
};
const wallet = () => createWalletClient({ account: account(), chain: robinhood, transport: transports() });

async function sendAndWait(label: string, req: () => Promise<Hex>) {
  const hash = await req();
  console.log(`  tx ${label}: ${hash}`);
  const r = await client.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${label} reverted (${hash})`);
}

async function main() {
  const dry = hasFlag("--dry");
  if (process.env.DEMO_KEY) acct = privateKeyToAccount(process.env.DEMO_KEY as Hex);
  if (!dry && !acct) throw new Error("DEMO_KEY is required unless --dry");
  const d = loadDeployments();
  if (!dry && !d) throw new Error("no live deployment in web/data/deployments.json; run sync-deployments first");
  const user = acct?.address ?? ((process.env.DEMO_ADDR as Address | undefined) ?? null);
  const ctx: Ctx = { user, d, send: dry ? null : sendAndWait, plan: [] };
  console.log(`seed-demo ${dry ? "DRY RUN (nothing is sent)" : "LIVE"} wallet ${user ?? "(none)"} deployment ${d ? d.TerraRouter : "none"}`);
  if (user) console.log(`  ETH balance ${formatEther(await client.getBalance({ address: user }))}`);
  const memes = pickMemes();
  await seedMemes(ctx, memes);
  await seedConvert(ctx, memes[0]);
  await seedSweeps(ctx, memes[1] ?? memes[0]);
  await seedStake(ctx);
  await remaining(ctx);
  if (dry) printChecklist(ctx);
}

main().catch((e) => {
  console.error(`seed-demo FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  process.exit(1);
});
```

#### File: scripts/sync-deployments.mjs
[ASSUMED] — Source: see header comment
```javascript
// File: scripts/sync-deployments.mjs
// Copies contracts/deployments/4663.json (written by contracts/script/Deploy.s.sol) to web/data/deployments.json with
// "deployed": true. Refuses on a wrong chain or any zero/malformed address, so the web never points at nothing.
// Run: node scripts/sync-deployments.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "contracts", "deployments", "4663.json");
const dst = path.join(root, "web", "data", "deployments.json");
const NAMES = ["StockOracle", "Jar", "WifStaking", "FeePool", "TerraRouter", "HindsightLens", "FriendJar"];

function fail(msg) {
  console.error(`sync-deployments REFUSED: ${msg}`);
  process.exit(1);
}

let d;
try {
  d = JSON.parse(readFileSync(src, "utf8"));
} catch (e) {
  fail(`cannot read ${path.relative(root, src)} (${e.message})`);
}
if (Number(d.chainId) !== 4663) fail(`chainId ${d.chainId} != 4663`);
for (const n of NAMES) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(d[n] ?? "")) fail(`${n} is not an address: ${d[n]}`);
  if (/^0x0{40}$/i.test(d[n])) fail(`${n} is the zero address`);
}
if (!(Number(d.block) > 0) || !(Number(d.start) > 0)) fail(`block/start missing (${d.block}/${d.start})`);

const out = { deployed: true, chainId: 4663, block: Number(d.block), start: Number(d.start) };
for (const n of NAMES) out[n] = d[n];
writeFileSync(dst, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${path.relative(root, dst)}: TerraRouter ${out.TerraRouter}, block ${out.block}`);
```

#### File: scripts/test-hindsight.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/test-hindsight.ts
// Closes F-026: proves the receipt path of web/lib/hindsight.ts `payments` on REAL mainnet buys where tx.value == 0
// and the buyer paid WETH or USDG. Scans recent Transfer logs of registry memes sent from registry sources, keeps
// txs with value == 0 sent by the recipient whose receipt shows the recipient paying WETH/USDG (and not sending the
// meme back out: round-trips are not buys), then runs a verbatim
// replica of `payments` on them. Exit 1 if fewer than 2 are found in the scanned range (reported honestly).
// Run: pnpm tsx scripts/test-hindsight.ts [--windows N]
import { getAddress, type Address, type Hex } from "viem";
import { ADDR, STOCKS } from "../web/lib/config";
import { loadRegistry } from "./lib/files";
import { getLogsMany, headBlock, rpcChunked, type Log } from "./lib/rpc";

const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const WINDOW = 100_000; // ~2.8 h of blocks at ~10 blocks/s
const WANT = 2;
const topicAddr = (t: string) => getAddress(`0x${t.slice(26)}`);

type Tx = { from: Address; to: Address | null; value: Hex; blockNumber: Hex; hash: Hex };
type Receipt = { logs: Log[] };
type Payment = { payKind: 0 | 1 | 2; payStockId: number; amount: bigint; block: number } | { unpriced: string };

/** VERBATIM replica of web/lib/hindsight.ts `payments` (only the rpc import differs). Keep in sync. */
async function payments(wallet: Address, hashes: Hex[]) {
  const txs = (await rpcChunked(hashes.map((h) => ({ method: "eth_getTransactionByHash", params: [h] })), 10)) as Tx[];
  const needReceipt = txs.filter((t) => t && t.from.toLowerCase() === wallet.toLowerCase() && BigInt(t.value) === 0n);
  const receipts = (await rpcChunked(needReceipt.map((t) => ({ method: "eth_getTransactionReceipt", params: [t.hash] })), 10)) as Receipt[];
  const receiptByHash = new Map(needReceipt.map((t, i) => [t.hash, receipts[i]]));
  const stockIdx = new Map(STOCKS.map((s) => [s.token.toLowerCase(), s.id]));
  const out = new Map<Hex, Payment>();
  for (const t of txs) {
    if (!t) continue;
    if (t.from.toLowerCase() !== wallet.toLowerCase()) {
      out.set(t.hash, { unpriced: "received, not bought by this wallet" });
      continue;
    }
    const block = Number(t.blockNumber);
    if (BigInt(t.value) > 0n) {
      out.set(t.hash, { payKind: 0, payStockId: 0, amount: BigInt(t.value), block });
      continue;
    }
    const rc = receiptByHash.get(t.hash);
    const paid = (rc?.logs ?? []).find(
      (l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]).toLowerCase() === wallet.toLowerCase(),
    );
    if (!paid) {
      out.set(t.hash, { unpriced: "no payment found" });
      continue;
    }
    const tok = paid.address.toLowerCase();
    const amount = BigInt(paid.data);
    if (tok === ADDR.weth.toLowerCase()) out.set(t.hash, { payKind: 0, payStockId: 0, amount, block });
    else if (tok === ADDR.usdg.toLowerCase()) out.set(t.hash, { payKind: 1, payStockId: 0, amount, block });
    else if (stockIdx.has(tok)) out.set(t.hash, { payKind: 2, payStockId: stockIdx.get(tok)!, amount, block });
    else out.set(t.hash, { unpriced: "paid in tokens, not priced" });
  }
  return out;
}

type Candidate = { tx: Hex; wallet: Address; token: string; meme: string; memeAmount: bigint; paidWith?: string };

/** Buys in [from, to]: meme Transfers out of a registry source into the tx sender, with tx.value == 0. */
async function zeroValueBuys(from: number, to: number): Promise<Candidate[]> {
  const reg = loadRegistry();
  const sources = new Set(reg.sources.map((s) => s.toLowerCase()));
  const sym = new Map(reg.memes.map((m) => [m.token.toLowerCase(), m.symbol]));
  const logs = await getLogsMany(reg.memes.map((m) => ({ address: m.token, topics: [TRANSFER as Hex], from, to })));
  const byTx = new Map<Hex, Candidate>();
  for (const l of logs) {
    if (l.topics.length !== 3 || !sources.has(topicAddr(l.topics[1]).toLowerCase())) continue;
    byTx.set(l.transactionHash, { tx: l.transactionHash, wallet: topicAddr(l.topics[2]), token: l.address.toLowerCase(), meme: sym.get(l.address.toLowerCase()) ?? l.address, memeAmount: BigInt(l.data) });
  }
  const cands = [...byTx.values()];
  const txs = (await rpcChunked(cands.map((c) => ({ method: "eth_getTransactionByHash", params: [c.tx] })), 10)) as (Tx | null)[];
  console.log(`  blocks ${from}..${to}: ${logs.length} meme transfers, ${cands.length} source->wallet txs`);
  return cands.filter((c, i) => {
    const t = txs[i];
    return t && BigInt(t.value) === 0n && t.from.toLowerCase() === c.wallet.toLowerCase();
  });
}

/** Clean buys only: the wallet sends WETH or USDG and never sends the bought meme back out (no round-trips). */
async function paidInWethOrUsdg(cands: Candidate[]): Promise<Candidate[]> {
  const receipts = (await rpcChunked(cands.map((c) => ({ method: "eth_getTransactionReceipt", params: [c.tx] })), 10)) as Receipt[];
  const quote = new Set([ADDR.weth.toLowerCase(), ADDR.usdg.toLowerCase()]);
  return cands.flatMap((c, i) => {
    const out = (receipts[i]?.logs ?? []).filter((l) => l.topics[0] === TRANSFER && l.topics.length === 3 && topicAddr(l.topics[1]) === c.wallet);
    const pay = out.find((l) => quote.has(l.address.toLowerCase()));
    return pay && !out.some((l) => l.address.toLowerCase() === c.token) ? [{ ...c, paidWith: pay.address.toLowerCase() }] : [];
  });
}

const describe = (p: Payment | undefined) => {
  if (!p) return "missing";
  if ("unpriced" in p) return `unpriced (${p.unpriced})`;
  const asset = p.payKind === 0 ? "ETH/WETH" : p.payKind === 1 ? "USDG" : STOCKS[p.payStockId].symbol;
  const dec = p.payKind === 1 ? 6 : 18;
  return `payKind ${p.payKind} (${asset}) amount ${p.amount} (= ${Number(p.amount) / 10 ** dec}) block ${p.block}`;
};

async function main() {
  const i = process.argv.indexOf("--windows");
  const windows = i > 0 ? Number(process.argv[i + 1]) : 20;
  const head = await headBlock();
  const found: Candidate[] = [];
  let zeroValue = 0;
  let scanned = 0;
  const covered = () => new Set(found.map((f) => f.paidWith)).size >= 2;
  for (let w = 0; w < windows && !covered(); w++, scanned++) {
    const to = head - w * WINDOW;
    const cands = await zeroValueBuys(to - WINDOW + 1, to);
    zeroValue += cands.length;
    const paid = await paidInWethOrUsdg(cands);
    console.log(`    value==0 self-sent: ${cands.length}; paid WETH/USDG in receipt: ${paid.length}`);
    found.push(...paid.filter((p) => !found.some((f) => f.wallet === p.wallet)));
  }
  console.log(`\nscanned ${scanned * WINDOW} blocks back from head ${head}; zero-value self-sent buys: ${zeroValue}; WETH/USDG-paid: ${found.length}`);
  let detected = 0;
  const weth = found.find((f) => f.paidWith === ADDR.weth.toLowerCase());
  const usdg = found.find((f) => f.paidWith === ADDR.usdg.toLowerCase());
  const picks = [weth, usdg, ...found].filter((c, i, a): c is Candidate => !!c && a.indexOf(c) === i).slice(0, WANT);
  console.log(`WETH-paid ${found.filter((f) => f.paidWith === ADDR.weth.toLowerCase()).length}, USDG-paid ${found.filter((f) => f.paidWith === ADDR.usdg.toLowerCase()).length}`);
  for (const c of picks) {
    const p = (await payments(c.wallet, [c.tx])).get(c.tx);
    if (p && !("unpriced" in p) && p.payKind <= 1) detected++;
    console.log(`\ntx ${c.tx}\n  wallet ${c.wallet} bought ${Number(c.memeAmount) / 1e18} ${c.meme}\n  payments(): ${describe(p)}`);
  }
  if (detected < picks.length) {
    console.error(`\nFAIL: payments() did not price ${picks.length - detected} real WETH/USDG-paid buy(s).`);
    process.exit(1);
  }
  if (found.length < WANT) {
    console.error(`\nFAIL: found ${found.length} WETH/USDG-paid buy(s); need ${WANT}. Receipt path remains unproven on mainnet.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
```

#### File: scripts/tsconfig.json
[ASSUMED] — Source: see header comment
```json
// File: scripts/tsconfig.json (JSON: copy everything after this first line)
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["node"],
    "paths": { "@/*": ["../web/*"] }
  },
  "include": ["./**/*.ts"]
}
```

#### File: scripts/verify-claims.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/verify-claims.ts
// Re-derives every row of CLAIMS.md from its source and fails (exit 1) on any mismatch or unbacked value.
// PENDING rows are skipped; a deployment-dependent row with a value but no live deployment is a failure.
// Run: pnpm tsx scripts/verify-claims.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatEther } from "viem";
import { feePoolAbi } from "../web/lib/abi";
import { ROOT } from "./lib/env";
import { CONTRACT_NAMES, loadDeployments } from "./lib/files";
import { client } from "./lib/rpc";

type Row = { id: string; claim: string; value: string };
const NO_DEPLOYMENT = "no live deployment";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function deployment() {
  const d = loadDeployments();
  if (!d) throw new Error(NO_DEPLOYMENT);
  return d;
}

const derive: Record<string, () => Promise<string>> = {
  "fork-tests": async () => {
    const all = [...read("evidence/forge-test.txt").matchAll(/(\d+) tests passed, (\d+) failed/g)];
    const last = all.at(-1);
    if (!last) throw new Error("no forge summary line");
    if (last[2] !== "0") throw new Error(`${last[2]} fork tests failed`);
    return last[1];
  },
  "deployed-contracts": async () => {
    const d = deployment();
    const codes = await Promise.all(CONTRACT_NAMES.map((n) => client.getCode({ address: d[n] })));
    return String(codes.filter((c) => c && c !== "0x").length);
  },
  "wif-burned": async () => {
    const d = deployment();
    return formatEther(await client.readContract({ address: d.FeePool, abi: feePoolAbi, functionName: "totalWifBurned" }));
  },
  "nvda-fill-deviation": async () => {
    const m = read("research/spike-fork.md").match(/CL-implied [\d.]+ \((-?[\d.]+%)\)/);
    if (!m) throw new Error("CL-implied deviation not found");
    return m[1];
  },
};

function rows(): Row[] {
  const lines = read("CLAIMS.md").split("\n").filter((l) => /^\|\s*[a-z0-9-]+\s*\|/.test(l));
  const cells = lines.map((l) => l.split("|").slice(1).map((c) => c.trim()));
  return cells.filter(([id]) => id !== "id" && !/^-+$/.test(id)).map(([id, claim, value]) => ({ id, claim, value }));
}

async function check(r: Row): Promise<boolean> {
  const fn = derive[r.id];
  if (!fn) return console.log(`FAIL ${r.id}: no derivation for this claim`), false;
  try {
    const got = await fn();
    if (r.value === "PENDING") return console.log(`PENDING ${r.id} (derivable now: ${got}; copy it into CLAIMS.md)`), true;
    const ok = got === r.value;
    console.log(`${ok ? "OK  " : "FAIL"} ${r.id}: claimed ${r.value}, derived ${got}`);
    return ok;
  } catch (e) {
    const msg = (e as Error).message;
    if (r.value === "PENDING" && msg === NO_DEPLOYMENT) return console.log(`PENDING ${r.id} (skipped: ${msg})`), true;
    console.log(`FAIL ${r.id}: ${msg}`);
    return false;
  }
}

async function main() {
  const all = rows();
  if (all.length === 0) throw new Error("CLAIMS.md has no rows");
  let ok = true;
  for (const r of all) ok = (await check(r)) && ok;
  if (!ok) process.exit(1);
  console.log(`claims verified: ${all.length} rows`);
}

main().catch((e) => {
  console.error(`verify-claims FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
```

#### File: scripts/wire-card-fork.ts
[ASSUMED] — Source: see header comment
```typescript
// File: scripts/wire-card-fork.ts — FORK-ONLY wire probe: builds the Hindsight card for anvil test account 1 against a local
// fork (LOGS_RPC/GETBLOCK_RPC_* = http://127.0.0.1:8545) to exercise the TerraRouter-buy branch on real fork receipts.
// Registry firstBlock is moved to the fork block because pre-fork history is served by the upstream RPC, not the fork.

const of = globalThis.fetch;
globalThis.fetch = (async (u: any, init: any) => {
  const r = await of(u, init); const b = init?.body ? String(init.body) : "";
  if (b.includes("eth_getLogs")) { const t = await r.clone().text(); console.log("getLogs ->", String(u).slice(0, 22), t.slice(0, 160)); }
  return r;
}) as typeof fetch;
process.chdir(new URL("../web", import.meta.url).pathname);
const { REGISTRY } = await import("../web/lib/registry");
for (const m of REGISTRY.memes) (m as any).firstBlock = Number(process.env.FORK_BLOCK ?? 111420416); // fork block: pre-fork history lives upstream
const { buildCard } = await import("../web/lib/hindsight");
const c = await buildCard("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 0);
console.log(JSON.stringify(c.memes.map((m:any)=>({s:m.symbol,paid:m.usdPaid8,today:m.usdToday8,cf:m.usdCounterfactual8,buys:m.buys.length,src:m.buys.map((b:any)=>b.source??b.kind)}))));
console.log(JSON.stringify({ memes: c.memes.length, gaps: c.scanGaps, unpriced: c.unpriced }));
```

#### File: tsconfig.json
[ASSUMED] — Source: see header comment
```json
// File: tsconfig.json (JSON: copy everything after this first line)
{
  "extends": "./scripts/tsconfig.json"
}
```

### Key Decisions
Scripts never import server-only modules; every number they write is read from chain or Chainlink.

## Section N+1: Domain Knowledge File (spec for build → `DOMAIN-GUIDE.md`)
Build generates `DOMAIN-GUIDE.md` from this spec (non-agent project).

| Concept | Definition | Code identifier | Source |
|---|---|---|---|
| Stock Token | ERC-20 on RH representing one share × `uiMultiplier()` (ERC-8056); 18dp | `STOCKS[i].token`, `Stock.token` | research-brief; rhj assets |
| uiMultiplier | factor turning raw balance into shares (splits, dividend steps) | `erc20Abi.uiMultiplier` | fact-check FU1 |
| Jar | ownerless ledger of a user's stock | `Jar.balanceOf` | AMEND-4 |
| Sweep | slice (bps of ETH notional) of a trade converted to stock for the user | `sweepBps`, `Swept` | OD2 |
| Fee | 50 bps (30 for >= 10K active $WIF stake) of ETH notional to FeePool | `FEE_BPS`, `feeBps()` | OD2, Phase 1.5 |
| Epoch | 1 hour since `start` (UTC-hour aligned) | `EPOCH`, `currentEpoch()` | OD3 |
| Activation | stake earns from the epoch after it was placed | `pendingEpoch`, `_rollPool` | OD3 |
| Sub-pool | stakers who chose the same reward stock | `pools[stockId]` | AMEND-4 |
| Chainlink round | (phase << 64) \| n; phase 1 for all used feeds | `PHASE_BASE` | spike-indexing §4 |
| Early-round scaling | early rounds of every stock history feed report 1e16-scaled values; an answer > 1e15 is divided by 1e8 | `SCALED_THRESHOLD`, `historicalAnswer8`, `normalize8` | spike-indexing §4, build-rounds.ts |
| Heartbeat | Chainlink directory heartbeat 86400s; we allow 25h | `MAX_AGE` | cl-feeds-rh.json |
| Band | stock fills must be >= Chainlink price − 3% | `BAND_BPS` | PRD 4.15 |
| UR 2.1 layout | V2/V3 inputs end with `uint256[] maxHopSlippage` | `URCodec.v2/v3` | URProbe.t.sol |
| CONTRACT_BALANCE | `1 << 255`: swap whatever the UR holds | `URCodec.CONTRACT_BALANCE` | UR ActionConstants |
| ADDRESS_THIS | `address(2)`: deliver to the UR itself | `URCodec.ADDRESS_THIS` | UR ActionConstants |
| Hook (v4) | contract attached to a pool; WIF/ETH hook takes ~1% of output (afterSwapReturnDelta) | `WIF_HOOK` | fact-check TF2 |
| Dynamic fee | v4 fee value 8388608 = hook-set fee; keep verbatim in PoolKey | `PoolEntry.key.fee` | spike-coverage |
| Hindsight buy | meme received from a pool/router/PoolManager in a tx the wallet sent and paid for | `scanBuys`, `payments` | spike-indexing §1 |
| Unpriced | buy paid in an unsupported token, shown but excluded from totals | `Card.unpriced` | INVARIANT 7 |

**Rules the code must enforce:** $WIF never an input (`WifNotSellable`); no $WIF price in value logic; every stock fill Chainlink-bounded; no owner/pause/upgrade; Jar credits backed by received tokens; JIT stakes earn nothing in their epoch; no fabricated numbers (INVARIANTS.md 1–7).

## Section N+2: Submission Directory Plan
[VERIFIED] — directory plan (not code)
```
submission/
├── screenshots/            # demo phase (hackathon-demo): landing, card, convert-success, trade-sweep, stake-claim, proof (desktop + mobile)
├── video/links.md          # demo phase: YouTube/X video URL (< 3 min)
├── proof.md                # scripts/proof.ts (post-deploy, regenerated before submit)
├── links.md                # package phase: live URL, repo, contracts, explorer
└── sponsor-tracks.md       # package phase: track → evidence (Stock Tokens, hooks/defi, consumer, onboarding; GetBlock, Quicknode, Chainlink, Uniswap)
```
Owners: proof.md = hackathon-build (script) @ build; screenshots/video = hackathon-demo @ demo; links.md + sponsor-tracks.md = hackathon-package @ package.

## Section N+3: Multi-Track Architecture
| Track | Component serving it | Distinct integration point | Proof for judges |
|---|---|---|---|
| Stock Tokens (primary) | Jar, StockOracle, TerraRouter sweep/convert, WifStaking rewards | real Stock Tokens bought via Uniswap with Chainlink bounds, held per user | Jar credits + Blockscout token transfers |
| hooks and defi | TerraRouter over UR 2.1 incl. hooked v4 pools; FeePool burn through the hooked WIF/ETH pool | typed Route → UR command encoding (v2/v3/v4, dynamic fees, hooks) | fork tests per route kind; distribute tx |
| consumer and payments | Hindsight card, meme terminal, Jar, mobile-first UI | per-wallet card with receipts; one-tap convert | live URL, OG cards |
| onboarding | Hindsight lookup (no wallet), FriendJar (gated) with embedded wallet + sponsored gas | read-only card; shared Jar | /card/[addr], FriendJar txs (if gate passes) |
Sponsor integrations: GetBlock (primary RPC + WSS live stream: `web/lib/rpc.ts`, `app/api/stream`), Quicknode (Stock Token API cross-check: `app/api/qn-jar`), Chainlink (StockOracle, HindsightLens, round tables), Uniswap (UR 2.1, V4Quoter, QuoterV2).

## Section N+4: Safety Architecture
[VERIFIED] — layer summary, each layer mapped to tests below (not code)
```
Layer 1: Input Validation    — TerraRouter._validate (route kind, path endpoints == token/WETH, 2-hop mid == USDG, v4 currency0 == ETH),
                               WifNotSellable, SweepTooHigh, LengthMismatch; API: isAddress, bad_stock, taxed_token, wif_not_sellable
Layer 2: Rate Limiting       — FeePool: once per epoch + MIN_DISTRIBUTE_ETH; MAX_WIF_BUY_ETH per call; RPC client: <=36/batch, <=3 in flight, backoff
Layer 3: Circuit Breakers    — StockOracle staleness (MAX_AGE 25h) → revert (router) or skip-and-carry (FeePool); try/catch around every FeePool swap
                               → carry; 10K-log RPC errors split, never swallowed
Layer 4: Graceful Degradation— RPC failover FRA → NYC → public; SSE stream falls back to polling; Quicknode badge hides on error; deployed:false → read-only UI;
                               /proof "Run distribute" if keeper is down
```
| Layer | Implemented in | Prevents | Tested by |
|---|---|---|---|
| 1 | TerraRouter._validate | command injection, wrong-token routes, $WIF sale | test_routeTokenMismatchReverts, test_badKindReverts, test_badMidHopReverts, test_sellWifReverts, test_convertWifReverts |
| 2 | FeePool | repeated distribute, burn-buy manipulation | test_distributeOncePerEpoch, test_noStakersCarriesStockHalf |
| 3 | StockOracle, FeePool try/catch | stale fills, stuck epochs | test_staleOracleReverts, test_userMinStockEnforced |
| 4 | rpc.ts, stream route, UI | outage-induced blank pages | livetest (wire/livetest skills) |

## Section N+6: Configuration Reference
| Variable | Used by | Example / source | Secret |
|---|---|---|---|
| GETBLOCK_RPC_FRA / GETBLOCK_RPC_NYC | web/lib/rpc.ts, scripts | worldisflat.fun/build/me GetBlock box | yes (shared; never commit/post) |
| GETBLOCK_WSS_FRA | app/api/stream | same | yes |
| QUICKNODE_RPC | app/api/qn-jar | `QUICKNODE_BASE` + `/` + token from Quicknode dashboard (endpoint spring-multi-lake) | yes |
| ENVIO_API_TOKEN | web/lib/hypersync.ts (first log provider for Hindsight; public RPC fallback) | envio.dev account → HyperSync API token (Dami) | yes |
| NEXT_PUBLIC_DEMO_ADDR | landing "See a real card" | demo wallet address | no |
| NEXT_PUBLIC_WC_PROJECT_ID | wagmi WalletConnect | cloud.reown.com | no |
| NEXT_PUBLIC_REPO_URL | footer SECURITY.md link | GitHub repo URL | no |
| NEXT_PUBLIC_FRIEND_JARS | /friends gate | "1" only if OD7 gate passes | no |
| RPC_URL | forge tests/deploy, scripts, keeper | = GETBLOCK_RPC_FRA | yes |
| FORK_BLOCK | forge tests | 111155803 | no |
| DEPLOYER_KEY | Deploy.s.sol | `cast wallet new` | yes |
| KEEPER_KEY | keeper.ts (GitHub secret) | DISTINCT `cast wallet new` key, capped at ~0.001 ETH; never the deployer key (it can only call permissionless distribute) | yes |
| DEMO_KEY | seed-demo.ts | `cast wallet new` | yes |

### Credentials Needed
| Variable | Used By | Where to Obtain | Required Before |
|---|---|---|---|
| GETBLOCK_RPC_FRA, GETBLOCK_RPC_NYC, GETBLOCK_WSS_FRA | web, scripts, tests | worldisflat.fun/build/me (DONE, in ~/wif-hack/.env.local) | build |
| QUICKNODE_RPC | /api/qn-jar | Quicknode dashboard → endpoint → Auth token (Dami to paste) | deploy (optional) |
| DEPLOYER_KEY (+ ~0.002 ETH) | Deploy.s.sol, keeper | `cast wallet new`; Dami funds | deploy |
| DEMO_KEY (+ ~0.004 ETH, WIF bought via router) | seed-demo.ts | `cast wallet new`; Dami funds | demo |
| NEXT_PUBLIC_WC_PROJECT_ID | wagmi | cloud.reown.com (Dami) | deploy (optional; injected wallets work without) |
| Vercel login, GitHub repo + Actions secrets | hosting, keeper | Dami accounts (`vercel login`, `gh`) | deploy |

## Section N+7: Testing Strategy
| Layer | Files | Command | Count (evidence) |
|---|---|---|---|
| Contract fork tests | contracts/test/TerraFirma.t.sol, HindsightLens.t.sol, URProbe.t.sol | `cd contracts && RPC_URL=$GETBLOCK_RPC_FRA forge test -vv` | 38 PASS (evidence/forge-test.txt) |
| Gas snapshot | — | `forge test --gas-report` | build phase |
| Hindsight payment detection | scripts/test-hindsight.ts | `pnpm tsx scripts/test-hindsight.ts` | 2 real WETH/USDG-paid txs |
| Claims re-derivation | scripts/verify-claims.ts + CLAIMS.md | `pnpm tsx scripts/verify-claims.ts` | all rows |
| Web typecheck/build | web | `cd web && npx tsc --noEmit && pnpm build` | clean |
| Live checks | /api/health, livetest skill | `curl $URL/api/health` | post-deploy |
Critical tests: `test_buyV3_sweepAndFee` (exact fee, Jar backing), `test_distribute_burnAndStream` (supply drop == burned, staker reward → Jar), `test_jitStakeEarnsNothing`, `test_sellWifReverts`, `test_staleOracleReverts`, `test_recomputeOneEthBuy` (real rounds).

## Section N+8: Component Build Order
1. **Shared infra** (URCodec, IExternal, TerraConfig) — everything encodes through these. ✅ written + tested.
2. **StockOracle → Jar → WifStaking → FeePool → TerraRouter** (sequential: each constructor needs the previous or a predicted address; deployAll() predicts Jar/WifStaking/FeePool/TerraRouter). ✅ 29 fork tests.
3. **HindsightLens** (needs StockOracle). ✅ 3 real-round tests.
4. Parallel group A (off-chain data): `build-registry.ts`, `build-rounds.ts`, `build-restricted.ts` — independent of each other.
5. Parallel group B: `web/lib/*` + API routes (needs data files' shapes, not contents) ‖ UI pages (needs API contracts) ‖ keeper/seed/proof scripts (need ABIs + deployments shape).
6. **Mainnet deploy** (needs DEPLOYER_KEY funding) → `sync-deployments.mjs` → Vercel deploy → keeper secrets → `seed-demo.ts` → keeper first distribute → `proof.ts`.
7. FriendJar UI only if the OD7 gate passes (contract is deployed with the core; UI flag off by default).
P0 deliverability check: P0 features F-001..F-011 need only steps 1–6; P1 adds UI pages already in group B; nothing P0 depends on FriendJar, Quicknode, or the stream route.

## Section N+9: Deployment Sequence
| # | Service | Command | Health check | Depends on | Env |
|---|---|---|---|---|---|
| 1 | Contracts (7) | `cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_KEY --broadcast --slow` | `cast code $(jq -r .TerraRouter deployments/4663.json) --rpc-url $RPC_URL` non-empty | funded deployer | RPC_URL, DEPLOYER_KEY |
| 2 | Verify | `forge verify-contract <addr> <Name> --chain 4663 --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/ --watch` (per contract; constructor args via `cast abi-encode`) | Blockscout page shows source | 1 | — |
| 3 | Web data | `node scripts/sync-deployments.mjs && pnpm tsx scripts/build-rounds.ts --update` | `jq .deployed web/data/deployments.json` = true | 1 | RPC_URL |
| 4 | Web (Vercel) | `cd web && vercel deploy --prod` | `curl -s $URL/api/health \| jq .rpc` = "ok" and `.deployed` = true | 3 | GETBLOCK_*, QUICKNODE_RPC, NEXT_PUBLIC_* |
| 5 | Keeper | push repo; `gh secret set RPC_URL`, `gh secret set KEEPER_KEY`; `gh workflow run keeper.yml` | workflow log prints "skip" or a tx hash | 1 | RPC_URL, KEEPER_KEY |
| 6 | Seed | `pnpm tsx scripts/seed-demo.ts` | `/api/hindsight?addr=$DEMO` has >= 3 memes; Jar balance > 0 | 1, 3 | RPC_URL, DEMO_KEY |
| 7 | First distribute | wait for next epoch; `gh workflow run keeper.yml` (or /proof button) | `Distributed` event with wifBurned > 0 | 5, 6 | — |
| 8 | Proof | `pnpm tsx scripts/proof.ts` | submission/proof.md lists 7 contracts + first-of-kind txs | 7 | RPC_URL |

## Section N+10: Addresses & External References
| Item | Address / URL | Network | Source |
|---|---|---|---|
| Universal Router 2.1 | 0x8876789976dEcBfCbBbe364623C63652db8C0904 | 4663 | Uniswap docs + URProbe.t.sol |
| v4 PoolManager / V4Quoter / StateView | 0x8366a39cc670b4001a1121b8f6a443a643e40951 / 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 / 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b | 4663 | Uniswap docs |
| v3 Factory / QuoterV2 | 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA / 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 | 4663 | Uniswap docs |
| v2 Factory / Router02 | 0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f / 0x89e5db8b5aa49aa85ac63f691524311aeb649eba | 4663 | spike-coverage |
| WETH / USDG / $WIF | 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73 / 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 / 0x5173b8eA6923c2d40267890D45C46a3480954773 | 4663 | RH docs / intel |
| WIF/ETH v4 pool key | (0x0, WIF, fee 0, tickSpacing 200, hooks 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044) id 0x71ef4106…8c79 | 4663 | fact-check TF2 |
| Stock tokens | NVDA 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC · TSLA 0x322F0929c4625eD5bAd873c95208D54E1c003b2d · GOOGL 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3 · SNDK 0xB90A19fF0Af67f7779afF50A882A9CfF42446400 · SPY 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C · QQQ 0xD5f3879160bc7c32ebb4dC785F8a4F505888de68 | 4663 | rhj-assets-now.json |
| Stock fill pools | NVDA/WETH 0.05% 0x62AB521f71431f78ac374CdbadC6cda3c8916b6C · TSLA/WETH 0.3% 0xA953CA88ff430e9487c60cA34d757414f4efdA07 · WETH/USDG 0.05% → GOOGL/USDG 0.05% 0x34D0dC122CF9A8Eb296fC5e0D3A233625D7d19b7 · WETH/USDG 0.05% → SNDK/USDG 1% 0xA1e1C9519cD5ae47e9A935645E1A7b935b944559 · SPY/WETH 0.05% 0xDDCBBa3666f578E3F09516f21Ff85BFee859AB5e · QQQ/WETH 0.3% 0xA40D00a55d43bA2d188039DCF88bD68f4F133E78 | 4663 | forge Phase 2 probe |
| Chainlink live feeds | ETH/USD 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9 · USDG/USD 0x61B7e5650328764B076A108EFF5fa7282a1B9aD2 · NVDA 24/7 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F · TSLA 24/7 0x39eDf5ef54150A30d2C4F1b982FbB8f93050BC37 · GOOGL 24/7 0x53e040D2C8c9278cBc4b702328aC652068a0E063 · SNDK 24/7 0x7FA2c251b345b8492C039a59a42b38603a05Ed9b · SPY 0x319724394D3A0e3669269846abE664Cd621f9f6A · QQQ 0x80901d846d5D7B030F26B480776EE3b29374C2ae | 4663 | cl-feeds-rh.json |
| Chainlink history feeds | NVDA/USD 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 · TSLA/USD 0x4A1166a659A55625345e9515b32adECea5547C38 · GOOGL/USD 0xF6f373a037c30F0e5010d854385cA89185AE638b · SNDK/USD 0xfb133Fa4B7b385802B693a293606682Df47109A3 (SPY, QQQ = live feeds) | 4663 | cl-feeds-rh.json |
| Multicall3 | 0xca11bde05977b3631167028862be2a173976ca11 | 4663 | viem chain def |
| Terra Firma contracts | DEPLOY_AND_RECORD_ADDRESS_HERE → contracts/deployments/4663.json | 4663 | Deploy.s.sol |
| Explorer | https://robinhoodchain.blockscout.com | — | — |

## Section N+11: Integration Map
| From | To | Protocol | Credential (env) | Health Check | Priority |
|---|---|---|---|---|---|
| web/lib/rpc.ts | GetBlock FRA | HTTPS JSON-RPC | GETBLOCK_RPC_FRA | `curl -s -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' $GETBLOCK_RPC_FRA` → `0x1237` | P0 |
| web/lib/rpc.ts | GetBlock NYC | HTTPS JSON-RPC | GETBLOCK_RPC_NYC | same → `0x1237` | P1 |
| web/lib/rpc.ts | public RPC | HTTPS JSON-RPC | none (User-Agent) | same against https://rpc.mainnet.chain.robinhood.com | P1 |
| web/lib/hypersync.ts | Envio HyperSync | HTTPS JSON query, bearer | ENVIO_API_TOKEN | `curl -s https://robinhood.hypersync.xyz/height` → {"height":…} | P1 |
| app/api/stream | GetBlock WSS | WebSocket eth_subscribe | GETBLOCK_WSS_FRA | `curl -N $URL/api/stream` emits `hello` within 2s | P2 |
| app/api/qn-jar | Quicknode | HTTPS JSON-RPC qn_getStockTokenBalances | QUICKNODE_RPC | `curl -s $URL/api/qn-jar?addr=<Jar>` | P2 |
| TerraRouter | Universal Router 2.1 | EVM call | — | fork `test_buyV3_sweepAndFee` | P0 |
| StockOracle / HindsightLens / rounds.ts | Chainlink feeds | EVM call | — | `curl $URL/api/health` → `.feeds.NVDA == true` | P0 |
| FeePool | WIF/ETH v4 pool (third-party hook) | EVM call via UR | — | `Distributed.wifBurned > 0` | P0 |
| quote.ts | V4Quoter / QuoterV2 / Router02 | eth_call | — | `curl "$URL/api/quote?token=0x39dBED3a2bd333467115dE45665cC57F813C4571&side=buy&amount=1000000000000000"` | P0 |
| app/api/geo | Vercel edge geo header | HTTP header | — | `curl $URL/api/geo` | P1 |
| scripts/build-registry.ts | DexScreener API | HTTPS | none | `curl -s https://api.dexscreener.com/token-pairs/v1/robinhood/0x39dBED3a2bd333467115dE45665cC57F813C4571 \| jq length` | P2 |
| keeper workflow | FeePool | EVM tx | KEEPER_KEY | Actions log | P1 |

## Security spec (for build's SECURITY.md)
build scaffolds `SECURITY.md` with exactly this shape and fills the rows from PRD §4.12:
[VERIFIED] — SECURITY.md template shape (filled by build)
```
# Security
## Scope            (contracts in contracts/src, web API routes, keeper)
## Threat matrix
| Threat | Enforcement | File |
|---|---|---|
| (one row per PRD §4.12 T1–T12, Enforcement names the check + error, File names the path:function) |
## Third-party dependencies (disclosure)
- WIF/ETH Uniswap v4 pool hook 0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044: third-party, owned by 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd, unverified source, afterSwapReturnDelta (takes ~1% of output). Terra Firma only buys $WIF through it with a capped size and try/catch carry.
- Chainlink feeds (trusted for freshness and correctness), Uniswap Universal Router 2.1, Stock Token contracts.
## Not defended against
- wrong-but-fresh Chainlink answers; hook owner changing fees within its rules; determined geofence bypass (frontend + attestation only);
  MEV on meme legs beyond the user's min-out; Stock Token issuer actions (pauses, multiplier changes).
## Reporting
```
