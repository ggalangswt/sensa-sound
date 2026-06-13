// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SensaSoundGameUpgradeable} from "../src/SensaSoundGameUpgradeable.sol";

contract DeploySensaSound is Script {
    address internal constant CELO_SEPOLIA_USDC = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        uint256 signerPk = vm.envUint("SIGNER_PRIVATE_KEY");
        uint256 backendPk = vm.envUint("BACKEND_PRIVATE_KEY");

        address deployer = vm.addr(deployerPk);
        address signer = vm.addr(signerPk);
        address backendSigner = vm.addr(backendPk);
        address token = vm.envOr("USDC_ADDRESS", CELO_SEPOLIA_USDC);
        address devTreasury = vm.envOr("DEV_TREASURY_ADDRESS", deployer);
        uint256 initialReserve = vm.envOr("INITIAL_RESERVE_USDC", uint256(0));
        uint256 initialReserveRaw = initialReserve * 1e6;

        console2.log("=== Sensa Sound Deployment ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer/Owner:", deployer);
        console2.log("Token:", token);
        console2.log("Signer:", signer);
        console2.log("Backend signer:", backendSigner);
        console2.log("Dev treasury:", devTreasury);
        console2.log("Initial reserve USDC:", initialReserve);

        vm.startBroadcast(deployerPk);

        SensaSoundGameUpgradeable implementation = new SensaSoundGameUpgradeable();
        bytes memory initData = abi.encodeCall(
            SensaSoundGameUpgradeable.initialize,
            (token, signer, devTreasury, backendSigner, deployer)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);

        if (initialReserveRaw > 0) {
            IERC20(token).approve(address(proxy), initialReserveRaw);
            SensaSoundGameUpgradeable(address(proxy)).seedSoloReserve(initialReserveRaw);
        }

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployed Contracts ===");
        console2.log("Implementation:", address(implementation));
        console2.log("Proxy:", address(proxy));

        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "proxy", address(proxy));
        vm.serializeAddress(key, "implementation", address(implementation));
        vm.serializeAddress(key, "token", token);
        vm.serializeAddress(key, "owner", deployer);
        vm.serializeAddress(key, "signer", signer);
        vm.serializeAddress(key, "backendSigner", backendSigner);
        vm.serializeAddress(key, "devTreasury", devTreasury);
        string memory json = vm.serializeUint(key, "initialReserveRaw", initialReserveRaw);
        vm.writeJson(json, "deployments/celo-sepolia/SensaSoundGame.json");
    }
}
