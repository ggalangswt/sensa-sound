// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SensaSoundGameUpgradeable} from "../src/SensaSoundGameUpgradeable.sol";

contract UpgradeSensaSound is Script {
    address internal constant CELO_SEPOLIA_PROXY = 0xB33e13bd00d562Ea9dBffAC0b84540742670AC00;

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envOr("PROXY_ADDRESS", CELO_SEPOLIA_PROXY);
        address deployer = vm.addr(deployerPk);

        console2.log("=== Sensa Sound Upgrade ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer/Owner:", deployer);
        console2.log("Proxy:", proxy);

        vm.startBroadcast(deployerPk);

        SensaSoundGameUpgradeable implementation = new SensaSoundGameUpgradeable();
        SensaSoundGameUpgradeable(proxy).upgradeToAndCall(address(implementation), "");

        vm.stopBroadcast();

        console2.log("Implementation:", address(implementation));
        console2.log("Proxy:", proxy);
    }
}
