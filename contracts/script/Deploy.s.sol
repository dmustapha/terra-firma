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
