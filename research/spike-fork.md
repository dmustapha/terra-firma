# Spike: mainnet-fork money path (Foundry, RH 4663, fork block 111155803, RPC = GetBlock FRA)
Run: `cd terra-firma/spike && source ../../.env.local && RPC=$GETBLOCK_RPC_FRA forge test -vv` (5/5 PASS, 2026-11-10 ~21:35 WAT). Source copy: research/spike-fork-Spike.t.sol.
Forge forks RH mainnet directly (no TLS relay needed). Public RPC 429s under forge load -> use GetBlock.

| Probe | Result | Gas | Number | Tag |
|---|---|---|---|---|
| UR V4_SWAP native ETH -> WIF through owned hook 0xE5e7...e044 (actions 0x06 SWAP_EXACT_IN_SINGLE, 0x0c SETTLE_ALL, 0x0f TAKE_ALL; 5-field ExactInputSingleParams) from a contract, then `WIF.burn(bal)` | PASS: totalSupply drop == burned | 153,102 | 0.001 ETH -> 1,559.15 WIF burned | VERIFIED |
| Same with amountOutMinimum = uint128.max | reverts (min-out enforced through hook) | - | - | VERIFIED |
| WRAP_ETH + V3_SWAP_EXACT_IN WETH->NVDA fee 500 (CONTRACT_BALANCE) with Chainlink-bounded minOut (ETH/USD + NVDA 24/7, 6h staleness, 300bps band) | PASS | 228,782 | 0.002 ETH -> 0.0243312 NVDA vs CL-implied 0.0243416 (-0.04%) | VERIFIED |
| swapAndSweep: 0.003 ETH, fee 0.5%, sweep 2%: WRAP(trade)->V3 WETH->PONS fee 3000; WRAP(sweep)->V3 WETH->NVDA fee 500; both to user, one tx | PASS | 356,407 | 40.81 PONS + 0.00072994 NVDA swept + 0.000015 ETH fee kept | VERIFIED |
| sellMeme: user `approve(router)`, router transferFrom -> transfer to UR -> V3 PONS->WETH (CONTRACT_BALANCE) -> UNWRAP_WETH to router | PASS (no Permit2 needed) | ~150k | 40.81 PONS -> 0.002982 ETH | VERIFIED |

## Gotchas (build-binding)
1. **ROOT CAUSE (forge Phase 2): UR 0x8876...0904 is Universal Router 2.1; V2/V3 inputs need a trailing `uint256[] maxHopSlippage`. Without it the decoder reverts `SliceOutOfBounds()` (0x3b99b53d) for explicit amounts (CONTRACT_BALANCE happened to pass). Proven in contracts/test/URProbe.t.sol (3/3).** Original observation: Pattern: WRAP_ETH(exact leg amount) then V3_SWAP_EXACT_IN(CONTRACT_BALANCE) per leg; for token-in legs transfer exact tokens to UR first. (Iso test: test/Iso.t.sol A/D pass, B/C fail.) [VERIFIED empirical; root cause not traced]
2. Router pre-funds UR (push tokens / msg.value) so users only `approve(TerraRouter)`; Permit2 is not required in the money path.
3. Hook 0xe5e7 takes ~1% of output (afterSwapReturnDelta); min-out is honored.
4. Chainlink: both feeds 8dp, both tokens 18dp -> minOut = ethIn*ethUsd/nvdaUsd*(1-band).

## Platform probe (riskiest invariant)
Invariant: "a contract can, in ONE tx, route a meme trade through Uniswap UR, sweep a slice into a real stock with a Chainlink-bounded min-out, keep a fee, and buy+burn $WIF through the owned hooked pool". PROVEN on fork.
