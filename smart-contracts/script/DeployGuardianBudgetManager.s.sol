// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/GuardianBudgetManager.sol";

contract DeployGuardianBudgetManager is Script {
    function run() external returns (GuardianBudgetManager guardian) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying GuardianBudgetManager...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        guardian = new GuardianBudgetManager();

        console.log("GuardianBudgetManager deployed at:", address(guardian));
        console.log("Owner:", guardian.owner());

        vm.stopBroadcast();
    }
}
