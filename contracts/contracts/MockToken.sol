// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    // Helper for testing: allow forced transfers to simulate edge cases like draining contract
    function forceTransfer(address from, address to, uint256 amount) public {
        _transfer(from, to, amount);
    }
}