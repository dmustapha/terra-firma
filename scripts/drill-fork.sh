#!/usr/bin/env bash
# File: scripts/drill-fork.sh
# [VERIFIED] STAGE-4 scripted hero drill against a LOCAL MAINNET FORK (anvil). Every line it prints is labelled
# FORK: these are not Robinhood Chain mainnet transactions and must never be presented as such (PRD 7.6b).
# Usage: anvil --fork-url $RPC --chain-id 4663 --port 8545 & ; deploy with Deploy.s.sol to it;
#        bash scripts/drill-fork.sh contracts/deployments/4663.fork.json
set -euo pipefail
D=${1:-contracts/deployments/4663.fork.json}; R=${FORK_RPC:-http://127.0.0.1:8545}
UK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d  # anvil test account 1 (public test key, fork only)
U=$(cast wallet address --private-key $UK)
ROUTER=$(jq -r .TerraRouter $D); JAR=$(jq -r .Jar $D); FP=$(jq -r .FeePool $D); ST=$(jq -r .WifStaking $D); LENS=$(jq -r .HindsightLens $D)
WETH=0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73; PONS=0x39dBED3a2bd333467115dE45665cC57F813C4571
NVDA=0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC; WIF=0x5173b8eA6923c2d40267890D45C46a3480954773
HOOK=0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044; Z=0x0000000000000000000000000000000000000000
RT='(uint8,address[],bytes,(address,address,uint24,int24,address))'
say(){ echo "FORK | $*"; }
tx(){ cast send --rpc-url $R --private-key $UK "$@" --json | jq -r .transactionHash; }
bal(){ cast call $1 "balanceOf(address)(uint256)" $2 --rpc-url $R | awk '{print $1}'; }
jar(){ cast call $JAR "balanceOf(address,address)(uint256)" $U $1 --rpc-url $R | awk '{print $1}'; }
P3=$(cast concat-hex $WETH 0x000bb8 $PONS)
say "user $U (anvil test account 1)"
h=$(tx $ROUTER "buy($RT,address,uint16,uint8,uint256,uint256)" "(2,[],$P3,($Z,$Z,0,0,$Z))" $PONS 200 0 1 0 --value 0.003ether); say "buy PONS + 2% sweep → $h; PONS=$(bal $PONS $U) jarNVDA=$(jar $NVDA) feePool=$(cast balance $FP --rpc-url $R)"
SELL=$(cast concat-hex $PONS 0x000bb8 $WETH); AMT=$(( $(bal $PONS $U) / 2 ))
tx $PONS "approve(address,uint256)" $ROUTER $AMT >/dev/null
h=$(tx $ROUTER "convert(${RT}[],address[],uint256[],uint8,uint256)" "[(2,[],$SELL,($Z,$Z,0,0,$Z))]" "[$PONS]" "[$AMT]" 0 0); say "convert half PONS → NVDA into Jar → $h; jarNVDA=$(jar $NVDA)"
h=$(tx $ROUTER "buy($RT,address,uint16,uint8,uint256,uint256)" "(3,[],0x,($Z,$WIF,0,200,$HOOK))" $WIF 0 0 1 0 --value 0.001ether); W=$(bal $WIF $U); say "buy WIF via hooked v4 pool → $h; WIF=$W"
tx $WIF "approve(address,uint256)" $ST $W >/dev/null; h=$(tx $ST "stake(uint256,uint8)" $W 0); say "stake $W WIF on NVDA pool → $h"
cast rpc evm_increaseTime 7300 --rpc-url $R >/dev/null; cast rpc evm_mine --rpc-url $R >/dev/null; say "warped 2h+ (stake placed in epoch e is active from e+2)"
h=$(tx $ROUTER "buy($RT,address,uint16,uint8,uint256,uint256)" "(2,[],$P3,($Z,$Z,0,0,$Z))" $PONS 0 0 1 0 --value 0.003ether); say "fee-funding trade → $h; feePool=$(cast balance $FP --rpc-url $R)"
S0=$(cast call $WIF "totalSupply()(uint256)" --rpc-url $R | awk '{print $1}')
h=$(tx $FP "distribute()" --gas-limit 3500000); S1=$(cast call $WIF "totalSupply()(uint256)" --rpc-url $R | awk '{print $1}'); say "distribute → $h; WIF supply delta (burned) = $(python3 -c "print($S0-$S1)")"
P=$(cast call $ST "pending(address)(uint8,uint256)" $U --rpc-url $R | tail -1 | awk '{print $1}'); say "staker pending NVDA = $P"
before=$(jar $NVDA); h=$(tx $ST "claim()"); say "claim → $h; jarNVDA $before → $(jar $NVDA)"
REC=$(cast call $LENS "recompute((uint8,uint8,uint256,uint80,uint80,uint64)[],uint8)(uint256,uint256,uint256)" "[(0,0,1000000000000000000,18446744073709552165,18446744073709551640,1782222600)]" 0 --rpc-url $R | head -1 | awk '{print $1}'); say "HindsightLens.recompute(1 ETH @ 2026-06-23) usdPaid8 = $REC (expect 165768649010)"
[ "$REC" = "165768649010" ] && [ "$(python3 -c "print(int($S0>$S1))")" = 1 ] && [ "$P" != "0" ] && say "DRILL PASS" || { say "DRILL FAIL"; exit 1; }
