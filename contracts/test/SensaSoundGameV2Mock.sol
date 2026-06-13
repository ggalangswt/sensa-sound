// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SensaSoundGameUpgradeable} from "../src/SensaSoundGameUpgradeable.sol";

contract SensaSoundGameV2Mock is SensaSoundGameUpgradeable {
    function version() external pure returns (string memory) {
        return "v2";
    }
}
