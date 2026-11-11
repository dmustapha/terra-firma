# Fact-check: Terra Firma finalist (Robinhood Chain mainnet 4663) — run 2026-11-10
Reviewer: claude-sonnet-5-5. Read-only (cast call / eth_getLogs / curl). RPC https://rpc.mainnet.chain.robinhood.com, head block ~111,115,592.

## TF1 — Historical Chainlink rounds readable — VERIFIED
Feeds: NVDA/USD 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15 (desc "RHNVDA / USD", 8dp), NVDA 24/7 0x321A36e441DfBadA01Aa6f9884F14a344E133D1F, ETH/USD 0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9.
`cast call <feed> getRoundData(uint80) <latest-k>` (single phase, roundId = 2^64 + n):
- NVDA/USD: latest round 18446744073709553327 (2026-11-10T18:33:06Z); k=500 -> 2026-10-13 ans 22409243119 ($224.09); k=1000 -> 2026-08-10; k=1710 (roundId 18446744073709551617 = round 1) -> OLDEST 2026-06-22T00:00:43Z; round 0 returns 0/0 and below reverts. Whole history (1711 rounds) reachable.
- ETH/USD: latest 18446744073709554873 (2026-11-10T18:33:02Z); k=100 -> 2026-11-05; k=500 -> 2026-10-16 ans 241156159723; k=3000 -> 2026-06-10T..(ts 1781119448); k=3500 reverts. Oldest reachable >= 2026-06-10.
- Heartbeat: consecutive rounds ~40 min apart (NVDA 17:53:35 -> 18:33:06; ETH 17:53:02 -> 18:33:02), i.e. ~36 rounds/day, 100 rounds ≈ 1.5 days. NVDA/USD (market-hours) and 24/7 feed both updating now.
- Caveats: early NVDA/USD rounds (<= ~Jun 22) carry 18-dp-scaled answers (e.g. 2083949999900000000) despite decimals()=8; Aug+ rounds are 8dp. Oct 2026+ is clean. Binary-search by updatedAt needed (no timestamp lookup).

## TF2 — WIF/ETH v4 pool tradable via custom router — VERIFIED (hooked pool)
Initialize log (eth_getLogs topics[sig 0xdd466e67..., id], block 0x1be4ee8 = 29,05x,xxx; tx 0x4e6a69906a77044d149298da72e6e850c8ef14a3abfe67dc17a84f581b99c3b2).
Pool key: currency0 = 0x0000000000000000000000000000000000000000 (native ETH), currency1 = 0x5173b8eA6923c2d40267890D45C46a3480954773 (WIF), fee 0, tickSpacing 200, hooks 0xe5e702641ea86f4ae6cc3cdaed2b886f976be044. `cast keccak(abi.encode(key))` = 0x71ef4106...8c79 (matches the pool id).
HOOK: nonzero. Code size 15,167 bytes. Permission bits in address (low 14 bits 0x2044): beforeInitialize, afterSwap, afterSwapReturnDelta (hook can skim swap output). Hook.poolManager() = 0x8366a39C...e40951 (reads back), hook.owner() = 0x263ed295dAFaE1d9AAdD6E56c4B6F9f38eE019Dd. Not identified as a known public launchpad hook (no verified source seen; blockscout API 403 to curl) — treat as launchpad-style fee hook, owner-controlled.
Uniswap deployments (docs.uniswap.org Robinhood Chain 4663 table): V4Quoter 0x8dc178efb8111bb0973dd9d722ebeff267c98f94, StateView 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b, UniversalRouter 0x8876789976decbfcbbbe364623c63652db8c0904 (UR 2.1.2 0x204FAca1764B154221e35c0d20aBb3c525710498), PositionManager 0x58daec31...a04fa7, Permit2 0x000000000022D473030F116dDEE9F6B43aC78BA3. Code present on StateView and Quoter.
StateView.getSlot0(id): sqrtPriceX96 99352877002566182844560769406759, tick 142689, protocolFee 0, lpFee 0. getLiquidity = 29277002188455995403037 (2.93e22). Spot ≈ 1,572,540 WIF per ETH.
V4Quoter.quoteExactInputSingle (zeroForOne=true, hookData 0x) via eth_call:
- 0.01 ETH -> 15,561.48 WIF (gas est 79,675) vs spot 15,725 => -1.04% (hook fee + impact)
- 1 ETH -> 1,492,871.17 WIF => -5.07% vs spot (thin liquidity)
- reverse 15,000 WIF -> 0.009439 ETH (gas 68,059)
Workaround/notes: the router must send native ETH (currency0 = address(0)) and tolerate afterSwap delta; Universal Router V4_SWAP handles hooked pools. Size small.

## TF3 — Stock leg fills near oracle — VERIFIED (+0.16%)
NVDA/USDG v3 pair (dexscreener top USDG pair) 0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3: token0 USDG, token1 NVDA, fee 500, factory 0x1f7d7550B1b028f7571E69A784071F0205FD2EfA, liquidity 337267139278662492. QuoterV2 0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7 (docs.uniswap Robinhood v3 deployments).
- 1 USDG -> 0.005929919166697072 NVDA => 168.629 USDG/NVDA
- 10 USDG -> 0.059299070156973397 NVDA => 168.633
- 1000 USDG -> 5.928570709670336400 NVDA => 168.67
Oracle: NVDA/USD 16835700239 => $168.357 (ts 1794335586); NVDA 24/7 $168.360. Deviation (1 and 10 USDG): +0.16% (pays more than oracle; includes 0.05% fee); 1000 USDG: +0.19%. US market open at probe (Tue 13:33 ET). Off-hours the /USD feed may be stale; use 24/7 feed.

## TF4 — Embedded wallet + sponsored gas for 4663 — VERIFIED (alchemy demo-key probe inconclusive)
- viem: chain def exists but named `robinhood` (NOT robinhoodMainnet): raw.githubusercontent .../src/chains/definitions/robinhood.ts HTTP 200, id 4663, default rpc rpc.mainnet.chain.robinhood.com, multicall3 0xca11bde05977b3631167028862be2a173976ca11. (robinhoodMainnet.ts = HTTP 404.)
- Privy: docs.privy.io/wallets/gas-and-asset-management/gas/overview.md HTTP 200, lists "Robinhood Chain" in sponsored-gas mainnet list (and Robinhood Testnet); Privy recipe "Build a robo-advisor ... Robinhood chain" HTTP 200 shows eth_sendTransaction chain_id 4663 from a Privy wallet.
- ZeroDev: docs.zerodev.app/sdk/faqs/chains HTTP 200 Supported Networks table: "Robinhood 4663", "Robinhood Testnet 46630".
- Alchemy: POST robinhood-mainnet.g.alchemy.com/v2/demo eth_chainId -> HTTP 429 (host resolves, demo key rate-limited; needs real key; no sponsored-gas evidence from it).
- Caveat: Privy sponsorship needs dashboard setup/policy; not exercised (no tx sent).

## CR3 — Contracts can hold stock tokens — VERIFIED
`cast call NVDA balanceOf(0xd4EB...14a3)` = 10117088511976658032393 (10,117.09 NVDA) held by the v3 pool contract. Contracts can receive/hold. (Transfer-from-contract not tested; no tx.)

## FU1 — ERC-8056 multiplier step onchain — VERIFIED
`cast receipt 0xa64c81aa...c2d9`: status 1, block 98815287 (ts 2026-10-27T00:01:01Z), to/log address 0x47F93d52cBeC7C6D2CfC080e154002370a60dAEA (ASML, symbol "ASML", 18dp). Log topic0 0x2205df45...b055 = keccak("UIMultiplierUpdated(uint256,uint256,uint256)").
Data: old = 0x0de112dacfcc82a9 = 1.0001013232514178; new = 0x0de3d53b05111fae = 1.0008779916711772; activationTime 0x6adfebfb = 2026-10-27T00:10:35Z.
Step = new/old = 1.00077659 (+0.07766%). $1,000 ASML => +$0.7766 (≈ $0.78). Current `uiMultiplier()` = 1000877991671177134 (= new value; no later step). Note: the step is a tiny ~0.078% (a dividend/rebase-style adjustment), not a material yield.
